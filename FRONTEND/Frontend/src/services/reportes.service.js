import api from './api'

export async function obtenerReporteActual() {
  const { data } = await api.get('/reportes/actual')
  return data
}

export async function obtenerReportePorId(id) {
  const { data } = await api.get(`/reportes/${id}`)
  return data
}

export async function obtenerHistorial() {
  const { data } = await api.get('/reportes', { params: { limite: 30 } })
  return data
}

export async function obtenerTendencia() {
  const { data } = await api.get('/reportes/tendencia', { params: { dias: 30 } })
  return data
}
