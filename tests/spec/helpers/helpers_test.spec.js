var properties = require('./properties');
var helpers = require('../../../libs/helpers').test;
var mongodb = require('../../../db/mongodb');

var hostUrl = 'http://locahost/#/room';

var socket = {};
socket._socket = {};
socket._socket.remoteAddress = '178.194.43.211'; // all guest users share same ip-address

var firstTestPassed = false;

// simulates init:user messages
beforeEach(function (done) {
  if(firstTestPassed){
    var userToInsert = properties.usersToInsert.shift();
    
    mongodb.insertUser(
      properties.chatroomHash, 
      userToInsert.id, 
      userToInsert.name,
      function(){
        console.log('userToInsert: ',userToInsert);
        done();
      }
    );
  }
  else{
    done();
  }
});

describe('a guest is invited and comes in a chatroom', function() {
  
  it('userId-Array should contain host-id', function(done) {
    
    helpers.handleClient(
      socket, 
      (hostUrl + '/' + properties.chatroomHash),
      function(infoForClient){
      
      var users = infoForClient.users;
      expect(properties.hostUserHash).toEqual(users[0].id);
      expect(properties.hostUserName).toEqual(users[0].name);
      done();
      
    });
    
  });
  
  it('userId-Array should contain two id\'s: host and guest of users', function(done) {
    
    helpers.handleClient(
      socket,
      (hostUrl + '/' + properties.chatroomHash),
      properties.thirdUserName,
      function(infoForClient){
      
      var users = infoForClient.users;
      
      expect(properties.hostUserHash).toEqual(users[0].id);
      expect(properties.secondUserHash).toEqual(users[1].id);
      expect(properties.secondUserName).toEqual(users[1].name);
      done();
      
    });
    
  });
  
  it('userId-Array should contain three id\'s', function(done) {
    
    helpers.handleClient(
      socket,
      (hostUrl + '/' + properties.chatroomHash), 
      properties.fourthUserName,
      function(infoForClient){
    
      var users = infoForClient.users;
      
      expect(properties.hostUserHash).toEqual(users[0].id);
      expect(properties.thirdUserHash).toEqual(users[2].id);
      expect(properties.thirdUserName).toEqual(users[2].name);
      expect(3).toEqual(users.length);
      done();
      
    });
    
  });
  
});
