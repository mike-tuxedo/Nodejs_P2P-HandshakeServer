var nodemailer = require("nodemailer");
var properties = require('./../properties');
var logger = require('./logger');

// smtp-server that takes care for the transport
var smtpTransport = nodemailer.createTransport("SMTP",{
    service: "Gmail",
    auth: {
        user: properties.smtpUsername,
        pass: properties.smtpPassword
    }
});


// param mailOptions:
// { from: "example@gmail.com", // sender address
//    to: "example2@aon.at, example3@gmail.com", // list of receivers
//    subject: "Hello, nodemailer works!", // Subject line
//    text: "Hello world ?", // plaintext body
//    html: "<b>Hello world ?</b>" // html body
//  }


/* public method */
exports.sendMail = function(mailOptions){

  smtpTransport.sendMail(mailOptions, function(error, response){
    
    var timestamp = formatTime(new Date().getTime());
    
    if(error){
      logger.error('error', timestamp + ' error while sending mail: ' + error );
    }
    else{
      logger.log('info', timestamp + ' mail sent successfully');
    }
    
  });

};

var formatTime = function(timestamp) {
  var dateTime = new Date(timestamp);
  var hours = dateTime.getHours();
  var minutes = dateTime.getMinutes();
  var seconds = dateTime.getSeconds();
  var miliseconds = dateTime.getMilliseconds();

  hours = hours < 10 ? '0' + hours : hours;
  minutes = minutes < 10 ? '0' + minutes : minutes;
  seconds = seconds < 10 ? '0' + seconds : seconds;

  if (miliseconds < 10) {
    miliseconds = "000" + miliseconds;
  } else if (miliseconds < 100) {
    miliseconds = "00" + miliseconds;
  } else if (miliseconds < 1000) {
    miliseconds = "0" + miliseconds;
  }

  return hours + ":" + minutes + ":" + seconds + ":" + miliseconds;
};