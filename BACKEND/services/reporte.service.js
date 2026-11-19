'use strict';

const { Op } = require('sequelize');
const { Usuario, Solicitud, Incapacidad, MovimientoPersonal } = require('../models');
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

function finIncapacidad(incapacidad) {
  const fin = new Date(`${incapacidad.fecha_inicio}T00:00:00Z`);
  fin.setUTCDate(fin.getUTCDate() + numero(incapacidad.dias) - 1);
  return aIso(fin);
}

function departamentoDe(registro) {
  return registro.colaborador?.departamento || 'Sin departamento';
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
  const [solicitudes, incapacidades] = await Promise.all([
    Solicitud.findAll({
      where: {
        estado: 'Aprobada',
        tipo: { [Op.in]: ['Vacaciones', 'Permiso'] },
        fecha_inicio: { [Op.lte]: hoy },
        fecha_fin: { [Op.gte]: hoy }
      },
      include: [{ model: Usuario, as: 'colaborador', attributes: ['departamento'] }]
    }),
    Incapacidad.findAll({
      include: [{ model: Usuario, as: 'colaborador', attributes: ['departamento'] }]
    })
  ]);

  const activas = incapacidades.filter(
    (item) => item.fecha_inicio <= hoy && finIncapacidad(item) >= hoy
  );

  const departamentos = new Set([
    ...solicitudes.map(departamentoDe),
    ...activas.map(departamentoDe)
  ]);

  const porDepartamento = [...departamentos]
    .map((departamento) => {
      const sols = solicitudes.filter((item) => departamentoDe(item) === departamento);
      const incs = activas.filter((item) => departamentoDe(item) === departamento);

      return {
        departamento,
        vacaciones: sols.filter((item) => item.tipo === 'Vacaciones').length,
        permisos: sols.filter((item) => item.tipo === 'Permiso').length,
        incapacidades: incs.length,
        total: new Set([
          ...sols.map((item) => item.colaborador_id),
          ...incs.map((item) => item.colaborador_id)
        ]).size
      };
    })
    .sort((a, b) => b.total - a.total);

  return {
    total: new Set([
      ...solicitudes.map((item) => item.colaborador_id),
      ...activas.map((item) => item.colaborador_id)
    ]).size,
    vacaciones: solicitudes.filter((item) => item.tipo === 'Vacaciones').length,
    permisos: solicitudes.filter((item) => item.tipo === 'Permiso').length,
    incapacidades: activas.length,
    porDepartamento
  };
}

async function solicitudesPendientes() {
  const pendientes = await Solicitud.findAll({
    where: { estado: 'Pendiente' },
    attributes: ['creada_en']
  });

  const limite = Date.now() - 3 * 24 * 60 * 60 * 1000;

  return {
    total: pendientes.length,
    masDeTresDias: pendientes.filter(
      (item) => new Date(item.creada_en).getTime() < limite
    ).length
  };
}

async function incapacidadesDelMes({ hoy, inicioMes, inicioMesSiguiente }) {
  const registros = await Incapacidad.findAll({ attributes: ['fecha_inicio', 'dias'] });

  return {
    activas: registros.filter(
      (item) => item.fecha_inicio <= hoy && finIncapacidad(item) >= hoy
    ).length,
    diasAcumuladosMes: registros
      .filter((item) => item.fecha_inicio >= inicioMes && item.fecha_inicio < inicioMesSiguiente)
      .reduce((suma, item) => suma + numero(item.dias), 0)
  };
}

async function movimientosDelMes({ inicioMes, inicioMesSiguiente }) {
  const [movimientos, colaboradoresActivos] = await Promise.all([
    MovimientoPersonal.findAll({
      where: { fecha: { [Op.gte]: inicioMes, [Op.lt]: inicioMesSiguiente } },
      attributes: ['tipo']
    }),
    Usuario.count({ where: { rol: 'colaborador' } })
  ]);

  const salidas = movimientos.filter((item) => item.tipo === 'Baja').length;

  return {
    ingresos: movimientos.filter((item) => item.tipo === 'Alta').length,
    salidas,
    colaboradoresActivos,
    rotacionPorcentaje: colaboradoresActivos
      ? Number(((salidas / colaboradoresActivos) * 100).toFixed(2))
      : 0
  };
}

async function usoDelChatbot({ ayer, hoy }) {
  const registros = await leerJson('consultas_chat.json', []);
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
