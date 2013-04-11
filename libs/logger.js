var winston = require('winston');

require('winston-riak').Riak;

module.exports = new (winston.Logger)({
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/production.log' })
  ],
  exceptionHandlers: [
    new winston.transports.File({ filename: 'logs/exceptions.log' })
  ]
});