const bcrypt = require('bcrypt-nodejs');
const ObjectID = require('mongodb').ObjectID;
const { validateEmail,validatePassword,validateGender,isEmpty }  = require('../utilities/validators.js');

const UserTemplate={
  "useremail":"",
  "userpswd":"",
  "username":"",
  "usergender":"",
  "userphone":"",
  "userUnicahAccount":"",
  "userpicuri":"",
  "useremailconfirmed":false,
  "userroles":["public"],
  "boletoregistered":false
}

function UserModel(db){
  this.userCll = db.collection('users');
  let _self = this; //Para evitar problemas de cloujure

  this.newUser = (useremail, userpswd, username, usergender,userphone,userUnicahAccount, handler)=>{
    let nUser = Object.assign({},UserTemplate,{useremail, userpswd, username, usergender,userphone,userUnicahAccount});

    let errors =[];
    if(!validateEmail(nUser.useremail)) errors.push({"useremail":"Correo en Formato incorrecto."});
    if(!validatePassword(nUser.userpswd)) errors.push({"userpswd":"Contraseña deben ser almenos de 8 characters de largo, incluir una mayúscula y un número."});
    if(!validateGender(nUser.usergender)) errors.push({"usergender":"Masculino o Femenino"});
    if(isEmpty(nUser.username)) errors.push({"username":"Su Nombre es Requerido"});
    //Determinando si Ya existe un usuario con este correo
    if(errors.length) return handler(errors,null);
    _self.userCll.findOne({"useremail":nUser.useremail},function(err, fUser){
      if(fUser && fUser.useremail === nUser.useremail){
        errors.push({"other":"Ya existe un registro con este correo electrónico"});
        return handler(errors,null);
      }
      //salando la contraseña
      bcrypt.genSalt(10, function(err,salt){
        if(err) return handler(err,null);
        bcrypt.hash(nUser.userpswd,salt,null,function(err,hash){
          if(err) return handler(err,null);
          nUser.userpswd = hash;
          //guardando en la colección el documento
          _self.userCll.insertOne(nUser,function(err, result){
            if(err){
              errors.push({"db":"No se pudo guardar, intentelo nuevamente."});
              return handler(errors,null);
            }else{
              console.log(result.ops);
              return handler(null, result.ops);
            }
          });//end insertOne
      });
    });
    });
  } //new user;

  this.updateProfile = (userid, username, usergender, userphone,userUnicahAccount, handler) =>{
    let userId = new ObjectID(userid);
    _self.userCll.updateOne(
        {"_id": userId},
        {"$set":{username, usergender, userphone,userUnicahAccount}},
        function(err, result){
          if(err){
            return handler(err,null);
          }
          return handler(err, result.modifiedCount);
        }
    ); //updateOne
  } // uodateProfile

  this.login = (useremail, userpswd, handler)=>{
    _self.userCll.findOne({"useremail":useremail}, function(err,cUser){
      if(err) return handler(err,null);
      //comparando contraseñas
      if(cUser){
        bcrypt.compare(userpswd, cUser.userpswd , function(err, isMatch){
          if(err) return handler(err, null);
          return handler(null, cUser);
        });//compare
      }else{
        let _err = new Error("No User Found");
        return handler(_err, null);
      }
    });// findone
  }//login

  this.getUsersCount=(handler)=>{
    _self.userCll.count({},function(err,result){
      if(err) return handler(err,null);
      return handler(null,result);
    });//end count
  }

  this.getUsersUnRegisteredBoleto=(filter,handler)=>{
    let q = {"$or":[
              {"username":{"$regex":filter}},
              {"useremail":{"$regex":filter}}
            ], "boletoregistered":false};
    _self.userCll.find(q).toArray(
      (err, docs)=>{
        if(err){return handler(err, null)};
        return handler(null, docs);
      }
    );
  }

  this.getUserById=(uid,handler)=>{
    let q = {"_id": new ObjectID(uid)};
    _self.userCll.findOne(q,
      (err, doc)=>{
        if(err){return handler(err, null)};
        if(!doc){return handler(new Error("No se encontro usuario"), null);}
        return handler(null, doc);
      }
    );
  } //getUserById

} // end UserModel



module.exports = (db) => {
  return new UserModel(db);
}
