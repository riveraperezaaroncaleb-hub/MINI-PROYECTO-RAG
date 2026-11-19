'use strict';

const { JsonWebTokenError, TokenExpiredError } = require('jsonwebtoken');
const {
  ValidationError,
  UniqueConstraintError,
  ForeignKeyConstraintError
} = require('sequelize');

function crearError(mensaje, status = 500) {
  const error = new Error(mensaje);
  error.status = status;
  return error;
}

function manejarErrores(error, _req, res, _next) {
  let status = error.status || 500;
  let mensaje = error.message || 'Error interno del servidor.';

  if (error instanceof TokenExpiredError) {
    status = 401;
    mensaje = 'El token de autenticación ha expirado.';
  } else if (error instanceof JsonWebTokenError) {
    status = 401;
    mensaje = 'Token de autenticación inválido.';
  } else if (error instanceof UniqueConstraintError) {
    status = 409;
    mensaje = 'Ya existe un registro con esos datos.';
  } else if (error instanceof ForeignKeyConstraintError) {
    status = 400;
    mensaje = 'La referencia indicada no existe.';
  } else if (error instanceof ValidationError) {
    status = 400;
    mensaje = 'Los datos enviados no son válidos.';
  }

  if (status >= 500) {
    mensaje = 'Error interno del servidor.';
  }

  return res.status(status).json({ error: mensaje });
}

function rutaNoEncontrada(_req, res) {
  return res.status(404).json({ error: 'Ruta no encontrada.' });
}

module.exports = { crearError, manejarErrores, rutaNoEncontrada };
