// app/api/test-whatsapp/route.js
import { sendWhatsAppMessage } from '../../../lib/whatsapp'

export async function GET() {
  // 👇 REPLACE WITH YOUR ACTUAL PHONE NUMBER
  const yourPhoneNumber = '2349164971382'
  
  const result = await sendWhatsAppMessage(
    yourPhoneNumber,
    '🎯 *Cresoa WhatsApp Test*\n\nThis is a production test message.\n\n✅ Your WhatsApp integration is working!'
  )
  
  return Response.json(result)
}
