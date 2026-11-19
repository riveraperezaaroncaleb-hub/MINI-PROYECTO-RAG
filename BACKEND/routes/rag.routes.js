'use strict';

const express = require('express');
const { postConsulta, postIngesta } = require('../controllers/rag.controller');

const router = express.Router();

router.post('/consultar', postConsulta);
router.post('/ingestar', postIngesta);

module.exports = router;
