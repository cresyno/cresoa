'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { supabase } from '../../../../../lib/supabaseClient'

const Svg = ({ name, size = 20, stroke = 'currentColor' }) => {
  const icons = {
    back: <><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></>,
    edit: <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />,
    trash: <><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></>,
    plus: <><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></>,
    file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></>,
    phone: <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></>,
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{icons[name]}</svg>
}

const formatMoney = (val) => `₦${Number(val || 0).toLocaleString('en-NG')}`
const formatDate = (dateStr) => dateStr ? new Date(dateStr).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

export default function PrintingCustomerDetailPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const customerId = params.id
  const businessId = searchParams.get('business_id')

  const [loading, setLoading] = useState(true)
  const [customer, setCustomer] = useState(null)
  const [jobs, setJobs] = useState([])
  const [stats, setStats] = useState({ totalJobs: 0, totalSpent: 0, outstanding: 0 })

  useEffect(() => {
    const fetchData = async () => {
      if (!customerId || !businessId) return
      setLoading(true)
      try {
        const { data: custData } = await supabase
          .from('customers')
          .select('*')
          .eq('id', customerId)
          .eq('business_id', businessId)
          .maybeSingle()
        setCustomer(custData)

        const { data: jobData } = await supabase
          .from('print_jobs')
          .select('*')
          .eq('customer_id', customerId)
          .eq('business_id', businessId)
          .order('created_at', { ascending: false })
        setJobs(jobData || [])

        const totalJobs = (jobData || []).length
        const totalSpent = (jobData || []).reduce((sum, j) => sum + Number(j.amount_paid || 0), 0)
        const outstanding = (jobData || []).reduce((sum, j) => sum + (Number(j.total || 0) - Number(j.amount_paid || 0)), 0)
        setStats({ totalJobs, totalSpent, outstanding })
      } catch (err) {
        console.error('Error fetching customer detail:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [customerId, businessId])

  if (loading) {
    return <div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'var(--cresoa-bg)' }}><div className="cresoa-loading-spinner" /></div>
  }

  if (!customer) {
    return (
      <div style={{ minHeight: '70vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--cresoa-bg)' }}>
        <h2>Customer not found</h2>
        <button onClick={() => router.push(`/dashboard/printing/customers?business_id=${businessId}`)} className="cresoa-primary-button">Back to Customers</button>
      </div>
    )
  }

  const customerName = customer.name || `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'Unnamed'
  const initials = customerName.charAt(0).toUpperCase() || '?'

  const handleDelete = async () => {
    if (!confirm('Delete this customer and all their jobs? This cannot be undone.')) return
    try {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', customerId)
        .eq('business_id', businessId)
      if (error) throw error
      router.push(`/dashboard/printing/customers?business_id=${businessId}`)
    } catch (err) {
      alert('Failed to delete customer.')
    }
  }

  return (
    <div style={{ padding: '1rem', maxWidth: '900px', margin: '0 auto', background: 'var(--cresoa-bg)', minHeight: '100vh', paddingBottom: '80px' }}>
      {/* Back */}
      <button onClick={() => router.push(`/dashboard/printing/customers?business_id=${businessId}`)} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cresoa-text-muted)', marginBottom: '1rem' }}>
        <Svg name="back" size={16} stroke="currentColor" /> Back to Customers
      </button>

      {/* Header */}
      <div style={{ background: 'var(--cresoa-surface)', borderRadius: '16px', padding: '1.5rem', marginBottom: '1rem', border: '1px solid var(--cresoa-border)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <span className="cresoa-avatar" style={{ width: '56px', height: '56px', fontSize: '20px' }}>{initials}</span>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0' }}>{customerName}</h1>
          <p style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.85rem', margin: '0.2rem 0 0' }}>
            {customer.phone || 'No phone'} {customer.email ? ` · ${customer.email}` : ''}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={() => router.push(`/dashboard/printing/jobs/new?customer_id=${customer.id}&business_id=${businessId}`)} className="cresoa-primary-button" style={{ background: 'var(--cresoa-accent)' }}><Svg name="plus" size={14} stroke="#fff" /> New Job</button>
          <button onClick={() => router.push(`/dashboard/printing/customers/${customer.id}/edit?business_id=${businessId}`)} className="cresoa-primary-button" style={{ background: 'var(--cresoa-primary)' }}><Svg name="edit" size={14} stroke="#fff" /> Edit</button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '0.5rem', marginBottom: '1rem' }}>
        <div className="cresoa-card" style={{ padding: '0.75rem', textAlign: 'center' }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--cresoa-text-muted)', textTransform: 'uppercase' }}>Jobs</div>
          <div style={{ fontWeight: 700, fontSize: '1.2rem' }}>{stats.totalJobs}</div>
        </div>
        <div className="cresoa-card" style={{ padding: '0.75rem', textAlign: 'center' }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--cresoa-text-muted)', textTransform: 'uppercase' }}>Total Spent</div>
          <div style={{ fontWeight: 700, fontSize: '1.2rem', color: 'var(--cresoa-success)' }}>{formatMoney(stats.totalSpent)}</div>
        </div>
        <div className="cresoa-card" style={{ padding: '0.75rem', textAlign: 'center', borderColor: stats.outstanding > 0 ? 'var(--cresoa-danger)' : 'var(--cresoa-success)' }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--cresoa-text-muted)', textTransform: 'uppercase' }}>Balance</div>
          <div style={{ fontWeight: 700, fontSize: '1.2rem', color: stats.outstanding > 0 ? 'var(--cresoa-danger)' : 'var(--cresoa-success)' }}>{formatMoney(stats.outstanding)}</div>
        </div>
      </div>

      {/* Job History */}
      <div style={{ background: 'var(--cresoa-surface)', borderRadius: '16px', padding: '1.2rem', marginBottom: '1rem', border: '1px solid var(--cresoa-border)' }}>
        <h3 style={{ margin: '0 0 0.8rem', fontSize: '1rem', fontWeight: 800 }}>Job History</h3>
        {jobs.length === 0 ? (
          <div className="cresoa-empty-state">
            <Svg name="file" size={32} stroke="var(--cresoa-accent)" />
            <span className="cresoa-empty-state-title">No jobs yet</span>
            <span className="cresoa-empty-state-message">Create a job for this customer to get started.</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {jobs.map(job => (
              <div
                key={job.id}
                onClick={() => router.push(`/dashboard/printing/jobs/${job.id}?business_id=${businessId}`)}
                className="cresoa-card"
                style={{ padding: '0.75rem', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{job.title || 'Untitled Job'}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--cresoa-text-muted)' }}>{job.job_number} · {formatDate(job.deadline)}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 600 }}>{formatMoney(job.total)}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--cresoa-text-muted)' }}>{job.status || 'Pending'}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete */}
      <button onClick={handleDelete} style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--cresoa-danger)', background: 'transparent', color: 'var(--cresoa-danger)', fontWeight: 600, cursor: 'pointer' }}>
        <Svg name="trash" size={14} stroke="currentColor" /> Delete Customer
      </button>
    </div>
  )
  }
