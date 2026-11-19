'use strict';

const { Usuario } = require('../models');
const { generarToken } = require('../middlewares/autenticacion');
const { crearError } = require('../middlewares/errores');

async function login(req, res, next) {
  const nombre = typeof req.body?.nombre === 'string' ? req.body.nombre.trim() : '';

  if (!nombre) {
    return next(crearError('El nombre de usuario es obligatorio.', 400));
  }

  try {
    const usuario = await Usuario.findOne({ where: { nombre } });

    if (!usuario) {
      return next(crearError('Usuario no encontrado.', 404));
    }

    return res.json({
      token: generarToken(usuario),
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        rol: usuario.rol,
        departamento: usuario.departamento
      }
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = { login };
