'use strict';

if (process.env.DATABASE_URL) {
  const pg = require('pg');
  pg.defaults.ssl = true;
}

const Sequelize = require('sequelize');
const sequelize = new Sequelize(
  process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost/questionnaireapp'
);

module.exports = {
  database: sequelize,
  Sequelize: Sequelize
};
