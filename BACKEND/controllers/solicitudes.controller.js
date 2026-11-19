'use strict';

const { Solicitud, Usuario } = require('../models');
const { crearError } = require('../middlewares/errores');

const ESTADOS = ['Aprobada', 'Rechazada'];

async function pendientes(_req, res, next) {
  try {
    const solicitudes = await Solicitud.findAll({
      where: { estado: 'Pendiente' },
      include: [
        {
          model: Usuario,
          as: 'colaborador',
          attributes: ['id', 'nombre', 'departamento']
        }
      ],
      order: [['creada_en', 'ASC']]
    });

    return res.json(solicitudes);
  } catch (error) {
    return next(error);
  }
}

async function actualizarEstado(req, res, next) {
  const estado = req.body?.estado;

  if (!ESTADOS.includes(estado)) {
    return next(crearError('Estado no válido.', 400));
  }

  try {
    const solicitud = await Solicitud.findByPk(req.params.id);

    if (!solicitud) {
      return next(crearError('Solicitud no encontrada.', 404));
    }

    await solicitud.update({ estado, aprobador_id: req.user?.id ?? null });
    return res.json(solicitud);
  } catch (error) {
    return next(error);
  }
}

module.exports = { pendientes, actualizarEstado };
