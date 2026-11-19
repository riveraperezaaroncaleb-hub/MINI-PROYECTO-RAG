'use strict';

const path = require('path');
const { pathToFileURL } = require('url');

const RUTA_INGESTA = path.resolve(__dirname, '../src/services/ingestaService.js');
const RUTA_MULTI_AGENTE = path.resolve(__dirname, '../src/services/multiAgenteService.js');

let promesaIngesta = null;
let promesaMultiAgente = null;

/**
 * Importa un módulo ESM una sola vez desde el backend CommonJS.
 * @param {string} ruta Ruta absoluta del módulo.
 * @param {string} nombre Nombre lógico para el mensaje de error.
 * @returns {Promise<Object>} Namespace del módulo importado.
 */
async function importarModulo(ruta, nombre) {
  try {
    return await import(pathToFileURL(ruta).href);
  } catch (error) {
    throw new Error(`No se pudo cargar el módulo ${nombre}: ${error.message}`);
  }
}

/** Obtiene el módulo de ingesta con caché y reintento ante fallos de carga. */
function obtenerIngesta() {
  if (!promesaIngesta) {
    promesaIngesta = importarModulo(RUTA_INGESTA, 'ingestaService').catch((error) => {
      promesaIngesta = null;
      throw error;
    });
  }
  return promesaIngesta;
}

/** Obtiene el módulo multiagente con caché y reintento ante fallos de carga. */
function obtenerMultiAgente() {
  if (!promesaMultiAgente) {
    promesaMultiAgente = importarModulo(RUTA_MULTI_AGENTE, 'multiAgenteService').catch(
      (error) => {
        promesaMultiAgente = null;
        throw error;
      }
    );
  }
  return promesaMultiAgente;
}

/**
 * Ejecuta la ingesta de un Markdown de Google Drive en fragmentos_rag.
 * @param {Object} opciones Opciones de ingesta.
 * @returns {Promise<Object>} Resumen de la ingesta.
 */
async function ingestarMarkdown(opciones) {
  const modulo = await obtenerIngesta();
  return modulo.ingestarMarkdownDeGoogleDrive(opciones);
}

/**
 * Ejecuta el flujo multiagente de consulta.
 * @param {string} pregunta Pregunta del usuario.
 * @param {Object} opciones Opciones de recuperación.
 * @returns {Promise<Object>} Resultado con respuesta y citas.
 */
async function consultar(pregunta, opciones) {
  const modulo = await obtenerMultiAgente();
  return modulo.consultarMultiAgente(pregunta, opciones);
}

module.exports = { ingestarMarkdown, consultar };
