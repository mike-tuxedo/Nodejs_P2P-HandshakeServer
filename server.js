require('./array_prototype');

var serverMethods = require('./server_methods');
var mongodb = require('mongodb').MongoClient;

var invitationMailer = require('./mailer');

// websocket-server and clients
var WebSocketServer = require('ws').Server;
var wss = new WebSocketServer({port: '9005'});

// to hold all user-connections
var sockets = [];

wss.on('connection', function(ws) {
    
    if( serverMethods.isValidOrigin(ws) ){
      serverMethods.trace('client connected');
      sockets.push(ws);
    }
    else{
      return;
    }
    
    
    /* message-kinds (from client to server): */
    //// register (new User or Guest) -> { init: true, url: 'www.example.at/#...' }
    //// spd/ice -> { chatroomHash: '...', userHash: '...', destinationHash: '...', spd or ice: Object }
    
    /* message-kinds (from server to client): */
    //// register (new User or Guest) -> { init: true, chatroom: '...', userID: '...', guestIds: [{id '...'},...] }
    //// spd/ice -> { chatroomHash: '...', userHash: '...', spd or ice: Object }
    
    /* e-mail invitations */
    //// { chatroomHash: '...', userHash: '...', mail: { from: '...', to: '...', subject: '...', text: 'Hello World', html: '<b>Hello World</b>' } }
    
    

    ws.on('message', function(message) {
    
      message = JSON.parse(message);
      
      
      if( serverMethods.isRegisterMessage(message) ){
      
        var newUser = sockets[sockets.length-1];
        serverMethods.setupNewUser(newUser, message.url);
        
      }
      else if( serverMethods.isSessionDescription(message) ){
        
        mongodb.searchForChatroomEntry(
          { hash: message.chatroomHash },
          function(room){ // check whether chatroomHash and User-ID's exist 
            if( room && room.hash == message.chatroomHash && room.users.getObject({ id: message.userHash }) && room.users.getObject({ id: message.destinationHash }) ){
              if( msg.sdp )
                serverMethods.clients[message.destinationHash].send({ chatroomHash: message.chatroomHash, userHash: message.userHash, spd: message.sdp });
              else
                serverMethods.clients[message.destinationHash].send({ chatroomHash: message.chatroomHash, userHash: message.userHash, ice: message.ice });
            }
          }
        );
        
      }
      else if( serverMethods.isMailInvitation(message) ){
        
        mongodb.searchForChatroomEntry(
          { hash: message.chatroomHash },
          function(room){ // check whether chatroomHash and User-ID exist 
            if( room && room.hash == message.chatroomHash && room.users.getObject({ id: message.userHash }) ){
              invitationMailer.sendMail({ from: message.from, to: message.to, subject: message.subject, text: message.text, html: message.html });
            }
          }
        );
        
      }
  
  
      
    });
    
    ws.on('close', function(){});
});


