// contains all configuration-info of this project
var properties = require('./properties');

// websocket-server and clients
var WebSocketServer = require('ws').Server;
var wss = new WebSocketServer({ port: properties.serverPort });

// server methods that handle all webrtc-communications between users
var helpers = require('./libs/helpers');

// logging all server activities
var productionLogger = require('./libs/logger').production;


wss.on('connection', function(ws) {
    
    var timestamp = helpers.formatTime(new Date().getTime());
    
    /* client must be connection on right-domain */
    /* furthermore client must not update side over and over again */
    if( helpers.isValidOrigin(ws) /*&& !helpers.doesClientIpExist(ws._socket.remoteAddress) */){
      productionLogger.log('info', timestamp + ' client accepted');
    }
    else{
      if( !helpers.isValidOrigin(ws) ){
        productionLogger.error('info', timestamp + ' client not accepted: invalid domain ' + ws.upgradeReq.headers.origin);
      }
      else{
        productionLogger.error('info', timestamp + ' client not accepted: ip already exists ' + ws._socket.remoteAddress);
      }
      return;
    }
    
    
    /* message-kinds (from client to server): */
    //// register (new User or Guest) -> { subject: 'init', url: 'www.example.at/#...' }
    //// spd/ice -> { subject: 'sdp/ice', chatroomHash: '...', userHash: '...', destinationHash: '...', spd or ice: Object }
    
    /* message-kinds (from server to client): */
    //// register (new User or Guest) error-property is optional -> { subject: 'init', chatroomHash: '...', userHash: '...', guestIds: [{id '...'},...], error: '...' }
    //// spd/ice -> { subject: 'sdp/ice', chatroomHash: '...', userHash: '...', spd or ice: Object }
    
    /* information-kinds: */
    // new user: { subject: 'participant-join', chatroomHash: '...', userHash: '...' }
    // use leaves: { subject: 'participant-leave', chatroomHash: '...', userHash: '...' }
    
    /* e-mail invitations */
    //// { subject: 'mail', chatroomHash: '...', userHash: '...', mail: { from: '...', to: '...', subject: '...', text: 'Hello World', html: '<b>Hello World</b>' } }
    
    

    ws.on('message', function(message) {
      
      var timestamp = helpers.formatTime(new Date().getTime());
      
      try{
        message = JSON.parse(message);
        productionLogger.log('info', timestamp, ('got ' + message.subject));
      }
      catch(e){
        productionLogger.error('info', timestamp, 'message is non-JSON');
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
      };
      
    });
    
    ws.on('close', function(){ // is called when client disconnected or left chatroom
      
      var timestamp = helpers.formatTime(new Date().getTime());
      
      productionLogger.log('info', timestamp + ' client disconnected');
      
      var userHashToDelete = null;
      
      // delete client form client object
      var tmpClients = {};
      for(var hash in helpers.clients){
        if(helpers.clients[hash] !== this){ 
          tmpClients[hash] = helpers.clients[hash];
        }
        else{ // this is a ws-object and so the user that has disconnected or left chatroom
          userHashToDelete = hash;
        }
      }
      
      helpers.clients = tmpClients;
      
      // delete client form db and their ip-address
      if( this['roomHash'] && userHashToDelete ){
        helpers.deleteUserFromDatabase(this['roomHash'], userHashToDelete);
        
        // user might have left chatroom without pressing leave button then inform other chatroom-users as well
        helpers.informOtherClientsOfChatroom(this['roomHash'], userHashToDelete, 'participant-leave');
        
        if(this['clientIpAddress']){
          helpers.delayedIpJob(500,this['clientIpAddress']);
        }
      }
      
    });
});

wss.on('error', function(error) {
  var timestamp = helpers.formatTime(new Date().getTime());
  productionLogger.error('error', timestamp + ' server error ' + error);
});