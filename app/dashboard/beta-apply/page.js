'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabaseClient'
import { Icon } from '../../../components/Icon'
import { Card } from '../../../components/Card'
import { SectionHeader } from '../../../components/SectionHeader'
import { Navigation } from '../../../components/Navigation'
import { getCurrentBusinessId } from '../../../lib/getBusinessId'
import '../../globals.css'

export default function BetaApplyPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [user, setUser] = useState(null)
  const [business, setBusiness] = useState(null)
  const [businessId, setBusinessId] = useState(null)

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    business_name: '',
    business_type: '',
    why: '',
  })

  const navigateWithBusiness = (path) => {
    const separator = path.includes('?') ? '&' : '?'
    router.push(`${path}${separator}business_id=${businessId}`)
  }

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        router.push('/login')
        return
      }
      setUser(user)

      const bizId = getCurrentBusinessId()
      if (!bizId) {
        router.push('/onboarding')
        return
      }
      setBusinessId(bizId)

      const { data: business, error: bizError } = await supabase
        .from('businesses')
        .select('id, name, phone, sector, has_applied_for_beta, owner_id')
        .eq('owner_id', user.id)
        .single()

      if (bizError || !business) {
        console.error('Business error:', bizError)
        router.push('/onboarding')
        return
      }

      if (business.owner_id !== user.id) {
        setError('Only business owners can apply for the beta.')
        setLoading(false)
        return
      }

      if (business.has_applied_for_beta) {
        router.push('/dashboard')
        return
      }

      setBusiness(business)
      setFormData({
        name: business.name || '',
        email: user.email || '',
        phone: business.phone || '',
        business_name: business.name || '',
        business_type: business.sector || '',
        why: '',
      })
    } catch (err) {
      console.error('Load error:', err)
      setError('Failed to load your data. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setMessage('')

    if (!formData.why.trim()) {
      setMessage('Please tell us why you want to join the beta.')
      setSubmitting(false)
      return
    }

    const { error: insertError } = await supabase
      .from('beta_applications')
      .insert({
        business_id: business.id,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        business_name: formData.business_name,
        business_type: formData.business_type,
        reason: formData.why,
      })

    if (insertError) {
      console.error('Insert error:', insertError)
      setMessage('Error submitting application. Please try again.')
      setSubmitting(false)
      return
    }

    const { error: updateError } = await supabase
      .from('businesses')
      .update({ has_applied_for_beta: true })
      .eq('id', business.id)

    if (updateError) {
      console.error('Update error:', updateError)
    }

    setMessage('✅ Application submitted! We’ll review it and get back to you soon.')
    setSubmitting(false)
  }

  // ─── Loading ──────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ padding: '1.5rem', maxWidth: '800px', margin: '0 auto', paddingBottom: '80px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div style={{ width: '140px', height: '24px', background: 'var(--cresoa-border)', borderRadius: '6px' }} />
          <div style={{ width: '100px', height: '24px', background: 'var(--cresoa-border)', borderRadius: '6px' }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
          {[1,2,3,4,5,6].map(i => (
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

  if (error) {
    return (
      <div style={{ padding: '1.5rem', maxWidth: '800px', margin: '0 auto', paddingBottom: '80px' }}>
        <Card style={{ padding: '2rem', textAlign: 'center' }}>
          <Icon name="alert-circle" size={32} stroke="var(--cresoa-danger)" />
          <h2 style={{ margin: '0.5rem 0' }}>Something went wrong</h2>
          <p style={{ color: 'var(--cresoa-text-muted)' }}>{error}</p>
          <button onClick={() => navigateWithBusiness('/dashboard')} className="cresoa-primary-button" style={{ marginTop: '1rem' }}>
            Go to Dashboard
          </button>
        </Card>
        <Navigation businessId={businessId} />
      </div>
    )
  }

  // ─── Success state ────────────────────────────────────────
  if (message && message.includes('✅')) {
    return (
      <div style={{ padding: '1.5rem', maxWidth: '800px', margin: '0 auto', paddingBottom: '80px' }}>
        <Navigation businessId={businessId} />
        <Card style={{ padding: '2rem', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🎉</div>
          <h2 style={{ margin: '0.5rem 0', color: 'var(--cresoa-text)' }}>Application Received!</h2>
          <p style={{ color: 'var(--cresoa-text-muted)', marginBottom: '1.5rem' }}>
            We’ll review your application and get back to you within 48 hours.
          </p>
          <a
            href={`https://wa.me/2349049209780?text=Hi%2C%20I%20applied%20for%20the%20Cresoa%20beta.%20My%20email%20is%20${encodeURIComponent(formData.email)}%20and%20my%20business%20is%20${encodeURIComponent(formData.business_name)}.`}
            target="_blank"
            rel="noopener noreferrer"
            className="cresoa-primary-button"
            style={{ textDecoration: 'none', display: 'inline-block', background: '#25D366' }}
          >
            <Icon name="message-circle" size={16} stroke="#fff" style={{ marginRight: '0.3rem' }} /> Message Admin on WhatsApp
          </a>
          <br />
          <button
            onClick={() => navigateWithBusiness('/dashboard')}
            style={{
              marginTop: '1rem',
              background: 'none',
              border: 'none',
              color: 'var(--cresoa-accent)',
              cursor: 'pointer',
              fontWeight: 500,
              textDecoration: 'underline',
            }}
          >
            ← Back to Dashboard
          </button>
        </Card>
        <Navigation businessId={businessId} />
      </div>
    )
  }

  // ─── Main render ──────────────────────────────────────────
  return (
    <div style={{ padding: '1.5rem', maxWidth: '800px', margin: '0 auto', paddingBottom: '80px' }}>
      <Navigation businessId={businessId} />

      <div style={{ marginBottom: '0.5rem' }}>
        <p style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', margin: 0 }}>Beta</p>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0.2rem 0', color: 'var(--cresoa-text)' }}>Apply for Beta Access</h1>
        <p style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.85rem', margin: 0 }}>
          Join the Cresoa beta – free access for early users. We’ll review your application.
        </p>
      </div>

      {message && (
        <div
          style={{
            padding: '0.6rem 1rem',
            borderRadius: '8px',
            marginBottom: '1rem',
            background: message.includes('✅') ? 'var(--cresoa-success-soft)' : 'var(--cresoa-danger-soft)',
            color: message.includes('✅') ? 'var(--cresoa-success)' : 'var(--cresoa-danger)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <Icon name={message.includes('✅') ? 'check-circle' : 'alert-circle'} size={16} stroke="currentColor" />
          {message}
        </div>
      )}

      <Card style={{ padding: '1.5rem' }}>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gap: '1.2rem' }}>
            {/* Read-only fields */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.2rem', color: 'var(--cresoa-text)' }}>Full Name</label>
              <input
                type="text"
                value={formData.name}
                readOnly
                style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-bg)', color: 'var(--cresoa-text-muted)', cursor: 'not-allowed' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.2rem', color: 'var(--cresoa-text)' }}>Email Address</label>
              <input
                type="email"
                value={formData.email}
                readOnly
                style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-bg)', color: 'var(--cresoa-text-muted)', cursor: 'not-allowed' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.2rem', color: 'var(--cresoa-text)' }}>Phone Number</label>
              <input
                type="text"
                value={formData.phone}
                readOnly
                style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-bg)', color: 'var(--cresoa-text-muted)', cursor: 'not-allowed' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.2rem', color: 'var(--cresoa-text)' }}>Business Name</label>
              <input
                type="text"
                value={formData.business_name}
                readOnly
                style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-bg)', color: 'var(--cresoa-text-muted)', cursor: 'not-allowed' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.2rem', color: 'var(--cresoa-text)' }}>Business Type</label>
              <input
                type="text"
                value={formData.business_type}
                readOnly
                style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-bg)', color: 'var(--cresoa-text-muted)', cursor: 'not-allowed' }}
              />
            </div>

            {/* Why (editable) */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.2rem', color: 'var(--cresoa-text)' }}>
                Why do you want to join the beta? <span style={{ color: 'var(--cresoa-danger)' }}>*</span>
              </label>
              <textarea
                value={formData.why}
                onChange={(e) => setFormData({ ...formData, why: e.target.value })}
                rows={4}
                placeholder="e.g. I want to test it for my repair shop and give feedback..."
                required
                style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-bg)', color: 'var(--cresoa-text)', resize: 'vertical', fontSize: '0.95rem' }}
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting}
              className="cresoa-primary-button"
              style={{ width: '100%', justifyContent: 'center', padding: '0.8rem' }}
            >
              {submitting ? 'Submitting...' : 'Apply for Beta →'}
            </button>
          </div>
        </form>
      </Card>

      <div style={{ marginTop: '2rem' }}>
        <Navigation businessId={businessId} />
      </div>
    </div>
  )
}
