require('./array_prototype');
var mongodb = require('./mongodb');

var crypto = require('crypto');
var properties = require('./properties');
var publicDump = null;


// public methods

exports.handleUser = function(clientURL,callback){

  mongodb.getDatabaseDump(function(dump){
  
    publicDump = dump;
    var infoForClient = {}; // this object gets ent back to the client and contains { chatroomhash: '...', userID: '...', numberOfGuests: Number }
    
    if( getHashFromClientURL(clientURL) == '#' ){ // is host
      infoForClient.roomHash = getUniqueRoomHash();
      infoForClient.userHash = getUniqueUserHash(infoForClient.roomHash);
      infoForClient.numberOfGuests = 0;
      mongodb.insertRoom(infoForClient.roomHash);
      mongodb.insertUser(infoForClient.roomHash, infoForClient.userHash);
    }
    else{ // is guest
      var guestHash = getHashFromClientURL(clientURL);
      infoForClient.roomHash = guestHash;
      infoForClient.userHash = getUniqueUserHash(infoForClient.roomHash);
      infoForClient.numberOfGuests = publicDump.getObject({ hash: guestHash}).users.length;
      mongodb.insertUser(guestHash, infoForClient.userHash);
    }
    
    callback(infoForClient);
    
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
  
  if(room && room.users){
    return room.users.getObject({ id: userHash });
  }
  else
    false;
};


var getHashFromClientURL = function(url){
  return url.slice( (url.lastIndexOf('/') + 1), url.length); // returns # if host otherwise 5as6da9s1dsd9ds1d3a4d9sfe6eas4 if client
};
