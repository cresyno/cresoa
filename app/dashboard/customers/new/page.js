'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../../lib/supabaseClient'

const MEASUREMENT_FIELDS = [
  { key: 'bust', label: 'Bust/Chest (inches)' },
  { key: 'waist', label: 'Waist (inches)' },
  { key: 'hip', label: 'Hip (inches)' },
  { key: 'shoulder', label: 'Shoulder (inches)' },
  { key: 'sleeve_length', label: 'Sleeve length (inches)' },
  { key: 'full_length', label: 'Full length (inches)' },
]

const PRESETS = {
  male: { bust: '38', waist: '32', hip: '38', shoulder: '17', sleeve_length: '24', full_length: '42' },
  female: { bust: '36', waist: '28', hip: '38', shoulder: '15', sleeve_length: '22', full_length: '40' },
  child: { bust: '26', waist: '22', hip: '26', shoulder: '11', sleeve_length: '16', full_length: '28' },
}

export default function NewCustomerPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [measurements, setMeasurements] = useState({})
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [duplicateWarning, setDuplicateWarning] = useState(null)

  const handlePhoneChange = async (e) => {
    const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 11)
    setPhone(digitsOnly)
    setDuplicateWarning(null)

    if (digitsOnly.length === 11) {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: business } = await supabase
        .from('businesses')
        .select('id')
        .eq('owner_id', user.id)
        .single()

      const { data: existing } = await supabase
        .from('customers')
        .select('name')
        .eq('business_id', business.id)
        .eq('phone', digitsOnly)
        .maybeSingle()

      if (existing) {
        setDuplicateWarning(`${existing.name} already has this phone number saved.`)
      }
    }
  }

  const updateMeasurement = (key, value) => {
    setMeasurements({ ...measurements, [key]: value })
  }

  const resetForm = () => {
    setName('')
    setPhone('')
    setNotes('')
    setMeasurements({})
    setDuplicateWarning(null)
  }

  const saveCustomer = async () => {
    if (phone.length !== 11) {
      setMessage('Phone number must be exactly 11 digits.')
      return null
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return null
    }

    const { data: business } = await supabase
      .from('businesses')
      .select('id')
      .eq('owner_id', user.id)
      .single()

    const { error } = await supabase
      .from('customers')
      .insert({
        business_id: business.id,
        name: name,
        phone: phone,
        notes: notes,
        measurements: measurements,
      })

    if (error) {
      setMessage('Error: ' + error.message)
      return null
    }

    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMessage('')
    setLoading(true)
    const success = await saveCustomer()
    setLoading(false)
    if (success) {
      router.push('/dashboard')
    }
  }

  const handleSaveAndAddAnother = async () => {
    setMessage('')
    setLoading(true)
    const success = await saveCustomer()
    setLoading(false)
    if (success) {
      resetForm()
      setMessage('Saved! Add the next customer.')
    }
  }

  const inputStyle = {
    width: '100%', padding: '0.7rem', borderRadius: '8px',
    border: '1px solid #ccc', fontSize: '1rem', boxSizing: 'border-box'
  }
  const labelStyle = { display: 'block', color: '#2B2620', marginBottom: '0.4rem', fontSize: '0.9rem' }

  return (
    <main style={{ minHeight: '100vh', background: '#F5EFE2', padding: '2rem 1.5rem' }}>
      <div style={{ maxWidth: '400px', margin: '0 auto' }}>
        <h1 style={{ color: '#1E3A5F', fontSize: '1.5rem', marginBottom: '1.5rem' }}>
          Add customer
        </h1>

        <form onSubmit={handleSubmit} style={{ background: '#fff', borderRadius: '14px', padding: '1.5rem', border: '1px solid #e4d8c2' }}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={labelStyle}>Customer name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} required style={inputStyle} />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={labelStyle}>Phone number</label>
            <input
              type="tel"
              inputMode="numeric"
              pattern="[0-9]*"
              value={phone}
              onChange={handlePhoneChange}
              required
              placeholder="e.g. 08012345678"
              style={inputStyle}
            />
            <p style={{ fontSize: '0.78rem', color: phone.length === 11 ? '#4C7A5E' : '#6B6255', marginTop: '0.3rem' }}>
              {phone.length}/11 digits
            </p>
            {duplicateWarning && (
              <p style={{ fontSize: '0.78rem', color: '#AE4A34', marginTop: '0.3rem' }}>
                ⚠ {duplicateWarning}
              </p>
            )}
          </div>

          <h2 style={{ color: '#1E3A5F', fontSize: '1rem', margin: '1.5rem 0 0.8rem' }}>
            Measurements (optional)
          </h2>

          <p style={{ fontSize: '0.78rem', color: '#6B6255', marginBottom: '0.6rem' }}>
            Quick-fill a starting point, then adjust:
          </p>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
            <button type="button" onClick={() => setMeasurements(PRESETS.male)} style={{ flex: 1, padding: '0.5rem', borderRadius: '8px', border: '1px solid #1E3A5F', background: '#fff', color: '#1E3A5F', fontSize: '0.8rem', fontWeight: '600' }}>Male</button>
            <button type="button" onClick={() => setMeasurements(PRESETS.female)} style={{ flex: 1, padding: '0.5rem', borderRadius: '8px', border: '1px solid #1E3A5F', background: '#fff', color: '#1E3A5F', fontSize: '0.8rem', fontWeight: '600' }}>Female</button>
            <button type="button" onClick={() => setMeasurements(PRESETS.child)} style={{ flex: 1, padding: '0.5rem', borderRadius: '8px', border: '1px solid #1E3A5F', background: '#fff', color: '#1E3A5F', fontSize: '0.8rem', fontWeight: '600' }}>Child</button>
          </div>

          {MEASUREMENT_FIELDS.map((f) => (
            <div key={f.key} style={{ marginBottom: '0.8rem' }}>
              <label style={{ display: 'block', color: '#2B2620', marginBottom: '0.3rem', fontSize: '0.85rem' }}>
                {f.label}
              </label>
              <input
                type="number"
                step="0.1"
                value={measurements[f.key] || ''}
                onChange={(e) => updateMeasurement(f.key, e.target.value)}
                style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #ccc', fontSize: '0.95rem', boxSizing: 'border-box' }}
              />
            </div>
          ))}

          <div style={{ marginBottom: '1.5rem', marginTop: '1rem' }}>
            <label style={labelStyle}>Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              style={inputStyle}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: 'none', background: '#1E3A5F', color: '#fff', fontSize: '1rem', fontWeight: '600', marginBottom: '0.6rem' }}
          >
            {loading ? 'Saving...' : 'Save customer'}
          </button>

          <button
            type="button"
            onClick={handleSaveAndAddAnother}
            disabled={loading}
            style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #1E3A5F', background: '#fff', color: '#1E3A5F', fontSize: '0.95rem', fontWeight: '600' }}
          >
            Save & add another
          </button>

          {message && (
            <p style={{ marginTop: '1rem', color: message.startsWith('Error') || message.startsWith('Phone') ? '#AE4A34' : '#4C7A5E', fontSize: '0.9rem' }}>
              {message}
            </p>
          )}
        </form>
      </div>
    </main>
  )
  }
