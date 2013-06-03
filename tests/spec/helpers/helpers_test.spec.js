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


describe('server helper-methods check-up', function() {
  
  it('should create a 40 sign-hash', function() {
    
    var hash = helpers.createHash();
    expect(typeof '').toEqual(typeof hash);
    expect(40).toEqual(hash.length);
    
  });
  
  it('should return a 40 sign-hash', function() {
    
    var hash = helpers.getHashFromClientURL(properties.clientURL, '/room/');
    expect(typeof '').toEqual(typeof hash);
    expect(40).toEqual(hash.length);
    
  });
  
  it('should return an unique room-hash', function(done) {
    
    helpers.getUniqueRoomHash(function(hash){
    
      expect(properties.chatroomHash).not.toEqual(hash);
      done();
      
    });
    
  });
  
  it('should return an unique user-hash', function(done) {
    
    helpers.helperThreads.send({ type: 'search-chatroom', hash: properties.chatroomHash }, function(rooms){
      
      var room = rooms[0];
      var userHash = helpers.getUniqueUserHash(room);
      
      for(var u=0;u < room.users.length; u++){
        var user = room.users[u];
        expect(userHash).not.toEqual(user.id);
      }
      
      done();
      
    });
    
  });
  
});
