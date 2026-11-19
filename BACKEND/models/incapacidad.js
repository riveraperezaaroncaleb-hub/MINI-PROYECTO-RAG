'use strict';
const {
  Model
} = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Incapacidad extends Model {
    static associate(models) {
      Incapacidad.belongsTo(models.Usuario, {
        as: 'colaborador',
        foreignKey: 'colaborador_id'
      });
    }
  }

  Incapacidad.init({
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
    fecha_inicio: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    dias: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    entidad: {
      type: DataTypes.STRING,
      allowNull: false
    }
  }, {
    sequelize,
    modelName: 'Incapacidad',
    tableName: 'incapacidades',
    timestamps: false
  });

  return Incapacidad;
};
