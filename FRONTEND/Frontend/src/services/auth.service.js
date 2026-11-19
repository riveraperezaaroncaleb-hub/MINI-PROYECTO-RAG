import api from './api'

const TOKEN_KEY = 'rrhh_token'
const USER_KEY = 'rrhh_usuario'

export async function iniciarSesion(nombre) {
  const { data } = await api.post('/auth/login', { nombre })
  sessionStorage.setItem(TOKEN_KEY, data.token)
  sessionStorage.setItem(USER_KEY, JSON.stringify(data.usuario))
  return data.usuario
}

export function cerrarSesion() {
  sessionStorage.removeItem(TOKEN_KEY)
  sessionStorage.removeItem(USER_KEY)
}

export function obtenerSesion() {
  const token = sessionStorage.getItem(TOKEN_KEY)
  if (!token) return null

  try {
    const usuario = JSON.parse(sessionStorage.getItem(USER_KEY) || 'null')
    return usuario ? { token, usuario } : null
  } catch {
    return null
  }
}
