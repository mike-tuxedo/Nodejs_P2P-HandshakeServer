// !in order to run helpers-tests run this file first

var properties = require('./properties');
var mongodb = require('../../../db/mongodb');

mongodb.insertRoom(properties.chatroomHash, null,function(){
  mongodb.insertUser(
    properties.chatroomHash, 
    properties.hostUserHash, 
    properties.hostUserName, 
    'AT', 
  function(){
    console.log('chatroom and host-user inserted');
  });
});
