'use strict';

const { leerJson } = require('./almacen.service');

const PALABRAS_VACIAS = new Set([
  'para', 'porque', 'donde', 'cuando', 'como', 'esta', 'este', 'esta', 'los',
  'las', 'del', 'una', 'uno', 'que', 'con', 'por', 'cual', 'tengo', 'puedo',
  'debo', 'sobre', 'tiene', 'tienen', 'como', 'mas', 'the', 'and', 'unas', 'unos'
]);

function normalizar(texto) {
  return String(texto || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function extraerTerminos(texto) {
  return normalizar(texto)
    .split(/[^a-z0-9]+/)
    .filter((termino) => termino.length > 2 && !PALABRAS_VACIAS.has(termino));
}

async function buscarFragmentosLocales(pregunta) {
  const fragmentos = await leerJson('politicas.json', []);
  const terminos = extraerTerminos(pregunta);

  if (terminos.length === 0) return [];

  return fragmentos
    .map((fragmento) => {
      const texto = normalizar(
        `${fragmento.documento || ''} ${fragmento.seccion || ''} ${fragmento.contenido || ''}`
      );
      const coincidencias = terminos.filter((termino) => texto.includes(termino)).length;
      return { ...fragmento, similitud: coincidencias / terminos.length };
    })
    .filter((fragmento) => fragmento.similitud > 0)
    .sort((a, b) => b.similitud - a.similitud)
    .slice(0, 6);
}

module.exports = { buscarFragmentosLocales };
