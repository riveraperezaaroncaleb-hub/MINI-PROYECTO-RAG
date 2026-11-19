export default function CitationCard({ cita }) {
  const datos = typeof cita === 'string' ? { documento: cita } : cita || {}
  const documento = datos.documento || datos.nombre || 'Documento sin nombre'
  const seccion = datos.seccion || 'Sección no indicada'
  const enlace = datos.enlace || datos.url || datos.link

  return (
    <div className="mt-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
      <p className="text-sm font-semibold text-emerald-300">{documento}</p>
      <p className="text-xs text-slate-400">{seccion}</p>
      {enlace && (
        <a
          href={enlace}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-block text-xs font-medium text-emerald-400 underline hover:text-emerald-300"
        >
          Abrir en Google Drive ↗
        </a>
      )}
    </div>
  )
}
