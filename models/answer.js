'use strict';
const loader = require('./sequelize-loader');
const Sequelize = loader.Sequelize;

const Answer = loader.database.define(
  'answers',
  {
    questionnaireItemId: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      allowNull: false
    },
    userId: {
      type: Sequelize.DECIMAL,
      primaryKey: true,
      allowNull: false
    },
    answer: { //回答の内容
      type: Sequelize.TEXT,
      allowNull: false
    },
    questionnaireId: {
      type: Sequelize.UUID,
      allowNull: false
    }
  },
  {
    freezeTableName: true,
    timestamps: false,
    indexes: [
      {
        fields: ['questionnaireId']
      }
    ]
  }
);

module.exports = Answer;