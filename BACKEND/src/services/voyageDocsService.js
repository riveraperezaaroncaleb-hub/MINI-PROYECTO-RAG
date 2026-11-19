import 'dotenv/config';
import pg from 'pg';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import {
  fragmentarMarkdown,
  generarEmbeddings,
  leerMarkdownDeGoogleDrive
} from './ingestaService.js';

const { Pool } = pg;

export const VOYAGE_MODEL = 'voyage-3';
export const TOTAL_DOCUMENTOS = 11;

const VECTOR_DIMENSION = 1024;
const ARCHIVO_LOCAL = path.resolve('data', 'voyage_docs.json');

let modoLocal = false;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL ?? process.env.NEON_DATABASE_URL,
  ssl: process.env.PGSSLMODE === 'disable' ? undefined : { rejectUnauthorized: false },
  max: Number(process.env.PGPOOL_MAX ?? 10)
});

let promesaEsquema = null;

function documentosPorDefecto() {
  const raiz = process.env.DOCS_DIR ?? 'docs';

  return Array.from({ length: TOTAL_DOCUMENTOS }, (_, indice) => {
    const id = indice + 1;
    const canal = `doc_${id}`;
    const clave = `DOC_${id}`;

    return {
      id,
      canal,
      nombre: process.env[`${clave}_NOMBRE`] ?? `doc ${id}`,
      ruta: process.env[`${clave}_PATH`] ?? path.resolve(raiz, `${canal}.md`),
      url: process.env[`${clave}_URL`] ?? process.env[`${clave}_DRIVE_URL`] ?? '',
      archivoId: process.env[`${clave}_ID`] ?? process.env[`${clave}_DRIVE_ID`] ?? ''
    };
  });
}

function combinarConfiguracion(base, lista) {
  if (!Array.isArray(lista) || lista.length === 0) return base;

  const mapa = new Map(base.map((documento) => [documento.id, documento]));

  for (const item of lista) {
    if (!item || typeof item !== 'object') continue;
    const id = Number(item.id ?? item.doc_id ?? String(item.canal ?? '').replace(/^doc_/, ''));
    if (!mapa.has(id)) continue;
    mapa.set(id, {
      ...mapa.get(id),
      ...item,
      id,
      canal: item.canal ?? `doc_${id}`
    });
  }

  return [...mapa.values()].sort((a, b) => a.id - b.id);
}

function documentosDesdeEnv(base) {
  const crudo = process.env.RAG_DOCS_JSON;
  if (!crudo) return base;

  let datos;
  try {
    datos = JSON.parse(crudo);
  } catch {
    throw new Error('RAG_DOCS_JSON no contiene un JSON válido.');
  }

  const lista = Array.isArray(datos)
    ? datos
    : Object.entries(datos).map(([clave, valor]) => ({ id: clave, ...valor }));

  return combinarConfiguracion(base, lista);
}

function aLista(valor) {
  if (Array.isArray(valor)) return valor;
  if (!valor || typeof valor !== 'object') return null;
  return Object.entries(valor).map(([clave, item]) => ({ id: clave, ...item }));
}

export function obtenerDocumentos(configuracion) {
  const base = documentosDesdeEnv(documentosPorDefecto());
  const lista = aLista(configuracion?.documentos ?? configuracion);

  return combinarConfiguracion(base, lista);
}

export async function leerDocumento(documento) {
  const id = Number(documento?.id);
  if (!Number.isInteger(id) || id < 1 || id > TOTAL_DOCUMENTOS) {
    throw new Error('El identificador del documento debe estar entre 1 y 11.');
  }

  const canal = documento.canal ?? `doc_${id}`;
  const accessToken = documento.accessToken;

  if (documento.archivoId || documento.url) {
    const leido = await leerMarkdownDeGoogleDrive({
      archivoId: documento.archivoId,
      url: documento.url,
      accessToken
    });

    return {
      id,
      canal,
      nombre: documento.nombre ?? leido.nombre,
      url: leido.url,
      contenido: leido.contenido
    };
  }

  const ruta = documento.ruta ?? path.resolve('docs', `${canal}.md`);
  let contenido;
  try {
    contenido = await readFile(ruta, 'utf8');
  } catch (error) {
    throw new Error(`No se pudo leer ${canal} desde "${ruta}". ${error.message}`);
  }

  if (!contenido.trim()) {
    throw new Error(`El documento ${canal} está vacío.`);
  }

  return {
    id,
    canal,
    nombre: documento.nombre ?? path.basename(ruta),
    url: documento.url ?? null,
    contenido
  };
}

export function fragmentarDocumento(contenido, opciones = {}) {
  const fragmentos = fragmentarMarkdown(contenido, opciones);
  if (fragmentos.length === 0) {
    throw new Error('El documento no contiene texto suficiente para generar fragmentos.');
  }
  return fragmentos;
}

export function serializarVectorDocumento(embedding) {
  if (!Array.isArray(embedding) || embedding.length !== VECTOR_DIMENSION) {
    throw new Error(`El embedding debe tener ${VECTOR_DIMENSION} dimensiones.`);
  }
  if (embedding.some((valor) => !Number.isFinite(Number(valor)))) {
    throw new Error('El embedding contiene valores no numéricos.');
  }
  return `[${embedding.map((valor) => Number(valor).toFixed(8)).join(',')}]`;
}

async function leerAlmacenLocal() {
  try {
    const datos = JSON.parse(await readFile(ARCHIVO_LOCAL, 'utf8'));
    return datos && typeof datos === 'object' ? datos : {};
  } catch {
    return {};
  }
}

async function escribirAlmacenLocal(datos) {
  await mkdir(path.dirname(ARCHIVO_LOCAL), { recursive: true });
  await writeFile(ARCHIVO_LOCAL, JSON.stringify(datos), 'utf8');
}

function similitudCoseno(a, b) {
  let producto = 0;
  let normaA = 0;
  let normaB = 0;

  for (let indice = 0; indice < a.length; indice += 1) {
    producto += a[indice] * b[indice];
    normaA += a[indice] * a[indice];
    normaB += b[indice] * b[indice];
  }

  return normaA && normaB ? producto / (Math.sqrt(normaA) * Math.sqrt(normaB)) : 0;
}

export async function guardarFragmentosLocales({ documento, fragmentos, embeddings }) {
  if (embeddings.length !== fragmentos.length) {
    throw new Error('La cantidad de embeddings no coincide con la cantidad de fragmentos.');
  }

  const datos = await leerAlmacenLocal();
  datos[String(documento.id)] = {
    canal: documento.canal,
    documento_nombre: documento.nombre,
    documento_url: documento.url ?? null,
    chunks: fragmentos.map((fragmento, indice) => ({
      titulo: fragmento.titulo ?? null,
      contenido: fragmento.contenido,
      embedding: embeddings[indice]
    }))
  };
  await escribirAlmacenLocal(datos);

  return {
    doc_id: documento.id,
    canal: documento.canal,
    documento: documento.nombre,
    chunks: fragmentos.length,
    almacen: 'local'
  };
}

export async function buscarFragmentosLocales(embedding, topK = 5) {
  const datos = await leerAlmacenLocal();
  const filas = [];

  for (const [clave, documento] of Object.entries(datos)) {
    for (const chunk of documento.chunks ?? []) {
      filas.push({
        doc_id: Number(clave),
        canal: documento.canal,
        documento_nombre: documento.documento_nombre,
        documento_url: documento.documento_url,
        titulo: chunk.titulo,
        contenido: chunk.contenido,
        similitud: similitudCoseno(embedding, chunk.embedding)
      });
    }
  }

  return filas.sort((a, b) => b.similitud - a.similitud).slice(0, topK);
}

export function asegurarEsquemaDocumentos() {
  if (!promesaEsquema) {
    if (modoLocal || (!process.env.DATABASE_URL && !process.env.NEON_DATABASE_URL)) {
      modoLocal = true;
      promesaEsquema = Promise.resolve();
      return promesaEsquema;
    }

    promesaEsquema = pool
      .query(`
        CREATE EXTENSION IF NOT EXISTS vector;
        CREATE TABLE IF NOT EXISTS documentos_voyage (
          doc_id INTEGER NOT NULL,
          canal TEXT NOT NULL,
          chunk_index INTEGER NOT NULL,
          documento_nombre TEXT NOT NULL,
          documento_url TEXT,
          titulo TEXT,
          contenido TEXT NOT NULL,
          embedding vector(1024) NOT NULL,
          actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
          PRIMARY KEY (doc_id, chunk_index)
        );
        DO $index$ BEGIN
          CREATE INDEX IF NOT EXISTS documentos_voyage_embedding_idx
            ON documentos_voyage USING hnsw (embedding vector_cosine_ops);
        EXCEPTION WHEN OTHERS THEN NULL;
        END $index$;
      `)
      .then(() => undefined)
      .catch(() => {
        modoLocal = true;
        promesaEsquema = Promise.resolve();
      });
  }

  return promesaEsquema;
}

export async function guardarFragmentosDocumento({ documento, fragmentos, embeddings }) {
  const vectores = embeddings ?? (await generarEmbeddings(
    fragmentos.map((fragmento) => fragmento.contenido),
    { inputType: 'document' }
  ));

  if (vectores.length !== fragmentos.length) {
    throw new Error('La cantidad de embeddings no coincide con la cantidad de fragmentos.');
  }

  await asegurarEsquemaDocumentos();

  if (modoLocal) {
    return guardarFragmentosLocales({ documento, fragmentos, embeddings: vectores });
  }

  const insercion = `
    INSERT INTO documentos_voyage
      (doc_id, canal, chunk_index, documento_nombre, documento_url, titulo, contenido, embedding, actualizado_en)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8::vector, now())
    ON CONFLICT (doc_id, chunk_index) DO UPDATE SET
      canal = EXCLUDED.canal,
      documento_nombre = EXCLUDED.documento_nombre,
      documento_url = EXCLUDED.documento_url,
      titulo = EXCLUDED.titulo,
      contenido = EXCLUDED.contenido,
      embedding = EXCLUDED.embedding,
      actualizado_en = now()
  `;

  let cliente;
  try {
    cliente = await pool.connect();
    await cliente.query('BEGIN');
    await cliente.query('DELETE FROM documentos_voyage WHERE doc_id = $1', [documento.id]);

    for (let indice = 0; indice < fragmentos.length; indice += 1) {
      const fragmento = fragmentos[indice];
      await cliente.query(insercion, [
        documento.id,
        documento.canal,
        indice,
        documento.nombre,
        documento.url ?? null,
        fragmento.titulo ?? null,
        fragmento.contenido,
        serializarVectorDocumento(vectores[indice])
      ]);
    }

    await cliente.query('COMMIT');
  } catch {
    if (cliente) await cliente.query('ROLLBACK').catch(() => {});
    modoLocal = true;
    return guardarFragmentosLocales({ documento, fragmentos, embeddings: vectores });
  } finally {
    cliente?.release();
  }

  return {
    doc_id: documento.id,
    canal: documento.canal,
    documento: documento.nombre,
    chunks: fragmentos.length,
    almacen: 'pgvector'
  };
}

export async function sincronizarDocumento(documento, opciones = {}) {
  const leido = await leerDocumento(documento);
  const fragmentos = fragmentarDocumento(leido.contenido, opciones);
  const embeddings = await generarEmbeddings(
    fragmentos.map((fragmento) => fragmento.contenido),
    { inputType: 'document' }
  );

  return guardarFragmentosDocumento({ documento: leido, fragmentos, embeddings });
}

export async function sincronizarDocumentos(configuracion, opciones = {}) {
  const documentos = obtenerDocumentos(configuracion);
  const preparados = [];
  const resultados = [];

  for (const documento of documentos) {
    try {
      const leido = await leerDocumento(documento);
      const fragmentos = fragmentarDocumento(leido.contenido, opciones);
      preparados.push({ documento: leido, fragmentos });
    } catch (error) {
      resultados.push({
        doc_id: documento.id,
        canal: documento.canal,
        estado: 'error',
        error: error.message
      });
    }
  }

  let embeddings = [];
  try {
    embeddings = await generarEmbeddings(
      preparados.flatMap((item) => item.fragmentos.map((fragmento) => fragmento.contenido)),
      { inputType: 'document' }
    );
  } catch (error) {
    for (const item of preparados) {
      resultados.push({
        doc_id: item.documento.id,
        canal: item.documento.canal,
        estado: 'error',
        error: error.message
      });
    }
  }

  if (embeddings.length) {
    let cursor = 0;
    for (const item of preparados) {
      const vectores = embeddings.slice(cursor, cursor + item.fragmentos.length);
      cursor += item.fragmentos.length;

      try {
        const sincronizado = await guardarFragmentosDocumento({
          documento: item.documento,
          fragmentos: item.fragmentos,
          embeddings: vectores
        });
        resultados.push({ ...sincronizado, estado: 'ok' });
      } catch (error) {
        resultados.push({
          doc_id: item.documento.id,
          canal: item.documento.canal,
          estado: 'error',
          error: error.message
        });
      }
    }
  }

  resultados.sort((a, b) => a.doc_id - b.doc_id);
  const fallidos = resultados.filter((resultado) => resultado.estado === 'error').length;

  return {
    total: resultados.length,
    procesados: resultados.length - fallidos,
    fallidos,
    resultados
  };
}

export const sincronizarTodosLosDocumentos = sincronizarDocumentos;

export async function cerrarConexionDocumentos() {
  await pool.end();
}

export { pool };

export default sincronizarDocumentos;
