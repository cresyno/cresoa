'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../../lib/supabaseClient'
import UpgradeBanner from '../../../../components/UpgradeBanner'
import { getPlanLimits } from '../../../../lib/planLimits'

const REPAIR_STAGES = ['Diagnosing', 'Awaiting Parts', 'Repairing', 'Ready', 'Completed', 'Delivered']

export default function RepairsJobsPage() {
  const router = useRouter()
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [business, setBusiness] = useState(null)
  const [isOwner, setIsOwner] = useState(false)
  const [plan, setPlan] = useState('free')
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    awaitingParts: 0,
    ready: 0,
  })
  const [totalOrdersCount, setTotalOrdersCount] = useState(0)

  const loadJobs = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data: businessData } = await supabase
        .from('businesses')
        .select('id, plan, owner_id')
        .eq('owner_id', user.id)
        .single()

      if (!businessData) {
        setLoading(false)
        return
      }

      setBusiness(businessData)
      setPlan(businessData.plan || 'free')
      setIsOwner(user.id === businessData.owner_id)

      const { count: totalCount } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', businessData.id)
      setTotalOrdersCount(totalCount || 0)

      const { data: jobData, error } = await supabase
        .from('orders')
        .select('*, customers(name, phone)')
        .eq('business_id', businessData.id)
        .not('device_type', 'is', null)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading jobs:', error)
        setJobs([])
      } else {
        setJobs(jobData || [])
      }

      const total = jobData?.length || 0
      const active = jobData?.filter(j => 
        j.current_status !== 'Completed' && j.current_status !== 'Delivered'
      ).length || 0
      const awaitingParts = jobData?.filter(j => 
        j.current_status === 'Awaiting Parts'
      ).length || 0
      const ready = jobData?.filter(j => 
        j.current_status === 'Ready'
      ).length || 0

      setStats({ total, active, awaitingParts, ready })
    } catch (err) {
      console.error('Error:', err)
      setJobs([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadJobs()
  }, [])

  const limits = getPlanLimits(plan)
  const canAddMore = totalOrdersCount < limits.orders

  const getStatusInfo = (status) => {
    const map = {
      'Diagnosing': { label: 'Diagnosing', color: '#6B6255', bg: '#F0EDE8' },
      'Awaiting Parts': { label: 'Awaiting Parts', color: '#B4881E', bg: '#F6E9C8' },
      'Repairing': { label: 'Repairing', color: '#1E3A5F', bg: '#D6E0EB' },
      'Ready': { label: 'Ready for Pickup', color: '#4C7A5E', bg: '#DCEBE2' },
      'Completed': { label: 'Completed', color: '#4C7A5E', bg: '#DCEBE2' },
      'Delivered': { label: 'Delivered', color: '#6B6255', bg: '#E8E0D5' },
    }
    return map[status] || { label: status || 'Diagnosing', color: '#6B6255', bg: '#F0EDE8' }
  }

  const getDeviceDisplay = (job) => {
    if (job.device_type) {
      return `${job.device_type}${job.device_model ? ` ${job.device_model}` : ''}`
    }
    return job.title || 'Device'
  }

  const formatDate = (d) => {
    if (!d) return ''
    return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  }

  const isOverdue = (dueDate) => {
    if (!dueDate) return false
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const due = new Date(dueDate)
    due.setHours(0, 0, 0, 0)
    return due < today
  }

  const getDueDisplay = (dueDate) => {
    if (!dueDate) return <span style={{ color: '#C8C0B5', fontSize: '0.7rem' }}>No deadline</span>
    if (isOverdue(dueDate)) {
      return (
        <span style={{
          color: '#AE4A34',
          fontWeight: '700',
          textTransform: 'uppercase',
          animation: 'pulseGlow 1.5s ease-in-out infinite'
        }}>
          ⚠️ OVERDUE
        </span>
      )
    }
    return <span style={{ color: '#6B6255' }}>Due {formatDate(dueDate)}</span>
  }

  const deleteJob = async (id) => {
    const confirmed = window.confirm('Delete this repair job? This cannot be undone.')
    if (!confirmed) return

    await supabase.from('orders').delete().eq('id', id)
    loadJobs()
  }

  const filteredJobs = jobs
    .filter(j => {
      const searchTerm = search.toLowerCase()
      const customerName = j.customers?.name?.toLowerCase() || ''
      const device = getDeviceDisplay(j).toLowerCase()
      return customerName.includes(searchTerm) || device.includes(searchTerm)
    })
    .filter(j => {
      if (filter === 'all') return true
      if (filter === 'active') return j.current_status !== 'Completed' && j.current_status !== 'Delivered'
      if (filter === 'awaiting_parts') return j.current_status === 'Awaiting Parts'
      if (filter === 'ready') return j.current_status === 'Ready'
      return j.current_status === filter
    })

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#F5EFE2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
          .spinner {
            width: 40px; height: 40px;
            border: 4px solid #e4d8c2;
            border-top: 4px solid #1E3A5F;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
          }
          @keyframes pulseGlow {
            0%, 100% { opacity: 1; text-shadow: 0 0 4px rgba(174, 74, 52, 0.2); }
            50% { opacity: 0.8; text-shadow: 0 0 12px rgba(174, 74, 52, 0.5); }
          }
        `}</style>
        <div className="spinner"></div>
      </div>
    )
  }

  return (
    <main style={{ minHeight: '100vh', background: '#F5EFE2', padding: '1.5rem 1.2rem' }}>
      <style>{`
        @keyframes pulseGlow {
          0%, 100% { opacity: 1; text-shadow: 0 0 4px rgba(174, 74, 52, 0.2); }
          50% { opacity: 0.8; text-shadow: 0 0 12px rgba(174, 74, 52, 0.5); }
        }
        .stat-card {
          background: #fff;
          border-radius: 10px;
          padding: 0.7rem 0.5rem;
          border: 1px solid #E8E0D5;
          text-align: center;
          flex: 1;
          min-width: 60px;
        }
        .stat-card .value {
          font-size: 1.1rem;
          font-weight: 700;
          margin: 0;
        }
        .stat-card .value.red { color: #AE4A34; }
        .stat-card .value.green { color: #4C7A5E; }
        .stat-card .value.navy { color: #1E3A5F; }
        .stat-card .value.gold { color: #C79A2B; }
        .stat-card .label {
          color: #6B6255;
          font-size: 0.6rem;
          margin: 0.1rem 0 0;
        }
        .job-card {
          background: #fff;
          border-radius: 12px;
          padding: 0.8rem 1rem;
          border: 1px solid #E8E0D5;
          margin-bottom: 0.7rem;
          transition: border-color 0.15s ease;
        }
        .job-card:hover { border-color: #D6D0C5; }
        .job-card .row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 0.4rem;
        }
        .job-card .info {
          flex: 1;
          min-width: 140px;
        }
        .job-card .info .name {
          font-weight: 600;
          color: #1E3A5F;
          font-size: 0.9rem;
          margin: 0;
          display: flex;
          align-items: center;
          gap: 0.4rem;
          flex-wrap: wrap;
        }
        .job-card .info .meta {
          font-size: 0.75rem;
          color: #6B6255;
          margin: 0.1rem 0 0;
          display: flex;
          align-items: center;
          gap: 0.3rem;
          flex-wrap: wrap;
        }
        .job-card .balance {
          font-weight: 700;
          font-size: 0.85rem;
          color: #AE4A34;
          white-space: nowrap;
        }
        .job-card .balance.paid { color: #4C7A5E; }
        .order-status-badge {
          display: inline-block;
          padding: 0.15rem 0.6rem;
          border-radius: 20px;
          font-size: 0.65rem;
          font-weight: 600;
          letter-spacing: 0.3px;
          text-transform: uppercase;
        }
        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.7rem;
          flex-wrap: wrap;
          gap: 0.4rem;
        }
        .section-header h1 {
          color: #1E3A5F;
          font-size: 1.2rem;
          font-weight: 700;
          margin: 0;
        }
        .section-header .count {
          color: #6B6255;
          font-size: 0.8rem;
          font-weight: 400;
        }
        .search-bar {
          width: 100%;
          padding: 0.6rem 0.9rem;
          border-radius: 10px;
          border: 1px solid #E8E0D5;
          font-size: 0.9rem;
          background: #fff;
          box-sizing: border-box;
          color: #2B2620;
          transition: border-color 0.2s ease;
        }
        .search-bar:focus { outline: none; border-color: #C79A2B; }
        .filter-chip {
          padding: 0.3rem 0.7rem;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 600;
          border: 1px solid #E8E0D5;
          background: #fff;
          color: #1E3A5F;
          cursor: pointer;
          transition: all 0.15s ease;
          white-space: nowrap;
        }
        .filter-chip:hover { border-color: #C79A2B; }
        .filter-chip.active {
          background: #1E3A5F;
          border-color: #1E3A5F;
          color: #fff;
        }
        .filter-chip .count {
          font-weight: 400;
          opacity: 0.7;
          margin-left: 0.2rem;
        }
        .filter-chip.active .count { opacity: 0.8; }
        .filters-row {
          display: flex;
          gap: 0.4rem;
          margin-bottom: 1rem;
          flex-wrap: wrap;
          overflow-x: auto;
          padding-bottom: 0.2rem;
        }
        .empty-state {
          background: #fff;
          border-radius: 12px;
          padding: 2rem 1.5rem;
          border: 1px solid #E8E0D5;
          text-align: center;
          color: #6B6255;
          font-size: 0.9rem;
        }
        .empty-state .icon { font-size: 2.5rem; margin-bottom: 0.5rem; }
        .job-actions {
          display: flex;
          gap: 0.3rem;
          flex-wrap: wrap;
          align-items: center;
        }
        .job-actions .btn {
          padding: 0.2rem 0.6rem;
          border-radius: 6px;
          font-size: 0.65rem;
          font-weight: 600;
          text-decoration: none;
          border: 1px solid #E8E0D5;
          background: #fff;
          color: #1E3A5F;
          cursor: pointer;
          transition: background 0.1s ease;
          display: inline-flex;
          align-items: center;
          gap: 0.15rem;
          min-height: 28px;
        }
        .job-actions .btn:hover { background: #F5EFE2; }
        .job-actions .btn-view { background: #F5EFE2; border-color: #D6D0C5; }
        .job-actions .btn-edit {
          background: #1E3A5F;
          border-color: #1E3A5F;
          color: #fff;
        }
        .job-actions .btn-edit:hover { background: #0F1E30; }
        .job-actions .btn-delete {
          background: #fff;
          border-color: #AE4A34;
          color: #AE4A34;
        }
        .job-actions .btn-delete:hover { background: #F1DBD3; }
        .stats-row {
          display: flex;
          gap: 0.4rem;
          margin-bottom: 1.2rem;
          flex-wrap: wrap;
        }
        .back-link {
          background: none;
          border: none;
          color: #1E3A5F;
          font-size: 0.85rem;
          padding: 0;
          margin-bottom: 1rem;
          cursor: pointer;
        }
        .back-link:hover { text-decoration: underline; }
        .header-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 0.8rem;
          flex-wrap: wrap;
          gap: 0.5rem;
        }
        .header-row h1 {
          color: #1E3A5F;
          font-size: 1.3rem;
          font-weight: 700;
          margin: 0;
        }
        .header-row .count {
          color: #6B6255;
          font-size: 0.8rem;
          font-weight: 400;
        }
        .job-count-badge {
          background: #E8E0D5;
          color: #6B6255;
          padding: 0.05rem 0.5rem;
          border-radius: 12px;
          font-size: 0.7rem;
          font-weight: 600;
        }
        .add-btn {
          padding: 0.5rem 1rem;
          border-radius: 8px;
          font-size: 0.8rem;
          font-weight: 700;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          border: none;
          cursor: pointer;
          transition: transform 0.1s ease;
        }
        .add-btn:active { transform: scale(0.97); }
        @media (max-width: 420px) {
          .job-card .row { flex-direction: column; align-items: stretch; }
          .job-actions { justify-content: flex-start; margin-top: 0.3rem; }
          .job-card .balance { margin-right: 0; }
          .header-row { flex-direction: column; align-items: stretch; }
          .stats-row { flex-wrap: wrap; }
          .stat-card { flex: 1 0 45%; }
        }
      `}</style>

      <button className="back-link" onClick={() => router.push('/dashboard/repairs')}>
        ← Back to repairs
      </button>

      <div className="header-row">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
          <h1>🔧 Repair Jobs</h1>
          <span className="job-count-badge">{jobs.length}</span>
        </div>
        <a
          href={canAddMore ? "/dashboard/repairs/jobs/new" : "#"}
          className="add-btn"
          style={{
            background: canAddMore ? 'linear-gradient(135deg, #C79A2B, #B4881E)' : '#E8E0D5',
            color: canAddMore ? '#1E3A5F' : '#6B6255',
            cursor: canAddMore ? 'pointer' : 'default',
          }}
          onClick={(e) => {
            if (!canAddMore) {
              e.preventDefault()
              router.push('/dashboard/subscription')
            }
          }}
        >
          {canAddMore ? '+ New Job' : '🔒 New Job (Upgrade)'}
        </a>
      </div>

      {!canAddMore && (
        <UpgradeBanner
          resource="orders"
          currentCount={totalOrdersCount}
          limit={limits.orders}
          plan={plan}
        />
      )}

      <div className="stats-row">
        <div className="stat-card">
          <p className="value navy">{stats.total}</p>
          <p className="label">📋 Total</p>
        </div>
        <div className="stat-card">
          <p className="value gold">{stats.active}</p>
          <p className="label">🔧 Active</p>
        </div>
        <div className="stat-card">
          <p className="value red">{stats.awaitingParts}</p>
          <p className="label">⏳ Awaiting Parts</p>
        </div>
        <div className="stat-card">
          <p className="value green">{stats.ready}</p>
          <p className="label">✅ Ready</p>
        </div>
      </div>

      <input
        type="text"
        className="search-bar"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="🔍 Search by customer or device..."
        style={{ marginBottom: '0.8rem' }}
      />

      <div className="filters-row">
        {[
          { key: 'all', label: 'All' },
          { key: 'active', label: 'Active' },
          { key: 'Diagnosing', label: 'Diagnosing' },
          { key: 'Awaiting Parts', label: 'Awaiting Parts' },
          { key: 'Repairing', label: 'Repairing' },
          { key: 'Ready', label: 'Ready' },
          { key: 'Completed', label: 'Completed' },
          { key: 'Delivered', label: 'Delivered' },
        ].map((f) => {
          const count = f.key === 'all' ? jobs.length :
            f.key === 'active' ? jobs.filter(j => j.current_status !== 'Completed' && j.current_status !== 'Delivered').length :
            jobs.filter(j => j.current_status === f.key).length
          return (
            <button
              key={f.key}
              className={`filter-chip ${filter === f.key ? 'active' : ''}`}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
              <span className="count">({count})</span>
            </button>
          )
        })}
      </div>

      {filteredJobs.length === 0 ? (
        <div className="empty-state">
          <div className="icon">🔧</div>
          <p>
            {search || filter !== 'all' ? (
              <>No jobs match your search or filter.</>
            ) : (
              <>No repair jobs yet. <a href="/dashboard/repairs/jobs/new" style={{ color: '#1E3A5F', fontWeight: '600' }}>Create your first repair job</a></>
            )}
          </p>
        </div>
      ) : (
        filteredJobs.map((job) => {
          const status = getStatusInfo(job.current_status)
          const device = getDeviceDisplay(job)
          const dueDisplay = getDueDisplay(job.due_date)
          const balance = job.price - job.amount_paid

          return (
            <div key={job.id} className="job-card">
              <div className="row">
                <div className="info">
                  <p className="name">
                    {device}
                    <span
                      className="order-status-badge"
                      style={{ background: status.bg, color: status.color }}
                    >
                      {status.label}
                    </span>
                  </p>
                  <p className="meta">
                    <span>{job.customers?.name || 'No customer'}</span>
                    <span>·</span>
                    {dueDisplay}
                    {job.serial_number && (
                      <>
                        <span>·</span>
                        <span>SN: {job.serial_number}</span>
                      </>
                    )}
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span className={`balance ${balance <= 0 ? 'paid' : ''}`}>
                    {balance > 0 ? `₦${balance.toLocaleString()}` : '✓'}
                  </span>
                  <div className="job-actions">
                    <a href={`/dashboard/repairs/jobs/${job.id}`} className="btn btn-view">👁️ View</a>
                    <a href={`/dashboard/repairs/jobs/${job.id}/edit`} className="btn btn-edit">✏️ Edit</a>
                    {isOwner && (
                      <button className="btn btn-delete" onClick={() => deleteJob(job.id)}>🗑️</button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })
      )}
    </main>
  )
    }
