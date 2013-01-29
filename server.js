require('./array_prototype');

// contains all configuration-info of this project
var properties = require('./properties');

var serverMethods = require('./server_methods');
var mongodb = require('mongodb').MongoClient;

var invitationMailer = require('./mailer');

// websocket-server and clients
var WebSocketServer = require('ws').Server;
var wss = new WebSocketServer({ port: properties.serverPort });

// to hold all user-connections
var sockets = [];

wss.on('connection', function(ws) {
    
    
    if( serverMethods.isValidOrigin(ws) ){
      serverMethods.trace('client connected','');
      sockets.push(ws);
    }
    else{
      serverMethods.trace('client not accepted: ',ws.upgradeReq.headers.origin);
      return;
    }
    
    
    /* message-kinds (from client to server): */
    //// register (new User or Guest) -> { subject: 'init', url: 'www.example.at/#...' }
    //// spd/ice -> { subject: 'sdp/ice', chatroomHash: '...', userHash: '...', destinationHash: '...', spd or ice: Object }
    
    /* message-kinds (from server to client): */
    //// register (new User or Guest) -> { subject: 'init', success: Boolean, chatroom: '...', userID: '...', guestIds: [{id '...'},...], error: '...' }
    //// spd/ice -> { subject: 'sdp/ice', chatroomHash: '...', userHash: '...', spd or ice: Object }
    
    /* information-kinds: */
    // new user: { subject: 'participate-join', chatroomHash: '...', newUserHash: '...' }
    // use leaves: { subject: 'participate-leave', chatroomHash: '...', newUserHash: '...' }
    
    /* e-mail invitations */
    //// { subject: 'mail', chatroomHash: '...', userHash: '...', mail: { from: '...', to: '...', subject: '...', text: 'Hello World', html: '<b>Hello World</b>' } }
    
    

    ws.on('message', function(message) {
      
      try{
        message = JSON.parse(message);
      }
      catch(e){
        serverMethods.trace('message is non-JSON:',e);
        return;
      }
      
      switch(message.subject){
        case 'init': 
        
          var newUser = sockets[sockets.length-1];
          serverMethods.setupNewUser(newUser, message.url);
          break;
          
        case 'sdp' || 'ice': 
        
          mongodb.searchForChatroomEntry(
            { hash: message.chatroomHash },
            function(rooms){ // check whether chatroomHash and User-ID's exist 
              var room = rooms[0];
              
              if( room && room.hash == message.chatroomHash && room.users.getObject({ id: message.userHash }) && room.users.getObject({ id: message.destinationHash }) ){
                if( message.sdp ){
                  serverMethods.clients[message.destinationHash].send({ 
                    chatroomHash: message.chatroomHash, 
                    userHash: message.userHash, 
                    spd: message.sdp 
                  });
                }
                else if( message.ice ){
                  serverMethods.clients[message.destinationHash].send({ 
                    chatroomHash: message.chatroomHash, 
                    userHash: message.userHash, 
                    ice: message.ice 
                  });
                }
              }
            }
          );
          break;
        
        case 'participate-join':
          
          break;
        
        case 'participate-leave':
        
          break;
            
        case 'mail': 
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
          break;
          
        default:
          serverMethods.trace('message doesn\'t have an allowed subject property:','');
          return;
      }

    });
    
    ws.on('close', function(){});
});
