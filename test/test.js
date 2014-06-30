var googleauth = require('google-auth-cli');
var ResumableUpload = require('../index.js');
var google_secrets = require('./secrets.json');

var tokens;

var upload = function() {
  var metadata = {snippet: { title: 'New Upload', description: 'Uploaded with ResumableUpload' },
      status: { privacyStatus: 'private' }};
  var resumableUpload = new ResumableUpload(); //create new ResumableUpload
  resumableUpload.tokens = tokens;
  resumableUpload.filepath = './video.mp4';
  resumableUpload.metadata = metadata;
  resumableUpload.monitor = true;
  resumableUpload.initUpload(function(result) {
    console.log(result);
    return;
  });
}

var getTokens = function(callback) {
  googleauth({
      access_type: 'offline',
      scope: 'https://www.googleapis.com/auth/youtube.upload' //can do just 'youtube', but 'youtube.upload' is more restrictive
  },
  {		client_id: google_secrets.client_id, //replace with your client_id and _secret
      client_secret: google_secrets.client_secret,
      port: 3000
  },
  function(err, authClient, tokens) {
    console.log(tokens);
    callback(tokens);
  });
};

getTokens(function(result) {
  tokens = result;
  upload();
});
