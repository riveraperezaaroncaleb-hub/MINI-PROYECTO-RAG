'use strict';

const { buscarEnRag } = require('../rag.service');

async function responder({ pregunta }) {
  const resultado = await buscarEnRag(pregunta);
  return { texto: resultado.texto, citas: resultado.citas };
}

module.exports = { responder };
