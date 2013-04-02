var properties = require('./properties');
var helpers = require('../../../libs/helpers').test;

var host_url = 'http://locahost/#/room';
var user_hash = null;


describe('a guest is invited and comes in a chatroom', function() {
  
  it('userId-Array should contain host-id', function(done) {
    
    helpers.handleClient( (host_url + '/' + properties.chatroom_hash), function(infoForClient){
      console.log('widhtin first test');
      user_hash =  infoForClient.userHash;
      var guest_ids = infoForClient.guestIds;
      
      expect(properties.host_hash).toEqual(guest_ids[0].id);
      
      done();
      
    });
    
  });
  
  it('userId-Array should contain two id\'s: host and guest of users', function(done) {
    
    helpers.handleClient( (host_url + '/' + properties.chatroom_hash), function(infoForClient){
      console.log('widhtin second test');
      var guest_ids = infoForClient.guestIds;
      
      expect(properties.host_hash).toEqual(guest_ids[0].id);
      expect(user_hash).toEqual(guest_ids[1].id);
      
      done();
      
    });
    
  });
  
  it('userId-Array should contain three id\'s', function(done) {
    
    helpers.handleClient( (host_url + '/' + properties.chatroom_hash), function(infoForClient){
    console.log('widhtin third test');
      var guest_ids = infoForClient.guestIds;
      
      expect(properties.host_hash).toEqual(guest_ids[0].id);
      expect(3).toEqual(guest_ids.length);
      
      done();
      
    });
    
  });
  
  
});
