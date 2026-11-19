'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ConsultaChat extends Model {
    static associate(models) {
      ConsultaChat.belongsTo(models.Usuario, {
        as: 'colaborador',
        foreignKey: 'colaborador_id'
      });
    }
  }

  ConsultaChat.init({
    colaborador_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'Usuarios', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    },
    fecha: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    pregunta: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    intencion: {
      type: DataTypes.STRING
    },
    agente: {
      type: DataTypes.STRING
    },
    documentos_citados: {
      type: DataTypes.JSON
    },
    resuelta: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    escalada: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    latencia_ms: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    }
  }, {
    sequelize,
    modelName: 'ConsultaChat',
    tableName: 'consultas_chat',
    timestamps: false,
    indexes: [{ fields: ['colaborador_id', 'fecha'] }]
  });

  return ConsultaChat;
};
