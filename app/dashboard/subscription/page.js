'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../../lib/supabaseClient'
import { PLANS, getPlanStatusMessage } from '../../../lib/planLimits'
import { Icon } from '../../../components/Icon'
import { Card } from '../../../components/Card'
import { SectionHeader } from '../../../components/SectionHeader'
import { Navigation } from '../../../components/Navigation'
import { showToast } from '../../../lib/toast'
import '../../globals.css'

export default function SubscriptionPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [business, setBusiness] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedPlan, setSelectedPlan] = useState('free')
  const [processingPlan, setProcessingPlan] = useState(null) // track which plan is being processed
  const [message, setMessage] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [paymentSuccess, setPaymentSuccess] = useState(false)

  // ─── Billing history ──────────────────────────────────────
  const [billingHistory, setBillingHistory] = useState([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  // ─── Cancel modal ─────────────────────────────────────────
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelling, setCancelling] = useState(false)

  // ─── Navigation helper ────────────────────────────────────
  const navigateWithBusiness = (path) => {
    const separator = path.includes('?') ? '&' : '?'
    router.push(`${path}${separator}business_id=${business?.id}`)
  }

  // ─── Load business ────────────────────────────────────────
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

  // ─── Load billing history ─────────────────────────────────
  const loadBillingHistory = async (businessId) => {
    if (!businessId) return
    setLoadingHistory(true)
    try {
      const { data: payments, error } = await supabase
        .from('payment_records')
        .select('*')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false })
        .limit(10)

      if (error) throw error

      if (payments && payments.length > 0) {
        const history = payments.map(p => ({
          id: p.id,
          invoice: `INV-${p.id.slice(0, 6)}`,
          date: p.created_at,
          amount: p.amount,
          status: 'paid',
        }))
        setBillingHistory(history)
      } else {
        const { data: logs } = await supabase
          .from('business_activity_logs')
          .select('*')
          .eq('business_id', businessId)
          .eq('action', 'payment_recorded')
          .order('created_at', { ascending: false })
          .limit(10)

        if (logs && logs.length > 0) {
          const history = logs.map(log => ({
            id: log.id,
            invoice: `INV-${log.id.slice(0, 6)}`,
            date: log.created_at,
            amount: log.details?.amount || 0,
            status: 'paid',
          }))
          setBillingHistory(history)
        } else {
          setBillingHistory([])
        }
      }
    } catch (err) {
      console.error('Error loading billing history:', err)
      setBillingHistory([])
    } finally {
      setLoadingHistory(false)
    }
  }

  useEffect(() => {
    const init = async () => {
      const biz = await loadBusiness()
      if (biz) {
        await loadBillingHistory(biz.id)
      }
      setLoading(false)
    }
    init()
  }, [])

  // ─── Paystack verification ────────────────────────────────
  useEffect(() => {
    const reference = searchParams?.get('reference') || searchParams?.get('trxref')

    if (reference) {
      setPaymentSuccess(true)

      const verifyPayment = async () => {
        setVerifying(true)
        try {
          const res = await fetch(`/api/paystack/verify?reference=${reference}`)
          const data = await res.json()

          if (data.status === 'success') {
            showToast('✅ Payment confirmed! Your plan has been upgraded.', '#4C7A5E')
            await loadBusiness()
            await loadBillingHistory(business?.id)
            setTimeout(() => {
              router.replace('/dashboard/subscription')
            }, 2000)
          } else {
            showToast('❌ Payment verification failed: ' + (data.error || 'Unknown error'), '#AE4A34')
            setPaymentSuccess(false)
          }
        } catch (error) {
          console.error('❌ Verification error:', error)
          showToast('❌ An error occurred during verification.', '#AE4A34')
          setPaymentSuccess(false)
        } finally {
          setVerifying(false)
        }
      }

      verifyPayment()
    }
  }, [searchParams, router])

  // ─── Upgrade handler ──────────────────────────────────────
  const handleUpgrade = async (planId) => {
    setMessage('')
    setProcessingPlan(planId) // ✅ only this plan shows "Processing..."

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setMessage('Please log in first.')
        setProcessingPlan(null)
        return
      }

      const { data: freshBusiness, error } = await supabase
        .from('businesses')
        .select('id, plan')
        .eq('owner_id', user.id)
        .single()

      if (error || !freshBusiness) {
        setMessage('Business not found.')
        setProcessingPlan(null)
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
        setProcessingPlan(null)
      }
    } catch (error) {
      console.error('❌ Upgrade error:', error)
      setMessage('Error: ' + error.message)
      setProcessingPlan(null)
    }
  }

  // ─── Cancel subscription ──────────────────────────────────
  const handleCancelSubscription = async () => {
    setCancelling(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { error } = await supabase
        .from('businesses')
        .update({
          plan: 'free',
          subscription_expires_at: null,
        })
        .eq('id', business.id)
        .eq('owner_id', user.id)

      if (error) throw error

      await loadBusiness()
      showToast('✅ Subscription cancelled successfully.', '#4C7A5E')
      setShowCancelModal(false)
    } catch (err) {
      console.error('Cancel error:', err)
      showToast('❌ Failed to cancel subscription.', '#AE4A34')
    } finally {
      setCancelling(false)
    }
  }

  // ─── Apply for Beta ──────────────────────────────────────
  const handleApplyBeta = async () => {
    setProcessingPlan('beta')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const betaExpiresAt = new Date()
      betaExpiresAt.setDate(betaExpiresAt.getDate() + 90)

      const { error } = await supabase
        .from('businesses')
        .update({
          plan: 'beta',
          has_applied_for_beta: true,
          beta_expires_at: betaExpiresAt.toISOString(),
        })
        .eq('id', business.id)
        .eq('owner_id', user.id)

      if (error) throw error

      await loadBusiness()
      showToast('✅ You are now on the Beta plan! Enjoy 3 months of Pro features.', '#4C7A5E')
    } catch (err) {
      console.error('Beta apply error:', err)
      showToast('❌ Failed to apply for Beta.', '#AE4A34')
    } finally {
      setProcessingPlan(null)
    }
  }

  // ─── Format helpers ──────────────────────────────────────
  const formatDate = (iso) => {
    if (!iso) return '—'
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  const formatMoney = (value) => {
    return `₦${Number(value || 0).toLocaleString('en-NG')}`
  }

  // ─── Get next billing info ────────────────────────────────
  const getBillingInfo = () => {
    if (!business) return { date: null, daysRemaining: null }

    // For beta plan
    if (business.plan === 'beta' && business.beta_expires_at) {
      const expiry = new Date(business.beta_expires_at)
      const now = new Date()
      const daysRemaining = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24))
      return {
        date: formatDate(business.beta_expires_at),
        daysRemaining: daysRemaining > 0 ? daysRemaining : 0,
        label: 'Beta expires'
      }
    }

    // For paid plans
    if (business.subscription_expires_at) {
      const expiry = new Date(business.subscription_expires_at)
      const now = new Date()
      const daysRemaining = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24))
      return {
        date: formatDate(business.subscription_expires_at),
        daysRemaining: daysRemaining > 0 ? daysRemaining : 0,
        label: 'Next billing'
      }
    }

    // For trial
    if (business.trial_ends_at) {
      const expiry = new Date(business.trial_ends_at)
      const now = new Date()
      const daysRemaining = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24))
      return {
        date: formatDate(business.trial_ends_at),
        daysRemaining: daysRemaining > 0 ? daysRemaining : 0,
        label: 'Trial ends'
      }
    }

    return { date: null, daysRemaining: null }
  }

  const billingInfo = getBillingInfo()

  // ─── Status banner ────────────────────────────────────────
  const planStatus = business ? getPlanStatusMessage(business) : null

  // ─── Loading ─────────────────────────────────────────────
  if (loading || verifying) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--cresoa-bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
          .spinner {
            width: 40px; height: 40px;
            border: 4px solid var(--cresoa-border);
            border-top: 4px solid var(--cresoa-accent);
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
          }
        `}</style>
        <div className="spinner"></div>
        {verifying && <p style={{ color: 'var(--cresoa-text-muted)', marginTop: '1rem' }}>Verifying payment...</p>}
      </div>
    )
  }

  if (paymentSuccess && !verifying) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--cresoa-bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>✅</div>
        <h2 style={{ color: 'var(--cresoa-text)' }}>Payment Successful!</h2>
        <p style={{ color: 'var(--cresoa-text-muted)' }}>Your plan is being upgraded...</p>
        <p style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.85rem' }}>Redirecting...</p>
        <div className="spinner" style={{ width: '30px', height: '30px', marginTop: '1rem' }}></div>
      </div>
    )
  }

  if (!business) return null

  // ─── Plan data with feature lists ────────────────────────
  const allPlans = [
    {
      key: 'free',
      ...PLANS.free,
      features: [
        { text: 'Basic customer management (20 customers)', included: true },
        { text: 'Basic order tracking (50 orders)', included: true },
        { text: 'Payment recording', included: true },
        { text: 'Dashboard access', included: true },
        { text: 'Customer measurements (Fashion)', included: true },
        { text: 'Production tracking', included: true },
        { text: 'Group orders (Aso-Ebi)', included: false },
        { text: 'Customer tracking links', included: false },
        { text: 'WhatsApp reminders', included: false },
      ]
    },
    {
      key: 'starter',
      ...PLANS.starter,
      badge: 'Popular',
      features: [
        { text: 'Everything in Free', included: true },
        { text: 'Unlimited customers', included: true },
        { text: 'Unlimited orders', included: true },
        { text: 'Group orders (Aso-Ebi)', included: true },
        { text: 'Customer tracking links', included: true },
        { text: 'WhatsApp notifications', included: true },
        { text: 'Automatic reminders', included: true },
        { text: 'Basic analytics', included: true },
        { text: '2 staff accounts', included: true },
      ]
    },
    {
      key: 'pro',
      ...PLANS.pro,
      badge: 'Best Value',
      features: [
        { text: 'Everything in Starter', included: true },
        { text: 'Advanced analytics', included: true },
        { text: 'Bulk actions', included: true },
        { text: '10 staff accounts', included: true },
        { text: 'Custom branding', included: true },
        { text: 'Data export (Excel/PDF)', included: true },
        { text: 'API access', included: true },
        { text: 'Priority support', included: true },
      ]
    }
  ]

  const showBeta = business.plan !== 'beta' && !business.has_applied_for_beta

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto', paddingBottom: '80px' }}>
      <Navigation businessId={business.id} />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <div>
          <p style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', margin: 0 }}>Billing</p>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0.2rem 0', color: 'var(--cresoa-text)' }}>Subscription Plans</h1>
          <p style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.85rem', margin: 0 }}>Choose the plan that fits your business</p>
        </div>
      </div>

      {/* Status Banner */}
      {planStatus && (
        <div style={{
          padding: '0.6rem 1rem',
          borderRadius: '8px',
          marginBottom: '1rem',
          background: planStatus.status === 'trial' ? 'var(--cresoa-warning-soft)' :
                      planStatus.status === 'active' ? 'var(--cresoa-success-soft)' :
                      planStatus.status === 'beta' ? 'var(--cresoa-info-soft)' :
                      'var(--cresoa-surface-soft)',
          color: planStatus.status === 'trial' ? 'var(--cresoa-warning)' :
                 planStatus.status === 'active' ? 'var(--cresoa-success)' :
                 planStatus.status === 'beta' ? 'var(--cresoa-info)' :
                 'var(--cresoa-text-muted)',
          textAlign: 'center',
          fontWeight: 600,
          fontSize: '0.9rem'
        }}>
          {planStatus.message}
        </div>
      )}

      {/* Current Plan Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.5rem', marginBottom: '1.5rem' }}>
        <Card style={{ padding: '0.6rem 0.8rem', textAlign: 'center' }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--cresoa-text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Current Plan</div>
          <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--cresoa-text)' }}>
            {business.plan === 'beta' ? 'Beta' : business.plan.charAt(0).toUpperCase() + business.plan.slice(1)}
          </div>
        </Card>
        <Card style={{ padding: '0.6rem 0.8rem', textAlign: 'center' }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--cresoa-text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Status</div>
          <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--cresoa-success)' }}>Active ✓</div>
        </Card>
        <Card style={{ padding: '0.6rem 0.8rem', textAlign: 'center' }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--cresoa-text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
            {billingInfo.label || 'Next Billing'}
          </div>
          <div style={{ fontWeight: 700, fontSize: '1rem' }}>
            {billingInfo.daysRemaining !== null && billingInfo.daysRemaining > 0 ? (
              <>
                <div style={{ fontSize: '1.1rem' }}>{billingInfo.daysRemaining} days remaining</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--cresoa-text-muted)', fontWeight: 400 }}>{billingInfo.date}</div>
              </>
            ) : (
              <span style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.9rem', fontWeight: 400 }}>—</span>
            )}
          </div>
        </Card>
      </div>

      {/* Plan Cards – 3‑column grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {allPlans.map((plan) => {
          const isCurrent = selectedPlan === plan.key
          const isProcessing = processingPlan === plan.key
          const isFree = plan.key === 'free'

          return (
            <Card key={plan.key} style={{
              padding: '1.5rem',
              borderColor: isCurrent ? 'var(--cresoa-accent)' : 'var(--cresoa-border)',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column'
            }}>
              {plan.badge && (
                <span style={{
                  position: 'absolute',
                  top: '-8px',
                  right: '12px',
                  background: 'var(--cresoa-accent)',
                  color: '#fff',
                  padding: '0.1rem 0.8rem',
                  borderRadius: '12px',
                  fontSize: '0.6rem',
                  fontWeight: 700,
                  textTransform: 'uppercase'
                }}>
                  {plan.badge}
                </span>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>{plan.name}</h3>
                  <p style={{ fontSize: '1.6rem', fontWeight: 700, margin: '0.2rem 0', color: 'var(--cresoa-text)' }}>
                    {plan.price === 0 ? 'Free' : `₦${plan.price.toLocaleString()}`}
                    {plan.price > 0 && <span style={{ fontSize: '0.8rem', fontWeight: 400, color: 'var(--cresoa-text-muted)' }}> /month</span>}
                  </p>
                </div>
                {isCurrent && (
                  <span style={{
                    background: 'var(--cresoa-success)',
                    color: '#fff',
                    padding: '0.2rem 0.6rem',
                    borderRadius: '12px',
                    fontSize: '0.6rem',
                    fontWeight: 700,
                    textTransform: 'uppercase'
                  }}>
                    ✓ Current
                  </span>
                )}
              </div>

            <div style={{ flex: 1 }}>
                <ul style={{ listStyle: 'none', padding: 0, margin: '1rem 0' }}>
                  {plan.features.map((feature, idx) => (
                    <li key={idx} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.2rem 0',
                      borderBottom: '1px solid var(--cresoa-border)',
                      fontSize: '0.85rem',
                      color: feature.included ? 'var(--cresoa-text)' : 'var(--cresoa-text-muted)'
                    }}>
                      <Icon name={feature.included ? 'check-circle' : 'x-circle'} size={16} stroke={feature.included ? 'var(--cresoa-success)' : 'var(--cresoa-text-muted)'} />
                      {feature.text}
                    </li>
                  ))}
                </ul>
              </div>

              {isCurrent ? (
                <button className="cresoa-primary-button" style={{ width: '100%', justifyContent: 'center', background: 'var(--cresoa-surface-soft)', color: 'var(--cresoa-text-muted)', cursor: 'default', opacity: 0.7 }} disabled>
                  ✓ Current Plan
                </button>
              ) : isFree && business.plan === 'free' && !business.trial_ends_at ? (
                <button className="cresoa-primary-button" style={{ width: '100%', justifyContent: 'center', background: 'var(--cresoa-surface-soft)', color: 'var(--cresoa-text-muted)', cursor: 'default', opacity: 0.7 }} disabled>
                  Currently Free
                </button>
              ) : (
                <button
                  className="cresoa-primary-button"
                  style={{ width: '100%', justifyContent: 'center' }}
                  onClick={() => handleUpgrade(plan.key)}
                  disabled={!!processingPlan}
                >
                  {isProcessing ? 'Processing...' : `Upgrade to ${plan.name}`}
                </button>
              )}
            </Card>
          )
        })}
      </div>

      {/* Beta Card – only shown if not applied */}
      {showBeta && (
        <Card style={{
          padding: '1.5rem',
          borderColor: 'var(--cresoa-accent)',
          background: 'var(--cresoa-accent-soft)',
          marginBottom: '2rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>🧪 Beta Tester</h3>
              <p style={{ margin: '0.2rem 0 0', color: 'var(--cresoa-text-muted)' }}>
                Enjoy all Pro features for 3 months – free! Priority feedback channel included.
              </p>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0.5rem 0 0' }}>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                  <Icon name="check-circle" size={16} stroke="var(--cresoa-success)" /> All Pro features
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                  <Icon name="check-circle" size={16} stroke="var(--cresoa-success)" /> Free for 3 months
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                  <Icon name="check-circle" size={16} stroke="var(--cresoa-success)" /> Priority feedback channel
                </li>
              </ul>
            </div>
            <button
              className="cresoa-primary-button"
              onClick={handleApplyBeta}
              disabled={!!processingPlan}
              style={{ flexShrink: 0, background: 'var(--cresoa-primary)', color: '#fff' }}
            >
              {processingPlan === 'beta' ? 'Applying...' : 'Apply for Beta'}
            </button>
          </div>
        </Card>
      )}

      {/* ─── Billing History ────────────────────────────────── */}
      <SectionHeader title="Billing History" subtitle="Recent payments and invoices" />

      {loadingHistory ? (
        <Card style={{ padding: '1.5rem', textAlign: 'center' }}>
          <div className="spinner" style={{ width: '30px', height: '30px', margin: '0 auto' }}></div>
          <p style={{ color: 'var(--cresoa-text-muted)', marginTop: '0.5rem' }}>Loading history...</p>
        </Card>
      ) : billingHistory.length === 0 ? (
        <Card style={{ padding: '2rem', textAlign: 'center' }}>
          <Icon name="inbox" size={40} stroke="var(--cresoa-text-muted)" />
          <h3 style={{ margin: '0.5rem 0 0.2rem' }}>No billing history</h3>
          <p style={{ color: 'var(--cresoa-text-muted)' }}>Your payment history will appear here.</p>
        </Card>
      ) : (
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '500px', fontSize: '0.85rem' }}>
              <thead style={{ background: 'var(--cresoa-bg)', borderBottom: '2px solid var(--cresoa-border)' }}>
                <tr>
                  <th style={{ padding: '0.6rem 1rem', textAlign: 'left', color: 'var(--cresoa-text-muted)', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Invoice</th>
                  <th style={{ padding: '0.6rem 1rem', textAlign: 'left', color: 'var(--cresoa-text-muted)', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Date</th>
                  <th style={{ padding: '0.6rem 1rem', textAlign: 'right', color: 'var(--cresoa-text-muted)', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Amount</th>
                  <th style={{ padding: '0.6rem 1rem', textAlign: 'right', color: 'var(--cresoa-text-muted)', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {billingHistory.map(item => (
                  <tr key={item.id} style={{ borderBottom: '1px solid var(--cresoa-border)' }}>
                    <td style={{ padding: '0.6rem 1rem', fontWeight: 600 }}>{item.invoice}</td>
                    <td style={{ padding: '0.6rem 1rem', color: 'var(--cresoa-text-muted)' }}>{formatDate(item.date)}</td>
                    <td style={{ padding: '0.6rem 1rem', textAlign: 'right', fontWeight: 600 }}>{formatMoney(item.amount)}</td>
                    <td style={{ padding: '0.6rem 1rem', textAlign: 'right' }}>
                      <span style={{
                        background: 'var(--cresoa-success-soft)',
                        color: 'var(--cresoa-success)',
                        padding: '0.1rem 0.6rem',
                        borderRadius: '12px',
                        fontSize: '0.7rem',
                        fontWeight: 600
                      }}>Paid</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ─── Danger Zone ─────────────────────────────────────── */}
      {business.plan !== 'free' && business.plan !== 'beta' && (
        <div style={{ marginTop: '2rem' }}>
          <SectionHeader title="⚠️ Danger Zone" subtitle="Actions that cannot be undone" />
          <Card style={{ padding: '1.5rem', borderColor: 'var(--cresoa-danger)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h4 style={{ margin: 0, color: 'var(--cresoa-danger)' }}>Cancel Subscription</h4>
                <p style={{ margin: '0.2rem 0 0', color: 'var(--cresoa-text-muted)', fontSize: '0.85rem' }}>
                  You'll lose access to Starter/Pro features at the end of your current billing period.
                </p>
              </div>
              <button
                onClick={() => setShowCancelModal(true)}
                style={{
                  padding: '0.5rem 1.5rem',
                  borderRadius: '8px',
                  border: '1px solid var(--cresoa-danger)',
                  background: 'transparent',
                  color: 'var(--cresoa-danger)',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  transition: 'all 0.15s'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--cresoa-danger)'; e.currentTarget.style.color = '#fff'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--cresoa-danger)'; }}
              >
                Cancel Subscription
              </button>
            </div>
          </Card>
        </div>
      )}

      {/* ─── Cancel Modal ────────────────────────────────────── */}
      {showCancelModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', background: 'rgba(10,22,40,0.5)' }} onClick={() => { if (!cancelling) setShowCancelModal(false) }}>
          <div style={{ width: '100%', maxWidth: '480px', padding: '1.5rem', background: 'var(--cresoa-surface)', borderRadius: '16px', boxShadow: 'var(--shadow-lg)' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: '1.2rem', margin: 0, color: 'var(--cresoa-danger)' }}>Cancel Subscription</h2>
            <p style={{ color: 'var(--cresoa-text-muted)', margin: '0.5rem 0 0' }}>
              Are you sure? You'll lose access to <strong>{business.plan.charAt(0).toUpperCase() + business.plan.slice(1)}</strong> features at the end of your current billing period.
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowCancelModal(false)}
                disabled={cancelling}
                style={{ padding: '0.4rem 1.2rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'transparent', cursor: 'pointer', fontSize: '0.85rem' }}
              >
                Keep Plan
              </button>
              <button
                onClick={handleCancelSubscription}
                disabled={cancelling}
                style={{ padding: '0.4rem 1.2rem', borderRadius: '8px', border: 'none', background: 'var(--cresoa-danger)', color: '#fff', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, opacity: cancelling ? 0.6 : 1 }}
              >
                {cancelling ? 'Cancelling...' : 'Yes, Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Footer ──────────────────────────────────────────── */}
      <div style={{ marginTop: '2rem' }}>
        <Navigation businessId={business.id} />
      </div>
    </div>
  )
}
