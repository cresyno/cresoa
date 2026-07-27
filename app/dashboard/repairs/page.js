'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabaseClient'
import LetterLogo from '../../../components/LetterLogo'

export default function RepairsDashboardPage() {
  const router = useRouter()
  const [business, setBusiness] = useState(null)
  const [jobs, setJobs] = useState([])
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    awaitingParts: 0,
    ready: 0,
  })

  const loadDashboard = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    const { data: businessData } = await supabase
      .from('businesses')
      .select('*')
      .eq('owner_id', user.id)
      .single()

    if (!businessData) {
      router.push('/onboarding')
      return
    }

    setBusiness(businessData)

    // Load repair jobs
    const { data: jobData } = await supabase
      .from('orders')
      .select('*, customers(name, phone)')
      .eq('business_id', businessData.id)
      .not('device_type', 'is', null)
      .order('created_at', { ascending: false })

    setJobs(jobData || [])

    // Load customers
    const { data: customerData } = await supabase
      .from('customers')
      .select('*')
      .eq('business_id', businessData.id)
      .order('created_at', { ascending: false })

    setCustomers(customerData || [])

    // Calculate stats
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
    setLoading(false)
  }

  useEffect(() => {
    loadDashboard()
  }, [])

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
        `}</style>
        <div className="spinner"></div>
      </div>
    )
  }

  const previewJobs = jobs.slice(0, 3)
  const previewCustomers = customers.slice(0, 3)

  return (
    <main style={{ minHeight: '100vh', background: '#F5EFE2', padding: '1.5rem 1.2rem' }}>
      <style>{`
        /* ===== STATS GRID ===== */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 0.6rem;
          margin-bottom: 1.5rem;
        }
        .stat-card {
          background: #fff;
          border-radius: 12px;
          padding: 0.8rem 0.6rem;
          border: 1px solid #E8E0D5;
          text-align: center;
        }
        .stat-card .number {
          font-size: 1.4rem;
          font-weight: 700;
          margin: 0;
        }
        .stat-card .number.navy { color: #1E3A5F; }
        .stat-card .number.gold { color: #C79A2B; }
        .stat-card .number.red { color: #AE4A34; }
        .stat-card .number.green { color: #4C7A5E; }
        .stat-card .label {
          color: #6B6255;
          font-size: 0.65rem;
          margin: 0.1rem 0 0;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        /* ===== QUICK ACTIONS ===== */
        .quick-actions {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
          margin-bottom: 1.8rem;
        }
        .action-btn {
          padding: 0.6rem 1rem;
          border-radius: 8px;
          font-size: 0.8rem;
          font-weight: 600;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          border: none;
          cursor: pointer;
          transition: transform 0.1s ease;
        }
        .action-btn:active { transform: scale(0.97); }

        /* ===== SECTION HEADER ===== */
        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.6rem;
        }
        .section-header h2 {
          color: #1E3A5F;
          font-size: 1rem;
          font-weight: 700;
          margin: 0;
        }
        .section-header a {
          color: #6B6255;
          font-size: 0.8rem;
          font-weight: 500;
          text-decoration: none;
        }
        .section-header a:hover { text-decoration: underline; }

        /* ===== JOB CARD ===== */
        .job-card {
          background: #fff;
          border-radius: 10px;
          padding: 0.7rem 0.9rem;
          border: 1px solid #E8E0D5;
          margin-bottom: 0.6rem;
          cursor: pointer;
          transition: border-color 0.15s ease;
        }
        .job-card:hover { border-color: #C79A2B; }
        .job-card .row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 0.3rem;
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
          font-size: 0.72rem;
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

        .status-badge {
          display: inline-block;
          padding: 0.12rem 0.5rem;
          border-radius: 12px;
          font-size: 0.6rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }

        /* ===== CUSTOMER ROW ===== */
        .customer-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.6rem 0.9rem;
          background: #fff;
          border-radius: 8px;
          border: 1px solid #E8E0D5;
          text-decoration: none;
          margin-bottom: 0.5rem;
          transition: border-color 0.15s ease;
        }
        .customer-row:hover { border-color: #C79A2B; }
        .customer-row .name {
          color: #1E3A5F;
          font-weight: 600;
          font-size: 0.9rem;
          margin: 0;
        }
        .customer-row .phone {
          color: #6B6255;
          font-size: 0.8rem;
          margin: 0;
        }

        /* ===== EMPTY STATE ===== */
        .empty-state {
          background: #fff;
          border-radius: 10px;
          padding: 1.5rem;
          border: 1px solid #E8E0D5;
          text-align: center;
          color: #6B6255;
          font-size: 0.85rem;
        }
        .empty-state .icon { font-size: 2rem; margin-bottom: 0.3rem; }

        /* ===== RESPONSIVE ===== */
        @media (max-width: 480px) {
          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 0.4rem;
          }
          .stat-card { padding: 0.6rem 0.4rem; }
          .stat-card .number { font-size: 1.1rem; }
          .job-card .row { flex-direction: column; align-items: stretch; }
          .job-card .balance { text-align: right; }
        }
      `}</style>

      {/* ===== HEADER ===== */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', marginBottom: '1.2rem' }}>
        <LetterLogo name={business?.name} size={40} />
        <div>
          <p style={{ color: '#2B2620', fontSize: '0.8rem', margin: 0 }}>Welcome back,</p>
          <p style={{ color: '#1E3A5F', fontSize: '1.2rem', fontWeight: '700', margin: 0 }}>
            {business ? business.name : 'Your business'}
            <span style={{
              display: 'inline-block',
              background: 'rgba(199,154,43,0.15)',
              color: '#C79A2B',
              padding: '0.05rem 0.5rem',
              borderRadius: '10px',
              fontSize: '0.55rem',
              fontWeight: '600',
              marginLeft: '0.4rem',
            }}>🔧 Repairs</span>
          </p>
        </div>
      </div>

      {/* ===== STATS ===== */}
      <div className="stats-grid">
        <div className="stat-card">
          <p className="number navy">{stats.total}</p>
          <p className="label">Total Jobs</p>
        </div>
        <div className="stat-card">
          <p className="number gold">{stats.active}</p>
          <p className="label">Active</p>
        </div>
        <div className="stat-card">
          <p className="number red">{stats.awaitingParts}</p>
          <p className="label">Awaiting Parts</p>
        </div>
        <div className="stat-card">
          <p className="number green">{stats.ready}</p>
          <p className="label">Ready for Pickup</p>
        </div>
      </div>

      {/* ===== QUICK ACTIONS ===== */}
      <div className="quick-actions">
        <a href="/dashboard/repairs/jobs/new" className="action-btn" style={{ background: '#1E3A5F', color: '#fff' }}>
          🔧 + New Job
        </a>
        <a href="/dashboard/customers/new" className="action-btn" style={{ background: '#C79A2B', color: '#1E3A5F' }}>
          👤 + Customer
        </a>
        <a href="/dashboard/repairs/parts" className="action-btn" style={{ background: '#4C7A5E', color: '#fff' }}>
          📦 Parts
        </a>
      </div>

      {/* ===== RECENT JOBS ===== */}
      <div style={{ marginBottom: '1.8rem' }}>
        <div className="section-header">
          <h2>Recent Jobs</h2>
          <a href="/dashboard/repairs/jobs">View all →</a>
        </div>

        {jobs.length === 0 ? (
          <div className="empty-state">
            <div className="icon">🔧</div>
            <p>No repair jobs yet.</p>
            <a href="/dashboard/repairs/jobs/new" style={{ color: '#1E3A5F', fontWeight: '600', textDecoration: 'none' }}>
              Create your first repair job →
            </a>
          </div>
        ) : (
          previewJobs.map((job) => {
            const status = getStatusInfo(job.current_status)
            const device = getDeviceDisplay(job)
            const balance = job.price - job.amount_paid

            return (
              <div
                key={job.id}
                className="job-card"
                onClick={() => router.push(`/dashboard/repairs/jobs/${job.id}`)}
              >
                <div className="row">
                  <div className="info">
                    <p className="name">
                      {device}
                      <span
                        className="status-badge"
                        style={{ background: status.bg, color: status.color }}
                      >
                        {status.label}
                      </span>
                    </p>
                    <p className="meta">
                      <span>{job.customers?.name || 'No customer'}</span>
                      {job.due_date && (
                        <>
                          <span>·</span>
                          <span>Due {formatDate(job.due_date)}</span>
                        </>
                      )}
                    </p>
                  </div>
                  <span className={`balance ${balance <= 0 ? 'paid' : ''}`}>
                    {balance > 0 ? `₦${balance.toLocaleString()}` : '✓'}
                  </span>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* ===== RECENT CUSTOMERS ===== */}
      <div>
        <div className="section-header">
          <h2>Recent Customers</h2>
          <a href="/dashboard/customers">View all →</a>
        </div>

        {customers.length === 0 ? (
          <div className="empty-state">
            <div className="icon">👤</div>
            <p>No customers yet.</p>
            <a href="/dashboard/customers/new" style={{ color: '#1E3A5F', fontWeight: '600', textDecoration: 'none' }}>
              Add your first customer →
            </a>
          </div>
        ) : (
          previewCustomers.map((c) => (
            <a key={c.id} href={`/dashboard/customers/${c.id}`} className="customer-row">
              <div>
                <p className="name">{c.name}</p>
                {c.phone && <p className="phone">{c.phone}</p>}
              </div>
              <span style={{ color: '#C79A2B', fontSize: '0.8rem' }}>→</span>
            </a>
          ))
        )}
      </div>
    </main>
  )
        }
