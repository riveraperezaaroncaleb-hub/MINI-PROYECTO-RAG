import { NavLink, Outlet } from 'react-router-dom'

const enlace = ({ isActive }) =>
  `rounded-lg px-4 py-2 text-sm font-medium transition ${
    isActive ? 'bg-emerald-500/15 text-emerald-300' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
  }`

export default function Layout() {
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
            <NavLink to="/dashboard" className={enlace}>
              Dashboard
            </NavLink>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        <Outlet />
      </main>
    </div>
  )
}
