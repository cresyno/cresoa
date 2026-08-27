'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../../lib/supabaseClient'

const Svg = ({ name, size = 20, stroke = 'currentColor' }) => {
  const icons = {
    plus: <><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></>,
    'bar-chart-2': <><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></>,
    'file-text': <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></>,
    'layers': <><polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" /></>,
    'clock': <><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></>,
    'alert': <><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></>,
    'check': <polyline points="20 6 9 17 4 12" />,
    'arrowRight': <><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></>,
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{icons[name]}</svg>
}

const formatMoney = (val) => `₦${Number(val || 0).toLocaleString('en-NG')}`

export default function PrintingDashboardPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const businessId = searchParams.get('business_id')

  const [loading, setLoading] = useState(true)
  const [jobs, setJobs] = useState([])
  const [quotations, setQuotations] = useState([])

  useEffect(() => {
    const fetchData = async () => {
      if (!businessId) return
      setLoading(true)
      try {
        const { data: jobsData } = await supabase
          .from('print_jobs')
          .select('*')
          .eq('business_id', businessId)
          .order('created_at', { ascending: false })
        setJobs(jobsData || [])

        const { data: quotesData } = await supabase
          .from('quotations')
          .select('*')
          .eq('business_id', businessId)
          .order('created_at', { ascending: false })
        setQuotations(quotesData || [])
      } catch (e) {
        console.error('Error fetching printing data:', e)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [businessId])

  const stats = useMemo(() => {
    const active = jobs.filter(j => !['delivered', 'cancelled'].includes(j.status)).length
    const awaitingApproval = jobs.filter(j => j.status === 'awaiting_approval').length
    const inProduction = jobs.filter(j => ['in_production', 'designing', 'quality_check'].includes(j.status)).length
    const ready = jobs.filter(j => ['ready', 'ready_for_pickup'].includes(j.status)).length
    const overdue = jobs.filter(j => j.deadline && new Date(j.deadline) < new Date() && !['delivered', 'cancelled'].includes(j.status)).length
    const outstanding = jobs.reduce((sum, j) => sum + Math.max(0, Number(j.total) - Number(j.amount_paid)), 0)
    const todayRevenue = jobs.filter(j => new Date(j.created_at).toDateString() === new Date().toDateString()).reduce((sum, j) => sum + Number(j.amount_paid || 0), 0)
    return { active, awaitingApproval, inProduction, ready, overdue, outstanding, todayRevenue }
  }, [jobs])

  const navigateTo = (path) => router.push(`${path}?business_id=${businessId}`)

  if (loading) {
    return (
      <div style={{ padding: '1rem', maxWidth: '1200px', margin: '0 auto', background: 'var(--cresoa-bg)', minHeight: '100vh' }}>
        <div className="cresoa-skeleton-card" style={{ marginBottom: '1rem' }}><div className="cresoa-skeleton medium" /></div>
        <div className="cresoa-loading-grid">
          {[1, 2, 3, 4].map(i => <div key={i} className="cresoa-skeleton-card"><div className="cresoa-skeleton short" /></div>)}
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
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0.2rem 0', color: 'var(--cresoa-text)' }}>Dashboard</h1>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={() => navigateTo('/dashboard/printing/jobs/new')} className="cresoa-primary-button"><Svg name="plus" size={16} stroke="#fff" /> New Job</button>
          <button onClick={() => navigateTo('/dashboard/printing/quotations/new')} className="cresoa-primary-button" style={{ background: 'var(--cresoa-primary)' }}><Svg name="file-text" size={16} stroke="#fff" /> New Quote</button>
        </div>
      </div>

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <div className="cresoa-card" style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--cresoa-text-muted)', textTransform: 'uppercase' }}>Active Jobs</div>
          <div style={{ fontWeight: 700, fontSize: '1.2rem' }}>{stats.active}</div>
        </div>
        <div className="cresoa-card" style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--cresoa-text-muted)', textTransform: 'uppercase' }}>Awaiting Approval</div>
          <div style={{ fontWeight: 700, fontSize: '1.2rem', color: stats.awaitingApproval > 0 ? 'var(--cresoa-warning)' : 'var(--cresoa-text)' }}>{stats.awaitingApproval}</div>
        </div>
        <div className="cresoa-card" style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--cresoa-text-muted)', textTransform: 'uppercase' }}>In Production</div>
          <div style={{ fontWeight: 700, fontSize: '1.2rem' }}>{stats.inProduction}</div>
        </div>
        <div className="cresoa-card" style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--cresoa-text-muted)', textTransform: 'uppercase' }}>Ready</div>
          <div style={{ fontWeight: 700, fontSize: '1.2rem', color: 'var(--cresoa-success)' }}>{stats.ready}</div>
        </div>
        <div className="cresoa-card" style={{ padding: '0.75rem 1rem', textAlign: 'center', borderColor: stats.overdue > 0 ? 'var(--cresoa-danger)' : 'var(--cresoa-border)' }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--cresoa-text-muted)', textTransform: 'uppercase' }}>Overdue</div>
          <div style={{ fontWeight: 700, fontSize: '1.2rem', color: stats.overdue > 0 ? 'var(--cresoa-danger)' : 'var(--cresoa-text)' }}>{stats.overdue}</div>
        </div>
        <div className="cresoa-card" style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--cresoa-text-muted)', textTransform: 'uppercase' }}>Outstanding</div>
          <div style={{ fontWeight: 700, fontSize: '1.2rem', color: 'var(--cresoa-danger)' }}>{formatMoney(stats.outstanding)}</div>
        </div>
        <div className="cresoa-card" style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--cresoa-text-muted)', textTransform: 'uppercase' }}>Today's Revenue</div>
          <div style={{ fontWeight: 700, fontSize: '1.2rem', color: 'var(--cresoa-accent)' }}>{formatMoney(stats.todayRevenue)}</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="cresoa-card" style={{ padding: '1rem', marginBottom: '1.5rem' }}>
        <h3 style={{ margin: '0 0 0.75rem', fontSize: '0.95rem', fontWeight: 700, color: 'var(--cresoa-text)' }}>Quick Actions</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '0.5rem' }}>
          <button onClick={() => navigateTo('/dashboard/printing/jobs/new')} className="cresoa-primary-button"><Svg name="plus" size={14} stroke="#fff" /> New Job</button>
          <button onClick={() => navigateTo('/dashboard/printing/quotations/new')} className="cresoa-primary-button" style={{ background: 'var(--cresoa-primary)' }}><Svg name="file-text" size={14} stroke="#fff" /> New Quote</button>
          <button onClick={() => navigateTo('/dashboard/printing/production')} className="cresoa-primary-button" style={{ background: 'var(--cresoa-success)' }}><Svg name="layers" size={14} stroke="#fff" /> Production</button>
          <button onClick={() => navigateTo('/dashboard/printing/jobs')} className="cresoa-primary-button" style={{ background: 'var(--cresoa-primary-dark)' }}><Svg name="file-text" size={14} stroke="#fff" /> All Jobs</button>
        </div>
      </div>

      {/* Recent Jobs */}
      <div className="cresoa-card" style={{ padding: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--cresoa-text)' }}>Recent Jobs</h3>
          <button onClick={() => navigateTo('/dashboard/printing/jobs')} style={{ background: 'none', border: 'none', color: 'var(--cresoa-accent)', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}>View All →</button>
        </div>
        {jobs.length === 0 ? (
          <div className="cresoa-empty-state">
            <Svg name="file-text" size={32} stroke="var(--cresoa-accent)" />
            <span className="cresoa-empty-state-title">No jobs yet</span>
            <span className="cresoa-empty-state-message">Create your first printing job to get started.</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {jobs.slice(0, 5).map(job => (
              <div key={job.id} onClick={() => navigateTo(`/dashboard/printing/jobs/${job.id}`)} className="cresoa-card" style={{ cursor: 'pointer', padding: '0.8rem 1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--cresoa-text)' }}>{job.title || 'Untitled Job'}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--cresoa-text-muted)' }}>{job.job_number} · {formatMoney(job.total)}</div>
                  </div>
                  <span className="cresoa-status cresoa-status-info">{job.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
  }
