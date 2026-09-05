'use client'

import { useState } from 'react'
import { supabase } from '../../../lib/supabaseClient'

export default function PrintingQuoteModal({ open, onClose, businessId, businessName }) {
  const [form, setForm] = useState({ name: '', phone: '', print_type: 'Business Cards', quantity: '', size: '', file_url: '' })
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name || !form.phone) { setError('Name and phone are required.'); return }
    setSubmitting(true)
    setError('')
    try {
      const { error } = await supabase
        .from('business_quotes')
        .insert({
          business_id: businessId,
          customer_name: form.name,
          customer_phone: form.phone,
          message: 'Printing quote request',
          product_name: form.print_type,
          specifications: JSON.stringify({
            quantity: form.quantity,
            size: form.size,
            file_url: form.file_url,
          }),
          status: 'new',
        })
      if (error) throw error
      setSuccess(true)
      setTimeout(() => {
        onClose()
        setForm({ name: '', phone: '', print_type: 'Business Cards', quantity: '', size: '', file_url: '' })
        setSuccess(false)
      }, 2000)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) return null

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: '1rem' }}>
      <div style={{ background: '#fff', borderRadius: '16px', padding: '1.5rem', maxWidth: '450px', width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.8rem' }}>
          <h3 style={{ margin: 0 }}>Get a Printing Quote</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer' }}>×</button>
        </div>
        {success ? (
          <p style={{ color: 'green', textAlign: 'center', fontWeight: 700 }}>✅ Quote request sent! We'll be in touch.</p>
        ) : (
          <form onSubmit={handleSubmit}>
            <label>Name *</label>
            <input type="text" name="name" value={form.name} onChange={handleChange} required style={inputStyle} />
            <label>Phone *</label>
            <input type="tel" name="phone" value={form.phone} onChange={handleChange} required style={inputStyle} />
            <label>Print Type *</label>
            <select name="print_type" value={form.print_type} onChange={handleChange} style={inputStyle}>
              <option value="Business Cards">Business Cards</option>
              <option value="Flyers">Flyers</option>
              <option value="Banners">Banners</option>
              <option value="Other">Other</option>
            </select>
            <label>Quantity *</label>
            <input type="number" name="quantity" value={form.quantity} onChange={handleChange} required style={inputStyle} />
            <label>Size (optional)</label>
            <input type="text" name="size" value={form.size} onChange={handleChange} style={inputStyle} />
            <label>File Link (optional)</label>
            <input type="url" name="file_url" value={form.file_url} onChange={handleChange} style={inputStyle} />
            {error && <p style={{ color: 'red', fontSize: '0.85rem' }}>{error}</p>}
            <button type="submit" disabled={submitting} style={{ marginTop: '1rem', width: '100%', padding: '0.8rem', background: '#0F2B4A', color: '#fff', fontWeight: 700, border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
              {submitting ? 'Sending...' : 'Send Quote Request'}
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
