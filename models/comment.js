'use strict';
const loader = require('./sequelize-loader');
const Sequelize = loader.Sequelize;

const Comment = loader.database.define(
  'comments',
  {
    questionnaireId: {
      type: Sequelize.UUID,
      allowNull: false
    },
    userId: {
      type: Sequelize.DECIMAL,
      allowNull: false
    },
    commentId: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false
    },
    comment: { //コメントの内容
      type: Sequelize.STRING, //コメントは上限255文字まで
      allowNull: false
    },
    postedAt: {
      type: Sequelize.DATE,
      allowNull: false
    }
  },
  {
    freezeTableName: true,
    timestamps: false
  }
);

module.exports = Comment;