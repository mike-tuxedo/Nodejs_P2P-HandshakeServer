var serverMethods = require('./server_methods');

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
    
    ws.on('message', function(message) {
    
      message = JSON.parse(message);
      
      if( serverMethods.isRegisterMessage(message) ){
        var newUser = sockets[sockets.length-1];
        serverMethods.setupNewUser(newUser, message.url);
      }
      
    });
    
    ws.on('close', function(){});
});


