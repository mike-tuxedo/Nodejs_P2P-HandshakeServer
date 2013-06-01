var properties = require('./properties');
var helpers = require('../../../libs/helpers').test;
var mongodb = require('../../../db/mongodb');

var hostUrl = 'http://locahost/#/room';

var socket = {};
socket._socket = {};
socket._socket.remoteAddress = '178.194.43.211'; // all guest users share same ip-address

describe('a guest is invited and comes in a chatroom', function() {
  
  it('query should contain host-user', function(done) {
  
    helpers.handleClient(
      socket, 
      (hostUrl + '/' + properties.chatroomHash),
      function(infoForClient){
      
      var users = infoForClient.users;
      
      expect(properties.hostUserHash).toEqual(users[0].id);
      expect(properties.hostUserName).toEqual(users[0].name);
      expect(1).toEqual(users.length);
      
      insertNextUser(done);
      
    });
    
  });
  
  it('query should contain two user\'s: host and first guest', function(done) {
  
    helpers.handleClient(
      socket,
      (hostUrl + '/' + properties.chatroomHash),
      function(infoForClient){
      
      var users = infoForClient.users;
      
      expect(properties.hostUserHash).toEqual(users[0].id);
      expect(properties.secondUserHash).toEqual(users[1].id);
      expect(properties.secondUserName).toEqual(users[1].name);
      expect(2).toEqual(users.length);
      
      insertNextUser(done);
      
    });
    
  });
  
  it('query should contain three user\'s', function(done) {
  
    helpers.handleClient(
      socket,
      (hostUrl + '/' + properties.chatroomHash), 
      function(infoForClient){
      
      var users = infoForClient.users;
      
      expect(properties.hostUserHash).toEqual(users[0].id);
      expect(properties.thirdUserHash).toEqual(users[2].id);
      expect(properties.thirdUserName).toEqual(users[2].name);
      expect(3).toEqual(users.length);
      
      insertNextUser(done);
      
    });
    
  });
  
});

function insertNextUser(done){
  
  var userToInsert = properties.usersToInsert.shift();
      
  mongodb.insertUser(
    properties.chatroomHash, 
    userToInsert.id, 
    userToInsert.name, 
    'AT', 
  function(){
    done();
  });

}
