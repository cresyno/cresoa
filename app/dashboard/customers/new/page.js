'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabaseClient'
import { getPlanLimits } from '../../../lib/planLimits'

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
  const [businessId, setBusinessId] = useState(null)
  const [sector, setSector] = useState(null)
  const [plan, setPlan] = useState('free')
  const [currentCustomerCount, setCurrentCustomerCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [measurements, setMeasurements] = useState({})
  const [saveAndAdd, setSaveAndAdd] = useState(false)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data: business } = await supabase
        .from('businesses')
        .select('id, sector, plan')
        .eq('owner_id', user.id)
        .single()

      if (!business) {
        router.push('/onboarding')
        return
      }

      setBusinessId(business.id)
      setSector(business.sector)
      setPlan(business.plan || 'free')

      // Count existing customers
      const { count, error } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', business.id)

      if (!error) {
        setCurrentCustomerCount(count || 0)
      }

      setLoading(false)
    }

    load()
  }, [router])

  const updateMeasurement = (key, value) => {
    setMeasurements({ ...measurements, [key]: value })
  }

  const handlePhoneChange = (e) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 11)
    setPhone(digits)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMessage('')
    setSaving(true)

    const phoneDigits = phone.replace(/\D/g, '')
    if (!name.trim() || phoneDigits.length !== 11) {
      setMessage('Please provide a name and a valid 11-digit phone number.')
      setSaving(false)
      return
    }

    // ✅ Check free plan limit
    const limits = getPlanLimits(plan)
    if (currentCustomerCount >= limits.customers) {
      setMessage(`❌ You've reached the limit of ${limits.customers} customers on your Free plan. Please upgrade to add more.`)
      setSaving(false)
      return
    }

    const measurementData = sector === 'Fashion & Custom Wear' ? measurements : {}

    const { data: customer, error } = await supabase
      .from('customers')
      .insert({
        business_id: businessId,
        name: name.trim(),
        phone: phoneDigits,
        notes: notes.trim(),
        measurements: measurementData,
      })
      .select()
      .single()

    if (error) {
      setMessage('Error: ' + error.message)
      setSaving(false)
      return
    }

    setMessage('✅ Customer created!')
    setSaving(false)

    if (saveAndAdd) {
      setName('')
      setPhone('')
      setNotes('')
      setMeasurements({})
      setMessage('')
      // Refresh count
      setCurrentCustomerCount(currentCustomerCount + 1)
    } else {
      setTimeout(() => {
        router.push(`/dashboard/customers/${customer.id}`)
      }, 600)
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#F5EFE2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
          .spinner {
            width: 40px; height: 40px;
            border: 4px solid #e4d8c2;
            border-top: 4px solid #1E3A5F;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
          }
        `}</style>
        <div className="spinner"></div>
      </div>
    )
  }

  const isFashion = sector === 'Fashion & Custom Wear'
  const limits = getPlanLimits(plan)
  const canAddMore = currentCustomerCount < limits.customers

  return (
    <main style={{ minHeight: '100vh', background: '#F5EFE2', padding: '1.5rem 1.2rem' }}>
      <style>{`
        .form-card {
          background: #fff;
          border-radius: 14px;
          padding: 1.5rem;
          border: 1px solid #E8E0D5;
          max-width: 480px;
          margin: 0 auto;
        }
        .form-group { margin-bottom: 1rem; }
        .form-group label {
          display: block;
          color: #2B2620;
          margin-bottom: 0.3rem;
          font-size: 0.85rem;
          font-weight: 500;
        }
        .form-input {
          width: 100%;
          padding: 0.7rem;
          border-radius: 8px;
          border: 1px solid #E8E0D5;
          font-size: 0.95rem;
          background: #fff;
          box-sizing: border-box;
          color: #2B2620;
          transition: border-color 0.2s ease;
        }
        .form-input:focus { outline: none; border-color: #C79A2B; }
        .btn-primary {
          width: 100%;
          padding: 0.85rem;
          border-radius: 8px;
          border: none;
          background: linear-gradient(135deg, #C79A2B, #B4881E);
          color: #1E3A5F;
          font-size: 1rem;
          font-weight: 700;
          box-shadow: 0 4px 14px rgba(199,154,43,0.3);
          cursor: pointer;
          transition: transform 0.1s ease;
        }
        .btn-primary:active { transform: scale(0.98); }
        .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
        .btn-secondary {
          padding: 0.5rem 1rem;
          border-radius: 8px;
          border: 1px solid #1E3A5F;
          background: #fff;
          color: #1E3A5F;
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.1s ease;
        }
        .btn-secondary:hover { background: #F5EFE2; }
        .btn-secondary:disabled { opacity: 0.6; cursor: not-allowed; }
        .back-link {
          background: none;
          border: none;
          color: #1E3A5F;
          font-size: 0.85rem;
          padding: 0;
          margin-bottom: 1rem;
          cursor: pointer;
        }
        .back-link:hover { text-decoration: underline; }
        .header-row {
          display: flex;
          align-items: center;
          gap: 0.8rem;
          margin-bottom: 1rem;
          flex-wrap: wrap;
        }
        .header-row h1 {
          color: #1E3A5F;
          font-size: 1.3rem;
          font-weight: 700;
          margin: 0;
        }
        .measurement-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.6rem;
        }
        .measurement-grid .form-group { margin-bottom: 0.6rem; }
        .measurement-grid .form-group input { padding: 0.5rem; }
        .action-row {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
          margin-top: 0.5rem;
        }
        .action-row .btn-primary { flex: 1; }
        .action-row .btn-secondary { flex: 1; }
        .plan-limit-warning {
          background: #F1DBD3;
          border: 1px solid #AE4A34;
          border-radius: 8px;
          padding: 0.8rem 1rem;
          margin-bottom: 1rem;
          color: #AE4A34;
          font-size: 0.85rem;
          text-align: center;
        }
        @media (max-width: 420px) {
          .form-card { padding: 1rem; }
          .measurement-grid { grid-template-columns: 1fr; }
          .action-row { flex-direction: column; }
        }
      `}</style>

      <button className="back-link" onClick={() => router.push('/dashboard/customers')}>
        ← Back to customers
      </button>

      <div className="header-row">
        <h1>Add customer</h1>
        {!isFashion && <span style={{ fontSize: '0.7rem', background: '#F6E9C8', padding: '0.1rem 0.5rem', borderRadius: '10px', color: '#1E3A5F' }}>🔧 Repairs</span>}
        {plan === 'free' && (
          <span style={{ fontSize: '0.7rem', background: '#F0EDE8', padding: '0.1rem 0.5rem', borderRadius: '10px', color: '#6B6255' }}>
            Free ({currentCustomerCount}/{limits.customers} customers)
          </span>
        )}
      </div>

      {!canAddMore && (
        <div className="plan-limit-warning">
          <strong>⚠️ You've reached the limit of {limits.customers} customers on your Free plan.</strong>
          <br />
          <a href="/dashboard/subscription" style={{ color: '#AE4A34', fontWeight: '600' }}>Upgrade now to add more →</a>
        </div>
      )}

      <form onSubmit={handleSubmit} className="form-card">
        <div className="form-group">
          <label>Customer name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="form-input"
            disabled={!canAddMore}
          />
        </div>

        <div className="form-group">
          <label>Phone number</label>
          <input
            type="tel"
            inputMode="numeric"
            value={phone}
            onChange={handlePhoneChange}
            required
            placeholder="e.g. 08012345678"
            className="form-input"
            disabled={!canAddMore}
          />
          <div style={{ fontSize: '0.75rem', color: phone.length === 11 ? '#4C7A5E' : '#6B6255', marginTop: '0.2rem' }}>
            {phone.length}/11 digits {phone.length === 11 && '✓ valid'}
          </div>
        </div>

        <div className="form-group">
          <label>Notes <span style={{ fontWeight: '400', color: '#6B6255' }}>(optional)</span></label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="e.g. Customer preferences, special instructions..."
            className="form-input"
            style={{ fontFamily: 'inherit', resize: 'vertical' }}
            disabled={!canAddMore}
          />
        </div>

        {isFashion && (
          <>
            <h2 style={{ color: '#1E3A5F', fontSize: '1rem', margin: '1.2rem 0 0.6rem' }}>📏 Measurements</h2>
            <div className="measurement-grid">
              {MEASUREMENT_FIELDS.map((f) => (
                <div key={f.key} className="form-group">
                  <label style={{ fontSize: '0.75rem' }}>{f.label}</label>
                  <input
                    type="number"
                    step="0.1"
                    value={measurements[f.key] || ''}
                    onChange={(e) => updateMeasurement(f.key, e.target.value)}
                    className="form-input"
                    style={{ padding: '0.5rem' }}
                    disabled={!canAddMore}
                  />
                </div>
              ))}
            </div>
          </>
        )}

        {canAddMore ? (
          <div className="action-row">
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving...' : '💾 Save customer'}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setSaveAndAdd(!saveAndAdd)}
              style={{ background: saveAndAdd ? '#1E3A5F' : '#fff', color: saveAndAdd ? '#fff' : '#1E3A5F' }}
            >
              {saveAndAdd ? '✓ Save & add another' : 'Save & add another'}
            </button>
          </div>
        ) : (
          <div className="action-row">
            <button
              type="button"
              className="btn-primary"
              onClick={() => router.push('/dashboard/subscription')}
              style={{ background: '#AE4A34', boxShadow: '0 4px 14px rgba(174,74,52,0.3)' }}
            >
              🔒 Upgrade to add more customers
            </button>
          </div>
        )}

        {message && (
          <p style={{ marginTop: '0.8rem', fontSize: '0.85rem', color: message.startsWith('✅') ? '#4C7A5E' : '#AE4A34', textAlign: 'center' }}>
            {message}
          </p>
        )}
      </form>
    </main>
  )
}
