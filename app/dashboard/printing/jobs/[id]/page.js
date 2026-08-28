'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { supabase } from '../../../../../lib/supabaseClient'

// ─── Self-contained SVG Icons ───
const Svg = ({ name, size = 20, stroke = 'currentColor', style }) => {
  const icons = {
    back: <><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></>,
    edit: <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />,
    card: <><rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><line x1="1" y1="10" x2="23" y2="10" /></>,
    file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></>,
    'arrow-right': <><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></>,
    clock: <><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></>,
    user: <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></>,
    upload: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></>,
    whatsapp: <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />,
    check: <polyline points="20 6 9 17 4 12" />,
    x: <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>,
    link: <><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></>,
    copy: <><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></>,
    'package': <><path d="M16.5 9.4l-9-5.19M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></>,
    'trash': <><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></>,
    'calendar': <><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></>,
    'history': <><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /><path d="M12 7v5l4 2" /></>,
    'printer': <><polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="8" /></>,
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>{icons[name]}</svg>
}

// ─── Constants ───
const STAGES = [
  'quote',
  'awaiting_deposit',
  'designing',
  'awaiting_approval',
  'in_production',
  'quality_check',
  'ready',
  'delivered',
]

const STAGE_LABELS = {
  quote: 'Quote',
  awaiting_deposit: 'Awaiting Deposit',
  designing: 'Designing',
  awaiting_approval: 'Awaiting Approval',
  in_production: 'In Production',
  quality_check: 'Quality Check',
  ready: 'Ready',
  delivered: 'Delivered',
}

const formatMoney = (val) => `₦${Number(val || 0).toLocaleString('en-NG')}`
const formatDate = (dateStr) => dateStr ? new Date(dateStr).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Not set'

// ─── Helper Component ───
const StatusBadge = ({ status }) => {
  const colorMap = {
    quote: 'var(--cresoa-info)',
    awaiting_deposit: 'var(--cresoa-warning)',
    designing: 'var(--cresoa-info)',
    awaiting_approval: 'var(--cresoa-warning)',
    in_production: 'var(--cresoa-accent)',
    quality_check: 'var(--cresoa-info)',
    ready: 'var(--cresoa-success)',
    delivered: 'var(--cresoa-success)',
  }
  return (
    <span style={{ padding: '0.3rem 0.8rem', borderRadius: '20px', background: `${colorMap[status] || '#666'}20`, color: colorMap[status] || '#666', fontWeight: 700, fontSize: '0.75rem' }}>
      {STAGE_LABELS[status] || status}
    </span>
  )
}

const DetailRow = ({ label, value }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px solid var(--cresoa-border)' }}>
    <span style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.85rem' }}>{label}</span>
    <span style={{ fontSize: '0.9rem', fontWeight: 600, textAlign: 'right', maxWidth: '65%', wordBreak: 'break-word' }}>{value}</span>
  </div>
)

// ─── Main Component ───
export default function PrintJobDetailPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const jobId = params.id
  const businessIdFromUrl = searchParams?.get('business_id')

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [job, setJob] = useState(null)
  const [customer, setCustomer] = useState(null)
  const [staffList, setStaffList] = useState([])
  const [files, setFiles] = useState([])
  const [revisions, setRevisions] = useState([])
  const [payments, setPayments] = useState([])
  const [invoices, setInvoices] = useState([])
  const [trackingLink, setTrackingLink] = useState('')

  // modals
  const [showStatusModal, setShowStatusModal] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentNote, setPaymentNote] = useState('')
  const [savingPayment, setSavingPayment] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)

  const [copied, setCopied] = useState(false)

  // ─── Fetch all data ───
  useEffect(() => {
    if (!jobId || !businessIdFromUrl) return
    const fetchAll = async () => {
      setLoading(true)
      try {
        const { data: jobData, error: jobError } = await supabase
          .from('print_jobs')
          .select('*')
          .eq('id', jobId)
          .eq('business_id', businessIdFromUrl)
          .maybeSingle()
        if (jobError) throw jobError
        if (!jobData) throw new Error('Print job not found')
        setJob(jobData)

        // Customer
        if (jobData.customer_id) {
          const { data: cust } = await supabase
            .from('customers')
            .select('*')
            .eq('id', jobData.customer_id)
            .maybeSingle()
          setCustomer(cust)
        }

        // Assigned staff
        const assignedIds = jobData.assigned_staff_ids || []
        if (assignedIds.length > 0) {
          const { data: staffData } = await supabase
            .from('staff')
            .select('*')
            .in('id', assignedIds)
          setStaffList(staffData || [])
        } else setStaffList([])

        // Files
        const { data: filesData } = await supabase
          .from('job_files')
          .select('*')
          .eq('job_id', jobId)
          .order('created_at', { ascending: false })
        setFiles(filesData || [])

        // Revisions
        const { data: revisionsData } = await supabase
          .from('job_revisions')
          .select('*')
          .eq('job_id', jobId)
          .order('created_at', { ascending: false })
        setRevisions(revisionsData || [])

        // Payments
        const { data: paymentsData } = await supabase
          .from('payment_records')
          .select('*')
          .eq('job_id', jobId) // if we have job_id in payment_records; else we'll filter by invoice
          .order('created_at', { ascending: false })
        setPayments(paymentsData || [])

        // Invoices
        const { data: invoicesData } = await supabase
          .from('invoices')
          .select('*')
          .eq('job_id', jobId)
        setInvoices(invoicesData || [])

        // Tracking link
        if (jobData.tracking_token) {
          setTrackingLink(`${window.location.origin}/track/${jobData.tracking_token}`)
        }
      } catch (err) {
        console.error('Fetch error:', err)
        setError(err.message || 'Failed to load')
      } finally {
        setLoading(false)
      }
    }
    fetchAll()
  }, [jobId, businessIdFromUrl])

  const balance = job ? Math.max(0, Number(job.total) - Number(job.amount_paid)) : 0
  const isDelivered = job?.status === 'delivered'

  // ─── Move Stage ───
  const handleUpdateStatus = async (status) => {
    if (!status || status === job.status) {
      setShowStatusModal(false)
      return
    }
    setUpdatingStatus(true)
    try {
      const { error } = await supabase
        .from('print_jobs')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', job.id)
      if (error) throw error
      setJob(prev => ({ ...prev, status }))
      setShowStatusModal(false)
    } catch (err) {
      alert('Failed to update status.')
    } finally {
      setUpdatingStatus(false)
    }
  }

  // ─── Record Payment ───
  const handleRecordPayment = async (e) => {
    e.preventDefault()
    const amount = parseFloat(paymentAmount)
    if (!amount || amount <= 0) { alert('Enter a valid amount.'); return }
    if (amount > balance) { alert(`Amount exceeds balance (${formatMoney(balance)})`); return }
    setSavingPayment(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const { error: payError } = await supabase
        .from('payment_records')
        .insert({
          business_id: businessIdFromUrl,
          customer_id: job.customer_id,
          job_id: job.id,
          amount,
          note: paymentNote || 'Job payment',
          created_by: session.user.id,
        })
      if (payError) throw payError

      const newPaid = Number(job.amount_paid || 0) + amount
      await supabase
        .from('print_jobs')
        .update({ amount_paid: newPaid, updated_at: new Date().toISOString() })
        .eq('id', job.id)

      setJob(prev => ({ ...prev, amount_paid: newPaid }))
      setPaymentAmount('')
      setPaymentNote('')
      setShowPaymentModal(false)
      alert('Payment recorded successfully.')
    } catch (err) {
      alert('Failed to record payment.')
    } finally {
      setSavingPayment(false)
    }
  }

  // ─── Generate Tracking Link ───
  const generateTrackingLink = async () => {
    try {
      const token = Math.random().toString(36).substring(2, 10) + Date.now().toString(36)
      const { error } = await supabase
        .from('print_jobs')
        .update({ tracking_token: token, updated_at: new Date().toISOString() })
        .eq('id', job.id)
      if (error) throw error
      const link = `${window.location.origin}/track/${token}`
      setTrackingLink(link)
      setJob(prev => ({ ...prev, tracking_token: token }))
      alert('Tracking link generated!')
    } catch (err) {
      alert('Failed to generate link.')
    }
  }

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(trackingLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      alert('Could not copy')
    }
  }

  // ─── Share WhatsApp ───
  const shareWhatsApp = (type = 'tracking') => {
    if (!customer?.phone) { alert('Customer has no phone number.'); return }
    let message = ''
    if (type === 'tracking' && trackingLink) {
      message = `Hi ${customer.name || customer.first_name}, here is the tracking link for your job #${job.job_number}: ${trackingLink}`
    } else if (type === 'invoice') {
      message = `Hi ${customer.name || customer.first_name}, here is your invoice for job #${job.job_number}.`
    } else if (type === 'status') {
      message = `Hi ${customer.name || customer.first_name}, your job #${job.job_number} is now ${STAGE_LABELS[job.status]}.`
    }
    const url = `https://wa.me/${customer.phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`
    window.open(url, '_blank')
  }

  // ─── File Upload (placeholder) ───
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    // TODO: upload to Supabase Storage
    alert('File upload coming soon')
  }

  if (loading) {
    return <div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'var(--cresoa-bg)' }}><div className="cresoa-loading-spinner" /></div>
  }

  if (error || !job) {
    return (
      <div style={{ minHeight: '70vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--cresoa-bg)', textAlign: 'center' }}>
        <h2>Couldn't load job</h2>
        <p style={{ color: 'var(--cresoa-text-muted)' }}>{error || 'Job not found'}</p>
        <button onClick={() => router.push(`/dashboard/printing/jobs?business_id=${businessIdFromUrl}`)} className="cresoa-primary-button">Back to Jobs</button>
      </div>
    )
  }

  const customerName = customer?.name || `${customer?.first_name || ''} ${customer?.last_name || ''}`.trim() || 'Customer'

  return (
    <div style={{ padding: '1rem', maxWidth: '900px', margin: '0 auto', background: 'var(--cresoa-bg)', minHeight: '100vh', paddingBottom: '100px' }}>
      {/* Back button */}
      <button onClick={() => router.push(`/dashboard/printing/jobs?business_id=${businessIdFromUrl}`)} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cresoa-text-muted)', marginBottom: '1rem', fontSize: '0.9rem' }}>
        <Svg name="back" size={16} stroke="currentColor" /> Back to Jobs
      </button>

      {/* Header */}
      <div style={{ background: 'var(--cresoa-surface)', borderRadius: '16px', padding: '1.5rem', marginBottom: '1rem', border: '1px solid var(--cresoa-border)', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <p style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', margin: 0 }}>Job #{job.job_number}</p>
            <h1 style={{ fontSize: '1.7rem', fontWeight: 800, margin: '0.3rem 0', color: 'var(--cresoa-text)' }}>{job.title}</h1>
            <p style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.9rem', margin: '0.2rem 0 0' }}>Customer: {customerName}</p>
          </div>
          <StatusBadge status={job.status} />
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.8rem' }}>
          {job.job_type && <span style={{ padding: '0.2rem 0.6rem', borderRadius: '12px', background: 'var(--cresoa-surface-soft)', color: 'var(--cresoa-text-muted)', fontWeight: 600, fontSize: '0.75rem' }}>{job.job_type}</span>}
          {job.quantity && <span style={{ padding: '0.2rem 0.6rem', borderRadius: '12px', background: 'var(--cresoa-surface-soft)', color: 'var(--cresoa-text-muted)', fontWeight: 600, fontSize: '0.75rem' }}>Qty: {job.quantity}</span>}
          {job.deadline && <span style={{ padding: '0.2rem 0.6rem', borderRadius: '12px', background: 'var(--cresoa-warning-soft)', color: 'var(--cresoa-warning)', fontWeight: 600, fontSize: '0.75rem' }}>Due: {formatDate(job.deadline)}</span>}
        </div>
      </div>

      {/* QUICK ACTIONS (Prominent) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '0.5rem', marginBottom: '1.5rem' }}>
        <button onClick={() => router.push(`/dashboard/printing/invoices/new?job_id=${job.id}&business_id=${businessIdFromUrl}`)} className="cresoa-primary-button" style={{ background: 'var(--cresoa-accent)' }}><Svg name="file" size={14} stroke="#fff" /> Invoice</button>
        <button onClick={() => setShowPaymentModal(true)} className="cresoa-primary-button" style={{ background: 'var(--cresoa-success)' }}><Svg name="card" size={14} stroke="#fff" /> Record Payment</button>
        <button onClick={() => shareWhatsApp('tracking')} disabled={!trackingLink} className="cresoa-primary-button" style={{ background: '#25D366' }}><Svg name="whatsapp" size={14} stroke="#fff" /> Share Tracking</button>
        <button onClick={() => setShowStatusModal(true)} className="cresoa-primary-button" style={{ background: 'var(--cresoa-info)' }}><Svg name="arrow-right" size={14} stroke="#fff" /> Move Stage</button>
        <button onClick={() => shareWhatsApp('status')} className="cresoa-primary-button" style={{ background: '#25D366' }}><Svg name="whatsapp" size={14} stroke="#fff" /> WhatsApp Update</button>
        <button onClick={() => router.push(`/dashboard/printing/jobs/${job.id}/edit?business_id=${businessIdFromUrl}`)} className="cresoa-primary-button" style={{ background: 'var(--cresoa-primary)' }}><Svg name="edit" size={14} stroke="#fff" /> Edit Job</button>
      </div>

      {/* FINANCIALS */}
      <div style={{ background: 'var(--cresoa-surface)', borderRadius: '16px', padding: '1.2rem', marginBottom: '1rem', border: '1px solid var(--cresoa-border)', boxShadow: 'var(--shadow-sm)' }}>
        <h3 style={{ margin: '0 0 0.8rem', fontSize: '1rem', fontWeight: 800 }}>💰 Financials</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '0.5rem' }}>
          <div style={{ padding: '0.6rem', background: 'var(--cresoa-surface-soft)', borderRadius: '8px', textAlign: 'center' }}>
            <div style={{ fontSize: '0.65rem', color: 'var(--cresoa-text-muted)' }}>Total</div>
            <div style={{ fontWeight: 700, fontSize: '1rem' }}>{formatMoney(job.total)}</div>
          </div>
          <div style={{ padding: '0.6rem', background: 'var(--cresoa-surface-soft)', borderRadius: '8px', textAlign: 'center' }}>
            <div style={{ fontSize: '0.65rem', color: 'var(--cresoa-text-muted)' }}>Paid</div>
            <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--cresoa-success)' }}>{formatMoney(job.amount_paid)}</div>
          </div>
          <div style={{ padding: '0.6rem', background: 'var(--cresoa-surface-soft)', borderRadius: '8px', textAlign: 'center' }}>
            <div style={{ fontSize: '0.65rem', color: 'var(--cresoa-text-muted)' }}>Balance</div>
            <div style={{ fontWeight: 700, fontSize: '1rem', color: balance > 0 ? 'var(--cresoa-danger)' : 'var(--cresoa-success)' }}>{formatMoney(balance)}</div>
          </div>
        </div>
        {invoices.length > 0 && (
          <div style={{ marginTop: '0.8rem' }}>
            <p style={{ fontSize: '0.8rem', fontWeight: 600, margin: '0 0 0.3rem' }}>Invoices:</p>
            {invoices.map(inv => (
              <button key={inv.id} onClick={() => router.push(`/dashboard/printing/invoices/${inv.id}?business_id=${businessIdFromUrl}`)} style={{ display: 'block', width: '100%', padding: '0.4rem', background: 'var(--cresoa-bg)', border: '1px solid var(--cresoa-border)', borderRadius: '6px', marginBottom: '0.3rem', textAlign: 'left', cursor: 'pointer', color: 'var(--cresoa-text)' }}>
                {inv.invoice_number} · {formatMoney(inv.total)}
              </button>
            ))}
          </div>
        )}
      </div>

       {/* CUSTOMER TRACKING */}
      <div style={{ background: 'var(--cresoa-surface)', borderRadius: '16px', padding: '1.2rem', marginBottom: '1rem', border: '1px solid var(--cresoa-border)', boxShadow: 'var(--shadow-sm)' }}>
        <h3 style={{ margin: '0 0 0.8rem', fontSize: '1rem', fontWeight: 800 }}>🔗 Customer Tracking</h3>
        {trackingLink ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem', background: 'var(--cresoa-bg)', borderRadius: '8px', border: '1px solid var(--cresoa-border)', marginBottom: '0.5rem' }}>
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.8rem' }}>{trackingLink}</span>
              <button onClick={copyLink} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cresoa-text-muted)' }}>{copied ? <Svg name="check" size={16} stroke="green" /> : <Svg name="copy" size={16} stroke="currentColor" />}</button>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={() => shareWhatsApp('tracking')} style={{ flex: 1, padding: '0.5rem', borderRadius: '8px', border: 'none', background: '#25D366', color: '#fff', fontWeight: 600, cursor: 'pointer' }}><Svg name="whatsapp" size={14} stroke="#fff" /> Share via WhatsApp</button>
              <button onClick={() => window.open(trackingLink, '_blank')} style={{ flex: 1, padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'transparent', color: 'var(--cresoa-text)', fontWeight: 600, cursor: 'pointer' }}>View Page</button>
            </div>
          </>
        ) : (
          <button onClick={generateTrackingLink} style={{ width: '100%', padding: '0.7rem', borderRadius: '8px', border: 'none', background: 'var(--cresoa-primary)', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>Generate Tracking Link</button>
        )}
      </div>

      {/* PRODUCTION */}
      <div style={{ background: 'var(--cresoa-surface)', borderRadius: '16px', padding: '1.2rem', marginBottom: '1rem', border: '1px solid var(--cresoa-border)', boxShadow: 'var(--shadow-sm)' }}>
        <h3 style={{ margin: '0 0 0.8rem', fontSize: '1rem', fontWeight: 800 }}>🔄 Production</h3>
        {/* Visual Progress */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          {STAGES.map((stage, idx) => {
            const isComplete = STAGES.indexOf(job.status) >= idx
            const isCurrent = job.status === stage
            return (
              <div key={stage} style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', flex: 1, minWidth: '70px' }}>
                <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: isComplete ? 'var(--cresoa-success)' : 'var(--cresoa-border)', color: isComplete ? '#fff' : 'var(--cresoa-text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.7rem' }}>
                  {idx + 1}
                </div>
                <span style={{ fontSize: '0.6rem', textAlign: 'center', color: isCurrent ? 'var(--cresoa-text)' : 'var(--cresoa-text-muted)', fontWeight: isCurrent ? 700 : 400 }}>{STAGE_LABELS[stage]}</span>
                {idx < STAGES.length - 1 && <div style={{ flex: 1, height: '2px', background: isComplete ? 'var(--cresoa-success)' : 'var(--cresoa-border)' }} />}
              </div>
            )
          })}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.8rem' }}>
          <button onClick={() => setShowStatusModal(true)} className="cresoa-primary-button"><Svg name="arrow-right" size={14} stroke="#fff" /> Move Stage</button>
          <button onClick={() => setShowStatusModal(true)} className="cresoa-primary-button" style={{ background: 'var(--cresoa-border)', color: 'var(--cresoa-text)' }}>Change Stage</button>
        </div>
        {staffList.length > 0 && (
          <div style={{ marginBottom: '0.5rem' }}>
            <p style={{ fontSize: '0.75rem', fontWeight: 600, margin: '0 0 0.3rem' }}>Assigned Staff:</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
              {staffList.map(staff => <span key={staff.id} style={{ padding: '0.2rem 0.6rem', borderRadius: '12px', background: 'var(--cresoa-accent-soft)', color: 'var(--cresoa-accent)', fontSize: '0.75rem', fontWeight: 600 }}>{staff.name}</span>)}
            </div>
          </div>
        )}
        <div style={{ marginTop: '0.5rem' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 600, margin: '0 0 0.3rem' }}>Stage History:</p>
          {revisions.length > 0 ? revisions.map(rev => (
            <div key={rev.id} style={{ padding: '0.3rem', borderBottom: '1px solid var(--cresoa-border)', fontSize: '0.8rem' }}>
              {rev.revision_number}. {rev.notes || 'Stage change'} · {formatDate(rev.created_at)}
            </div>
          )) : <p style={{ fontSize: '0.8rem', color: 'var(--cresoa-text-muted)' }}>No history yet.</p>}
        </div>
      </div>

      {/* DESIGN & FILES */}
      <div style={{ background: 'var(--cresoa-surface)', borderRadius: '16px', padding: '1.2rem', marginBottom: '1rem', border: '1px solid var(--cresoa-border)', boxShadow: 'var(--shadow-sm)' }}>
        <h3 style={{ margin: '0 0 0.8rem', fontSize: '1rem', fontWeight: 800 }}>🎨 Design & Files</h3>
        <label style={{ display: 'inline-block', padding: '0.6rem 1rem', background: 'var(--cresoa-accent)', color: '#fff', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.8rem' }}>
          <Svg name="upload" size={14} stroke="#fff" /> Upload Artwork
          <input type="file" onChange={handleFileUpload} style={{ display: 'none' }} />
        </label>
        {files.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {files.map(file => (
              <div key={file.id} style={{ padding: '0.4rem', background: 'var(--cresoa-bg)', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid var(--cresoa-border)' }}>
                <span style={{ fontSize: '0.8rem' }}>{file.filename} {file.is_approved && '✓ Approved'}</span>
                <a href={file.file_url} target="_blank" rel="noopener" style={{ color: 'var(--cresoa-accent)', fontSize: '0.8rem' }}>View</a>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.85rem', margin: 0 }}>No files uploaded yet.</p>
        )}
        {revisions.length > 0 && (
          <div style={{ marginTop: '0.8rem' }}>
            <p style={{ fontSize: '0.75rem', fontWeight: 600, margin: '0 0 0.3rem' }}>Revisions:</p>
            {revisions.map(rev => (
              <div key={rev.id} style={{ padding: '0.3rem', borderBottom: '1px solid var(--cresoa-border)', fontSize: '0.8rem' }}>
                Rev {rev.revision_number}: {rev.notes || 'No notes'} · {rev.status}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* JOB INFORMATION */}
      <div style={{ background: 'var(--cresoa-surface)', borderRadius: '16px', padding: '1.2rem', marginBottom: '1rem', border: '1px solid var(--cresoa-border)', boxShadow: 'var(--shadow-sm)' }}>
        <h3 style={{ margin: '0 0 0.8rem', fontSize: '1rem', fontWeight: 800 }}>📋 Job Information</h3>
        <DetailRow label="Job Type" value={job.job_type || '—'} />
        <DetailRow label="Quantity" value={job.quantity || '—'} />
        <DetailRow label="Specifications" value={job.specifications?.specs || '—'} />
        <DetailRow label="Price" value={formatMoney(job.total)} />
        <DetailRow label="Deadline" value={formatDate(job.deadline)} />
        <DetailRow label="Delivery" value={job.delivery_method === 'delivery' ? (job.delivery_address || 'Business Delivery') : 'Customer Pickup'} />
        <DetailRow label="Created" value={formatDate(job.created_at)} />
        {job.notes && <DetailRow label="Notes" value={job.notes} />}
      </div>

      {/* CUSTOMER */}
      <div style={{ background: 'var(--cresoa-surface)', borderRadius: '16px', padding: '1.2rem', marginBottom: '1rem', border: '1px solid var(--cresoa-border)', boxShadow: 'var(--shadow-sm)' }}>
        <h3 style={{ margin: '0 0 0.8rem', fontSize: '1rem', fontWeight: 800 }}>👤 Customer</h3>
        <DetailRow label="Name" value={customerName} />
        {customer?.phone && <DetailRow label="Phone" value={customer.phone} />}
        {customer?.email && <DetailRow label="Email" value={customer.email} />}
        {customer && (
          <button onClick={() => router.push(`/dashboard/printing/customers/${customer.id}?business_id=${businessIdFromUrl}`)} style={{ marginTop: '0.5rem', padding: '0.4rem 0.8rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'transparent', cursor: 'pointer', fontSize: '0.85rem' }}>View Customer Profile</button>
        )}
      </div>

      {/* DELIVERY / PICKUP */}
      <div style={{ background: 'var(--cresoa-surface)', borderRadius: '16px', padding: '1.2rem', marginBottom: '1rem', border: '1px solid var(--cresoa-border)', boxShadow: 'var(--shadow-sm)' }}>
        <h3 style={{ margin: '0 0 0.8rem', fontSize: '1rem', fontWeight: 800 }}>📦 Delivery / Pickup</h3>
        <DetailRow label="Method" value={job.delivery_method === 'delivery' ? 'Business Delivery' : 'Customer Pickup'} />
        {job.delivery_address && <DetailRow label="Address" value={job.delivery_address} />}
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.8rem' }}>
          {job.status !== 'ready' && !isDelivered && (
            <button onClick={() => handleUpdateStatus('ready')} className="cresoa-primary-button" style={{ background: 'var(--cresoa-success)' }}>Mark as Ready</button>
          )}
          {!isDelivered && (
            <button onClick={() => handleUpdateStatus('delivered')} className="cresoa-primary-button" style={{ background: 'var(--cresoa-primary)' }}>Mark as Delivered</button>
          )}
        </div>
      </div>

      {/* SECONDARY ACTIONS */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
        <button onClick={() => alert('Duplicate feature coming soon')} style={{ padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-surface)', color: 'var(--cresoa-text)', fontWeight: 600 }}><Svg name="copy" size={14} /> Duplicate Job</button>
        <button onClick={() => alert('Note edit coming soon')} style={{ padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-surface)', color: 'var(--cresoa-text)', fontWeight: 600 }}><Svg name="file" size={14} /> Add Note</button>
      </div>

      {/* STATUS MODAL */}
      {showStatusModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }} onClick={() => setShowStatusModal(false)}>
          <div style={{ background: 'var(--cresoa-surface)', borderRadius: '16px', padding: '1.5rem', maxWidth: '400px', width: '100%', boxShadow: 'var(--shadow-xl)' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 1rem', fontWeight: 700 }}>Update Status</h3>
            <div style={{ display: 'grid', gap: '0.5rem' }}>
              {STAGES.map(stage => (
                <button key={stage} onClick={() => handleUpdateStatus(stage)} disabled={updatingStatus || job.status === stage} style={{ padding: '0.6rem', borderRadius: '8px', border: `1px solid ${job.status === stage ? 'var(--cresoa-accent)' : 'var(--cresoa-border)'}`, background: job.status === stage ? 'var(--cresoa-accent-soft)' : 'var(--cresoa-surface)', color: job.status === stage ? 'var(--cresoa-accent)' : 'var(--cresoa-text)', cursor: 'pointer', fontWeight: 600, textAlign: 'left' }}>
                  {STAGE_LABELS[stage]} {job.status === stage && '✓'}
                </button>
              ))}
            </div>
            <button onClick={() => setShowStatusModal(false)} style={{ marginTop: '1rem', width: '100%', padding: '0.6rem', borderRadius: '8px', border: 'none', background: 'var(--cresoa-border)', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
          </div>
        </div>
      )}

      {/* PAYMENT MODAL */}
      {showPaymentModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }} onClick={() => setShowPaymentModal(false)}>
          <form onSubmit={handleRecordPayment} style={{ background: 'var(--cresoa-surface)', borderRadius: '16px', padding: '1.5rem', maxWidth: '400px', width: '100%' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 1rem', fontWeight: 700 }}>Record Payment</h3>
            <label style={labelStyle}>Amount (₦)</label>
            <input type="number" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} placeholder={`Max ${formatMoney(balance)}`} style={inputStyle} required />
            <label style={{ ...labelStyle, marginTop: '0.8rem' }}>Note (optional)</label>
            <input type="text" value={paymentNote} onChange={(e) => setPaymentNote(e.target.value)} placeholder="e.g. Bank transfer" style={inputStyle} />
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
              <button type="button" onClick={() => setShowPaymentModal(false)} style={{ flex: 1, padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'transparent', cursor: 'pointer' }}>Cancel</button>
              <button type="submit" disabled={savingPayment} style={{ flex: 1, padding: '0.6rem', borderRadius: '8px', border: 'none', background: 'var(--cresoa-accent)', color: '#fff', fontWeight: 700 }}>{savingPayment ? 'Saving...' : 'Save Payment'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

const inputStyle = {
  width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-bg)', color: 'var(--cresoa-text)', fontSize: '0.95rem', boxSizing: 'border-box'
}

const labelStyle = { display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem', color: 'var(--cresoa-text)' }
