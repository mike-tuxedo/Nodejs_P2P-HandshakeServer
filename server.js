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
    
    if(isValidConnection(ws)){
      ws.newUser = true;
      clients.push(ws);
    }
    
    ws.on('message', function(message) {
      
      message = JSON.parse(message);
      if(message.init){
        setupNewUser(message.url);
      }
      
    });
    
    ws.on('close', function() {
      
    });
  
});


var isValidConnection = function(req){ // client must have got a certain domain in order to proceed
  if(req.upgradeReq.headers.origin == phovecUrl)
    return true;
  else
    return false;
};

var setupNewUser = function(clientUrl){
  var newUser = clients[clients.length-1];
  hash.handleUser(newUser, clientUrl);
  newUser.newUser = false;
};