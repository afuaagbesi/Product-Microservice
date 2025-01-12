const AWS = require('aws-sdk');
const multer = require('multer');
const multerS3 = require('multer-s3');

// AWS S3 Configuration
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY || !process.env.AWS_BUCKET_NAME) {
  throw new Error('Missing AWS S3 environment variables!');
}

const s3 = new AWS.S3();

// File upload middleware
const upload = multer({
  storage: multerS3({
    s3,
    bucket: process.env.AWS_BUCKET_NAME,
    acl: 'public-read', // Makes the uploaded file publicly accessible
    metadata: (req, file, cb) => {
      cb(null, { fieldName: file.fieldname });
    },
    key: (req, file, cb) => {
      const timestamp = Date.now();
      const fileName = file.originalname.replace(/\s+/g, '_'); // Replace spaces for better URLs
      cb(null, `products/${timestamp}_${fileName}`);
    },
  }),
  limits: {
    fileSize: 5 * 1024 * 1024, // Limit file size to 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      return cb(new Error('Only JPEG, PNG, WEBP, and GIF image files are allowed!'), false);
    }
    cb(null, true);
  },
});

// Error handling middleware for multer
const handleUploadError = (err, req, res, next) => {
  if (err) {
    return res.status(400).json({ error: err.message });
  }
  next();
};

console.log(upload);
module.exports = { upload, handleUploadError };
