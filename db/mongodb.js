var mongodb = require('mongodb').MongoClient;
var properties = require('./../properties');


exports.searchForChatroomEntry = function(condition,callback) {
  
  if(!condition && !callback) {
    return null;
  }
  
  mongodb.connect(properties.mongodbUrl + "rooms", function(err, db) {
    if(err){
      throw new Error('mongodb searchForChatroomEntry: error happend while searching for chatroom in db: ' + err);
      return;
    }

    db.collection('rooms', function(err, collection) {
      
      if(err){
        throw new Error('mongodb searchForChatroomEntry: error happend while searching for chatroom in db: ' + err);
        return;
      }

      collection.find(condition).toArray(function(err, items) {
        if(err){
          throw new Error('mongodb searchForChatroomEntry: error happend while searching for chatroom in db: ' + err);
          return;
        }
        
        if(items)
          callback(items);
        
        db.close();
        
      });
      
    });
    
  });
    
  return null;
};

exports.insertRoom = function(roomHash, oldUsers, callback) {

  if (!roomHash) {
    return false;
  }

  mongodb.connect(properties.mongodbUrl + "rooms", function(err, db) {
    
    if(err){
      throw new Error('mongodb insertRoom: error happend while inserting room into db: ' + err);
      return;
    }

    var rooms = db.collection('rooms');
    var room = {
      hash: roomHash,
      users: oldUsers ? oldUsers : []
    };
    
    if(oldUsers){
      rooms.update(
        { hash: roomHash },
        room,
        function(err, result) {
          if (err) {
            throw new Error('mongodb insertRoom: error happend while inserting room into db: ' + err);
            return;
          }
        }
      );
    }
    else{
    
      rooms.insert(room, 
        { w: 1 }, 
        function(err, result) {
          if (err) {
            throw new Error('mongodb insertRoom: error happend while inserting room into db: ' + err);
            return;
          }
        }
      );
    }
    
    db.close();
    
    if(callback)
      callback();
      
  });
    
};

exports.deleteRoom  = function(roomHash,callback){
  
  if (!roomHash) {
    return false;
  }

  mongodb.connect(properties.mongodbUrl + "rooms", function(err, db) {
    
    if(err){
      throw new Error('mongodb deleteRoom: error happend while deleting room from db: ' + err);
      return;
    }

    var rooms = db.collection('rooms');
    
    rooms.remove({ hash: roomHash }, 
      { w: 1 }, 
      function(err, result) {
        if (err) {
          throw new Error('mongodb deleteRoom: error happend while deleting room from db: ' + err);
          return;
        }
      }
    );
    
    db.close();
    
    if(callback)
      callback();
      
  });
    
};

exports.insertUser = function(roomHash, userId, name, country, callback) {

  if (!roomHash || !userId) {
    return false;
  }

  mongodb.connect(properties.mongodbUrl + "rooms", function(err, db) {
    
    if (err) {
      throw new Error('mongodb insertUser: error happend while inserting user into db: ' + err);
      return;
    }
    
    exports.searchForChatroomEntry(
      { hash: roomHash},
      function(rooms){
        
        if(!rooms || !rooms.length)
          return;
        
        var _users = rooms[0].users;
        
        _users.push(
          { id: userId, name: name, country: country }
        );

        db.collection('rooms').update(
          { hash: roomHash  }, 
          { hash: roomHash, users: _users }, 
          { w: 1 }, 
          function(err, result) {
            if(err){
              throw new Error('mongodb insertUser: error happend while inserting user into db: ' + err);
              return;
            }
          }
        );
        
        db.close();
        
        if(callback)
          callback();
      }
    );
    
  });
    
};

exports.editUser = function(roomHash, userId, name, country, callback) {

  if (!roomHash || !userId) {
    return false;
  }

  mongodb.connect(properties.mongodbUrl + "rooms", function(err, db) {
    
    if (err) {
      throw new Error('mongodb editUser: error happend while editing user into db: ' + err);
      return;
    }
    
    exports.searchForChatroomEntry(
      { hash: roomHash},
      function(rooms){
        
        if(!rooms || !rooms.length)
          return;
        
        var _users = rooms[0].users;
        var editUser = { id: userId, name: name, country: country };
        
        for(var u=0; u < _users.length; u++){
          if( _users[u].id === userId ){
            _users.splice(u,1,editUser);
            break;
          }
        }

        db.collection('rooms').update(
          { hash: roomHash  }, 
          { hash: roomHash, users: _users }, 
          { w: 1 }, 
          function(err, result) {
            if(err){
              throw new Error('mongodb editUser: error happend while editing user into db: ' + err);
              return;
            }
          }
        );
        
        db.close();
        
        if(callback)
          callback();
      }
    );
    
  });
  
};

exports.getOtherUsersOfChatroom = function(roomHash, callback){
  exports.searchForChatroomEntry({ hash: roomHash },function(rooms){
    if(rooms && rooms.length && rooms[0].users)
      callback(rooms[0].users);
  });
};

exports.deleteUserFromChatroom = function(roomHash, userId, callback){
  
  exports.searchForChatroomEntry({ hash: roomHash },function(rooms){
    
    if (!rooms) {
      throw new Error('mongodb deleteUserFromChatroom: error happend while deleting user from db');
      return;
    }
    
    var room = rooms[0];
    var users = [];
    for(var u=0; u < room.users.length; u++){
      if( room.users[u].id != userId )
        users.push(room.users[u]);
    }
    
    exports.insertRoom(roomHash, users, callback);
    
  });
    
};
