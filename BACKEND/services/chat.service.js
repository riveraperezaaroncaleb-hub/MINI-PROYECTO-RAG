'use strict';

const { orquestar } = require('./orquestador.service');
const { registrarConsulta } = require('./historial.service');

async function procesarChat({ pregunta, usuario }) {
  if (!usuario || !usuario.id) {
    throw new Error('Se requiere un usuario autenticado.');
  }

  const inicio = Date.now();
  let resultado;
  let fallo = null;

  try {
    resultado = await orquestar({ pregunta, usuario });
  } catch (error) {
    fallo = error;
    resultado = {
      intencion: 'ERROR',
      respuesta: 'No pude procesar tu consulta. Intenta nuevamente.',
      citas: [],
      agente: 'orquestador',
      resuelta: false,
      escalada: true
    };
  }

  const latencia = Date.now() - inicio;

  await registrarConsulta({
    colaborador_id: usuario.id,
    pregunta,
    intencion: resultado.intencion,
    agente: resultado.agente,
    documentos_citados: resultado.citas,
    resuelta: resultado.resuelta,
    escalada: resultado.escalada,
    latencia_ms: latencia
  }).catch(() => null);

  if (fallo) {
    throw fallo;
  }

  return {
    respuesta: resultado.respuesta,
    citas: resultado.citas,
    intencion: resultado.intencion,
    agente: resultado.agente
  };
}

module.exports = { procesarChat };
