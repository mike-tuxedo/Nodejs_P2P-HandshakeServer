// to send invitation-mails with
var invitationMailer = require('./mailer');

// to calculate hash for chatroom
var hashCrypto = require('crypto');

// contains all configuration-info of this project
var properties = require('./../properties');

// thread-pool that manage mongo-db queries
var helperThreads = require("backgrounder").spawn(__dirname + "/helper_thread.js"); // , { "children-count" : 5 }

// to associate user-id's with user-connection-sockets
exports.clients = {};



/* public methods */

exports.isValidOrigin = function(req){ // client must have got a certain domain in order to proceed
  if(req.upgradeReq.headers.origin === properties.clientBrowserLocation)
    return true;
  else
    return false;
};

exports.setupNewUser = function(socket,clientUrl){ // user gets handled by whether they are hosts or guests 
 
  handleClient(
    clientUrl, 
    function(clientInfo){
      
      if( clientInfo.success ){ // if true user can build chatroom or enter already created chatroom
        
        socket['roomHash'] = clientInfo.roomHash;
        exports.clients[clientInfo.userHash] = socket;
        
        if(isSocketConnectionAvailable(socket)){
          socket.send(JSON.stringify({ // server informs user about chatroom-hash and userID's
            subject: 'init',
            chatroomHash: clientInfo.roomHash, 
            userHash: clientInfo.userHash, 
            guestIds: clientInfo.guestIds 
          }));
        }
        
        exports.informOtherClientsOfChatroom(clientInfo.roomHash, clientInfo.userHash, 'participant-join');
        console.log('after exports.informOtherClientsOfChatroom');
      }
      else{
        socket.send(JSON.stringify({
          subject: 'init',
          error: clientInfo.error
        }));
      }
    }
  );
  
};

exports.passDescriptionMessagesOnToClient = function(message){

  helperThreads.send(
    { type: 'search-chatroom', hash: message.chatroomHash },
    function(rooms){ // check whether chatroomHash and User-ID's exist 
      var room = rooms[0];
      var socket = exports.clients[message.destinationHash];
      
      if( isSocketConnectionAvailable( socket ) && getObject(room.users, { id: message.userHash }) && getObject(room.users, { id: message.destinationHash }) ){
        
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
  
  helperThreads.send(
    { type: 'search-chatroom', hash: message.chatroomHash },
    function(rooms){ // check whether chatroomHash and User-ID exist 
      var room = rooms[0];
      
      if( room && room.hash == message.chatroomHash && getObject(room.users, { id: message.userHash }) ){
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
exports.informOtherClientsOfChatroom = function(roomHash, userHash, subject){ 
  helperThreads.send(
    { type: 'get-users', roomHash: roomHash }, 
    function(users){
      console.log('widthin exports.informOtherClientsOfChatroom',users);
      for(var u=0; u < users.length; u++){
        
        var userId = users[u].id;
        
        if( userId != userHash && isSocketConnectionAvailable( exports.clients[userId] ) ){ // socket must be open to receive message
          exports.clients[userId].send(JSON.stringify({
            subject: subject, 
            chatroomHash: roomHash, 
            userHash: userHash
          }));
        }
      }
    }
  );
};

exports.deleteUserFromDatabase = function(roomHash, userHash){
  helperThreads.send({ type: 'delete-users', roomHash: roomHash, userHash: userHash });
};



/* private methods */

var isSocketConnectionAvailable = function(socket){
  return socket && socket.readyState == 1;
};

var handleClient = function(clientURL, callback){

  try{
    
    var infoForClient = {};
    
    if( identifyAsHostUrl(clientURL) ){ // is host when url has got this '#/room' at the end
      
      getUniqueRoomHash(function(roomHash){
        
        infoForClient.roomHash = roomHash;
        
        infoForClient.userHash = getUniqueUserHash([]);
        infoForClient.guestIds = [];
        
        helperThreads.send({ type: 'insert-room', roomHash: infoForClient.roomHash },function(){
          
          helperThreads.send({ type: 'insert-user', roomHash: infoForClient.roomHash, userHash: infoForClient.userHash },function(){
            
            infoForClient.success = true;
            callback(infoForClient);
          
          });
          
        });
        
      });
      
    }
    else if( getHashFromClientURL(clientURL, '#/room/').length === 40 ){ // is guest with hash that has got 40 signs
      
      helperThreads.send({ type: 'search-chatroom', hash: getHashFromClientURL(clientURL, '#/room/') },function(rooms){
        
        var room = null;
        
        if( typeof rooms === 'undefined' ){
          console.log('room is not found',rooms);
          return;
        }
        else{
          room = (typeof rooms[0] !== 'undefined') ? rooms[0] : [];
        }
        
        if( room.users && room.users.length >= properties.maxUserNumber ){ // when room has already got 6 people then return error message
          infoForClient.success = false;
          infoForClient.error = "room:full";
          callback(infoForClient);
        }
        else if(room && room.length === 0){ // room is not in db anymore
        console.log('rooms',rooms);
          infoForClient.success = false;
          infoForClient.error = "room:unknown";
          callback(infoForClient);
        }
        else{
          
          infoForClient.roomHash = room.hash;
        
          infoForClient.userHash = getUniqueUserHash(room);
          infoForClient.guestIds = room.users;
          
          helperThreads.send({ type: 'insert-user', roomHash: infoForClient.roomHash, userHash: infoForClient.userHash },function(){
            infoForClient.success = true;
            callback(infoForClient);
          });
        }
        
      });      
    }
    
  }
  catch(e){
    console.log('error happend:',e);
  }
  
};

var deleteChatroomFormDatabase = function(roomHash){
  helperThreads.send({ type: 'delete-room', roomHash: roomHash });
};

var getUniqueRoomHash = function(callback){
  var hash = null;
  
  var retryToGetHash = function(){
  
    hash = createHash();
    helperThreads.send({ type: 'search-chatroom', hash: hash },function(rooms){
      if(rooms && rooms.length == 0) // there is no chatroom with recently calculated hash
        callback(hash);
      else
        retryToGetHash();
    });
    
  };
  retryToGetHash();
  
};

var getUniqueUserHash = function(roomObject){
  var userHash = null;
  
  do{
    userHash = createHash();
  }while(isUserHashInUse(roomObject, roomObject.hash, userHash));
  
  return userHash;
};

var createHash = function(){
  var current_date = (new Date()).valueOf().toString();
  var random = Math.random().toString();
  return hashCrypto.createHash('sha1').update(current_date + random).digest('hex');
};

var isUserHashInUse = function(roomObject, roomHash, userHash){
  var room = getObject(roomObject, { hash: roomHash});
  
  if(room && room.users){
    return getObject(room.users, { id: userHash });
  }
  else{
    false;
  }
};

var getHashFromClientURL = function(url, signToStartAt){
  return url.slice( (url.lastIndexOf(signToStartAt) + signToStartAt.length), url.length); // returns # if host otherwise 5as6da9s1dsd9ds1d3a4d9sfe6eas4 if client
};

var identifyAsHostUrl = function(url){
  return url.slice(url.length-6,url.length) === '#/room';
};

// searches in originalObject that must be an Object
// and searches for searchObject like { hash: '...' }
var getObject = function(originalObject, searchObject){
  for(var prop in originalObject){
    for(var innerProp in originalObject[prop])
        if(originalObject[prop][innerProp] == searchObject[innerProp])
            return originalObject[prop];
  }
  return null;
};


// test methods 
exports.test = {};
exports.test.getHashFromClientURL = getHashFromClientURL;
exports.test.handleClient = handleClient;
