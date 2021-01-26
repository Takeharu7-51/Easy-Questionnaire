var express = require('express');
var router = express.Router();
const User = require('../models/user');
const Questionnaire = require('../models/questionnaire');
const moment = require('moment-timezone');

/* GET home page. */
router.get('/', (req, res, next) => {
  const title = 'Easyアンケート';
  if (req.user) {
    Questionnaire.findAll({
      include: [
        {
          model: User,
          attributes: ['userId', 'username']
        }],
      order: [['updatedAt', 'DESC']]
    }).then(questionnaires => {
      User.findOne({
        where: { userId: req.user.id }
      }).then((myAccount) => {
        User.findAll({
          order: [['numberofmyAnswers', 'DESC']]
        }).then((answerRankings) => {
          questionnaires.forEach((questionnaire) => {
            questionnaire.formattedUpdatedAt = moment(questionnaire.updatedAt).tz('Asia/Tokyo').format('YYYY/MM/DD HH:mm');
          });
          res.render('index', {
            title: title,
            user: myAccount,
            userAccount: req.user,
            questionnaires: questionnaires,　//アンケート一覧
            answerRankings: answerRankings //ユーザー回答数ランキング
          });
        });
      });
    });
  } else {
    res.render('index', { title: title, user: req.user });
  }
});

module.exports = router;