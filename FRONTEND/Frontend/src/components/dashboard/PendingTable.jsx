import { useState } from 'react'

export default function PendingTable({ solicitudes, onCambiarEstado }) {
  const [departamento, setDepartamento] = useState('')
  const departamentos = [...new Set(solicitudes.map((s) => s.colaborador?.departamento).filter(Boolean))]
  const filtradas = departamento
    ? solicitudes.filter((s) => s.colaborador?.departamento === departamento)
    : solicitudes

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 px-5 py-4">
        <h3 className="font-semibold text-slate-100">Solicitudes pendientes</h3>
        <select
          value={departamento}
          onChange={(evento) => setDepartamento(evento.target.value)}
          className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200"
        >
          <option value="">Todos los departamentos</option>
          {departamentos.map((nombre) => (
            <option key={nombre} value={nombre}>
              {nombre}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-5 py-3">Colaborador</th>
              <th className="px-5 py-3">Departamento</th>
              <th className="px-5 py-3">Tipo</th>
              <th className="px-5 py-3">Creada</th>
              <th className="px-5 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {filtradas.map((solicitud) => (
              <tr key={solicitud.id} className="hover:bg-slate-800/40">
                <td className="px-5 py-3 text-slate-200">{solicitud.colaborador?.nombre || '—'}</td>
                <td className="px-5 py-3 text-slate-400">{solicitud.colaborador?.departamento || '—'}</td>
                <td className="px-5 py-3 text-slate-300">{solicitud.tipo}</td>
                <td className="px-5 py-3 text-slate-400">
                  {new Date(solicitud.creada_en).toLocaleDateString('es')}
                </td>
                <td className="px-5 py-3">
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => onCambiarEstado(solicitud.id, 'Aprobada')}
                      className="rounded-lg bg-emerald-500/15 px-3 py-1.5 text-xs font-medium text-emerald-300 hover:bg-emerald-500/25"
                    >
                      Aprobar
                    </button>
                    <button
                      type="button"
                      onClick={() => onCambiarEstado(solicitud.id, 'Rechazada')}
                      className="rounded-lg bg-rose-500/15 px-3 py-1.5 text-xs font-medium text-rose-300 hover:bg-rose-500/25"
                    >
                      Rechazar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtradas.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-slate-500">
                  No hay solicitudes pendientes.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
