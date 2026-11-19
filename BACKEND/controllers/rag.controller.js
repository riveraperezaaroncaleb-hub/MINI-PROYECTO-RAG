'use strict';

const { crearError } = require('../middlewares/errores');
const { registrarConsulta } = require('../services/historial.service');
const { consultar, ingestarMarkdown } = require('../services/ragMultiAgente.bridge');

/**
 * Valida y normaliza un campo textual del cuerpo de la petición.
 * @param {*} valor Valor recibido.
 * @param {string} nombre Nombre del campo para el mensaje de error.
 * @param {number} maximo Longitud máxima permitida.
 * @returns {string} Texto normalizado.
 */
function texto(valor, nombre, maximo) {
  if (valor === undefined || valor === null) return '';
  if (typeof valor !== 'string') {
    throw crearError(`${nombre} debe ser un texto.`, 400);
  }

  const limpio = valor.trim();
  if (limpio.length > maximo) {
    throw crearError(`${nombre} no puede superar los ${maximo} caracteres.`, 400);
  }

  return limpio;
}

/**
 * Valida y normaliza un campo entero opcional del cuerpo de la petición.
 * @param {*} valor Valor recibido.
 * @param {string} nombre Nombre del campo para el mensaje de error.
 * @param {number} minimo Valor mínimo permitido.
 * @param {number} maximo Valor máximo permitido.
 * @returns {number|undefined} Entero normalizado o undefined.
 */
function enteroOpcional(valor, nombre, minimo, maximo) {
  if (valor === undefined || valor === null || valor === '') return undefined;

  const numero = Number(valor);
  if (!Number.isInteger(numero) || numero < minimo || numero > maximo) {
    throw crearError(`${nombre} debe ser un entero entre ${minimo} y ${maximo}.`, 400);
  }

  return numero;
}

/**
 * Registra la consulta en el historial existente sin bloquear la respuesta.
 * @param {Object} req Petición Express.
 * @param {Object} resultado Resultado del orquestador multiagente.
 * @param {number} latencia Duración de la operación en milisegundos.
 */
function registrar(req, resultado, latencia) {
  registrarConsulta({
    colaborador_id: req.user?.id ?? null,
    pregunta: resultado.consulta,
    intencion: resultado.intencion,
    agente: resultado.area || 'especialista',
    documentos_citados: resultado.citas,
    resuelta: Boolean(resultado.respuesta),
    escalada: false,
    latencia_ms: latencia
  }).catch(() => null);
}

/**
 * POST /api/rag/consultar
 * Ejecuta clasificación, recuperación vectorial y respuesta con citas.
 */
async function postConsulta(req, res, next) {
  const inicio = Date.now();

  try {
    const pregunta = texto(req.body?.pregunta, 'La pregunta', 2000);
    if (!pregunta) {
      throw crearError('La pregunta es obligatoria.', 400);
    }

    const area = texto(req.body?.area, 'El área', 80);
    const topK = enteroOpcional(req.body?.topK, 'topK', 1, 20);

    const resultado = await consultar(pregunta, {
      area: area || undefined,
      topK,
      empresaId: process.env.RAG_EMPRESA_ID || null
    });

    registrar(req, resultado, Date.now() - inicio);

    return res.json({
      respuesta: resultado.respuesta,
      intencion: resultado.intencion,
      area: resultado.area,
      citas: resultado.citas,
      agente: resultado.area || 'especialista'
    });
  } catch (error) {
    process.stderr.write(`[RAG] ${error.stack || error.message}\n`);
    return next(error);
  }
}

/**
 * POST /api/rag/ingestar
 * Descarga un Markdown de Google Drive y lo persiste en fragmentos_rag.
 */
async function postIngesta(req, res, next) {
  try {
    const archivoId = texto(req.body?.archivoId, 'El identificador del archivo', 200);
    const url = texto(req.body?.url, 'La URL de Google Drive', 1000);
    const area = texto(req.body?.area, 'El área', 80);

    if (!archivoId && !url) {
      throw crearError('Se requiere archivoId o url de Google Drive.', 400);
    }
    if (!area) {
      throw crearError('El área es obligatoria.', 400);
    }

    const palabrasPorChunk = enteroOpcional(
      req.body?.palabrasPorChunk,
      'palabrasPorChunk',
      100,
      2000
    );
    const solape = enteroOpcional(req.body?.solape, 'solape', 0, 500);

    const resultado = await ingestarMarkdown({
      archivoId: archivoId || undefined,
      url: url || undefined,
      area,
      palabrasPorChunk,
      solape,
      empresaId: process.env.RAG_EMPRESA_ID || null,
      reemplazarDocumento: req.body?.reemplazarDocumento === true
    });

    return res.status(201).json(resultado);
  } catch (error) {
    process.stderr.write(`[RAG] ${error.stack || error.message}\n`);
    return next(error);
  }
}

module.exports = { postConsulta, postIngesta };
