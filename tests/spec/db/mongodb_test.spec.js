var mongodb = require('../../../db/mongodb');

var chatroom_hash = 'test_mongodb_chatroom_1234';
var first_user_hash = 'test_mongodb_user_007';
var second_user_hash = 'test_mongodb_user_123';

var chatroom_created = false;


beforeEach(function (done) {
  
  if(!chatroom_created){
    // create room with no users, third param is a callback methode that is called when insert has finished
    mongodb.insertRoom(chatroom_hash,null,function(){ 
      done();
    }); 
    chatroom_created = true;
  }
  else
    done();
    
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
        expect(first_user_hash).toEqual(room.users[0].id); // must be host
        done();
      });
      
    });
    
  });
  
  it('should return a guest-user', function(done) {
    
    mongodb.insertUser(chatroom_hash, second_user_hash,function(){
    
      mongodb.searchForChatroomEntry({ hash: chatroom_hash},function(rooms){
        var room = rooms[0];
        expect(second_user_hash).toEqual(room.users[1].id); // must be first guest
        done();
      });
      
    });
    
  });
  
});


describe('database delete queries', function() {
  
  it('should not return an chatroom object', function(done) {
    
    // isert dummy-chatroom object
    mongodb.deleteRoom(chatroom_hash,function(){
    
      mongodb.searchForChatroomEntry({ hash: chatroom_hash},function(rooms){
        expect(0).toEqual(rooms.length);
        done();
      });
    
    });
    
  });
  
});
