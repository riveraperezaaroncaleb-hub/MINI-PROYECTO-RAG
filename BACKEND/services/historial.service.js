'use strict';

const { agregarJson } = require('./almacen.service');

const ARCHIVO = 'consultas_chat.json';

async function registrarConsulta(registro) {
  await agregarJson(ARCHIVO, {
    id: Date.now(),
    fecha: new Date().toISOString(),
    ...registro
  });
}

module.exports = { registrarConsulta };
