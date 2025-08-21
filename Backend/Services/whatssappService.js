const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = require('twilio')(accountSid, authToken);

async function sendCrashNotification(coordinates, facilities, files = []) {
  try {
    // Link lokasi Google Maps
    const locationLink = (coordinates && coordinates.length === 2)
      ? `https://www.google.com/maps?q=${coordinates[1]},${coordinates[0]}`
      : 'Tidak tersedia';
    
    const facilityNames = facilities.map(f => f.nama).join(', ') || 'Tidak ada fasilitas terdekat';
    
    // Buat link video dari file upload yang disimpan di folder '/uploads'
    const fileLinks = files.length > 0
      ? files.map(f => `${process.env.BASE_URL}/uploads/${f.filename}`).join('\n')
      : 'Tidak ada bukti video';
    
    const message = `🚨 LAPORAN KECELAKAAN BARU!\n\n` +
                    `📍 Lokasi: ${locationLink}\n` +
                    `🕒 Waktu: ${new Date().toLocaleString()}\n` +
                    `📎 Bukti:\n${fileLinks}\n\n` +
                    `_Dilaporkan melalui Smart Crash Alert System_`;

    // Array nomor WhatsApp yang akan menerima notifikasi (comma-separated)
    const recipients = process.env.WHATSAPP_RECIPIENTS 
      ? process.env.WHATSAPP_RECIPIENTS.split(',').map(num => num.trim()).filter(Boolean)
      : [];

    const responses = [];
    
    // Kirim pesan ke setiap nomor
    for (const recipient of recipients) {
      try {
        const response = await client.messages.create({
          body: message,
          from: 'whatsapp:+14155238886', // Nomor Twilio sandbox
          to: `whatsapp:${recipient}`
        });
        
        console.log(`📱 WhatsApp notification sent to ${recipient}: ${response.sid}`);
        responses.push({
          recipient,
          sid: response.sid,
          status: 'sent'
        });
        
        // Delay 1 detik antar pengiriman untuk menghindari rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`🚨 Failed to send WhatsApp to ${recipient}:`, error.message);
        responses.push({
          recipient,
          error: error.message,
          status: 'failed'
        });
      }
    }
    
    return responses;
    
  } catch (error) {
    console.error('🚨 WhatsApp API error:', error);
    throw error;
  }
}

module.exports = { sendCrashNotification };
