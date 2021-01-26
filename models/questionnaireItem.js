'use strict';
const loader = require('./sequelize-loader');
const Sequelize = loader.Sequelize;

const QuestionnaireItem = loader.database.define(
  'questionnaireItems',
  {
    questionnaireItemId: { //アンケート項目のID
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    questionnaireItemName: { //項目のタイトル
      type: Sequelize.STRING,
      allowNull: false
    },
    numberOfvotes: { //このアンケート事項に対する投票数
      type: Sequelize.INTEGER,
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

module.exports = QuestionnaireItem;