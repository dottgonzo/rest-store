import store = require("../index");


let Store=new store("ll")

let obj = {
    rr: "dd"
};

Store.save(obj).then(function(){

}).catch(function(){

});

Store.where("data",453754766).then(function(){

}).catch(function(){

});