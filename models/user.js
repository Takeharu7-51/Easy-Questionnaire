'use strict';
const loader = require('./sequelize-loader');
const Sequelize = loader.Sequelize;

const User = loader.database.define(
  'users',
  {
    userId: {
      type: Sequelize.DECIMAL, //Githubアカウントの場合はINTEGERで良いがGoogleアカウントの場合IDが長いのでDECIMAL
      primaryKey: true,
      allowNull: false
    },
    username: { //アカウント名
      type: Sequelize.STRING,
      allowNull: false
    },
    numberofmyAnswers: { //自分の回答数
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0 //デフォルトで0を設定
    },
    numberofmyQuestionnaire: { //自分のアンケート数
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0
    }
  },
  {
    freezeTableName: true,
    timestamps: false,
    indexes: [
      {
        fields: ['userId']
      }
    ]
  }
);

module.exports = User;