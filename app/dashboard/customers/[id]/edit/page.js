'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { supabase } from '../../../../../lib/supabaseClient'
import { Icon } from '../../../../../components/Icon'

export default function EditCustomerPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const customerId = params.id

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [businessId, setBusinessId] = useState(null)
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    email: '',
    gender: '',
    age_category: '',
    address: '',
    notes: '',
    measurements: {
      bust: '',
      waist: '',
      hips: '',
      shoulder: '',
      length: '',
      sleeve: '',
      neck: '',
      arm: '',
    },
  })

  useEffect(() => {
    const load = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/login')
          return
        }

        const bizId = searchParams.get('business_id')
        if (!bizId || bizId.length < 20) {
          const { data: membership } = await supabase
            .from('business_memberships')
            .select('business_id')
            .eq('user_id', user.id)
            .maybeSingle()
          if (membership) {
            setBusinessId(membership.business_id)
          } else {
            router.push('/dashboard')
            return
          }
        } else {
          setBusinessId(bizId)
        }

        // ─── Fetch customer data ───
        const { data: customer, error: customerError } = await supabase
          .from('customers')
          .select('*')
          .eq('id', customerId)
          .eq('business_id', bizId)
          .single()

        if (customerError) throw customerError

        // ─── Populate form ───
        const measurements = customer.measurements || {}
        setFormData({
          first_name: customer.first_name || '',
          last_name: customer.last_name || '',
          phone: customer.phone || '',
          email: customer.email || '',
          gender: customer.gender || '',
          age_category: customer.age_category || '',
          address: customer.address || '',
          notes: customer.notes || '',
          measurements: {
            bust: measurements.bust || '',
            waist: measurements.waist || '',
            hips: measurements.hips || '',
            shoulder: measurements.shoulder || '',
            length: measurements.length || '',
            sleeve: measurements.sleeve || '',
            neck: measurements.neck || '',
            arm: measurements.arm || '',
          },
        })
      } catch (err) {
        console.error(err)
        setError('Failed to load customer.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [customerId, router, searchParams])

  const handleChange = (e) => {
    const { name, value } = e.target
    if (name.startsWith('measurement_')) {
      const key = name.replace('measurement_', '')
      setFormData(prev => ({
        ...prev,
        measurements: { ...prev.measurements, [key]: value }
      }))
    } else {
      setFormData(prev => ({ ...prev, [name]: value }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      if (!businessId) {
        setError('No business selected.')
        setSaving(false)
        return
      }

      // Validate phone – must be 11 digits
      const phoneDigits = formData.phone.replace(/\D/g, '')
      if (phoneDigits.length !== 11) {
        setError('Phone number must be exactly 11 digits (e.g., 08012345678)')
        setSaving(false)
        return
      }

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('You must be logged in.')
        setSaving(false)
        return
      }

      // Filter out empty measurement values
      const measurements = {}
      Object.entries(formData.measurements).forEach(([key, value]) => {
        if (value && value.trim() !== '') {
          measurements[key] = value.trim()
        }
      })

      const payload = {
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        phone: phoneDigits,
        email: formData.email || null,
        gender: formData.gender,
        age_category: formData.age_category,
        address: formData.address || null,
        notes: formData.notes || null,
        measurements: measurements,
      }

      const response = await fetch(`/api/customers/${customerId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(payload)
      })

      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.error || 'Failed to update customer')
      }

      router.push(`/dashboard/customers?business_id=${businessId}`)
    } catch (err) {
      console.error('Error:', err)
      setError(err.message)
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Delete this customer? This will also remove their orders.')) return
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch(`/api/customers/${customerId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || 'Failed to delete customer')
      }

      router.push(`/dashboard/customers?business_id=${businessId}`)
    } catch (err) {
      console.error(err)
      alert('Failed to delete customer.')
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ width: '140px', height: '24px', background: 'var(--color-border)', borderRadius: '6px' }} />
        <div style={{ marginTop: '1.5rem' }}>
          <div style={{ width: '100%', height: '40px', background: 'var(--color-border)', borderRadius: '6px', marginBottom: '1rem' }} />
          <div style={{ width: '100%', height: '40px', background: 'var(--color-border)', borderRadius: '6px', marginBottom: '1rem' }} />
          <div style={{ width: '100%', height: '40px', background: 'var(--color-border)', borderRadius: '6px' }} />
        </div>
        <style>{`@keyframes pulse { 0% { opacity: 0.6; } 50% { opacity: 1; } 100% { opacity: 0.6; } }`}</style>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-danger)' }}>
        {error}
        <button onClick={() => window.location.reload()} style={{ marginTop: '1rem', padding: '0.5rem 1.5rem', background: 'var(--color-accent)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Retry</button>
      </div>
    )
  }

  return (
    <div style={{ padding: '1.5rem', maxWidth: '900px', margin: '0 auto', color: 'var(--color-text)' }}>
      <h1 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem' }}>Edit Customer</h1>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>Update the customer's details below.</p>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
        {/* ─── First & Last Name ─── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.3rem' }}>First Name *</label>
            <input
              type="text"
              name="first_name"
              value={formData.first_name}
              onChange={handleChange}
              required
              style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)', fontSize: '0.9rem' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.3rem' }}>Last Name *</label>
            <input
              type="text"
              name="last_name"
              value={formData.last_name}
              onChange={handleChange}
              required
              style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)', fontSize: '0.9rem' }}
            />
          </div>
        </div>

        {/* ─── Phone & Email ─── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.3rem' }}>Phone * (11 digits)</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              required
              maxLength={11}
              style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)', fontSize: '0.9rem' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.3rem' }}>Email (optional)</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)', fontSize: '0.9rem' }}
            />
          </div>
        </div>

        {/* ─── Gender & Age Category ─── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.3rem' }}>Gender *</label>
            <select
              name="gender"
              value={formData.gender}
              onChange={handleChange}
              required
              style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)', fontSize: '0.9rem' }}
            >
              <option value="">Select gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.3rem' }}>Age Category *</label>
            <select
              name="age_category"
              value={formData.age_category}
              onChange={handleChange}
              required
              style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)', fontSize: '0.9rem' }}
            >
              <option value="">Select age category</option>
              <option value="adult">Adult</option>
              <option value="child">Child</option>
            </select>
          </div>
        </div>

        {/* ─── Address ─── */}
        <div>
          <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.3rem' }}>Address (optional)</label>
          <textarea
            name="address"
            value={formData.address}
            onChange={handleChange}
            rows={2}
            style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)', fontSize: '0.9rem', resize: 'vertical' }}
          />
        </div>

        {/* ─── Measurements ─── */}
        <div style={{ background: 'var(--color-card)', padding: '1.2rem', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.8rem' }}>📏 Measurements</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '0.8rem' }}>
            {[
              { key: 'bust', label: 'Bust (cm)' },
              { key: 'waist', label: 'Waist (cm)' },
              { key: 'hips', label: 'Hips (cm)' },
              { key: 'shoulder', label: 'Shoulder (cm)' },
              { key: 'length', label: 'Length (cm)' },
              { key: 'sleeve', label: 'Sleeve (cm)' },
              { key: 'neck', label: 'Neck (cm)' },
              { key: 'arm', label: 'Arm (cm)' },
            ].map(({ key, label }) => (
              <div key={key}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '500', color: 'var(--color-text-muted)', marginBottom: '0.2rem' }}>{label}</label>
                <input
                  type="number"
                  name={`measurement_${key}`}
                  value={formData.measurements[key]}
                  onChange={handleChange}
                  step="0.1"
                  style={{ width: '100%', padding: '0.4rem', borderRadius: '6px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)', fontSize: '0.85rem' }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* ─── Notes ─── */}
        <div>
          <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.3rem' }}>Notes (optional)</label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows={3}
            style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)', fontSize: '0.9rem', resize: 'vertical' }}
          />
        </div>

        {error && <div style={{ color: 'var(--color-danger)', marginTop: '0.5rem' }}>{error}</div>}

        {/* ─── Buttons ─── */}
        <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
          <button
            type="submit"
            disabled={saving}
            style={{
              padding: '0.6rem 1.5rem',
              background: 'var(--color-accent)',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              fontWeight: '600',
              cursor: saving ? 'default' : 'pointer',
              opacity: saving ? 0.6 : 1,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.3rem'
            }}
          >
            <Icon name="check" size={16} stroke="#fff" /> {saving ? 'Saving...' : 'Save Changes'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            style={{
              padding: '0.6rem 1.5rem',
              background: 'transparent',
              border: '1px solid var(--color-border)',
              borderRadius: '6px',
              cursor: 'pointer',
              color: 'var(--color-text)'
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            style={{
              padding: '0.6rem 1.5rem',
              background: 'transparent',
              border: '1px solid var(--color-danger)',
              borderRadius: '6px',
              cursor: 'pointer',
              color: 'var(--color-danger)',
              marginLeft: 'auto',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.3rem'
            }}
          >
            <Icon name="trash-2" size={16} stroke="var(--color-danger)" /> Delete Customer
          </button>
        </div>
      </form>
    </div>
  )
                      }
