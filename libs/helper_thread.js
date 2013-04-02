﻿// database: chatroom and user handling
var mongodb = require('./../db/mongodb');

process.on('message', function(msg, callback) {

  switch(msg.type){
    case 'search-chatroom':
      mongodb.searchForChatroomEntry({ hash: msg.hash },callback);
      break;
      
    case 'insert-room':
      console.log('insert-room');
      mongodb.insertRoom(msg.roomHash,null,callback);
      break;
      
    case 'insert-user':
      console.log('insert-user');
      mongodb.insertUser(msg.roomHash, msg.userHash,callback);
      break;
    
    case 'get-users':
      mongodb.getOtherUsersOfChatroom(msg.roomHash,callback);
      break;
    
    case 'delete-users':
      mongodb.deleteUserFromChatroom(msg.roomHash, msg.userHash, function(){
        
        mongodb.searchForChatroomEntry({ hash: msg.roomHash },function(rooms){
          
          var room = rooms[0];
          if( room && room.users && room.users.length === 0)
            mongodb.deleteRoom(room.hash);
          
        });
        
      });
      
  };
  
});
