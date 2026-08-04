// lib/whatsapp.js
const KAPSO_API_KEY = process.env.KAPSO_API_KEY
const KAPSO_PHONE_NUMBER_ID = process.env.KAPSO_PHONE_NUMBER_ID
const KAPSO_BASE_URL = 'https://app.kapso.ai/api/meta/'

export async function sendWhatsAppMessage(phone, message) {
  // Format phone number
  let formattedPhone = phone.replace(/\D/g, '')
  if (formattedPhone.startsWith('0')) {
    formattedPhone = '234' + formattedPhone.slice(1)
  }

  const url = `${KAPSO_BASE_URL}v20.0/${KAPSO_PHONE_NUMBER_ID}/messages`

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
    if (!response.ok) {
      console.error('Kapso API error:', data)
      return { success: false, error: data.error?.message || 'Unknown error' }
    }
    return { success: true, data }
  } catch (error) {
    console.error('WhatsApp send error:', error)
    return { success: false, error: error.message }
  }
}

export async function sendOrderStatusUpdate(order, customer, business, statusInfo) {
  const message = `🎯 *Order Update*\n\nHi ${customer?.name || 'Customer'},\n\nYour order *${order?.title || 'Order'}* is now *${statusInfo?.label || order?.current_status || 'updated'}*.\n\nThank you for choosing ${business?.name || 'us'}!`
  return await sendWhatsAppMessage(customer?.phone, message)
}

export async function sendPaymentReminder(order, customer, business, balance) {
  const message = `⚠️ *Payment Reminder*\n\nHi ${customer?.name || 'Customer'},\n\nYou have an outstanding balance of *₦${balance?.toLocaleString() || '0'}* for order *${order?.title || 'Order'}*.\n\nPlease settle your balance.`
  return await sendWhatsAppMessage(customer?.phone, message)
  }
