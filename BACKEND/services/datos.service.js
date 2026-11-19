'use strict';

const { leerJson } = require('./almacen.service');

function formatearSaldos(saldos) {
  if (!saldos.length) return 'Sin saldos registrados.';
  return saldos
    .map((saldo) =>
      `Periodo ${saldo.periodo}: ${saldo.dias_asignados} días asignados, ` +
      `${saldo.dias_tomados} tomados, ${saldo.dias_disponibles} disponibles.`
    )
    .join(' ');
}

function formatearSolicitudes(solicitudes) {
  if (!solicitudes.length) return 'Sin solicitudes registradas.';
  return solicitudes
    .map((solicitud) =>
      `${solicitud.tipo} del ${solicitud.fecha_inicio} al ${solicitud.fecha_fin}, estado ${solicitud.estado}.`
    )
    .join(' ');
}

function formatearIncapacidades(incapacidades) {
  if (!incapacidades.length) return 'Sin incapacidades registradas.';
  return incapacidades
    .map((incapacidad) =>
      `${incapacidad.tipo} desde el ${incapacidad.fecha_inicio}, ${incapacidad.dias} días, entidad ${incapacidad.entidad}.`
    )
    .join(' ');
}

function formatearMovimientos(movimientos) {
  if (!movimientos.length) return 'Sin movimientos registrados.';
  return movimientos
    .map((movimiento) => `${movimiento.tipo} el ${movimiento.fecha}: ${movimiento.motivo}`)
    .join(' ');
}

function ordenarYLimitar(lista, campo, limite) {
  return [...lista]
    .sort((a, b) => String(b[campo] || '').localeCompare(String(a[campo] || '')))
    .slice(0, limite);
}

async function datosDelColaborador(colaboradorId) {
  const datos = await leerJson('colaboradores.json', {});
  const registro = datos[String(colaboradorId)] || {};

  const saldos = ordenarYLimitar(registro.saldos || [], 'periodo', 20);
  const solicitudes = ordenarYLimitar(registro.solicitudes || [], 'creada_en', 10);
  const incapacidades = ordenarYLimitar(registro.incapacidades || [], 'fecha_inicio', 10);
  const movimientos = ordenarYLimitar(registro.movimientos || [], 'fecha', 10);

  return [
    'Vacaciones: ' + formatearSaldos(saldos),
    'Solicitudes: ' + formatearSolicitudes(solicitudes),
    'Incapacidades: ' + formatearIncapacidades(incapacidades),
    'Movimientos: ' + formatearMovimientos(movimientos)
  ].join('\n');
}

async function resumenAgregado() {
  const datos = await leerJson('colaboradores.json', {});
  const resumen = datos._resumen || {};

  return (
    `Datos agregados de RRHH: ${resumen.colaboradores || 0} colaboradores, ` +
    `${resumen.solicitudes || 0} solicitudes, ${resumen.incapacidades || 0} incapacidades y ` +
    `${resumen.diasDisponibles || 0} días de vacaciones disponibles en total.`
  );
}

async function obtenerResumen(usuario) {
  if (!usuario || !usuario.id) {
    throw new Error('Se requiere un colaborador autenticado.');
  }

  const propio = await datosDelColaborador(usuario.id);

  if (usuario.rol !== 'RRHH') {
    return propio;
  }

  return `${propio}\n${await resumenAgregado()}`;
}

module.exports = { obtenerResumen };
