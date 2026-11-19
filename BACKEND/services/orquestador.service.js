'use strict';

const { clasificarIntencion } = require('./llm.service');
const agentes = require('./agentes');

const RESTRINGIDA =
  'No puedo compartir información de otros colaboradores ni salarios confidenciales. ' +
  'Solo puedo ayudarte con tus datos y con las políticas de RRHH.';

const FUERA_ALCANCE =
  'Estoy enfocado en recursos humanos: políticas, vacaciones, solicitudes e incapacidades. ' +
  '¿Te gustaría consultar alguno de esos temas?';

const ETIQUETAS_AGENTE = {
  POLITICA: 'politicas',
  DATO_PERSONAL: 'datos',
  MIXTA: 'politicas+datos',
  RESTRINGIDA: 'orquestador',
  FUERA_ALCANCE: 'orquestador'
};

function respuesta(intencion, texto, citas, agente, resuelta, escalada) {
  return { intencion, respuesta: texto, citas, agente, resuelta, escalada };
}

const PATRON_RESTRINGIDO =
  /(salario|sueldo|incapacidad|vacaciones|movimiento)\s+(de|del|de la)\s+\w|de\s+otros?\s+colaboradores?|datos\s+de\s+\w+/i;

function esRestringida(pregunta) {
  return PATRON_RESTRINGIDO.test(String(pregunta ?? ''));
}

async function orquestar({ pregunta, usuario }) {
  const intencion = esRestringida(pregunta)
    ? 'RESTRINGIDA'
    : await clasificarIntencion(pregunta);
  const agente = ETIQUETAS_AGENTE[intencion] || 'orquestador';

  if (intencion === 'RESTRINGIDA') {
    return respuesta(intencion, RESTRINGIDA, [], agente, true, false);
  }

  if (intencion === 'FUERA_ALCANCE') {
    return respuesta(intencion, FUERA_ALCANCE, [], agente, false, false);
  }

  if (intencion === 'POLITICA') {
    const politicas = await agentes.politicas.responder({ pregunta });
    const citas = politicas.citas ?? [];
    return respuesta(intencion, politicas.texto, citas, agente, citas.length > 0, false);
  }

  if (intencion === 'DATO_PERSONAL') {
    const datos = await agentes.datos.responder({ usuario });
    return respuesta(intencion, datos.texto, datos.citas, agente, true, false);
  }

  const [politicas, datos] = await Promise.all([
    agentes.politicas.responder({ pregunta }),
    agentes.datos.responder({ usuario })
  ]);

  const texto = `${politicas.texto}\n\nTus datos registrados:\n${datos.texto}`;
  const resuelta = (politicas.citas?.length ?? 0) > 0 || (datos.citas?.length ?? 0) > 0;

  return respuesta(
    intencion,
    texto,
    [...(politicas.citas ?? []), ...(datos.citas ?? [])],
    agente,
    resuelta,
    false
  );
}

module.exports = { orquestar };
