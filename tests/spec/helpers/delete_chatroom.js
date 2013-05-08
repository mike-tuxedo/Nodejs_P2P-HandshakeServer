var properties = require('./properties');
var mongodb = require('../../../db/mongodb');

mongodb.deleteRoom(properties.chatroomHash,function(){
  console.log('chatroom deleted successfully');
});