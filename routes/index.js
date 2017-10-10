var express = require('express');
var router = express.Router();

function initRoute(db){
  //Instancias de los Modelos
  const userModel = require('../models/users.js')(db);
  //Middlewares
  const validate= (req,res,next)=>{
    if (req.session.useremail && !(/^\s+$|^$/gi).test(req.session.useremail) ){
      res.locals.isAdmin = false;
      res.locals.isSales = false;
      res.locals.isStaff = false;
      if(req.session.userData){
        req.session.userData.userroles.map(function(r,i){
            res.locals.isAdmin = (r === 'admin')?true:res.locals.isAdmin;
            res.locals.isSales = (r === 'sales')?true:res.locals.isSales;
            res.locals.isStaff = (r === 'staff')?true:res.locals.isStaff;
        });
        res.locals.roles = req.session.userData.userroles.join(' | ');
      }
      next();
    }else{
      return res.redirect('/login');
    }
  }

  //midleware
  router.use(function(req,res,next){
    res.locals.isAuthenticated = ((req.session.useremail && !(/^\s+$|^$/gi).test(req.session.useremail)) && true);
    res.locals.user = req.session.userData;
    next();
  });

  //Rutas
  router.get('/', function(req, res, next) {
    res.render('index', { useremail: req.session.useremail || '' });
  });

  router.route('/login')
        .get(function(req,res,next){
                  var data = {notLoggedin: !(req.session.useremail && req.session.useremail !== '')}
                  res.render('login', data );
                }
            )
        .post(function(req,res,next){
                let {useremail, userpswd} = req.body;
                userModel.login(useremail, userpswd,
                function(err, r_user){
                    if(err){
                      let data = Object.assign({},req.body, {"error":"Correo o Contraseña son incorrectos. Intente Nuevamente."});
                       res.render('login',data);
                    }else{
                      req.session.userid = r_user._id;
                      req.session.useremail = r_user.useremail;
                      req.session.userData = r_user;
                      res.redirect("/dashboard");
                    }
                });//userModel.login
              }
        );//login

  router.route('/signup')
    .get(function(req,res,next){
      return res.render("signup",{});
    })
    .post(function(req,res,next){
      let nUser = Object.assign({},req.body);
      userModel.newUser(nUser.useremail, nUser.userpswd, nUser.username, 'N','','',
        function(err, lUser){
          if(err){
            nUser.errors = err;
            return res.render("signup",nUser);
          }
          req.session.userid = nUser._id;
          req.session.useremail = nUser.useremail;
          req.session.userData = lUser;
          return res.redirect("/dashboard");
        }
      );//newUser
    }); //signup

  router.get('/logout', function(req,res,next){
    req.session.useremail = '';
    return res.redirect('login');
  }); //logout


  // Rutas Protegidas
  router.get('/dashboard',
                validate,
                function(req,res,next){
                    let data = {};
                    data.datediff = datefiff();
                    userModel.getUsersCount(function(err,result){
                      data.usercount = result;
                      return res.render('dashboard',data);
                    });//end getUsersCount
                }
           ); //dashboard

//utilitarios
 function datefiff(){
   let ed = new Date(2017,10,2,0,0,0,0);
   let nd = new Date();
   console.log(ed);
   console.log(nd);
   return Math.round((ed.getTime() - nd.getTime())/(1000*60*60*24)) + 1;
 }

  return router;
}
module.exports = initRoute;
