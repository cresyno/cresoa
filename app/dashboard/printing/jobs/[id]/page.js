'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { supabase } from '../../../../../lib/supabaseClient'

// ─── Self-contained SVG icons ───
const Svg = ({ name, size = 20, stroke = 'currentColor' }) => {
  const icons = {
    back: <><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></>,
    edit: <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />,
    card: <><rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><line x1="1" y1="10" x2="23" y2="10" /></>,
    'file-text': <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></>,
    'arrow-right': <><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></>,
    clock: <><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></>,
    user: <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></>,
    upload: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></>,
    whatsapp: <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />,
    check: <polyline points="20 6 9 17 4 12" />,
    x: <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>,
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{icons[name]}</svg>
}

// Status stages for printing
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
  const [showStatusModal, setShowStatusModal] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)

  const fetchJob = async () => {
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

      // Fetch customer
      if (jobData.customer_id) {
        const { data: custData } = await supabase
          .from('customers')
          .select('*')
          .eq('id', jobData.customer_id)
          .maybeSingle()
        setCustomer(custData)
      }

      // Fetch assigned staff
      const assignedIds = jobData.assigned_staff_ids || []
      if (assignedIds.length > 0) {
        const { data: staffData } = await supabase
          .from('staff')
          .select('*')
          .in('id', assignedIds)
        setStaffList(staffData || [])
      } else {
        setStaffList([])
      }
    } catch (err) {
      console.error('Fetch print job error:', err)
      setError(err.message || 'Could not load job.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (jobId && businessIdFromUrl) fetchJob()
  }, [jobId, businessIdFromUrl])

  const balance = job ? Math.max(0, Number(job.total) - Number(job.amount_paid)) : 0
  const isDelivered = job?.status === 'delivered'

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
      await fetchJob()
      setShowStatusModal(false)
    } catch (err) {
      alert('Failed to update status.')
    } finally {
      setUpdatingStatus(false)
    }
  }

  if (loading) {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--cresoa-bg)' }}><div className="cresoa-loading-spinner" /></div>
  }

  if (error || !job) {
    return (
      <div style={{ minHeight: '70vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', background: 'var(--cresoa-bg)' }}>
        <h2>Couldn't load job</h2>
        <p style={{ color: 'var(--cresoa-text-muted)' }}>{error || 'Job not found'}</p>
        <button onClick={() => router.push(`/dashboard/printing/jobs?business_id=${businessIdFromUrl}`)} className="cresoa-primary-button">Back to Jobs</button>
      </div>
    )
  }

  const customerName = customer?.name || `${customer?.first_name || ''} ${customer?.last_name || ''}`.trim() || 'Customer'

  return (
    <div style={{ padding: '1rem', maxWidth: '800px', margin: '0 auto', background: 'var(--cresoa-bg)', minHeight: '100vh', paddingBottom: '100px' }}>
      {/* Back button */}
      <button onClick={() => router.push(`/dashboard/printing/jobs?business_id=${businessIdFromUrl}`)} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cresoa-text-muted)', marginBottom: '1rem' }}>
        <Svg name="back" size={16} stroke="currentColor" /> Jobs
      </button>

      {/* Job Header */}
      <div style={{ background: 'var(--cresoa-surface)', borderRadius: '16px', padding: '1.5rem', marginBottom: '1rem', border: '1px solid var(--cresoa-border)' }}>
        <p style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', margin: 0 }}>Job #{job.job_number}</p>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0.3rem 0', color: 'var(--cresoa-text)' }}>{job.title}</h1>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
          <span style={{ padding: '0.2rem 0.6rem', borderRadius: '12px', background: isDelivered ? 'var(--cresoa-success-soft)' : 'var(--cresoa-warning-soft)', color: isDelivered ? 'var(--cresoa-success)' : 'var(--cresoa-warning)', fontWeight: 600, fontSize: '0.75rem' }}>{STAGE_LABELS[job.status] || job.status}</span>
          {job.job_type && <span style={{ padding: '0.2rem 0.6rem', borderRadius: '12px', background: 'var(--cresoa-surface-soft)', color: 'var(--cresoa-text-muted)', fontWeight: 600, fontSize: '0.75rem' }}>{job.job_type}</span>}
          {job.quantity && <span style={{ padding: '0.2rem 0.6rem', borderRadius: '12px', background: 'var(--cresoa-surface-soft)', color: 'var(--cresoa-text-muted)', fontWeight: 600, fontSize: '0.75rem' }}>Qty: {job.quantity}</span>}
        </div>
      </div>

      {/* Status Timeline */}
      <div style={{ background: 'var(--cresoa-surface)', borderRadius: '12px', padding: '1rem', marginBottom: '1rem', border: '1px solid var(--cresoa-border)' }}>
        <h3 style={{ margin: '0 0 0.8rem', fontSize: '0.9rem', fontWeight: 700 }}>Progress</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {STAGES.map(stage => {
            const active = STAGES.indexOf(job.status) >= STAGES.indexOf(stage)
            const isCurrent = job.status === stage
            return (
              <span key={stage} style={{ padding: '0.3rem 0.8rem', borderRadius: '12px', background: active ? 'var(--cresoa-accent-soft)' : 'var(--cresoa-surface-soft)', color: active ? 'var(--cresoa-accent)' : 'var(--cresoa-text-muted)', fontSize: '0.75rem', fontWeight: isCurrent ? 700 : 500 }}>
                {STAGE_LABELS[stage]}
              </span>
            )
          })}
        </div>
      </div>

      {/* Payment Summary */}
      <div style={{ background: 'var(--cresoa-surface)', borderRadius: '12px', padding: '1rem', marginBottom: '1rem', border: '1px solid var(--cresoa-border)' }}>
        <h3 style={{ margin: '0 0 0.8rem', fontSize: '0.9rem', fontWeight: 700 }}>Payment</h3>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
          <span style={{ color: 'var(--cresoa-text-muted)' }}>Total</span>
          <strong>{formatMoney(job.total)}</strong>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
          <span style={{ color: 'var(--cresoa-text-muted)' }}>Paid</span>
          <strong style={{ color: 'var(--cresoa-success)' }}>{formatMoney(job.amount_paid)}</strong>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: 'var(--cresoa-text-muted)' }}>Balance</span>
          <strong style={{ color: balance > 0 ? 'var(--cresoa-danger)' : 'var(--cresoa-success)' }}>{formatMoney(balance)}</strong>
        </div>
      </div>

      {/* Job Details */}
      <div style={{ background: 'var(--cresoa-surface)', borderRadius: '12px', padding: '1rem', marginBottom: '1rem', border: '1px solid var(--cresoa-border)' }}>
        <h3 style={{ margin: '0 0 0.8rem', fontSize: '0.9rem', fontWeight: 700 }}>Details</h3>
        <div style={{ display: 'grid', gap: '0.5rem' }}>
          <DetailRow label="Customer" value={customerName} />
          <DetailRow label="Quantity" value={job.quantity || '—'} />
          <DetailRow label="Deadline" value={job.deadline ? formatDate(job.deadline) : 'Not set'} />
          <DetailRow label="Delivery" value={job.delivery_method === 'delivery' ? (job.delivery_address || 'Business Delivery') : 'Customer Pickup'} />
          <DetailRow label="Specifications" value={job.specifications?.specs || job.specifications?.size || '—'} />
          {job.notes && <DetailRow label="Notes" value={job.notes} />}
        </div>
      </div>

      {/* Assigned Staff */}
      <div style={{ background: 'var(--cresoa-surface)', borderRadius: '12px', padding: '1rem', marginBottom: '1rem', border: '1px solid var(--cresoa-border)' }}>
        <h3 style={{ margin: '0 0 0.8rem', fontSize: '0.9rem', fontWeight: 700 }}>Assigned Staff</h3>
        {staffList.length > 0 ? (
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {staffList.map(staff => (
              <span key={staff.id} style={{ padding: '0.3rem 0.8rem', borderRadius: '12px', background: 'var(--cresoa-accent-soft)', color: 'var(--cresoa-accent)', fontSize: '0.75rem', fontWeight: 600 }}>{staff.name}</span>
            ))}
          </div>
        ) : (
          <p style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.85rem', margin: 0 }}>Unassigned</p>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        <button onClick={() => setShowStatusModal(true)} className="cresoa-primary-button"><Svg name="arrow-right" size={14} stroke="#fff" style={{ marginRight: '0.3rem' }} /> Update Status</button>
        <button onClick={() => router.push(`/dashboard/printing/invoices/new?job_id=${job.id}&business_id=${businessIdFromUrl}`)} className="cresoa-primary-button" style={{ background: 'var(--cresoa-primary)' }}><Svg name="file-text" size={14} stroke="#fff" style={{ marginRight: '0.3rem' }} /> Invoice</button>
        <button onClick={() => router.push(`/dashboard/printing/jobs/${job.id}/edit?business_id=${businessIdFromUrl}`)} className="cresoa-primary-button" style={{ background: 'var(--cresoa-success)' }}><Svg name="edit" size={14} stroke="#fff" style={{ marginRight: '0.3rem' }} /> Edit</button>
      </div>

      {/* Files (Placeholder) */}
      <div style={{ background: 'var(--cresoa-surface)', borderRadius: '12px', padding: '1rem', marginBottom: '1rem', border: '1px solid var(--cresoa-border)' }}>
        <h3 style={{ margin: '0 0 0.8rem', fontSize: '0.9rem', fontWeight: 700 }}>Files</h3>
        <p style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.85rem', margin: 0 }}>No files uploaded yet.</p>
      </div>

      {/* Status Modal */}
      {showStatusModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }} onClick={() => setShowStatusModal(false)}>
          <div style={{ background: 'var(--cresoa-surface)', borderRadius: '16px', padding: '1.5rem', maxWidth: '400px', width: '100%' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 1rem', fontWeight: 700 }}>Update Status</h3>
            <div style={{ display: 'grid', gap: '0.5rem' }}>
              {STAGES.map(stage => (
                <button key={stage} onClick={() => handleUpdateStatus(stage)} disabled={updatingStatus || job.status === stage} style={{ padding: '0.6rem', borderRadius: '8px', border: `1px solid ${job.status === stage ? 'var(--cresoa-accent)' : 'var(--cresoa-border)'}`, background: job.status === stage ? 'var(--cresoa-accent-soft)' : 'var(--cresoa-surface)', color: job.status === stage ? 'var(--cresoa-accent)' : 'var(--cresoa-text)', cursor: 'pointer', fontWeight: 600, textAlign: 'left' }}>
                  {STAGE_LABELS[stage]}
                  {job.status === stage && <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem' }}>✓</span>}
                </button>
              ))}
            </div>
            <button onClick={() => setShowStatusModal(false)} style={{ marginTop: '1rem', width: '100%', padding: '0.6rem', borderRadius: '8px', border: 'none', background: 'var(--cresoa-border)', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}

// Helper
function DetailRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.3rem 0', borderBottom: '1px solid var(--cresoa-border)' }}>
      <span style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.85rem' }}>{label}</span>
      <span style={{ fontSize: '0.9rem', fontWeight: 500, textAlign: 'right', maxWidth: '60%' }}>{value}</span>
    </div>
  )
    }
