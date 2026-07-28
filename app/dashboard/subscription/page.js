// app/dashboard/subscription/page.js

'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../../lib/supabaseClient'
import { PLANS, getPlanStatusMessage } from '../../../lib/planLimits'
import { showToast } from '../../../lib/toast'

export default function SubscriptionPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [business, setBusiness] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedPlan, setSelectedPlan] = useState('starter')
  const [processing, setProcessing] = useState(false)
  const [message, setMessage] = useState('')
  const [verifying, setVerifying] = useState(false)

  const loadBusiness = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return null
      }

      const { data: businessData, error } = await supabase
        .from('businesses')
        .select('*')
        .eq('owner_id', user.id)
        .single()

      if (error || !businessData) {
        console.log('No business found — redirecting to onboarding')
        router.push('/onboarding')
        return null
      }

      setBusiness(businessData)
      setSelectedPlan(businessData?.plan || 'free')
      return businessData
    } catch (err) {
      console.error('loadBusiness error:', err)
      router.push('/onboarding')
      return null
    }
  }

  useEffect(() => {
    loadBusiness().finally(() => setLoading(false))
  }, [])

  // Handle Paystack callback verification
  useEffect(() => {
    const reference = searchParams?.get('reference') || searchParams?.get('trxref')

    if (reference) {
      const verifyPayment = async () => {
        setVerifying(true)
        try {
          const res = await fetch(`/api/paystack/verify?reference=${reference}`)
          const data = await res.json()

          if (data.status === 'success') {
            showToast('✅ Payment confirmed! Your plan has been upgraded.', '#4C7A5E')
            await loadBusiness()
            router.replace('/dashboard/subscription')
          } else {
            showToast('❌ Payment verification failed: ' + (data.error || 'Unknown error'), '#AE4A34')
          }
        } catch (error) {
          console.error('❌ Verification error:', error)
          showToast('❌ An error occurred during verification.', '#AE4A34')
        } finally {
          setVerifying(false)
        }
      }

      verifyPayment()
    }
  }, [searchParams, router])

  const handleUpgrade = async (planId) => {
    setMessage('')
    setProcessing(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setMessage('Please log in first.')
        setProcessing(false)
        return
      }

      // ✅ Ensure business exists — if not, redirect to onboarding
      const { data: freshBusiness, error } = await supabase
        .from('businesses')
        .select('id, plan')
        .eq('owner_id', user.id)
        .single()

      if (error || !freshBusiness) {
        router.push('/onboarding')
        return
      }

      setBusiness(freshBusiness)

      const response = await fetch('/api/paystack/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: freshBusiness.id,
          planId: planId,
          email: user.email,
        }),
      })

      const data = await response.json()

      if (data.status === 'success') {
        window.location.href = data.authorization_url
      } else {
        setMessage('Error: ' + data.error)
        setProcessing(false)
      }
    } catch (error) {
      console.error('❌ Upgrade error:', error)
      setMessage('Error: ' + error.message)
      setProcessing(false)
    }
  }

  const planStatus = business ? getPlanStatusMessage(business) : null

  if (loading || verifying) {
    return (
      <div style={{ minHeight: '100vh', background: '#F5EFE2', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
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
        {verifying && <p style={{ color: '#6B6255', marginTop: '1rem' }}>Verifying payment...</p>}
      </div>
    )
  }

  return (
    <main style={{ minHeight: '100vh', background: '#F5EFE2', padding: '1.5rem 1.2rem' }}>
      <style>{`
        .plan-card {
          background: #fff;
          border-radius: 14px;
          padding: 1.5rem;
          border: 2px solid #E8E0D5;
          max-width: 380px;
          margin: 0 auto 1rem;
          transition: border-color 0.2s ease;
          position: relative;
        }
        .plan-card.active {
          border-color: #C79A2B;
          box-shadow: 0 4px 16px rgba(199,154,43,0.12);
        }
        .plan-card .badge {
          position: absolute;
          top: -8px;
          right: 12px;
          background: #C79A2B;
          color: #1E3A5F;
          padding: 0.1rem 0.6rem;
          border-radius: 12px;
          font-size: 0.6rem;
          font-weight: 700;
          text-transform: uppercase;
        }
        .plan-card .name {
          font-size: 1.2rem;
          font-weight: 700;
          color: #1E3A5F;
          margin: 0 0 0.2rem;
        }
        .plan-card .price {
          font-size: 1.8rem;
          font-weight: 700;
          color: #1E3A5F;
          margin: 0.2rem 0 0.8rem;
        }
        .plan-card .price span {
          font-size: 0.9rem;
          font-weight: 400;
          color: #6B6255;
        }
        .plan-card .current-badge {
          display: inline-block;
          background: #4C7A5E;
          color: #fff;
          padding: 0.1rem 0.6rem;
          border-radius: 12px;
          font-size: 0.6rem;
          font-weight: 700;
          text-transform: uppercase;
          margin-bottom: 0.5rem;
        }
        .plan-card .features {
          list-style: none;
          padding: 0;
          margin: 1rem 0;
          text-align: left;
        }
        .plan-card .features li {
          padding: 0.3rem 0;
          border-bottom: 1px solid #F0EDE8;
          font-size: 0.85rem;
          color: #2B2620;
          display: flex;
          align-items: center;
          gap: 0.4rem;
        }
        .plan-card .features li:last-child { border-bottom: none; }
        .plan-card .features li .check { color: #4C7A5E; }
        .plan-card .features li .cross { color: #AE4A34; }
        .btn-upgrade {
          width: 100%;
          padding: 0.7rem;
          border-radius: 8px;
          border: none;
          background: linear-gradient(135deg, #C79A2B, #B4881E);
          color: #1E3A5F;
          font-size: 0.95rem;
          font-weight: 700;
          cursor: pointer;
          transition: transform 0.1s ease;
        }
        .btn-upgrade:active { transform: scale(0.98); }
        .btn-upgrade:disabled { opacity: 0.6; cursor: not-allowed; }
        .btn-upgrade.current {
          background: #E8E0D5;
          color: #6B6255;
          cursor: default;
        }
        .btn-back {
          background: none;
          border: none;
          color: #1E3A5F;
          font-size: 0.85rem;
          padding: 0;
          margin-bottom: 1rem;
          cursor: pointer;
        }
        .btn-back:hover { text-decoration: underline; }
        .header {
          max-width: 380px;
          margin: 0 auto 1.5rem;
        }
        .header h1 {
          color: #1E3A5F;
          font-size: 1.4rem;
          margin: 0 0 0.2rem;
        }
        .header p {
          color: #6B6255;
          font-size: 0.9rem;
          margin: 0;
        }
        .status-banner {
          max-width: 380px;
          margin: 0 auto 1rem;
          padding: 0.8rem 1rem;
          border-radius: 8px;
          text-align: center;
          font-size: 0.85rem;
          font-weight: 600;
        }
        .status-banner.trial { background: #F6E9C8; color: #B4881E; }
        .status-banner.active { background: #DCEBE2; color: #4C7A5E; }
        .status-banner.free { background: #F0EDE8; color: #6B6255; }
        .status-banner.beta { background: #D6E0EB; color: #1E3A5F; }
      `}</style>

      <button className="btn-back" onClick={() => router.push('/dashboard')}>
        ← Back to dashboard
      </button>

      <div className="header">
        <h1>Subscription Plans</h1>
        <p>Choose the plan that fits your business.</p>
      </div>

      {planStatus && (
        <div className={`status-banner ${planStatus.status}`}>
          {planStatus.message}
        </div>
      )}

      {message && (
        <p style={{ maxWidth: '380px', margin: '0 auto 1rem', fontSize: '0.9rem', color: '#AE4A34', textAlign: 'center' }}>
          {message}
        </p>
      )}

      {Object.entries(PLANS).map(([key, plan]) => {
        const isCurrent = selectedPlan === key
        const isBeta = key === 'beta'
        if (isBeta && business?.plan !== 'beta') return null

        return (
          <div key={key} className={`plan-card ${isCurrent ? 'active' : ''}`}>
            {plan.badge && <span className="badge">{plan.badge}</span>}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p className="name">{plan.name}</p>
                <p className="price">
                  {plan.price === 0 ? 'Free' : `₦${plan.price.toLocaleString()}`}
                  {plan.price > 0 && <span> /month</span>}
                </p>
              </div>
              {isCurrent && <span className="current-badge">✓ Current</span>}
            </div>

            <ul className="features">
              {plan.features.map((feature, i) => (
                <li key={i}>
                  <span className="check">✓</span>
                  {feature}
                </li>
              ))}
              {key === 'free' && (
                <>
                  <li><span className="cross">✕</span> Group orders (Aso-Ebi)</li>
                  <li><span className="cross">✕</span> Customer tracking links</li>
                  <li><span className="cross">✕</span> WhatsApp reminders</li>
                </>
              )}
            </ul>

            {isCurrent ? (
              <button className="btn-upgrade current" disabled>
                ✓ Current Plan
              </button>
            ) : key === 'beta' ? (
              <button className="btn-upgrade current" disabled>
                Beta (free)
              </button>
            ) : (
              <button
                className="btn-upgrade"
                onClick={() => handleUpgrade(key)}
                disabled={processing}
              >
                {processing ? 'Processing...' : `Upgrade to ${plan.name}`}
              </button>
            )}
          </div>
        )
      })}

      <p style={{
        maxWidth: '380px',
        margin: '1.5rem auto',
        fontSize: '0.75rem',
        color: '#6B6255',
        textAlign: 'center',
      }}>
        All plans include a 14-day free trial. Cancel anytime.
        <br />
        <span style={{ opacity: 0.6 }}>Starter: ₦100, Pro: ₦200 (test prices)</span>
      </p>
    </main>
  )
}
