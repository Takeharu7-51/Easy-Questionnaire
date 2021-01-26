'use strict';
const loader = require('./sequelize-loader');
const Sequelize = loader.Sequelize;

const Questionnaire = loader.database.define(
  'questionnaires',
  {
    questionnaireId: { //アンケートID
      type: Sequelize.UUID,
      primaryKey: true,
      allowNull: false
    },
    questionnaireName: { //アンケートの見出し
      type: Sequelize.STRING,
      allowNull: false
    },
    memo: { //アンケートについての説明や一言
      type: Sequelize.TEXT,
      allowNull: false
    },
    selectiveOrtext: { //選択か文章か（選択： 0, 文章： 1）
      type: Sequelize.INTEGER,
      allowNull: false
    },
    howLong: { //アンケートにかかる時間、時間目安（分をつけたいのでSTRING型）
      type: Sequelize.STRING,
      allowNull: false
    },
    openOrclose: {
      type: Sequelize.INTEGER, //OPENかCLOSEのどちらの形式にする（OPEN： 0, CLOSE: 1）
      allowNull: false
    },
    createdBy: { //アンケートの作成者
      type: Sequelize.DECIMAL,
      allowNull: false
    },
    numberOfanswers: { //このアンケートに対する回答数
      type: Sequelize.INTEGER,
      allowNull: false
    },
    seal: {
      type: Sequelize.INTEGER, //回答フォームが閉じているか否か (sealが0の時は回答可能で1になるとアンケート回答不可)
      allowNull: false
    },
    updatedAt: { //更新日時
      type: Sequelize.DATE,
      allowNull: false
    }
  },
  {
    freezeTableName: true,
    timestamps: false,
    indexes: [
      {
        fields: ['createdBy']
      }
    ]
  }
);

module.exports = Questionnaire;