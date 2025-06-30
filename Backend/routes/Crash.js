// routes/Crash.js
const express = require("express");
const router = express.Router();
const upload = require("../middleware/upload");
const { detectNearbyFacilities, logCrashReport } = require("../services/alertService");

router.post("/upload", 
  upload,
  async (req, res) => {
    try {
      // ============ Handle koordinat ============
      let coordinates;
      if (typeof req.body.coordinates === 'string') {
        try {
          coordinates = JSON.parse(req.body.coordinates);
        } catch (e) {
          coordinates = null;
        }
      } else {
        coordinates = req.body.coordinates;
      }

      if (coordinates && !Array.isArray(coordinates)) {
        return res.status(400).json({ error: "Koordinat tidak valid" });
      }

      // ============ Jenis kecelakaan ============
      const jenisKecelakaan = req.body.jenisKecelakaan || "Tidak diketahui";

      // ============ Cari fasilitas =============
      const facilities = coordinates
        ? await detectNearbyFacilities(coordinates)
        : [];

      // ============ File upload ===============
      const files = req.files 
        ? Object.values(req.files).flatMap(fileArray => fileArray)
        : [];

      // ============ Simpan laporan ke DB =======
      await logCrashReport(coordinates, facilities, files, jenisKecelakaan);

      console.log("🚨 Kecelakaan diterima!");
      console.log("📍 Lokasi:", coordinates);
      console.log("🧭 Jenis:", jenisKecelakaan);
      console.log("📦 File:", req.files);

      res.status(200).json({
        message: "File dan data kecelakaan berhasil diterima",
        jenisKecelakaan,
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
