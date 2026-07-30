'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function FeedbackBanner({ business }) {
  const router = useRouter()
  const [dismissed, setDismissed] = useState(false)
  const [lastFeedbackDate, setLastFeedbackDate] = useState(null)

  // Only show for beta users
  if (!business || business.plan !== 'beta') return null
  if (dismissed) return null

  const handleFeedbackClick = () => {
    router.push('/dashboard/feedback')
  }

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #1E3A5F, #0F1E30)',
        borderRadius: '12px',
        padding: '0.8rem 1rem',
        marginBottom: '1.2rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.5rem',
        border: '1px solid rgba(199,154,43,0.2)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span style={{ fontSize: '1.2rem' }}>💡</span>
        <div>
          <p style={{ margin: 0, color: '#fff', fontSize: '0.85rem', fontWeight: '500' }}>
            You're on the <span style={{ color: '#C79A2B' }}>Beta plan</span> — help us improve!
          </p>
          <p style={{ margin: '0.1rem 0 0', color: '#A0B4C9', fontSize: '0.7rem' }}>
            Share your feedback to shape Cresoa's future
          </p>
        </div>
      </div>
      <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
        <button
          onClick={handleFeedbackClick}
          style={{
            background: '#C79A2B',
            color: '#1E3A5F',
            padding: '0.3rem 0.8rem',
            borderRadius: '6px',
            border: 'none',
            fontWeight: '600',
            fontSize: '0.75rem',
            cursor: 'pointer',
            transition: 'transform 0.1s ease',
          }}
        >
          📝 Give Feedback
        </button>
        <button
          onClick={() => setDismissed(true)}
          style={{
            background: 'none',
            border: 'none',
            color: '#A0B4C9',
            fontSize: '0.7rem',
            cursor: 'pointer',
            padding: '0.2rem 0.4rem',
          }}
        >
          ✕
        </button>
      </div>
    </div>
  )
}
