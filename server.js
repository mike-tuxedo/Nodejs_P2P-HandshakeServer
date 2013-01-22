// webrtc-handling
require('./array_prototype');

// database
var hash = require('./hash');

// websocket-server
var WebSocketServer = require('ws').Server;
var wss = new WebSocketServer({port: '9005'});
var clients = [];
var phovecUrl = 'http://localhost:8001';

wss.on('connection', function(ws) {
    
    console.log('client connected');
    
    //TODO: Only create room, when the user is the first one
    console.log(ws.upgradeReq.headers);
    if(ws.upgradeReq.headers.origin == phovecUrl ws.upgradeReq.headers['sec-websocket-key'])
      
    //hash.handleUser(ws);
    ws.key = ws.upgradeReq.headers['sec-websocket-key'];
    clients.push(ws);
    
    ws.on('message', function(message) {
      
      message = JSON.parse(message);
      console.log(message.client);
      
    });
    
    ws.on('close', function() {
      
    });
  
});


var isValidConnection = function(req){
  if(req.upgradeReq.headers.origin == phovecUrl)
    return false;
    
  for(var c = 0; c < clients.length; c++)
    if(clients[c].key ==
};