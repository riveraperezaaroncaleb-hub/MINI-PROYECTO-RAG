'use strict';

const express = require('express');
const { pendientes, actualizarEstado } = require('../controllers/solicitudes.controller');

const router = express.Router();

router.get('/pendientes', pendientes);
router.patch('/:id/estado', actualizarEstado);

module.exports = router;
