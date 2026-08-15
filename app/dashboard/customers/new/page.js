'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../../../lib/supabaseClient'
import { Icon } from '../../../../components/Icon'
import { Card } from '../../../../components/Card'
import { SectionHeader } from '../../../../components/SectionHeader'
import { Navigation } from '../../../../components/Navigation'
import { MeasurementForm } from '../../../../components/MeasurementForm'
import '../../../globals.css'

const STEPS = [
  { id: 1, label: 'Personal Info' },
  { id: 2, label: 'Contact' },
  { id: 3, label: 'Measurements' },
  { id: 4, label: 'Review & Save' },
]

const INITIAL_FORM = {
  first_name: '',
  last_name: '',
  phone: '',
  email: '',
  gender: '',
  age_category: '',
  address: '',
  notes: '',
  measurements: {},
}

export default function NewCustomerPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const businessId = searchParams.get('business_id')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [step, setStep] = useState(1)
  const [form, setForm] = useState(INITIAL_FORM)
  const [resolvedBusinessId, setResolvedBusinessId] = useState(null)

  // ─── Navigation helper ────────────────────────────────────
  const navigateWithBusiness = (path) => {
    const separator = path.includes('?') ? '&' : '?'
    router.push(`${path}${separator}business_id=${resolvedBusinessId}`)
  }

  // ─── Resolve business ID ──────────────────────────────────
  useEffect(() => {
    const resolveBusiness = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) { router.push('/login'); return }

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { router.push('/login'); return }

        let bizId = businessId

        if (!bizId) {
          const { data: owned } = await supabase
            .from('businesses')
            .select('id')
            .eq('owner_id', user.id)
            .maybeSingle()
          if (owned) bizId = owned.id

          if (!bizId) {
            const { data: membership } = await supabase
              .from('business_memberships')
              .select('business_id')
              .eq('user_id', user.id)
              .maybeSingle()
            if (membership) bizId = membership.business_id
          }
        }

        if (!bizId) {
          router.push('/onboarding')
          return
        }

        setResolvedBusinessId(bizId)
      } catch (err) {
        console.error('Business resolution error:', err)
        setError('Could not load business details.')
      } finally {
        setLoading(false)
      }
    }
    resolveBusiness()
  }, [businessId])

  // ─── Handlers ──────────────────────────────────────────────
  const updateField = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }))
    setError(null)
  }

  const validateStep = () => {
    if (step === 1) {
      if (!form.first_name.trim()) return 'First name is required.'
      if (!form.last_name.trim()) return 'Last name is required.'
      if (!form.phone.trim()) return 'Phone number is required.'
    }
    return null
  }

  const handleNext = () => {
    const err = validateStep()
    if (err) { setError(err); return }
    setStep(prev => Math.min(prev + 1, STEPS.length))
  }

  const handleBack = () => {
    setStep(prev => Math.max(prev - 1, 1))
    setError(null)
  }

  // ─── Submit ──────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault()

    // ─── Only proceed if we are on the review step ──────────
    if (step < STEPS.length) {
      handleNext()
      return
    }

    // ─── Step 4: Save ────────────────────────────────────────
    const err = validateStep()
    if (err) { setError(err); return }

    if (!resolvedBusinessId) {
      setError('Business could not be identified.')
      return
    }

    // ─── Prevent double submission ───────────────────────────
    if (saving) return
    setSaving(true)
    setError(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      const payload = {
        business_id: resolvedBusinessId,
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || null,
        gender: form.gender || null,
        age_category: form.age_category || null,
        address: form.address.trim() || null,
        notes: form.notes.trim() || null,
        measurements: form.measurements || {},
      }

      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(payload),
      })

      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.error || 'Could not create customer.')
      }

      const customerId = result.customer?.id || result.data?.id
      if (!customerId) throw new Error('No customer ID returned.')

      // ─── Log activity ──────────────────────────────────────
      await supabase.from('business_activity_logs').insert({
        business_id: resolvedBusinessId,
        performed_by: session.user.id,
        action: 'customer_created',
        details: { name: `${form.first_name} ${form.last_name}` },
      })

      // ─── Redirect to customer detail page ──────────────────
      navigateWithBusiness(`/dashboard/customers/${customerId}`)

    } catch (err) {
      console.error('Create customer error:', err)
      setError(err.message || 'Something went wrong. Please try again.')
      setSaving(false)
    }
  }

  // ─── Computed ──────────────────────────────────────────────
  const fullName = `${form.first_name} ${form.last_name}`.trim() || 'New customer'

  // ─── Loading skeleton ────────────────────────────────────
  if (loading) {
    return (
      <div style={{ padding: '1.5rem', maxWidth: '800px', margin: '0 auto', paddingBottom: '80px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div style={{ width: '140px', height: '24px', background: 'var(--cresoa-border)', borderRadius: '6px' }} />
          <div style={{ width: '100px', height: '24px', background: 'var(--cresoa-border)', borderRadius: '6px' }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
          {[1,2,3,4].map(i => (
            <div key={i} style={{ background: 'var(--cresoa-surface)', padding: '0.8rem 1rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', animation: 'pulse 1.5s infinite' }}>
              <div style={{ width: '60%', height: '16px', background: 'var(--cresoa-border)', borderRadius: '6px' }} />
              <div style={{ width: '40%', height: '12px', background: 'var(--cresoa-border)', borderRadius: '6px', marginTop: '0.3rem' }} />
            </div>
          ))}
        </div>
        <style>{`@keyframes pulse { 0% { opacity: 0.6; } 50% { opacity: 1; } 100% { opacity: 0.6; } }`}</style>
        <Navigation businessId={resolvedBusinessId} />
      </div>
    )
  }

  if (error && !loading && step === 1) {
    return (
      <div style={{ padding: '1.5rem', maxWidth: '800px', margin: '0 auto', paddingBottom: '80px' }}>
        <Card style={{ padding: '2rem', textAlign: 'center' }}>
          <Icon name="alert-circle" size={32} stroke="var(--cresoa-danger)" />
          <h2 style={{ margin: '0.5rem 0' }}>Couldn't load page</h2>
          <p style={{ color: 'var(--cresoa-text-muted)' }}>{error}</p>
          <button onClick={() => window.location.reload()} className="cresoa-primary-button" style={{ marginTop: '1rem' }}>Retry</button>
        </Card>
        <Navigation businessId={resolvedBusinessId} />
      </div>
    )
  }

  // ─── Main render ──────────────────────────────────────────
  return (
    <div style={{ padding: '1.5rem', maxWidth: '800px', margin: '0 auto', paddingBottom: '80px' }}>
      <Navigation businessId={resolvedBusinessId} />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <div>
          <p style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', margin: 0 }}>Customers</p>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0.2rem 0', color: 'var(--cresoa-text)' }}>New Customer</h1>
          <p style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.85rem', margin: 0 }}>Create a customer profile for orders and tracking.</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.3rem' }}>
          {STEPS.map((s, idx) => (
            <div key={s.id} style={{
              flex: 1,
              height: '6px',
              borderRadius: '99px',
              background: idx + 1 <= step ? 'var(--cresoa-accent)' : 'var(--cresoa-border)',
              transition: 'background 0.2s',
            }} />
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.3rem' }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--cresoa-text-muted)' }}>Step {step} of {STEPS.length}</span>
          <span style={{ fontSize: '0.7rem', color: 'var(--cresoa-text-muted)' }}>{STEPS[step - 1].label}</span>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div style={{ padding: '0.6rem 1rem', borderRadius: '8px', background: 'var(--cresoa-danger-soft)', color: 'var(--cresoa-danger)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Icon name="alert-circle" size={16} stroke="var(--cresoa-danger)" /> {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <Card style={{ padding: '1.5rem', marginBottom: '1rem' }}>

          {/* Step 1: Personal Info */}
          {step === 1 && (
            <div>
              <SectionHeader title="Personal Information" subtitle="Required fields are marked with *" />
              <div style={{ display: 'grid', gap: '1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.2rem' }}>First name *</label>
                    <input
                      type="text"
                      value={form.first_name}
                      onChange={(e) => updateField('first_name', e.target.value)}
                      placeholder="e.g. Amaka"
                      autoFocus
                      style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-bg)', color: 'var(--cresoa-text)' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.2rem' }}>Last name *</label>
                    <input
                      type="text"
                      value={form.last_name}
                      onChange={(e) => updateField('last_name', e.target.value)}
                      placeholder="e.g. Okafor"
                      style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-bg)', color: 'var(--cresoa-text)' }}
                    />
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.2rem' }}>Phone number *</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0 0.8rem', border: '1px solid var(--cresoa-border)', borderRadius: '8px', background: 'var(--cresoa-bg)' }}>
                    <Icon name="phone" size={16} stroke="var(--cresoa-text-muted)" />
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={(e) => updateField('phone', e.target.value)}
                      placeholder="0803 123 4567"
                      style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', color: 'var(--cresoa-text)', padding: '0.6rem 0', fontSize: '0.95rem' }}
                    />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.2rem' }}>Gender</label>
                    <select
                      value={form.gender}
                      onChange={(e) => updateField('gender', e.target.value)}
                      style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-bg)', color: 'var(--cresoa-text)' }}
                    >
                      <option value="">Not specified</option>
                      <option value="female">Female</option>
                      <option value="male">Male</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.2rem' }}>Age category</label>
                    <select
                      value={form.age_category}
                      onChange={(e) => updateField('age_category', e.target.value)}
                      style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-bg)', color: 'var(--cresoa-text)' }}
                    >
                      <option value="">Not specified</option>
                      <option value="child">Child</option>
                      <option value="adult">Adult</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Contact */}
          {step === 2 && (
            <div>
              <SectionHeader title="Contact Information" subtitle="Optional but helpful for communication" />
              <div style={{ display: 'grid', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.2rem' }}>Email address</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0 0.8rem', border: '1px solid var(--cresoa-border)', borderRadius: '8px', background: 'var(--cresoa-bg)' }}>
                    <Icon name="mail" size={16} stroke="var(--cresoa-text-muted)" />
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => updateField('email', e.target.value)}
                      placeholder="customer@example.com"
                      style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', color: 'var(--cresoa-text)', padding: '0.6rem 0', fontSize: '0.95rem' }}
                    />
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.2rem' }}>Address</label>
                  <textarea
                    value={form.address}
                    onChange={(e) => updateField('address', e.target.value)}
                    placeholder="e.g. 12 Allen Avenue, Ikeja, Lagos"
                    rows={3}
                    style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-bg)', color: 'var(--cresoa-text)', resize: 'vertical' }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Measurements */}
          {step === 3 && (
            <div>
              <SectionHeader title="Measurements" subtitle="Save sizing details for this customer (optional)" />
              <MeasurementForm
                measurements={form.measurements || {}}
                onChange={(updated) => updateField('measurements', updated)}
                showNotes={true}
              />
            </div>
          )}

          {/* Step 4: Review & Save */}
          {step === 4 && (
            <div>
              <SectionHeader title="Review & Save" subtitle="Check the details before creating the customer" />
              <div style={{ display: 'grid', gap: '0.8rem' }}>
                <Card style={{ padding: '0.8rem', background: 'var(--cresoa-surface-soft)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                    <span className="cresoa-avatar" style={{ width: '40px', height: '40px', fontSize: '16px' }}>
                      {(form.first_name?.charAt(0) || '') + (form.last_name?.charAt(0) || '') || '?'}
                    </span>
                    <div>
                      <div style={{ fontWeight: 600 }}>{fullName}</div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--cresoa-text-muted)' }}>{form.phone || 'No phone'}</div>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.3rem', marginTop: '0.5rem', fontSize: '0.85rem' }}>
                    <div><span style={{ color: 'var(--cresoa-text-muted)' }}>Gender:</span> <strong>{form.gender || '—'}</strong></div>
                    <div><span style={{ color: 'var(--cresoa-text-muted)' }}>Age:</span> <strong>{form.age_category || '—'}</strong></div>
                    <div style={{ gridColumn: '1 / -1' }}><span style={{ color: 'var(--cresoa-text-muted)' }}>Email:</span> <strong>{form.email || '—'}</strong></div>
                    <div style={{ gridColumn: '1 / -1' }}><span style={{ color: 'var(--cresoa-text-muted)' }}>Address:</span> <strong>{form.address || '—'}</strong></div>
                    {Object.keys(form.measurements || {}).filter(k => form.measurements[k]).length > 0 && (
                      <div style={{ gridColumn: '1 / -1' }}>
                        <span style={{ color: 'var(--cresoa-text-muted)' }}>Measurements:</span>
                        <strong> {Object.entries(form.measurements).filter(([_, v]) => v).map(([k, v]) => `${k}: ${v}cm`).join(', ')}</strong>
                      </div>
                    )}
                    {form.notes && (
                      <div style={{ gridColumn: '1 / -1' }}>
                        <span style={{ color: 'var(--cresoa-text-muted)' }}>Notes:</span>
                        <strong> {form.notes}</strong>
                      </div>
                    )}
                  </div>
                </Card>
              </div>
            </div>
          )}

        </Card>

                {/* ─── Buttons ─────────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap', justifyContent: 'space-between' }}>
          {step > 1 && (
            <button
              type="button"
              onClick={handleBack}
              disabled={saving}
              style={{ padding: '0.6rem 1.5rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'transparent', cursor: 'pointer', color: 'var(--cresoa-text)', fontWeight: 500 }}
            >
              <Icon name="arrow-left" size={14} stroke="currentColor" style={{ marginRight: '0.3rem' }} /> Back
            </button>
          )}

          {step < STEPS.length ? (
            <button
              type="button"
              onClick={handleNext}
              disabled={saving}
              className="cresoa-primary-button"
              style={{ padding: '0.6rem 1.5rem', marginLeft: 'auto' }}
            >
              Continue <Icon name="arrow-right" size={14} stroke="#fff" style={{ marginLeft: '0.3rem' }} />
            </button>
          ) : (
            <button
              type="submit"
              disabled={saving}
              className="cresoa-primary-button"
              style={{ padding: '0.6rem 1.5rem', marginLeft: 'auto' }}
            >
              {saving ? 'Saving...' : 'Save Customer'}
            </button>
          )}
        </div>
      </form>

      {/* ─── Footer ──────────────────────────────────────────── */}
      <div style={{ marginTop: '2rem' }}>
        <Navigation businessId={resolvedBusinessId} />
      </div>
    </div>
  )
}
              
