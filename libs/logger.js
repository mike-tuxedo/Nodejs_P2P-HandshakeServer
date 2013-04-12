var properties = require('.././properties');
var winston = require('winston');

module.exports = new (winston.Logger)({
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/production.log' })
  ],
  exceptionHandlers: [
    new winston.transports.File({ filename: 'logs/exceptions.log' })
  ]
});


if(!properties.consoleOutput){
  module.exports.remove(winston.transports.Console);
}