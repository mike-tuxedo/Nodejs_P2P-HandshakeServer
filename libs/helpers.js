// to send invitation-mails with
var invitationMailer = require('./mailer');

// to calculate hash for chatroom
var hashCrypto = require('crypto');

// contains all configuration-info of this project
var properties = require('./../properties');

// thread-pool that manage mongo-db queries
var helperThreads = require("backgrounder").spawn(__dirname + "/helper_thread.js"); // , { "children-count" : 5 }

// logging all send activities
var productionLogger = require('./logger').production;

// to associate user-id's with user-connection-sockets
exports.clients = {};

// to make sure that a client can not update side over and over again
var clientIps = [];


/* public methods */

exports.isValidOrigin = function(req){ // client must have got a certain domain in order to proceed
  if(req.upgradeReq.headers.origin === properties.clientBrowserLocation)
    return true;
  else
    return false;
};

exports.doesClientIpExist = function(ip){
  for(var c=0; c < clientIps.length; c++){
    var clientIp = clientIps[c];
    if( ip === clientIp ){
      return true;
    }
  }
  return false;
};

exports.delayedIpJob = function(time,ip){
  setTimeout(function(){
    takeOutIp( ip );
  },time);
};

exports.setupNewUser = function(socket,clientUrl){ // user gets handled by whether they are hosts or guests 
 
  handleClient(
    clientUrl, 
    function(clientInfo){
      
      var timestamp = exports.formatTime(new Date().getTime());
      
      if( clientInfo.success ){ // if true user can build chatroom or enter already created chatroom
        
        socket['roomHash'] = clientInfo.roomHash;
        socket['clientIpAddress'] = socket._socket.remoteAddress;
        exports.clients[clientInfo.userHash] = socket;
        clientIps.push(socket._socket.remoteAddress);
        
        if(isSocketConnectionAvailable(socket)){
          socket.send(JSON.stringify({ // server informs user about chatroom-hash and userID's
            subject: 'init',
            chatroomHash: clientInfo.roomHash, 
            userHash: clientInfo.userHash, 
            guestIds: clientInfo.guestIds 
          }));
        }
        
        productionLogger.log('info', timestamp + ' send init');
        
        exports.informOtherClientsOfChatroom(clientInfo.roomHash, clientInfo.userHash, 'participant-join');

      }
      else{
        socket.send(JSON.stringify({
          subject: 'init',
          error: clientInfo.error
        }));
        
        productionLogger.error('error', timestamp + ' room error ' + clientInfo.error);
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
      var timestamp = exports.formatTime(new Date().getTime());
      
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
        
        productionLogger.log('info', timestamp + (' send ' + (message.sdp ? 'sdp' : 'ice')) );
      }
    }
  );
  
};

exports.passMailInvitationOnToClient = function(message){
  
  helperThreads.send(
    { type: 'search-chatroom', hash: message.chatroomHash },
    function(rooms){ // check whether chatroomHash and User-ID exist 
      var room = rooms[0];
      var timestamp = exports.formatTime(new Date().getTime());
      
      if( room && room.hash == message.chatroomHash && getObject(room.users, { id: message.userHash }) ){
        invitationMailer.sendMail({ 
          from: message.from, 
          to: message.to, 
          subject: message.subject, 
          text: message.text, 
          html: message.html 
        });
        productionLogger.log('info', timestamp + ' send mail');
      }
    }
  );

};

// inform other clients that a new user has entered chatroom
exports.informOtherClientsOfChatroom = function(roomHash, userHash, subject){ 
  helperThreads.send(
    { type: 'get-users', roomHash: roomHash }, 
    function(users){
      
      var timestamp = exports.formatTime(new Date().getTime());
      
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
      
      if(users.length > 1){
        productionLogger.log('info', timestamp + (' send participant ' + subject) );
      }
    }
  );
};

exports.deleteUserFromDatabase = function(roomHash, userHash){
  helperThreads.send({ type: 'delete-users', roomHash: roomHash, userHash: userHash });
};


exports.formatTime = function(timestamp) {
  var dateTime = new Date(timestamp);
  var hours = dateTime.getHours();
  var minutes = dateTime.getMinutes();
  var seconds = dateTime.getSeconds();
  var miliseconds = dateTime.getMilliseconds();

  hours = hours < 10 ? '0' + hours : hours;
  minutes = minutes < 10 ? '0' + minutes : minutes;
  seconds = seconds < 10 ? '0' + seconds : seconds;

  if (miliseconds < 10) {
    miliseconds = "000" + miliseconds;
  } else if (miliseconds < 100) {
    miliseconds = "00" + miliseconds;
  } else if (miliseconds < 1000) {
    miliseconds = "0" + miliseconds;
  }

  return hours + ":" + minutes + ":" + seconds + ":" + miliseconds;
};


/* private methods */

var isSocketConnectionAvailable = function(socket){
  return socket && socket.readyState == 1;
};

var handleClient = function(clientURL, callback){

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
  
};

var deleteChatroomFormDatabase = function(roomHash){
  helperThreads.send({ type: 'delete-room', roomHash: roomHash });
};

var takeOutIp = function(ip){
  if( clientIps.indexOf(ip) !== -1 ){
    clientIps.splice(clientIps.indexOf(ip),1);
  }
};

var getUniqueRoomHash = function(callback){
  var hash = null;
  
  var tryToGetHash = function(){
  
    hash = createHash();
    helperThreads.send({ type: 'search-chatroom', hash: hash },function(rooms){
      if(rooms && rooms.length == 0) // there is no chatroom with recently calculated hash
        callback(hash);
      else
        tryToGetHash();
    });
    
  };
  tryToGetHash();
  
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
