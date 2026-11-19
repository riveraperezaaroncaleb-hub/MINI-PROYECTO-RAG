export default function ExecutiveSummary({ resumen, fecha }) {
  return (
    <section className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-semibold text-emerald-300">Resumen ejecutivo del día</h3>
        {fecha && (
          <span className="text-xs text-slate-400">
            {new Date(fecha).toLocaleDateString('es', { day: '2-digit', month: 'long', year: 'numeric' })}
          </span>
        )}
      </div>
      <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-200">
        {resumen || 'Aún no hay un resumen generado para esta fecha.'}
      </p>
    </section>
  )
}
