const bcrypt = require('bcrypt-nodejs');
const ObjectID = require('mongodb').ObjectID;
const { validateEmail,isEmpty }  = require('../utilities/validators.js');
const moment = require('moment');


function AgendaModel(db){
  this.agendaCll = db.collection('agenda');
  this.usersCll = db.collection('users');
  let _self = this;

  this.reservaCupo = (userID, acode, handler)=>{
    console.log(userID,acode);
    this.agendaCll.findOne({"acode":acode}, (err,agd)=>{

      if(err) return handler(new Error("Error al buscar agenda"), null);
      if(!agd) return handler(new Error("Error al buscar agenda"), null);
      if((agd.cpr+1) > agd.cpo) return handler(new Error("No Hay mas Cupo"), null);
      let ud = {"$inc":{cpr:1}};
      _self.agendaCll.updateOne({_id:new ObjectID(agd._id)}, ud);
      let us = {"$addToSet":{"agenda":agd.acode}};
      _self.usersCll.updateOne({_id:new ObjectID(userID)}, us);
      return handler(null,true);
    }); //findOne
  }

  this.quitarCupo = (userID, acode,handler)=>{
    this.agendaCll.findOne({acode:acode}, (err,agd)=>{
      if(err) return handler(new Error("Error al buscar agenda"), null);
      if(!agd) return handler(new Error("Error al buscar agenda"), null);
      let ud = {"$inc":{cpr:-1}};
      _self.agendaCll.updateOne({_id:new ObjectID(agd._id)}, ud);
      let us = {"$pull":{"agenda":agd.acode}};
      _self.usersCll.updateOne({_id:new ObjectID(userID)}, us);
      return handler(null,true);
    }); //findOne
  }

  this.obtenerAgenda = (type, userSel,handler)=>{
    userSel = userSel || [];
    let aggre = [
      {$project:{
        acode:1,
        ini:1,
        end:1,
        who:1,
        dsc:1,
        ctx:1,
        plc:1,
        cpo:1,
        cpr:1,
        grp:1,
        full: {$lt:["$cpr","$cpo"] },
        isConferencia:{$eq:["$ctx","Conferencia"]}
      }},
      {$match: {
        full:true,
        acode:{$regex:(type=="gold")?'g':'s'}
      }
      }
    ];

    this.agendaCll.aggregate(aggre, function(err, docs){
      var docs2 = docs.map((o,i)=>{
        o.hini = moment(o.ini).format('HH:mm');
        o.ini = moment(o.ini).format('D-MMM-YYYY');
        o.hend = moment(o.end).format('HH:mm');
        o.end = moment(o.end).format('D-MMM-YYYY');
        var select = userSel.find((ob,j)=>{return ob == o.acode});
        o.selected =  (select && true);
        return o;
      });
      handler(err,docs2)
    });
  }

} //AgendaModel

module.exports = (db) => {
  return new AgendaModel(db);
}
