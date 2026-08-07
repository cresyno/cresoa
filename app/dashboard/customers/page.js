'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../../../lib/supabaseClient'
import { Icon } from '../../../../components/Icon'

export default function NewCustomerPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [businessId, setBusinessId] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    notes: '',
  })

  useEffect(() => {
    const load = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/login')
          return
        }

        // ─── Force URL param only ───
        const urlBizId = searchParams.get('business_id')
        console.log('🔍 New page: URL business_id =', urlBizId)

        if (!urlBizId || urlBizId.length < 20) {
          // If missing, try to get from membership (fallback)
          const { data: membership } = await supabase
            .from('business_memberships')
            .select('business_id')
            .eq('user_id', user.id)
            .maybeSingle()
          if (membership) {
            setBusinessId(membership.business_id)
            console.log('🔍 Fallback to membership business:', membership.business_id)
          } else {
            router.push('/dashboard')
            return
          }
        } else {
          setBusinessId(urlBizId)
        }
      } catch (err) {
        console.error(err)
        setError('Failed to load data.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [router, searchParams])

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
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

      // ─── ALERT: Show the business ID before sending ───
      const confirmMsg = `Creating customer for business ID:\n${businessId}\n\nIs this the correct business?`
      if (!confirm(confirmMsg)) {
        setSaving(false)
        return
      }

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('You must be logged in.')
        setSaving(false)
        return
      }

      console.log('📤 Sending to API with business_id:', businessId)

      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          business_id: businessId,
          name: formData.name,
          phone: formData.phone || null,
          notes: formData.notes || null,
        })
      })

      const result = await response.json()
      console.log('📥 API response:', result)

      if (!response.ok) {
        throw new Error(result.error || result.details?.message || 'Failed to create customer')
      }

      // ─── Alert success ───
      alert(`✅ Customer created successfully for business ${businessId.slice(0,8)}...`)

      router.push(`/dashboard/customers?business_id=${businessId}`)
    } catch (err) {
      console.error('❌ Frontend error:', err)
      setError(err.message)
      setSaving(false)
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
    <div style={{ padding: '1.5rem', maxWidth: '800px', margin: '0 auto', color: 'var(--color-text)' }}>
      <h1 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem' }}>New Customer</h1>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>Add a new customer to your business.</p>

      {/* ─── DEBUG: Show business ID ─── */}
      <div style={{
        background: businessId && businessId.length > 20 ? '#d4edda' : '#f8d7da',
        padding: '0.5rem 1rem',
        borderRadius: '6px',
        marginBottom: '1rem',
        border: '1px solid ' + (businessId && businessId.length > 20 ? '#c3e6cb' : '#f5c6cb'),
        fontSize: '0.9rem',
        fontWeight: '500'
      }}>
        <strong>Business ID being used:</strong> {businessId || 'none'}
        {businessId && businessId.length > 20 ? ' ✅ (valid)' : ' ❌ (invalid or missing)'}
        <br />
        <span style={{ fontSize: '0.8rem', fontWeight: '400' }}>
          {businessId && businessId.length > 20 ? `This is the ID from the URL: ${businessId.slice(0,8)}...` : 'Make sure your URL has ?business_id=...'}
        </span>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.3rem' }}>Name *</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            placeholder="e.g. Aisha Bello"
            style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)', fontSize: '0.9rem' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.3rem' }}>Phone (optional)</label>
          <input
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            placeholder="e.g. 08012345678"
            style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)', fontSize: '0.9rem' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.3rem' }}>Notes (optional)</label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows={3}
            placeholder="Any extra information about this customer..."
            style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)', fontSize: '0.9rem', resize: 'vertical' }}
          />
        </div>

        {error && <div style={{ color: 'var(--color-danger)', marginTop: '0.5rem' }}>{error}</div>}

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
            <Icon name="plus" size={16} stroke="#fff" /> {saving ? 'Creating...' : 'Create Customer'}
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
        </div>
      </form>
    </div>
  )
  }
