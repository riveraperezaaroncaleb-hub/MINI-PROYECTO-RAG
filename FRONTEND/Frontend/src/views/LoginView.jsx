import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'

export default function LoginView() {
  const { sesion, iniciarSesion } = useAuth()
  const navigate = useNavigate()
  const [nombre, setNombre] = useState('')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

  if (sesion) {
    return <Navigate to={sesion.usuario.rol === 'RRHH' ? '/dashboard' : '/chat'} replace />
  }

  const entrar = async (valor) => {
    const usuarioValor = String(valor ?? '').trim()
    if (!usuarioValor) {
      setError('Escribe tu nombre de usuario.')
      return
    }

    setError('')
    setCargando(true)

    try {
      const usuario = await iniciarSesion(usuarioValor)
      navigate(usuario.rol === 'RRHH' ? '/dashboard' : '/chat', { replace: true })
    } catch {
      setError('No se pudo iniciar sesión. Verifica el nombre de usuario.')
    } finally {
      setCargando(false)
    }
  }

  const enviar = (evento) => {
    evento.preventDefault()
    entrar(nombre)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
        <h1 className="text-2xl font-bold text-emerald-400">Portal de RRHH</h1>
        <p className="mt-1 text-sm text-slate-500">Ingresa con tu nombre de usuario</p>

        <form onSubmit={enviar} className="mt-8 space-y-5">
          <div>
            <label htmlFor="nombre" className="mb-2 block text-sm font-medium text-slate-300">
              Nombre de usuario
            </label>
            <input
              id="nombre"
              value={nombre}
              onChange={(evento) => setNombre(evento.target.value)}
              autoComplete="username"
              placeholder="Ana García"
              required
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none focus:border-emerald-400"
            />
          </div>

          {error && <p className="text-sm text-rose-400">{error}</p>}

          <button
            type="submit"
            disabled={cargando}
            className="w-full rounded-lg bg-emerald-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:opacity-50"
          >
            {cargando ? 'Ingresando…' : 'Ingresar'}
          </button>
        </form>

        <div className="mt-6 rounded-lg border border-slate-800 bg-slate-950 p-4 text-xs text-slate-400">
          <p className="font-semibold text-slate-300">Usuarios de demostración</p>
          <button
            type="button"
            disabled={cargando}
            onClick={() => entrar('Ana García')}
            className="mt-2 block text-emerald-400 hover:underline disabled:opacity-50"
          >
            Entrar como RRHH: Ana García
          </button>
          <button
            type="button"
            disabled={cargando}
            onClick={() => entrar('María García')}
            className="mt-1 block text-emerald-400 hover:underline disabled:opacity-50"
          >
            Entrar como colaborador: María García
          </button>
        </div>
      </div>
    </div>
  )
}
