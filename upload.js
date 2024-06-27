// multer middleware settings

//for file upload, using npm "multer" package
const multer = require('multer');
const path = require('path');

// Set up storage for uploaded files
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'static/locations/'); // folder to save images
  },
  filename: (req, file, cb) => {
    cb(null, 'temp.jpg'); // all files are once saved as temp.jpg, then in router changing the file name with node.fs
  }
});

// Create the multer instance
const upload = multer({ storage: storage });

module.exports = upload;