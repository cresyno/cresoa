'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { supabase } from '../../../../../lib/supabaseClient'
import { getCurrentBusinessId } from '../../../../../lib/getBusinessId'
import { Icon } from '../../../../../components/Icon'
import { Card } from '../../../../../components/Card'
import { SectionHeader } from '../../../../../components/SectionHeader'
import { Navigation } from '../../../../../components/Navigation'
import { MeasurementForm } from '../../../../../components/MeasurementForm'
import '../../../../globals.css'

export default function EditCustomerPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const customerId = params.id

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
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
    measurements: {},
  })

  // ─── Navigation helper ────────────────────────────────────
  const navigateWithBusiness = (path) => {
    const separator = path.includes('?') ? '&' : '?'
    router.push(`${path}${separator}business_id=${businessId}`)
  }

  // ─── Load customer data ──────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { router.push('/login'); return }

        let bizId = searchParams.get('business_id')
        if (!bizId || bizId.length < 20) {
          const { data: membership } = await supabase
            .from('business_memberships')
            .select('business_id')
            .eq('user_id', user.id)
            .maybeSingle()
          if (membership) bizId = membership.business_id
        }
        if (!bizId) {
          router.push('/dashboard')
          return
        }
        setBusinessId(bizId)

        // ─── Fetch customer ──────────────────────────────────
        const { data: customer, error: customerError } = await supabase
          .from('customers')
          .select('*')
          .eq('id', customerId)
          .eq('business_id', bizId)
          .single()

        if (customerError) throw customerError

        setFormData({
          first_name: customer.first_name || '',
          last_name: customer.last_name || '',
          phone: customer.phone || '',
          email: customer.email || '',
          gender: customer.gender || '',
          age_category: customer.age_category || '',
          address: customer.address || '',
          notes: customer.notes || '',
          measurements: customer.measurements || {},
        })
      } catch (err) {
        console.error('Load customer error:', err)
        setError('Failed to load customer.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [customerId, router, searchParams])

  // ─── Handlers ──────────────────────────────────────────────
  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    setError(null)
  }

  const handleMeasurementChange = (updatedMeasurements) => {
    setFormData(prev => ({ ...prev, measurements: updatedMeasurements }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(false)

    try {
      if (!businessId) {
        setError('No business selected.')
        setSaving(false)
        return
      }

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

      const payload = {
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        phone: phoneDigits,
        email: formData.email?.trim() || null,
        gender: formData.gender || null,
        age_category: formData.age_category || null,
        address: formData.address?.trim() || null,
        notes: formData.notes?.trim() || null,
        measurements: formData.measurements || {},
      }

      const response = await fetch(`/api/customers/${customerId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(payload),
      })

      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.error || 'Failed to update customer')
      }

      // ─── Log activity ──────────────────────────────────────
      await supabase.from('business_activity_logs').insert({
        business_id: businessId,
        performed_by: session.user.id,
        action: 'customer_updated',
        details: { name: `${formData.first_name} ${formData.last_name}` },
      })

      setSuccess(true)
      setTimeout(() => {
        navigateWithBusiness(`/dashboard/customers/${customerId}`)
      }, 1200)

    } catch (err) {
      console.error('Update error:', err)
      setError(err.message)
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Delete this customer? This will also remove their orders.')) return
    setDeleting(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch(`/api/customers/${customerId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || 'Failed to delete customer')
      }

      navigateWithBusiness('/dashboard/customers')
    } catch (err) {
      console.error('Delete error:', err)
      alert('Failed to delete customer.')
      setDeleting(false)
    }
  }

  // ─── Loading skeleton ────────────────────────────────────
  if (loading) {
    return (
      <div style={{ padding: '1.5rem', maxWidth: '800px', margin: '0 auto', paddingBottom: '80px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div style={{ width: '140px', height: '24px', background: 'var(--cresoa-border)', borderRadius: '6px' }} />
          <div style={{ width: '100px', height: '24px', background: 'var(--cresoa-border)', borderRadius: '6px' }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
          {[1,2,3,4,5].map(i => (
            <div key={i} style={{ background: 'var(--cresoa-surface)', padding: '0.8rem 1rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', animation: 'pulse 1.5s infinite' }}>
              <div style={{ width: '60%', height: '16px', background: 'var(--cresoa-border)', borderRadius: '6px' }} />
              <div style={{ width: '40%', height: '12px', background: 'var(--cresoa-border)', borderRadius: '6px', marginTop: '0.3rem' }} />
            </div>
          ))}
        </div>
        <style>{`@keyframes pulse { 0% { opacity: 0.6; } 50% { opacity: 1; } 100% { opacity: 0.6; } }`}</style>
        <Navigation businessId={businessId} />
      </div>
    )
  }

  if (error && !loading) {
    return (
      <div style={{ padding: '1.5rem', maxWidth: '800px', margin: '0 auto', paddingBottom: '80px' }}>
        <Card style={{ padding: '2rem', textAlign: 'center' }}>
          <Icon name="alert-circle" size={32} stroke="var(--cresoa-danger)" />
          <h2 style={{ margin: '0.5rem 0' }}>Couldn't load customer</h2>
          <p style={{ color: 'var(--cresoa-text-muted)' }}>{error}</p>
          <button onClick={() => window.location.reload()} className="cresoa-primary-button" style={{ marginTop: '1rem' }}>Retry</button>
        </Card>
        <Navigation businessId={businessId} />
      </div>
    )
  }

  const fullName = `${formData.first_name} ${formData.last_name}`.trim() || 'Customer'

  return (
    <div style={{ padding: '1.5rem', maxWidth: '800px', margin: '0 auto', paddingBottom: '80px' }}>
      <Navigation businessId={businessId} />

      {/* Back button */}
      <button
        onClick={() => navigateWithBusiness(`/dashboard/customers/${customerId}`)}
        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cresoa-text-muted)', fontSize: '0.85rem', marginBottom: '0.5rem' }}
      >
        <Icon name="arrow-left" size={16} stroke="currentColor" /> Back to Customer
      </button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <div>
          <p style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', margin: 0 }}>Customers</p>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0.2rem 0', color: 'var(--cresoa-text)' }}>Edit Customer</h1>
          <p style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.85rem', margin: 0 }}>Update the customer's details below.</p>
        </div>
      </div>

      {/* Success / Error banners */}
      {success && (
        <div style={{ padding: '0.6rem 1rem', borderRadius: '8px', background: 'var(--cresoa-success-soft)', color: 'var(--cresoa-success)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Icon name="check-circle" size={16} stroke="var(--cresoa-success)" /> Customer updated successfully! Redirecting...
        </div>
      )}
      {error && (
        <div style={{ padding: '0.6rem 1rem', borderRadius: '8px', background: 'var(--cresoa-danger-soft)', color: 'var(--cresoa-danger)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Icon name="alert-circle" size={16} stroke="var(--cresoa-danger)" /> {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>

        {/* ─── Personal Information ──────────────────────────── */}
        <Card style={{ padding: '1.5rem', marginBottom: '1rem' }}>
          <SectionHeader title="Personal Information" subtitle="Required fields are marked with *" />
          <div style={{ display: 'grid', gap: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.2rem', color: 'var(--cresoa-text)' }}>First name *</label>
                <input
                  type="text"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  required
                  style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-bg)', color: 'var(--cresoa-text)', fontSize: '0.95rem' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.2rem', color: 'var(--cresoa-text)' }}>Last name *</label>
                <input
                  type="text"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  required
                  style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-bg)', color: 'var(--cresoa-text)', fontSize: '0.95rem' }}
                />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.2rem', color: 'var(--cresoa-text)' }}>Phone * (11 digits)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0 0.8rem', border: '1px solid var(--cresoa-border)', borderRadius: '8px', background: 'var(--cresoa-bg)' }}>
                  <Icon name="phone" size={16} stroke="var(--cresoa-text-muted)" />
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                    maxLength={11}
                    style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', color: 'var(--cresoa-text)', padding: '0.6rem 0', fontSize: '0.95rem' }}
                  />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.2rem', color: 'var(--cresoa-text)' }}>Email (optional)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0 0.8rem', border: '1px solid var(--cresoa-border)', borderRadius: '8px', background: 'var(--cresoa-bg)' }}>
                  <Icon name="mail" size={16} stroke="var(--cresoa-text-muted)" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', color: 'var(--cresoa-text)', padding: '0.6rem 0', fontSize: '0.95rem' }}
                  />
                </div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.2rem', color: 'var(--cresoa-text)' }}>Gender</label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-bg)', color: 'var(--cresoa-text)', fontSize: '0.95rem' }}
                >
                  <option value="">Not specified</option>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.2rem', color: 'var(--cresoa-text)' }}>Age category</label>
                <select
                  name="age_category"
                  value={formData.age_category}
                  onChange={handleChange}
                  style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-bg)', color: 'var(--cresoa-text)', fontSize: '0.95rem' }}
                >
                  <option value="">Not specified</option>
                  <option value="child">Child</option>
                  <option value="adult">Adult</option>
                </select>
              </div>
            </div>
          </div>
        </Card>

        {/* ─── Address ────────────────────────────────────────── */}
        <Card style={{ padding: '1.5rem', marginBottom: '1rem' }}>
          <SectionHeader title="Address" subtitle="Optional" />
          <textarea
            name="address"
            value={formData.address}
            onChange={handleChange}
            rows={2}
            placeholder="e.g. 12 Allen Avenue, Ikeja, Lagos"
            style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-bg)', color: 'var(--cresoa-text)', fontSize: '0.95rem', resize: 'vertical' }}
          />
        </Card>

        {/* ─── Measurements ──────────────────────────────────── */}
        <Card style={{ padding: '1.5rem', marginBottom: '1rem' }}>
          <SectionHeader title="Measurements" subtitle="Save sizing details for this customer (optional)" />
          <MeasurementForm
            measurements={formData.measurements || {}}
            onChange={handleMeasurementChange}
            showNotes={true}
          />
        </Card>

        {/* ─── Notes ──────────────────────────────────────────── */}
        <Card style={{ padding: '1.5rem', marginBottom: '1rem' }}>
          <SectionHeader title="Notes" subtitle="Private notes for your team" />
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows={3}
            placeholder="Add any notes about this customer..."
            style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-bg)', color: 'var(--cresoa-text)', fontSize: '0.95rem', resize: 'vertical' }}
          />
        </Card>

        {/* ─── Actions ────────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap', alignItems: 'center', marginTop: '0.5rem' }}>
          <button
            type="submit"
            disabled={saving || success}
            className="cresoa-primary-button"
            style={{ padding: '0.6rem 1.5rem' }}
          >
            <Icon name="check" size={14} stroke="#fff" style={{ marginRight: '0.3rem' }} /> {saving ? 'Saving...' : 'Save Changes'}
          </button>
          <button
            type="button"
            onClick={() => navigateWithBusiness(`/dashboard/customers/${customerId}`)}
            style={{ padding: '0.6rem 1.5rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'transparent', cursor: 'pointer', color: 'var(--cresoa-text)', fontSize: '0.9rem', fontWeight: 500 }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            style={{
              marginLeft: 'auto',
              padding: '0.6rem 1.5rem',
              borderRadius: '8px',
              border: '1px solid var(--cresoa-danger)',
              background: 'transparent',
              cursor: 'pointer',
              color: 'var(--cresoa-danger)',
              fontSize: '0.9rem',
              fontWeight: 500,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.3rem',
              opacity: deleting ? 0.6 : 1,
            }}
          >
            <Icon name="trash-2" size={14} stroke="var(--cresoa-danger)" /> {deleting ? 'Deleting...' : 'Delete Customer'}
          </button>
        </div>
      </form>

      {/* ─── Footer ──────────────────────────────────────────── */}
      <div style={{ marginTop: '2rem' }}>
        <Navigation businessId={businessId} />
      </div>
    </div>
  )
        }
