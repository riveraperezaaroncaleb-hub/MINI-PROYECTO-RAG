'use strict';

const { ReporteDiario } = require('../models');
const { crearError } = require('../middlewares/errores');

function valor(cifras, ruta, valorPorDefecto = 0) {
  return ruta.reduce((acc, clave) => acc?.[clave], cifras) ?? valorPorDefecto;
}

async function actual(_req, res, next) {
  try {
    const reporte = await ReporteDiario.findOne({ order: [['fecha', 'DESC']] });

    if (!reporte) {
      return next(crearError('Aún no hay reportes generados.', 404));
    }

    return res.json(reporte);
  } catch (error) {
    return next(error);
  }
}

async function historial(req, res, next) {
  const limite = Math.min(Math.max(Number(req.query.limite) || 30, 1), 100);

  try {
    const reportes = await ReporteDiario.findAll({
      attributes: ['id', 'fecha', 'resumen_texto'],
      order: [['fecha', 'DESC']],
      limit: limite
    });

    return res.json(reportes);
  } catch (error) {
    return next(error);
  }
}

async function porId(req, res, next) {
  try {
    const reporte = await ReporteDiario.findByPk(req.params.id);

    if (!reporte) {
      return next(crearError('Reporte no encontrado.', 404));
    }

    return res.json(reporte);
  } catch (error) {
    return next(error);
  }
}

async function tendencia(req, res, next) {
  const dias = Math.min(Math.max(Number(req.query.dias) || 30, 1), 90);

  try {
    const reportes = await ReporteDiario.findAll({
      order: [['fecha', 'DESC']],
      limit: dias
    });

    const datos = reportes
      .reverse()
      .map((reporte) => ({
        fecha: reporte.fecha,
        ausencias: valor(reporte.datos_json, ['ausentesHoy', 'total']),
        pendientes: valor(reporte.datos_json, ['solicitudesPendientes', 'total']),
        incapacidades: valor(reporte.datos_json, ['incapacidades', 'activas']),
        rotacion: valor(reporte.datos_json, ['movimientos', 'rotacionPorcentaje'])
      }));

    return res.json(datos);
  } catch (error) {
    return next(error);
  }
}

module.exports = { actual, historial, porId, tendencia };
