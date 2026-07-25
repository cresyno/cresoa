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

export default function NewCustomerPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [measurements, setMeasurements] = useState({})
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handlePhoneChange = (e) => {
    const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 11)
    setPhone(digitsOnly)
  }

  const updateMeasurement = (key, value) => {
    setMeasurements({ ...measurements, [key]: value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMessage('')

    if (phone.length !== 11) {
      setMessage('Phone number must be exactly 11 digits.')
      return
    }

    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
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
      setLoading(false)
      return
    }

    router.push('/dashboard')
  }

  return (
    <main style={{ minHeight: '100vh', background: '#F5EFE2', padding: '2rem 1.5rem' }}>
      <div style={{ maxWidth: '400px', margin: '0 auto' }}>
        <h1 style={{ color: '#1E3A5F', fontSize: '1.5rem', marginBottom: '1.5rem' }}>
          Add customer
        </h1>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', color: '#2B2620', marginBottom: '0.4rem', fontSize: '0.9rem' }}>
              Customer name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              style={{ width: '100%', padding: '0.7rem', borderRadius: '8px', border: '1px solid #ccc', fontSize: '1rem', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', color: '#2B2620', marginBottom: '0.4rem', fontSize: '0.9rem' }}>
              Phone number
            </label>
            <input
              type="tel"
              value={phone}
              onChange={handlePhoneChange}
              required
              placeholder="e.g. 08012345678"
              style={{ width: '100%', padding: '0.7rem', borderRadius: '8px', border: '1px solid #ccc', fontSize: '1rem', boxSizing: 'border-box' }}
            />
            <p style={{ fontSize: '0.78rem', color: phone.length === 11 ? '#4C7A5E' : '#6B6255', marginTop: '0.3rem' }}>
              {phone.length}/11 digits
            </p>
          </div>

          <h2 style={{ color: '#1E3A5F', fontSize: '1rem', margin: '1.5rem 0 0.8rem' }}>
            Measurements (optional)
          </h2>

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
            <label style={{ display: 'block', color: '#2B2620', marginBottom: '0.4rem', fontSize: '0.9rem' }}>
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              style={{ width: '100%', padding: '0.7rem', borderRadius: '8px', border: '1px solid #ccc', fontSize: '1rem', boxSizing: 'border-box' }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: 'none', background: '#1E3A5F', color: '#fff', fontSize: '1rem', fontWeight: '600' }}
          >
            {loading ? 'Saving...' : 'Save customer'}
          </button>

          {message && <p style={{ marginTop: '1rem', color: '#AE4A34', fontSize: '0.9rem' }}>{message}</p>}
        </form>
      </div>
    </main>
  )
                }
