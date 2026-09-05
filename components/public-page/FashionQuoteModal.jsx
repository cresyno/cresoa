'use client'

import { useState } from 'react'
import { supabase } from '../../../lib/supabaseClient'

export default function FashionQuoteModal({ open, onClose, businessId, businessName }) {
  const [form, setForm] = useState({ name: '', phone: '', clothing_type: '', fabric_preference: '', measurements: '', deadline: '' })
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
          message: 'Custom design request',
          product_name: 'Fashion Design',
          specifications: JSON.stringify({
            clothing_type: form.clothing_type,
            fabric_preference: form.fabric_preference,
            measurements: form.measurements,
            deadline: form.deadline,
          }),
          status: 'new',
        })
      if (error) throw error
      setSuccess(true)
      setTimeout(() => {
        onClose()
        setForm({ name: '', phone: '', clothing_type: '', fabric_preference: '', measurements: '', deadline: '' })
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
          <h3 style={{ margin: 0 }}>Request Custom Design</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer' }}>×</button>
        </div>
        {success ? (
          <p style={{ color: 'green', textAlign: 'center', fontWeight: 700 }}>✅ Request sent! We'll be in touch.</p>
        ) : (
          <form onSubmit={handleSubmit}>
            <label>Name *</label>
            <input type="text" name="name" value={form.name} onChange={handleChange} required style={inputStyle} />
            <label>Phone *</label>
            <input type="tel" name="phone" value={form.phone} onChange={handleChange} required style={inputStyle} />
            <label>Clothing Type</label>
            <input type="text" name="clothing_type" value={form.clothing_type} onChange={handleChange} style={inputStyle} />
            <label>Fabric Preference</label>
            <input type="text" name="fabric_preference" value={form.fabric_preference} onChange={handleChange} style={inputStyle} />
            <label>Measurements</label>
            <textarea name="measurements" value={form.measurements} onChange={handleChange} rows={2} style={inputStyle} />
            <label>Deadline</label>
            <input type="date" name="deadline" value={form.deadline} onChange={handleChange} style={inputStyle} />
            {error && <p style={{ color: 'red', fontSize: '0.85rem' }}>{error}</p>}
            <button type="submit" disabled={submitting} style={{ marginTop: '1rem', width: '100%', padding: '0.8rem', background: '#D4A52A', color: '#fff', fontWeight: 700, border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
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
