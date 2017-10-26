const bcrypt = require('bcrypt-nodejs');
const ObjectID = require('mongodb').ObjectID;
const { validateEmail,isEmpty }  = require('../utilities/validators.js');

const BoletoTemplate={
  "boletonum":0,
  "boletotyp":"",
  "boletosold":false,
  "boletosoldby":"",
  "boletosolddate":0,
  "boletosoldto":false, //ObjectID
  "boletosoldprice":0
}

function BoletoModel(db){
  this.boletoCll = db.collection('boletos');
  this.userCll = db.collection('users');
  let _self = this; //Para evitar problemas de cloujure

  this.getAvailableBoletos = (handler)=>{
    _self.boletoCll.find({boletosold:false,boletotyp:'gold'})
          .toArray((err, docs)=>{
            if(err) return handler(null,[]);
            return handler(null,docs);
          });
  }
  this.getSoldBoletos = (handler)=>{
    _self.boletoCll.find({boletosold:true})
          .toArray((err, docs)=>{
            if(err) return handler(null,[]);
            return handler(null,docs);
          });
  }

  this.isBoletoAvailable = (boletonum, handler)=>{
    _self.boletoCll.findOne({"boletonum":boletonum,"boletosold":false}, (err, doc)=>{
      if(err) return handler(err, null);
          return handler(null, doc);
    });
  }

  this.checkoutBoleto = (boletonum, price, clientid, userid, handler)=>{
    //Actividades a realizar,
    // 1) verificar que el boleto este disponible
    _self.isBoletoAvailable(boletonum,(err, doc)=>{
      if(err) return handler(err, null);
      if(!doc) return handler(new Error("Boleto no Disponible"),null);
      // 2) ver que el cliente no este registrado a otro boleto
      let clientID = new ObjectID(clientid);
      _self.boletoCll.findOne({"boletosoldto":clientID}, (err1, user)=>{
          if(err1) return handler(err, null);
          if(user) return handler(new Error("Cliente ya tiene registrado un boleto."),null);
          // 3) grabar el boleto
          let update = {"$set":{boletosold:true,
                                boletosoldby: new ObjectID(userid),
                                boletosoldto: clientID,
                                boletosoldprice: price,
                                boletosolddate: new Date()
                               }
                       };
          _self.boletoCll.updateOne({boletonum:boletonum}, update, {}, (err3, rslt)=>{
            if(err3) return handler(err, null);
            if(rslt.modifiedCount <= 0) return handler(new Error("No se actualizo boleto"), null);
            _self.userCll.updateOne(
              {_id:clientID},
              {"$set":{
                "boletoregistered":true,
                "boletotyp":doc.boletotyp,
                "boletonum":doc.boletonum,
                "boletoid":doc._id}
              },
              {},
              (err4,rslt2)=>{
                if(err4) console.log(err4);
              }
            );//updateOne;
            return handler(null, rslt.modifiedCount);
          });// update
      }); // find clienteID
    }); // isBoletoAvailable
  }// end checkoutBoleto

  this.getBoletosStats = (handler)=>{
    _self.boletoCll.aggregate([
        { $project : {
          boletotyp : 1,
          boletosold: 1
        }},
        { $match: {boletosold:true}},
        { $group : {
          _id : {boletotyp : "$boletotyp"},
          cantidad : { $sum : 1 }
        }}
      ], function(err, result) {
        console.log(result);
        /*
        [ { _id: { boletotyp: 'gold' }, cantidad: 300 },
        { _id: { boletotyp: 'silver' }, cantidad: 200 } ]
        */
        let goldcount = 0
        let silvercount = 0
        if(result.length){
          result.map((d,i)=>{
            if(d._id.boletotyp === 'gold'){
              goldcount += d.cantidad;
            }else{
              silvercount += d.cantidad;
            }
          });
        }
        return handler(null, {gold:goldcount,silver:silvercount});
    });



  }
} // boleto model

module.exports = (db) => {
  return new BoletoModel(db);
}
