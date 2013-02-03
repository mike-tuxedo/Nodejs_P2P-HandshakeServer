// contains all configuration-info of this project
var properties = require('./properties');

// websocket-server and clients
var WebSocketServer = require('ws').Server;
var wss = new WebSocketServer({ port: properties.serverPort });
var helpers = require('./libs/helpers');

// to hold all user-connections
var sockets = [];

// logging all server activities
var productionLogger = require('./libs/logger').production;


wss.on('connection', function(ws) {
    
    if( helpers.isValidOrigin(ws) ){
      productionLogger.log('info', 'client connected successfully at' + new Date().toString() );
      sockets.push(ws);
    }
    else{
      productionLogger.error('client not accepted: ',ws.upgradeReq.headers.origin);
      return;
    }
    
    
    /* message-kinds (from client to server): */
    //// register (new User or Guest) -> { subject: 'init', url: 'www.example.at/#...' }
    //// spd/ice -> { subject: 'sdp/ice', chatroomHash: '...', userHash: '...', destinationHash: '...', spd or ice: Object }
    
    /* message-kinds (from server to client): */
    //// register (new User or Guest) error-property is optional -> { subject: 'init', chatroomHash: '...', userHash: '...', guestIds: [{id '...'},...], error: '...' }
    //// spd/ice -> { subject: 'sdp/ice', chatroomHash: '...', userHash: '...', spd or ice: Object }
    
    /* information-kinds: */
    // new user: { subject: 'participant-join', chatroomHash: '...', newUserHash: '...' }
    // use leaves: { subject: 'participant-leave', chatroomHash: '...', newUserHash: '...' }
    
    /* e-mail invitations */
    //// { subject: 'mail', chatroomHash: '...', userHash: '...', mail: { from: '...', to: '...', subject: '...', text: 'Hello World', html: '<b>Hello World</b>' } }
    
    

    ws.on('message', function(message) {
      
      try{
        message = JSON.parse(message);
        productionLogger.log('info','message got', message);
      }
      catch(e){
        productionLogger.error('message is non-JSON: ', e);
        return;
      }
      
      
      switch(message.subject){
        case 'init': 
          
          var newUser = sockets[sockets.length-1];
          helpers.setupNewUser(newUser, message.url);
          break;
          
        case 'sdp':
          
          helpers.passDescriptionMessagesOnToClient(message);
          break;
        
        case 'ice':
          
          helpers.passDescriptionMessagesOnToClient(message);
          break;
          
        case 'mail': 
        
          helpers.passMailInvitationOnToClient(message);
          break;
          
        case 'participant-leave':
        
          helpers.informOtherClientsOfChatroom(message.roomHash, message.userHash, 'participant-leave');
          break;  
          
        default:
        
          productionLogger.log('warn', 'message doesn\'t have an allowed subject property:', message);
          return;
      };
      
    });
    
    ws.on('close', function(ws){ // is called when client disconnected or left
      
      productionLogger.log('info', 'client disconnected');
      
      // works but we have to consider the problem what happened when user just refreshed webside
      /*
      for(var hash in helpers.clients){
        if(helpers.clients[hash] === this){
          helpers.clients[hash] = undefined;
        }
      }
      */
      
    });
});
