import { sendWhatsAppMessage } from '../../../lib/whatsapp'

export async function GET() {
  // Your personal number: 09164971382
  const result = await sendWhatsAppMessage(
    '2349164971382',
    '🎯 *Test from Cresoa via Kapso*\n\nYour WhatsApp integration is working! 🎉'
  )
  return Response.json(result)
}
