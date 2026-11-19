import { useEffect, useRef, useState } from 'react'
import ChatInput from '../components/chat/ChatInput'
import MessageBubble from '../components/chat/MessageBubble'
import Spinner from '../components/Spinner'
import { enviarPregunta } from '../services/chat.service'

const BIENVENIDA = {
  id: 0,
  autor: 'asistente',
  texto: '¡Hola! Soy el asistente de políticas de RRHH. Pregúntame sobre vacaciones, permisos, incapacidades o cualquier política interna.',
  citas: [],
}

export default function ChatView() {
  const [mensajes, setMensajes] = useState([BIENVENIDA])
  const [entrada, setEntrada] = useState('')
  const [cargando, setCargando] = useState(false)
  const finalRef = useRef(null)

  useEffect(() => {
    finalRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensajes, cargando])

  const enviar = async () => {
    const pregunta = entrada.trim()
    if (!pregunta || cargando) return

    setMensajes((actuales) => [...actuales, { id: Date.now(), autor: 'usuario', texto: pregunta }])
    setEntrada('')
    setCargando(true)

    try {
      const respuesta = await enviarPregunta(pregunta)
      setMensajes((actuales) => [
        ...actuales,
        {
          id: Date.now() + 1,
          autor: 'asistente',
          texto: respuesta.respuesta || 'No obtuve una respuesta.',
          citas: respuesta.citas || [],
          agente: respuesta.agente,
        },
      ])
    } catch (error) {
      const detalle =
        error.response?.data?.error || (error.response ? `HTTP ${error.response.status}` : error.message)
      setMensajes((actuales) => [
        ...actuales,
        {
          id: Date.now() + 1,
          autor: 'asistente',
          texto: `No pude conectar con el portal. ${detalle}`,
          citas: [],
        },
      ])
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-9rem)] max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">
      <div className="border-b border-slate-800 px-6 py-4">
        <h2 className="text-lg font-semibold text-slate-100">Consulta de políticas</h2>
        <p className="text-xs text-slate-500">Respuestas basadas en documentos oficiales de RRHH</p>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-6 py-6">
        {mensajes.map((mensaje) => (
          <MessageBubble key={mensaje.id} mensaje={mensaje} />
        ))}
        {cargando && <Spinner label="El orquestador está consultando…" />}
        <div ref={finalRef} />
      </div>

      <ChatInput value={entrada} onChange={setEntrada} onEnviar={enviar} cargando={cargando} />
    </div>
  )
}
