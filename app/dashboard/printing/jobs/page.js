'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../../../lib/supabaseClient'

// ─── Self-contained SVG icons ───
const Svg = ({ name, size = 20, stroke = 'currentColor' }) => {
  const icons = {
    plus: <><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></>,
    search: <><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></>,
    chevronRight: <polyline points="9 18 15 12 9 6" />,
    file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></>,
    clock: <><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></>,
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{icons[name]}</svg>
}

const formatMoney = (val) => `₦${Number(val || 0).toLocaleString('en-NG')}`
const formatDate = (dateStr) => dateStr ? new Date(dateStr).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) : 'No deadline'

// Status config
const STATUS_CONFIG = {
  quote: { label: 'Quote', color: 'var(--cresoa-info)', bg: 'var(--cresoa-info-soft)' },
  awaiting_deposit: { label: 'Awaiting Deposit', color: 'var(--cresoa-warning)', bg: 'var(--cresoa-warning-soft)' },
  designing: { label: 'Designing', color: 'var(--cresoa-info)', bg: 'var(--cresoa-info-soft)' },
  awaiting_approval: { label: 'Awaiting Approval', color: 'var(--cresoa-warning)', bg: 'var(--cresoa-warning-soft)' },
  in_production: { label: 'In Production', color: 'var(--cresoa-success)', bg: 'var(--cresoa-success-soft)' },
  quality_check: { label: 'Quality Check', color: 'var(--cresoa-warning)', bg: 'var(--cresoa-warning-soft)' },
  ready: { label: 'Ready', color: 'var(--cresoa-success)', bg: 'var(--cresoa-success-soft)' },
  delivered: { label: 'Delivered', color: 'var(--cresoa-text-muted)', bg: 'var(--cresoa-bg)' },
  cancelled: { label: 'Cancelled', color: 'var(--cresoa-danger)', bg: 'var(--cresoa-danger-soft)' },
}

export default function PrintingJobsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const businessId = searchParams.get('business_id')

  const [jobs, setJobs] = useState([])
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filter, setFilter] = useState('all')

  // Fetch jobs + customers
  useEffect(() => {
    const fetchData = async () => {
      if (!businessId) return
      setLoading(true)
      try {
        const { data: jobsData, error: jobsError } = await supabase
          .from('print_jobs')
          .select('*')
          .eq('business_id', businessId)
          .order('created_at', { ascending: false })

        if (jobsError) throw jobsError

        const { data: customersData, error: customersError } = await supabase
          .from('customers')
          .select('id, first_name, last_name, phone')
          .eq('business_id', businessId)
          .eq('sector', 'printing')

        if (customersError) throw customersError

        setJobs(jobsData || [])
        setCustomers(customersData || [])
      } catch (err) {
        console.error('Error fetching printing jobs:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [businessId])

  // Filter logic
  const filteredJobs = useMemo(() => {
    let result = jobs

    if (searchTerm) {
      const q = searchTerm.toLowerCase()
      result = result.filter(job => {
        const customerName = customers.find(c => c.id === job.customer_id)
        const name = customerName ? `${customerName.first_name} ${customerName.last_name}`.toLowerCase() : ''
        return job.title.toLowerCase().includes(q) || job.job_number.toLowerCase().includes(q) || name.includes(q)
      })
    }

    if (filter !== 'all') {
      result = result.filter(job => job.status === filter)
    }

    return result
  }, [jobs, customers, searchTerm, filter])

  const navigateTo = (path) => router.push(`${path}?business_id=${businessId}`)

  if (loading) {
    return (
      <div style={{ padding: '1rem', maxWidth: '1200px', margin: '0 auto', background: 'var(--cresoa-bg)', minHeight: '100vh' }}>
        <div className="cresoa-skeleton-card" style={{ marginBottom: '1rem' }}><div className="cresoa-skeleton medium" /></div>
        <div className="cresoa-loading-grid">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="cresoa-skeleton-card"><div className="cresoa-skeleton short" /></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '1rem', maxWidth: '1200px', margin: '0 auto', background: 'var(--cresoa-bg)', minHeight: '100vh', paddingBottom: '80px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <p style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', margin: 0 }}>Printing</p>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0.2rem 0', color: 'var(--cresoa-text)' }}>All Jobs</h1>
        </div>
        <button onClick={() => navigateTo('/dashboard/printing/jobs/new')} className="cresoa-primary-button">
          <Svg name="plus" size={16} stroke="#fff" /> New Job
        </button>
      </div>

      {/* Search */}
      <div style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', background: 'var(--cresoa-surface)', border: '1px solid var(--cresoa-border)', borderRadius: '8px', padding: '0.4rem 0.8rem' }}>
          <Svg name="search" size={16} stroke="var(--cresoa-text-muted)" style={{ marginRight: '0.5rem' }} />
          <input
            type="text"
            placeholder="Search by job title, number, customer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', color: 'var(--cresoa-text)', fontSize: '0.9rem' }}
          />
        </div>
      </div>

      {/* Filter Chips */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
        {[{ key: 'all', label: 'All' }, ...Object.entries(STATUS_CONFIG).map(([key, val]) => ({ key, label: val.label }))].map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            style={{
              padding: '0.35rem 0.9rem',
              borderRadius: '20px',
              border: `1px solid ${filter === f.key ? 'var(--cresoa-accent)' : 'var(--cresoa-border)'}`,
              background: filter === f.key ? 'var(--cresoa-accent)' : 'var(--cresoa-surface)',
              color: filter === f.key ? '#fff' : 'var(--cresoa-text-muted)',
              fontWeight: 600,
              fontSize: '0.8rem',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Jobs List */}
      {filteredJobs.length === 0 ? (
        <div className="cresoa-empty-state">
          <Svg name="file" size={32} stroke="var(--cresoa-accent)" />
          <span className="cresoa-empty-state-title">No jobs found</span>
          <span className="cresoa-empty-state-message">Create your first printing job to get started.</span>
          <button onClick={() => navigateTo('/dashboard/printing/jobs/new')} className="cresoa-primary-button" style={{ marginTop: '1rem' }}>
            <Svg name="plus" size={14} stroke="#fff" /> New Job
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {filteredJobs.map(job => {
            const customer = customers.find(c => c.id === job.customer_id)
            const customerName = customer ? `${customer.first_name} ${customer.last_name}` : 'Customer'
            const statusInfo = STATUS_CONFIG[job.status] || { label: job.status, color: 'var(--cresoa-text-muted)', bg: 'var(--cresoa-bg)' }
            const balance = Math.max(0, Number(job.total) - Number(job.amount_paid))
            const isOverdue = job.deadline && new Date(job.deadline) < new Date() && !['delivered', 'cancelled'].includes(job.status)

            return (
              <div
                key={job.id}
                onClick={() => navigateTo(`/dashboard/printing/jobs/${job.id}`)}
                className="cresoa-card"
                style={{ cursor: 'pointer', padding: '1rem' }}
              >
                {/* Top row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: 'var(--cresoa-text)', fontSize: '1rem' }}>{job.title || 'Untitled Job'}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--cresoa-text-muted)' }}>{job.job_number} · {customerName}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, color: 'var(--cresoa-text)' }}>{formatMoney(job.total)}</div>
                    {balance > 0 && <div style={{ fontSize: '0.75rem', color: 'var(--cresoa-danger)' }}>Balance: {formatMoney(balance)}</div>}
                  </div>
                </div>

                {/* Bottom row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--cresoa-border)', paddingTop: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span className="cresoa-status" style={{ background: statusInfo.bg, color: statusInfo.color }}>{statusInfo.label}</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--cresoa-text-muted)' }}>{job.quantity} pcs</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', color: isOverdue ? 'var(--cresoa-danger)' : 'var(--cresoa-text-muted)' }}>
                    <Svg name="clock" size={14} stroke={isOverdue ? 'var(--cresoa-danger)' : 'var(--cresoa-text-muted)'} />
                    {isOverdue ? 'Overdue' : formatDate(job.deadline)}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
      }
