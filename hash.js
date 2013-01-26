require('./array_prototype');
var mongodb = require('./mongodb');

var hashCrypto = require('crypto');
var properties = require('./properties');


// public methods
exports.handleClient = function(clientURL, callback){

  try{
  
    var infoForClient = {}; // this object gets ent back to the client and contains { chatroomhash: '...', userID's: [{ id: '...'},...] }
    
    if( getHashFromClientURL(clientURL) == '#' ){ // is host
      
      mongodb.searchForChatroomEntry({},function(dump){ 
        
        infoForClient.roomHash = getUniqueRoomHash(dump);
        infoForClient.userHash = getUniqueUserHash(dump);
        infoForClient.guestIds = [];
        
        mongodb.insertRoom(infoForClient.roomHash);
        mongodb.insertUser(infoForClient.roomHash, infoForClient.userHash);
        
        infoForClient.success = true;
        callback(infoForClient);
      
      });
    }
    else if( getHashFromClientURL(clientURL).length == 40 ){ // is guest with hash that has got 40 signs
      
      mongodb.searchForChatroomEntry({ hash: getHashFromClientURL(clientURL) },function(room){
        
        infoForClient.roomHash = room[0].hash;
        infoForClient.userHash = getUniqueUserHash(room);
        infoForClient.guestIds = room.getObject({ hash: infoForClient.roomHash}).users;
        
        if(infoForClient.guestIds.length >= 6){ // when room has already got 6 people then return error message
          infoForClient.success = false;
          infoForClient.error = "chatroom fully occupied";
        }
        else{
          mongodb.insertUser(infoForClient.roomHash, infoForClient.userHash);
          infoForClient.success = true;
        }
        
        callback(infoForClient);
      });
    }
    
  }
  catch(e){
    console.log('error happend:',e);
  }
};

// private methods 
var getUniqueRoomHash = function(roomObject){
  var hash = null;
  
  do{
    hash = createHash();
  }while(isRoomHashInUse(roomObject,hash));
  
  return hash;
};

var getUniqueUserHash = function(roomObject){
  var hash = null;
  
  do{
    hash = createHash();
  }while(isUserHashInUse(roomObject, hash));
  
  return hash;
};

var createHash = function(){
  var current_date = (new Date()).valueOf().toString();
  var random = Math.random().toString();
  return hashCrypto.createHash('sha1').update(current_date + random).digest('hex');
};

var isRoomHashInUse = function(roomObject,roomHash){
  return roomObject.containsObject({ hash: roomHash },'hash');
};

var isUserHashInUse = function(roomObject, roomHash, userHash){
  var room = roomObject.getObject({ hash: roomHash});
  
  if(room && room.users){
    return room.users.getObject({ id: userHash });
  }
  else{
    false;
  }
};

var getHashFromClientURL = function(url){
  return url.slice( (url.lastIndexOf('/') + 1), url.length); // returns # if host otherwise 5as6da9s1dsd9ds1d3a4d9sfe6eas4 if client
};