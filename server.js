// contains all configuration-info of this project
var properties = require('./properties');

// websocket-server and clients
var WebSocketServer = require('ws').Server;
var wss = new WebSocketServer({ port: properties.serverPort, clientTracking: false });

// server methods that handle all webrtc-communications between users
var helpers = require('./libs/helpers');

// logging all server activities
var productionLogger = require('./libs/logger').production;

// sleep-Helper for frequently websocket-connection attacks
var isSleeping = false;


wss.on('connection', function(ws) {
    
    if(isSleeping){ // so that a bad guy can not refresh side over and over again
      return;
    }
    
    if( helpers.isValidOrigin(ws) ){
      productionLogger.log('info', 'client connected successfully at: ' + new Date().toString() );
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
        productionLogger.log('info','message got: ', message);
      }
      catch(e){
        productionLogger.error('message is non-JSON: ', e);
        return;
      }
      
      
      switch(message.subject){
        case 'init': 
          
          helpers.setupNewUser(this, message.url); // this is socket that sent an init-message
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
    
    ws.on('close', function(){ // is called when client disconnected or left chatroom
      
      productionLogger.log('info', 'client disconnected at: ' + new Date().toString());
      
      // delete client form client object
      var tmpClients = {};
      for(var hash in helpers.clients){
        if(helpers.clients[hash] !== this) // this is ws object and so the socket that has disconnected or left chatroom
          tmpClients[hash] = helpers.clients[hash];
      }
      helpers.clients = tmpClients;
      
      isSleeping = true;
      // when an user disconnects then server does not work for 1 second
      setTimeout(function(){ isSleeping = false; }, 1000);
      
    });
});
