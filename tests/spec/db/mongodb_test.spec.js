var mongodb = require('../../../db/mongodb');

var chatroomHash = 'test_mongodb_chatroom_1234';

var firstUser = {};
firstUser.hash = 'test_mongodb_user_007';
firstUser.name = 'Karl';
firstUser.country = 'AT';

var secondUser = {};
secondUser.hash = 'test_mongodb_user_123';
secondUser.name = 'Max';
secondUser.country = 'DE';

var chatroomCreated = false;


beforeEach(function (done) {
  
  if(!chatroomCreated){
    // create room with no users, third param is a callback methode that is called when insert has finished
    mongodb.insertRoom(chatroomHash,null,function(){ 
      done();
    }); 
    chatroomCreated = true;
  }
  else
    done();
    
});


describe('database insert queries', function() {
  
  it('should return an chatroom-object', function(done) {
    
    mongodb.searchForChatroomEntry({ hash: chatroomHash},function(rooms){
      var room = rooms[0];
      expect(chatroomHash).toEqual(room.hash);
      done();
    });
    
  });
  
  it('should return a host-user', function(done) {
    
    mongodb.insertUser(chatroomHash, firstUser.hash, firstUser.name, firstUser.country, function(){
    
      mongodb.searchForChatroomEntry({ hash: chatroomHash},function(rooms){
        var room = rooms[0];
        expect(firstUser.hash).toEqual(room.users[0].id); // must be host
        done();
      });
      
    });
    
  });
  
  it('should return a guest-user', function(done) {
    
    mongodb.insertUser(chatroomHash, secondUser.hash, secondUser.name, secondUser.country, function(){
    
      mongodb.searchForChatroomEntry({ hash: chatroomHash},function(rooms){
        var room = rooms[0];
        expect(secondUser.hash).toEqual(room.users[1].id); // must be first guest
        done();
      });
      
    });
    
  });
  
});


describe('database delete queries', function() {
  
  it('should not return an chatroom object', function(done) {
    
    // isert dummy-chatroom object
    mongodb.deleteRoom(chatroomHash,function(){
    
      mongodb.searchForChatroomEntry({ hash: chatroomHash},function(rooms){
        expect(0).toEqual(rooms.length);
        done();
      });
    
    });
    
  });
  
});
