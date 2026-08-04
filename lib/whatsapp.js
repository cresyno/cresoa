// lib/whatsapp.js

/**
 * Send a WhatsApp message using Meta Cloud API
 */
export async function sendWhatsAppMessage(phone, message) {
  // Format phone number: remove leading 0, add 234
  let formattedPhone = phone.replace(/\D/g, '')
  if (formattedPhone.startsWith('0')) {
    formattedPhone = '234' + formattedPhone.slice(1)
  }

  const url = `https://graph.facebook.com/v20.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: formattedPhone,
    type: 'text',
    text: { body: message }
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })
    
    const data = await response.json()
    
    if (!response.ok) {
      console.error('WhatsApp API error:', data)
      return { success: false, error: data.error?.message || 'Unknown error' }
    }
    
    return { success: true, data }
  } catch (error) {
    console.error('WhatsApp send error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Send order status update to customer
 */
export async function sendOrderStatusUpdate(order, customer, business, statusInfo) {
  const message = `🎯 *Order Update*

Hi ${customer?.name || 'Customer'},

Your order *${order?.title || 'Order'}* is now *${statusInfo?.label || order?.current_status || 'updated'}*.

${statusInfo?.message || ''}

📅 Updated: ${new Date().toLocaleDateString('en-GB')}

Thank you for choosing ${business?.name || 'us'}!`

  return await sendWhatsAppMessage(customer?.phone, message)
}

/**
 * Send payment reminder to customer
 */
export async function sendPaymentReminder(order, customer, business, balance) {
  const message = `⚠️ *Payment Reminder*

Hi ${customer?.name || 'Customer'},

This is a reminder that you have an outstanding balance of *₦${balance?.toLocaleString() || '0'}* for your order *${order?.title || 'Order'}*.

Please complete your payment at your earliest convenience.

Thank you for choosing ${business?.name || 'us'}!`

  return await sendWhatsAppMessage(customer?.phone, message)
                         }
