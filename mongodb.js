require('./array_prototype');

var mongodb = require('mongodb').MongoClient;
var properties = require('./properties');

//TODO: Create function for selections at mongo db, don't use always the hole dump to get unique hashes
exports.getDatabaseDump = function(callback) {

  var dump = [];

  mongodb.connect(properties.mongodbUrl + "rooms", function(err, db) {
    if (err) {
      return console.log(err);
    }

    db.collection('rooms', function(err, collection) {
      if (err) {
        return console.log(err);
      }

      collection.find().toArray(function(err, items) {
        if (err) {
          return console.log(err);
        }
        dump = items;
        callback(dump);
      });

    });
  });

  return null;
};

exports.insertRoom = function(roomHash) {
  if (!roomHash) {
    return false;
  }

  mongodb.connect(properties.mongodbUrl + "rooms", function(err, db) {
    if (err) {
      return console.log(err);
    }

    var rooms = db.collection('rooms');
    var room = {
      hash: roomHash,
      users: []
    };

    rooms.insert(room, {
      w: 1
    }, function(err, result) {
      if (err) {
        return console.log(err);
      }
    });
  });
}

exports.insertUser = function(roomHash, userId) {
  if (!roomHash || !userId) {
    return false;
  }

  mongodb.connect(properties.mongodbUrl + "rooms", function(err, db) {
    if (err) {
      return console.log(err);
    }

    exports.getDatabaseDump(function(dump) {

      var _room = dump.getObject({
        hash: roomHash
      });
      var _users = _room.users;
      _users.push({
        id: userId
      });

      db.collection('rooms').update({
        hash: roomHash
      }, {
        hash: roomHash,
        users: _users
      }, {
        w: 1
      }, function(err, result) {
        if (err) {
          return console.log(err);
        }
      });
    });

  });
}
