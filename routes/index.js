var express = require('express');
var router = express.Router();

function initRoute(db){
  //Instancias de los Modelos
  const userModel = require('../models/users.js')(db);
  const bltsModel = require('../models/boletos.js')(db);
  const agndModel = require('../models/agenda.js')(db);
  //Middlewares
  const validate= (req,res,next)=>{
    if (req.session.useremail && !(/^\s+$|^$/gi).test(req.session.useremail) ){
      res.locals.isAdmin = false;
      res.locals.isSales = false;
      res.locals.isStaff = false;
      if(req.session.userData){
        res.locals.username = req.session.userData.username;
        if(req.session.userData.userroles && true){
          req.session.userData.userroles.map(function(r,i){
              res.locals.isAdmin = (r === 'admin')?true:res.locals.isAdmin;
              res.locals.isSales = (r === 'sales')?true:res.locals.isSales;
              res.locals.isStaff = (r === 'staff')?true:res.locals.isStaff;
          });
          res.locals.roles = req.session.userData.userroles.join(' | ');
        }
      }
      next();
    }else{
      return res.redirect('/login');
    }
  }

  const checkIsAdmin = (req,res,next)=>{
    if(res.locals.isAdmin){
      next();
    }else{
      return res.redirect('/dashboard');
    }
  }

  const checkIsSales = (req,res,next)=>{
    if(res.locals.isSales){
      next();
    }else{
      return res.redirect('/dashboard');
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
                      bltsModel.getBoletosStats(
                        (err,stats)=>{
                            data.stats = Object.assign({gold:0,silver:0},stats);
                            if(req.session.userData.boletotyp && true){
                              agndModel.obtenerAgenda(req.session.userData.boletotyp,
                                                      req.session.userData.agenda || [],
                                  (err,docs)=>{
                                    data.agenda = docs;
                                    return res.render('dashboard',data);
                                  });
                            }else{
                              return res.render('dashboard',data);
                            }

                        }
                      ); //getBoletosStats

                    });//end getUsersCount
                }
           ); //dashboard
  router.get('/profile',validate,
                function(req,res,next){
                  return res.render('profile',{});
                }
           );
  router.get('/sales',validate,checkIsSales,
                function(req,res,next){
                  userModel.getUsersUnRegisteredBoleto(".*",(err, docs)=>{
                      return res.render('sales',{"blts":docs,"qr":(req.session.qr||"")});
                  });
                }
            );
  router.post('/sales',validate,checkIsSales,
                function(req,res,next){
                  userModel.getUsersUnRegisteredBoleto(".*"+req.body.qr+".*",(err, docs)=>{
                      req.session.qr = req.body.qr;
                      return res.render('sales',{"blts":docs,"qr":req.body.qr});
                  });
                }
            );

  router.post('/prepareticketsale/:userid',validate,checkIsSales,
                function(req,res,next){
                  userModel.getUserById(req.params.userid, (err, userDoc)=>{
                    req.session.sales = {};
                    req.session.sales.tk = new Date().getTime()
                    req.session.sales.etk = encodeURIComponent(req.session.sales.tk);
                    req.session.sales.type=(req.body.goldbtn&&true)?"Gold":"Silver";
                    req.session.sales.isGold = (req.body.goldbtn&&true);
                    req.session.sales.user = userDoc;
                    console.log(req.session.sales.etk);
                    res.redirect('/confirmticketsale/' + req.session.sales.etk);
                  });
                }
            );


  router.get('/confirmticketsale/:tks',validate,checkIsSales,
                function(req,res,next){
                  if(!req.session.sales){
                    delete req.session.sales;
                    res.render('jserror',{"error":"Transacción Comprometida","red":"/sales"});
                  } else{
                    let tkv = decodeURIComponent(req.params.tks);
                    console.log(tkv);
                    if(tkv != req.session.sales.tk){
                      delete req.session.sales;
                      res.render('jserror',{"error":"Transacción Comprometida","red":"/sales"});
                    }else{
                      res.render('confirmsales',req.session.sales);
                    }
                  }
            });

  router.post('/confirmticketsale/:tks',validate,checkIsSales,
                function(req,res,next){
                  if(!req.session.sales){
                    delete req.session.sales;
                    res.render('jserror',{"error":"Transacción Comprometida","red":"/sales"});
                  } else{
                    let tkv = decodeURIComponent(req.params.tks);
                    if(tkv != req.session.sales.tk){
                      delete req.session.sales;
                      res.render('jserror',{"error":"Transacción Comprometida","red":"/sales"});
                    }else{
                      let data = Object.assign({}, req.session.sales);
                      let bnum = req.body.boletonum.toLowerCase();
                      let regx = (req.session.sales.isGold)?/^pr0[0-3][0-9][0-9]$/:/^pl0[0-3][0-9][0-9]$/ ;
                      if(!regx.test(bnum)){
                          data.errors = "El número de boleto ingresado no tiene el formato correcto.";
                          data.boletonum = bnum.toUpperCase;
                          return res.render('confirmsales',data);
                      }else{
                          //Buscando si el boleto está disponible
                          bltsModel.isBoletoAvailable(bnum, (err, doc)=>{
                            if(err || !doc){
                              data.errors = "El número de boleto no está disponible.";
                              data.boletonum = bnum.toUpperCase();
                              return res.render('confirmsales',data);
                            }
                            //Guardando el boleto
                            let price = (req.session.sales.isGold)?350.00:100.00;
                            bltsModel.checkoutBoleto(
                              bnum,
                              price,
                              req.session.sales.user._id,
                              req.session.userData._id,
                              (err,doc)=>{
                                if(err){
                                  data.errors = "El número de boleto no está disponible.";
                                  data.boletonum = bnum.toUpperCase();
                                  return res.render('confirmsales',data);
                                }
                                var clientName = req.session.sales.user.username;
                                req.session.user.boletonum = bnum.toUpperCase();
                                req.session.user.boletotyp = req.session.sales.type.toUpperCase();
                                delete req.session.sales;
                                return res.render('jserror',{"error":"Boleto " + bnum + " registrado satisfactoriamente a " + clientName + "." , "red":"/sales"});
                              }
                            );//checkoutBoleto
                          });//isBoletoAvailable
                      }


                    }
                  }
            });
  router.get('/csv/:blttype',validate,checkIsSales,
        function(req,res,next){
          userModel.getUsersByType(req.params.blttype, (err,usrs)=>{

          res.set('Content-Type', 'text/csv');
          res.set('charset','utf-8');
          res.set("Content-Disposition", "attachment;"+req.params.blttype+".csv");
          let bodystr = usrs.map((i)=>{return [i.username,i.useremail,i.boletonum,i.boletotyp].join(",");}).join('\r\n');
          res.send(Buffer.from(bodystr));
          }
        );
    }
  );
  router.post('/remove/:acode', validate,(req,res,next)=>{
    agndModel.quitarCupo(req.session.userData._id, req.params.acode,
      (err,done)=>{
        var ag = req.session.userData.agenda || [];
        var nag = ag.filter((a,b)=>{
          if(a != req.params.acode){
            return a;
          }
        });
        req.session.userData.agenda = nag;
        return res.render('jserror',{"error":"Taller Desasociado" , "red":"/dashboard"});
      }
    );
  });

  router.post('/add/:acode', validate,(req,res,next)=>{
    let maxS = 0 ;
    let agg = req.session.userData.agenda || [];
    let ag = agg.filter((a,b)=>{ return (a!==null);});
    console.log(ag);
     if(req.session.userData.boletotyp==="gold"){

       if(ag.length){
         if(ag.length == 2){
           return res.render('jserror',{"error":"No puede agregar mas talleres" , "red":"/dashboard"});
         }
         if(parseInt(ag[0].substring(1,4)) < 19 && parseInt(req.params.acode.substring(1,4)) < 19){
           return res.render('jserror',{"error":"Solo un Taller por Día" , "red":"/dashboard"});
         }
         if(parseInt(ag[0].substring(1,4)) > 19 && parseInt(req.params.acode.substring(1,4)) > 19){
           return res.render('jserror',{"error":"Solo un Taller por Día" , "red":"/dashboard"});
         }
       }

       agndModel.reservaCupo(req.session.userData._id, req.params.acode, (err, dd)=>{
         if(err) return res.render('jserror',{"error":err.message , "red":"/dashboard"});
         if(dd && true){
           ag.push(req.params.acode);
           req.session.userData.agenda = ag;
           console.log(ag.length,ag);
           return res.render('jserror',{"error":"Taller Asociado" , "red":"/dashboard"});
         }else{
           return res.render('jserror',{"error":"No se pudo asociar Taller" , "red":"/dashboard"});
         }
       });
       return;
     }else{
       if(ag.length){
         if(ag.length = 6){
           return res.render('jserror',{"error":"No puede agregar mas talleres" , "red":"/dashboard"});
         }
         var agn = parseint(req.params.acode.substring(1,4));
         switch (agn) {
           case 1:
            if(ag.find((a,b)=>{return a=='s002';})) return res.render('jserror',{"error":"No se puede agregar Taller a la misma hora" , "red":"/dashboard"});
          case 2:
            if(ag.find((a,b)=>{return a=='s001';})) return res.render('jserror',{"error":"No se puede agregar Taller a la misma hora" , "red":"/dashboard"});
          case 3:
            if(ag.find((a,b)=>{return a=='s004';})) return res.render('jserror',{"error":"No se puede agregar Taller a la misma hora" , "red":"/dashboard"});
          case 4:
            if(ag.find((a,b)=>{return a=='s003';})) return res.render('jserror',{"error":"No se puede agregar Taller a la misma hora" , "red":"/dashboard"});
          case 5:
            if(ag.find((a,b)=>{return a=='s006';})) return res.render('jserror',{"error":"No se puede agregar Taller a la misma hora" , "red":"/dashboard"});
          case 6:
            if(ag.find((a,b)=>{return a=='s005';})) return res.render('jserror',{"error":"No se puede agregar Taller a la misma hora" , "red":"/dashboard"});
          case 7:
            if(ag.find((a,b)=>{return a=='s008';})) return res.render('jserror',{"error":"No se puede agregar Taller a la misma hora" , "red":"/dashboard"});
          case 8:
            if(ag.find((a,b)=>{return a=='s007';})) return res.render('jserror',{"error":"No se puede agregar Taller a la misma hora" , "red":"/dashboard"});
          case 9:
            if(ag.find((a,b)=>{return a=='s010';})) return res.render('jserror',{"error":"No se puede agregar Taller a la misma hora" , "red":"/dashboard"});
          case 10:
            if(ag.find((a,b)=>{return a=='s009';})) return res.render('jserror',{"error":"No se puede agregar Taller a la misma hora" , "red":"/dashboard"});
          case 11:
            if(ag.find((a,b)=>{return a=='s012';})) return res.render('jserror',{"error":"No se puede agregar Taller a la misma hora" , "red":"/dashboard"});
          case 12:
            if(ag.find((a,b)=>{return a=='s011';})) return res.render('jserror',{"error":"No se puede agregar Taller a la misma hora" , "red":"/dashboard"});
         } // end switch
       }
       agndModel.reservaCupo(req.session.userData._id, req.params.acode, (err, dd)=>{
         if(err) return res.render('jserror',{"error":err.message , "red":"/dashboard"});
         if(dd){
           ag.push(req.params.acode);
           req.session.userData.agenda = ag;
           return res.render('jserror',{"error":"Taller Asociado" , "red":"/dashboard"});
         }else{
           return res.render('jserror',{"error":"No se pudo asociar Taller" , "red":"/dashboard"});
         }
       });
       return;
     }
     //return res.render('jserror',{"error":"Error no controlado" , "red":"/dashboard"});
  });
//utilitarios
 function datefiff(){
   let ed = new Date(2017,10,2,0,0,0,0);
   let nd = new Date();
   return Math.round((ed.getTime() - nd.getTime())/(1000*60*60*24)) + 1;
 }
  return router;
}
module.exports = initRoute;
