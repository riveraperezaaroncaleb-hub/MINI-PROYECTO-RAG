export const AREAS = new Set([
  'RRHH',
  'TECNOLOGIA',
  'FINANCIAS',
  'VENTAS',
  'LEGAL',
  'OPERACIONES',
  'GENERAL'
]);

export const AREAS_MAP = new Map([
  ['RECURSOS HUMANOS', 'RRHH'],
  ['RECURSOS_HUMANOS', 'RRHH'],
  ['PERSONAL', 'RRHH'],
  ['RRHH', 'RRHH'],
  ['TI', 'TECNOLOGIA'],
  ['TECNOLOGIA', 'TECNOLOGIA'],
  ['FINANCIERO', 'FINANCIAS'],
  ['FINANCIERA', 'FINANCIAS'],
  ['FINANZAS', 'FINANCIAS'],
  ['FINANCIAS', 'FINANCIAS'],
  ['COMERCIAL', 'VENTAS'],
  ['VENTAS', 'VENTAS'],
  ['JURIDICO', 'LEGAL'],
  ['LEGAL', 'LEGAL'],
  ['COMPRAS', 'OPERACIONES'],
  ['OPERACIONES', 'OPERACIONES'],
  ['GENERAL', 'GENERAL']
]);

function normalizarTexto(valor) {
  return String(valor ?? '')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_');
}

function resolverArea(valor) {
  const texto = normalizarTexto(valor);
  if (!texto) return '';
  return AREAS_MAP.get(texto) ?? AREAS_MAP.get(texto.replace(/_/g, ' ')) ?? texto;
}

export function normalizarArea(valor) {
  const area = resolverArea(valor);
  if (!area) {
    throw new Error('El área es obligatoria para ingestar documentos en fragmentos_rag.');
  }
  return AREAS.has(area) ? area : area;
}

export function normalizarAreaClasificador(valor) {
  const area = resolverArea(valor);
  return AREAS.has(area) ? area : 'GENERAL';
}
