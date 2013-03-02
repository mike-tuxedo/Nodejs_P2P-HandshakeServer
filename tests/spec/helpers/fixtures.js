var properties = require('./properties');
var mongodb = require('../../../db/mongodb');

mongodb.insertRoom(properties.chatroom_hash, null);
mongodb.insertUser(properties.chatroom_hash, properties.host_hash, null);