'use strict';

const { obtenerResumen } = require('../datos.service');

async function responder({ usuario }) {
  return { texto: await obtenerResumen(usuario), citas: [] };
}

module.exports = { responder };
