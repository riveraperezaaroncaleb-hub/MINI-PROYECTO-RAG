


'use strict';

require('dotenv').config();

const base = {
  username: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_NAME || 'Sistema_de_RRH',
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT) || 3306,
  dialect: 'mysql',
  pool: { max: 10, min: 0, acquire: 30000, idle: 10000 }
};

if (process.env.NODE_ENV === 'production' && (!process.env.DB_USER || !process.env.DB_PASSWORD)) {
  throw new Error('DB_USER y DB_PASSWORD son obligatorios en producción.');
}

module.exports = {
  development: { ...base },
  test: {
    ...base,
    database: process.env.DB_NAME_TEST || 'database_test'
  },
  production: {
    ...base,
    database: process.env.DB_NAME_PROD || 'database_production'
  }
};
