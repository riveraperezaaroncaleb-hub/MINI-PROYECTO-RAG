'use strict';

const { ConsultaChat } = require('../models');
const { agregarJson } = require('./almacen.service');

const ARCHIVO = 'consultas_chat.json';

async function registrarConsulta(registro) {
  const fecha = new Date().toISOString().slice(0, 10);

  try {
    await ConsultaChat.create({
      colaborador_id: registro.colaborador_id ?? null,
      fecha,
      pregunta: registro.pregunta,
      intencion: registro.intencion ?? null,
      agente: registro.agente ?? null,
      documentos_citados: JSON.stringify(registro.documentos_citados ?? []),
      resuelta: registro.resuelta === true,
      escalada: registro.escalada === true,
      latencia_ms: registro.latencia_ms ?? 0
    });
    return;
  } catch {
    await agregarJson(ARCHIVO, {
      id: Date.now(),
      fecha,
      colaborador_id: registro.colaborador_id ?? null,
      ...registro
    });
  }
}

module.exports = { registrarConsulta };
