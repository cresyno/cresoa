'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '../../lib/supabaseClient'

export default function PublicSupportPage() {
  const [formData, setFormData] = useState({
    email: '',
    subject: '',
    category: '',
    description: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  // Pre-fill email if user is already logged in
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.email) {
        setFormData(prev => ({ ...prev, email: user.email }))
      }
    }
    getUser()
  }, [])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.email || !formData.subject || !formData.category || !formData.description) return

    setIsSubmitting(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      // Reuse your existing backend endpoint
      const res = await fetch('/api/support/ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (res.ok) {
        setSuccessMessage('✅ Ticket submitted! We’ll get back to you via email within 24 hours.')
        setFormData({ email: formData.email, subject: '', category: '', description: '' })
      } else {
        const err = await res.json()
        setErrorMessage(err.error || 'Something went wrong. Please try again.')
      }
    } catch (error) {
      setErrorMessage('Network error. Please check your connection.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', color: 'var(--color-text)', display: 'flex', flexDirection: 'column', fontFamily: "'Inter', sans-serif" }}>
      
      {/* Header */}
      <header style={{ padding: '1rem 2rem', background: 'var(--color-card)', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link href="/" style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--color-text)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ color: 'var(--color-accent)' }}>✦</span> Cresoa
        </Link>
        <Link href="/" style={{ color: 'var(--color-text-muted)', textDecoration: 'none', fontSize: '0.85rem' }}>← Back to Home</Link>
      </header>

      {/* Main Content */}
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1.5rem' }}>
        <div style={{ maxWidth: '500px', width: '100%', background: 'var(--color-card)', padding: '2.5rem', borderRadius: '16px', boxShadow: 'var(--shadow-md)', border: '1px solid var(--color-border)' }}>
          
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.25rem', color: 'var(--color-text)' }}>We're here to help.</h1>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>Submit a ticket and our team will reply within 24 hours.</p>

          {successMessage && (
            <div style={{ padding: '0.75rem 1rem', borderRadius: '8px', background: '#2E7D5E15', color: '#2E7D5E', border: '1px solid #2E7D5E30', marginBottom: '1.5rem' }}>
              {successMessage}
            </div>
          )}
          {errorMessage && (
            <div style={{ padding: '0.75rem 1rem', borderRadius: '8px', background: '#D9534F15', color: '#D9534F', border: '1px solid #D9534F30', marginBottom: '1.5rem' }}>
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.25rem', color: 'var(--color-text)' }}>Email Address</label>
              <input type="email" name="email" value={formData.email} onChange={handleChange} required placeholder="you@example.com" style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)', fontSize: '0.95rem' }} />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.25rem', color: 'var(--color-text)' }}>Subject</label>
              <input type="text" name="subject" value={formData.subject} onChange={handleChange} required placeholder="Briefly describe the issue" style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)', fontSize: '0.95rem' }} />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.25rem', color: 'var(--color-text)' }}>Category</label>
              <select name="category" value={formData.category} onChange={handleChange} required style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)', fontSize: '0.95rem' }}>
                <option value="">Select a category</option>
                <option value="billing">Billing / Subscription</option>
                <option value="staff">Staff / Team</option>
                <option value="orders">Orders / Production</option>
                <option value="technical">Technical Issue (Bug)</option>
                <option value="account">Account / Login</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.25rem', color: 'var(--color-text)' }}>Description</label>
              <textarea name="description" value={formData.description} onChange={handleChange} required rows="4" placeholder="Provide detailed information so we can help you faster..." style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)', fontSize: '0.95rem', resize: 'vertical', fontFamily: 'inherit' }} />
            </div>

            <button type="submit" disabled={isSubmitting} style={{ marginTop: '0.5rem', width: '100%', padding: '0.7rem', borderRadius: '8px', border: 'none', background: 'var(--color-primary)', color: '#fff', fontWeight: 600, fontSize: '1rem', cursor: 'pointer', transition: 'opacity 0.2s', opacity: isSubmitting ? '0.7' : '1' }}>
              {isSubmitting ? 'Submitting...' : 'Send Message'}
            </button>
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer style={{ padding: '1.5rem', textAlign: 'center', borderTop: '1px solid var(--color-border)', background: 'var(--color-card)', color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>
        &copy; {new Date().getFullYear()} Cresoa. Built for Nigerian SMEs. 🇳🇬
      </footer>
    </div>
  )
  }
