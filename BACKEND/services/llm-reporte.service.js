'use strict';

require('dotenv').config();

function seleccionarProveedor() {
  if (process.env.GEMINI_API_KEY) return 'gemini';
  if (process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY) return 'anthropic';
  if (process.env.DEEPSEEK_API_KEY) return 'deepseek';
  throw new Error('No hay API key de LLM configurada para el resumen ejecutivo.');
}

function construirPrompt(cifras) {
  return (
    'Eres analista ejecutivo de RRHH. Redacta exclusivamente un resumen de 3 a 5 frases ' +
    'en español, usando solo las cifras del JSON. No inventes datos, no agregues ' +
    'recomendaciones, no uses viñetas ni encabezados. Devuelve solo JSON: {"resumen":"..."}.\n' +
    `Cifras: ${JSON.stringify(cifras)}`
  );
}

function extraerResumen(texto) {
  const inicio = texto.indexOf('{');
  const fin = texto.lastIndexOf('}');

  if (inicio === -1 || fin === -1 || fin <= inicio) {
    throw new Error('El LLM no devolvió un JSON válido.');
  }

  const datos = JSON.parse(texto.slice(inicio, fin + 1));

  if (typeof datos.resumen !== 'string' || !datos.resumen.trim()) {
    throw new Error('El LLM no devolvió un resumen.');
  }

  return datos.resumen.trim();
}

async function llamarGemini(prompt) {
  const modelo = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent` +
    `?key=${encodeURIComponent(process.env.GEMINI_API_KEY)}`;

  const respuesta = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0, responseMimeType: 'application/json' }
    })
  });

  if (!respuesta.ok) {
    throw new Error(`Gemini respondió con el estado ${respuesta.status}.`);
  }

  const datos = await respuesta.json();
  return datos.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

async function llamarAnthropic(prompt) {
  const clave = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY;
  const modelo = process.env.ANTHROPIC_MODEL || 'claude-3-5-haiku-latest';

  const respuesta = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': clave,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: modelo,
      max_tokens: 600,
      temperature: 0,
      messages: [{ role: 'user', content: prompt }]
    })
  });

  if (!respuesta.ok) {
    throw new Error(`Claude respondió con el estado ${respuesta.status}.`);
  }

  const datos = await respuesta.json();
  return datos.content?.[0]?.text || '';
}

async function llamarDeepSeek(prompt) {
  const respuesta = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`
    },
    body: JSON.stringify({
      model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
      temperature: 0,
      stream: false,
      response_format: { type: 'json_object' },
      messages: [{ role: 'user', content: prompt }]
    })
  });

  if (!respuesta.ok) {
    throw new Error(`DeepSeek respondió con el estado ${respuesta.status}.`);
  }

  const datos = await respuesta.json();
  return datos.choices?.[0]?.message?.content || '';
}

async function generarResumen(cifras) {
  const proveedor = seleccionarProveedor();
  const prompt = construirPrompt(cifras);

  const texto =
    proveedor === 'gemini'
      ? await llamarGemini(prompt)
      : proveedor === 'anthropic'
        ? await llamarAnthropic(prompt)
        : await llamarDeepSeek(prompt);

  return extraerResumen(texto);
}

module.exports = { generarResumen };
