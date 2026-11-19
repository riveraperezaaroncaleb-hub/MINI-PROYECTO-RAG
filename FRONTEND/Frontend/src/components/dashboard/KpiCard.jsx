export default function KpiCard({ titulo, valor, sufijo = '' }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
      <p className="text-sm text-slate-400">{titulo}</p>
      <p className="mt-2 text-3xl font-bold text-emerald-400">
        {valor}
        {sufijo && <span className="ml-1 text-base font-medium text-slate-400">{sufijo}</span>}
      </p>
    </div>
  )
}
