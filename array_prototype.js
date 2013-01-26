Array.prototype.broadcast = function(socket,message){
  for(var s=0; s < this.length; s++){
    if(socket !== this[s] && this[s].readyState == 1) // first not same socket that the message is sent from and socket must be open
      this[s].send(message);
  }
};

// search for { hash: '...' users:[...]} and returns true if array contains objectect
// first param can look like { hash: '123' }
// second param can look like 'hash'
Array.prototype.containsObject = function(object,property){
  for(var prop in this){
    for(var innerProp in this[prop])
        if(this[prop][innerProp] == object[property])
            return true;
  }
  return false;
};


// search for { hash: '...' users:[...]} and returns it
// param can look like { hash: '123' }
Array.prototype.getObject = function(object){
  for(var prop in this){
    for(var innerProp in this[prop])
        if(this[prop][innerProp] == object[innerProp])
            return this[prop];
  }
  return null;
};