var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { useremail: req.session.useremail || '' });
});

router.get('/login',
              function(req,res,next){
                var data = {notLoggedin: !(req.session.useremail && req.session.useremail !== '')}
                res.render('login', data );
              }
); //login
router.post('/login',
            function(req,res,next){
              console.log(req.body);
              if(req.body.useremail==="obetancourthunicah@gmail.com"
                  && req.body.userpswd === "12345678"){
                    req.session.useremail = req.body.useremail;
                    res.redirect('/');
                  }else{
                    var data = Object.assign(
                                    {},
                                    req.body,
                                    {"error":"Credenciales no Válidas"},
                                    {notLoggedin: !(req.session.useremail && req.session.useremail !== '')}
                                  );
                    delete data.userpswd;
                      res.render('login', data);
                  }
            }
);//login

router.post('logout', function(req,res,next){
  req.session.useremail = '';
  res.redirect('login');
}); //logout
module.exports = router;
