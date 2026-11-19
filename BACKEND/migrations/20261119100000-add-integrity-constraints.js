'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.addConstraint('saldos_vacaciones', {
      fields: ['colaborador_id', 'periodo'],
      type: 'unique',
      name: 'saldos_vacaciones_colaborador_periodo_uq'
    });

    await queryInterface.addConstraint('reportes_diarios', {
      fields: ['fecha'],
      type: 'unique',
      name: 'reportes_diarios_fecha_uq'
    });
  },

  async down(queryInterface) {
    await queryInterface.removeConstraint('reportes_diarios', 'reportes_diarios_fecha_uq');
    await queryInterface.removeConstraint('saldos_vacaciones', 'saldos_vacaciones_colaborador_periodo_uq');
  }
};
