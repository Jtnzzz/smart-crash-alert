// middleware/upload.js
const multer = require('multer');
const path = require('path');

// Penyimpanan file
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads'));
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const ext = path.extname(file.originalname).toLowerCase();
    const filename = `${file.fieldname}_${timestamp}${ext}`;
    cb(null, filename);
  }
});

// Filter ekstensi
const fileFilter = (req, file, cb) => {
  const allowed = ['.jpeg', '.jpg', '.png', '.gif', '.mp4', '.mov', '.avi'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Format file tidak diizinkan!'), false);
  }
};

// Konfigurasi multer
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB
}).fields([
  { name: 'file1', maxCount: 1 },
  { name: 'file2', maxCount: 1 },
  { name: 'file3', maxCount: 1 }
]);

module.exports = upload;
