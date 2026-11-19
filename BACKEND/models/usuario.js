'use strict';
const {
  Model
} = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Usuario extends Model {
    static associate(models) {
      Usuario.belongsTo(Usuario, {
        as: 'jefe',
        foreignKey: 'jefe_id'
      });
      Usuario.hasMany(Usuario, {
        as: 'subordinados',
        foreignKey: 'jefe_id'
      });
      Usuario.hasMany(models.SaldoVacaciones, {
        as: 'saldosVacaciones',
        foreignKey: 'colaborador_id'
      });
      Usuario.hasMany(models.Solicitud, {
        as: 'solicitudes',
        foreignKey: 'colaborador_id'
      });
      Usuario.hasMany(models.Solicitud, {
        as: 'solicitudesAprobadas',
        foreignKey: 'aprobador_id'
      });
      Usuario.hasMany(models.Incapacidad, {
        as: 'incapacidades',
        foreignKey: 'colaborador_id'
      });
      Usuario.hasMany(models.MovimientoPersonal, {
        as: 'movimientosPersonal',
        foreignKey: 'colaborador_id'
      });
      Usuario.hasMany(models.ReporteDiario, {
        as: 'reportesDiarios',
        foreignKey: 'generado_por'
      });
    }
  }

  Usuario.init({
    nombre: {
      type: DataTypes.STRING,
      allowNull: false
    },
    edad: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    departamento: {
      type: DataTypes.STRING,
      allowNull: false
    },
    puesto: {
      type: DataTypes.STRING,
      allowNull: false
    },
    fecha_ingreso: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    jefe_id: {
      type: DataTypes.INTEGER,
      references: {
        model: 'Usuarios',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    },
    rol: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'colaborador'
    },
    password_hash: {
      type: DataTypes.STRING
    }
  }, {
    sequelize,
    modelName: 'Usuario'
  });

  return Usuario;
};
