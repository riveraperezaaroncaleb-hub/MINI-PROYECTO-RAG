'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('solicitudes', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      colaborador_id: {
        allowNull: false,
        type: Sequelize.INTEGER,
        references: {
          model: 'Usuarios',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      tipo: {
        allowNull: false,
        type: Sequelize.STRING
      },
      fecha_inicio: {
        allowNull: false,
        type: Sequelize.DATEONLY
      },
      fecha_fin: {
        allowNull: false,
        type: Sequelize.DATEONLY
      },
      estado: {
        allowNull: false,
        type: Sequelize.STRING,
        defaultValue: 'Pendiente'
      },
      aprobador_id: {
        type: Sequelize.INTEGER,
        references: {
          model: 'Usuarios',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      creada_en: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      }
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('solicitudes');
  }
};
