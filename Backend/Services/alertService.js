const Hospital = require("../models/hospitals");
const PoliceStation = require("../models/policeStation");
const FireStation = require("../models/fireStation");
const CrashReport = require("../models/crashReport");
const { sendCrashNotification } = require("../Services/whatssappService");

// 🔍 Deteksi hanya 1 fasilitas terdekat per jenis
exports.detectNearbyFacilities = async (coordinates) => {
  const [hospital] = await Hospital.find({
    koordinat: {
      $near: {
        $geometry: { type: "Point", coordinates },
        $maxDistance: 5000 // 5 km
      }
    }
  }).limit(1);

  const [police] = await PoliceStation.find({
    koordinat: {
      $near: {
        $geometry: { type: "Point", coordinates },
        $maxDistance: 5000
      }
    }
  }).limit(1);

  const [damkar] = await FireStation.find({
    koordinat: {
      $near: {
        $geometry: { type: "Point", coordinates },
        $maxDistance: 5000
      }
    }
  }).limit(1);

  const result = [];
  if (hospital) result.push(hospital);
  if (police) result.push(police);
  if (damkar) result.push(damkar);

  return result;
};

// 🧾 Simpan laporan kecelakaan
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

