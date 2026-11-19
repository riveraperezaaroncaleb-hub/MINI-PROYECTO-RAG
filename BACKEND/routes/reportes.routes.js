'use strict';

const express = require('express');
const { autenticar } = require('../middlewares/auth.middleware');
const { requerirRol } = require('../middlewares/roles');
const { actual, historial, porId, tendencia } = require('../controllers/reportes.controller');

const router = express.Router();

router.use(autenticar, requerirRol('RRHH'));

router.get('/actual', actual);
router.get('/tendencia', tendencia);
router.get('/:id', porId);
router.get('/', historial);

module.exports = router;
