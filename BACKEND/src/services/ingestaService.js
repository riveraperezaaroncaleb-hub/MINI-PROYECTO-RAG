import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;

/** Configuración fija del proveedor de embeddings exigida por el sistema. */
const VOYAGE_EMBEDDINGS_URL = 'https://api.voyageai.com/v1/embeddings';
const VOYAGE_MODEL = 'voyage-3';
const VECTOR_DIMENSION = 1024;

/** Tamaño por defecto de los fragmentos y tamaño de lote de Voyage AI. */
const PALABRAS_POR_CHUNK = 600;
const SOLAPE_CHUNKS = 80;
const LOTE_EMBEDDINGS = 64;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL ?? process.env.NEON_DATABASE_URL,
  ssl: process.env.PGSSLMODE === 'disable' ? undefined : { rejectUnauthorized: false },
  max: Number(process.env.PGPOOL_MAX ?? 10)
});

let promesaEsquema = null;

/**
 * Obtiene la cadena de conexión de Neon y falla tempranamente si no está definida.
 * @returns {string} Cadena de conexión PostgreSQL.
 */
function obtenerCadenaConexion() {
  const cadena = process.env.DATABASE_URL ?? process.env.NEON_DATABASE_URL;
  if (!cadena) {
    throw new Error('Falta DATABASE_URL (o NEON_DATABASE_URL) para conectarse a Neon.tech.');
  }
  return cadena;
}

/**
 * Normaliza el área de negocio para que el filtro de recuperación sea determinista.
 * @param {string} area Área indicada por el usuario o clasificador.
 * @returns {string} Área normalizada.
 */
export function normalizarArea(area) {
  const valor = String(area ?? '').trim().toUpperCase();
  if (!valor) {
    throw new Error('El área es obligatoria para ingestar documentos en fragmentos_rag.');
  }
  return valor;
}

/**
 * Normaliza el identificador de empresa usado como filtro opcional por inquilino.
 * @param {string|number|null|undefined} valor Identificador de empresa.
 * @returns {string|null} Identificador normalizado.
 */
export function normalizarEmpresaId(valor = process.env.RAG_EMPRESA_ID) {
  if (valor === undefined || valor === null || valor === '') return null;
  const texto = String(valor).trim();
  return texto || null;
}

/**
 * Extrae el identificador de un archivo de Google Drive desde una URL o desde el id directo.
 * @param {string} valor URL compartida o identificador del archivo.
 * @returns {string} Identificador del archivo.
 */
export function extraerIdArchivoGoogleDrive(valor) {
  const texto = String(valor ?? '').trim();
  const patrones = [/\/file\/d\/([-\w]{10,})/, /[?&]id=([-\w]{10,})/, /^([-\w]{10,})$/];

  for (const patron of patrones) {
    const coincidencia = texto.match(patron);
    if (coincidencia?.[1]) return coincidencia[1];
  }

  throw new Error('No se pudo extraer el identificador del archivo de Google Drive.');
}

/**
 * Convierte una respuesta HTTP fallida en un error con contexto acotado.
 * @param {string} origen Nombre del proveedor.
 * @param {Response} respuesta Respuesta HTTP fallida.
 * @returns {Promise<Error>} Error listo para lanzar.
 */
async function errorDeRespuesta(origen, respuesta) {
  const detalle = (await respuesta.text().catch(() => '')).slice(0, 500);
  return new Error(`${origen} respondió con el estado ${respuesta.status}. ${detalle}`.trim());
}

/**
 * Descarga el contenido Markdown y sus metadatos desde Google Drive.
 * @param {Object} opciones Opciones de lectura.
 * @param {string} [opciones.archivoId] Identificador del archivo.
 * @param {string} [opciones.url] URL compartida del archivo.
 * @param {string} [opciones.accessToken] Token OAuth de Google Drive.
 * @returns {Promise<{archivoId: string, nombre: string, url: string, contenido: string}>} Documento leído.
 */
export async function leerMarkdownDeGoogleDrive({
  archivoId,
  url,
  accessToken = process.env.GOOGLE_ACCESS_TOKEN ?? process.env.GOOGLE_DRIVE_ACCESS_TOKEN
} = {}) {
  const id = extraerIdArchivoGoogleDrive(archivoId ?? url);
  const token = accessToken;
  const apiKey = process.env.GOOGLE_DRIVE_API_KEY;

  if (!token && !apiKey) {
    throw new Error('Falta GOOGLE_ACCESS_TOKEN (o GOOGLE_DRIVE_API_KEY) para leer Google Drive.');
  }

  const construirUrl = (base) => {
    const destino = new URL(base);
    if (!token && apiKey) destino.searchParams.set('key', apiKey);
    return destino;
  };

  const urlContenido = construirUrl(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(id)}?alt=media`
  );
  const urlMetadatos = construirUrl(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(id)}?fields=id,name,webViewLink`
  );
  const cabeceras = token ? { Authorization: `Bearer ${token}` } : {};

  const respuestaContenido = await fetch(urlContenido, { headers: cabeceras });
  if (!respuestaContenido.ok) throw await errorDeRespuesta('Google Drive', respuestaContenido);

  const contenido = await respuestaContenido.text();
  if (!contenido.trim()) {
    throw new Error(`El archivo de Google Drive "${id}" está vacío.`);
  }

  let metadatos = {};
  try {
    const respuestaMetadatos = await fetch(urlMetadatos, { headers: cabeceras });
    if (respuestaMetadatos.ok) metadatos = await respuestaMetadatos.json();
  } catch {
    metadatos = {};
  }

  return {
    archivoId: id,
    nombre: metadatos.name ?? id,
    url: metadatos.webViewLink ?? `https://drive.google.com/file/d/${id}/view`,
    contenido
  };
}

/** Cuenta las palabras de un texto sin depender de espacios repetidos. */
function contarPalabras(texto) {
  return String(texto ?? '').split(/\s+/).filter(Boolean).length;
}

/** Divide una línea extensa en partes que no superen el tamaño máximo del fragmento. */
function dividirLineaLarga(linea, tamano, traslape) {
  const palabras = String(linea).split(/\s+/).filter(Boolean);
  const partes = [];
  const paso = tamano - traslape;

  for (let inicio = 0; inicio < palabras.length; inicio += paso) {
    partes.push(palabras.slice(inicio, inicio + tamano).join(' '));
    if (inicio + tamano >= palabras.length) break;
  }

  return partes;
}

/**
 * Divide un documento Markdown en fragmentos de aproximadamente 600 palabras con solape.
 * @param {string} contenido Texto Markdown completo.
 * @param {Object} [opciones] Opciones de fragmentación.
 * @returns {Array<{contenido: string, titulo: string, indice: number}>} Fragmentos generados.
 */
export function fragmentarMarkdown(
  contenido,
  { palabrasPorChunk = PALABRAS_POR_CHUNK, solape = SOLAPE_CHUNKS } = {}
) {
  const lineas = String(contenido ?? '')
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((linea) => linea.trim())
    .filter(Boolean);

  if (lineas.length === 0) return [];

  const tamano = Math.max(1, Math.floor(palabrasPorChunk));
  const traslape = Math.min(Math.max(0, Math.floor(solape)), tamano - 1);
  const unidades = [];

  for (const linea of lineas) {
    const cantidad = contarPalabras(linea);
    if (cantidad <= tamano) {
      unidades.push({ texto: linea, palabras: cantidad });
      continue;
    }

    for (const parte of dividirLineaLarga(linea, tamano, traslape)) {
      unidades.push({ texto: parte, palabras: contarPalabras(parte) });
    }
  }

  const fragmentos = [];
  let actual = [];
  let palabrasActuales = 0;

  for (const unidad of unidades) {
    const excede = palabrasActuales + unidad.palabras > tamano;
    const fragmentoAprovechable = palabrasActuales >= Math.floor(tamano / 2);

    if (actual.length && excede && fragmentoAprovechable) {
      fragmentos.push(actual.join('\n'));

      const cola = [];
      let palabrasCola = 0;
      for (let indice = actual.length - 1; indice >= 0; indice -= 1) {
        const cantidad = contarPalabras(actual[indice]);
        if (palabrasCola + cantidad > traslape) break;
        cola.unshift(actual[indice]);
        palabrasCola += cantidad;
      }

      actual = cola;
      palabrasActuales = palabrasCola;
    }

    actual.push(unidad.texto);
    palabrasActuales += unidad.palabras;
  }

  if (actual.length) fragmentos.push(actual.join('\n'));

  return fragmentos.map((texto, indice) => ({
    contenido: texto,
    titulo: texto.match(/^#{1,6}\s+([^\n]+)/m)?.[1]?.trim().slice(0, 200) ?? '',
    indice
  }));
}

/**
 * Valida y serializa un vector para el tipo vector(1024) de pgvector.
 * @param {number[]} embedding Vector devuelto por Voyage AI.
 * @returns {string} Representación literal aceptada por PostgreSQL.
 */
function serializarVector(embedding) {
  if (!Array.isArray(embedding) || embedding.length !== VECTOR_DIMENSION) {
    throw new Error(`El embedding debe tener ${VECTOR_DIMENSION} dimensiones.`);
  }
  if (embedding.some((valor) => !Number.isFinite(Number(valor)))) {
    throw new Error('El embedding contiene valores no numéricos.');
  }
  return `[${embedding.map((valor) => Number(valor).toFixed(8)).join(',')}]`;
}

/**
 * Genera embeddings con Voyage AI, respetando el orden de entrada y el tamaño de lote.
 * @param {string[]} textos Textos a vectorizar.
 * @param {Object} [opciones] Opciones de generación.
 * @param {'document'|'query'} [opciones.inputType] Tipo de entrada de Voyage AI.
 * @returns {Promise<number[][]>} Vectores en el mismo orden que los textos.
 */
export async function generarEmbeddings(textos, { inputType = 'document' } = {}) {
  if (!Array.isArray(textos) || textos.length === 0) return [];

  const apiKey = process.env.VOYAGE_API_KEY;
  if (!apiKey) {
    throw new Error('Falta VOYAGE_API_KEY para generar embeddings.');
  }

  const vectores = [];

  for (let inicio = 0; inicio < textos.length; inicio += LOTE_EMBEDDINGS) {
    const lote = textos.slice(inicio, inicio + LOTE_EMBEDDINGS);
    let respuesta;

    for (let intento = 0; intento <= 4; intento += 1) {
      respuesta = await fetch(VOYAGE_EMBEDDINGS_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: VOYAGE_MODEL,
          input: lote,
          input_type: inputType,
          truncation: true
        })
      });

      if (respuesta.ok || respuesta.status !== 429 || intento === 4) break;
      await respuesta.text().catch(() => '');
      const reintentar = Number.parseInt(respuesta.headers.get('retry-after'), 10);
      const espera = Number.isFinite(reintentar) && reintentar > 0 ? reintentar * 1000 : 20000;
      await new Promise((resolver) => setTimeout(resolver, Math.min(espera, 60000)));
    }

    if (!respuesta.ok) throw await errorDeRespuesta('Voyage AI', respuesta);

    const datos = await respuesta.json();
    const items = datos.data ?? datos.embeddings ?? [];
    const vectoresDelLote = new Array(lote.length);

    items.forEach((item, posicion) => {
      const vector = item?.embedding ?? item;
      const indice = Number.isInteger(item?.index) ? item.index : posicion;
      vectoresDelLote[indice] = vector;
    });

    if (vectoresDelLote.some((vector) => !Array.isArray(vector))) {
      throw new Error('Voyage AI devolvió menos embeddings que textos de entrada.');
    }

    vectoresDelLote.forEach(serializarVector);
    vectores.push(...vectoresDelLote);
  }

  return vectores;
}

/**
 * Crea la extensión vector y la tabla fragmentos_rag una sola vez por proceso.
 * @returns {Promise<void>} Promesa compartida de inicialización del esquema.
 */
export function asegurarEsquema() {
  if (!promesaEsquema) {
    obtenerCadenaConexion();
    promesaEsquema = pool
      .query(`
        CREATE EXTENSION IF NOT EXISTS vector;
        CREATE TABLE IF NOT EXISTS fragmentos_rag (
          id BIGSERIAL PRIMARY KEY,
          empresa_id TEXT,
          area TEXT NOT NULL,
          documento_id TEXT,
          documento_nombre TEXT NOT NULL,
          documento_url TEXT,
          titulo TEXT,
          contenido TEXT NOT NULL,
          embedding vector(1024) NOT NULL,
          creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
        );
        CREATE INDEX IF NOT EXISTS fragmentos_rag_area_idx ON fragmentos_rag (area);
      `)
      .then(() => undefined)
      .catch((error) => {
        promesaEsquema = null;
        throw error;
      });
  }

  return promesaEsquema;
}

/**
 * Guarda fragmentos y sus embeddings en fragmentos_rag, asociados a un área.
 * @param {Object} opciones Opciones de persistencia.
 * @param {string} opciones.area Área de negocio del documento.
 * @param {Array<{contenido: string, titulo?: string, indice?: number}>} opciones.fragmentos Fragmentos a guardar.
 * @param {number[][]} [opciones.embeddings] Vectores ya generados.
 * @param {{id?: string, nombre?: string, url?: string}} opciones.documento Datos del documento fuente.
 * @param {string|number|null|undefined} [opciones.empresaId] Empresa propietaria del documento.
 * @param {boolean} [opciones.reemplazarDocumento] Si se reemplazan fragmentos previos del mismo documento.
 * @returns {Promise<{insertados: number, area: string, documento: Object}>} Resultado de la ingesta.
 */
export async function guardarFragmentos({
  area,
  fragmentos,
  embeddings,
  documento,
  empresaId = process.env.RAG_EMPRESA_ID,
  reemplazarDocumento = false
}) {
  const areaNormalizada = normalizarArea(area);
  const empresaNormalizada = normalizarEmpresaId(empresaId);

  if (!Array.isArray(fragmentos) || fragmentos.length === 0) {
    return { insertados: 0, area: areaNormalizada, documento };
  }

  if (!documento?.nombre) {
    throw new Error('El documento fuente debe incluir un nombre para poder citarlo.');
  }

  const vectores = embeddings ?? (await generarEmbeddings(fragmentos.map((f) => f.contenido)));
  if (vectores.length !== fragmentos.length) {
    throw new Error('La cantidad de embeddings no coincide con la cantidad de fragmentos.');
  }

  await asegurarEsquema();
  const cliente = await pool.connect();

  try {
    await cliente.query('BEGIN');

    if (reemplazarDocumento) {
      await cliente.query(
        `DELETE FROM fragmentos_rag
         WHERE area = $1
           AND ($2::text IS NULL OR empresa_id = $2)
           AND documento_id = $3`,
        [areaNormalizada, empresaNormalizada, documento.id ?? null]
      );
    }

    const insercion = `
      INSERT INTO fragmentos_rag
        (empresa_id, area, documento_id, documento_nombre, documento_url, titulo, contenido, embedding)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8::vector)
    `;

    for (let indice = 0; indice < fragmentos.length; indice += 1) {
      const fragmento = fragmentos[indice];
      await cliente.query(insercion, [
        empresaNormalizada,
        areaNormalizada,
        documento.id ?? null,
        documento.nombre,
        documento.url ?? null,
        fragmento.titulo ?? null,
        fragmento.contenido,
        serializarVector(vectores[indice])
      ]);
    }

    await cliente.query('COMMIT');
  } catch (error) {
    await cliente.query('ROLLBACK');
    throw error;
  } finally {
    cliente.release();
  }

  return { insertados: fragmentos.length, area: areaNormalizada, documento };
}

/**
 * Recupera fragmentos por similitud coseno usando el operador <=> de pgvector.
 * @param {Object} opciones Opciones de búsqueda.
 * @param {number[]} opciones.embedding Vector de la pregunta.
 * @param {string} [opciones.area] Filtro de área; vacío busca en todas.
 * @param {string|number|null|undefined} [opciones.empresaId] Filtro opcional de empresa.
 * @param {number} [opciones.topK] Cantidad de fragmentos a devolver.
 * @returns {Promise<Array<Object>>} Fragmentos ordenados por distancia coseno ascendente.
 */
export async function buscarFragmentosPorSimilitud({
  embedding,
  area = '',
  empresaId = process.env.RAG_EMPRESA_ID,
  topK = 5
}) {
  await asegurarEsquema();

  const vector = serializarVector(embedding);
  const areaFiltro = String(area ?? '').trim().toUpperCase() || null;
  const empresaFiltro = normalizarEmpresaId(empresaId);
  const limite = Math.min(Math.max(1, Math.floor(Number(topK) || 5)), 50);

  const consulta = `
    SELECT id,
           empresa_id,
           area,
           documento_id,
           documento_nombre,
           documento_url,
           titulo,
           contenido,
           1 - (embedding <=> $1::vector) AS similitud
    FROM fragmentos_rag
    WHERE ($2::text IS NULL OR area = $2)
      AND ($3::text IS NULL OR empresa_id = $3)
    ORDER BY embedding <=> $1::vector ASC
    LIMIT $4
  `;

  const { rows } = await pool.query(consulta, [vector, areaFiltro, empresaFiltro, limite]);
  return rows;
}

/**
 * Flujo completo de ingesta: Drive -> fragmentos -> Voyage AI -> fragmentos_rag.
 * @param {Object} opciones Opciones de ingesta.
 * @param {string} [opciones.archivoId] Identificador del archivo en Google Drive.
 * @param {string} [opciones.url] URL compartida del archivo.
 * @param {string} opciones.area Área de negocio con la que se agrupan los fragmentos.
 * @param {string} [opciones.accessToken] Token OAuth de Google Drive.
 * @param {number} [opciones.palabrasPorChunk] Palabras por fragmento.
 * @param {number} [opciones.solape] Palabras de solape entre fragmentos.
 * @returns {Promise<Object>} Resumen de la ingesta realizada.
 */
export async function ingestarMarkdownDeGoogleDrive({
  archivoId,
  url,
  area,
  accessToken,
  palabrasPorChunk = PALABRAS_POR_CHUNK,
  solape = SOLAPE_CHUNKS,
  empresaId = process.env.RAG_EMPRESA_ID,
  reemplazarDocumento = false
}) {
  const documento = await leerMarkdownDeGoogleDrive({ archivoId, url, accessToken });
  const fragmentos = fragmentarMarkdown(documento.contenido, { palabrasPorChunk, solape });

  if (fragmentos.length === 0) {
    throw new Error('El documento no contiene texto suficiente para generar fragmentos.');
  }

  const embeddings = await generarEmbeddings(
    fragmentos.map((fragmento) => fragmento.contenido),
    { inputType: 'document' }
  );

  const resultado = await guardarFragmentos({
    area,
    fragmentos,
    embeddings,
    empresaId,
    reemplazarDocumento,
    documento: {
      id: documento.archivoId,
      nombre: documento.nombre,
      url: documento.url
    }
  });

  return {
    ...resultado,
    archivoId: documento.archivoId,
    palabras: documento.contenido.split(/\s+/).filter(Boolean).length
  };
}

/** Cierra el pool de Neon al finalizar el proceso. */
export async function cerrarConexion() {
  await pool.end();
}

export default ingestarMarkdownDeGoogleDrive;
