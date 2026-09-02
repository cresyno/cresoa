'use client'

import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default function ReviewModal({ open, onClose, businessId }) {
  const [name, setName] = useState('')
  const [rating, setRating] = useState(5)
  const [reviewText, setReviewText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  if (!open) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name || !reviewText) {
      setError('Name and review are required.')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const { error } = await supabase
        .from('public_reviews')
        .insert({
          business_id: businessId,
          customer_name: name,
          rating,
          review_text: reviewText,
          is_approved: false, // admin must approve before showing
        })
      if (error) throw error
      setSuccess(true)
      setTimeout(() => {
        onClose()
        setName('')
        setRating(5)
        setReviewText('')
        setSuccess(false)
      }, 2000)
    } catch (err) {
      setError(err.message || 'Failed to submit. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: '1rem' }}>
      <div style={{ background: '#fff', borderRadius: '16px', padding: '1.5rem', maxWidth: '400px', width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.8rem' }}>
          <h3 style={{ margin: 0 }}>Leave a Review</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer' }}>×</button>
        </div>
        {success ? (
          <p style={{ color: 'green', textAlign: 'center', fontWeight: 700 }}>✅ Thank you for your review!</p>
        ) : (
          <form onSubmit={handleSubmit}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem' }}>Your Name *</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} required style={inputStyle} />

            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, margin: '0.8rem 0 0.3rem' }}>Rating</label>
            <div style={{ display: 'flex', gap: '0.2rem', marginBottom: '0.5rem' }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  style={{ fontSize: '1.5rem', background: 'none', border: 'none', cursor: 'pointer', color: star <= rating ? '#D4A52A' : '#ccc' }}
                >
                  ★
                </button>
              ))}
            </div>

            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, margin: '0.8rem 0 0.3rem' }}>Your Review *</label>
            <textarea value={reviewText} onChange={(e) => setReviewText(e.target.value)} required rows={4} style={{ ...inputStyle, resize: 'vertical' }} />

            {error && <p style={{ color: 'red', fontSize: '0.85rem', margin: '0.5rem 0' }}>{error}</p>}

            <button type="submit" disabled={submitting} style={{ marginTop: '1rem', width: '100%', padding: '0.7rem', borderRadius: '8px', border: 'none', background: '#D4A52A', color: '#fff', fontWeight: 700 }}>
              {submitting ? 'Submitting...' : 'Submit Review'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

const inputStyle = {
  width: '100%', padding: '0.7rem 0.9rem', borderRadius: '8px', border: '1px solid #ccc', fontSize: '0.95rem', boxSizing: 'border-box', marginBottom: '0.5rem'
      }
