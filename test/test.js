var googleauth = require('google-auth-cli');
var ResumableUpload = require('../index.js');
var google_secrets = require('./secrets.json');

var tokens;

var upload = function() {
  var metadata = {snippet: { title: 'New Upload', description: 'Uploaded with ResumableUpload' },
      status: { privacyStatus: 'private' }};
  var resumableUpload = new ResumableUpload(); //create new ResumableUpload
  resumableUpload.tokens	= tokens;
  resumableUpload.filepath	= 'thescore.mp4';
  resumableUpload.metadata	= metadata;
  resumableUpload.monitor	= true;
  resumableUpload.retry		= -1;  //infinite retries, change to desired amount
  resumableUpload.upload();
  resumableUpload.on('progress', function(progress) {
	console.log(progress);
  });
  resumableUpload.on('error', function(error) {
	console.log(error);
  });
  resumableUpload.on('success', function(success) {
	  console.log(success);
  });
}

var getTokens = function(callback) {
  googleauth({
      access_type: 'offline',
      scope: 'https://www.googleapis.com/auth/youtube.upload' //can do just 'youtube', but 'youtube.upload' is more restrictive
  },
  {   client_id: google_secrets.client_id, //replace with your client_id and _secret
      client_secret: google_secrets.client_secret,
      timeout: 60 * 60 * 1000,  // This allows uploads to take up to an hour
      port: 3000
  },
  function(err, authClient, tokens) {
    console.log(tokens);
    callback(tokens);
    return;
  });
};

getTokens(function(result) {
  console.log('tokens:' + result);
  tokens = result;
  upload();
  return;
});
