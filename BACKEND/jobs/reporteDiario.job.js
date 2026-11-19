'use strict';

const cron = require('node-cron');
const { generarReporteDiario } = require('../services/analista.service');

let tarea = null;
let ultimoError = null;

function iniciarReporteDiario() {
  if (tarea) {
    return tarea;
  }

  tarea = cron.schedule('0 7 * * *', async () => {
    try {
      await generarReporteDiario();
      ultimoError = null;
    } catch (error) {
      ultimoError = error;
    }
  });

  return tarea;
}

function detenerReporteDiario() {
  if (tarea) {
    tarea.stop();
    tarea = null;
  }
}

function obtenerUltimoError() {
  return ultimoError;
}

if (require.main === module) {
  iniciarReporteDiario();
}

module.exports = {
  iniciarReporteDiario,
  detenerReporteDiario,
  obtenerUltimoError
};
