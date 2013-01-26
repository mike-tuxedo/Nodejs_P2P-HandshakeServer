var serverMethods = require('./server_methods');

// websocket-server and clients
var WebSocketServer = require('ws').Server;
var wss = new WebSocketServer({port: '9005'});
var clients = [];

wss.on('connection', function(ws) {
    
    console.log('client connected');
    
    if( serverMethods.isValidOrigin(ws) ){
      clients.push(ws);
    }
    else{
      return;
    }
    
    ws.on('message', function(message) {
      message = JSON.parse(message);
      
      if( serverMethods.isRegisterMessage(message) ){
        var newUser = clients[clients.length-1];
        serverMethods.setupNewUser(newUser, message.url);
      }
      
    });
    
    ws.on('close', function(){});
});


