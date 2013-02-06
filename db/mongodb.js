﻿var mongodb = require('mongodb').MongoClient;
var properties = require('./../properties');


exports.searchForChatroomEntry = function(condition,callback) {
  
  try{
  
    if (typeof condition != 'object' || !callback) {
      return false;
    }
  
    mongodb.connect(properties.mongodbUrl + "rooms", function(err, db) {
      if (err) {
        console.log('error happend while searching chatroom in db: ',e);
        return;
      }

      db.collection('rooms', function(err, collection) {
        if (err) {
          console.log(err);
          return;
        }

        collection.find(condition).toArray(function(err, items) {
          if (err) {
            console.log(err);
            return;
          }
          
          if(items)
            callback(items);
          
        });

      });
      
    });
    
  }
  catch(e){
    console.log('error happend while searching chatroom in db: ',e);
  }
  
  return null;
};

exports.insertRoom = function(roomHash,oldUsers) {

  try{
  
    if (!roomHash) {
      return false;
    }

    mongodb.connect(properties.mongodbUrl + "rooms", function(err, db) {
      if (err) {
        console.log('error happend while inserting chatroom into db: ',e);
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
              console.log(err);
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
              console.log(err);
              return;
            }
          }
        );
      }
      
    });
    
  }
  catch(e){
    console.log('error happend while inserting chatroom into db: ',e);
  }
};

exports.insertUser = function(roomHash, userId) {

  try{
  
    if (!roomHash || !userId) {
      return false;
    }

    mongodb.connect(properties.mongodbUrl + "rooms", function(err, db) {
      if (err) {
        console.log('error happend while inserting user into chatroom: ',err);
        return;
      }
      
      
      exports.searchForChatroomEntry(
        { hash: roomHash},
        function(rooms){
          
          if(!rooms)
            return;
          
          var _users = rooms[0].users;
          
          _users.push(
            { id: userId }
          );

          db.collection('rooms').update(
            { hash: roomHash  }, 
            { hash: roomHash, users: _users }, 
            { w: 1 }, 
            function(err, result) {
              if (err) {
                console.log(err);
                return;
              }
            }
          );
        }
      );
      
    });
    
  }
  catch(e){
    console.log('error happend while inserting user into chatroom: ',e);
  }
};

exports.getOtherUsersOfChatroom = function(roomHash, callback){
  exports.searchForChatroomEntry({ hash: roomHash },function(rooms){
    if(rooms.length && rooms[0].users)
      callback(rooms[0].users);
  });
};

exports.deleteUserFromChatroom = function(roomHash, userId){
  
  try{
    
    exports.searchForChatroomEntry({ hash: roomHash },function(rooms){
      
      if (!rooms) {
        console.log('error happened while deleting user from chatroom: ',room);
        return;
      }
      
      var room = rooms[0];
      var users = [];
      for(var u=0; u < room.users.length; u++){
        if( room.users[u].id != userId )
          users.push(room.users[u]);
      }
      
      exports.insertRoom(roomHash, users);
      
    });
    
  }
  catch(e){
    console.log('error happened while deleting user from chatroom: ',e);
  }
  
};
