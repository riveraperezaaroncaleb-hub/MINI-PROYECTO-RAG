'use strict';

const { crearError } = require('../middlewares/errores');
const { usuarioActual } = require('../config/identidad');
const { procesarChat } = require('../services/chat.service');

async function postChat(req, res, next) {
  const pregunta = typeof req.body?.pregunta === 'string' ? req.body.pregunta.trim() : '';

  if (!pregunta) {
    return next(crearError('La pregunta es obligatoria.', 400));
  }

  if (pregunta.length > 2000) {
    return next(crearError('La pregunta no puede superar los 2000 caracteres.', 400));
  }

  try {
    const usuario = req.user ?? usuarioActual();
    return res.json(await procesarChat({ pregunta, usuario }));
  } catch (error) {
    process.stderr.write(`[CHAT] ${error.message}\n`);
    return next(error);
  }
}

module.exports = { postChat };
