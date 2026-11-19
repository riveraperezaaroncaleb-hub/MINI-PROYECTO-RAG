'use strict';
const {
  Model
} = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class SaldoVacaciones extends Model {
    static associate(models) {
      SaldoVacaciones.belongsTo(models.Usuario, {
        as: 'colaborador',
        foreignKey: 'colaborador_id'
      });
    }
  }

  SaldoVacaciones.init({
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
    periodo: {
      type: DataTypes.STRING,
      allowNull: false
    },
    dias_asignados: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    dias_tomados: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    dias_disponibles: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    }
  }, {
    sequelize,
    modelName: 'SaldoVacaciones',
    tableName: 'saldos_vacaciones',
    timestamps: false,
    indexes: [{ unique: true, fields: ['colaborador_id', 'periodo'] }]
  });

  return SaldoVacaciones;
};
