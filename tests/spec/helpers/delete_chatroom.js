var properties = require('./properties');
var mongodb = require('../../../db/mongodb');

mongodb.deleteRoom(properties.chatroom_hash,function(){
  console.log('chatroom deleted successfully');
});