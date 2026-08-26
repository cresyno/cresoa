'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../../../../lib/supabaseClient'

// ─── Self-contained SVG icons ───
const Svg = ({ name, size = 20, stroke = 'currentColor', style }) => {
  const icons = {
    'arrow-left': <polyline points="15 18 9 12 15 6" />,
    'arrow-right': <polyline points="9 18 15 12 9 6" />,
    'check-circle': <><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></>,
    'alert-circle': <><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></>,
    'phone': <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />,
    'mail': <><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></>,
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>{icons[name]}</svg>
}

// ─── Constants & helpers ───
const STEPS = [
  { id: 1, label: 'Personal Info' },
  { id: 2, label: 'Contact' },
  { id: 3, label: 'Review & Save' },
]

const INITIAL_FORM = {
  first_name: '',
  last_name: '',
  phone: '',
  email: '',
  address: '',
  notes: '',
}

const inputStyle = {
  width: '100%',
  padding: '0.6rem 0.8rem',
  borderRadius: '8px',
  border: '1px solid var(--cresoa-border)',
  background: 'var(--cresoa-bg)',
  color: 'var(--cresoa-text)',
  fontSize: '0.95rem',
  boxSizing: 'border-box',
}

const labelStyle = {
  display: 'block',
  fontSize: '0.85rem',
  fontWeight: 600,
  marginBottom: '0.2rem',
  color: 'var(--cresoa-text)',
}

export default function RepairsNewCustomerPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const businessId = searchParams.get('business_id')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [successMessage, setSuccessMessage] = useState('')
  const [step, setStep] = useState(1)
  const [form, setForm] = useState(INITIAL_FORM)
  const [resolvedBusinessId, setResolvedBusinessId] = useState(null)

  // ─── Resolve business ID (sector-scoped) ───
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

        // Verify business sector is repairs
        const { data: bizData } = await supabase
          .from('businesses')
          .select('sector')
          .eq('id', bizId)
          .maybeSingle()
        if (bizData && bizData.sector !== 'repairs') {
          router.push(`/dashboard?business_id=${bizId}`)
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

  // ─── Handlers ───
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
    setSuccessMessage('')
  }

  // ─── Submit ───
  const handleSubmit = async (e) => {
    e.preventDefault()

    if (step < STEPS.length) {
      handleNext()
      return
    }

    const err = validateStep()
    if (err) { setError(err); return }

    if (!resolvedBusinessId) {
      setError('Business could not be identified.')
      return
    }

    if (saving) return
    setSaving(true)
    setError(null)
    setSuccessMessage('')

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      // Insert directly with sector scoping
      const { data: customer, error: insertError } = await supabase
        .from('customers')
        .insert({
          business_id: resolvedBusinessId,
          sector: 'repairs',
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim(),
          phone: form.phone.trim(),
          email: form.email.trim() || null,
          address: form.address.trim() || null,
          notes: form.notes.trim() || null,
        })
        .select()
        .single()

      if (insertError) throw insertError

      // Log activity
      await supabase.from('business_activity_logs').insert({
        business_id: resolvedBusinessId,
        performed_by: session.user.id,
        action: 'customer_created',
        details: { name: `${form.first_name} ${form.last_name}` },
      })

      setSuccessMessage('✅ Customer created successfully! Redirecting...')
      setSaving(false)

      setTimeout(() => {
        router.push(`/dashboard/repairs/customers/${customer.id}?business_id=${resolvedBusinessId}`)
      }, 1500)

    } catch (err) {
      console.error('Create repair customer error:', err)
      setError(err.message || 'Something went wrong. Please try again.')
      setSaving(false)
    }
  }

  const fullName = `${form.first_name} ${form.last_name}`.trim() || 'New customer'

  // ─── Loading skeleton ───
  if (loading) {
    return (
      <div style={{ padding: '1rem', maxWidth: '800px', margin: '0 auto', background: 'var(--cresoa-bg)', minHeight: '100vh' }}>
        <div className="cresoa-skeleton-card" style={{ marginBottom: '1rem' }}>
          <div className="cresoa-skeleton medium" />
          <div className="cresoa-skeleton short" />
        </div>
        <div className="cresoa-loading-grid">
          {[1, 2, 3].map(i => (
            <div key={i} className="cresoa-skeleton-card">
              <div className="cresoa-skeleton medium" />
              <div className="cresoa-skeleton short" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ─── Main render ───
  return (
    <div style={{ padding: '1rem', maxWidth: '800px', margin: '0 auto', background: 'var(--cresoa-bg)', minHeight: '100vh', paddingBottom: '80px' }}>
      {/* Header */}
      <div style={{ marginBottom: '1rem' }}>
        <p style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', margin: 0 }}>Customers</p>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0.2rem 0', color: 'var(--cresoa-text)' }}>New Customer</h1>
        <p style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.85rem', margin: 0 }}>Create a repair customer profile.</p>
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
          <Svg name="alert-circle" size={16} stroke="var(--cresoa-danger)" /> {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="cresoa-card" style={{ padding: '1.5rem', marginBottom: '1rem' }}>
          {/* Step 1: Personal Info */}
          {step === 1 && (
            <div>
              <div className="cresoa-section-header">
                <div>
                  <h3 className="cresoa-section-header-title">Personal Information</h3>
                  <p className="cresoa-section-header-subtitle">Required fields are marked with *</p>
                </div>
              </div>
              <div style={{ display: 'grid', gap: '1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
                  <div>
                    <label style={labelStyle}>First name *</label>
                    <input type="text" value={form.first_name} onChange={(e) => updateField('first_name', e.target.value)} placeholder="e.g. Amaka" autoFocus style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Last name *</label>
                    <input type="text" value={form.last_name} onChange={(e) => updateField('last_name', e.target.value)} placeholder="e.g. Okafor" style={inputStyle} />
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Phone number *</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0 0.8rem', border: '1px solid var(--cresoa-border)', borderRadius: '8px', background: 'var(--cresoa-bg)' }}>
                    <Svg name="phone" size={16} stroke="var(--cresoa-text-muted)" />
                    <input type="tel" value={form.phone} onChange={(e) => updateField('phone', e.target.value)} placeholder="0803 123 4567" style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', color: 'var(--cresoa-text)', padding: '0.6rem 0', fontSize: '0.95rem' }} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Contact */}
          {step === 2 && (
            <div>
              <div className="cresoa-section-header">
                <div>
                  <h3 className="cresoa-section-header-title">Contact Information</h3>
                  <p className="cresoa-section-header-subtitle">Optional but helpful for communication</p>
                </div>
              </div>
              <div style={{ display: 'grid', gap: '1rem' }}>
                <div>
                  <label style={labelStyle}>Email address</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0 0.8rem', border: '1px solid var(--cresoa-border)', borderRadius: '8px', background: 'var(--cresoa-bg)' }}>
                    <Svg name="mail" size={16} stroke="var(--cresoa-text-muted)" />
                    <input type="email" value={form.email} onChange={(e) => updateField('email', e.target.value)} placeholder="customer@example.com" style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', color: 'var(--cresoa-text)', padding: '0.6rem 0', fontSize: '0.95rem' }} />
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Address</label>
                  <textarea value={form.address} onChange={(e) => updateField('address', e.target.value)} placeholder="e.g. 12 Allen Avenue, Ikeja, Lagos" rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Review & Save */}
          {step === 3 && (
            <div>
              <div className="cresoa-section-header">
                <div>
                  <h3 className="cresoa-section-header-title">Review & Save</h3>
                  <p className="cresoa-section-header-subtitle">Check the details before creating the customer</p>
                </div>
              </div>
              <div className="cresoa-card" style={{ padding: '0.8rem', background: successMessage ? 'var(--cresoa-success-soft)' : 'var(--cresoa-surface-soft)' }}>
                {successMessage ? (
                  <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                    <Svg name="check-circle" size={32} stroke="var(--cresoa-success)" />
                    <p style={{ margin: '0.5rem 0 0', fontWeight: 600, color: 'var(--cresoa-success)' }}>{successMessage}</p>
                  </div>
                ) : (
                  <>
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
                      <div><span style={{ color: 'var(--cresoa-text-muted)' }}>Email:</span> <strong>{form.email || '—'}</strong></div>
                      <div><span style={{ color: 'var(--cresoa-text-muted)' }}>Address:</span> <strong>{form.address || '—'}</strong></div>
                      {form.notes && (
                        <div style={{ gridColumn: '1 / -1' }}><span style={{ color: 'var(--cresoa-text-muted)' }}>Notes:</span> <strong> {form.notes}</strong></div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ─── Buttons ─── */}
        <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap', justifyContent: 'space-between' }}>
          {step > 1 && (
            <button
              type="button"
              onClick={handleBack}
              disabled={saving || !!successMessage}
              style={{ padding: '0.6rem 1.5rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'transparent', cursor: 'pointer', color: 'var(--cresoa-text)', fontWeight: 500 }}
            >
              <Svg name="arrow-left" size={14} stroke="currentColor" style={{ marginRight: '0.3rem' }} /> Back
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
              Continue <Svg name="arrow-right" size={14} stroke="#fff" style={{ marginLeft: '0.3rem' }} />
            </button>
          ) : (
            <button
              type="submit"
              disabled={saving || !!successMessage}
              className="cresoa-primary-button"
              style={{ padding: '0.6rem 1.5rem', marginLeft: 'auto' }}
            >
              {saving ? 'Saving...' : successMessage ? 'Saved ✓' : 'Save Customer'}
            </button>
          )}
        </div>
      </form>
    </div>
  )
}
