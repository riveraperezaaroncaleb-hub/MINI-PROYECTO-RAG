'use strict';
const {
  Model
} = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class MovimientoPersonal extends Model {
    static associate(models) {
      MovimientoPersonal.belongsTo(models.Usuario, {
        as: 'colaborador',
        foreignKey: 'colaborador_id'
      });
    }
  }

  MovimientoPersonal.init({
    colaborador_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Usuarios',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT'
    },
    tipo: {
      type: DataTypes.STRING,
      allowNull: false
    },
    fecha: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    motivo: {
      type: DataTypes.TEXT,
      allowNull: false
    }
  }, {
    sequelize,
    modelName: 'MovimientoPersonal',
    tableName: 'movimientos_personal',
    timestamps: false
  });

  return MovimientoPersonal;
};
