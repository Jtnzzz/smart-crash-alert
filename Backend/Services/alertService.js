const Hospital = require("../models/hospitals");
const PoliceStation = require("../models/policeStation");
const FireStation = require("../models/fireStation");
const CrashReport = require("../models/crashReport");
const { sendCrashNotification } = require("../Services/whatssappService");

// 🔍 Deteksi maksimal 2 fasilitas terdekat per jenis
exports.detectNearbyFacilities = async (coordinates) => {
  const [hospitals, police, damkar] = await Promise.all([
    Hospital.find({
      koordinat: {
        $near: {
          $geometry: { type: "Point", coordinates },
          $maxDistance: 5000
        }
      }
    }).limit(2), // Maksimal 2 rumah sakit

    PoliceStation.find({
      koordinat: {
        $near: {
          $geometry: { type: "Point", coordinates },
          $maxDistance: 5000
        }
      }
    }).limit(2), // Maksimal 2 kantor polisi

    FireStation.find({
      koordinat: {
        $near: {
          $geometry: { type: "Point", coordinates },
          $maxDistance: 5000
        }
      }
    }).limit(2) // Maksimal 2 damkar
  ]);

  return [...hospitals, ...police, ...damkar];
};

// 🧾 Simpan laporan kecelakaan dan kirim notifikasi
exports.logCrashReport = async (coordinates, facilities, files = [], jenisKecelakaan = null) => {
  const reportData = {
    coordinates,
    jenisKecelakaan,
    respondedFacilities: facilities.map(f => ({
      facilityType: f.constructor.modelName,
      facilityId: f._id
    }))
  };

  const report = await CrashReport.create(reportData);

  // Kirim notifikasi WhatsApp
  try {
    await sendCrashNotification(coordinates, facilities, files, jenisKecelakaan);
  } catch (error) {
    console.error('⚠️ Gagal mengirim notifikasi WhatsApp:', error.message);
  }

  return report;
};

