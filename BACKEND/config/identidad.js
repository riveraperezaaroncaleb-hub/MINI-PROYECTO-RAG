'use strict';

function usuarioActual() {
  const id = Number.parseInt(process.env.USUARIO_ACTUAL_ID || '1', 10);

  return {
    id: Number.isFinite(id) ? id : 1,
    nombre: process.env.USUARIO_ACTUAL_NOMBRE || 'Colaborador',
    rol: process.env.USUARIO_ACTUAL_ROL || 'EMPLEADO'
  };
}

module.exports = { usuarioActual };
