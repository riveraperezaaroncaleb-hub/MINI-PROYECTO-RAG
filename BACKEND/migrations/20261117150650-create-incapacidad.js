'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('incapacidades', {
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
      dias: {
        allowNull: false,
        type: Sequelize.INTEGER
      },
      entidad: {
        allowNull: false,
        type: Sequelize.STRING
      }
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('incapacidades');
  }
};
