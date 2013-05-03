// to send invitation-mails with
var invitationMailer = require('./mailer');

// to calculate hash for chatroom
var hashCrypto = require('crypto');

// contains all configuration-info of this project
var properties = require('./../properties');

// thread-pool that manage mongo-db queries
var helperThreads = require("backgrounder").spawn(__dirname + "/helper_thread.js"); // , { "children-count" : 5 }

// logging all send activities
var logger = require('./logger');

// to associate user-id's with user-connection-sockets
exports.clients = {};

// to make sure that a client can not update side repeatedly
var clientIps = [];


/* public methods */

exports.isValidOrigin = function(req){ // client must have got a certain domain in order to proceed
  
  if( !properties.productionMode ){ // activated in development-mode
    return true;
  }
  
  var clientDomain = req.upgradeReq.headers.origin;
  if(properties.allowedURLDomains.indexOf(clientDomain) !== -1){
    return true; 
  }
  else{
    return false;
  }
};

exports.doesClientIpExist = function(ip){

  if( !properties.productionMode ){ // activated in development-mode
    return false;
  }
  
  if(clientIps.indexOf(ip) !== -1){
    return true;
  }
  else{
    return false;
  }
};

exports.delayedIpJob = function(ip,time){
  setTimeout(function(){
    if(ip){
      takeOutIp( ip );
    }
  },time);
};

exports.setupClient = function(socket,clientUrl){ // user gets handled by whether they are hosts or guests 
 
  handleClient(
    clientUrl, 
    function(clientInfo){
      
      var timestamp = exports.formatTime(new Date().getTime());
      
      if( clientInfo.success ){ // true when user has created chatroom or enter already created chatroom
        
        socket['accepted'] = true;
        socket['roomHash'] = clientInfo.roomHash;
        socket['userHash'] = clientInfo.userHash;
        socket['clientIpAddress'] = socket._socket.remoteAddress;
        socket['mailSent'] = 0;
        
        exports.clients[clientInfo.userHash] = socket; // hold clients via hash value keys
        clientIps.push(socket._socket.remoteAddress); // remember ip-address so that user can not update side repeatedly
        
        if(isSocketConnectionAvailable(socket)){
          socket.send(JSON.stringify({ // server informs user about chatroom-hash and userID's
            subject: 'init',
            roomHash: clientInfo.roomHash, 
            userHash: clientInfo.userHash, 
            guestIds: clientInfo.guestIds 
          }));
        }
        
        logger.log('info', timestamp + ' send init');
        
        exports.informOtherClientsOfChatroom(clientInfo.roomHash, clientInfo.userHash, 'participant:join');

      }
      else{ // there was an error 
        socket.send(JSON.stringify({
          subject: 'init',
          error: clientInfo.error
        }));
        logger.error('warn', timestamp + ' room error ' + clientInfo.error);
        logger.error('warn', timestamp + ' send error');
      }
    }
  );
  
};

exports.passDescriptionMessagesOnToClient = function(message){

  helperThreads.send(
    { type: 'search-chatroom', hash: message.roomHash },
    function(rooms){ // check whether roomHash and User-ID's exist 
      
      var room = rooms[0];
      var socket = exports.clients[message.destinationHash];
      var timestamp = exports.formatTime(new Date().getTime());
      
      if( isSocketConnectionAvailable( socket ) && room && getObject(room.users, { id: message.userHash }) && getObject(room.users, { id: message.destinationHash }) ){
        
        var msg = {
          subject: (message.sdp ? 'sdp' : 'ice'),
          roomHash: message.roomHash, 
          userHash: message.userHash
        };
        
        if(message.sdp)
          msg['sdp'] = message.sdp;
        else  
          msg['ice'] = message.ice;
          
        socket.send(JSON.stringify(msg));
        
        logger.log('info', timestamp + (' send ' + (message.sdp ? 'sdp' : 'ice')) );
      }
    }
  );
  
};

exports.passMailInvitationOnToClient = function(message,socket){
  
  helperThreads.send(
    { type: 'search-chatroom', hash: message.roomHash },
    function(rooms){ // check whether roomHash and User-ID exist 
    
      var room = rooms[0];
      var timestamp = exports.formatTime(new Date().getTime());
      var maxNumberOfMails = properties.maxUserNumber + 4; // client can only sent as much as there are users in a chatroom plus 4
      
      if( room && doesArrayHashContain(room.users, message.userHash) && socket['mailSent'] < maxNumberOfMails ){
        
        socket['mailSent']++;
        
        invitationMailer.sendMail({ 
          from: message.mail.from, 
          to: message.mail.to, 
          subject: message.mail.subject, 
          text: message.mail.text, 
          html: message.mail.html 
        });
        
        logger.log('info', timestamp + ' send '+message.subject);
        
      }
      else{
        logger.log('info', timestamp + ' mail not sent: maxMailNumber exhausted');
      }
      
    }
  );

};

exports.passPhotoOnToClient = function(message){

  helperThreads.send(
    { type: 'search-chatroom', hash: message.roomHash },
    function(rooms){ // check whether roomHash
    
      var room = rooms[0];
      var timestamp = exports.formatTime(new Date().getTime());
      var socket = exports.clients[message.destinationHash];
      
      if( isSocketConnectionAvailable(socket) && doesArrayHashContain(room.users, message.userHash) ){
        
        socket.send(JSON.stringify({ // server informs user about chatroom-hash and userID's
          subject: 'participant:photo',
          roomHash: message.roomHash, 
          userHash: message.userHash,
          photoData: message.photoData
        }));
        
        logger.log('info', timestamp + ' send participant:photo');
      }
      
  });
  
};

exports.passKickMessagesOnToClient = function(message,hostIp){
  
  helperThreads.send(
    { type: 'search-chatroom', hash: message.roomHash },
    function(rooms){ // check whether roomHash
      
      var room = rooms[0];
      var timestamp = exports.formatTime(new Date().getTime());
      var hostSocket = exports.clients[room.users[0].id]; // first element is always host
      var kickedSocket = exports.clients[message.destinationHash];
      
      if( isSocketConnectionAvailable(kickedSocket) && doesArrayHashContain(room.users, message.userHash) && hostSocket['clientIpAddress'] === hostIp ){
        
        kickedSocket.send(JSON.stringify({ // server informs user about chatroom-hash and userID's
          subject: 'close',
          roomHash: message.roomHash, 
          userHash: message.userHash
        }));
          
        logger.log('info', timestamp + ' send close');
      }
    }
  );
  
};

// inform other clients that a new user has entered or left chatroom
exports.informOtherClientsOfChatroom = function(roomHash, userHash, subject){ 
  helperThreads.send(
    { type: 'get-users', roomHash: roomHash }, 
    function(users){
      
      var timestamp = exports.formatTime(new Date().getTime());
      
      for(var u=0; u < users.length; u++){
        
        var userId = users[u].id;
        
        if( userId != userHash && isSocketConnectionAvailable( exports.clients[userId] ) ){ // socket must be open to receive message
          
          exports.clients[userId].send(JSON.stringify({
            subject : subject,
            roomHash : roomHash,
            userHash : userHash
          }));
          
        }
      }
      
      if(users.length > 1){
        logger.log('info', timestamp + (' send participant ' + subject) );
      }
    }
  );
};

exports.deleteUserFromDatabase = function(roomHash, userHash){
  if(roomHash && userHash){
    helperThreads.send({ type: 'delete-users', roomHash: roomHash, userHash: userHash });
  }
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
  
  if( identifyAsHostUrl(clientURL) ){ // is host
    handleHost(clientURL, callback);
  }
  else if( getHashFromClientURL(clientURL, '/room/').length === 40 ){ // is guest
    handleGuest(clientURL, callback);
  }
  else{ // is neither host nor guest so inform client about that
    handleOutsider(callback);
  }
  
};

var handleHost = function(clientURL, callback){
  
  var infoForClient = {};
  
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
  
};

var handleGuest = function(clientURL, callback){
  
  var infoForClient = {};
  
  helperThreads.send({ type: 'search-chatroom', hash: getHashFromClientURL(clientURL, '/room/') },function(rooms){
      
    var room = null;
    
    if( typeof rooms === 'undefined' ){
      logger.log('warn', timestamp + ' room is not found');
      return;
    }
    else{
      room = (typeof rooms[0] !== 'undefined') ? rooms[0] : [];
    }
    
    // when room has already got {maxUserNumber}-people then return error message: room:full
    // in development-mode {maxUserNumber}-people is omitted
    if( room.users && room.users.length >= properties.maxUserNumber && properties.productionMode ){ 
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
  
};

var handleOutsider = function(callback){
  var infoForClient = {};
  infoForClient.success = false;
  infoForClient.error = "room:unknown";
  callback(infoForClient);
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
  var lastSigns = '/rooms';
  return url.slice(url.length-lastSigns.length,url.length) === lastSigns;
};

var doesArrayHashContain = function(array,hash){
  return getObject(array, { id: hash });
};

// searches in originalObject that must be an Object
// and searches for searchObject like { hash: '...' }
var getObject = function(originalObject, searchObject){
  for(var prop in originalObject){
    for(var innerProp in originalObject[prop])
        if(originalObject[prop][innerProp] === searchObject[innerProp])
            return originalObject[prop];
  }
  return null;
};


// test methods 
exports.test = {};
exports.test.getHashFromClientURL = getHashFromClientURL;
exports.test.handleClient = handleClient;
