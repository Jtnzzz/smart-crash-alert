const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = require('twilio')(accountSid, authToken);
async function sendCrashNotification(coordinates, facilities, files = []) {
  try {
    // Link lokasi Google Maps
    const locationLink = (coordinates && coordinates.length === 2)
      ? https://www.google.com/maps?q=${coordinates[1]},${coordinates[0]}
      : 'Tidak tersedia';
    const facilityNames = facilities.map(f => f.nama).join(', ') || 'Tidak ada fasilitas terdekat';
    // Buat link video dari file upload yang disimpan di folder '/uploads'
    const fileLinks = files.length > 0
      ? files.map(f => ${process.env.BASE_URL}/uploads/${f.filename}).join('\n')
      : 'Tidak ada bukti video';
    const message = 🚨 LAPORAN KECELAKAAN BARU!\n\n +
                    📍 Lokasi: ${locationLink}\n +
                    🕒 Waktu: ${new Date().toLocaleString()}\n +
                    📎 Bukti:\n${fileLinks}\n\n +
                    _Dilaporkan melalui Smart Crash Alert System_;
    const response = await client.messages.create({
      body: message,
      from: 'whatsapp:+14155238886', // Nomor Twilio sandbox
      to: whatsapp:${process.env.WHATSAPP_RECIPIENT}
    });
    console.log(📱 WhatsApp notification sent: ${response.sid});
    return response;
  } catch (error) {
    console.error('🚨 WhatsApp API error:', error);
    throw error;
  }
}
module.exports = { sendCrashNotification };
