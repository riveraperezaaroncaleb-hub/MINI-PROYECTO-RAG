import CitationCard from './CitationCard'

const ETIQUETAS_AGENTE = {
  politicas: 'Agente de políticas',
  datos: 'Agente de datos',
  'politicas+datos': 'Agentes de políticas y datos',
  orquestador: 'Orquestador',
}

export default function MessageBubble({ mensaje }) {
  const esUsuario = mensaje.autor === 'usuario'

  return (
    <div className={`flex ${esUsuario ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-lg md:max-w-[70%] ${
          esUsuario
            ? 'rounded-br-sm bg-emerald-500 text-slate-950'
            : 'rounded-bl-sm border border-slate-700 bg-slate-800 text-slate-100'
        }`}
      >
        {!esUsuario && mensaje.agente && (
          <p className="mb-2 inline-flex rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-300">
            {ETIQUETAS_AGENTE[mensaje.agente] || 'Asistente'}
          </p>
        )}
        <p className="whitespace-pre-wrap text-sm leading-relaxed">{mensaje.texto}</p>
        {!esUsuario && mensaje.citas?.length > 0 && (
          <div className="border-t border-slate-700 pt-2">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Fuentes</p>
            {mensaje.citas.map((cita, indice) => (
              <CitationCard key={`${mensaje.id}-cita-${indice}`} cita={cita} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
