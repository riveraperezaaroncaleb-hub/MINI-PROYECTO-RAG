'use strict';

const { ReporteDiario } = require('../models');
const { obtenerCifras } = require('./reporte.service');
const { generarResumen } = require('./llm-reporte.service');

async function generarReporteDiario(fecha = new Date()) {
  const cifras = await obtenerCifras(fecha);
  const resumen = await generarResumen(cifras);
  const fechaReporte = cifras.periodo.fecha;

  const [reporte, creado] = await ReporteDiario.findOrCreate({
    where: { fecha: fechaReporte, generado_por: null },
    defaults: { datos_json: cifras, resumen_texto: resumen }
  });

  if (!creado) {
    await reporte.update({ datos_json: cifras, resumen_texto: resumen });
  }

  return reporte;
}

module.exports = { generarReporteDiario };
