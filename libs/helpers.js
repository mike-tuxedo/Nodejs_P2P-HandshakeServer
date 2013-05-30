// to send invitation-mails with
var invitationMailer = require('./mailer');

// to calculate hash for chatroom
var hashCrypto = require('crypto');

// contains all configuration-info of this project
var properties = require('./../properties');

// thread-pool that manage mongo-db queries
var helperThreads = require("backgrounder").spawn(__dirname + "/helper_thread.js"); // , { "children-count" : 5 }

// find out location of clients through their ip-address
var geocoder = require('geotools');

// logging all send activities
var logger = require('./logger');

// to associate user-id's with user-connection-sockets
exports.clients = {};


/* public methods */

exports.isValidOrigin = function(req){ // client must have got a certain domain in order to be proceed
  
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

exports.handleNewClient = function(socket,clientUrl){ // user gets handled by whether they are hosts or guests 
  
  handleClient( // find out whether it is a host, guest or another extraordinary user
    socket,
    clientUrl,
    function(clientInfo){
      
      var timestamp = exports.formatTime(new Date().getTime());
      
      if( clientInfo.success ){ // true when user has created chatroom or entered already created chatroom
        
        socket['accepted'] = true;
        socket['roomHash'] = clientInfo.roomHash;
        socket['userHash'] = clientInfo.userHash;
        socket['clientIpAddress'] = socket._socket.remoteAddress;
        socket['mailSent'] = 0;
        
        exports.clients[clientInfo.userHash] = socket; // hold clients via hash value keys
        exports.clients[clientInfo.userHash].readyForInfoMsg = false; // don't send participant:join when user is not ready, user is ready when they send init:user
        
        registerNewClient(socket,clientInfo); // insert new user into db
      }
      else{ // there was an error while processing an init:room-message
        socket.send(JSON.stringify({
          subject: 'init',
          error: clientInfo.error
        }));
        logger.error('warn', timestamp + ' send room error ' + clientInfo.error);
      }
    }
  );
  
};

exports.passDescriptionMessagesOnToClient = function(message){

  helperThreads.send(
    { type: 'search-chatroom', hash: message.roomHash },
    function(rooms){
      
      var room = rooms[0];
      var socket = exports.clients[message.destinationHash];
      var timestamp = exports.formatTime(new Date().getTime());
      
      if( isSocketConnectionAvailable( socket ) && room && getObject(room.users, { id: message.userHash }) && getObject(room.users, { id: message.destinationHash }) ){
        
        var msg = {
          subject: (message.sdp ? 'sdp' : 'ice'),
          roomHash: message.roomHash, 
          userHash: message.userHash
        };
        
        if(message.sdp){
          msg['sdp'] = message.sdp;
        }
        else {
          msg['ice'] = message.ice;
        }
        
        socket.send(JSON.stringify(msg));
        
        logger.log('info', timestamp + (' send ' + (message.sdp ? 'sdp' : 'ice')) );
      }
    }
  );
  
};

exports.passMailInvitationOnToClient = function(message,socket){
  
  if(message && message.roomHash){
  
    helperThreads.send(
      { type: 'search-chatroom', hash: message.roomHash },
      function(rooms){
      
        var room = rooms[0];
        var timestamp = exports.formatTime(new Date().getTime());
        var maxNumberOfMails = properties.maxUserNumber + 4; // client can only sent as much as max-user-number of a room is plus 4
        
        if( room && room.users && doesArrayHashContain(room.users, message.userHash) && socket['mailSent'] < maxNumberOfMails ){
          
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
  
  }
};

exports.editClient = function(message){
  
  if(message && message.roomHash){
  
    helperThreads.send(
      { type: 'search-chatroom', hash: message.roomHash },
      function(rooms){
        
        var room = rooms[0];
        var timestamp = exports.formatTime(new Date().getTime());
        
        if( room && room.users && doesArrayHashContain(room.users, message.userHash) ){
          
          var editUser = null;
          room.users.forEach(function(user){
            if(user.id === message.userHash){
              editUser = user;
            }
          });
          
          if(editUser){
          
            helperThreads.send({ type: 'edit-user', roomHash: message.roomHash, userHash: message.userHash, name: message.put.name },function(){
              
              exports.clients[message.userHash].readyForInfoMsg = true; // set ready true to receive participant:join-messages
              message.name = message.put.name;
              message.country = editUser.country;
              
              exports.informOtherClientsOfChatroom(message);
              logger.log('info', timestamp + ' send '+message.subject);
              
            });
            
          }
        }
        
    });
    
  }
};

exports.passKickMessagesOnToClient = function(message,hostIp){
  
  helperThreads.send(
    { type: 'search-chatroom', hash: message.roomHash },
    function(rooms){
      
      var room = rooms[0];
      
      if(room){
      
        var timestamp = exports.formatTime(new Date().getTime());
        var hostSocket = exports.clients[room.users[0].id]; // first element is always host
        var kickedSocket = exports.clients[message.destinationHash];
        
        // a client can kick other clients when:
        // 1.) client sent their hash that matches hash of first user in db
        // 2.) ip-address of a client-socket must match ip-address of a host-socket
        if( isSocketConnectionAvailable(kickedSocket) && 
            doesArrayHashContain(room.users, message.userHash) && 
            room.users[0].id === message.userHash && 
            hostSocket['clientIpAddress'] === hostIp ){
          
              kickedSocket.send(JSON.stringify({ // server informs user about chatroom-hash and userID's
                subject: 'close',
                roomHash: message.roomHash, 
                userHash: message.userHash
              }));
              
              logger.log('info', timestamp + ' send close');
        }
        
      }
    }
  );
  
};

// inform other clients that a new user has entered or left chatroom
exports.informOtherClientsOfChatroom = function(message){ 
  if(message && message.roomHash){
  
    helperThreads.send(
      { type: 'get-users', roomHash: message.roomHash }, 
      function(users){
        
        if(users){
        
          var timestamp = exports.formatTime(new Date().getTime());
          
          for(var u=0; u < users.length; u++){
            
            var userId = users[u].id;
            
            // send information for all users that are in a room but not:
            // 1.) to the user that sent the message and 
            // 2.) users that have not sent their init:user messages yet
            // necessary for avoiding redundant data on client side
            if( userId !== message.userHash && 
                isSocketConnectionAvailable( exports.clients[userId] ) && 
                (exports.clients[userId].readyForInfoMsg || message.forceSent) ){
              
                  exports.clients[userId].send(JSON.stringify(message));
              
            }
          }
          
          if(users.length > 1){
            logger.log('info', timestamp + (' send participant ' + subject) );
          }
          
        }
      }
    );
    
  }
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

var registerNewClient = function(socket,info){
  
  helperThreads.send({ type: 'insert-user', roomHash: info.roomHash, userHash: info.userHash, country: info.country },function(){
    
    var timestamp = exports.formatTime(new Date().getTime());
    logger.log('info', timestamp + ' new user inserted');
    
    if(isSocketConnectionAvailable(socket)){
    
      socket.send(JSON.stringify({ // server informs user about chatroom-hash and userID's
        subject: 'init',
        roomHash: info.roomHash,
        userHash: info.userHash,
        users: info.users,
        country: info.country
      }));
      
      timestamp = exports.formatTime(new Date().getTime());
      logger.log('info', timestamp + ' send init');
      
    }
    
  });
  
};

// checks whether socket exists and is connected to the server
var isSocketConnectionAvailable = function(socket){
  return socket && socket.readyState == 1;
};

// handle nwe client that can be a host, guest or neither of them
var handleClient = function(socket, clientURL, callback){
  
  var clientIp = socket._socket.remoteAddress;
  var country = geocoder.lookup(clientIp).country ? geocoder.lookup(clientIp).country : 'unknown';
  
  if( identifyAsHostUrl(clientURL) ){ // is host
    handleHost(clientURL, country, callback);
  }
  else if( getHashFromClientURL(clientURL, '/room/').length === 40 ){ // is guest
    handleGuest(clientURL, country, callback);
  }
  else{ // is neither host nor guest so inform client about that
    handleOutsider(callback);
  }
  
};

// when it is a host then created a room first and send them an init-message
var handleHost = function(clientURL, country, callback){
  
  var infoForClient = {};
  
  getUniqueRoomHash(function(roomHash){
    
    infoForClient.roomHash = roomHash;
    
    infoForClient.userHash = getUniqueUserHash([]);
    infoForClient.users = [];
    infoForClient.country = country;
    
    helperThreads.send({ type: 'insert-room', roomHash: infoForClient.roomHash },function(){
      
      infoForClient.success = true;
      callback(infoForClient);
      
    });
    
  });
  
};

// when it is a guest then check whether room does exist and is not fully occupied, if so send them an init-message
var handleGuest = function(clientURL, country, callback){
  
  var infoForClient = {};
  
  helperThreads.send({ type: 'search-chatroom', hash: getHashFromClientURL(clientURL, '/room/') },function(rooms){
    
    var room = null;
    
    if(!rooms){
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
    }
    else if(room && room.length === 0){ // room is not in db anymore
      infoForClient.success = false;
      infoForClient.error = "room:unknown";
    }
    else{
      
      infoForClient.roomHash = room.hash;
      infoForClient.userHash = getUniqueUserHash(room);
      
      infoForClient.users = room.users;
      infoForClient.country = country;
      infoForClient.success = true;
      
    }
    
    callback(infoForClient);
    
  });
  
};

// handle clients that could not be identified as hosts or guest-users
var handleOutsider = function(callback){
  var infoForClient = {};
  infoForClient.success = false;
  infoForClient.error = "room:unknown";
  callback(infoForClient);
};

var deleteChatroomFormDatabase = function(roomHash){
  helperThreads.send({ type: 'delete-room', roomHash: roomHash });
};

var getUniqueRoomHash = function(callback){

  var hash = null;
  
  var tryToGetHash = function(){
  
    hash = createHash();
    helperThreads.send({ type: 'search-chatroom', hash: hash },function(rooms){
      if(rooms && rooms.length === 0){ // there is no chatroom with recently calculated hash
        callback(hash);
      }
      else{
        tryToGetHash();
      }
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
