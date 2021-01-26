'use strict';
const express = require('express');
const router = express.Router();
const User = require('../models/user');
const Questionnaire = require('../models/questionnaire');
const QuestionnaireItem = require('../models/questionnaireItem');
const Answer = require('../models/answer');
const Comment = require('../models/comment');

//アンケート削除
function deleteQuestionnaireAggregate(req, questionnaireId, done, err) {
  const promiseCommentDestroy = Comment.findAll({
    where: { questionnaireId: questionnaireId }
  }).then((comments) => {
    return Promise.all(comments.map((c) => { return c.destroy(); }));
  });

  Answer.findAll({
    where: { questionnaireId: questionnaireId }
  }).then((answers) => {
    const promises = answers.map((a) => { return a.destroy(); });
    return Promise.all(promises);
  }).then(() => {
    return QuestionnaireItem.findAll({
      where: { questionnaireId: questionnaireId }
    });
  }).then((questionnaireItems) => {
    const promises = questionnaireItems.map((i) => { return i.destroy(); });
    promises.push(promiseCommentDestroy);
    return Promise.all(promises);
  }).then(() => {
    return Questionnaire.findByPk(questionnaireId).then((q) => { return q.destroy(); });
  }).then(() => {
    User.findOne({
      where: { userId: req.user.id }
    }).then((myAccount) => {
      Questionnaire.count({
        where: { createdBy: req.user.id }
      }).then((numberofmyQuestionnaire) => {
        myAccount.numberofmyQuestionnaire = numberofmyQuestionnaire;
        myAccount.changed('numberofmyQuestionnaire', true);
        myAccount.save();
      }).then(() => {
        if (err) return done(err);
        done();
      });
    });
  });
}

router.deleteQuestionnaireAggregate = deleteQuestionnaireAggregate;

//このアンケート項目に対する投票数の変更
function changenumberOfvotes(questionnaireItemId) {
  Answer.count({
    where: { questionnaireItemId: questionnaireItemId }
  }).then((numberOfvotes) => {
    QuestionnaireItem.findOne({
      where: { questionnaireItemId: questionnaireItemId }
    }).then((questionnaireItem) => {
      questionnaireItem.numberOfvotes = numberOfvotes;
      questionnaireItem.changed('numberOfvotes', true);
      questionnaireItem.save();
    }).then(() => {
      return true;
    });
  });
}

router.changenumberOfvotes = changenumberOfvotes;

//自分のアンケート数の変更（減らす）
function reducenumberofmyAnswers(req) {
  User.findOne({
    where: { userId: req.user.id }
  }).then((myAccount) => {
    myAccount.numberofmyAnswers -= 1;
    myAccount.changed('numberofmyAnswers', true);
    myAccount.save();
  }).then(() => {
    return true;
  });
}

router.reducenumberofmyAnswers = reducenumberofmyAnswers;

//このアンケートに対する回答数の変更
function changenumberOfanswers(questionnaire) {
  let numberOfanswers = [];
  let numberOfanswers2 = [];
  Answer.findAll({
    where: { questionnaireId: questionnaire.questionnaireId }
  }).then((answers) => {
    answers.forEach((answer) => {
      numberOfanswers.push(answer.userId);
    });
  }).then(() => {
    numberOfanswers2 = Array.from(new Set(numberOfanswers));
  }).then(() => {
    questionnaire.numberOfanswers = numberOfanswers2.length;
    questionnaire.changed('numberOfanswers', true);
    questionnaire.save();
  }).then(() => {
    return true;
  });
}

router.changenumberOfanswers = changenumberOfanswers;

//自分のアンケート数の変更（増やす）
function increasenumberofmyAnswers(req) {
  User.findOne({
    where: { userId: req.user.id }
  }).then((myAccount) => {
    myAccount.numberofmyAnswers += 1;
    myAccount.changed('numberofmyAnswers', true);
    myAccount.save();
  }).then(() => {
    return true;
  });
}

router.increasenumberofmyAnswers = increasenumberofmyAnswers;

//対象のアンケートが存在し自分のアンケートであるかまたはアプリの管理人であるか
function isMine(req, questionnaire) {
  return questionnaire && parseInt(questionnaire.createdBy) === parseInt(req.user.id) || parseInt(req.user.id) === 116417536229731755577;
}

router.isMine = isMine;

//アンケート項目の作成
function makequestionnaireItem(req, res, questionnaire) {
  const questionnaireItemNames = req.body.questionnaireItem.trim().split('\n').map((q) => q.trim()).filter((q) => q !== "");
  const questionnaireItems = questionnaireItemNames.map((i) => { return {
    questionnaireItemName: i,
    questionnaireId: questionnaire.questionnaireId,
    numberOfvotes: 0 //デフォルトで0を適応
  };});
  QuestionnaireItem.bulkCreate(questionnaireItems).then(() => {
    res.redirect('/questionnaires/' + questionnaire.questionnaireId);
  });
}

router.makequestionnaireItem = makequestionnaireItem;

module.exports = router;