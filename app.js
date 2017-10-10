var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var session = require('express-session');
var MongoStore = require('connect-mongo')(session);

function initApp(db){
    var app = express();

    // view engine setup
    app.set('views', path.join(__dirname, 'views'));
    app.set('view engine', 'hbs');

    // uncomment after placing your favicon in /public
    //app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
    app.use(logger('dev'));
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: false }));
    app.use(cookieParser());
    app.use(require('less-middleware')(path.join(__dirname, 'public')));

    app.use(session({
      secret: 'lokdnjaiiwkekmkowjf102849m',
      resave: false,
      saveUninitialized: true,
      store: new MongoStore({db:db}),  // guarda la data en mongodb en vez de memoria.
       cookie: { maxAge: (15*60*1000) } // m * d * h * m * s * ms
    }));

    app.use(express.static(path.join(__dirname, 'public')));

    var index = require('./routes/index')(db);

    app.use('/', index);

    // catch 404 and forward to error handler
    app.use(function(req, res, next) {
      var err = new Error('Not Found');
      err.status = 404;
      next(err);
    });

    // error handler
    app.use(function(err, req, res, next) {
      // set locals, only providing error in development
      console.log(err);
      // res.locals.message = err.message;
      // res.locals.error = req.app.get('env') === 'development' ? err : {};
      //
      // // render the error page
      // res.status(err.status || 500);
      // res.render('error');
    });
    return app;
}

module.exports = initApp;
