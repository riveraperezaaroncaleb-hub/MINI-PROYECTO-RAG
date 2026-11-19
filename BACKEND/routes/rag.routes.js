'use strict';

const express = require('express');
const { autenticar } = require('../middlewares/auth.middleware');
const { requerirRol } = require('../middlewares/roles');
const { postConsulta, postIngesta } = require('../controllers/rag.controller');

const router = express.Router();

router.use(autenticar);

router.post('/consultar', postConsulta);
router.post('/ingestar', requerirRol('RRHH'), postIngesta);

module.exports = router;
