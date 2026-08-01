'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabaseClient'

export default function BetaApplyPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [user, setUser] = useState(null)
  const [business, setBusiness] = useState(null)
  const [debug, setDebug] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    business_name: '',
    business_type: '',
    why: '',
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        setDebug('No user found, redirecting to login')
        router.push('/login')
        return
      }
      setUser(user)
      setDebug(`User found: ${user.email}`)

      const { data: business, error: bizError } = await supabase
        .from('businesses')
        .select('id, name, phone, sector, has_applied_for_beta, owner_id')
        .eq('owner_id', user.id)
        .single()

      if (bizError || !business) {
        setDebug(`Business query error: ${bizError?.message || 'No business found'}`)
        console.error('Business error:', bizError)
        // ⚠️ Do NOT redirect yet – show the debug info first
        setLoading(false)
        return
      }

      setDebug(`Business found: ${business.name}, owner_id: ${business.owner_id}`)

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
        name: user.user_metadata?.business_name || '',
        email: user.email || '',
        phone: business.phone || '',
        business_name: business.name || '',
        business_type: business.sector || '',
        why: '',
      })
      setDebug(`Form data set: ${JSON.stringify(formData)}`)
    } catch (err) {
      console.error('Load error:', err)
      setError('Failed to load your data. Please try again.')
      setDebug(`Catch error: ${err.message}`)
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

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p>Loading...</p>
        <pre style={{ background: '#f0f0f0', padding: '0.5rem', fontSize: '0.7rem', textAlign: 'left' }}>{debug}</pre>
      </div>
    )
  }

  // Show debug at the top
  const showDebug = () => (
    <details style={{ background: '#f8f8f8', padding: '0.5rem', borderRadius: '4px', marginBottom: '1rem', fontSize: '0.7rem' }}>
      <summary>🔍 Debug Info</summary>
      <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{debug}</pre>
      <div>User: {user?.email}</div>
      <div>Business: {business?.name}</div>
      <div>Has applied: {business?.has_applied_for_beta}</div>
    </details>
  )

  if (error) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#D9534F' }}>
        {showDebug()}
        <p>{error}</p>
        <button onClick={() => router.push('/dashboard')} className="btn-secondary">
          Go to Dashboard
        </button>
      </div>
    )
  }

  // Success state
  if (message && message.includes('✅')) {
    return (
      <div style={{ maxWidth: '550px', margin: '0 auto', padding: '2rem 1rem', textAlign: 'center' }}>
        {showDebug()}
        <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🎉</div>
        <h1 style={{ color: '#0F2B4A' }}>Application Received!</h1>
        <p style={{ color: '#8A8A8A', marginBottom: '1.5rem' }}>
          We’ll review your application and get back to you within 48 hours.
        </p>
        <a
          href={`https://wa.me/2349049209780?text=Hi%2C%20I%20applied%20for%20the%20Cresoa%20beta.%20My%20email%20is%20${encodeURIComponent(formData.email)}%20and%20my%20business%20is%20${encodeURIComponent(formData.business_name)}.`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-block',
            padding: '0.8rem 1.5rem',
            borderRadius: '10px',
            background: '#25D366',
            color: '#fff',
            fontWeight: '600',
            textDecoration: 'none',
            marginBottom: '1.5rem',
          }}
        >
          💬 Message Admin on WhatsApp
        </a>
        <br />
        <button
          onClick={() => router.push('/dashboard')}
          style={{
            background: 'none',
            border: 'none',
            color: '#0F2B4A',
            textDecoration: 'underline',
            cursor: 'pointer',
          }}
        >
          ← Back to Dashboard
        </button>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '550px', margin: '0 auto', padding: '2rem 1rem' }}>
      {showDebug()}
      <h1 style={{ color: '#0F2B4A', fontSize: '1.3rem' }}>🧪 Apply for Beta Access</h1>
      <p style={{ color: '#8A8A8A', marginBottom: '1.5rem' }}>
        Join the Cresoa beta – free access for early users. We’ll review your application and get back to you.
      </p>

      {message && (
        <div
          style={{
            background: message.includes('✅') ? '#DCEBE2' : '#F1DBD3',
            color: message.includes('✅') ? '#2E7D5E' : '#D9534F',
            padding: '0.6rem',
            borderRadius: '8px',
            marginBottom: '1rem',
          }}
        >
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ fontWeight: '600', fontSize: '0.85rem', color: '#0F2B4A' }}>Full Name</label>
          <input
            type="text"
            value={formData.name}
            readOnly
            style={{
              width: '100%', padding: '0.6rem', borderRadius: '8px',
              border: '1px solid #E5E0D8', background: '#F0EDE8', color: '#8A8A8A',
            }}
          />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ fontWeight: '600', fontSize: '0.85rem', color: '#0F2B4A' }}>Email Address</label>
          <input
            type="email"
            value={formData.email}
            readOnly
            style={{
              width: '100%', padding: '0.6rem', borderRadius: '8px',
              border: '1px solid #E5E0D8', background: '#F0EDE8', color: '#8A8A8A',
            }}
          />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ fontWeight: '600', fontSize: '0.85rem', color: '#0F2B4A' }}>Phone Number</label>
          <input
            type="text"
            value={formData.phone}
            readOnly
            style={{
              width: '100%', padding: '0.6rem', borderRadius: '8px',
              border: '1px solid #E5E0D8', background: '#F0EDE8', color: '#8A8A8A',
            }}
          />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ fontWeight: '600', fontSize: '0.85rem', color: '#0F2B4A' }}>Business Name</label>
          <input
            type="text"
            value={formData.business_name}
            readOnly
            style={{
              width: '100%', padding: '0.6rem', borderRadius: '8px',
              border: '1px solid #E5E0D8', background: '#F0EDE8', color: '#8A8A8A',
            }}
          />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ fontWeight: '600', fontSize: '0.85rem', color: '#0F2B4A' }}>Business Type</label>
          <input
            type="text"
            value={formData.business_type}
            readOnly
            style={{
              width: '100%', padding: '0.6rem', borderRadius: '8px',
              border: '1px solid #E5E0D8', background: '#F0EDE8', color: '#8A8A8A',
            }}
          />
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ fontWeight: '600', fontSize: '0.85rem', color: '#0F2B4A' }}>
            Why do you want to join the beta? <span style={{ color: '#D9534F' }}>*</span>
          </label>
          <textarea
            value={formData.why}
            onChange={(e) => setFormData({ ...formData, why: e.target.value })}
            rows={4}
            placeholder="e.g. I want to test it for my repair shop and give feedback..."
            required
            style={{
              width: '100%', padding: '0.6rem', borderRadius: '8px',
              border: '1px solid #E5E0D8', fontFamily: 'inherit', resize: 'vertical',
            }}
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          style={{
            width: '100%', padding: '0.8rem', borderRadius: '10px',
            border: 'none', background: 'linear-gradient(135deg, #D4A52A, #C79A2B)',
            color: '#0F2B4A', fontWeight: '700', fontSize: '1rem',
            boxShadow: '0 4px 16px rgba(212,165,42,0.3)',
            cursor: submitting ? 'default' : 'pointer',
            opacity: submitting ? 0.6 : 1,
          }}
        >
          {submitting ? 'Submitting...' : 'Apply for Beta →'}
        </button>
      </form>
    </div>
  )
    }
