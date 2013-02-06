// database: chatroom and user handling
var mongodb = require('./../db/mongodb');

process.on('message', function(msg, callback) {

  switch(msg.type){
    case 'search-chatroom':
      mongodb.searchForChatroomEntry({ hash: msg.hash },callback);
      break;
      
    case 'insert-room':
      mongodb.insertRoom(msg.roomHash);
      break;
      
    case 'insert-user':
      mongodb.insertUser(msg.roomHash, msg.userHash);
      break;
    
    case 'get-users':
      mongodb.getOtherUsersOfChatroom(msg.roomHash,callback);
      break;
    
    case 'delete-users':
      mongodb.deleteUserFromChatroom(msg.roomHash, msg.userHash);
      break;
  };
  
});
