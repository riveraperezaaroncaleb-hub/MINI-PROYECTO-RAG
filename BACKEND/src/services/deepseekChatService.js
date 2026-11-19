import 'dotenv/config';
import { generarEmbeddings } from './ingestaService.js';
import {
  asegurarEsquemaDocumentos,
  buscarFragmentosLocales,
  pool,
  serializarVectorDocumento,
  TOTAL_DOCUMENTOS
} from './voyageDocsService.js';

const DEEPSEEK_BASE_URL = process.env.DEEPSEEK_BASE_URL ?? 'https://api.deepseek.com';
const DEEPSEEK_CHAT_URL = `${DEEPSEEK_BASE_URL.replace(/\/$/, '')}/chat/completions`;
const DEEPSEEK_MODEL = 'deepseek-chat';
const TOP_K = 6;
const IDS_DOCUMENTOS = Array.from({ length: TOTAL_DOCUMENTOS }, (_, indice) => indice + 1);

export function normalizarPregunta(pregunta) {
  return String(pregunta ?? '').trim();
}

export async function recuperarFragmentos(pregunta, opciones = {}) {
  const texto = normalizarPregunta(pregunta);
  if (!texto) {
    throw new Error('La pregunta no puede estar vacía.');
  }

  const [embedding] = await generarEmbeddings([texto], { inputType: 'query' });
  await asegurarEsquemaDocumentos();

  const topK = Math.min(Math.max(1, Math.floor(Number(opciones.topK) || TOP_K)), 50);

  let rows;
  try {
    ({ rows } = await pool.query(
      `SELECT doc_id,
              canal,
              documento_nombre,
              documento_url,
              titulo,
              contenido,
              1 - (embedding <=> $1::vector) AS similitud
       FROM documentos_voyage
       WHERE doc_id = ANY($2::int[])
       ORDER BY embedding <=> $1::vector ASC
       LIMIT $3`,
      [serializarVectorDocumento(embedding), IDS_DOCUMENTOS, topK]
    ));
  } catch {
    rows = await buscarFragmentosLocales(embedding, topK);
  }

  return rows.map((fila) => ({
    docId: Number(fila.doc_id),
    canal: fila.canal,
    documento: fila.documento_nombre,
    url: fila.documento_url ?? null,
    seccion: fila.titulo ?? null,
    contenido: fila.contenido,
    similitud: Number(fila.similitud ?? 0)
  }));
}

function construirContexto(fragmentos) {
  return fragmentos
    .map((fragmento, indice) => [
      `[${indice + 1}] Documento: ${fragmento.canal} — ${fragmento.documento}`,
      `Sección: ${fragmento.seccion ?? 'No indicada'}`,
      `Similitud: ${Number(fragmento.similitud).toFixed(4)}`,
      `Contenido: ${fragmento.contenido}`
    ].join('\n'))
    .join('\n\n');
}

export function construirCitas(fragmentos) {
  const vistas = new Map();

  for (const fragmento of fragmentos) {
    if (vistas.has(fragmento.canal)) continue;
    vistas.set(fragmento.canal, {
      docId: fragmento.docId,
      canal: fragmento.canal,
      documento: fragmento.documento,
      url: fragmento.url,
      seccion: fragmento.seccion,
      similitud: fragmento.similitud
    });
  }

  return [...vistas.values()];
}

async function llamarDeepSeek(mensajes) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error('Falta DEEPSEEK_API_KEY para responder al chat.');
  }

  const respuesta = await fetch(DEEPSEEK_CHAT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: DEEPSEEK_MODEL,
      messages: mensajes,
      temperature: 0,
      stream: false
    })
  });

  if (!respuesta.ok) {
    const detalle = (await respuesta.text().catch(() => '')).slice(0, 500);
    throw new Error(`DeepSeek respondió con el estado ${respuesta.status}. ${detalle}`.trim());
  }

  const datos = await respuesta.json();
  const contenido = datos.choices?.[0]?.message?.content;

  if (typeof contenido !== 'string' || !contenido.trim()) {
    throw new Error('DeepSeek devolvió una respuesta vacía.');
  }

  return contenido.trim();
}

function construirMensajes(texto, fragmentos, historial) {
  const previos = Array.isArray(historial)
    ? historial
        .filter((mensaje) =>
          ['user', 'assistant'].includes(mensaje?.role) &&
          typeof mensaje?.content === 'string' &&
          mensaje.content.trim()
        )
        .slice(-6)
        .map((mensaje) => ({ role: mensaje.role, content: mensaje.content.trim() }))
    : [];

  return [
    {
      role: 'system',
      content: [
        'Eres el asistente oficial de TechNova Costa Rica S.A.',
        'Responde en español, de forma precisa y breve, usando únicamente el CONTEXTO recuperado.',
        'El contexto proviene de los 11 documentos indexados, identificados como doc_1 a doc_11.',
        'Cita cada afirmación con el identificador del documento entre corchetes, por ejemplo [doc_1].',
        'Al final incluye una sección "Fuentes" donde cada identificador citado indique el documento.',
        'No inventes datos ni citas que no aparezcan en el contexto.',
        'Si el contexto no responde la pregunta, responde exactamente:',
        '"No encontré información en los documentos para esta consulta."'
      ].join(' ')
    },
    ...previos,
    {
      role: 'user',
      content: [
        `Pregunta: ${texto}`,
        '',
        'Contexto recuperado:',
        construirContexto(fragmentos)
      ].join('\n')
    }
  ];
}

export async function responderChat(pregunta, opciones = {}) {
  const texto = normalizarPregunta(pregunta);
  if (!texto) {
    throw new Error('La pregunta no puede estar vacía.');
  }

  const fragmentos = await recuperarFragmentos(texto, opciones);

  if (fragmentos.length === 0) {
    return {
      respuesta: 'No encontré información en los documentos para esta consulta.',
      citas: [],
      fragmentos: []
    };
  }

  const respuesta = await llamarDeepSeek(construirMensajes(texto, fragmentos, opciones.historial));

  return {
    respuesta,
    citas: construirCitas(fragmentos),
    fragmentos
  };
}

export default responderChat;
