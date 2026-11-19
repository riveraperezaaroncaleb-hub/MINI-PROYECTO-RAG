'use strict';

const { crearError } = require('./errores');

function requerirRol(...roles) {
  return (req, _res, next) => {
    if (!req.user) {
      return next(crearError('Se requiere autenticación.', 401));
    }

    if (!roles.includes(req.user.rol)) {
      return next(crearError('No tienes permisos para acceder a este recurso.', 403));
    }

    return next();
  };
}

module.exports = { requerirRol };
