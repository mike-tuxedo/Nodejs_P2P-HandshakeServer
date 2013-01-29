// database: chatroom and user handling
var hash = require('./hash');
var mongodb = require('./mongodb');

var properties = require('./properties');


// to associate user-id's with user-connection's
exports.clients = {};

//public methods

exports.isValidOrigin = function(req){ // client must have got a certain domain in order to proceed
  if(req.upgradeReq.headers.origin == properties.phovecUrl)
    return true;
  else
    return false;
};

exports.setupNewUser = function(socket,clientUrl){ // user gets handled by whether they are hosts or guests 
 
  hash.handleClient(
    clientUrl, 
    function(clientInfo){
      exports.trace('clientInfo: ', clientInfo);
      if( clientInfo.success ){ // if true user can build chatroom or enter already created chatroom
        
        exports.clients[clientInfo.userHash] = socket;
        
        socket.send(JSON.stringify({ // server informs user about chatroom-hash and userID's
          subject: 'init',
          chatroomHash: clientInfo.roomHash, 
          userHash: clientInfo.userHash, 
          guestIds: clientInfo.guestIds 
        }));
        
        exports.informOtherClientsOfChatroom(clientInfo.roomHash, clientInfo.userHash, 'participant-join');
        
      }
      else{
        socket.send(JSON.stringify({
          subject: 'init',
          chatroomHash: clientInfo.roomHash, 
          userHash: clientInfo.userHash, 
          guestIds: clientInfo.guestIds,
          error: clientInfo.error
        }));
      }
    }
  );
  
};

// inform other clients that a new user has entered chatroom
exports.informOtherClientsOfChatroom = function(roomHash, newUserHash, subject){ 
  mongodb.getOtherUsersOfChatroom(
    roomHash, 
    function(users){
      for(var u=0; u < users.length; u++){
        var userId = users[u].id;
        exports.clients[userId].send(JSON.stringify({
          subject: subject, 
          chatroomHash: roomHash, 
          newUserHash: newUserHash
        }));
      }
    }
  );
};

exports.trace = function(msg,obj){
  console.log("At " + new Date().toString() );
  console.log(msg,obj);
  console.log("---------------------------------------------------------------");
};

