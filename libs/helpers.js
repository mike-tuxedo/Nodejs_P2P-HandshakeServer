require('./advanced_array');

// database: chatroom and user handling
var hashCrypto = require('crypto');
var mongodb = require('./../db/mongodb');

var invitationMailer = require('./mailer');

var properties = require('./../properties');


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
 
  handleClient(
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


// private methods 
var handleClient = function(clientURL, callback){

  try{
  
    var infoForClient = {}; // this object gets ent back to the client and contains { chatroomhash: '...', userID's: [{ id: '...'},...] }
    
    if( clientURL[clientURL.length-1] == '#' ){ // is host
     
      getUniqueRoomHash(function(roomHash){
        
        infoForClient.roomHash = roomHash;
        
        infoForClient.userHash = getUniqueUserHash([]);
        infoForClient.guestIds = [];
        
        mongodb.insertRoom(infoForClient.roomHash);
        mongodb.insertUser(infoForClient.roomHash, infoForClient.userHash);
        
        infoForClient.success = true;
        callback(infoForClient);
        
      });
        
    }
    else if( getHashFromClientURL(clientURL, '#').length == 40 ){ // is guest with hash that has got 40 signs
      
      mongodb.searchForChatroomEntry({ hash: getHashFromClientURL(clientURL, '#') },function(room){
        
        if(room.length == 0)
          return;
          
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

var getUniqueRoomHash = function(callback){
  var hash = null;
  
  var retryToGetHash = function(){
  
    hash = createHash();
    mongodb.searchForChatroomEntry({ hash: hash },function(rooms){
      if(rooms.length == 0)
        callback(hash);
      else
        retryToGetHash();
    });
    
  };
  retryToGetHash();
  
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

var getHashFromClientURL = function(url, signToStartAt){
  return url.slice( (url.lastIndexOf(signToStartAt) + 1), url.length); // returns # if host otherwise 5as6da9s1dsd9ds1d3a4d9sfe6eas4 if client
};
