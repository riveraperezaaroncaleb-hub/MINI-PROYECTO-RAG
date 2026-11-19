'use strict';

const express = require('express');
const { autenticar } = require('../middlewares/auth.middleware');
const { requerirRol } = require('../middlewares/roles');
const { pendientes, actualizarEstado } = require('../controllers/solicitudes.controller');

const router = express.Router();

router.use(autenticar, requerirRol('RRHH'));

router.get('/pendientes', pendientes);
router.patch('/:id/estado', actualizarEstado);

module.exports = router;
