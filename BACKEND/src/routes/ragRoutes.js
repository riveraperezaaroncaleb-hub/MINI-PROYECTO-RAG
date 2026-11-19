import express from 'express';
import { sincronizarDocumentos } from '../services/voyageDocsService.js';
import { consultarRag } from '../services/ragService.js';
import { iniciarCronFotoMatutina } from '../services/analistaService.js';

iniciarCronFotoMatutina();

const router = express.Router();

async function sincronizar(req, res, next) {
  try {
    const resultado = await sincronizarDocumentos(req.body?.documentos ?? req.body?.configuracion);
    const estado = resultado.fallidos > 0 ? 500 : 200;
    res.status(estado).json(resultado);
  } catch (error) {
    next(error);
  }
}

async function chatear(req, res, next) {
  try {
    const cuerpo = req.body ?? {};
    const pregunta = cuerpo.pregunta ?? cuerpo.mensaje ?? cuerpo.consulta ?? cuerpo.message ?? cuerpo.query;

    if (!String(pregunta ?? '').trim()) {
      res.status(400).json({ error: 'La pregunta es obligatoria.' });
      return;
    }

    const resultado = await consultarRag(pregunta, {
      topK: cuerpo.topK
    });

    res.json(resultado);
  } catch (error) {
    next(error);
  }
}

router.post(['/sync', '/api/rag/sync'], sincronizar);
router.post(['/chat', '/api/rag/chat'], chatear);

export { router as ragRoutes };
export default router;
