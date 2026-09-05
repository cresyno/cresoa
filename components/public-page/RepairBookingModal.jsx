'use client'

import { useState } from 'react'
import { supabase } from '../../../lib/supabaseClient'

export default function RepairBookingModal({ open, onClose, businessId, businessName }) {
  const [form, setForm] = useState({ name: '', phone: '', device_type: '', issue_description: '', preferred_date: '', urgency: 'Normal' })
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
          message: 'Repair booking request',
          product_name: 'Repair Service',
          specifications: JSON.stringify({
            device_type: form.device_type,
            issue_description: form.issue_description,
            preferred_date: form.preferred_date,
            urgency: form.urgency,
          }),
          status: 'new',
        })
      if (error) throw error
      setSuccess(true)
      setTimeout(() => {
        onClose()
        setForm({ name: '', phone: '', device_type: '', issue_description: '', preferred_date: '', urgency: 'Normal' })
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
          <h3 style={{ margin: 0 }}>Book a Repair</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer' }}>×</button>
        </div>
        {success ? (
          <p style={{ color: 'green', textAlign: 'center', fontWeight: 700 }}>✅ Booking request sent! We'll be in touch.</p>
        ) : (
          <form onSubmit={handleSubmit}>
            <label>Name *</label>
            <input type="text" name="name" value={form.name} onChange={handleChange} required style={inputStyle} />
            <label>Phone *</label>
            <input type="tel" name="phone" value={form.phone} onChange={handleChange} required style={inputStyle} />
            <label>Device Type *</label>
            <input type="text" name="device_type" value={form.device_type} onChange={handleChange} required style={inputStyle} />
            <label>Describe the Issue *</label>
            <textarea name="issue_description" value={form.issue_description} onChange={handleChange} rows={3} required style={inputStyle} />
            <label>Preferred Date</label>
            <input type="date" name="preferred_date" value={form.preferred_date} onChange={handleChange} style={inputStyle} />
            <label>Urgency</label>
            <select name="urgency" value={form.urgency} onChange={handleChange} style={inputStyle}>
              <option value="Normal">Normal</option>
              <option value="Urgent">Urgent</option>
            </select>
            {error && <p style={{ color: 'red', fontSize: '0.85rem' }}>{error}</p>}
            <button type="submit" disabled={submitting} style={{ marginTop: '1rem', width: '100%', padding: '0.8rem', background: '#2E7D5E', color: '#fff', fontWeight: 700, border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
              {submitting ? 'Sending...' : 'Book Repair'}
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
