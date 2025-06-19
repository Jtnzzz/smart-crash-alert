const express = require("express");
const router = express.Router();
const upload = require("../middleware/upload");
const { detectNearbyFacilities, logCrashReport } = require("../services/alertService");

// Gunakan middleware upload langsung sebagai fungsi
router.post("/upload", 
  (req, res, next) => {
    console.log('Headers:', req.headers);
    console.log('Content-Type:', req.headers['content-type']);
    next();
  },
  upload, // Ini adalah middleware Multer yang sudah dikonfigurasi
  async (req, res) => {
    try {
      let coordinates;
      
      // Handle coordinates
      if (typeof req.body.coordinates === 'string') {
        try {
          coordinates = JSON.parse(req.body.coordinates);
        } catch (e) {
          return res.status(400).json({ error: "Format koordinat tidak valid" });
        }
      } else {
        coordinates = req.body.coordinates;
      }
      
      if (!coordinates || !Array.isArray(coordinates)) {
        return res.status(400).json({ error: "Koordinat tidak valid" });
      }

      // 🔍 Cari fasilitas terdekat
      const facilities = await detectNearbyFacilities(coordinates);

      // 🧾 Simpan laporan ke DB
      const files = req.files 
        ? Object.values(req.files).flatMap(fileArray => fileArray)
        : [];
        
      await logCrashReport(coordinates, facilities, files);

      console.log("🚨 Kecelakaan diterima!");
      console.log("📍 Lokasi:", coordinates);
      console.log("📦 File:", req.files);

      res.status(200).json({
        message: "File dan data lokasi berhasil diterima",
        fasilitas: facilities.map(f => ({
          id: f._id,
          nama: f.nama,
          jenis: f.constructor.modelName
        })),
        files: files.map(f => f.filename)
      });

    } catch (err) {
      console.error("🚫 Error:", err);
      res.status(500).json({ error: err.message });
    }
  }
);

module.exports = router;