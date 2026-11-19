import 'dotenv/config';
import cron from 'node-cron';
import modelos from '../../models/index.js';
import { TIMEOUT_EXTERNO_MS } from '../config/rag.js';

const { sequelize, ReporteDiario } = modelos;
const ZONA = 'America/Costa_Rica';
const BASE_URL = (process.env.DEEPSEEK_BASE_URL ?? 'https://api.deepseek.com').replace(/\/$/, '');
const URL_CHAT = `${BASE_URL}/chat/completions`;
const MODELO = process.env.DEEPSEEK_MODEL ?? 'deepseek-chat';

let tarea = null;

function fechaLocal(valor = new Date()) {
  const fecha = valor instanceof Date ? valor : new Date(valor);
  if (Number.isNaN(fecha.getTime())) throw new Error('Fecha inválida.');
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONA,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(fecha);
}

function sumarDias(iso, dias) {
  const fecha = new Date(`${iso}T12:00:00Z`);
  fecha.setUTCDate(fecha.getUTCDate() + dias);
  return fecha.toISOString().slice(0, 10);
}

function numero(valor) {
  return Number(valor ?? 0);
}

function limiteTresDias() {
  return new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 19)
    .replace('T', ' ');
}

async function ausenciasDelDia(hoy, siguiente) {
  const [filas] = await sequelize.query(
    `SELECT COALESCE(u.departamento, 'Sin departamento') AS departamento,
            SUM(s.tipo = 'Vacaciones') AS vacaciones,
            SUM(s.tipo = 'Permiso') AS permisos,
            COUNT(DISTINCT s.colaborador_id) AS total
     FROM solicitudes s
     JOIN Usuarios u ON u.id = s.colaborador_id
     WHERE s.estado = 'Aprobada'
       AND s.tipo IN ('Vacaciones', 'Permiso')
       AND s.fecha_inicio < :siguiente
       AND s.fecha_fin >= :hoy
     GROUP BY departamento`,
    { replacements: { hoy, siguiente } }
  );

  return {
    total: filas.reduce((suma, fila) => suma + numero(fila.total), 0),
    vacaciones: filas.reduce((suma, fila) => suma + numero(fila.vacaciones), 0),
    permisos: filas.reduce((suma, fila) => suma + numero(fila.permisos), 0),
    porDepartamento: filas.map((fila) => ({
      departamento: fila.departamento,
      vacaciones: numero(fila.vacaciones),
      permisos: numero(fila.permisos),
      total: numero(fila.total)
    }))
  };
}

async function solicitudesPendientes() {
  const [filas] = await sequelize.query(
    `SELECT COUNT(*) AS total,
            SUM(creada_en < :limite) AS masDeTresDias
     FROM solicitudes
     WHERE estado = 'Pendiente'`,
    { replacements: { limite: limiteTresDias() } }
  );
  const fila = filas[0] ?? {};
  return { total: numero(fila.total), masDeTresDias: numero(fila.masDeTresDias) };
}

async function incapacidadesActivas(hoy, siguiente) {
  const [filas] = await sequelize.query(
    `SELECT COUNT(*) AS activas
     FROM incapacidades
     WHERE fecha_inicio < :siguiente
       AND DATE_ADD(fecha_inicio, INTERVAL dias - 1 DAY) >= :hoy`,
    { replacements: { hoy, siguiente } }
  );
  return { activas: numero(filas[0]?.activas) };
}

async function movimientosRecientes(hoy, siguiente) {
  const desde = sumarDias(hoy, -30);
  const [filas] = await sequelize.query(
    `SELECT SUM(tipo = 'Alta') AS ingresos,
            SUM(tipo = 'Baja') AS salidas,
            (SELECT COUNT(*) FROM Usuarios WHERE rol = 'colaborador') AS colaboradoresActivos
     FROM movimientos_personal
     WHERE fecha >= :desde AND fecha < :siguiente`,
    { replacements: { desde, siguiente } }
  );
  const fila = filas[0] ?? {};
  const salidas = numero(fila.salidas);
  const activos = numero(fila.colaboradoresActivos);
  return {
    desde,
    hasta: hoy,
    ingresos: numero(fila.ingresos),
    salidas,
    colaboradoresActivos: activos,
    rotacionPorcentaje: activos ? Number(((salidas / activos) * 100).toFixed(2)) : 0
  };
}

async function dudasFrecuentes(hoy, siguiente) {
  const desde = sumarDias(hoy, -7);
  const consultar = (columna) =>
    sequelize.query(
      `SELECT ${columna} AS nombre, COUNT(*) AS total
       FROM consultas_chat
       WHERE fecha >= :desde AND fecha < :siguiente
       GROUP BY ${columna}
       ORDER BY total DESC
       LIMIT 5`,
      { replacements: { desde, siguiente } }
    );

  try {
    const [resultadoPreguntas, resultadoTemas, resultadoResumen] = await Promise.all([
      consultar('pregunta'),
      consultar('intencion'),
      sequelize.query(
        `SELECT COUNT(*) AS total, SUM(resuelta = 1) AS resueltas
         FROM consultas_chat
         WHERE fecha >= :desde AND fecha < :siguiente`,
        { replacements: { desde, siguiente } }
      )
    ]);
    const preguntas = resultadoPreguntas[0] ?? [];
    const temas = resultadoTemas[0] ?? [];
    const resumen = resultadoResumen[0]?.[0] ?? {};

    return {
      desde,
      hasta: hoy,
      total: numero(resumen.total),
      resueltas: numero(resumen.resueltas),
      topPreguntas: preguntas.map((fila) => ({ pregunta: fila.nombre, total: numero(fila.total) })),
      topTemas: temas.map((fila) => ({ tema: fila.nombre, total: numero(fila.total) }))
    };
  } catch (error) {
    process.stderr.write(`[FOTO-RRHH] consultas: ${error.message}\n`);
    return { desde, hasta: hoy, total: 0, resueltas: 0, topPreguntas: [], topTemas: [] };
  }
}

async function desglosePorColaborador(hoy, siguiente) {
  const desdeMovimientos = sumarDias(hoy, -30);
  const desdeConsultas = sumarDias(hoy, -7);
  const [filas] = await sequelize.query(
    `SELECT u.id,
            u.nombre,
            u.departamento,
            u.puesto,
            (SELECT COUNT(*)
               FROM solicitudes s
              WHERE s.colaborador_id = u.id
                AND s.estado = 'Aprobada'
                AND s.tipo IN ('Vacaciones', 'Permiso')
                AND s.fecha_inicio < :siguiente
                AND s.fecha_fin >= :hoy) AS ausenciasHoy,
            (SELECT COUNT(*)
               FROM solicitudes s
              WHERE s.colaborador_id = u.id
                AND s.estado = 'Pendiente') AS pendientes,
            (SELECT COUNT(*)
               FROM solicitudes s
              WHERE s.colaborador_id = u.id
                AND s.estado = 'Pendiente'
                AND s.creada_en < :limite) AS pendientesMasTresDias,
            (SELECT COUNT(*)
               FROM incapacidades i
              WHERE i.colaborador_id = u.id
                AND i.fecha_inicio < :siguiente
                AND DATE_ADD(i.fecha_inicio, INTERVAL i.dias - 1 DAY) >= :hoy) AS incapacidadesActivas,
            (SELECT COUNT(*)
               FROM movimientos_personal m
              WHERE m.colaborador_id = u.id
                AND m.fecha >= :desdeMovimientos
                AND m.fecha < :siguiente) AS movimientosRecientes,
            (SELECT COUNT(*)
               FROM consultas_chat c
              WHERE c.colaborador_id = u.id
                AND c.fecha >= :desdeConsultas
                AND c.fecha < :siguiente) AS consultasRecientes
     FROM Usuarios u
     WHERE u.rol = 'colaborador'
     ORDER BY u.departamento, u.nombre`,
    {
      replacements: {
        hoy,
        siguiente,
        limite: limiteTresDias(),
        desdeMovimientos,
        desdeConsultas
      }
    }
  );

  return filas.map((fila) => ({
    id: numero(fila.id),
    nombre: fila.nombre,
    departamento: fila.departamento,
    puesto: fila.puesto,
    ausenciasHoy: numero(fila.ausenciasHoy),
    pendientes: numero(fila.pendientes),
    pendientesMasTresDias: numero(fila.pendientesMasTresDias),
    incapacidadesActivas: numero(fila.incapacidadesActivas),
    movimientosRecientes: numero(fila.movimientosRecientes),
    consultasRecientes: numero(fila.consultasRecientes)
  }));
}

function extraerResumen(texto) {
  const inicio = texto.indexOf('{');
  const fin = texto.lastIndexOf('}');
  if (inicio === -1 || fin <= inicio) throw new Error('DeepSeek no devolvió un JSON válido.');
  const datos = JSON.parse(texto.slice(inicio, fin + 1));
  if (typeof datos.resumen !== 'string' || !datos.resumen.trim()) {
    throw new Error('DeepSeek no devolvió un resumen.');
  }
  return datos.resumen.trim();
}

function validarCifras(resumen, datos) {
  const permitidos = new Set(JSON.stringify(datos).match(/\d+(?:\.\d+)?/g) ?? []);
  const usados = resumen.match(/\d+(?:\.\d+)?/g) ?? [];
  if (usados.some((numeroUsado) => !permitidos.has(numeroUsado))) {
    throw new Error('El resumen incluye cifras que no aparecen en los datos SQL.');
  }
  return resumen;
}

async function redactarResumen(datos) {
  const clave = process.env.DEEPSEEK_API_KEY;
  if (!clave) throw new Error('Falta DEEPSEEK_API_KEY para la foto matutina.');

  const respuesta = await fetch(URL_CHAT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${clave}`
    },
    body: JSON.stringify({
      model: MODELO,
      temperature: 0,
      stream: false,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: [
            'Eres analista ejecutivo de Recursos Humanos.',
            'Redacta una foto matutina de 3 a 5 frases en español para la jefatura.',
            'Usa exclusivamente los valores del JSON proporcionado.',
            'Está prohibido inventar, estimar o suponer cifras, porcentajes, nombres o temas ausentes en el JSON.',
            'El array porColaborador contiene el desglose individual; menciona solo a quienes tengan valores mayores que 0, con sus cifras exactas.',
            'Si un valor es 0, menciónalo explícitamente como 0.',
            'No des recomendaciones ni conclusiones externas a los datos.',
            'Devuelve solo JSON: {"resumen":"..."}.'
          ].join(' ')
        },
        { role: 'user', content: `Datos reales: ${JSON.stringify(datos)}` }
      ]
    }),
    signal: AbortSignal.timeout(TIMEOUT_EXTERNO_MS)
  });

  if (!respuesta.ok) {
    throw new Error(`DeepSeek respondió con el estado ${respuesta.status}.`);
  }
  const contenido = (await respuesta.json()).choices?.[0]?.message?.content ?? '';
  return validarCifras(extraerResumen(contenido), datos);
}

export async function generarFotoMatutinaRRHH(fecha = new Date()) {
  const hoy = fechaLocal(fecha);
  const siguiente = sumarDias(hoy, 1);
  const [ausencias, pendientes, incapacidades, movimientos, consultas, porColaborador] =
    await Promise.all([
      ausenciasDelDia(hoy, siguiente),
      solicitudesPendientes(),
      incapacidadesActivas(hoy, siguiente),
      movimientosRecientes(hoy, siguiente),
      dudasFrecuentes(hoy, siguiente),
      desglosePorColaborador(hoy, siguiente)
    ]);

  const datos = {
    periodo: { fecha: hoy, zona: ZONA },
    ausenciasDelDia: ausencias,
    solicitudesPendientes: pendientes,
    incapacidadesActivas: incapacidades,
    movimientosRecientes: movimientos,
    consultas,
    porColaborador
  };
  const resumen = await redactarResumen(datos);

  const [reporte, creado] = await ReporteDiario.findOrCreate({
    where: { fecha: hoy },
    defaults: { datos_json: datos, resumen_texto: resumen, generado_por: null }
  });
  if (!creado) {
    await reporte.update({ datos_json: datos, resumen_texto: resumen });
  }
  return reporte;
}

export async function iniciarCronFotoMatutina() {
  if (tarea) return tarea;
  tarea = cron.schedule(
    '0 7 * * *',
    async () => {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      try {
        await generarFotoMatutinaRRHH();
      } catch (error) {
        process.stderr.write(`[FOTO-RRHH] ${error.message}\n`);
      }
    },
    { timezone: ZONA }
  );

  try {
    const hoy = fechaLocal();
    const existe = await ReporteDiario.findOne({ where: { fecha: hoy } });
    if (!existe) await generarFotoMatutinaRRHH();
  } catch (error) {
    process.stderr.write(`[FOTO-RRHH] ${error.message}\n`);
  }

  return tarea;
}

export default generarFotoMatutinaRRHH;
