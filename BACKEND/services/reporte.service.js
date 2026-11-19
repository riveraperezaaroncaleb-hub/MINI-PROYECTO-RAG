'use strict';

const { sequelize } = require('../models');
const { leerJson } = require('./almacen.service');

function aIso(fecha) {
  return fecha.toISOString().slice(0, 10);
}

function inicioDelMes(fecha) {
  return aIso(new Date(Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth(), 1)));
}

function inicioDelMesSiguiente(fecha) {
  return aIso(new Date(Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth() + 1, 1)));
}

function diaAnterior(fecha) {
  const anterior = new Date(fecha);
  anterior.setUTCDate(anterior.getUTCDate() - 1);
  return aIso(anterior);
}

function numero(valor) {
  return Number(valor || 0);
}

function topConteos(registros, clave, limite = 5) {
  const conteos = new Map();

  for (const registro of registros) {
    const valor = registro[clave] || 'Sin dato';
    conteos.set(valor, (conteos.get(valor) || 0) + 1);
  }

  return [...conteos.entries()]
    .map(([nombre, total]) => ({ [clave]: nombre, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, limite);
}

async function ausentesHoy({ hoy }) {
  const [filas] = await sequelize.query(
    `SELECT departamento,
            SUM(tipo = 'Vacaciones') AS vacaciones,
            SUM(tipo = 'Permiso') AS permisos,
            SUM(tipo = 'Incapacidad') AS incapacidades,
            COUNT(DISTINCT colaborador_id) AS total
     FROM (
       SELECT COALESCE(u.departamento, 'Sin departamento') AS departamento,
              s.colaborador_id, s.tipo
       FROM solicitudes s
       JOIN Usuarios u ON u.id = s.colaborador_id
       WHERE s.estado = 'Aprobada'
         AND s.tipo IN ('Vacaciones', 'Permiso')
         AND s.fecha_inicio <= :hoy
         AND s.fecha_fin >= :hoy
       UNION ALL
       SELECT COALESCE(u.departamento, 'Sin departamento') AS departamento,
              i.colaborador_id, 'Incapacidad' AS tipo
       FROM incapacidades i
       JOIN Usuarios u ON u.id = i.colaborador_id
       WHERE i.fecha_inicio <= :hoy
         AND DATE_ADD(i.fecha_inicio, INTERVAL i.dias - 1 DAY) >= :hoy
     } AS ausentes
     GROUP BY departamento
     ORDER BY total DESC`,
    { replacements: { hoy } }
  );

  return {
    total: filas.reduce((suma, fila) => suma + numero(fila.total), 0),
    vacaciones: filas.reduce((suma, fila) => suma + numero(fila.vacaciones), 0),
    permisos: filas.reduce((suma, fila) => suma + numero(fila.permisos), 0),
    incapacidades: filas.reduce((suma, fila) => suma + numero(fila.incapacidades), 0),
    porDepartamento: filas.map((fila) => ({
      departamento: fila.departamento,
      vacaciones: numero(fila.vacaciones),
      permisos: numero(fila.permisos),
      incapacidades: numero(fila.incapacidades),
      total: numero(fila.total)
    }))
  };
}

async function solicitudesPendientes() {
  const limite = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');
  const [filas] = await sequelize.query(
    `SELECT COUNT(*) AS total,
            SUM(creada_en < :limite) AS masDeTresDias
     FROM solicitudes
     WHERE estado = 'Pendiente'`,
    { replacements: { limite } }
  );

  const fila = filas[0] ?? {};
  return { total: numero(fila.total), masDeTresDias: numero(fila.masDeTresDias) };
}

async function incapacidadesDelMes({ hoy, inicioMes, inicioMesSiguiente }) {
  const [filas] = await sequelize.query(
    `SELECT SUM(fecha_inicio <= :hoy
                 AND DATE_ADD(fecha_inicio, INTERVAL dias - 1 DAY) >= :hoy) AS activas,
            SUM(CASE
                  WHEN fecha_inicio < :inicioMesSiguiente
                   AND DATE_ADD(fecha_inicio, INTERVAL dias - 1 DAY) >= :inicioMes
                  THEN dias ELSE 0
                END) AS diasAcumuladosMes
     FROM incapacidades`,
    { replacements: { hoy, inicioMes, inicioMesSiguiente } }
  );

  const fila = filas[0] ?? {};
  return {
    activas: numero(fila.activas),
    diasAcumuladosMes: numero(fila.diasAcumuladosMes)
  };
}

async function movimientosDelMes({ inicioMes, inicioMesSiguiente }) {
  const [filas] = await sequelize.query(
    `SELECT SUM(tipo = 'Alta') AS ingresos,
            SUM(tipo = 'Baja') AS salidas,
            (SELECT COUNT(*) FROM Usuarios WHERE rol = 'colaborador') AS colaboradoresActivos
     FROM movimientos_personal
     WHERE fecha >= :inicioMes AND fecha < :inicioMesSiguiente`,
    { replacements: { inicioMes, inicioMesSiguiente } }
  );

  const fila = filas[0] ?? {};
  const salidas = numero(fila.salidas);
  const colaboradoresActivos = numero(fila.colaboradoresActivos);

  return {
    ingresos: numero(fila.ingresos),
    salidas,
    colaboradoresActivos,
    rotacionPorcentaje: colaboradoresActivos
      ? Number(((salidas / colaboradoresActivos) * 100).toFixed(2))
      : 0
  };
}

async function usoDelChatbot({ ayer, hoy }) {
  let registros;

  try {
    const [filas] = await sequelize.query(
      `SELECT fecha, resuelta, latencia_ms, intencion, pregunta
       FROM consultas_chat
       WHERE fecha >= :ayer AND fecha < :hoy`,
      { replacements: { ayer, hoy } }
    );
    registros = filas;
  } catch {
    registros = await leerJson('consultas_chat.json', []);
  }

  const delPeriodo = (Array.isArray(registros) ? registros : []).filter((registro) => {
    const fecha = String(registro.fecha || '').slice(0, 10);
    return fecha >= ayer && fecha < hoy;
  });

  const consultas = delPeriodo.length;
  const resueltas = delPeriodo.filter((registro) => registro.resuelta === true).length;
  const latencias = delPeriodo.map((registro) => numero(registro.latencia_ms));
  const sinResponder = delPeriodo.filter((registro) => registro.resuelta === false);

  return {
    consultasAyer: consultas,
    porcentajeResuelto: consultas
      ? Number(((resueltas / consultas) * 100).toFixed(2))
      : 0,
    latenciaPromedioMs: latencias.length
      ? Math.round(latencias.reduce((suma, valor) => suma + valor, 0) / latencias.length)
      : 0,
    topTemasSinResponder: topConteos(sinResponder, 'intencion').map(({ intencion, total }) => ({
      tema: intencion,
      total
    })),
    topPreguntasSinResponder: topConteos(sinResponder, 'pregunta')
  };
}

async function obtenerCifras(fecha = new Date()) {
  const replacements = {
    hoy: aIso(fecha),
    ayer: diaAnterior(fecha),
    inicioMes: inicioDelMes(fecha),
    inicioMesSiguiente: inicioDelMesSiguiente(fecha)
  };

  const [ausentes, pendientes, incapacidades, movimientos, chatbot] = await Promise.all([
    ausentesHoy(replacements),
    solicitudesPendientes(),
    incapacidadesDelMes(replacements),
    movimientosDelMes(replacements),
    usoDelChatbot(replacements)
  ]);

  return {
    periodo: { fecha: aIso(fecha), mes: aIso(fecha).slice(0, 7) },
    ausentesHoy: ausentes,
    solicitudesPendientes: pendientes,
    incapacidades,
    movimientos,
    chatbot
  };
}

module.exports = { obtenerCifras };
