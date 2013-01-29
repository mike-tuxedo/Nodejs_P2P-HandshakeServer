require('./array_prototype');

var mongodb = require('mongodb').MongoClient;
var properties = require('./properties');


exports.searchForChatroomEntry = function(condition,callback) {
  
  try{
  
    if (typeof condition != 'object' || !callback) {
      return false;
    }
  
    mongodb.connect(properties.mongodbUrl + "rooms", function(err, db) {
      if (err) {
        return console.log(err);
      }

      db.collection('rooms', function(err, collection) {
        if (err) {
          return console.log(err);
        }

        collection.find(condition).toArray(function(err, items) {
          if (err) {
            return console.log(err);
          }
          
          callback(items);
        });

      });
      
    });
    
  }
  catch(e){
    console.log('error happend:',e);
  }
  
  return null;
};

exports.insertRoom = function(roomHash) {

  try{
  
    if (!roomHash) {
      return false;
    }

    mongodb.connect(properties.mongodbUrl + "rooms", function(err, db) {
      if (err) {
        return console.log(err);
      }

      var rooms = db.collection('rooms');
      var room = {
        hash: roomHash,
        users: []
      };

      rooms.insert(room, {
        w: 1
      }, function(err, result) {
        if (err) {
          return console.log(err);
        }
      });
    });
    
  }
  catch(e){
    console.log('error happend:',e);
  }
}

exports.insertUser = function(roomHash, userId) {

  try{
  
    if (!roomHash || !userId) {
      return false;
    }

    mongodb.connect(properties.mongodbUrl + "rooms", function(err, db) {
      if (err) {
        return console.log(err);
      }
      
      
      exports.searchForChatroomEntry(
        { hash: roomHash},
        function(room){
          
          var _users = room[0].users;
          
          _users.push(
            { id: userId }
          );

          db.collection('rooms').update(
            { hash: roomHash  }, 
            { hash: roomHash, users: _users }, 
            { w: 1 }, 
            function(err, result) {
              if (err) {
                return console.log(err);
              }
            }
          );
        }
      );
      
    });
    
  }
  catch(e){
    console.log('error happend:',e);
  }
}
