const express = require("express");
const router = express.Router();
const upload = require("../middleware/upload");
const CrashReport = require("../models/crashReport");
const { detectNearbyFacilities, logCrashReport } = require("../Services/alertService");

// 🔺 POST /api/crash/upload — Kirim laporan crash
router.post("/upload", 
  upload,
  async (req, res) => {
    try {
      // === Tangani koordinat ===
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

      // === Jenis kecelakaan ===
      const jenisKecelakaan = req.body.jenisKecelakaan || "Tidak diketahui";

      // === Fasilitas terdekat ===
      const facilities = coordinates
        ? await detectNearbyFacilities(coordinates)
        : [];

      // === File video ===
      const files = req.files 
        ? Object.values(req.files).flatMap(fileArray => fileArray)
        : [];

      // === Simpan ke MongoDB ===
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

// 🔹 GET /api/crash/latest — Ambil laporan terbaru
router.get("/latest", async (req, res) => {
  try {
    const latest = await CrashReport
      .findOne({})
      .sort({ timestamp: -1 })
      .populate('respondedFacilities.facilityId');

    if (!latest) {
      return res.status(404).json({ message: "Belum ada laporan kecelakaan" });
    }

    res.json({
      coordinates: latest.coordinates,
      jenisKecelakaan: latest.jenisKecelakaan || "Tidak diketahui",
      timestamp: latest.timestamp,
      fasilitas: latest.respondedFacilities.map(f => ({
        type: f.facilityType,
        id: f.facilityId?._id || null,
        nama: f.facilityId?.nama || "Tidak diketahui"
      }))
    });
  } catch (error) {
    console.error("❌ Error ambil data latest crash:", error);
    res.status(500).json({ error: "Gagal mengambil data kecelakaan terbaru" });
  }
});

module.exports = router;
