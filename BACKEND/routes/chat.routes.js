'use strict';

const express = require('express');
const { autenticar } = require('../middlewares/auth.middleware');
const { postChat } = require('../controllers/chat.controller');

const router = express.Router();

router.post('/', autenticar, postChat);

module.exports = router;
