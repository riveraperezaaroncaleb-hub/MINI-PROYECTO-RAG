'use strict';

const { resumirFragmentos } = require('./llm.service');
const { buscarFragmentosLocales } = require('./buscador.local.service');

const SIN_RESPALDO =
  'Esa política o información no consta en los documentos disponibles. Consulta con Recursos Humanos (RRHH) para obtener una respuesta oficial.';
const MARCADOR_SIN_RESPALDO = /no encontr[eé] información|no consta|sin respaldo/i;

let buscador = buscarFragmentosLocales;

function configurarBuscadorRag(funcion) {
  if (typeof funcion !== 'function') {
    throw new TypeError('El buscador RAG debe ser una función.');
  }
  buscador = funcion;
}

function normalizarFragmentos(resultado) {
  if (typeof resultado === 'string') {
    return [{ contenido: resultado }];
  }

  if (Array.isArray(resultado)) {
    return resultado
      .map((item) => {
        if (typeof item === 'string') {
          return { contenido: item };
        }

        const objeto = item || {};
        const metadatos = objeto.metadatos || {};
        return {
          contenido:
            objeto.contenido || objeto.texto || objeto.content || objeto.chunk || String(objeto),
          documento:
            objeto.documento ||
            objeto.documento_nombre ||
            objeto.nombre ||
            objeto.documentName ||
            objeto.fileName,
          seccion:
            objeto.seccion ||
            objeto.section ||
            objeto.titulo ||
            metadatos.seccion ||
            metadatos.titulo,
          enlace:
            objeto.enlace ||
            objeto.url ||
            objeto.link ||
            objeto.driveUrl ||
            metadatos.enlace ||
            metadatos.url
        };
      })
      .filter((fragmento) => fragmento.contenido);
  }

  const objeto = resultado || {};
  const lista = objeto.rows || objeto.fragmentos || objeto.chunks || objeto.resultados || [objeto];
  return normalizarFragmentos(lista);
}

function construirCitas(fragmentos) {
  const vistas = new Set();

  return fragmentos
    .map((fragmento) => ({
      documento: fragmento.documento || 'Documento RRHH',
      seccion: fragmento.seccion || 'Sección no indicada',
      enlace: fragmento.enlace || ''
    }))
    .filter((cita) => {
      const clave = `${cita.documento}|${cita.seccion}|${cita.enlace}`;
      if (vistas.has(clave)) return false;
      vistas.add(clave);
      return true;
    });
}

function registrarFalloRAG(origen, error) {
  process.stderr.write(`[RAG][${origen}] ${error.stack || error.message}\n`);
}

async function buscarEnRag(pregunta) {
  let resultado;
  try {
    resultado = await buscador(pregunta);
  } catch (error) {
    registrarFalloRAG('BUSCADOR', error);
    return { texto: SIN_RESPALDO, citas: [] };
  }

  let fragmentos;
  try {
    fragmentos = normalizarFragmentos(resultado);
  } catch (error) {
    registrarFalloRAG('FORMATO', error);
    return { texto: SIN_RESPALDO, citas: [] };
  }

  if (fragmentos.length === 0) {
    return { texto: SIN_RESPALDO, citas: [] };
  }

  let texto;
  try {
    texto = await resumirFragmentos(pregunta, fragmentos);
  } catch (error) {
    process.stderr.write(`[RAG][RESUMEN] ${error.message}\n`);
    texto = fragmentos
      .slice(0, 3)
      .map((fragmento) => `• ${fragmento.contenido} [${fragmento.documento || 'Documento RRHH'}]`)
      .join('\n');
  }

  if (MARCADOR_SIN_RESPALDO.test(String(texto))) {
    return { texto: SIN_RESPALDO, citas: [] };
  }

  return { texto, citas: construirCitas(fragmentos) };
}

module.exports = { configurarBuscadorRag, buscarEnRag };
