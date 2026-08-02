// components/OnboardingTour.jsx
'use client'

import { useState, useEffect } from 'react'

const STEPS = [
  {
    target: 'dashboard-header',
    title: '👋 Welcome to Cresoa!',
    content: 'This is your business dashboard. Everything you need to run your business is right here.',
    position: 'bottom',
  },
  {
    target: 'stats-section',
    title: '📊 Your Business Metrics',
    content: 'See your customers, orders, and outstanding balances at a glance. Click any stat to dive deeper.',
    position: 'bottom',
  },
  {
    target: 'quick-actions',
    title: '⚡ Quick Actions',
    content: 'Create new orders, add customers, or manage groups in one click. These are your most common tasks.',
    position: 'bottom',
  },
  {
    target: 'recent-orders',
    title: '📋 Recent Orders',
    content: 'All your latest orders appear here. Click any order to view details or update its status.',
    position: 'top',
  },
  {
    target: 'sidebar-nav',
    title: '🧭 Navigation',
    content: 'Use the sidebar to switch between Orders, Customers, Groups, Reminders, and Settings.',
    position: 'right',
  },
  {
    target: 'beta-button',
    title: '🧪 Apply for Beta',
    content: 'Click this button to apply for the Cresoa Beta program and get free Pro access for 90 days!',
    position: 'bottom',
  },
  {
    target: 'tour-end',
    title: '🎉 You\'re Ready!',
    content: 'You now know the basics. Explore, manage your business, and grow with Cresoa.',
    position: 'center',
    isEnd: true,
  },
]

export default function OnboardingTour({ onComplete }) {
  const [currentStep, setCurrentStep] = useState(0)
  const [targetRect, setTargetRect] = useState(null)

  const step = STEPS[currentStep]

  useEffect(() => {
    if (step.isEnd) return
    const el = document.querySelector(`[data-tour="${step.target}"]`)
    if (el) {
      const rect = el.getBoundingClientRect()
      setTargetRect(rect)
    }
  }, [currentStep, step])

  const nextStep = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      onComplete()
    }
  }

  const prevStep = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1)
  }

  if (step.isEnd) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.5)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
      }}>
        <div style={{
          background: '#fff',
          borderRadius: '20px',
          padding: '2.5rem 2rem',
          maxWidth: '400px',
          width: '100%',
          textAlign: 'center',
          boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🎉</div>
          <h2 style={{ color: '#0F2B4A' }}>{step.title}</h2>
          <p style={{ color: '#8A8A8A', margin: '0.5rem 0 1.5rem' }}>{step.content}</p>
          <button
            onClick={onComplete}
            style={{
              padding: '0.8rem 2rem',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #D4A52A, #C79A2B)',
              color: '#0F2B4A',
              border: 'none',
              fontWeight: '700',
              fontSize: '1rem',
              cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(212,165,42,0.3)',
            }}
          >
            🚀 Start Using Cresoa
          </button>
        </div>
      </div>
    )
  }

  if (!targetRect) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.3)',
        zIndex: 9998,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{ background: '#fff', padding: '2rem', borderRadius: '16px', textAlign: 'center' }}>
          <p>Loading tour...</p>
        </div>
      </div>
    )
  }

  const tooltipStyle = {
    position: 'fixed',
    zIndex: 9999,
    maxWidth: '320px',
    background: '#0F2B4A',
    color: '#fff',
    borderRadius: '14px',
    padding: '1.2rem 1.5rem',
    boxShadow: '0 12px 40px rgba(0,0,0,0.25)',
    ...getTooltipPosition(targetRect, step.position),
  }

  function getTooltipPosition(rect, position) {
    const padding = 16
    switch (position) {
      case 'bottom':
        return { top: rect.bottom + padding, left: rect.left + rect.width / 2 - 160 }
      case 'top':
        return { bottom: window.innerHeight - rect.top + padding, left: rect.left + rect.width / 2 - 160 }
      case 'right':
        return { top: rect.top + rect.height / 2 - 80, left: rect.right + padding }
      case 'left':
        return { top: rect.top + rect.height / 2 - 80, right: window.innerWidth - rect.left + padding }
      default:
        return { top: rect.bottom + padding, left: rect.left + rect.width / 2 - 160 }
    }
  }

  const progress = `${currentStep + 1} / ${STEPS.length - 1}`

  return (
    <>
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.4)',
        zIndex: 9998,
      }} />

      <div style={{
        position: 'fixed',
        top: targetRect.top - 8,
        left: targetRect.left - 8,
        width: targetRect.width + 16,
        height: targetRect.height + 16,
        borderRadius: '12px',
        border: '3px solid #D4A52A',
        boxShadow: '0 0 0 4px rgba(212,165,42,0.2)',
        zIndex: 9999,
        pointerEvents: 'none',
        transition: 'all 0.3s ease',
      }} />

      <div style={tooltipStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
          <strong style={{ fontSize: '0.9rem' }}>{step.title}</strong>
          <span style={{ fontSize: '0.65rem', opacity: 0.6 }}>{progress}</span>
        </div>
        <p style={{ fontSize: '0.85rem', margin: '0 0 1rem', lineHeight: '1.5', opacity: 0.9 }}>{step.content}</p>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            {currentStep > 0 && (
              <button
                onClick={prevStep}
                style={{ background: 'none', border: 'none', color: '#C8D4E3', cursor: 'pointer', fontSize: '0.8rem' }}
              >
                ← Back
              </button>
            )}
          </div>
          <button
            onClick={nextStep}
            style={{
              padding: '0.4rem 1.2rem',
              borderRadius: '8px',
              background: '#D4A52A',
              color: '#0F2B4A',
              border: 'none',
              fontWeight: '600',
              fontSize: '0.8rem',
              cursor: 'pointer',
            }}
          >
            {currentStep < STEPS.length - 2 ? 'Next →' : 'Finish 🎉'}
          </button>
        </div>
      </div>
    </>
  )
      }
