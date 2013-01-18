Array.prototype.broadcast = function(socket,message){
  for(var s=0; s < this.length; s++){
    if(socket !== this[s] && this[s].readyState == 1) // first not same socket that the message is sent from and socket must be open
      this[s].send(message);
  }
};