var properties = require('./properties');
var mongodb = require('../../../db/mongodb');

mongodb.insertRoom(properties.chatroomHash, null,function(){
  mongodb.insertUser(
    properties.chatroomHash, 
    properties.hostUserHash, 
    properties.hostUserName, 
    properties.hostUserCountry, 
  function(){
    console.log('chatroom and host-user inserted');
  });
});
