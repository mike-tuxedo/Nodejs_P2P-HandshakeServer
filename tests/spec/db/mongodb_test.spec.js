var mongodb = require('../../../db/mongodb');

var chatroom_hash = 'test_Chatroom_1234';
var first_user_hash = 'test_User_007';
var second_user_hash = 'test_User_123';

var chatroom_created = false;


beforeEach(function () {
  
  if(!chatroom_created){
    mongodb.insertRoom(chatroom_hash,null);
    chatroom_created = true;
  }
  
});


describe('database insert queries', function() {
  
  it('should return an chatroom-object', function(done) {
    
    mongodb.searchForChatroomEntry({ hash: chatroom_hash},function(rooms){
      var room = rooms[0];
      expect(chatroom_hash).toEqual(room.hash);
      done();
    });
    
  });
  
  it('should return a host-user', function(done) {
    
    mongodb.insertUser(chatroom_hash, first_user_hash, function(){
    
      mongodb.searchForChatroomEntry({ hash: chatroom_hash},function(rooms){
        var room = rooms[0];
        console.log(room);
        expect(first_user_hash).toEqual(room.users[0].id); // must be host
        done();
      });
      
    });
    
  });
  
  it('should return a guest-user', function(done) {
    
    mongodb.insertUser(chatroom_hash, second_user_hash,function(){
    
      mongodb.searchForChatroomEntry({ hash: chatroom_hash},function(rooms){
        var room = rooms[0];
        console.log(room);
        expect(second_user_hash).toEqual(room.users[1].id); // must be first guest
        done();
      });
      
    });
    
  });
  
});


describe('database delete queries', function() {
  
  it('should not return an chatroom object', function(done) {
    
    // isert dummy-chatroom object
    mongodb.deleteRoom(chatroom_hash);
    
    mongodb.searchForChatroomEntry({ hash: chatroom_hash},function(rooms){
      expect(0).toEqual(rooms.length);
      done();
    });
    
  });
  
});
