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
                    `🏥 Fasilitas Terdekat: ${facilityNames}\n` +
                    `📎 Bukti:\n${fileLinks}\n\n` +
                    `_Dilaporkan melalui Smart Crash Alert System_`;

    // Parse recipients - bisa array atau string dipisah koma
    let recipients = [];
    
    if (process.env.WHATSAPP_RECIPIENTS) {
      // Jika menggunakan WHATSAPP_RECIPIENTS (multiple)
      recipients = process.env.WHATSAPP_RECIPIENTS.split(',').map(num => num.trim());
    } else if (process.env.WHATSAPP_RECIPIENT) {
      // Fallback ke WHATSAPP_RECIPIENT (single) untuk backward compatibility
      recipients = [process.env.WHATSAPP_RECIPIENT.trim()];
    } else {
      throw new Error('No WhatsApp recipients configured. Set WHATSAPP_RECIPIENTS or WHATSAPP_RECIPIENT in environment variables.');
    }

    console.log(`📱 Sending notifications to ${recipients.length} recipient(s)...`);

    // Send messages to all recipients
    const promises = recipients.map(async (recipient) => {
      try {
        // Pastikan nomor dimulai dengan +
        const formattedNumber = recipient.startsWith('+') ? recipient : `+${recipient}`;
        
        const response = await client.messages.create({
          body: message,
          from: 'whatsapp:+14155238886', // Nomor Twilio sandbox
          to: `whatsapp:${formattedNumber}`
        });
        
        console.log(`✅ Message sent to ${formattedNumber}: ${response.sid}`);
        return {
          recipient: formattedNumber,
          success: true,
          messageId: response.sid,
          status: response.status
        };
      } catch (error) {
        console.error(`❌ Failed to send to ${recipient}:`, error.message);
        return {
          recipient: recipient,
          success: false,
          error: error.message
        };
      }
    });

    // Wait for all messages to be sent
    const results = await Promise.allSettled(promises);
    
    // Process results
    const successfulSends = results
      .filter(result => result.status === 'fulfilled' && result.value.success)
      .map(result => result.value);
    
    const failedSends = results
      .filter(result => result.status === 'fulfilled' && !result.value.success)
      .map(result => result.value);

    const rejectedPromises = results
      .filter(result => result.status === 'rejected')
      .map(result => ({ error: result.reason.message }));

    console.log(`📊 Notification Summary:`);
    console.log(`   ✅ Successful: ${successfulSends.length}`);
    console.log(`   ❌ Failed: ${failedSends.length + rejectedPromises.length}`);

    return {
      total: recipients.length,
      successful: successfulSends.length,
      failed: failedSends.length + rejectedPromises.length,
      results: {
        successful: successfulSends,
        failed: [...failedSends, ...rejectedPromises]
      }
    };

  } catch (error) {
    console.error('🚨 WhatsApp Service Error:', error);
    throw error;
  }
}

// Function to send to specific recipients (override environment config)
async function sendCrashNotificationToSpecific(coordinates, facilities, files = [], specificRecipients = []) {
  // Temporarily override recipients
  const originalRecipients = process.env.WHATSAPP_RECIPIENTS;
  process.env.WHATSAPP_RECIPIENTS = specificRecipients.join(',');
  
  try {
    const result = await sendCrashNotification(coordinates, facilities, files);
    return result;
  } finally {
    // Restore original recipients
    if (originalRecipients) {
      process.env.WHATSAPP_RECIPIENTS = originalRecipients;
    } else {
      delete process.env.WHATSAPP_RECIPIENTS;
    }
  }
}

module.exports = { 
  sendCrashNotification,
  sendCrashNotificationToSpecific 
};
