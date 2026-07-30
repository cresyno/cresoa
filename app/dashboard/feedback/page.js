'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabaseClient'
import { showToast } from '../../../lib/toast'

export default function FeedbackPage() {
  const router = useRouter()
  const [business, setBusiness] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [rating, setRating] = useState(0)
  const [hoveredRating, setHoveredRating] = useState(0)
  const [feedback, setFeedback] = useState('')
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data: businessData } = await supabase
        .from('businesses')
        .select('*')
        .eq('owner_id', user.id)
        .single()

      if (!businessData) {
        router.push('/onboarding')
        return
      }

      // Only beta users can access this page
      if (businessData.plan !== 'beta') {
        router.push('/dashboard')
        return
      }

      setBusiness(businessData)
      setLoading(false)
    }

    load()
  }, [router])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setMessage('')

    if (rating === 0) {
      setMessage('Please select a rating.')
      setSubmitting(false)
      return
    }

    if (!feedback.trim()) {
      setMessage('Please share your feedback.')
      setSubmitting(false)
      return
    }

    const { data: { user } } = await supabase.auth.getUser()

    const { error } = await supabase
      .from('feedback')
      .insert({
        business_id: business.id,
        user_id: user.id,
        rating: rating,
        feedback: feedback.trim(),
        page_url: window.location.href,
        browser_info: navigator.userAgent,
      })

    if (error) {
      setMessage('Error: ' + error.message)
      setSubmitting(false)
      return
    }

    setFeedbackSubmitted(true)
    showToast('✅ Thank you for your feedback!', '#4C7A5E')
    setSubmitting(false)

    setTimeout(() => {
      router.push('/dashboard')
    }, 2000)
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

  if (feedbackSubmitted) {
    return (
      <main style={{ minHeight: '100vh', background: '#F5EFE2', padding: '1.5rem 1.2rem' }}>
        <div style={{ maxWidth: '400px', margin: '0 auto', textAlign: 'center', paddingTop: '3rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎉</div>
          <h1 style={{ color: '#1E3A5F', fontSize: '1.4rem', marginBottom: '0.5rem' }}>Thank You!</h1>
          <p style={{ color: '#6B6255', fontSize: '0.95rem', marginBottom: '1.5rem' }}>
            Your feedback helps us make Cresoa better for everyone.
          </p>
          <p style={{ color: '#A89888', fontSize: '0.8rem' }}>Redirecting to dashboard...</p>
        </div>
      </main>
    )
  }

  return (
    <main style={{ minHeight: '100vh', background: '#F5EFE2', padding: '1.5rem 1.2rem' }}>
      <style>{`
        .feedback-card {
          background: #fff;
          border-radius: 16px;
          padding: 2rem;
          border: 1px solid #E8E0D5;
          max-width: 440px;
          margin: 0 auto;
          box-shadow: 0 4px 16px rgba(30,58,95,0.06);
        }
        .rating-star {
          font-size: 2.2rem;
          cursor: pointer;
          transition: transform 0.1s ease;
          background: none;
          border: none;
          padding: 0.2rem;
          line-height: 1;
        }
        .rating-star:hover {
          transform: scale(1.1);
        }
        .rating-star.active { color: #C79A2B; }
        .rating-star.inactive { color: #E8E0D5; }
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
        .feedback-input {
          width: 100%;
          padding: 0.7rem;
          border-radius: 8px;
          border: 1px solid #E8E0D5;
          font-size: 0.95rem;
          background: #fff;
          box-sizing: border-box;
          color: #2B2620;
          font-family: inherit;
          resize: vertical;
          transition: border-color 0.2s ease;
        }
        .feedback-input:focus { outline: none; border-color: #C79A2B; }
        .beta-badge {
          display: inline-block;
          background: #1E3A5F;
          color: #fff;
          font-size: 0.55rem;
          font-weight: 600;
          padding: 0.1rem 0.5rem;
          border-radius: 10px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-left: 0.4rem;
        }
        @media (max-width: 420px) {
          .feedback-card { padding: 1.2rem; }
          .rating-star { font-size: 1.8rem; }
        }
      `}</style>

      <button className="back-link" onClick={() => router.push('/dashboard')}>
        ← Back to dashboard
      </button>

      <div className="feedback-card">
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.3rem' }}>
          <h1 style={{ color: '#1E3A5F', fontSize: '1.4rem', margin: 0 }}>Share Feedback</h1>
          <span className="beta-badge">Beta</span>
        </div>
        <p style={{ color: '#6B6255', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
          Your honest feedback helps us build a better product for Nigerian businesses.
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1.2rem' }}>
            <label style={{ display: 'block', color: '#2B2620', marginBottom: '0.4rem', fontSize: '0.9rem', fontWeight: '500' }}>
              How would you rate Cresoa?
            </label>
            <div style={{ display: 'flex', gap: '0.3rem' }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  className="rating-star"
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  onClick={() => setRating(star)}
                >
                  <span className={(hoveredRating || rating) >= star ? 'active' : 'inactive'}>
                    ★
                  </span>
                </button>
              ))}
            </div>
            {rating > 0 && (
              <p style={{ fontSize: '0.8rem', color: '#C79A2B', marginTop: '0.2rem' }}>
                {rating === 1 && 'Needs improvement'}
                {rating === 2 && 'Below average'}
                {rating === 3 && 'Average'}
                {rating === 4 && 'Good'}
                {rating === 5 && 'Excellent!'}
              </p>
            )}
          </div>

          <div style={{ marginBottom: '1.2rem' }}>
            <label style={{ display: 'block', color: '#2B2620', marginBottom: '0.4rem', fontSize: '0.9rem', fontWeight: '500' }}>
              What's on your mind?
            </label>
            <textarea
              className="feedback-input"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={4}
              placeholder="What's working well? What could be better? Any features you'd like to see?"
              required
            />
          </div>

          {message && (
            <p style={{ marginBottom: '0.8rem', fontSize: '0.85rem', color: '#AE4A34', textAlign: 'center' }}>
              {message}
            </p>
          )}

          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? 'Submitting...' : '📤 Submit Feedback'}
          </button>

          <p style={{ marginTop: '0.8rem', fontSize: '0.7rem', color: '#A89888', textAlign: 'center' }}>
            Your feedback is anonymous and helps us improve Cresoa
          </p>
        </form>
      </div>
    </main>
  )
        }
