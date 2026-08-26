'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../../../lib/supabaseClient'

// ─── Self-contained SVG icons ───
const Svg = ({ name, size = 20, stroke = 'currentColor' }) => {
  const icons = {
    plus: <><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></>,
    search: <><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></>,
    tool: <><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" /></>,
    clock: <><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></>,
    check: <polyline points="20 6 9 17 4 12" />,
    naira: <><path d="M6 3v18M18 3v18M6 8h12M6 16h12" /><path d="M6 3l6 9 6-9M6 21l6-9 6 9" /></>,
    arrowRight: <><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></>,
    filter: <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />,
    user: <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></>,
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{icons[name]}</svg>
}

// ─── NAIRA MONEY FORMATTER ───
const formatMoney = (val) => `₦${Number(val || 0).toLocaleString('en-NG')}`

// ─── Status helper ───
const getStatusInfo = (job) => {
  const status = (job.current_status || '').toLowerCase()
  const overdue = job.due_date && new Date(job.due_date) < new Date() && !['delivered', 'completed', 'cancelled'].includes(status)
  
  if (overdue) return { label: 'Overdue', type: 'danger' }
  if (['delivered', 'completed'].includes(status)) return { label: 'Completed', type: 'success' }
  if (['ready', 'ready for pickup', 'ready for collection'].includes(status)) return { label: 'Ready', type: 'warning' }
  if (['awaiting parts', 'waiting parts', 'in progress'].includes(status)) return { label: 'In Progress', type: 'info' }
  return { label: 'Active', type: 'info' }
}

export default function RepairsJobsPage() {
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
          .from('orders')
          .select('*')
          .eq('business_id', businessId)
          .eq('sector', 'repairs')
          .order('created_at', { ascending: false })

        if (jobsError) throw jobsError

        const { data: customersData, error: customersError } = await supabase
          .from('customers')
          .select('id, name')
          .eq('business_id', businessId)
          .eq('sector', 'repairs')

        if (customersError) throw customersError

        setJobs(jobsData || [])
        setCustomers(customersData || [])
      } catch (error) {
        console.error('Error fetching jobs:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [businessId])

  // Filter logic
  const filteredJobs = useMemo(() => {
    return jobs.filter(job => {
      const matchesSearch = (job.title || '').toLowerCase().includes(searchTerm.toLowerCase())
      const status = (job.current_status || '').toLowerCase()
      const isOverdue = job.due_date && new Date(job.due_date) < new Date() && !['delivered', 'completed', 'cancelled'].includes(status)

      const matchesFilter =
        filter === 'all' ? true :
        filter === 'active' ? !['delivered', 'completed', 'cancelled'].includes(status) :
        filter === 'overdue' ? isOverdue :
        filter === 'ready' ? ['ready', 'ready for pickup', 'ready for collection'].includes(status) :
        filter === 'awaiting' ? ['awaiting parts', 'waiting parts', 'in progress'].includes(status) : true

      return matchesSearch && matchesFilter
    })
  }, [jobs, searchTerm, filter])

  const navigateTo = (path) => router.push(`${path}?business_id=${businessId}`)

  // Loading skeleton
  if (loading) {
    return (
      <div style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto', background: 'var(--cresoa-bg)', minHeight: '100vh' }}>
        {/* Skeleton header */}
        <div className="cresoa-skeleton-card" style={{ marginBottom: '1.5rem' }}>
          <div className="cresoa-skeleton medium" />
          <div className="cresoa-skeleton short" />
        </div>
        {/* Skeleton search */}
        <div className="cresoa-skeleton-card" style={{ marginBottom: '1.5rem' }}>
          <div className="cresoa-skeleton long" />
        </div>
        {/* Skeleton job cards */}
        <div className="cresoa-loading-grid">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="cresoa-skeleton-card">
              <div className="cresoa-skeleton medium" />
              <div className="cresoa-skeleton short" />
              <div className="cresoa-skeleton long" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto', background: 'var(--cresoa-bg)', minHeight: '100vh' }}>
      {/* ─── PAGE HEADER ─── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <p style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', margin: 0 }}>Repairs</p>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0.2rem 0', color: 'var(--cresoa-text)' }}>All Jobs</h1>
        </div>
        <button onClick={() => navigateTo('/dashboard/repairs/jobs/new')} className="cresoa-primary-button">
          <Svg name="plus" size={16} stroke="#fff" /> New Job
        </button>
      </div>

      {/* ─── SEARCH BAR ─── */}
      <div style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', background: 'var(--cresoa-surface)', border: '1px solid var(--cresoa-border)', borderRadius: '12px', padding: '0.5rem 0.8rem' }}>
          <Svg name="search" size={18} stroke="var(--cresoa-text-muted)" style={{ marginRight: '0.5rem' }} />
          <input
            type="text"
            placeholder="Search jobs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', color: 'var(--cresoa-text)', fontSize: '0.9rem' }}
          />
        </div>
      </div>

      {/* ─── FILTER CHIPS ─── */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
        {[
          { key: 'all', label: 'All' },
          { key: 'active', label: 'Active' },
          { key: 'overdue', label: 'Overdue' },
          { key: 'ready', label: 'Ready' },
          { key: 'awaiting', label: 'Awaiting' },
        ].map((f) => (
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
              transition: 'all 0.2s ease',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* ─── JOBS LIST ─── */}
      {filteredJobs.length === 0 ? (
        <div className="cresoa-empty-state">
          <Svg name="tool" size={40} stroke="var(--cresoa-accent)" />
          <span className="cresoa-empty-state-title">No jobs found</span>
          <span className="cresoa-empty-state-message">Start by creating your first repair job.</span>
          <button onClick={() => navigateTo('/dashboard/repairs/jobs/new')} className="cresoa-primary-button" style={{ marginTop: '1rem' }}>
            <Svg name="plus" size={16} stroke="#fff" /> Create First Job
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {filteredJobs.map(job => {
            const customerName = customers.find(c => c.id === job.customer_id)?.name || 'Customer'
            const statusInfo = getStatusInfo(job)
            const statusClass = `cresoa-status-${statusInfo.type}`
            const overdue = statusInfo.type === 'danger'
            return (
              <div
                key={job.id}
                onClick={() => navigateTo(`/dashboard/repairs/jobs/${job.id}`)}
                className="cresoa-card"
                style={{ cursor: 'pointer', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}
              >
                {/* Top row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: 'var(--cresoa-text)', fontSize: '1rem' }}>{job.title || 'Repair Job'}</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--cresoa-text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.2rem' }}>
                      <Svg name="user" size={12} stroke="var(--cresoa-text-muted)" />
                      {customerName}
                    </div>
                  </div>
                  <div style={{ fontWeight: 700, color: 'var(--cresoa-accent)', fontSize: '0.95rem', flexShrink: 0 }}>{formatMoney(job.price)}</div>
                </div>

                {/* Bottom row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--cresoa-border)', paddingTop: '0.5rem' }}>
                  <span className={`cresoa-status ${statusClass}`}>{statusInfo.label}</span>
                  {job.due_date ? (
                    <span style={{ fontSize: '0.8rem', color: overdue ? 'var(--cresoa-danger)' : 'var(--cresoa-text-muted)' }}>
                      Due {new Date(job.due_date).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}
                    </span>
                  ) : null}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
      }
