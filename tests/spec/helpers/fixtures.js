var properties = require('./properties');
var mongodb = require('../../../db/mongodb');

mongodb.insertRoom(properties.chatroom_hash, null,function(){
  mongodb.insertUser(properties.chatroom_hash, properties.host_hash, null);
  console.log('chatroom and host-user inserted');
});
