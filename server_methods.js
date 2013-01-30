require('./array_prototype');

// database: chatroom and user handling
var hash = require('./hash');
var mongodb = require('./mongodb');

var invitationMailer = require('./mailer');

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

exports.passDescriptionMessagesOnToClient = function(message){

  mongodb.searchForChatroomEntry(
    { hash: message.chatroomHash },
    function(rooms){ // check whether chatroomHash and User-ID's exist 
      var room = rooms[0];
      var socket = exports.clients[message.destinationHash];
      
      if( exports.isSocketConnectionAvailable( socket ) && room.users.getObject({ id: message.userHash }) && room.users.getObject({ id: message.destinationHash }) ){
        
        var msg = {
          subject: (message.sdp ? 'sdp' : 'ice'),
          chatroomHash: message.chatroomHash, 
          userHash: message.userHash
        };
        
        if(message.sdp)
          msg['sdp'] = message.sdp;
        else  
          msg['ice'] = message.ice;
          
        socket.send(JSON.stringify(msg));
      }
    }
  );
  
};

exports.passMailInvitationOnToClient = function(message){
  
  mongodb.searchForChatroomEntry(
    { hash: message.chatroomHash },
    function(rooms){ // check whether chatroomHash and User-ID exist 
      var room = rooms[0];
      
      if( room && room.hash == message.chatroomHash && room.users.getObject({ id: message.userHash }) ){
        invitationMailer.sendMail({ 
          from: message.from, 
          to: message.to, 
          subject: message.subject, 
          text: message.text, 
          html: message.html 
        });
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
        
        if( exports.isSocketConnectionAvailable( exports.clients[userId] ) ){ // socket must be open to receive message
          exports.clients[userId].send(JSON.stringify({
            subject: subject, 
            chatroomHash: roomHash, 
            newUserHash: newUserHash
          }));
        }
      }
    }
  );
};

exports.isSocketConnectionAvailable = function(socket){
  return socket && socket.readyState == 1;
};

exports.trace = function(msg,obj){
  console.log("At " + new Date().toString() );
  console.log(msg,obj);
  console.log("---------------------------------------------------------------");
};

