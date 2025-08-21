const express = require('express');
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
require('dotenv').config();

// Import WhatsApp service
const { sendCrashNotification, sendCrashNotificationToSpecific } = require('./whatsappService');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    const filename = `crash-${uniqueSuffix}${extension}`;
    cb(null, filename);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept video and image files
    const allowedMimes = [
      'video/mp4', 'video/avi', 'video/mov', 'video/wmv',
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif'
    ];
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only video and image files are allowed.'));
    }
  }
});

// Sample facilities data (you might want to use a database)
const sampleFacilities = [
  { id: 1, nama: 'RS Umum Jakarta', lat: -6.2088, lng: 106.8456, type: 'hospital' },
  { id: 2, nama: 'Polsek Metro Jaya', lat: -6.2000, lng: 106.8300, type: 'police' },
  { id: 3, nama: 'Pemadam Kebakaran DKI', lat: -6.1950, lng: 106.8220, type: 'fire_station' }
];

// Helper function to find nearby facilities
function findNearbyFacilities(lat, lng, maxDistance = 5) {
  return sampleFacilities.filter(facility => {
    const distance = calculateDistance(lat, lng, facility.lat, facility.lng);
    return distance <= maxDistance;
  }).sort((a, b) => {
    const distA = calculateDistance(lat, lng, a.lat, a.lng);
    const distB = calculateDistance(lat, lng, b.lat, b.lng);
    return distA - distB;
  }).slice(0, 3); // Return top 3 closest facilities
}

// Calculate distance between two coordinates (Haversine formula)
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function toRadians(degrees) {
  return degrees * (Math.PI/180);
}

// Routes

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Smart Crash Alert System API',
    status: 'Running',
    timestamp: new Date().toISOString(),
    endpoints: {
      'POST /api/crash/report': 'Report a crash with location and files',
      'POST /api/crash/emergency': 'Send emergency alert to specific numbers',
      'GET /api/facilities': 'Get all facilities',
      'GET /api/test-whatsapp': 'Test WhatsApp connectivity'
    }
  });
});

// Main crash reporting endpoint
app.post('/api/crash/report', upload.array('files', 5), async (req, res) => {
  try {
    console.log('📥 Received crash report...');
    
    const { latitude, longitude, description, severity = 'medium' } = req.body;
    const files = req.files || [];
    
    // Validate required fields
    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        error: 'Latitude and longitude are required'
      });
    }
    
    const coordinates = [parseFloat(longitude), parseFloat(latitude)];
    
    // Find nearby facilities
    const nearbyFacilities = findNearbyFacilities(parseFloat(latitude), parseFloat(longitude));
    
    console.log(`📍 Crash location: ${latitude}, ${longitude}`);
    console.log(`📁 Files uploaded: ${files.length}`);
    console.log(`🏥 Nearby facilities: ${nearbyFacilities.length}`);
    
    // Send WhatsApp notifications to all configured recipients
    const notificationResult = await sendCrashNotification(coordinates, nearbyFacilities, files);
    
    // Log the crash report (you might want to save to database)
    const crashReport = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      location: { latitude, longitude },
      coordinates,
      description,
      severity,
      files: files.map(f => ({
        filename: f.filename,
        originalName: f.originalname,
        size: f.size,
        url: `${process.env.BASE_URL}/uploads/${f.filename}`
      })),
      nearbyFacilities,
      notifications: notificationResult
    };
    
    console.log('💾 Crash report logged:', crashReport.id);
    
    res.json({
      success: true,
      message: `Crash report submitted successfully. Notifications sent to ${notificationResult.successful}/${notificationResult.total} recipients.`,
      data: {
        reportId: crashReport.id,
        location: crashReport.location,
        filesUploaded: files.length,
        nearbyFacilities: nearbyFacilities.length,
        notifications: notificationResult
      }
    });
    
  } catch (error) {
    console.error('❌ Error processing crash report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process crash report',
      details: error.message
    });
  }
});

// Emergency alert endpoint (for specific recipients)
app.post('/api/crash/emergency', upload.array('files', 5), async (req, res) => {
  try {
    console.log('🚨 Received emergency alert...');
    
    const { latitude, longitude, description, recipients } = req.body;
    const files = req.files || [];
    
    // Validate required fields
    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        error: 'Latitude and longitude are required'
      });
    }
    
    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Recipients array is required for emergency alerts'
      });
    }
    
    const coordinates = [parseFloat(longitude), parseFloat(latitude)];
    const nearbyFacilities = findNearbyFacilities(parseFloat(latitude), parseFloat(longitude));
    
    console.log(`🚨 Emergency at: ${latitude}, ${longitude}`);
    console.log(`📞 Alerting ${recipients.length} specific recipients`);
    
    // Send to specific recipients
    const notificationResult = await sendCrashNotificationToSpecific(
      coordinates, 
      nearbyFacilities, 
      files, 
      recipients
    );
    
    res.json({
      success: true,
      message: `Emergency alert sent to ${notificationResult.successful}/${notificationResult.total} recipients.`,
      data: {
        location: { latitude, longitude },
        recipients: recipients.length,
        notifications: notificationResult
      }
    });
    
  } catch (error) {
    console.error('❌ Error sending emergency alert:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send emergency alert',
      details: error.message
    });
  }
});

// Get all facilities
app.get('/api/facilities', (req, res) => {
  try {
    const { lat, lng, radius = 10 } = req.query;
    
    let facilities = sampleFacilities;
    
    // Filter by location if provided
    if (lat && lng) {
      facilities = findNearbyFacilities(parseFloat(lat), parseFloat(lng), parseFloat(radius));
    }
    
    res.json({
      success: true,
      data: facilities,
      total: facilities.length
    });
  } catch (error) {
    console.error('Error fetching facilities:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch facilities'
    });
  }
});

// Test WhatsApp connectivity
app.get('/api/test-whatsapp', async (req, res) => {
  try {
    console.log('🧪 Testing WhatsApp connectivity...');
    
    // Test coordinates (Jakarta)
    const testCoordinates = [106.8456, -6.2088];
    const testFacilities = [{ nama: 'Test Facility' }];
    const testFiles = [];
    
    const result = await sendCrashNotification(testCoordinates, testFacilities, testFiles);
    
    res.json({
      success: true,
      message: 'WhatsApp test completed',
      result: result
    });
  } catch (error) {
    console.error('WhatsApp test failed:', error);
    res.status(500).json({
      success: false,
      error: 'WhatsApp test failed',
      details: error.message
    });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'File too large. Maximum size is 50MB.'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        error: 'Too many files. Maximum is 5 files per request.'
      });
    }
  }
  
  console.error('Unhandled error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    availableEndpoints: [
      'POST /api/crash/report',
      'POST /api/crash/emergency',
      'GET /api/facilities',
      'GET /api/test-whatsapp'
    ]
  });
});

// Start server
app.listen(PORT, () => {
  console.log('🚀 Smart Crash Alert System started!');
  console.log(`📡 Server running on port ${PORT}`);
  console.log(`🌐 Base URL: ${process.env.BASE_URL || `http://localhost:${PORT}`}`);
  console.log('📱 WhatsApp Recipients:', process.env.WHATSAPP_RECIPIENTS || process.env.WHATSAPP_RECIPIENT || 'Not configured');
  console.log('✅ Ready to receive crash reports!');
});

module.exports = app;
