export default function Spinner({ label = 'Cargando…' }) {
  return (
    <div className="flex items-center justify-center gap-3 py-8 text-slate-400" role="status">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-600 border-t-emerald-400" />
      <span>{label}</span>
    </div>
  )
}
