const METRICAS = [
  ['ausenciasHoy', 'Ausencias hoy'],
  ['pendientes', 'Solicitudes pendientes'],
  ['pendientesMasTresDias', 'Pendientes > 3 días'],
  ['incapacidadesActivas', 'Incapacidades activas'],
  ['movimientosRecientes', 'Movimientos recientes'],
  ['consultasRecientes', 'Consultas recientes'],
]

function resumen(persona) {
  const partes = []

  if (persona.ausenciasHoy) partes.push(`${persona.ausenciasHoy} ausencia(s) hoy`)
  if (persona.pendientes) partes.push(`${persona.pendientes} solicitud(es) pendiente(s)`)
  if (persona.pendientesMasTresDias) partes.push(`${persona.pendientesMasTresDias} con más de tres días`)
  if (persona.incapacidadesActivas) partes.push(`${persona.incapacidadesActivas} incapacidad(es) activa(s)`)
  if (persona.movimientosRecientes) partes.push(`${persona.movimientosRecientes} movimiento(s) reciente(s)`)
  if (persona.consultasRecientes) partes.push(`${persona.consultasRecientes} consulta(s) reciente(s)`)

  return partes.length
    ? `Reporte individual: ${partes.join(', ')}.`
    : 'Reporte individual: sin valores registrados en el periodo.'
}

export default function CollaboratorReports({ colaboradores, seleccionado, onSeleccionar }) {
  const persona = colaboradores.find((item) => item.id === seleccionado) ?? null

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900 p-5">
      <h3 className="mb-4 font-semibold text-slate-100">Reportes individuales</h3>

      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <ul className="max-h-80 space-y-1 overflow-y-auto pr-1">
          {colaboradores.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onSeleccionar(item.id)}
                className={`w-full rounded-lg border px-3 py-2 text-left transition ${
                  seleccionado === item.id
                    ? 'border-emerald-400 bg-emerald-500/10'
                    : 'border-slate-800 bg-slate-950/40 hover:border-slate-600'
                }`}
              >
                <span className="block text-sm text-slate-100">{item.nombre}</span>
                <span className="block text-xs text-slate-500">{item.departamento}</span>
              </button>
            </li>
          ))}
          {colaboradores.length === 0 && (
            <li className="py-6 text-center text-sm text-slate-500">
              Sin colaboradores en el reporte.
            </li>
          )}
        </ul>

        <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-4">
          {persona ? (
            <>
              <h4 className="text-lg font-semibold text-emerald-300">{persona.nombre}</h4>
              <p className="text-sm text-slate-500">
                {persona.departamento} · {persona.puesto}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-slate-200">{resumen(persona)}</p>

              <dl className="mt-4 grid gap-2 sm:grid-cols-2">
                {METRICAS.map(([clave, etiqueta]) => (
                  <div
                    key={clave}
                    className="flex items-center justify-between rounded-lg bg-slate-900 px-3 py-2"
                  >
                    <dt className="text-xs text-slate-400">{etiqueta}</dt>
                    <dd className="text-sm font-semibold text-slate-100">{persona[clave] ?? 0}</dd>
                  </div>
                ))}
              </dl>
            </>
          ) : (
            <p className="py-10 text-center text-sm text-slate-500">
              Selecciona un colaborador para ver su reporte.
            </p>
          )}
        </div>
      </div>
    </section>
  )
}
