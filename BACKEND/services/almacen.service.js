'use strict';

const fs = require('fs/promises');
const path = require('path');

const RAIZ_DATOS = path.join(__dirname, '..', 'data');

async function leerJson(nombre, valorPorDefecto) {
  try {
    const contenido = await fs.readFile(path.join(RAIZ_DATOS, nombre), 'utf8');
    return JSON.parse(contenido);
  } catch (error) {
    if (error.code === 'ENOENT' || error instanceof SyntaxError) {
      return valorPorDefecto;
    }
    throw error;
  }
}

async function escribirJson(nombre, datos) {
  const ruta = path.join(RAIZ_DATOS, nombre);
  await fs.mkdir(path.dirname(ruta), { recursive: true });
  const temporal = `${ruta}.tmp`;
  await fs.writeFile(temporal, JSON.stringify(datos, null, 2), 'utf8');
  await fs.rename(temporal, ruta);
}

async function agregarJson(nombre, registro, limite = 500) {
  const registros = await leerJson(nombre, []);
  const lista = Array.isArray(registros) ? registros : [];
  lista.push(registro);
  await escribirJson(nombre, lista.slice(-limite));
}

module.exports = { leerJson, escribirJson, agregarJson };
