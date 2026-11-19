export const RESPUESTA_SIN_RESPALDO =
  'Esa política o información no consta en los documentos disponibles. Consulta con Recursos Humanos (RRHH) para obtener una respuesta oficial.';

const MARCADORES_SIN_RESPALDO =
  /no encontr[eé]|no consta|no est[aá] (?:documentada|respaldada)|sin respaldo|no puedo afirmar/i;

export function sinRespaldo(resultado) {
  if (resultado?.derivado_a_rrhh === true) return true;
  if (!Array.isArray(resultado?.citas) || resultado.citas.length === 0) return true;
  if (!Array.isArray(resultado?.fragmentos) || resultado.fragmentos.length === 0) return true;
  return MARCADORES_SIN_RESPALDO.test(String(resultado?.respuesta ?? ''));
}

export function derivarSiSinRespaldo(resultado) {
  if (sinRespaldo(resultado)) {
    return {
      ...resultado,
      respuesta: RESPUESTA_SIN_RESPALDO,
      citas: [],
      fragmentos: [],
      derivado_a_rrhh: true
    };
  }
  return { ...resultado, derivado_a_rrhh: false };
}

export async function consultarRag(pregunta, opciones = {}) {
  const { responderChat } = await import('./deepseekChatService.js');
  return derivarSiSinRespaldo(await responderChat(pregunta, opciones));
}

export default consultarRag;
