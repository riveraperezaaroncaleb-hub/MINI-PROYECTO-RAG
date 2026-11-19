import { derivarSiSinRespaldo } from './ragService.js';

export async function consultarOrquestado(pregunta, opciones = {}) {
  const { consultarMultiAgente } = await import('./multiAgenteService.js');
  return derivarSiSinRespaldo(await consultarMultiAgente(pregunta, opciones));
}

export { derivarSiSinRespaldo };
export default consultarOrquestado;
