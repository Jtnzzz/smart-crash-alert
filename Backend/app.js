const express = require('express');
const path = require('path');
const fs = require('fs');
const mime = require('mime-types');
const connectDB = require('./db');
const hospitalRoutes = require('./routes/hospitals');
const policeRoutes = require('./routes/police');
const fireStationRoutes = require('./routes/fireStation');
const crashRoutes = require('./routes/Crash');
const upload = require('./middleware/upload'); // middleware multer
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// ========================
// Middleware JSON Parsing
// ========================
app.use((req, res, next) => {
  if (req.headers['content-type'] && req.headers['content-type'].startsWith('multipart/form-data')) {
    next();
  } else {
    express.json()(req, res, next);
  }
});

// ========================
// Koneksi ke MongoDB
// ========================
connectDB();

// Debug ENV
console.log("Environment Variables:");
console.log("PORT:", process.env.PORT);
console.log("MONGODB_URI:", process.env.MONGODB_URI ? "***tersedia***" : "TIDAK TERSEDIA");

// ========================
// API ROUTES
// ========================
app.use("/api/v1/hospitals", hospitalRoutes);
app.use("/api/v1/police", policeRoutes);
app.use("/api/v1/damkar", fireStationRoutes);
app.use("/api/crash", crashRoutes);

// ========================
// Upload Video Endpoint
// ========================
app.post('/api/upload', upload, (req, res) => {
  if (!req.files || Object.keys(req.files).length === 0) {
    return res.status(400).json({ message: 'Tidak ada file yang diunggah' });
  }

  const videoUrls = Object.entries(req.files).map(([fieldname, fileArray]) => {
    const file = fileArray[0];
    return {
      fieldname,
      filename: file.filename,
      url: `${req.protocol}://${req.get('host')}/uploads/${file.filename}`
    };
  });

  res.json({
    message: 'Upload berhasil',
    files: videoUrls
  });
});

// ========================
// List Semua Video Endpoint
// ========================
app.get('/api/videos', async (req, res) => {
  try {
    const files = await fs.promises.readdir(path.join(__dirname, 'uploads'));
    const videos = files
      .filter(file => file.endsWith('.mp4'))
      .map(file => ({
        filename: file,
        url: `${req.protocol}://${req.get('host')}/uploads/${file}`
      }));
    res.json(videos);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal membaca daftar video' });
  }
});

// ========================
// STREAM VIDEO SUPPORT
// ========================

app.get('/uploads/:filename', async (req, res) => {
  const filePath = path.join(__dirname, 'uploads', req.params.filename);

  try {
    const stat = await fs.promises.stat(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (!range) {
      // ✅ Kalau browser tidak kirim Range (misalnya lewat <a> tag)
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': mime.lookup(filePath) || 'video/mp4',
      });
      fs.createReadStream(filePath).pipe(res);
      return;
    }

    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

    if (start >= fileSize) {
      res.status(416).send('Requested range not satisfiable');
      return;
    }

    const contentLength = end - start + 1;
    const contentType = mime.lookup(filePath) || 'video/mp4';

    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': contentLength,
      'Content-Type': contentType,
    });

    fs.createReadStream(filePath, { start, end }).pipe(res);

  } catch (err) {
    console.error('❌ Streaming error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


// ========================
// Root Endpoint (Cek Status)
// ========================
app.get("/", (req, res) => {
  res.json({
    message: "Smart Crash Alert API aktif",
    endpoints: {
      hospitals: "GET /api/v1/hospitals",
      police: "GET /api/v1/police",
      damkar: "GET /api/v1/damkar",
      report_crash: "POST /api/crash",
      upload_video: "POST /api/upload",
      list_video: "GET /api/videos",
      stream_video: "GET /uploads/:filename"
    }
  });
});

// ========================
// Error Handling Middleware
// ========================
app.use((err, req, res, next) => {
  console.error("🔥 Error:", err.stack);
  res.status(500).json({ error: 'Terjadi kesalahan server!' });
});

// ========================
// Start Server
// ========================
app.listen(PORT, () => {
  console.log(`🟢 Server running on http://0.0.0.0:${PORT}`);
});
