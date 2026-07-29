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
    awaitingApproval: 0,
    testing: 0,
    overdue: 0,
    totalOwing: 0,
  })
  const [alerts, setAlerts] = useState([])
  const [readyOverdueAlerts, setReadyOverdueAlerts] = useState([])

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

    const { data: jobData } = await supabase
      .from('orders')
      .select('*, customers(name, phone)')
      .eq('business_id', businessData.id)
      .not('device_type', 'is', null)
      .order('created_at', { ascending: false })

    setJobs(jobData || [])

    const { data: customerData } = await supabase
      .from('customers')
      .select('*')
      .eq('business_id', businessData.id)
      .order('created_at', { ascending: false })

    setCustomers(customerData || [])

    const total = jobData?.length || 0
    const active = jobData?.filter(j => 
      j.current_status !== 'Completed' && j.current_status !== 'Delivered'
    ).length || 0
    const awaitingParts = jobData?.filter(j => j.current_status === 'Awaiting Parts').length || 0
    const ready = jobData?.filter(j => j.current_status === 'Ready').length || 0
    const awaitingApproval = jobData?.filter(j => j.current_status === 'Awaiting Approval').length || 0
    const testing = jobData?.filter(j => j.current_status === 'Testing').length || 0

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const overdue = jobData?.filter(j => {
      if (!j.due_date || j.current_status === 'Delivered' || j.current_status === 'Completed') return false
      const due = new Date(j.due_date)
      due.setHours(0, 0, 0, 0)
      return due < today
    }).length || 0

    const totalOwing = jobData?.reduce((sum, j) => sum + Math.max(0, j.price - j.amount_paid), 0) || 0

    setStats({ total, active, awaitingParts, ready, awaitingApproval, testing, overdue, totalOwing })

    const newAlerts = []
    if (overdue > 0) newAlerts.push({ type: 'overdue', message: `${overdue} job${overdue > 1 ? 's' : ''} overdue`, count: overdue })
    if (awaitingParts > 0) newAlerts.push({ type: 'awaiting_parts', message: `${awaitingParts} job${awaitingParts > 1 ? 's' : ''} awaiting parts`, count: awaitingParts })
    if (ready > 0) newAlerts.push({ type: 'ready', message: `${ready} job${ready > 1 ? 's' : ''} ready for pickup`, count: ready })
    setAlerts(newAlerts)

    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const longReady = jobData?.filter(j => j.current_status === 'Ready' && new Date(j.updated_at || j.created_at) < sevenDaysAgo) || []
    setReadyOverdueAlerts(longReady)

    setLoading(false)
  }

  useEffect(() => {
    loadDashboard()
  }, [])

  const getStatusInfo = (status) => {
    const map = {
      'Diagnosing': { label: 'Diagnosing', color: '#6B6255', bg: '#F0EDE8' },
      'Awaiting Approval': { label: 'Awaiting Approval', color: '#B4881E', bg: '#F6E9C8' },
      'Awaiting Parts': { label: 'Awaiting Parts', color: '#B4881E', bg: '#F6E9C8' },
      'Repairing': { label: 'Repairing', color: '#1E3A5F', bg: '#D6E0EB' },
      'Testing': { label: 'Testing', color: '#1E3A5F', bg: '#D6E0EB' },
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
    if (!dueDate) return 'No deadline'
    if (isOverdue(dueDate)) return '⚠️ Overdue'
    return `Due ${formatDate(dueDate)}`
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

  const previewJobs = jobs.slice(0, 5)
  const previewCustomers = customers.slice(0, 5)
  const awaitingPartsJobs = jobs.filter(j => j.current_status === 'Awaiting Parts').slice(0, 5)
  const lowStockParts = [] // Will be populated from inventory

  return (
    <main style={{ minHeight: '100vh', background: '#F5EFE2', padding: '1.5rem 1.2rem' }}>
      <style>{`
        .header-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.2rem;
        }
        .header-brand {
          display: flex;
          align-items: center;
          gap: 0.7rem;
        }
        .header-brand .greeting {
          color: #2B2620;
          font-size: 0.8rem;
          margin: 0;
        }
        .header-brand .business-name {
          color: #1E3A5F;
          font-size: 1.2rem;
          font-weight: 700;
          margin: 0;
        }
        .header-brand .badge {
          display: inline-block;
          background: #F6E9C8;
          color: #1E3A5F;
          padding: 0.05rem 0.5rem;
          border-radius: 10px;
          font-size: 0.55rem;
          font-weight: 600;
          margin-left: 0.3rem;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 0.5rem;
          margin-bottom: 1rem;
        }
        .stat-card {
          background: #fff;
          border-radius: 10px;
          padding: 0.6rem 0.3rem;
          border: 1px solid #E8E0D5;
          text-align: center;
          box-shadow: 0 2px 4px rgba(30,58,95,0.04);
        }
        .stat-card .number {
          font-size: 1.1rem;
          font-weight: 700;
          margin: 0;
          line-height: 1.2;
        }
        .stat-card .number.navy { color: #1E3A5F; }
        .stat-card .number.gold { color: #C79A2B; }
        .stat-card .number.red { color: #AE4A34; }
        .stat-card .number.green { color: #4C7A5E; }
        .stat-card .number.purple { color: #6C5B7B; }
        .stat-card .label {
          color: #6B6255;
          font-size: 0.55rem;
          margin: 0.1rem 0 0;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }

        .alert-strip {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
          margin-bottom: 1rem;
        }
        .alert-item {
          flex: 1;
          min-width: 80px;
          padding: 0.4rem 0.6rem;
          border-radius: 8px;
          text-align: center;
          font-size: 0.7rem;
          font-weight: 600;
        }
        .alert-item .count {
          font-size: 1rem;
          font-weight: 800;
          display: block;
        }
        .alert-item.overdue { background: #F1DBD3; color: #AE4A34; }
        .alert-item.awaiting_parts { background: #F6E9C8; color: #B4881E; }
        .alert-item.ready { background: #DCEBE2; color: #4C7A5E; }

        .quick-actions {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
          margin-bottom: 1.5rem;
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
        .action-btn-primary {
          background: linear-gradient(135deg, #C79A2B, #B4881E);
          color: #1E3A5F;
          box-shadow: 0 4px 14px rgba(199,154,43,0.3);
        }
        .action-btn-primary:hover { box-shadow: 0 6px 20px rgba(199,154,43,0.4); }
        .action-btn-secondary {
          background: #1E3A5F;
          color: #fff;
        }
        .action-btn-secondary:hover { background: #0F1E30; }
        .action-btn-outline {
          background: #fff;
          color: #1E3A5F;
          border: 1px solid #E8E0D5;
        }
        .action-btn-outline:hover { border-color: #C79A2B; }

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
          font-size: 0.75rem;
          font-weight: 500;
          text-decoration: none;
        }
        .section-header a:hover { text-decoration: underline; }

        .job-card {
          background: #fff;
          border-radius: 12px;
          padding: 0.8rem 1rem;
          border: 1px solid #E8E0D5;
          margin-bottom: 0.6rem;
          cursor: pointer;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
          box-shadow: 0 2px 4px rgba(30,58,95,0.03);
        }
        .job-card:hover {
          border-color: #C79A2B;
          box-shadow: 0 4px 12px rgba(199,154,43,0.08);
        }
        .job-card .top-row {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 0.5rem;
        }
        .job-card .device {
          font-weight: 600;
          color: #1E3A5F;
          font-size: 0.9rem;
          margin: 0;
        }
        .job-card .status-badge {
          display: inline-block;
          padding: 0.1rem 0.6rem;
          border-radius: 20px;
          font-size: 0.6rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.3px;
          flex-shrink: 0;
        }
        .job-card .status-badge.overdue {
          background: #F1DBD3;
          color: #AE4A34;
        }
        .job-card .customer {
          color: #6B6255;
          font-size: 0.78rem;
          margin: 0.1rem 0 0;
        }
        .job-card .issue {
          color: #6B6255;
          font-size: 0.75rem;
          margin: 0.1rem 0 0;
          font-style: italic;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          max-width: 200px;
        }
        .job-card .deposit-badge {
          display: inline-block;
          background: #F6E9C8;
          color: #1E3A5F;
          font-size: 0.6rem;
          font-weight: 600;
          padding: 0.05rem 0.4rem;
          border-radius: 10px;
          margin-left: 0.3rem;
        }
        .job-card .bottom-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: 0.5rem;
          padding-top: 0.5rem;
          border-top: 1px solid #F0EDE8;
        }
        .job-card .bottom-row .balance {
          font-weight: 700;
          font-size: 0.85rem;
          color: #AE4A34;
        }
        .job-card .bottom-row .balance.paid { color: #4C7A5E; }
        .job-card .bottom-row .meta {
          color: #6B6255;
          font-size: 0.7rem;
        }
        .job-card .actions {
          display: flex;
          gap: 0.3rem;
        }
        .job-card .actions .whatsapp-btn {
          background: #25D366;
          color: #fff;
          border: none;
          border-radius: 6px;
          padding: 0.2rem 0.6rem;
          font-size: 0.6rem;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.15s ease;
          display: inline-flex;
          align-items: center;
          gap: 0.2rem;
        }
        .job-card .actions .whatsapp-btn:hover { background: #1DA851; }
        .job-card .actions .whatsapp-btn:active { transform: scale(0.95); }

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
          box-shadow: 0 1px 3px rgba(30,58,95,0.03);
        }
        .customer-row:hover { border-color: #C79A2B; }
        .customer-row .name {
          color: #1E3A5F;
          font-weight: 600;
          font-size: 0.85rem;
          margin: 0;
        }
        .customer-row .phone {
          color: #6B6255;
          font-size: 0.75rem;
          margin: 0;
        }
        .customer-row .badge {
          background: #F6E9C8;
          color: #1E3A5F;
          font-size: 0.6rem;
          font-weight: 600;
          padding: 0.05rem 0.4rem;
          border-radius: 10px;
        }
        .customer-row .arrow { color: #C79A2B; font-size: 0.8rem; }

        .empty-state {
          background: #fff;
          border-radius: 12px;
          padding: 2rem 1.5rem;
          border: 1px solid #E8E0D5;
          text-align: center;
          color: #6B6255;
          box-shadow: 0 2px 4px rgba(30,58,95,0.03);
        }
        .empty-state .icon { font-size: 2.5rem; display: block; margin-bottom: 0.5rem; }
        .empty-state h3 { color: #1E3A5F; font-size: 1.1rem; margin: 0 0 0.3rem; }
        .empty-state p { margin: 0 0 0.8rem; font-size: 0.9rem; }
        .empty-state .btn { display: inline-block; padding: 0.5rem 1.2rem; border-radius: 8px; background: linear-gradient(135deg, #C79A2B, #B4881E); color: #1E3A5F; font-weight: 600; text-decoration: none; }

        .red-alert {
          background: #F1DBD3;
          border: 1px solid #AE4A34;
          border-radius: 8px;
          padding: 0.6rem 1rem;
          margin-bottom: 1rem;
          color: #AE4A34;
          font-weight: 600;
          font-size: 0.8rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        @media (max-width: 480px) {
          .stats-grid {
            grid-template-columns: repeat(3, 1fr);
            gap: 0.4rem;
          }
          .stat-card { padding: 0.4rem 0.2rem; }
          .stat-card .number { font-size: 0.9rem; }
          .stat-card .label { font-size: 0.45rem; }
          .job-card .top-row { flex-wrap: wrap; }
          .job-card .issue { max-width: 100%; }
          .quick-actions .action-btn {
            flex: 1;
            justify-content: center;
            font-size: 0.7rem;
            padding: 0.5rem 0.6rem;
          }
          .alert-item { min-width: 60px; padding: 0.3rem 0.4rem; font-size: 0.6rem; }
          .alert-item .count { font-size: 0.8rem; }
        }
      `}</style>

      {/* HEADER */}
      <div className="header-top">
        <div className="header-brand">
          <LetterLogo name={business?.name} size={40} />
          <div>
            <p className="greeting">Welcome back,</p>
            <p className="business-name">
              {business ? business.name : 'Your business'}
              <span className="badge">🔧 Repairs</span>
            </p>
          </div>
        </div>
      </div>

      {/* STATS */}
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
        <div className="stat-card">
          <p className="number red">₦{stats.totalOwing.toLocaleString()}</p>
          <p className="label">Outstanding</p>
        </div>
      </div>

      {/* ALERTS */}
      {readyOverdueAlerts.length > 0 && (
        <div className="red-alert">
          <span>🚨</span>
          <span>{readyOverdueAlerts.length} job{readyOverdueAlerts.length > 1 ? 's' : ''} ready for over 7 days</span>
        </div>
      )}

      {alerts.length > 0 && (
        <div className="alert-strip">
          {alerts.map((alert, i) => (
            <div key={i} className={`alert-item ${alert.type}`}>
              <span className="count">{alert.count}</span>
              {alert.message}
            </div>
          ))}
        </div>
      )}

      {/* QUICK ACTIONS */}
      <div className="quick-actions">
        <a href="/dashboard/repairs/jobs/new" className="action-btn action-btn-primary">
          🔧 + New Repair Job
        </a>
        <a href="/dashboard/customers/new" className="action-btn action-btn-secondary">
          👤 + Customer
        </a>
        <a href="/dashboard/repairs/parts" className="action-btn action-btn-outline">
          📦 Parts
        </a>
      </div>
{/* RECENT JOBS */}
<div style={{ marginBottom: '1.8rem' }}>
  <div className="section-header">
    <h2>Recent Jobs</h2>
    <a href="/dashboard/repairs/jobs">View all →</a>
  </div>

  {jobs.length === 0 ? (
    <div className="empty-state">
      <span className="icon">🔧</span>
      <h3>No repair jobs yet</h3>
      <p>Create your first repair job and start tracking it from diagnosis to pickup.</p>
      <a href="/dashboard/repairs/jobs/new" className="btn">Create First Job</a>
    </div>
  ) : (
    previewJobs.map((job) => {
      const status = getStatusInfo(job.current_status)
      const device = getDeviceDisplay(job)
      const balance = job.price - job.amount_paid
      const isOverdueStatus = isOverdue(job.due_date) && job.current_status !== 'Delivered' && job.current_status !== 'Completed'
      const deposit = job.amount_paid || 0
      const issue = job.customer_notes || ''

      return (
        <div
          key={job.id}
          className="job-card"
          onClick={() => router.push(`/dashboard/repairs/jobs/${job.id}`)}
        >
          <div className="top-row">
            <div style={{ flex: 1, minWidth: 0 }}>
              <p className="device">
                {device}
                {deposit > 0 && <span className="deposit-badge">Deposit: ₦{deposit.toLocaleString()}</span>}
              </p>
              <p className="customer">{job.customers?.name || 'No customer'}</p>
              {issue && <p className="issue">Issue: {issue}</p>}
            </div>
            <span
              className={`status-badge ${isOverdueStatus ? 'overdue' : ''}`}
              style={{
                background: isOverdueStatus ? '#F1DBD3' : status.bg,
                color: isOverdueStatus ? '#AE4A34' : status.color,
              }}
            >
              {isOverdueStatus ? '⚠️ Overdue' : status.label}
            </span>
          </div>
          <div className="bottom-row">
            <span className={`balance ${balance <= 0 ? 'paid' : ''}`}>
              {balance > 0 ? `₦${balance.toLocaleString()}` : '✓ Paid in full'}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="meta">{job.due_date ? getDueDisplay(job.due_date) : 'No deadline'}</span>
              <div className="actions">
                <button
                  className="whatsapp-btn"
                  onClick={(e) => {
                    e.stopPropagation()
                    const phone = job.customers?.phone
                    if (!phone) {
                      alert('No phone number for this customer.')
                      return
                    }
                    const formattedPhone = phone.startsWith('0') ? '234' + phone.slice(1) : phone
                    const msg = `Hi, your ${device} is ready for pickup.`
                    window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(msg)}`, '_blank')
                  }}
                >
                  💬 WhatsApp
                </button>
              </div>
            </div>
          </div>
        </div>
      )
    })
  )}
</div>
      {/* PARTS NEEDED */}
      <div style={{ marginBottom: '1.8rem' }}>
        <div className="section-header">
          <h2>🔩 Parts Needed</h2>
          <a href="/dashboard/repairs/parts">View inventory →</a>
        </div>

        {awaitingPartsJobs.length === 0 ? (
          <div className="empty-state" style={{ padding: '1.5rem' }}>
            <span className="icon" style={{ fontSize: '1.8rem' }}>✅</span>
            <p style={{ margin: 0 }}>No jobs awaiting parts. All parts available.</p>
          </div>
        ) : (
          awaitingPartsJobs.map((job) => {
            const device = getDeviceDisplay(job)
            const partName = job.parts_used && job.parts_used.length > 0
              ? job.parts_used.map(p => p.name).join(', ')
              : 'Unknown part'
            return (
              <div
                key={job.id}
                className="job-card"
                onClick={() => router.push(`/dashboard/repairs/jobs/${job.id}`)}
              >
                <div className="top-row">
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p className="device">{device}</p>
                    <p className="customer">{job.customers?.name || 'No customer'}</p>
                    <p className="issue" style={{ fontStyle: 'normal' }}>Part: {partName}</p>
                  </div>
                  <span className="status-badge" style={{ background: '#F6E9C8', color: '#B4881E' }}>
                    ⏳ Awaiting Parts
                  </span>
                </div>
                <div className="bottom-row" style={{ borderTop: '1px solid #F0EDE8' }}>
                  <span style={{ color: '#6B6255', fontSize: '0.7rem' }}>Part needed</span>
                  <span style={{ color: '#B4881E', fontSize: '0.7rem' }}>⏳</span>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* RECENT CUSTOMERS */}
      <div>
        <div className="section-header">
          <h2>Recent Customers</h2>
          <a href="/dashboard/customers">View all →</a>
        </div>

        {customers.length === 0 ? (
          <div className="empty-state" style={{ padding: '1.5rem' }}>
            <span className="icon" style={{ fontSize: '1.8rem' }}>👤</span>
            <p style={{ margin: 0 }}>No customers yet. Add your first customer to start tracking repairs.</p>
          </div>
        ) : (
          previewCustomers.map((c) => {
            const customerJobs = jobs.filter(j => j.customer_id === c.id)
            const activeJobs = customerJobs.filter(j => j.current_status !== 'Completed' && j.current_status !== 'Delivered')
            const totalOwing = customerJobs.reduce((sum, j) => sum + Math.max(0, j.price - j.amount_paid), 0)

            return (
              <a key={c.id} href={`/dashboard/customers/${c.id}`} className="customer-row">
                <div>
                  <p className="name">{c.name}</p>
                  <p className="phone">
                    {c.phone || 'No phone'}
                    {activeJobs.length > 0 && (
                      <span className="badge" style={{ marginLeft: '0.3rem' }}>
                        {activeJobs.length} active
                      </span>
                    )}
                    {totalOwing > 0 && (
                      <span className="badge" style={{ marginLeft: '0.3rem', background: '#F1DBD3', color: '#AE4A34' }}>
                        ₦{totalOwing.toLocaleString()}
                      </span>
                    )}
                  </p>
                </div>
                <span className="arrow">→</span>
              </a>
            )
          })
        )}
      </div>
    </main>
  )
        }
