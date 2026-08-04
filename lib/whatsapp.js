// lib/whatsapp.js
const KAPSO_API_KEY = process.env.KAPSO_API_KEY
const KAPSO_PHONE_NUMBER_ID = process.env.KAPSO_PHONE_NUMBER_ID
const KAPSO_BASE_URL = 'https://app.kapso.ai/api/meta/'

export async function sendWhatsAppMessage(phone, message) {
  let formattedPhone = phone.replace(/\D/g, '')
  if (formattedPhone.startsWith('0')) {
    formattedPhone = '234' + formattedPhone.slice(1)
  }

  const url = `${KAPSO_BASE_URL}v20.0/${KAPSO_PHONE_NUMBER_ID}/messages`

  console.log('📤 Sending WhatsApp via Kapso:', { url, to: formattedPhone, message })

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'X-API-Key': KAPSO_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: formattedPhone,
        type: 'text',
        text: { body: message }
      })
    })

    const data = await response.json()
    console.log('📥 Kapso response:', data)

    if (!response.ok) {
      return { success: false, error: data.error?.message || 'Unknown error', details: data }
    }
    return { success: true, data }
  } catch (error) {
    console.error('Kapso send error:', error)
    return { success: false, error: error.message }
  }
}
