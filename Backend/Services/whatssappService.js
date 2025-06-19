const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = require('twilio')(accountSid, authToken);

async function sendCrashNotification(coordinates, facilities, files = []) {
  try {
    // Format pesan
    const locationLink = `https://www.google.com/maps?q=${coordinates[1]},${coordinates[0]}`;
    const facilityNames = facilities.map(f => f.nama).join(', ') || 'Tidak ada fasilitas terdekat';
    const fileLinks = files.map(f => `${process.env.BASE_URL}/uploads/${f.filename}`).join('\n');
    
    const message = `🚨 *LAPORAN KECELAKAAN BARU!*\n\n` +
                   `📍 *Lokasi:* ${locationLink}\n` +
                   `🕒 *Waktu:* ${new Date().toLocaleString()}\n` +
                   `🏥 *Fasilitas Terdekat:* ${facilityNames}\n` +
                   `📎 *Bukti:*\n${fileLinks}\n\n` +
                   `_Dilaporkan melalui Smart Crash Alert System_`;

    // Kirim notifikasi
    const response = await client.messages.create({
      body: message,
      from: 'whatsapp:+14155238886', // Nomor sandbox Twilio
      to: `whatsapp:${process.env.WHATSAPP_RECIPIENT}`
    });

    console.log(`📱 WhatsApp notification sent: ${response.sid}`);
    return response;
  } catch (error) {
    console.error('🚨 WhatsApp API error:', error);
    throw error;
  }
}

module.exports = { sendCrashNotification };