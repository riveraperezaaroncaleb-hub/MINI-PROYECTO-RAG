'use strict';
const {
  Model
} = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ReporteDiario extends Model {
    static associate(models) {
      ReporteDiario.belongsTo(models.Usuario, {
        as: 'generador',
        foreignKey: 'generado_por'
      });
    }
  }

  ReporteDiario.init({
    fecha: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    datos_json: {
      type: DataTypes.JSON,
      allowNull: false
    },
    resumen_texto: {
      type: DataTypes.TEXT
    },
    generado_por: {
      type: DataTypes.INTEGER,
      references: {
        model: 'Usuarios',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    }
  }, {
    sequelize,
    modelName: 'ReporteDiario',
    tableName: 'reportes_diarios',
    timestamps: false,
    indexes: [{ unique: true, fields: ['fecha'] }]
  });

  return ReporteDiario;
};
