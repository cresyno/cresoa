// app/api/test-whatsapp/route.js
import { sendWhatsAppMessage } from '../../../lib/whatsapp'

export async function GET() {
  // Replace with your own phone number (with country code)
  const yourPhoneNumber = '2349049209780' // 👈 YOUR PHONE NUMBER
  
  const result = await sendWhatsAppMessage(
    yourPhoneNumber,
    '🎯 *Test Message from Cresoa!*\n\nThis is a production test from your WhatsApp integration.\n\n✅ It works perfectly!'
  )
  
  return Response.json(result)
}
