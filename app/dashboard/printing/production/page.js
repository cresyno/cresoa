'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../../../../lib/supabaseClient'

// ─── Self-contained SVG Icons ───
const Svg = ({ name, size = 20, stroke = 'currentColor' }) => {
  const icons = {
    clock: <><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></>,
    user: <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></>,
    alert: <><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></>,
    'arrow-right': <><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></>,
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{icons[name]}</svg>
}

const formatMoney = (val) => `₦${Number(val || 0).toLocaleString('en-NG')}`
const formatDate = (dateStr) => dateStr ? new Date(dateStr).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' }) : ''

const STAGES = [
  { key: 'quote', label: 'Quote', color: 'var(--cresoa-info)' },
  { key: 'awaiting_deposit', label: 'Awaiting Deposit', color: 'var(--cresoa-warning)' },
  { key: 'designing', label: 'Designing', color: 'var(--cresoa-info)' },
  { key: 'awaiting_approval', label: 'Awaiting Approval', color: 'var(--cresoa-warning)' },
  { key: 'in_production', label: 'In Production', color: 'var(--cresoa-accent)' },
  { key: 'quality_check', label: 'Quality Check', color: 'var(--cresoa-info)' },
  { key: 'ready', label: 'Ready', color: 'var(--cresoa-success)' },
  { key: 'delivered', label: 'Delivered', color: 'var(--cresoa-success)' },
]

export default function ProductionBoardPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const businessId = searchParams.get('business_id')

  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchJobs = async () => {
      if (!businessId) return
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('print_jobs')
          .select('*')
          .eq('business_id', businessId)
          .eq('sector', 'printing')
          .order('created_at', { ascending: false })

        if (error) throw error
        setJobs(data || [])
      } catch (err) {
        console.error('Error fetching production jobs:', err)
        setError('Failed to load jobs')
      } finally {
        setLoading(false)
      }
    }
    fetchJobs()
  }, [businessId])

  if (loading) {
    return (
      <div style={{ padding: '1rem', minHeight: '100vh', background: 'var(--cresoa-bg)' }}>
        <div className="cresoa-skeleton-card" style={{ marginBottom: '1rem' }}><div className="cresoa-skeleton medium" /></div>
        <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto' }}>
          {STAGES.map(stage => (
            <div key={stage.key} className="cresoa-skeleton-card" style={{ flex: '0 0 220px', height: '200px' }}>
              <div className="cresoa-skeleton medium" />
              <div className="cresoa-skeleton short" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--cresoa-bg)' }}>
        <p style={{ color: 'var(--cresoa-danger)' }}>{error}</p>
      </div>
    )
  }

  return (
    <div style={{ padding: '1rem', minHeight: '100vh', background: 'var(--cresoa-bg)' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <p style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', margin: 0 }}>Printing</p>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0.2rem 0' }}>Production Board</h1>
      </div>

      {/* Kanban Columns */}
      <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', paddingBottom: '1rem' }}>
        {STAGES.map(stage => {
          const stageJobs = jobs.filter(job => job.status === stage.key)
          const isOverdue = (job) => job.deadline && new Date(job.deadline) < new Date() && !['delivered', 'ready'].includes(job.status)

          return (
            <div key={stage.key} style={{ flex: '0 0 260px', background: 'var(--cresoa-surface)', borderRadius: '12px', border: '1px solid var(--cresoa-border)', display: 'flex', flexDirection: 'column', maxHeight: 'calc(100vh - 120px)', overflowY: 'auto' }}>
              {/* Column Header */}
              <div style={{ padding: '0.8rem', borderBottom: `2px solid ${stage.color}`, background: `${stage.color}10` }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 700, color: 'var(--cresoa-text)', fontSize: '0.9rem' }}>{stage.label}</span>
                  <span style={{ background: stage.color, color: '#fff', borderRadius: '12px', padding: '0.1rem 0.5rem', fontSize: '0.75rem', fontWeight: 700 }}>{stageJobs.length}</span>
                </div>
              </div>

              {/* Job Cards */}
              <div style={{ padding: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {stageJobs.length === 0 ? (
                  <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--cresoa-text-muted)', fontSize: '0.85rem' }}>No jobs</div>
                ) : (
                  stageJobs.map(job => {
                    const overdue = isOverdue(job)
                    return (
                      <div
                        key={job.id}
                        onClick={() => router.push(`/dashboard/printing/jobs/${job.id}?business_id=${businessId}`)}
                        style={{
                          background: 'var(--cresoa-surface-soft)',
                          borderRadius: '8px',
                          padding: '0.6rem',
                          cursor: 'pointer',
                          border: `1px solid ${overdue ? 'var(--cresoa-danger)' : 'var(--cresoa-border)'}`,
                          transition: 'border-color 0.2s',
                        }}
                      >
                        <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--cresoa-text)', marginBottom: '0.2rem' }}>{job.title}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--cresoa-text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <Svg name="user" size={12} stroke="currentColor" /> {job.customer_name || 'Customer'}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.4rem' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--cresoa-accent)' }}>{formatMoney(job.total)}</span>
                          {overdue && <span style={{ fontSize: '0.7rem', color: 'var(--cresoa-danger)' }}>Overdue</span>}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
  }
