'use client'

import { useState } from 'react'

export default function CheckoutModal({ open, onClose, cartItems, business, page, onSuccess }) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  if (!open) return null

  const total = cartItems.reduce((sum, item) => {
    const price = parseFloat(item.price.replace(/[^\d.]/g, '')) || 0
    return sum + (price * item.quantity)
  }, 0)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name || !phone || !address) {
      setError('Please fill in all fields.')
      return
    }
    if (!cartItems.length) return

    setSubmitting(true)
    setError('')

    try {
      // 1. Save order to database
      const res = await fetch('/api/public-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_id: page.business_id,
          customer_name: name,
          customer_phone: phone,
          customer_address: address,
          items: cartItems,
          total_amount: `₦${total.toLocaleString()}`,
        }),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || 'Failed to place order')
      }

      // 2. Build WhatsApp message and redirect (no window.open)
      const itemsText = cartItems.map(item => `- ${item.name} (x${item.quantity}) - ${item.price}`).join('\n')
      const message = `Hello ${business.name},\n\nI would like to order:\n\n${itemsText}\n\nTotal: ₦${total.toLocaleString()}\n\nName: ${name}\nPhone: ${phone}\nAddress: ${address}`
      const waUrl = `https://wa.me/${business.phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`

      // Use anchor navigation (not window.open) – this is a normal link click
      window.location.href = waUrl

      setSuccess(true)
      setTimeout(() => {
        onClose()
        onSuccess()
        setName('')
        setPhone('')
        setAddress('')
        setSuccess(false)
      }, 2000)

    } catch (err) {
      setError(err.message || 'Something went wrong.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '1rem' }}>
      <div style={{ background: '#fff', borderRadius: '16px', padding: '1.5rem', maxWidth: '420px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.3rem' }}>Checkout</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
        </div>

        {success ? (
          <p style={{ color: 'green', textAlign: 'center', fontWeight: 700 }}>✅ Order placed! Redirecting to WhatsApp...</p>
        ) : (
          <form onSubmit={handleSubmit}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem' }}>Your Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              style={inputStyle}
            />

            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, margin: '0.8rem 0 0.3rem' }}>Phone Number *</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              style={inputStyle}
            />

            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, margin: '0.8rem 0 0.3rem' }}>Delivery Address *</label>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              required
              rows={2}
              style={{ ...inputStyle, resize: 'vertical' }}
            />

            <div style={{ borderTop: '1px solid #E5E7EB', marginTop: '1rem', paddingTop: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong>Total:</strong>
                <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#D4A52A' }}>₦{total.toLocaleString()}</span>
              </div>
            </div>

            {error && <p style={{ color: 'red', fontSize: '0.85rem', marginTop: '0.5rem' }}>{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              style={{
                marginTop: '1.5rem',
                width: '100%',
                padding: '0.8rem',
                borderRadius: '8px',
                border: 'none',
                background: '#25D366',
                color: '#fff',
                fontWeight: 700,
                cursor: submitting ? 'wait' : 'pointer',
                fontSize: '1rem',
              }}
            >
              {submitting ? 'Placing Order...' : 'Complete Order via WhatsApp'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

const inputStyle = {
  width: '100%',
  padding: '0.7rem 0.9rem',
  borderRadius: '8px',
  border: '1px solid #ccc',
  fontSize: '0.95rem',
  boxSizing: 'border-box',
  marginBottom: '0.5rem',
    }
