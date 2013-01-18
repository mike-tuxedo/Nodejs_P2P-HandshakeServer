require('./broadcast');

var WebSocketServer = require('ws').Server;
var wss = new WebSocketServer({port: '9001'});
var clients = [];

wss.on('connection', function(ws) {
    
    clients.push(ws);
    console.log('client connected');
    
    ws.on('message', function(message) {
      
      message = JSON.parse(message);
      console.log(message.client);
      
    });
    
    ws.on('close', function() {
      
    });
  
});