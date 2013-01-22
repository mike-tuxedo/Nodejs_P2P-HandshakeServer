require('./array_prototype');
var mongodb = require('./mongodb');

var crypto = require('crypto');
var properties = require('./properties');
var publicDump = null;


// public methods

exports.handleUser = function(socket){

  mongodb.getDatabaseDump(function(dump){
  
    publicDump = dump;
    socket.roomHash = getUniqueRoomHash();
    socket.userHash = getUniqueUserHash(socket.roomHash);
    
    mongodb.insertRoom(socket.roomHash);
    mongodb.insertUser(socket.roomHash, socket.userHash);
    
  });
  
};



// private methods 

var getUniqueRoomHash = function(){
  var hash = null;
  
  do{
    hash = createHash();
  }while(isRoomHashInUse(hash));
  
  return hash;
};


var getUniqueUserHash = function(roomHash){
  var hash = null;
   
  do{
    hash = createHash();
  }while(isUserHashInUse(roomHash, hash));
  
  return hash;
};


var createHash = function(){
  var current_date = (new Date()).valueOf().toString();
  var random = Math.random().toString();
  return crypto.createHash('sha1').update(current_date + random).digest('hex');
};



var isRoomHashInUse = function(roomHash){
  return publicDump.containsObject({ hash: roomHash },'hash');
};


var isUserHashInUse = function(roomHash, userHash){
  var room = publicDump.getObject({ hash: roomHash});
  
  if(room && room.users)
    return (room.users.getObject({ id: userHash }) != -1);
  else
    false;
};

