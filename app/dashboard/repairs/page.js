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
    waitingOnCustomer: 0,
    overdue: 0,
    todayRevenue: 0,
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
    const active = jobData?.filter(j => j.current_status !== 'Completed' && j.current_status !== 'Delivered').length || 0
    const awaitingParts = jobData?.filter(j => j.current_status === 'Awaiting Parts').length || 0
    const ready = jobData?.filter(j => j.current_status === 'Ready').length || 0
    const waitingOnCustomer = ready

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const overdue = jobData?.filter(j => {
      if (!j.due_date || j.current_status === 'Delivered' || j.current_status === 'Completed') return false
      const due = new Date(j.due_date)
      due.setHours(0, 0, 0, 0)
      return due < today
    }).length || 0

    const todayStr = today.toISOString().split('T')[0]
    const { data: payments } = await supabase
      .from('payment_records')
      .select('amount')
      .eq('business_id', businessData.id)
      .gte('created_at', todayStr)
      .lt('created_at', todayStr + 'T23:59:59.999Z')

    const todayRevenue = payments?.reduce((sum, p) => sum + p.amount, 0) || 0

    setStats({ total, active, awaitingParts, ready, waitingOnCustomer, overdue, todayRevenue })

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
      'Diagnosing': { label: 'Diagnosing', color: '#6B6255', bg: 'rgba(255,255,255,0.06)' },
      'Awaiting Parts': { label: 'Awaiting Parts', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
      'Repairing': { label: 'Repairing', color: '#60A5FA', bg: 'rgba(96,165,250,0.12)' },
      'Ready': { label: 'Waiting on Customer', color: '#34D399', bg: 'rgba(52,211,153,0.12)' },
      'Completed': { label: 'Completed', color: '#34D399', bg: 'rgba(52,211,153,0.08)' },
      'Delivered': { label: 'Delivered', color: '#6B7280', bg: 'rgba(255,255,255,0.04)' },
    }
    return map[status] || { label: status || 'Diagnosing', color: '#6B6255', bg: 'rgba(255,255,255,0.04)' }
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
    if (isOverdue(dueDate)) return '🔴 Overdue'
    return `Due ${formatDate(dueDate)}`
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0B0B0F', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
          .spinner {
            width: 32px; height: 32px;
            border: 2px solid rgba(255,255,255,0.08);
            border-top: 2px solid #ffffff;
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

  return (
    <main style={{
      minHeight: '100vh',
      background: '#0B0B0F',
      padding: '1.5rem 1rem 4rem',
      fontFamily: "'Inter', -apple-system, sans-serif",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');

        * { box-sizing: border-box; scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.06) transparent; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 10px; }

        .header {
          position: sticky;
          top: 0;
          z-index: 50;
          background: rgba(11, 11, 15, 0.85);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          padding: 1.2rem 0 0.8rem;
          margin: -1.5rem -1rem 0;
          padding-left: 1rem;
          padding-right: 1rem;
          border-bottom: 1px solid rgba(255,255,255,0.04);
        }
        .header-content { max-width: 480px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; }
        .header-left { display: flex; align-items: center; gap: 0.6rem; }
        .header-left .business-name { color: #fff; font-size: 1rem; font-weight: 600; letter-spacing: -0.3px; margin: 0; }
        .header-left .badge { background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.5); font-size: 0.5rem; font-weight: 600; padding: 0.1rem 0.5rem; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.5px; border: 1px solid rgba(255,255,255,0.04); }
        .header-right .greeting { color: rgba(255,255,255,0.4); font-size: 0.7rem; margin: 0; }

        .container { max-width: 480px; margin: 0 auto; padding: 0; }

        .stats-scroll {
          display: flex;
          gap: 0.6rem;
          overflow-x: auto;
          padding: 0.2rem 0 1rem 0;
          scroll-snap-type: x mandatory;
          -webkit-overflow-scrolling: touch;
        }
        .stats-scroll::-webkit-scrollbar { display: none; }

        .stat-card {
          flex: 0 0 110px;
          scroll-snap-align: start;
          background: rgba(255,255,255,0.03);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 16px;
          padding: 0.8rem 0.6rem;
          text-align: center;
          transition: all 0.2s ease;
          position: relative;
          overflow: hidden;
        }
        .stat-card::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 16px;
          padding: 1px;
          background: linear-gradient(135deg, rgba(255,255,255,0.08), transparent 60%);
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          pointer-events: none;
        }
        .stat-card .icon { font-size: 1rem; display: block; margin-bottom: 0.1rem; }
        .stat-card .number {
          font-size: 1.5rem;
          font-weight: 800;
          letter-spacing: -0.5px;
          margin: 0;
          line-height: 1.2;
        }
        .stat-card .number.navy { color: #fff; }
        .stat-card .number.gold { color: #F59E0B; }
        .stat-card .number.red { color: #EF4444; }
        .stat-card .number.green { color: #34D399; }
        .stat-card .number.purple { color: #A78BFA; }
        .stat-card .number.white { color: #fff; }
        .stat-card .label {
          color: rgba(255,255,255,0.35);
          font-size: 0.55rem;
          margin: 0.1rem 0 0;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          font-weight: 500;
        }

        .stat-card.grad-total { background: linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02)); }
        .stat-card.grad-active { background: linear-gradient(135deg, rgba(245,158,11,0.08), rgba(245,158,11,0.02)); }
        .stat-card.grad-parts { background: linear-gradient(135deg, rgba(239,68,68,0.08), rgba(239,68,68,0.02)); }
        .stat-card.grad-waiting { background: linear-gradient(135deg, rgba(167,139,250,0.08), rgba(167,139,250,0.02)); }
        .stat-card.grad-revenue { background: linear-gradient(135deg, rgba(52,211,153,0.08), rgba(52,211,153,0.02)); }

        .alert-strip {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
          margin-bottom: 1.2rem;
        }
        .alert-item {
          flex: 1;
          min-width: 70px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 12px;
          padding: 0.5rem 0.6rem;
          text-align: center;
          font-size: 0.65rem;
          font-weight: 500;
          color: rgba(255,255,255,0.5);
        }
        .alert-item .count {
          font-size: 1.1rem;
          font-weight: 700;
          display: block;
          color: #fff;
        }
        .alert-item.overdue { border-color: rgba(239,68,68,0.2); }
        .alert-item.overdue .count { color: #EF4444; }
        .alert-item.awaiting_parts { border-color: rgba(245,158,11,0.2); }
        .alert-item.awaiting_parts .count { color: #F59E0B; }
        .alert-item.ready { border-color: rgba(52,211,153,0.2); }
        .alert-item.ready .count { color: #34D399; }

        .quick-actions {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
          margin-bottom: 1.8rem;
        }
        .action-btn {
          padding: 0.5rem 1rem;
          border-radius: 100px;
          font-size: 0.75rem;
          font-weight: 600;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          border: none;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .action-btn:active { transform: scale(0.97); }
        .action-btn-primary {
          background: #fff;
          color: #0B0B0F;
        }
        .action-btn-primary:hover { background: rgba(255,255,255,0.9); }
        .action-btn-secondary {
          background: rgba(255,255,255,0.06);
          color: rgba(255,255,255,0.8);
          border: 1px solid rgba(255,255,255,0.06);
        }
        .action-btn-secondary:hover { background: rgba(255,255,255,0.1); }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.6rem;
        }
        .section-header h2 {
          color: rgba(255,255,255,0.8);
          font-size: 0.85rem;
          font-weight: 600;
          margin: 0;
          letter-spacing: -0.3px;
        }
        .section-header a {
          color: rgba(255,255,255,0.3);
          font-size: 0.7rem;
          font-weight: 500;
          text-decoration: none;
          transition: color 0.15s ease;
        }
        .section-header a:hover { color: rgba(255,255,255,0.6); }

        .job-card {
          background: rgba(255,255,255,0.03);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 16px;
          padding: 0.8rem 1rem;
          margin-bottom: 0.6rem;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .job-card:hover {
          background: rgba(255,255,255,0.06);
          border-color: rgba(255,255,255,0.1);
        }
        .job-card .top-row {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 0.5rem;
        }
        .job-card .device {
          font-weight: 600;
          color: #fff;
          font-size: 0.85rem;
          margin: 0;
          letter-spacing: -0.2px;
        }
        .job-card .status-badge {
          display: inline-block;
          padding: 0.1rem 0.6rem;
          border-radius: 100px;
          font-size: 0.55rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.3px;
          flex-shrink: 0;
          margin-top: 0.05rem;
        }
        .job-card .customer {
          color: rgba(255,255,255,0.4);
          font-size: 0.7rem;
          margin: 0.1rem 0 0;
        }
        .job-card .issue {
          color: rgba(255,255,255,0.3);
          font-size: 0.65rem;
          margin: 0.1rem 0 0;
          font-style: italic;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          max-width: 200px;
        }
        .job-card .deposit-badge {
          display: inline-block;
          background: rgba(255,255,255,0.06);
          color: rgba(255,255,255,0.5);
          font-size: 0.55rem;
          font-weight: 500;
          padding: 0.05rem 0.4rem;
          border-radius: 100px;
          margin-left: 0.3rem;
        }
        .job-card .bottom-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: 0.5rem;
          padding-top: 0.5rem;
          border-top: 1px solid rgba(255,255,255,0.04);
        }
        .job-card .balance {
          font-weight: 600;
          font-size: 0.8rem;
          color: #EF4444;
        }
        .job-card .balance.paid { color: #34D399; }
        .job-card .actions {
          display: flex;
          gap: 0.3rem;
        }
        .job-card .actions .whatsapp-btn {
          background: rgba(37, 211, 102, 0.15);
          color: #34D399;
          border: 1px solid rgba(37, 211, 102, 0.2);
          border-radius: 100px;
          padding: 0.2rem 0.6rem;
          font-size: 0.6rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
          display: inline-flex;
          align-items: center;
          gap: 0.2rem;
        }
        .job-card .actions .whatsapp-btn:hover {
          background: rgba(37, 211, 102, 0.25);
        }
        .job-card .actions .whatsapp-btn:active { transform: scale(0.95); }

        .customer-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.6rem 0.9rem;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 12px;
          text-decoration: none;
          margin-bottom: 0.5rem;
          transition: all 0.15s ease;
        }
        .customer-row:hover {
          background: rgba(255,255,255,0.06);
          border-color: rgba(255,255,255,0.1);
        }
        .customer-row .name {
          color: #fff;
          font-weight: 500;
          font-size: 0.85rem;
          margin: 0;
        }
        .customer-row .phone {
          color: rgba(255,255,255,0.3);
          font-size: 0.7rem;
          margin: 0;
        }
        .customer-row .arrow {
          color: rgba(255,255,255,0.15);
          font-size: 0.8rem;
        }

        .empty-state {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 16px;
          padding: 1.5rem;
          text-align: center;
          color: rgba(255,255,255,0.4);
          font-size: 0.8rem;
        }
        .empty-state .icon { font-size: 1.8rem; display: block; margin-bottom: 0.3rem; }
        .empty-state a { color: rgba(255,255,255,0.6); font-weight: 500; text-decoration: none; }
        .empty-state a:hover { color: #fff; }

        .red-alert {
          background: rgba(239,68,68,0.08);
          border: 1px solid rgba(239,68,68,0.2);
          border-radius: 12px;
          padding: 0.7rem 1rem;
          margin-bottom: 1.2rem;
          color: rgba(255,255,255,0.8);
          font-weight: 500;
          font-size: 0.8rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-wrap: wrap;
        }
        .red-alert .icon { font-size: 1.1rem; }
        .red-alert strong { color: #EF4444; }

        @media (max-width: 480px) {
          .stat-card { flex: 0 0 90px; padding: 0.6rem 0.4rem; }
          .stat-card .number { font-size: 1.2rem; }
          .job-card .top-row { flex-wrap: wrap; }
          .job-card .issue { max-width: 100%; }
          .quick-actions .action-btn {
            flex: 1;
            justify-content: center;
            font-size: 0.7rem;
            padding: 0.4rem 0.8rem;
          }
          .alert-item { min-width: 60px; padding: 0.3rem 0.4rem; }
        }
      `}</style>

      <div className="header">
        <div className="header-content">
          <div className="header-left">
            <LetterLogo name={business?.name} size={32} />
            <div>
              <p className="business-name">{business ? business.name : 'Your business'}</p>
            </div>
            <span className="badge">Repairs</span>
          </div>
          <div className="header-right">
            <p className="greeting">⚡</p>
          </div>
        </div>
      </div>

      <div className="container">
        <div className="stats-scroll">
          <div className="stat-card grad-total">
            <span className="icon">📋</span>
            <p className="number navy">{stats.total}</p>
            <p className="label">Total Jobs</p>
          </div>
          <div className="stat-card grad-active">
            <span className="icon">🔧</span>
            <p className="number gold">{stats.active}</p>
            <p className="label">Active</p>
          </div>
          <div className="stat-card grad-parts">
            <span className="icon">⏳</span>
            <p className="number red">{stats.awaitingParts}</p>
            <p className="label">Awaiting Parts</p>
          </div>
          <div className="stat-card grad-waiting">
            <span className="icon">📞</span>
            <p className="number purple">{stats.waitingOnCustomer}</p>
            <p className="label">Waiting on Customer</p>
          </div>
<div className="stat-card grad-revenue">
            <span className="icon">💰</span>
            <p className="number white">₦{stats.todayRevenue.toLocaleString()}</p>
            <p className="label">Today's Revenue</p>
          </div>
        </div>

        {readyOverdueAlerts.length > 0 && (
          <div className="red-alert">
            <span className="icon">🚨</span>
            <span>
              <strong>{readyOverdueAlerts.length}</strong> job{readyOverdueAlerts.length > 1 ? 's' : ''} ready for <strong>7+ days</strong>
            </span>
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

        <div className="quick-actions">
          <a href="/dashboard/repairs/jobs/new" className="action-btn action-btn-primary">
            + New Job
          </a>
          <a href="/dashboard/customers/new" className="action-btn action-btn-secondary">
            + Customer
          </a>
          <a href="/dashboard/repairs/parts" className="action-btn action-btn-secondary">
            📦 Parts
          </a>
        </div>
<div style={{ marginBottom: '1.8rem' }}>
  <div className="section-header">
    <h2>Recent Jobs</h2>
    <a href="/dashboard/repairs/jobs">View all →</a>
  </div>

  {jobs.length === 0 ? (
    <div className="empty-state">
      <span className="icon">🔧</span>
      <p style={{ margin: '0 0 0.3rem' }}>No repair jobs yet.</p>
      <a href="/dashboard/repairs/jobs/new">Create your first repair job</a>
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
              className="status-badge"
              style={{
                background: isOverdueStatus ? 'rgba(239,68,68,0.15)' : status.bg,
                color: isOverdueStatus ? '#EF4444' : status.color,
                border: isOverdueStatus ? '1px solid rgba(239,68,68,0.2)' : 'none',
              }}
            >
              {isOverdueStatus ? '⚠️ Overdue' : status.label}
            </span>
          </div>
          <div className="bottom-row">
            <span className={`balance ${balance <= 0 ? 'paid' : ''}`}>
              {balance > 0 ? `₦${balance.toLocaleString()}` : '✓ Paid in full'}
            </span>
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
      )
    })
  )}
</div>
        <div style={{ marginBottom: '1.8rem' }}>
          <div className="section-header">
            <h2>🔩 Parts Needed</h2>
            <a href="/dashboard/repairs/jobs?filter=awaiting_parts">View all →</a>
          </div>

          {awaitingPartsJobs.length === 0 ? (
            <div className="empty-state">
              <span className="icon">✅</span>
              <p style={{ margin: 0 }}>No jobs awaiting parts.</p>
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
                      <p className="issue" style={{ fontStyle: 'normal', color: 'rgba(255,255,255,0.4)' }}>
                        Part: {partName}
                      </p>
                    </div>
                    <span className="status-badge" style={{ background: 'rgba(245,158,11,0.12)', color: '#F59E0B' }}>
                      ⏳ Awaiting Parts
                    </span>
                  </div>
                  <div className="bottom-row" style={{ borderTop: '1px solid rgba(255,255,255,0.03)' }}>
                    <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.7rem' }}>Part needed</span>
                    <span style={{ color: '#F59E0B', fontSize: '0.7rem' }}>⏳</span>
                  </div>
                </div>
              )
            })
          )}
        </div>

        <div>
          <div className="section-header">
            <h2>Recent Customers</h2>
            <a href="/dashboard/customers">View all →</a>
          </div>

          {customers.length === 0 ? (
            <div className="empty-state">
              <span className="icon">👤</span>
              <p style={{ margin: '0 0 0.3rem' }}>No customers yet.</p>
              <a href="/dashboard/customers/new">Add your first customer</a>
            </div>
          ) : (
            previewCustomers.map((c) => (
              <a key={c.id} href={`/dashboard/customers/${c.id}`} className="customer-row">
                <div>
                  <p className="name">{c.name}</p>
                  {c.phone && <p className="phone">{c.phone}</p>}
                </div>
                <span className="arrow">→</span>
              </a>
            ))
          )}
        </div>
      </div>
    </main>
  )
            }
