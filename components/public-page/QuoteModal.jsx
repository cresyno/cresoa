'use client'

import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default function QuoteModal({ open, onClose, businessId, businessName }) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  if (!open) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name || !message) return
    setSubmitting(true)
    try {
      const { error } = await supabase
        .from('public_quotes')
        .insert({
          business_id: businessId,
          customer_name: name,
          customer_phone: phone,
          customer_email: email,
          message,
          status: 'new',
        })
      if (error) throw error
      setSuccess(true)
      setTimeout(() => {
        onClose()
        setName('')
        setPhone('')
        setEmail('')
        setMessage('')
        setSuccess(false)
      }, 2000)
    } catch (err) {
      alert('Failed to submit: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: '1rem' }}>
      <div style={{ background: '#fff', borderRadius: '16px', padding: '1.5rem', maxWidth: '400px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.8rem' }}>
          <h3 style={{ margin: 0 }}>Request a Quote</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer' }}>×</button>
        </div>
        {success ? (
          <p style={{ color: 'green', textAlign: 'center', fontWeight: 700 }}>✅ Quote request sent! We'll be in touch.</p>
        ) : (
          <form onSubmit={handleSubmit}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem' }}>Name *</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} required style={inputStyle} />
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, margin: '0.8rem 0 0.3rem' }}>Phone</label>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} style={inputStyle} />
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, margin: '0.8rem 0 0.3rem' }}>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} />
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, margin: '0.8rem 0 0.3rem' }}>Message *</label>
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} required rows={4} style={{ ...inputStyle, resize: 'vertical' }} />
            <button type="submit" disabled={submitting} style={{ marginTop: '1rem', width: '100%', padding: '0.7rem', borderRadius: '8px', border: 'none', background: '#D4A52A', color: '#fff', fontWeight: 700 }}>
              {submitting ? 'Sending...' : 'Send Request'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

const inputStyle = {
  width: '100%', padding: '0.7rem 0.9rem', borderRadius: '8px', border: '1px solid #ccc', fontSize: '0.95rem', boxSizing: 'border-box', marginBottom: '0.5rem'
                 }
