'use strict';
const request = require('supertest');
const app = require('../app');
const passportStub = require('passport-stub');
const User = require('../models/user');
const Questionnaire = require('../models/questionnaire');
const QuestionnaireItem = require('../models/questionnaireItem');

describe('/login', () => {
  beforeAll(() => {
    passportStub.install(app);
    passportStub.login({ id: 0, username: 'testuser' });
  });

  afterAll(() => {
   passportStub.logout();
   passportStub.uninstall(app);
  });

  test('ログインのためのリンクが含まれる', () => {
    return request(app)
      .get('/login')
      .expect('Content-Type', 'text/html; charset=utf-8')
      .expect(/<a href="\/auth\/github"/)
      .expect(200);
  });
});

describe('/logout', () => {
  test('/ にリダイレクトされる', () => {
    return request(app)
      .get('/logout')
      .expect('Location', '/')
      .expect(302);
  });
});

describe('/questionnaires', () => {
  beforeAll(() => {
    passportStub.install(app);
    passportStub.login({ id: 0, username: 'testuser' });
  });

  afterAll(() => {
    passportStub.logout();
    passportStub.uninstall(app);
  });

  it('アンケートが作成でき、表示される', done => {
    User.upsert({ userId: 0, username: 'testuser', numberofmyAnswers: 0, numberofmyQuestionnaire: 0 }).then(() => {
      request(app)
        .post('/questionnaires')
        .send({
          questionnaireName: 'アンケート１',
          memo: 'アンケートメモ１\r\nアンケートメモ２',
          questionnaireItem: 'アンケート項目１\r\nアンケート項目２\r\nアンケート項目３',
          howLong: '１分以内',
          selectiveOrtext: 0,
          openOrclose: 0,
        })
        .expect('Location', /questionnaires/)
        .expect(302)
        .end((err, res) => {
          const createdQuestionnairePath = res.headers.location;
          request(app)
            .get(createdQuestionnairePath)
            .expect(/アンケート１/)
            .expect(/アンケートメモ１/)
            .expect(/アンケートメモ２/)
            .expect(/１分以内/)
            .expect(/選択・OPEN/)
            .expect(/0件/)
            .expect(/testuser/)
            .expect(/アンケート項目１/)
            .expect(/アンケート項目２/)
            .expect(/アンケート項目３/)
            .expect(200)
            .end((err, res) => {
              if (err) return done(err);
              const questionnaireId = createdQuestionnairePath.split('/questionnaires/')[1];
              QuestionnaireItem.findAll({
                where: { questionnaireId: questionnaireId }
              }).then(questionnaireItems => {
                const promises = questionnaireItems.map(i => {
                  return i.destroy();
                });
                Promise.all(promises).then(() => {
                  Questionnaire.findByPk(questionnaireId).then(q => {
                    q.destroy().then(() => {
                      if (err) return done(err);
                      done();
                    });
                  });
                });
              });
            });
        });
    });
  });
});