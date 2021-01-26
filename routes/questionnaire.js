'use strict';
const express = require('express');
const router = express.Router();
const authenticationEnsurer = require('./authentication-ensurer');
const uuid = require('uuid');
const User = require('../models/user');
const Questionnaire = require('../models/questionnaire');
const QuestionnaireItem = require('../models/questionnaireItem');
const Answer = require('../models/answer');
const Comment = require('../models/comment');
const csrf = require('csurf');
const csrfProtection = csrf({ cookie: true });
const moment = require('moment-timezone');
const deleteQuestionnaireAggregate = require('../routes/function').deleteQuestionnaireAggregate;
const changenumberOfvotes = require('../routes/function').changenumberOfvotes;
const reducenumberofmyAnswers = require('../routes/function').reducenumberofmyAnswers;
const changenumberOfanswers = require('../routes/function').changenumberOfanswers;
const increasenumberofmyAnswers = require('../routes/function').increasenumberofmyAnswers;
const isMine = require('../routes/function').isMine;
const makequestionnaireItem = require('../routes/function').makequestionnaireItem;

//アンケート作成ページへ
router.get('/makeQuestionnaire', authenticationEnsurer, csrfProtection, (req, res, next) => {
  const title = 'アンケートを作成';
  res.render('makeQuestionnaire', { 
    title: title,
    user: req.user,
    csrfToken: req.csrfToken()
  });
});

//アンケート作成
router.post('/', authenticationEnsurer, csrfProtection, (req, res, next) => {
  const questionnaireId = uuid.v4();
  const selectiveOrtext = parseInt(req.body.selectiveOrtext);
  const openOrclose = parseInt(req.body.openOrclose);
  const updatedAt = new Date();
  Questionnaire.create({
    questionnaireId: questionnaireId,
    questionnaireName: req.body.questionnaireName.slice(0, 255),
    memo: req.body.memo,
    selectiveOrtext: selectiveOrtext,
    howLong: req.body.howLong,
    openOrclose: openOrclose,
    createdBy: req.user.id,
    numberOfanswers: 0, //この質問に対する回答数（デフォルトで0）
    seal: 0, //デフォルトでは0で回答可能になっている
    updatedAt: updatedAt
  }).then((questionnaire) => {
    User.findOne({
      where: { userId: req.user.id }
    }).then((myAccount) => {
      Questionnaire.count({
        where: { createdBy: req.user.id }
      }).then((numberofmyQuestionnaire) => {
        myAccount.numberofmyQuestionnaire = numberofmyQuestionnaire; //アンケート保有数を増やす（+1）
        myAccount.changed('numberofmyQuestionnaire', true);
        myAccount.save();
      }).then(() => {
        makequestionnaireItem(req, res, questionnaire);
      });
    });
  });
});

//アンケートページへ移動
router.get('/:questionnaireId', authenticationEnsurer, csrfProtection, (req, res, next) => {
  Questionnaire.findOne({
    include: [
      {
        model: User,
        attributes: ['userId', 'username']
      }],
    where: { questionnaireId: req.params.questionnaireId },
    order: [['updatedAt', 'DESC']]
  }).then((questionnaire) => {
    if (questionnaire) {
      QuestionnaireItem.findAll({
        where: { questionnaireId: questionnaire.questionnaireId },
        order: [['questionnaireItemId', 'ASC']]
      }).then((questionnaireItems) => {
        Answer.findAll({
          include: [
            {
              model: User,
              attributes: ['userId', 'username']
            }],
          where: { questionnaireId: questionnaire.questionnaireId },
          order: [['questionnaireItemId', 'ASC']]
        }).then((answers) => {
          Comment.findAll({
            include: [
              {
                model: User,
                attributes: ['userId', 'username']
              }],
            where: { questionnaireId: questionnaire.questionnaireId },
            order: [['commentId', 'DESC']]
          }).then((comments) => {
            questionnaire.formattedUpdatedAt = moment(questionnaire.updatedAt).tz('Asia/Tokyo').format('YYYY/MM/DD HH:mm');
            comments.forEach((comment) => {
              comment.formattedPostedAt = moment(comment.postedAt).tz('Asia/Tokyo').format('YYYY/MM/DD HH:mm');
            })
            const title = questionnaire.questionnaireName;
            res.render('questionnaire', {
              title: title,
              user: req.user,
              questionnaire: questionnaire,
              questionnaireItems: questionnaireItems,
              answers: answers,
              comments: comments,
              csrfToken: req.csrfToken()
            });
          })
        });
      });
    } else {
      const err = new Error('指定された予定は見つかりません');
      err.status = 404;
      next(err);
    }
  });
});

//選択式アンケートの回答作成
router.post('/:questionnaireId/selectiveAnswer', authenticationEnsurer, csrfProtection, (req, res, next) => {
  const questionnaireId = req.params.questionnaireId; //アンケートID
  const answerValue = req.body.selectiveQuestionnaire;
  const questionnaireItemId = answerValue.split('*')[0]; //アンケート項目ID
  const answerContent = answerValue.split('*')[1]; //回答内容

  Questionnaire.findOne({
    where: { questionnaireId: questionnaireId }
  }).then((questionnaire) => {
    if (questionnaire.seal === 0 || questionnaire) { //対象のアンケートが存在し回答可能であったら
      Answer.findOne({
        where: { 
          questionnaireId: questionnaireId,
          userId: req.user.id
        }}).then(data => {
          //↓もし対象のアンケートに一度回答していたらそのデータを消し、自分の回答数・アンケートの回答数を変更する
          if (!data) {
            return true;
          } else {
            data.destroy().then(() => { //回答削除
              reducenumberofmyAnswers(req); //自分のアンケート数の変更（減らす）
            }).then(() => {
              const questionnaireItemId = data.questionnaireItemId;
              changenumberOfvotes(questionnaireItemId); //このアンケート項目に対する投票数の変更
            })
          }
        }).then(() => {
          Answer.create({ //回答作成
            questionnaireItemId: questionnaireItemId,
            userId: req.user.id,
            answer: answerContent,
            questionnaireId: questionnaireId
          }).then(() => {
            Questionnaire.findOne({
              where: { questionnaireId: questionnaireId }
            }).then((questionnaire) => {
              changenumberOfanswers(questionnaire); //このアンケートに対する回答数の変更
            }).then(() => {
              setTimeout(increase, 1000);
              function increase() {
                increasenumberofmyAnswers(req); //自分のアンケート数の変更（増やす）
              }
            }).then(() => {
              changenumberOfvotes(questionnaireItemId); //このアンケート項目に対する投票数の変更
            }).then(() => {
              setTimeout(pass, 1000); //then関数を使っているにも関わらずなぜかデータの記録よりも先にリダイレクトされてしまうのでsetTimeoutを使用
              function pass(){
                res.redirect('/questionnaires/' + questionnaireId);
              }
            });
          });
        });
    } else {
      const err = new Error('このアンケートは作成者によって閉じられたアンケートまたは存在しないアンケートです');
      err.status = 404;
      next(err);
    }
  })
});

//文章式アンケートの回答作成
router.post('/:questionnaireId/textAnswer', authenticationEnsurer, csrfProtection, (req, res, next) => {
  const questionnaireId = req.params.questionnaireId; //アンケートID
  const questionnaireItemIds = req.body.questionnaireItemId.map((q) => q.trim()).filter((q) => q !== ""); //アンケート項目IDの配列
  const answerContents = req.body.textQuestionnaire.map((q) => q.trim()).filter((q) => q !== ""); //回答内容の配列
  const answers = answerContents.map((c, index) => { return {
      questionnaireItemId: questionnaireItemIds[index],
      userId: req.user.id,
      answer: c,
      questionnaireId: questionnaireId
  };});

  Questionnaire.findOne({
    where: { questionnaireId: questionnaireId }
  }).then((questionnaire) => {
    if (questionnaire.seal === 0 || questionnaire) { //対象のアンケートが存在し回答可能であったら
      Answer.findAll({
        where: {
          questionnaireId: questionnaireId,
          userId: req.user.id
        }}).then(datas => {
          //↓もし対象のアンケートに一度回答していたらそのデータを消し、自分の回答数を変更する
          if (datas.length === 0) {
            return true;
          } else {
            Answer.destroy({ //回答削除
              where: {
                questionnaireId: questionnaireId,
                userId: req.user.id
              }
            }).then(() => {
              reducenumberofmyAnswers(req); //自分のアンケート数の変更（減らす）
            });
          }
        }).then(() => {
          Answer.bulkCreate(answers); //回答作成
        }).then(() => {
          Questionnaire.findOne({
            where: { questionnaireId: questionnaireId }
          }).then((questionnaire) => {
            changenumberOfanswers(questionnaire); //このアンケートに対する回答数の変更
          }).then(() => {
            setTimeout(increase, 1000);
            function increase() {
              increasenumberofmyAnswers(req); //自分のアンケート数の変更（増やす）
            }
          }).then(() => {
            setTimeout(pass, 1000); //then関数を使っているにも関わらずなぜかデータの記録よりも先にリダイレクトされてしまうのでsetTimeoutを使用
            function pass(){
              res.redirect('/questionnaires/' + questionnaireId);
            }
          });
        });
    } else {
      const err = new Error('このアンケートは作成者によって閉じられたアンケートまたは存在しないアンケートです');
      err.status = 404;
      next(err);
    }
  })
});

//コメント作成
router.post('/:questionnaireId/comment', authenticationEnsurer, csrfProtection, (req, res, next) => {
  const questionnaireId = req.params.questionnaireId; //アンケートID
  const postedAt = new Date(); //現在時刻
  Comment.create({
    questionnaireId: questionnaireId,
    userId: req.user.id,
    comment: req.body.comment.slice(0, 255),
    postedAt: postedAt
  }).then(() => {
    res.redirect('/questionnaires/' + questionnaireId);
  });
});

//コメント削除
router.post('/:questionnaireId/commentDelete', authenticationEnsurer, csrfProtection, (req, res, next) => {
  const commentId = req.body.commentId; //コメントID
  Comment.findOne({
    where: { commentId: commentId }
  }).then((comment) => {
    if (comment.userId === req.user.id || req.user.id === '116417536229731755577') { //対象のコメントが自分のコメントまたはアプリの管理人であったら
      comment.destroy(); //コメント削除
    } else {
      const err = new Error('指定されたコメントはあなたのコメントではありませんでした。');
      err.status = 404;
      next(err);
    }
  }).then(() => {
    res.redirect('/questionnaires/' + req.params.questionnaireId);
  });
});

//アンケート内容変更ページへ
router.get('/:questionnaireId/edit', authenticationEnsurer, csrfProtection, (req, res, next) => {
  Questionnaire.findOne({
    where: { questionnaireId: req.params.questionnaireId }
  }).then((questionnaire) => {
    if (questionnaire && isMine(req, questionnaire)) { //対象のアンケートが存在し自分のアンケートであるかまたはアプリの管理人であるか確認
      QuestionnaireItem.findAll({
        where: { questionnaireId: questionnaire.questionnaireId },
        order: [['questionnaireItemId', 'ASC']]
      }).then((questionnaireItems) => {
        res.render('edit', {
          user: req.user,
          questionnaire: questionnaire,
          questionnaireItems: questionnaireItems,
          csrfToken: req.csrfToken()
        });
      });
    } else {
      const err = new Error('指定されたアンケートがない、または、編集する権限がありません');
      err.status = 404;
      next(err);
    }
  });
});

//アンケート内容変更
router.post('/:questionnaireId/edit', authenticationEnsurer, csrfProtection, (req, res, next) => {
  Questionnaire.findOne({
    where: { questionnaireId: req.params.questionnaireId }
  }).then((questionnaire) => {
    if (questionnaire && isMine(req, questionnaire)) { //対象のアンケートが存在し自分のアンケートであるかまたはアプリの管理人であるか確認
      const openOrclose = parseInt(req.body.openOrclose);
      const updatedAt = new Date();
      questionnaire.update({
        questionnaireId: questionnaire.questionnaireId,
        questionnaireName: req.body.questionnaireName.slice(0, 255),
        memo: req.body.memo,
        selectiveOrtext: questionnaire.selectiveOrtext,
        howLong: req.body.howLong,
        openOrclose: openOrclose,
        createdBy: req.user.id,
        numberOfanswers: questionnaire.numberOfanswers,
        updatedAt: updatedAt
      }).then((questionnaire) => {
        //↓もしアンケート項目への変更があったらmakequestionnaireItemへ
        if (req.body.questionnaireItem === "") {
          res.redirect('/questionnaires/' + questionnaire.questionnaireId);
        } else {
          makequestionnaireItem(req, res, questionnaire);
        }
      });
    } else {
      const err = new Error('指定されたアンケートがない、または、編集する権限がありません');
      err.status = 404;
      next(err);
    }
  });
});

//アンケート回答フォームを閉じる
router.get('/:questionnaireId/seal', authenticationEnsurer, (req, res, next) => {
  const questionnaireId = req.params.questionnaireId; //アンケートID
  Questionnaire.findOne({
    where: { questionnaireId: questionnaireId }
  }).then((questionnaire) => {
    if (questionnaire && isMine(req, questionnaire)) { //対象のアンケートが存在し自分のアンケートであるかまたはアプリの管理人であるか確認
      questionnaire.seal = 1; //アンケートに回答できなくする
      questionnaire.changed('seal', true);
      questionnaire.save();
    } else {
      const err = new Error('指定されたアンケートがない、または、編集する権限がありません');
      err.status = 404;
      next(err);
    }
  }).then(() => {
    res.redirect('/questionnaires/' + questionnaireId);
  })
});

//アンケート削除
router.post('/:questionnaireId/delete', authenticationEnsurer, csrfProtection, (req, res, next) => {
  const questionnaireId = req.params.questionnaireId; //アンケートID
  Questionnaire.findOne({
    where: { questionnaireId: questionnaireId }
  }).then((questionnaire) => {
    if (questionnaire && isMine(req, questionnaire)) { //対象のアンケートが存在し自分のアンケートであるかまたはアプリの管理人であるか確認
      deleteQuestionnaireAggregate(req, questionnaireId, () => { //アンケート削除
        res.redirect('/');
      });
    } else {
      const err = new Error('指定されたアンケートがない、または、削除する権限がありません');
      err.status = 404;
      next(err);
    }
  });
});

module.exports = router;