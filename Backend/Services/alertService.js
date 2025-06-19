const Hospital = require("../models/hospitals");
const PoliceStation = require("../models/policeStation");
const FireStation = require("../models/fireStation");
const CrashReport = require("../models/crashReport");
const { sendCrashNotification } = require("../Services/whatssappService"); // Tambahkan ini
const crashReport = require("../models/crashReport");

// Deteksi fasilitas terdekat
exports.detectNearbyFacilities = async (coordinates) => {
  const [hospitals, police, damkar] = await Promise.all([
    Hospital.find({
      koordinat: { 
        $near: { 
          $geometry: { type: "Point", coordinates },
          $maxDistance: 5000
        }
      }
    }),
    PoliceStation.find({
      koordinat: { 
        $near: { 
          $geometry: { type: "Point", coordinates },
          $maxDistance: 5000
        }
      }
    }),
    FireStation.find({
      koordinat: { 
        $near: { 
          $geometry: { type: "Point", coordinates },
          $maxDistance: 5000
        }
      }
    })
  ]);
  
  return [...hospitals, ...police, ...damkar];
};

// Simpan laporan kecelakaan
exports.logCrashReport = async (coordinates, facilities, files = []) => {
  const reportData = {
    coordinates,
    respondedFacilities: facilities.map(f => ({
      facilityType: f.constructor.modelName,
      facilityId: f._id
    }))
  };
  
  const report = await crashReport.create(reportData);
  
  // KIRIM NOTIFIKASI WHATSAPP
  try {
    await sendCrashNotification(coordinates, facilities, files);
  } catch (error) {
    console.error('⚠️ Gagal mengirim notifikasi WhatsApp:', error.message);
    // Tetap lanjut meskipun gagal kirim WhatsApp
  }
  
  return report;
};