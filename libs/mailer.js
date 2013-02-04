var productionLogger = require('./logger').production;
var nodemailer = require("nodemailer");
var properties = require('./../properties');


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
//   to: "example2@aon.at, example3@gmail.com", // list of receivers
//    subject: "Hello, nodemailer works!", // Subject line
//    text: "Hello world ?", // plaintext body
//    html: "<b>Hello world ?</b>" // html body
//  }


/* public method */
exports.sendMail = function(mailOptions){

  smtpTransport.sendMail(mailOptions, function(error, response){
    if(error){
      productionLogger.error('error happened while sending mail: ',error, new Date().toString());
    }
    else{
      productionLogger.log('info', 'mail sent successfully at: ' + new Date().toString() );
    }
  });

};
  