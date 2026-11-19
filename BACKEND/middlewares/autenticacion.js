'use strict';

const jwt = require('jsonwebtoken');
const { jwtSecret, jwtExpiresIn } = require('../config/env');
const { crearError } = require('./errores');

function generarToken(usuario) {
  const payload = {
    id: usuario.id,
    nombre: usuario.nombre,
    rol: usuario.rol || 'colaborador'
  };

  return jwt.sign(payload, jwtSecret, { expiresIn: jwtExpiresIn });
}

function verificarToken(token) {
  return jwt.verify(token, jwtSecret);
}

function autenticar(req, _res, next) {
  const autorizacion = req.headers.authorization || '';
  const [esquema, token] = autorizacion.split(' ');

  if (esquema !== 'Bearer' || !token) {
    return next(crearError('Se requiere un token de autenticación.', 401));
  }

  try {
    req.usuario = verificarToken(token);
    req.user = req.usuario;
    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = { autenticar, generarToken, verificarToken };
