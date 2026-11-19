'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('saldos_vacaciones', {
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
      periodo: {
        allowNull: false,
        type: Sequelize.STRING
      },
      dias_asignados: {
        allowNull: false,
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      dias_tomados: {
        allowNull: false,
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      dias_disponibles: {
        allowNull: false,
        type: Sequelize.INTEGER,
        defaultValue: 0
      }
    });

    await queryInterface.addConstraint('saldos_vacaciones', {
      fields: ['colaborador_id', 'periodo'],
      type: 'unique',
      name: 'saldos_vacaciones_colaborador_periodo'
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('saldos_vacaciones');
  }
};
