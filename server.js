var app = require('http').createServer(handler), 
    io = require('socket.io').listen(app), 
    fs = require('fs');

app.listen(8001);

function handler (req, res) {
  fs.readFile(
    __dirname + '/client.html',
    function (err, data) {
      if (err) {
        res.writeHead(500);
        return res.end('Error loading socketio_client.html');
      }

      res.writeHead(200,{'Content-Type' : 'text/html'});
      res.end(data);
    }
  );
}

io.sockets.on('connection', function (socket) {
  
  socket.on('', function (data) {});
  
  socket.on('disconnect', function () {});
  
});