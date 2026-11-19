import api from './api'

export async function enviarPregunta(pregunta) {
  const { data } = await api.post('/chat', { pregunta })
  return data
}
