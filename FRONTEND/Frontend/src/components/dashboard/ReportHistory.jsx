export default function ReportHistory({ reportes, onSeleccionar, activoId }) {
  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900">
      <h3 className="border-b border-slate-800 px-5 py-4 font-semibold text-slate-100">
        Historial de reportes
      </h3>
      <ul className="max-h-80 divide-y divide-slate-800 overflow-y-auto">
        {reportes.map((reporte) => (
          <li key={reporte.id}>
            <button
              type="button"
              onClick={() => onSeleccionar(reporte.id)}
              className={`w-full px-5 py-3 text-left transition hover:bg-slate-800/60 ${
                activoId === reporte.id ? 'bg-slate-800' : ''
              }`}
            >
              <span className="block text-sm font-medium text-slate-200">
                {new Date(reporte.fecha).toLocaleDateString('es', {
                  weekday: 'short',
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
              <span className="mt-1 block line-clamp-2 text-xs text-slate-500">
                {reporte.resumen_texto}
              </span>
            </button>
          </li>
        ))}
        {reportes.length === 0 && (
          <li className="px-5 py-8 text-center text-sm text-slate-500">Sin reportes guardados.</li>
        )}
      </ul>
    </section>
  )
}
