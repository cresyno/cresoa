'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../../../../lib/supabaseClient'

const Svg = ({ name, size = 20, stroke = 'currentColor' }) => {
  const icons = {
    back: <><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></>,
    user: <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></>,
    phone: <><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></>,
    mail: <><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></>,
    check: <polyline points="20 6 9 17 4 12" />,
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{icons[name]}</svg>
}

const inputStyle = {
  width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px',
  border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-bg)',
  color: 'var(--cresoa-text)', fontSize: '0.95rem', boxSizing: 'border-box'
}

const labelStyle = { display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem', color: 'var(--cresoa-text)' }

export default function NewPrintingCustomerPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const businessId = searchParams.get('business_id')

  const [form, setForm] = useState({ name: '', phone: '', email: '', address: '', notes: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) { setError('Name is required.'); return }
    if (!form.phone.trim()) { setError('Phone is required.'); return }

    setSaving(true)
    setError('')
    try {
      const nameParts = form.name.trim().split(' ')
      const firstName = nameParts[0] || ''
      const lastName = nameParts.slice(1).join(' ') || ''

      const { data: newCustomer, error: insertError } = await supabase
        .from('customers')
        .insert({
          business_id: businessId,
          sector: 'printing',
          name: form.name.trim(),
          first_name: firstName,
          last_name: lastName,
          phone: form.phone.trim(),
          email: form.email.trim() || null,
          address: form.address.trim() || null,
          notes: form.notes.trim() || null,
        })
        .select()
        .single()

      if (insertError) throw insertError

      router.push(`/dashboard/printing/customers/${newCustomer.id}?business_id=${businessId}`)
    } catch (err) {
      console.error('Error creating customer:', err)
      setError(err.message || 'Failed to create customer.')
      setSaving(false)
    }
  }

  return (
    <div style={{ padding: '1rem', maxWidth: '600px', margin: '0 auto', background: 'var(--cresoa-bg)', minHeight: '100vh', paddingBottom: '80px' }}>
      {/* Back */}
      <button onClick={() => router.push(`/dashboard/printing/customers?business_id=${businessId}`)} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cresoa-text-muted)', marginBottom: '1rem' }}>
        <Svg name="back" size={16} stroke="currentColor" /> Back to Customers
      </button>

      <div className="cresoa-card" style={{ padding: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 1.5rem' }}>New Customer</h1>

        {error && (
          <div style={{ padding: '0.6rem 1rem', borderRadius: '8px', background: 'var(--cresoa-danger-soft)', color: 'var(--cresoa-danger)', marginBottom: '1rem' }}>{error}</div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={labelStyle}>Full Name *</label>
            <input type="text" name="name" value={form.name} onChange={handleChange} placeholder="e.g. Iya Bisi" style={inputStyle} required />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={labelStyle}>Phone *</label>
            <input type="tel" name="phone" value={form.phone} onChange={handleChange} placeholder="e.g. 0803 123 4567" style={inputStyle} required />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={labelStyle}>Email (optional)</label>
            <input type="email" name="email" value={form.email} onChange={handleChange} placeholder="customer@example.com" style={inputStyle} />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={labelStyle}>Address (optional)</label>
            <input type="text" name="address" value={form.address} onChange={handleChange} placeholder="e.g. 12 Allen Avenue, Ikeja" style={inputStyle} />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={labelStyle}>Notes (optional)</label>
            <textarea name="notes" value={form.notes} onChange={handleChange} rows={3} placeholder="Any notes about this customer..." style={{ ...inputStyle, resize: 'vertical' }} />
          </div>

          <button type="submit" disabled={saving} className="cresoa-primary-button" style={{ width: '100%', justifyContent: 'center' }}>
            {saving ? 'Saving...' : 'Save Customer'}
          </button>
        </form>
      </div>
    </div>
  )
        }
