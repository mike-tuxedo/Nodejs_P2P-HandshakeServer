﻿// database: chatroom and user handling
var hash = require('./hash');
var properties = require('./properties');

exports.isValidOrigin = function(req){ // client must have got a certain domain in order to proceed
  if(req.upgradeReq.headers.origin == properties.phovecUrl)
    return true;
  else
    return false;
};


exports.isRegisterMessage = function(msg){
  return msg.init;
};
 
exports.setupNewUser = function(socket,clientUrl){ // user gets handled by whether they are hosts or guests 
 
  hash.handleClient(
    clientUrl, 
    function(clientInfo){
    
      if( clientInfo.success ){ // if true user can build chatroom or enter already created chatroom
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