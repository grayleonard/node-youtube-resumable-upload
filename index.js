var fs			= require('fs');
var request		= require('request');
var EventEmitter	= require('events').EventEmitter;
var mime		= require('mime');

function resumableUpload() {
	this.byteCount	= 0; //init variables
	this.tokens	= {};
  this.file = '';
  this.size = 0;
  this.type = '';
	this.metadata	= {};
	this.monitor	= false;
	this.retry	= -1;
};

//Init the upload by POSTing google for an upload URL (saved to self.location)
resumableUpload.prototype.eventEmitter = new EventEmitter();

resumableUpload.prototype.initUpload = function(callback, errorback) {
	var self = this;

  // file path
  if(typeof this.file === 'string'){
    this.type = fs.statSync(this.file).size;
    this.size = mime.lookup(this.file);
  }

	var options = {
		url:	'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status,contentDetails',
		headers: {
		  'Host':			'www.googleapis.com',
		  'Authorization':		'Bearer ' + this.tokens.access_token,
		  'Content-Length':		new Buffer(JSON.stringify(this.metadata)).length,
		  'Content-Type':		'application/json',
		  'X-Upload-Content-Length':	this.size,
		  'X-Upload-Content-Type': this.type
		},
		body: JSON.stringify(this.metadata)
	};
	//Send request and start upload if success
	request.post(options, function(error, response, body) {
		if (!error) {
			if (!response.headers.location && body) {
				// bad-token, bad-metadata, etc...
				body = JSON.parse(body);
				if (body.error) {
					console.log(JSON.stringify(body.error));
					if (errorback) {
						errorback(body.error);
					}
					return;
				}
			}
			self.location = response.headers.location;
			self.putUpload(callback, errorback);
			if (self.monitor) //start monitoring (defaults to false)
				self.startMonitoring();
		} else {
			if (errorback)
				errorback(error);
		}
	});
}

//Pipes uploadPipe to self.location (Google's Location header)
resumableUpload.prototype.putUpload = function(callback, errorback) {
	var self = this;
	var options = {
		url: self.location, //self.location becomes the Google-provided URL to PUT to
		headers: {
		  'Authorization':	'Bearer ' + self.tokens.access_token,
		  'Content-Length': self.size - self.byteCount,
		  'Content-Type':	self.type
		}
	}, uploadPipe;
	try {
    // file path
    if(typeof self.file === 'string'){
      //creates file stream, pipes it to self.location
      uploadPipe = fs.createReadStream(self.file, {
        start: self.byteCount,
        end: self.size
      });
    }
    else{ // already a readable stream
      uploadPipe = self.file;
    }

		uploadPipe.pipe(request.put(options, function(error, response, body) {
			if (!error) {
				if (callback)
					callback(body);

			} else {
				if (errorback)
					errorback(error);
				if (self.retry > 0) {
					self.retry--;
					self.getProgress();
					self.initUpload();
				}
				// Allow unlimited retries
				if (self.retry == -1) {
					self.getProgress();
					self.initUpload();
				}
			}
		}));
	} catch (e) {
		//Restart upload
		if (self.retry > 0) {
			self.retry--;
			self.getProgress();
			self.initUpload();
		}
	}
}

//PUT every 5 seconds to get partial # of bytes uploaded
resumableUpload.prototype.startMonitoring = function() {
	var self = this;
	var options = {
		url: self.location,
		headers: {
		  'Authorization':	'Bearer ' + self.tokens.access_token,
		  'Content-Length':	0,
		  'Content-Range':	'bytes */' + self.size
		}
	};
	var healthCheck = function() { //Get # of bytes uploaded
		request.put(options, function(error, response, body) {
			if (!error && response.headers.range != undefined) {
				self.eventEmitter.emit('progress', response.headers.range.substring(8, response.headers.range.length) + '/' + self.size);
				if (response.headers.range == self.size {
					clearInterval(healthCheckInteral);
				}
			}
		});
	};
	var healthCheckInterval = setInterval(healthCheck, 5000);
}

//If an upload fails, get partial # of bytes. Called by putUpload()
resumableUpload.prototype.getProgress = function() {
	var self = this;
	var options = {
		url: self.location,
		headers: {
		  'Authorization':	'Bearer ' + self.tokens.access_token,
		  'Content-Length':	0,
		  'Content-Range':	'bytes */' + self.size
		}
	};
	request.put(options, function(error, response, body) {
		try {
			self.byteCount = response.headers.range.substring(8, response.headers.range.length); //parse response
		} catch (e) {
			//console.log('error');
		}
	});
}

module.exports = resumableUpload;
