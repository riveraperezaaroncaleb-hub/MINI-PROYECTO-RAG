import api from './api'

export async function obtenerPendientes() {
  const { data } = await api.get('/solicitudes/pendientes')
  return data
}

export async function actualizarEstado(id, estado) {
  const { data } = await api.patch(`/solicitudes/${id}/estado`, { estado })
  return data
}
