node-youtube-resumable-upload
=============================

Upload large videos to youtube via Google's 'resumable upload' API

Benchmarked with an 800mb video - this module bypasses the filesize restrictions on node's `fs.readFileSync()` (used by the official googleapis node client for uploading) by using `fs.createReadStream()` and then piping the stream to Youtube's servers.

How to Use
==========

Install with `npm install node-youtube-resumable-upload`

If all goes right, the module returns the video metadata that Google responds with on a successful upload.

Look at test/test.js for a use-case example, but this is the gist of it:
```
var ResumableUpload = require('node-youtube-resumable-upload');
var resumableUpload = new ResumableUpload(); //create new ResumableUpload
  resumableUpload.tokens = tokens; //Google OAuth2 tokens
  resumableUpload.filepath = './video.mp4';
  resumableUpload.metadata = metadata; //include the snippet and status for the video
  resumableUpload.monitor = true;
  resumableUpload.initUpload(function(result) {
    console.log(result);
  });
```
