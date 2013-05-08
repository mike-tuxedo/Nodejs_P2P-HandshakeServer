var properties = require('./properties');
var helpers = require('../../../libs/helpers').test;

var hostUrl = 'http://locahost/#/room';
var secondUserHash = null;
var socket = {};
socket._socket = {};
socket._socket.remoteAddress = '178.194.43.211';


describe('a guest is invited and comes in a chatroom', function() {
  
  it('userId-Array should contain host-id', function(done) {
    
    helpers.handleClient(
      socket, 
      (hostUrl + '/' + properties.chatroomHash), 
      properties.secondUserName,
      function(infoForClient){
      
      secondUserHash =  infoForClient.userHash;
      
      var guestIds = infoForClient.guestIds;
      
      expect(properties.hostUserHash).toEqual(guestIds[0].id);
      
      done();
      
    });
    
  });
  
  it('userId-Array should contain two id\'s: host and guest of users', function(done) {
    
    helpers.handleClient(
      socket,
      (hostUrl + '/' + properties.chatroomHash),
      properties.thirdUserName,
      function(infoForClient){
      
      var guestIds = infoForClient.guestIds;
      
      expect(properties.hostUserHash).toEqual(guestIds[0].id);
      expect(secondUserHash).toEqual(guestIds[1].id);
      
      done();
      
    });
    
  });
  
  it('userId-Array should contain three id\'s', function(done) {
    
    helpers.handleClient(
      socket,
      (hostUrl + '/' + properties.chatroomHash), 
      properties.fourthUserName,
      function(infoForClient){
    
      var guest_ids = infoForClient.guestIds;
      
      expect(properties.hostUserHash).toEqual(guest_ids[0].id);
      expect(3).toEqual(guest_ids.length);
      
      done();
      
    });
    
  });
  
  
});
