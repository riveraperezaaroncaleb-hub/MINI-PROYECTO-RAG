'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('movimientos_personal', {
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
      fecha: {
        allowNull: false,
        type: Sequelize.DATEONLY
      },
      motivo: {
        allowNull: false,
        type: Sequelize.TEXT
      }
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('movimientos_personal');
  }
};
