import { sendTemplateMessage, sendWhatsAppMessage } from '../../../lib/whatsapp'

export async function GET() {
  // Your personal number: 09164971382
  const phone = '2349164971382'

  // Step 1: Send template to activate sandbox session
  const templateResult = await sendTemplateMessage(phone)

  if (!templateResult.success) {
    return Response.json({ 
      success: false, 
      step: 'template',
      error: templateResult.error,
      details: templateResult.details
    })
  }

  // Step 2: Now send a free‑form text message (optional)
  const textResult = await sendWhatsAppMessage(
    phone,
    '🎯 *Test from Cresoa via Kapso*\n\nYour WhatsApp integration is working! 🎉'
  )

  return Response.json({
    success: true,
    template: templateResult,
    text: textResult,
    message: 'Check your phone – you should have received both the template and a text message.'
  })
}
