'use client'

import { useState } from 'react'

const STEPS = [
  {
    title: '👋 Welcome to Cresoa!',
    content: 'This is your business dashboard. Here you can manage customers, orders, and payments – all in one place.',
  },
  {
    title: '📊 Your Business Metrics',
    content: 'See your key numbers at a glance – customers, orders, revenue, and outstanding balances.',
  },
  {
    title: '⚡ Quick Actions',
    content: 'Create new orders, add customers, or manage groups with one click. These are your most common tasks.',
  },
  {
    title: '📋 Recent Activity',
    content: 'All your latest orders and customers appear here. Click any item to view or edit details.',
  },
  {
    title: '🧭 Navigation',
    content: 'Use the sidebar to switch between Orders, Customers, Groups, Reminders, and Settings.',
  },
  {
    title: '🎉 You\'re Ready!',
    content: 'Explore, manage your business, and grow with Cresoa.',
    isEnd: true,
  },
]

export default function OnboardingTour({ onComplete }) {
  const [currentStep, setCurrentStep] = useState(0)
  const step = STEPS[currentStep]

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

  const isEnd = step.isEnd

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.6)',
      backdropFilter: 'blur(6px)',
      zIndex: 99999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.5rem',
    }}>
      <div style={{
        background: '#fff',
        borderRadius: '20px',
        padding: '2rem 2rem 1.8rem',
        maxWidth: '450px',
        width: '100%',
        boxShadow: '0 24px 64px rgba(0,0,0,0.3)',
        position: 'relative',
        textAlign: 'center',
      }}>
        {!isEnd && (
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.3rem' }}>{step.title.split(' ')[0]}</div>
            <h2 style={{ color: '#0F2B4A', fontSize: '1.4rem', margin: '0 0 0.5rem' }}>{step.title}</h2>
            <p style={{ color: '#8A8A8A', fontSize: '1rem', margin: 0 }}>{step.content}</p>
          </div>
        )}

        {isEnd ? (
          <>
            <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🎉</div>
            <h2 style={{ color: '#0F2B4A', fontSize: '1.6rem', margin: '0 0 0.5rem' }}>{step.title}</h2>
            <p style={{ color: '#8A8A8A', fontSize: '1rem', margin: '0 0 1.5rem' }}>{step.content}</p>
            <button
              onClick={onComplete}
              style={{
                padding: '0.8rem 2rem',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #D4A52A, #C79A2B)',
                color: '#0F2B4A',
                border: 'none',
                fontWeight: '700',
                fontSize: '1rem',
                cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(212,165,42,0.3)',
                width: '100%',
              }}
            >
              🚀 Start Using Cresoa
            </button>
          </>
        ) : (
          <>
            {/* Progress dots */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.4rem', marginBottom: '1.5rem' }}>
              {STEPS.map((_, i) => (
                <span key={i} style={{
                  display: 'inline-block',
                  width: i === currentStep ? '24px' : '8px',
                  height: '8px',
                  borderRadius: '4px',
                  background: i === currentStep ? '#D4A52A' : '#E5E0D8',
                  transition: 'all 0.3s',
                }} />
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                onClick={prevStep}
                disabled={currentStep === 0}
                style={{
                  background: 'none',
                  border: 'none',
                  color: currentStep === 0 ? '#C8C0B5' : '#0F2B4A',
                  fontWeight: '600',
                  fontSize: '0.9rem',
                  cursor: currentStep === 0 ? 'default' : 'pointer',
                }}
              >
                ← Back
              </button>
              <span style={{ fontSize: '0.75rem', color: '#8A8A8A' }}>
                {currentStep + 1} / {STEPS.length - 1}
              </span>
              <button
                onClick={nextStep}
                style={{
                  padding: '0.5rem 1.5rem',
                  borderRadius: '8px',
                  background: '#D4A52A',
                  color: '#0F2B4A',
                  border: 'none',
                  fontWeight: '600',
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(212,165,42,0.2)',
                }}
              >
                {currentStep < STEPS.length - 2 ? 'Next →' : 'Finish 🎉'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
