'use strict';

require('dotenv').config();

const API_KEY = process.env.DEEPSEEK_API_KEY;
const BASE_URL = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com';
const MODELO = process.env.DEEPSEEK_MODEL || 'deepseek-chat';

const INTENCIONES = [
  'POLITICA',
  'DATO_PERSONAL',
  'MIXTA',
  'RESTRINGIDA',
  'FUERA_ALCANCE'
];

async function completar(mensajes, { json = false } = {}) {
  if (!API_KEY) {
    throw new Error('Falta DEEPSEEK_API_KEY para consultar el LLM.');
  }

  const cuerpo = {
    model: MODELO,
    messages: mensajes,
    temperature: 0,
    stream: false
  };

  if (json) {
    cuerpo.response_format = { type: 'json_object' };
  }

  const respuesta = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_KEY}`
    },
    body: JSON.stringify(cuerpo)
  });

  if (!respuesta.ok) {
    throw new Error(`DeepSeek respondió con el estado ${respuesta.status}.`);
  }

  const datos = await respuesta.json();
  return datos.choices?.[0]?.message?.content || '';
}

async function clasificarIntencion(pregunta) {
  const contenido = await completar([
    {
      role: 'system',
      content:
        'Clasifica la pregunta en una sola intención: POLITICA (políticas o documentos de RRHH), ' +
        'DATO_PERSONAL (datos propios del colaborador), MIXTA (política y datos propios), ' +
        'RESTRINGIDA (datos de otros empleados o salarios confidenciales), FUERA_ALCANCE (otro tema). ' +
        'Responde solo con JSON: {"intencion":"NOMBRE"}.'
    },
    { role: 'user', content: pregunta }
  ], { json: true });

  let datos;
  try {
    datos = JSON.parse(contenido);
  } catch {
    throw new Error('El clasificador devolvió una respuesta inválida.');
  }

  if (!INTENCIONES.includes(datos.intencion)) {
    throw new Error('El clasificador devolvió una intención desconocida.');
  }

  return datos.intencion;
}

async function resumirFragmentos(pregunta, fragmentos) {
  const contexto = fragmentos
    .map((fragmento, indice) => {
      const documento = fragmento.documento || 'Documento no indicado';
      const seccion = fragmento.seccion || 'Sección no indicada';
      const enlace = fragmento.enlace ? ` | Enlace: ${fragmento.enlace}` : '';
      return `[${indice + 1}] Documento: ${documento} | Sección: ${seccion}${enlace}\n${fragmento.contenido}`;
    })
    .join('\n\n');

  const contenido = await completar([
    {
      role: 'system',
      content:
        'Eres el asistente de políticas de la institución. Procesa los fragmentos y responde ' +
        'en español de forma clara, precisa y muy resumida: máximo 3 ' +
        'viñetas de una sola línea cada una, sin introducciones ni despedidas. Usa únicamente ' +
        'la información de los fragmentos proporcionados y cita el documento fuente entre ' +
        'corchetes, por ejemplo [Política de Vacaciones.pdf]. No inventes datos ni agregues ' +
        'recomendaciones fuera del texto. Si los fragmentos no responden a la pregunta, indica ' +
        'exactamente: "No encontré información en los documentos".'
    },
    {
      role: 'user',
      content: `Pregunta: ${pregunta}\n\nFragmentos:\n${contexto}`
    }
  ]);

  return contenido.trim() || 'No encontré información en los documentos.';
}

module.exports = { clasificarIntencion, resumirFragmentos, INTENCIONES };
