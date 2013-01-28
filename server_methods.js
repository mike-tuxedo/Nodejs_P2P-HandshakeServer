// database: chatroom and user handling
var hash = require('./hash');
var mongodb = require('mongodb').MongoClient;

var properties = require('./properties');


// to associate user-id's with user-connection's
exports.clients = {};

exports.isValidOrigin = function(req){ // client must have got a certain domain in order to proceed
  if(req.upgradeReq.headers.origin == properties.phovecUrl)
    return true;
  else
    return false;
};

exports.isRegisterMessage = function(msg){
  return msg.init;
};

exports.isSessionDescription = function(msg){
  return msg.sdp || msg.ice;
};

exports.isMailInvitation = function(msg){
  return msg.mail;
};

exports.setupNewUser = function(socket,clientUrl){ // user gets handled by whether they are hosts or guests 
 
  hash.handleClient(
    clientUrl, 
    function(clientInfo){
    
      if( clientInfo.success ){ // if true user can build chatroom or enter already created chatroom
        
        exports.clients[clientInfo.userHash] = socket;
        
        socket.send(JSON.stringify({ // server informs user about chatroom-hash and userID's
          init: true, 
          chatroom: clientInfo.roomHash, 
          userID: clientInfo.userHash, 
          guestIds: clientInfo.guestIds 
        }));
        
      }
      else
        socket.send(JSON.stringify(clientInfo));
    }
  );
  
};

exports.trace = function(msg){
  console.log("At " + new Date().toString() );
  console.log(msg);
  console.log("---------------------------------------------------------------");
};
