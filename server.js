// contains all configuration-info of this project
var properties = require('./properties');

// websocket-server and clients
var WebSocketServer = require('ws').Server;
var wss = new WebSocketServer({ port: properties.serverPort });

// server methods that handle all webrtc-communications between users
var helpers = require('./libs/helpers');

// logging all server activities
var logger = require('./libs/logger');


wss.on('connection', function(ws) {
    
    var timestamp = helpers.formatTime(new Date().getTime());
    
    /* client must be connected on right-domain */
    if( helpers.isValidOrigin(ws) ){
      logger.log('info', timestamp + ' client accepted');
    }
    else{
      logger.error('info', timestamp + ' client not accepted: invalid domain ' + ws.upgradeReq.headers.origin);
      return;
    }
    
    
    /* message-kinds (from client to server): */
    //// register (new User or Guest) -> { subject: 'init', url: 'www.example.at/#...' }
    //// spd/ice -> { subject: 'sdp/ice', roomHash: '...', userHash: '...', destinationHash: '...', spd or ice: Object }
    //// take guest out -> { subject: 'participant:remove', roomHash: '...', userHash: '...', destinationHash: '...' }
    //// edit client -> { subject: 'participant:edit', roomHash: '...', userHash: '...', put: { name: '...' } }
    
    /* message-kinds (from server to client): */
    //// register -> (new User or Guest) error-property is optional -> { subject: 'init', roomHash: '...', userHash: '...', users: [{ id '...', country: '...', name: '...' },...], error: '...' }
    //// spd/ice -> { subject: 'sdp/ice', roomHash: '...', userHash: '...', spd or ice: Object }
    //// take guest out -> { subject: 'close', roomHash: '...', userHash: '...' }
    
    /* information-kinds (server to client): */
    //// new client -> { subject: 'participant:join', roomHash: '...', userHash: '...', name: '...', country: '...' }
    //// edit client -> { subject: 'participant:edit', roomHash: '...', userHash: '...', name: '...', country: '...' }
    //// client leaves -> { subject: 'participant:leave', roomHash: '...', userHash: '...' }
    //// video changed mute and unmute -> { subject: 'participant:video:mute/unmute', roomHash: '...', userHash: '...' }
    //// audio changed mute and unmute -> { subject: 'participant:audio:mute/unmute', roomHash: '...', userHash: '...' }
    
    /* e-mail invitations (client to server): */
    //// send mail -> { subject: 'mail', roomHash: '...', userHash: '...', mail: { from: '...', to: '...', subject: '...', text: 'Hello World', html: '<b>Hello World</b>' } }
    
    

    ws.on('message', function(message) {
      
      var timestamp = helpers.formatTime(new Date().getTime());
      
      try{
        message = JSON.parse(message);
        logger.log('info', timestamp + ' got ' + message.subject);
      }
      catch(e){
        logger.error('info', timestamp + ' message is non-JSON');
        return;
      }
      
      try{
      
        switch(message.subject){
          case 'init:room': 
            
            helpers.handleNewClient(this, message.url); // this is a socket that sent an the message
            break;
          
          case 'init:user': 
            
            message.subject = 'participant:join';
            message.forceSent = true;
            helpers.editClient(message);
            break;
            
          case 'sdp':
            
            helpers.passDescriptionMessagesOnToClient(message);
            break;
          
          case 'ice':
            
            helpers.passDescriptionMessagesOnToClient(message);
            break;
            
          case 'mail': 
          
            helpers.passMailInvitationOnToClient(message,this);
            break;
          
          case 'participant:edit': 
          
            helpers.editClient(message);
            break;
            
          case 'participant:remove':
            
            helpers.passKickMessagesOnToClient(message,this['clientIpAddress']);
            break;
          
          case 'participant:leave':
            
            message.forceSent = true;
            helpers.informOtherClientsOfChatroom(message);
            break;
          
          case 'participant:video:mute':
          case 'participant:video:unmute':
          case 'participant:audio:mute':
          case 'participant:audio:unmute':
            
            helpers.informOtherClientsOfChatroom(message);
            break;
            
          default:
          
            logger.log('warn', timestamp + ' server message: doesn\'t have an allowed subject property: ' + message);
        };
      
      }
      catch(e){
        logger.error('error', timestamp + ' server message: ' + message + ' throwed error: ' + e);
      }
      
    });
    
    ws.on('close', function(){ // is called when client disconnected or left chatroom
      
      var timestamp = helpers.formatTime(new Date().getTime());
        
      try{
      
        logger.log('info', timestamp + ' client disconnected');
        
        if(this['accepted']){ // client must be accepted host or guest
        
          // delete socket-object out of JSON-object
          var socketToDelete = this['userHash'];
          delete helpers.clients[socketToDelete]; 
          
          // delete client form db
          helpers.deleteUserFromDatabase(this['roomHash'], this['userHash']);
          
          // inform other clients that a client left the room
          var msg = { roomHash: this['roomHash'], userHash: this['userHash'], subject: 'participant:leave', forceSent: true };
          helpers.informOtherClientsOfChatroom(msg);
          
        }
      }
      catch(e){
        logger.error('error', timestamp + ' server close: while client disconnected: throwed error: ' + e);
      }
      
    });
});

wss.on('error', function(error) {
  var timestamp = helpers.formatTime(new Date().getTime());
  logger.error('error', timestamp + ' server-error: ' + error);
});