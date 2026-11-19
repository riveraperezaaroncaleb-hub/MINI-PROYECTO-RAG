'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Usuarios', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      nombre: {
        allowNull: false,
        type: Sequelize.STRING
      },
      edad: {
        allowNull: false,
        type: Sequelize.INTEGER
      },
      departamento: {
        allowNull: false,
        type: Sequelize.STRING
      },
      puesto: {
        allowNull: false,
        type: Sequelize.STRING
      },
      fecha_ingreso: {
        allowNull: false,
        type: Sequelize.DATEONLY
      },
      jefe_id: {
        type: Sequelize.INTEGER,
        references: {
          model: 'Usuarios',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      rol: {
        allowNull: false,
        type: Sequelize.STRING,
        defaultValue: 'colaborador'
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('Usuarios');
  }
};
