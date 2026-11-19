'use strict';

require('dotenv').config();

const path = require('path');
const { pathToFileURL } = require('url');
const express = require('express');
const cors = require('cors');
const { manejarErrores, rutaNoEncontrada } = require('./middlewares/errores');
const { iniciarReporteDiario } = require('./jobs/reporteDiario.job');
const { configurarBuscadorRag } = require('./services/rag.service');
const { buscarFragmentosLocales } = require('./services/buscador.local.service');

const app = express();

app.use(cors());
app.use(express.json());

async function cargarBuscadorRag() {
  const modulo = process.env.RAG_BUSCADOR_MODULE;
  if (!modulo) return buscarFragmentosLocales;

  try {
    const ruta = path.isAbsolute(modulo) ? modulo : path.resolve(__dirname, modulo);
    const moduloImportado = await import(pathToFileURL(ruta).href);
    const buscar =
      moduloImportado.buscadorRag ||
      moduloImportado.buscarFragmentosVector ||
      moduloImportado.default?.buscarFragmentosVector;

    if (typeof buscar !== 'function') {
      return buscarFragmentosLocales;
    }

    return (pregunta) => buscar(pregunta, process.env.RAG_EMPRESA_ID);
  } catch (error) {
    process.stderr.write(`[RAG] Buscador configurado no disponible: ${error.message}\n`);
    return buscarFragmentosLocales;
  }
}

async function iniciar() {
  configurarBuscadorRag(await cargarBuscadorRag());
  iniciarReporteDiario();
  app.listen(process.env.PORT || 3000, '0.0.0.0');
}

app.use('/api/chat', require('./routes/chat.routes'));
app.use('/api/rag', require('./routes/rag.routes'));

const promesaRutasRagDocumentos = import(
  pathToFileURL(path.resolve(__dirname, 'src/routes/ragRoutes.js')).href
);
const rutasRagDocumentos = express.Router();
rutasRagDocumentos.use((req, res, next) => {
  promesaRutasRagDocumentos
    .then((modulo) => modulo.default(req, res, next))
    .catch(next);
});
app.use('/api/rag', rutasRagDocumentos);

app.use('/api/reportes', require('./routes/reportes.routes'));
app.use('/api/solicitudes', require('./routes/solicitudes.routes'));

app.use(rutaNoEncontrada);
app.use(manejarErrores);

if (require.main === module) {
  iniciar().catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}

module.exports = app;
