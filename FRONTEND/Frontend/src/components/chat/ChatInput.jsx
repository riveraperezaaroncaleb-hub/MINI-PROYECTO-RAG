export default function ChatInput({ value, onChange, onEnviar, cargando }) {
  return (
    <form
      onSubmit={(evento) => {
        evento.preventDefault()
        if (!cargando && value.trim()) onEnviar()
      }}
      className="flex items-end gap-3 border-t border-slate-800 bg-slate-900 p-4"
    >
      <textarea
        rows={2}
        value={value}
        onChange={(evento) => onChange(evento.target.value)}
        onKeyDown={(evento) => {
          if (evento.key === 'Enter' && !evento.shiftKey) {
            evento.preventDefault()
            if (!cargando && value.trim()) onEnviar()
          }
        }}
        placeholder="Escribe tu pregunta sobre las políticas…"
        className="max-h-32 flex-1 resize-none rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none focus:border-emerald-400"
      />
      <button
        type="submit"
        disabled={cargando || !value.trim()}
        className="rounded-xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Enviar
      </button>
    </form>
  )
}
