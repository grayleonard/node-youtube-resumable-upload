var fs = require('fs');
var google = require('googleapis');
var request = require('request');

function resumableUpload() {
  this.byteCount = 0; //init variables
  this.tokens = {};
  this.filepath = '';
  this.metadata = {};
  this.monitor = false;
};

resumableUpload.prototype.getProgress = function() { //query Google API for upload progress
  var self = this;                                    //returns bytes uploaded in the header 'range'
  var options = {
    url: self.location,
    headers: {
      'Authorization': 'Bearer ' + self.tokens.access_token,
      'Content-Length': 0,
      'Content-Range': 'bytes */' + fs.statSync(this.filepath).size
    }
  };
  console.log(options);
  request.put(options, function(error, response, body) {
    self.byteCount = response.headers.range.substring(8, response.headers.range.length); //parse response
    console.log('getProgress() bytecount: ' + response.headers.range + '/' + fs.statSync(self.filepath).size);
  });
}

resumableUpload.prototype.startMonitoring = function() {
  var self = this;
  var options = {
    url: self.location,
    headers: {
      'Authorization': 'Bearer ' + self.tokens.access_token,
      'Content-Length': 0,
      'Content-Range': 'bytes */' + fs.statSync(this.filepath).size
    }
  };
  console.log(options);
  var healthCheck = function() {
    request.put(options, function(error, response, body) {
      if(!error && response.headers.range != undefined) {
        console.log(response.headers.range.substring(8, response.headers.range.length) + '/' + fs.statSync(self.filepath).size);
        if(response.headers.range == fs.statSync(self.filepath).size) {
          clearInterval(healthCheckInteral);
        }
      }
    });
  };
  var healthCheckInterval = setInterval(healthCheck, 5000);
}

resumableUpload.prototype.initUpload = function(callback) {
  //this function inits the upload, posts google for an upload URL (saved to self.location)
  var self = this;
  var options = {
      url: 'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status,contentDetails',
      headers: {
          'Host': 'www.googleapis.com',
          'Authorization': 'Bearer ' + this.tokens.access_token,
          'Content-Length': JSON.stringify(this.metadata).length,
          'Content-Type': 'application/json',
          'X-Upload-Content-Length': fs.statSync(this.filepath).size,
          'X-Upload-Content-Type': 'video/*'
      },
      body: JSON.stringify(this.metadata)
  };
  console.log(options);
  request.post(options, function(error, response, body) {
    if(!error) {
      console.log('finished request, got: ' + response.headers.location + ' as location to PUT to');
      console.log('calling back');
      self.location = response.headers.location;
      //once we get the location to upload to, we start the upload
      self.putUpload(function(result) {
        callback(result); //upload successful, returning
      });
      if(self.monitor) //start monitoring if the bool 'monitor' is true (defaults to false)
        self.startMonitoring();
    }
  });
}

resumableUpload.prototype.putUpload = function(callback) {
  //this function does the actual uploading
  var self = this;
  console.log('starting PUT request!' + self.location);
  var options = {
      url: self.location, //self.location is the Google-provided URL to PUT to
      headers: {
        'Authorization': 'Bearer ' + self.tokens.access_token,
        'Content-Length': fs.statSync(self.filepath).size - self.byteCount,
        'Content-Type': 'video/*'
      }
  };
  try {
    //creates file stream, pipes it to self.location
    var uploadpipe = fs.createReadStream(self.filepath, {start: self.byteCount, end: fs.statSync(self.filepath).size });
    uploadpipe.pipe(request.put(options)); //piping is here
    uploadpipe.on('error', function() {
      console.log('pipe error');
    });
    uploadpipe.on('close', function() {
      callback('success');
    });
  } catch(e) {
    console.log('putUpload error');
    self.getProgress();
    self.initUpload();
  }
}

module.exports = resumableUpload;
