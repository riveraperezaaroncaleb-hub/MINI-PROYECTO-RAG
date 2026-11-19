import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'

const enlace = ({ isActive }) =>
  `rounded-lg px-4 py-2 text-sm font-medium transition ${
    isActive ? 'bg-emerald-500/15 text-emerald-300' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
  }`

export default function Layout() {
  const { sesion, cerrarSesion } = useAuth()
  const navigate = useNavigate()

  const salir = () => {
    cerrarSesion()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <div>
            <h1 className="text-lg font-bold tracking-tight text-emerald-400">Portal RRHH</h1>
            <p className="text-xs text-slate-500">Políticas internas con RAG multiagente</p>
          </div>

          <nav className="flex items-center gap-2">
            <NavLink to="/chat" className={enlace}>
              Chat
            </NavLink>
            {sesion?.usuario.rol === 'RRHH' && (
              <NavLink to="/dashboard" className={enlace}>
                Dashboard
              </NavLink>
            )}
          </nav>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium text-slate-200">{sesion?.usuario.nombre}</p>
              <p className="text-xs uppercase tracking-wide text-emerald-400">{sesion?.usuario.rol}</p>
            </div>
            <button
              type="button"
              onClick={salir}
              className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:border-rose-400 hover:text-rose-300"
            >
              Salir
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        <Outlet />
      </main>
    </div>
  )
}
