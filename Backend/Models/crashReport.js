const mongoose = require("mongoose");

const crashReportSchema = new mongoose.Schema({
  coordinates: {
    type: [Number],
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
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

// Tambahkan indeks untuk pencarian
crashReportSchema.index({ timestamp: -1 });
crashReportSchema.index({ "respondedFacilities.facilityType": 1 });

module.exports = mongoose.model("CrashReport", crashReportSchema);