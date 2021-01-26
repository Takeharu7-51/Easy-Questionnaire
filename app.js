var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var helmet = require('helmet');
var session = require('express-session');
var passport = require('passport');

//モデルの読み込み
var User = require('./models/user');
var Questionnaire = require('./models/questionnaire');
var QuestionnaireItem = require('./models/questionnaireItem');
var Answer = require('./models/answer');
var Comment = require('./models/comment');
User.sync().then(() => {
  Questionnaire.belongsTo(User, {foreignKey: 'createdBy'});
  Questionnaire.sync();
  Comment.belongsTo(User, {foreignKey: 'userId'});
  Comment.sync();
  Answer.belongsTo(User, {foreignKey: 'userId'});
  QuestionnaireItem.sync().then(() => {
    Answer.belongsTo(QuestionnaireItem, {foreignKey: 'questionnaireItemId'});
    Answer.sync();
  });
});

//GitHub認証
var GitHubStrategy = require('passport-github2').Strategy;
var GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID || '2930e999d4488dd44749';
var GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET || '3a1cd7f1400c31924f12303a70fae7c2c93ef7d3';

passport.serializeUser(function (user, done) {
  done(null, user);
});

passport.deserializeUser(function (obj, done) {
  done(null, obj);
});

passport.use(new GitHubStrategy({
  clientID: GITHUB_CLIENT_ID,
  clientSecret: GITHUB_CLIENT_SECRET,
  callbackURL: process.env.HEROKU_URL ? process.env.HEROKU_URL + 'auth/github/callback' : 'http://localhost:8000/auth/github/callback'
},
  function (accessToken, refreshToken, profile, done) {
    process.nextTick(function () {
      User.upsert({
        userId: profile.id,
        username: profile.username,
        numberofmyAnswers: profile.numberofmyAnswers,
        numberofmyQuestionnaire: profile.numberofmyQuestionnaire
      }).then(() => {
        done(null, profile);
      });
    });
  }
));

//Google認証
var GoogleStrategy = require('passport-google-oauth20').Strategy;
var GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '778771617054-uiklh0etg0ctd26ve7jugn6mfga5nue5.apps.googleusercontent.com';
var GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || 'tBKMZVkLQPpI7i5mRvF_6wsL';

passport.serializeUser(function (user, done) {
  done(null, user);
});

passport.deserializeUser(function (user, done) {
  done(null, obj);
});

passport.use(new GoogleStrategy({
  clientID: GOOGLE_CLIENT_ID,
  clientSecret: GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.HEROKU_URL ? process.env.HEROKU_URL + 'auth/google/callback' : 'http://localhost:8000/auth/google/callback'
},
  function (accessToken, refreshToken, profile, done) {
    process.nextTick(function () {
      // return done(null, profile);
      // var userId = parseInt(profile.id);
      User.upsert({
        userId: profile.id,
        username: profile.displayName,
        numberofmyAnswers: profile.numberofmyAnswers,
        numberofmyQuestionnaire: profile.numberofmyQuestionnaire
      }).then(() => {
        done(null, profile);
      });
    });
  }
));

var indexRouter = require('./routes/index');
var loginRouter = require('./routes/login');
var logoutRouter = require('./routes/logout');
var questionnaireRouter = require('./routes/questionnaire');

var app = express();
app.use(helmet());

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({ secret: '4e62f921d073c96d', resave: false, saveUninitialized: false }));
app.use(passport.initialize());
app.use(passport.session());

app.use('/', indexRouter);
app.use('/login', loginRouter);
app.use('/logout', logoutRouter);
app.use('/questionnaires', questionnaireRouter);

app.get('/auth/github',
  passport.authenticate('github', { scope: ['user:email'] }),
  function (req, res) {
});

app.get('/auth/github/callback',
  passport.authenticate('github', { failureRedirect: '/login' }),
  function (req, res) {
    var loginFrom = req.cookies.loginFrom;
    // オープンリダイレクタ脆弱性対策
    if (loginFrom &&
      !loginFrom.includes('http://') &&
      !loginFrom.includes('https://')) {
      res.clearCookie('loginFrom');
      res.redirect(loginFrom);
    } else {
      res.redirect('/');
    }
});

// Googleログイン認証（スコープ設定）へ
app.get('/auth/google', passport.authenticate('google', {
  scope: [
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/userinfo.email'
  ]
}));

// Googleログインコールバック
app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  function (req, res) {
    var loginFrom = req.cookies.loginFrom;
    // オープンリダイレクタ脆弱性対策
    if (loginFrom &&
      !loginFrom.includes('http://') &&
      !loginFrom.includes('https://')) {
      res.clearCookie('loginFrom');
      res.redirect(loginFrom);
    } else {
      res.redirect('/');
    }
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;