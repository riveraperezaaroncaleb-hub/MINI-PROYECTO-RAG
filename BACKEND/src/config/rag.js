export const UMBRAL_SIMILITUD = Number(process.env.RAG_UMBRAL_SIMILITUD ?? 0.35);

export const TIMEOUT_EXTERNO_MS = Number(process.env.RAG_TIMEOUT_MS ?? 15000);

export function superaUmbral(similitud) {
  return Number(similitud ?? 0) >= UMBRAL_SIMILITUD;
}
