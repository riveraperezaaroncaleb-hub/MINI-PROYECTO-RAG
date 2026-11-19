'use strict';

const bcrypt = require('bcrypt');

module.exports = {
  async up(queryInterface) {
    const hash = await bcrypt.hash('demo1234', 10);

    await queryInterface.bulkUpdate('Usuarios', { password_hash: hash }, { password_hash: null });
  },

  async down(queryInterface) {
    await queryInterface.bulkUpdate('Usuarios', { password_hash: null }, {});
  }
};
