import { useMemo, useState } from 'react'
import { AuthContext } from './auth-context'
import { cerrarSesion, iniciarSesion, obtenerSesion } from '../services/auth.service'

export default function AuthProvider({ children }) {
  const [sesion, setSesion] = useState(obtenerSesion)

  const entrar = async (nombre) => {
    const usuario = await iniciarSesion(nombre)
    setSesion(obtenerSesion())
    return usuario
  }

  const salir = () => {
    cerrarSesion()
    setSesion(null)
  }

  const valor = useMemo(
    () => ({ sesion, iniciarSesion: entrar, cerrarSesion: salir }),
    [sesion],
  )

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>
}
