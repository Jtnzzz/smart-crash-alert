// models/CrashReport.js
const mongoose = require("mongoose");

const crashReportSchema = new mongoose.Schema({
  coordinates: {
    type: [Number],
    required: false, // bisa tidak dikirim
  },
  jenisKecelakaan: {
    type: String,
    required: false, // optional juga
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  respondedFacilities: [{
    facilityType: {
      type: String,
      enum: ["Hospital", "PoliceStation", "FireStation"],
      required: true
    },
    facilityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: 'respondedFacilities.facilityType'
    }
  }]
});

crashReportSchema.index({ timestamp: -1 });

module.exports = mongoose.model("CrashReport", crashReportSchema);
