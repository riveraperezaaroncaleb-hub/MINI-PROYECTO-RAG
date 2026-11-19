'use strict';

const express = require('express');
const { actual, historial, porId, tendencia } = require('../controllers/reportes.controller');

const router = express.Router();

router.get('/actual', actual);
router.get('/tendencia', tendencia);
router.get('/:id', porId);
router.get('/', historial);

module.exports = router;
