import 'dotenv/config';
import { buscarFragmentosPorSimilitud, generarEmbeddings } from './ingestaService.js';
import { normalizarArea, normalizarAreaClasificador } from '../utils/areas.js';
import { TIMEOUT_EXTERNO_MS } from '../config/rag.js';
import { derivarSiSinRespaldo } from './orquestadorService.js';
import { buscarFragmentosLocales } from './voyageDocsService.js';

/** Endpoint y modelo exigidos para la orquestación con DeepSeek. */
const DEEPSEEK_CHAT_URL = 'https://api.deepseek.com/chat/completions';
const DEEPSEEK_MODEL = 'deepseek-chat';

/** Intenciones y áreas reconocidas por el orquestador. */
const INTENCIONES = new Set([
  'POLITICA',
  'DATO_PERSONAL',
  'MIXTA',
  'RESTRINGIDA',
  'FUERA_ALCANCE'
]);
const INTENCIONES_SIN_RECUPERACION = new Set(['RESTRINGIDA', 'FUERA_ALCANCE']);

/**
 * Extrae un objeto JSON de una respuesta del modelo, incluso si viene entre bloques Markdown.
 * @param {string} contenido Respuesta del modelo.
 * @returns {Object} Objeto parseado.
 */
function extraerJson(contenido) {
  const limpio = String(contenido ?? '')
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();
  const inicio = limpio.indexOf('{');
  const fin = limpio.lastIndexOf('}');

  if (inicio === -1 || fin <= inicio) {
    throw new Error('DeepSeek no devolvió un objeto JSON válido.');
  }

  return JSON.parse(limpio.slice(inicio, fin + 1));
}

/**
 * Invoca al endpoint de chat de DeepSeek.
 * @param {Array<{role: string, content: string}>} mensajes Conversación a enviar.
 * @param {Object} [opciones] Opciones de llamada.
 * @param {boolean} [opciones.json] Solicita respuesta en modo JSON.
 * @returns {Promise<string>} Contenido textual de la respuesta.
 */
async function llamarDeepSeek(mensajes, { json = false } = {}) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error('Falta DEEPSEEK_API_KEY para consultar el orquestador.');
  }

  const cuerpo = {
    model: DEEPSEEK_MODEL,
    messages: mensajes,
    temperature: 0,
    stream: false
  };

  if (json) cuerpo.response_format = { type: 'json_object' };

  const respuesta = await fetch(DEEPSEEK_CHAT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify(cuerpo),
    signal: AbortSignal.timeout(TIMEOUT_EXTERNO_MS)
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

/**
 * Clasifica la intención del usuario y selecciona el área especialista.
 * @param {string} pregunta Pregunta original del usuario.
 * @returns {Promise<{intencion: string, area: string, consulta: string}>} Clasificación validada.
 */
export async function clasificarIntencion(pregunta) {
  const contenido = await llamarDeepSeek(
    [
      {
        role: 'system',
        content: [
          'Eres el orquestador multiagente de TechNova Costa Rica S.A.',
          'Clasifica la consulta del usuario en una sola intención:',
          'POLITICA (normas, políticas o procedimientos documentados),',
          'DATO_PERSONAL (datos propios del colaborador),',
          'MIXTA (política documentada más datos propios),',
          'RESTRINGIDA (datos de terceros, salarios ajenos o información confidencial),',
          'FUERA_ALCANCE (cualquier otro tema).',
          'Selecciona también un área de especialista: RRHH, TECNOLOGIA, FINANCIAS,',
          'VENTAS, LEGAL, OPERACIONES o GENERAL.',
          'Reformula la consulta para búsqueda vectorial sin perder el significado.',
          'Responde solo con JSON: {"intencion":"NOMBRE","area":"AREA","consulta":"CONSULTA"}.'
        ].join(' ')
      },
      { role: 'user', content: String(pregunta ?? '').trim() }
    ],
    { json: true }
  );

  const datos = extraerJson(contenido);
  const intencion = String(datos.intencion ?? '').trim().toUpperCase();
  const consulta = String(datos.consulta ?? '').trim();

  if (!INTENCIONES.has(intencion)) {
    throw new Error(`El clasificador devolvió una intención desconocida: ${intencion || 'vacía'}.`);
  }

  return {
    intencion,
    area: normalizarAreaClasificador(datos.area),
    consulta: consulta || String(pregunta).trim()
  };
}

/**
 * Devuelve la respuesta institucional cuando no corresponde recuperar documentos.
 * @param {string} intencion Intención clasificada.
 * @returns {string} Mensaje de respuesta.
 */
function respuestaSinRecuperacion(intencion) {
  if (intencion === 'RESTRINGIDA') {
    return 'No puedo compartir información restringida de otras personas ni datos confidenciales.';
  }
  return 'Esta consulta está fuera del alcance del asistente de TechNova Costa Rica S.A.';
}

/**
 * Construye el contexto numerado que se entrega al sub-agente especialista.
 * @param {Array<Object>} fragmentos Fragmentos recuperados de fragmentos_rag.
 * @returns {string} Contexto listo para el prompt.
 */
function construirContexto(fragmentos) {
  return fragmentos
    .map((fragmento, indice) => {
      const similitud = Number(fragmento.similitud ?? 0).toFixed(4);
      return [
        `[${indice + 1}] Documento fuente: ${fragmento.documento_nombre ?? 'No indicado'}`,
        `Área: ${fragmento.area ?? 'No indicada'}`,
        `Sección: ${fragmento.titulo ?? 'No indicada'}`,
        `Chunk: ${fragmento.chunk_index ?? 'No indicado'}`,
        `URL: ${fragmento.documento_url ?? 'No indicada'}`,
        `Similitud: ${similitud}`,
        `Contenido: ${fragmento.contenido}`
      ].join('\n');
    })
    .join('\n\n');
}

/**
 * Genera las citas estructuradas devueltas al cliente.
 * @param {Array<Object>} fragmentos Fragmentos recuperados.
 * @returns {Array<Object>} Citas numeradas en el mismo orden que el contexto.
 */
function construirCitas(fragmentos) {
  return fragmentos.map((fragmento, indice) => ({
    numero: indice + 1,
    documento: fragmento.documento_nombre ?? 'Documento fuente no indicado',
    area: fragmento.area ?? null,
    seccion: fragmento.titulo ?? null,
    chunk_index: fragmento.chunk_index ?? null,
    drive_url: fragmento.documento_url ?? null,
    similitud: Number(fragmento.similitud ?? 0)
  }));
}

function citasUsadas(respuesta, fragmentos) {
  const numeros = new Set(
    [...String(respuesta ?? '').matchAll(/\[(\d+)\]/g)].map((coincidencia) => Number(coincidencia[1]))
  );
  if (!numeros.size) return [];

  return construirCitas(fragmentos).filter((cita) => numeros.has(cita.numero));
}

/**
 * Recupera los fragmentos más cercanos a la consulta mediante similitud coseno.
 * @param {string} consulta Consulta reformulada por el orquestador.
 * @param {string} area Área del especialista, usada como filtro.
 * @param {Object} [opciones] Opciones de recuperación.
 * @returns {Promise<Array<Object>>} Fragmentos recuperados.
 */
async function recuperarFragmentos(consulta, area, opciones = {}) {
  const [embedding] = await generarEmbeddings([consulta], { inputType: 'query' });

  try {
    return await buscarFragmentosPorSimilitud({
      embedding,
      area: area === 'GENERAL' ? '' : normalizarArea(area),
      empresaId: opciones.empresaId,
      topK: opciones.topK ?? 5
    });
  } catch {
    return buscarFragmentosLocales(embedding, opciones.topK ?? 5);
  }
}

/**
 * Sub-agente especialista: responde usando únicamente los fragmentos recuperados.
 * @param {Object} opciones Parámetros del especialista.
 * @param {string} opciones.consulta Consulta reformulada.
 * @param {string} opciones.intencion Intención clasificada.
 * @param {string} opciones.area Área especialista.
 * @param {Array<Object>} opciones.fragmentos Fragmentos recuperados.
 * @returns {Promise<string>} Respuesta citada en español.
 */
export async function responderComoEspecialista({ consulta, intencion, area, fragmentos }) {
  if (!fragmentos.length) {
    return 'No encontré información en los documentos para esta consulta.';
  }

  return llamarDeepSeek([
    {
      role: 'system',
      content: [
        `Eres el sub-agente especialista en ${area} de TechNova Costa Rica S.A.`,
        'Responde en español, de forma precisa y breve, usando únicamente el CONTEXTO proporcionado.',
        'Cita cada afirmación con el número de fragmento correspondiente, por ejemplo [1] o [2].',
        'Al final incluye una sección "Fuentes" donde cada número citado vaya seguido del',
        'documento fuente indicado en el contexto. No inventes datos ni citas.',
        'Si el contexto no responde la pregunta, responde exactamente:',
        '"No encontré información en los documentos para esta consulta."'
      ].join(' ')
    },
    {
      role: 'user',
      content: [
        `Intención: ${intencion}`,
        `Pregunta: ${consulta}`,
        '',
        'Contexto recuperado:',
        construirContexto(fragmentos)
      ].join('\n')
    }
  ]);
}

/**
 * Ejecuta el flujo multiagente completo: clasificación, recuperación y respuesta citada.
 * @param {string} pregunta Pregunta del usuario.
 * @param {Object} [opciones] Opciones de ejecución.
 * @param {string} [opciones.area] Fuerza el área del especialista.
 * @param {number} [opciones.topK] Cantidad de fragmentos a recuperar.
 * @param {string|number|null} [opciones.empresaId] Filtro opcional de empresa.
 * @returns {Promise<Object>} Respuesta, intención, área, citas y fragmentos usados.
 */
export async function consultarMultiAgente(pregunta, opciones = {}) {
  const textoPregunta = String(pregunta ?? '').trim();
  if (!textoPregunta) {
    throw new Error('La pregunta no puede estar vacía.');
  }

  const clasificacion = await clasificarIntencion(textoPregunta);
  const area = opciones.area ? normalizarAreaClasificador(opciones.area) : clasificacion.area;
  const resultadoBase = {
    intencion: clasificacion.intencion,
    area,
    consulta: clasificacion.consulta
  };

  if (INTENCIONES_SIN_RECUPERACION.has(clasificacion.intencion)) {
    if (clasificacion.intencion === 'RESTRINGIDA') {
      return {
        ...resultadoBase,
        respuesta: respuestaSinRecuperacion(clasificacion.intencion),
        citas: [],
        fragmentos: []
      };
    }
    return derivarSiSinRespaldo({
      ...resultadoBase,
      respuesta: respuestaSinRecuperacion(clasificacion.intencion),
      citas: [],
      fragmentos: []
    });
  }

  const fragmentos = await recuperarFragmentos(clasificacion.consulta, area, opciones);

  if (!fragmentos.length) {
    return derivarSiSinRespaldo({
      ...resultadoBase,
      respuesta: '',
      citas: [],
      fragmentos: []
    });
  }

  const respuesta = await responderComoEspecialista({
    consulta: clasificacion.consulta,
    intencion: clasificacion.intencion,
    area,
    fragmentos
  });

  return derivarSiSinRespaldo({
    ...resultadoBase,
    respuesta,
    citas: citasUsadas(respuesta, fragmentos),
    fragmentos
  });
}

export const procesarConsulta = consultarMultiAgente;
export default consultarMultiAgente;
