'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabaseClient'
import LetterLogo from '../../../components/LetterLogo'
import FeedbackBanner from '../../../components/FeedbackBanner'
import { getPlanLimits } from '../../../lib/planLimits'

export default function RepairsDashboardPage() {
  const router = useRouter()
  const [business, setBusiness] = useState(null)
  const [jobs, setJobs] = useState([])
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({})
  const [totalOrdersCount, setTotalOrdersCount] = useState(0)
  const [plan, setPlan] = useState('free')

  const loadDashboard = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: businessData } = await supabase
      .from('businesses')
      .select('*')
      .eq('owner_id', user.id)
      .single()

    if (!businessData) { router.push('/onboarding'); return }

    setBusiness(businessData)
    setPlan(businessData.plan || 'free')

    const { count: totalCount } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', businessData.id)
    setTotalOrdersCount(totalCount || 0)

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

    // --- Calculate stats ---
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayStr = today.toISOString().split('T')[0]
    const startOfWeek = new Date(today)
    startOfWeek.setDate(today.getDate() - today.getDay())
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)

    const total = jobData?.length || 0
    const active = jobData?.filter(j => j.current_status !== 'Completed' && j.current_status !== 'Delivered').length || 0
    const awaitingParts = jobData?.filter(j => j.current_status === 'Awaiting Parts').length || 0
    const ready = jobData?.filter(j => j.current_status === 'Ready').length || 0
    const received = jobData?.filter(j => j.current_status === 'Received').length || 0
    const diagnosing = jobData?.filter(j => j.current_status === 'Diagnosing').length || 0
    const awaitingApproval = jobData?.filter(j => j.current_status === 'Awaiting Approval').length || 0
    const repairing = jobData?.filter(j => j.current_status === 'Repairing').length || 0
    const testing = jobData?.filter(j => j.current_status === 'Testing').length || 0
    const completed = jobData?.filter(j => j.current_status === 'Completed' || j.current_status === 'Delivered').length || 0

    const overdue = jobData?.filter(j => {
      if (!j.due_date || j.current_status === 'Delivered' || j.current_status === 'Completed') return false
      const due = new Date(j.due_date)
      due.setHours(0, 0, 0, 0)
      return due < today
    }).length || 0

    const totalOwing = jobData?.reduce((sum, j) => sum + Math.max(0, j.price - j.amount_paid), 0) || 0
    const totalRevenue = jobData?.reduce((sum, j) => sum + j.amount_paid, 0) || 0

    // Today's summary
    const jobsDueToday = jobData?.filter(j => j.due_date === todayStr && j.current_status !== 'Completed' && j.current_status !== 'Delivered').length || 0
    const newCustomersToday = customerData?.filter(c => {
      const d = new Date(c.created_at)
      return d.toDateString() === today.toDateString()
    }).length || 0
    const completedToday = jobData?.filter(j => {
      const d = new Date(j.updated_at || j.created_at)
      return d.toDateString() === today.toDateString() && (j.current_status === 'Completed' || j.current_status === 'Delivered')
    }).length || 0

    // Revenue timeframes
    const revenueToday = jobData?.filter(j => {
      const d = new Date(j.created_at)
      return d.toDateString() === today.toDateString()
    }).reduce((sum, j) => sum + j.amount_paid, 0) || 0

    const revenueThisWeek = jobData?.filter(j => {
      const d = new Date(j.created_at)
      return d >= startOfWeek
    }).reduce((sum, j) => sum + j.amount_paid, 0) || 0

    const revenueThisMonth = jobData?.filter(j => {
      const d = new Date(j.created_at)
      return d >= startOfMonth
    }).reduce((sum, j) => sum + j.amount_paid, 0) || 0

    // Average repair time (from Received to Ready)
    const repairedJobs = jobData?.filter(j => j.current_status === 'Ready' || j.current_status === 'Completed' || j.current_status === 'Delivered') || []
    let avgRepairTime = 0
    if (repairedJobs.length > 0) {
      const totalHours = repairedJobs.reduce((sum, j) => {
        const received = new Date(j.created_at)
        const ready = new Date(j.updated_at || j.created_at)
        return sum + (ready - received) / (1000 * 60 * 60)
      }, 0)
      avgRepairTime = Math.round(totalHours / repairedJobs.length)
    }

    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0

    setStats({
      total, active, awaitingParts, ready, received, diagnosing, awaitingApproval,
      repairing, testing, overdue, totalOwing, totalRevenue,
      revenueToday, revenueThisWeek, revenueThisMonth,
      jobsDueToday, newCustomersToday, completedToday,
      avgRepairTime, completionRate, completed,
    })

    setLoading(false)
  }

  useEffect(() => { loadDashboard() }, [])

  const getStatusInfo = (status) => {
    const map = {
      'Received': { label: 'Received', color: '#8A8A8A', bg: '#F0EDE8', icon: '📥' },
      'Diagnosing': { label: 'Diagnosing', color: '#0F2B4A', bg: '#D6E0EB', icon: '🔍' },
      'Awaiting Approval': { label: 'Approval', color: '#D4A52A', bg: '#F6E9C8', icon: '⏳' },
      'Awaiting Parts': { label: 'Parts', color: '#D9534F', bg: '#F1DBD3', icon: '🧩' },
      'Repairing': { label: 'Repairing', color: '#0F2B4A', bg: '#D6E0EB', icon: '🔧' },
      'Testing': { label: 'Testing', color: '#0F2B4A', bg: '#D6E0EB', icon: '🧪' },
      'Ready': { label: 'Ready', color: '#2E7D5E', bg: '#DCEBE2', icon: '✅' },
      'Completed': { label: 'Done', color: '#2E7D5E', bg: '#DCEBE2', icon: '✔️' },
      'Delivered': { label: 'Delivered', color: '#8A8A8A', bg: '#E8E0D5', icon: '📦' },
    }
    return map[status] || { label: status || 'Received', color: '#8A8A8A', bg: '#F0EDE8', icon: '📌' }
  }

  const getDeviceDisplay = (job) => {
    let type = job.device_type || ''
    let model = job.device_model || ''
    if (type && model.toLowerCase().startsWith(type.toLowerCase())) return model
    if (type && model) return `${type} ${model}`
    if (type) return type
    return job.title || 'Device'
  }

  const formatDate = (d) => {
    if (!d) return ''
    return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  }

  const formatCurrency = (amount) => {
    return '₦' + amount.toLocaleString()
  }

  const isOverdue = (dueDate) => {
    if (!dueDate) return false
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const due = new Date(dueDate)
    due.setHours(0, 0, 0, 0)
    return due < today
  }

  const limits = getPlanLimits(plan)
  const canAddMore = totalOrdersCount < limits.orders

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#F8F6F2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
          .spinner { width: 40px; height: 40px; border: 4px solid #e4d8c2; border-top: 4px solid #0F2B4A; border-radius: 50%; animation: spin 0.8s linear infinite; }
        `}</style>
        <div className="spinner"></div>
      </div>
    )
  }

  const previewJobs = jobs.slice(0, 5)
  const previewCustomers = customers.slice(0, 5)
  const readyJobs = jobs.filter(j => j.current_status === 'Ready') || []

  return (
    <div style={{ minHeight: '100vh', background: '#F8F6F2', padding: '1rem', fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>

      {/* ====== GLOBAL STYLES ====== */}
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.02); }
        }
        .animate-in { animation: fadeUp 0.5s ease-out both; }
        .delay-1 { animation-delay: 0.05s; }
        .delay-2 { animation-delay: 0.1s; }
        .delay-3 { animation-delay: 0.15s; }
        .delay-4 { animation-delay: 0.2s; }
        .delay-5 { animation-delay: 0.25s; }
        .delay-6 { animation-delay: 0.3s; }
        .delay-7 { animation-delay: 0.35s; }
        .delay-8 { animation-delay: 0.4s; }

        .glass-card {
          background: rgba(255,255,255,0.7);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255,255,255,0.3);
          border-radius: 16px;
          box-shadow: 0 4px 16px rgba(15,43,74,0.06);
          transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
        }
        .glass-card:hover {
          box-shadow: 0 8px 32px rgba(15,43,74,0.12);
          transform: translateY(-4px) scale(1.01);
        }

        .status-dot {
          display: inline-block;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          margin-right: 0.3rem;
        }
        .status-dot.overdue { background: #D9534F; animation: pulse 1.5s infinite; }
        .status-dot.ready { background: #2E7D5E; }
        .status-dot.active { background: #D4A52A; }
        .status-dot.completed { background: #8A8A8A; }

        .gradient-primary {
          background: linear-gradient(135deg, #0F2B4A, #1A3F66);
        }
        .gradient-gold {
          background: linear-gradient(135deg, #D4A52A, #C79A2B);
        }
        .gradient-green {
          background: linear-gradient(135deg, #2E7D5E, #1E5A44);
        }
        .gradient-red {
          background: linear-gradient(135deg, #D9534F, #B8433F);
        }
      `}</style>

      {/* ====== HEADER ====== */}
      <div className="animate-in delay-1" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
          <LetterLogo name={business?.name} size={48} />
          <div>
            <h1 style={{ color: '#0F2B4A', fontSize: '1.3rem', fontWeight: '700', margin: 0, lineHeight: 1.2 }}>
              {business?.name || 'Your Business'}
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ background: '#F6E9C8', color: '#0F2B4A', fontSize: '0.6rem', fontWeight: '600', padding: '0.05rem 0.5rem', borderRadius: '10px' }}>
                🔧 Repairs
              </span>
              <span style={{ fontSize: '0.6rem', color: '#8A8A8A' }}>
                {new Date().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            </div>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.7rem', color: '#8A8A8A' }}>Total Revenue</div>
          <div style={{ fontSize: '1.2rem', fontWeight: '700', color: '#0F2B4A' }}>
            {formatCurrency(stats.totalRevenue || 0)}
          </div>
        </div>
      </div>

      {/* Feedback Banner */}
      {business && <FeedbackBanner business={business} />}

      {/* ====== TODAY'S SUMMARY ====== */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.6rem', marginBottom: '1.2rem' }}>
        <div className="glass-card animate-in delay-2" style={{ padding: '0.6rem', textAlign: 'center' }}>
          <div style={{ fontSize: '0.5rem', color: '#8A8A8A', textTransform: 'uppercase', letterSpacing: '0.3px' }}>📅 Due Today</div>
          <div style={{ fontSize: '1.2rem', fontWeight: '700', color: '#D9534F' }}>{stats.jobsDueToday || 0}</div>
        </div>
        <div className="glass-card animate-in delay-3" style={{ padding: '0.6rem', textAlign: 'center' }}>
          <div style={{ fontSize: '0.5rem', color: '#8A8A8A', textTransform: 'uppercase', letterSpacing: '0.3px' }}>👤 New Customers</div>
          <div style={{ fontSize: '1.2rem', fontWeight: '700', color: '#0F2B4A' }}>{stats.newCustomersToday || 0}</div>
        </div>
        <div className="glass-card animate-in delay-4" style={{ padding: '0.6rem', textAlign: 'center' }}>
          <div style={{ fontSize: '0.5rem', color: '#8A8A8A', textTransform: 'uppercase', letterSpacing: '0.3px' }}>✅ Completed Today</div>
          <div style={{ fontSize: '1.2rem', fontWeight: '700', color: '#2E7D5E' }}>{stats.completedToday || 0}</div>
        </div>
        <div className="glass-card animate-in delay-5" style={{ padding: '0.6rem', textAlign: 'center' }}>
          <div style={{ fontSize: '0.5rem', color: '#8A8A8A', textTransform: 'uppercase', letterSpacing: '0.3px' }}>📈 Completion Rate</div>
          <div style={{ fontSize: '1.2rem', fontWeight: '700', color: '#D4A52A' }}>{stats.completionRate || 0}%</div>
        </div>
      </div>

      {/* ====== REVENUE ROW ====== */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.6rem', marginBottom: '1.2rem' }}>
        <div className="glass-card animate-in delay-3" style={{ padding: '0.8rem', textAlign: 'center', borderTop: '4px solid #D4A52A' }}>
          <div style={{ fontSize: '0.6rem', color: '#8A8A8A', textTransform: 'uppercase', letterSpacing: '0.5px' }}>💰 Today</div>
          <div style={{ fontSize: '1.2rem', fontWeight: '700', color: '#0F2B4A' }}>
            {formatCurrency(stats.revenueToday || 0)}
          </div>
        </div>
        <div className="glass-card animate-in delay-4" style={{ padding: '0.8rem', textAlign: 'center', borderTop: '4px solid #D9534F' }}>
          <div style={{ fontSize: '0.6rem', color: '#8A8A8A', textTransform: 'uppercase', letterSpacing: '0.5px' }}>📊 This Week</div>
          <div style={{ fontSize: '1.2rem', fontWeight: '700', color: '#0F2B4A' }}>
            {formatCurrency(stats.revenueThisWeek || 0)}
          </div>
        </div>
        <div className="glass-card animate-in delay-5" style={{ padding: '0.8rem', textAlign: 'center', borderTop: '4px solid #2E7D5E' }}>
          <div style={{ fontSize: '0.6rem', color: '#8A8A8A', textTransform: 'uppercase', letterSpacing: '0.5px' }}>📈 This Month</div>
          <div style={{ fontSize: '1.2rem', fontWeight: '700', color: '#0F2B4A' }}>
            {formatCurrency(stats.revenueThisMonth || 0)}
          </div>
        </div>
      </div>

      {/* ====== KPI GRID ====== */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '0.5rem', marginBottom: '1.2rem' }}>
        <a href="/dashboard/repairs/jobs" className="glass-card animate-in delay-4" style={{ padding: '0.6rem 0.4rem', textAlign: 'center', textDecoration: 'none', cursor: 'pointer', borderLeft: '4px solid #0F2B4A' }}>
          <div style={{ fontSize: '1.2rem', fontWeight: '700', color: '#0F2B4A' }}>{stats.total || 0}</div>
          <div style={{ fontSize: '0.5rem', color: '#8A8A8A', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Jobs</div>
        </a>
        <a href="/dashboard/repairs/jobs?filter=active" className="glass-card animate-in delay-5" style={{ padding: '0.6rem 0.4rem', textAlign: 'center', textDecoration: 'none', cursor: 'pointer', borderLeft: '4px solid #D4A52A' }}>
          <div style={{ fontSize: '1.2rem', fontWeight: '700', color: '#D4A52A' }}>{stats.active || 0}</div>
          <div style={{ fontSize: '0.5rem', color: '#8A8A8A', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Active</div>
        </a>
        <a href="/dashboard/repairs/jobs?filter=awaiting_parts" className="glass-card animate-in delay-6" style={{ padding: '0.6rem 0.4rem', textAlign: 'center', textDecoration: 'none', cursor: 'pointer', borderLeft: '4px solid #D9534F' }}>
          <div style={{ fontSize: '1.2rem', fontWeight: '700', color: '#D9534F' }}>{stats.awaitingParts || 0}</div>
          <div style={{ fontSize: '0.5rem', color: '#8A8A8A', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Parts</div>
        </a>
        <a href="/dashboard/repairs/jobs?filter=ready" className="glass-card animate-in delay-7" style={{ padding: '0.6rem 0.4rem', textAlign: 'center', textDecoration: 'none', cursor: 'pointer', borderLeft: '4px solid #2E7D5E' }}>
          <div style={{ fontSize: '1.2rem', fontWeight: '700', color: '#2E7D5E' }}>{stats.ready || 0}</div>
          <div style={{ fontSize: '0.5rem', color: '#8A8A8A', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Ready</div>
        </a>
        <a href="/dashboard/repairs/jobs?filter=overdue" className="glass-card animate-in delay-8" style={{ padding: '0.6rem 0.4rem', textAlign: 'center', textDecoration: 'none', cursor: 'pointer', borderLeft: '4px solid #D9534F' }}>
          <div style={{ fontSize: '1.2rem', fontWeight: '700', color: '#D9534F' }}>{stats.overdue || 0}</div>
          <div style={{ fontSize: '0.5rem', color: '#8A8A8A', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Overdue</div>
        </a>
        <a href="/dashboard/repairs/jobs?filter=owing" className="glass-card animate-in delay-8" style={{ padding: '0.6rem 0.4rem', textAlign: 'center', textDecoration: 'none', cursor: 'pointer', borderLeft: '4px solid #D9534F' }}>
          <div style={{ fontSize: '1rem', fontWeight: '700', color: '#D9534F' }}>{formatCurrency(stats.totalOwing || 0)}</div>
          <div style={{ fontSize: '0.5rem', color: '#8A8A8A', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Owing</div>
        </a>
      </div>

      {/* ====== PIPELINE FLOW (Kanban-style) ====== */}
      <div style={{ background: 'rgba(255,255,255,0.5)', backdropFilter: 'blur(8px)', borderRadius: '16px', padding: '0.8rem', marginBottom: '1.2rem', border: '1px solid rgba(255,255,255,0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: '600', color: '#0F2B4A' }}>📊 Pipeline</span>
          <span style={{ fontSize: '0.6rem', color: '#8A8A8A' }}>{stats.active || 0} active jobs</span>
        </div>
        <div style={{ display: 'flex', gap: '0.3rem', overflowX: 'auto', paddingBottom: '0.3rem' }}>
          {[
            { key: 'Received', label: 'Received', count: stats.received || 0, icon: '📥', color: '#8A8A8A' },
            { key: 'Diagnosing', label: 'Diagnosing', count: stats.diagnosing || 0, icon: '🔍', color: '#0F2B4A' },
            { key: 'Awaiting Approval', label: 'Approval', count: stats.awaitingApproval || 0, icon: '⏳', color: '#D4A52A' },
            { key: 'Repairing', label: 'Repairing', count: stats.repairing || 0, icon: '🔧', color: '#0F2B4A' },
            { key: 'Testing', label: 'Testing', count: stats.testing || 0, icon: '🧪', color: '#0F2B4A' },
            { key: 'Ready', label: 'Ready', count: stats.ready || 0, icon: '✅', color: '#2E7D5E' },
          ].map((stage) => (
            <a
              key={stage.key}
              href={`/dashboard/repairs/jobs?filter=${stage.key.toLowerCase().replace(' ', '_')}`}
              style={{
                flex: '0 0 auto',
                minWidth: '60px',
                background: 'rgba(255,255,255,0.7)',
                borderRadius: '10px',
                padding: '0.4rem 0.5rem',
                textAlign: 'center',
                textDecoration: 'none',
                border: `1px solid ${stage.count > 0 ? stage.color : '#E5E0D8'}`,
                transition: 'all 0.2s ease',
                cursor: 'pointer',
              }}
            >
              <div style={{ fontSize: '0.8rem' }}>{stage.icon}</div>
              <div style={{ fontSize: '0.9rem', fontWeight: '700', color: stage.count > 0 ? stage.color : '#8A8A8A' }}>
                {stage.count}
              </div>
              <div style={{ fontSize: '0.4rem', color: '#8A8A8A', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                {stage.label}
              </div>
            </a>
          ))}
        </div>
      </div>

      {/* ====== QUICK ACTIONS ====== */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.2rem' }}>
        <a
          href={canAddMore ? "/dashboard/repairs/jobs/new" : "#"}
          style={{
            padding: '0.6rem 1.2rem',
            borderRadius: '12px',
            background: canAddMore ? 'linear-gradient(135deg, #D4A52A, #C79A2B)' : '#E5E0D8',
            color: canAddMore ? '#0F2B4A' : '#8A8A8A',
            fontWeight: '700',
            textDecoration: 'none',
            fontSize: '0.8rem',
            boxShadow: canAddMore ? '0 4px 16px rgba(212,165,42,0.3)' : 'none',
            cursor: canAddMore ? 'pointer' : 'default',
            flex: 1,
            textAlign: 'center',
          }}
          onClick={(e) => {
            if (!canAddMore) { e.preventDefault(); router.push('/dashboard/subscription') }
          }}
        >
          {canAddMore ? '🔧 New Repair Job' : '🔒 Upgrade to Add Jobs'}
        </a>
        <a href="/dashboard/customers/new" style={{ padding: '0.6rem 1.2rem', borderRadius: '12px', background: '#0F2B4A', color: '#fff', fontWeight: '600', textDecoration: 'none', fontSize: '0.8rem', flex: 1, textAlign: 'center' }}>
          👤 + Customer
        </a>
        <a href="/dashboard/repairs/parts" style={{ padding: '0.6rem 1.2rem', borderRadius: '12px', background: '#fff', color: '#0F2B4A', fontWeight: '600', textDecoration: 'none', fontSize: '0.8rem', border: '1px solid #E5E0D8', flex: 1, textAlign: 'center' }}>
          📦 Parts
        </a>
      </div>

      {/* ====== READY FOR PICKUP ====== */}
      {readyJobs.length > 0 && (
        <div style={{ marginBottom: '1.2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <h2 style={{ fontSize: '0.9rem', color: '#0F2B4A', margin: 0 }}>🔔 Ready for Pickup</h2>
            <a href="/dashboard/repairs/jobs?filter=ready" style={{ fontSize: '0.7rem', color: '#8A8A8A', textDecoration: 'none' }}>View all →</a>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '0.5rem' }}>
            {readyJobs.slice(0, 4).map((job) => {
              const phone = job.customers?.phone || ''
              const formattedPhone = phone.startsWith('0') ? '234' + phone.slice(1) : phone
              const device = getDeviceDisplay(job)
              return (
                <div key={job.id} className="glass-card" style={{ padding: '0.7rem', border: '2px solid #2E7D5E' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontWeight: '600', color: '#0F2B4A', fontSize: '0.85rem' }}>{device}</div>
                      <div style={{ fontSize: '0.7rem', color: '#8A8A8A' }}>{job.customers?.name || 'No customer'}</div>
                    </div>
                    <span style={{ background: '#DCEBE2', color: '#2E7D5E', fontSize: '0.5rem', fontWeight: '600', padding: '0.1rem 0.4rem', borderRadius: '10px' }}>✅ Ready</span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.3rem', marginTop: '0.4rem' }}>
                    <a href={`/dashboard/repairs/jobs/${job.id}`} style={{ fontSize: '0.6rem', color: '#0F2B4A', textDecoration: 'underline' }}>View</a>
                    {phone && (
                      <button
                        onClick={() => {
                          const msg = `Hi ${job.customers?.name || ''}, your ${device} repair is ready for pickup!`
                          window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(msg)}`, '_blank')
                        }}
                        style={{ fontSize: '0.6rem', color: '#2E7D5E', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                      >
                        💬 WhatsApp
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ====== RECENT JOBS & CUSTOMERS ====== */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
        {/* Recent Jobs */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <h2 style={{ fontSize: '0.85rem', color: '#0F2B4A', margin: 0 }}>📋 Recent Jobs</h2>
            <a href="/dashboard/repairs/jobs" style={{ fontSize: '0.65rem', color: '#8A8A8A', textDecoration: 'none' }}>View all →</a>
          </div>
          {jobs.length === 0 ? (
            <div className="glass-card" style={{ padding: '1rem', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.3rem' }}>🔧</div>
              <div style={{ fontSize: '0.8rem', color: '#8A8A8A' }}>No repair jobs yet</div>
              <a href="/dashboard/repairs/jobs/new" style={{ fontSize: '0.7rem', color: '#D4A52A', textDecoration: 'none', fontWeight: '600' }}>Create first job →</a>
            </div>
          ) : (
            previewJobs.map((job, idx) => {
              const status = getStatusInfo(job.current_status)
              const device = getDeviceDisplay(job)
              const isOverdueStatus = isOverdue(job.due_date) && job.current_status !== 'Delivered' && job.current_status !== 'Completed'
              return (
                <a key={job.id} href={`/dashboard/repairs/jobs/${job.id}`} style={{ textDecoration: 'none' }}>
                  <div className="glass-card" style={{ padding: '0.5rem 0.7rem', marginBottom: '0.4rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: '600', color: '#0F2B4A', fontSize: '0.8rem' }}>{device}</div>
                      <div style={{ fontSize: '0.65rem', color: '#8A8A8A' }}>{job.customers?.name || 'No customer'}</div>
                    </div>
                    <span style={{
                      background: isOverdueStatus ? '#F1DBD3' : status.bg,
                      color: isOverdueStatus ? '#D9534F' : status.color,
                      fontSize: '0.5rem',
                      fontWeight: '600',
                      padding: '0.1rem 0.4rem',
                      borderRadius: '10px',
                      whiteSpace: 'nowrap',
                    }}>
                      {isOverdueStatus ? '⚠️ Overdue' : status.label}
                    </span>
                  </div>
                </a>
              )
            })
          )}
        </div>

        {/* Recent Customers */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <h2 style={{ fontSize: '0.85rem', color: '#0F2B4A', margin: 0 }}>👤 Recent Customers</h2>
            <a href="/dashboard/customers" style={{ fontSize: '0.65rem', color: '#8A8A8A', textDecoration: 'none' }}>View all →</a>
          </div>
          {customers.length === 0 ? (
            <div className="glass-card" style={{ padding: '1rem', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.3rem' }}>👤</div>
              <div style={{ fontSize: '0.8rem', color: '#8A8A8A' }}>No customers yet</div>
              <a href="/dashboard/customers/new" style={{ fontSize: '0.7rem', color: '#D4A52A', textDecoration: 'none', fontWeight: '600' }}>Add first customer →</a>
            </div>
          ) : (
            previewCustomers.map((c, idx) => {
              const customerJobs = jobs.filter(j => j.customer_id === c.id)
              const activeJobs = customerJobs.filter(j => j.current_status !== 'Completed' && j.current_status !== 'Delivered')
              return (
                <a key={c.id} href={`/dashboard/customers/${c.id}`} style={{ textDecoration: 'none' }}>
                  <div className="glass-card" style={{ padding: '0.5rem 0.7rem', marginBottom: '0.4rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: '600', color: '#0F2B4A', fontSize: '0.8rem' }}>{c.name}</div>
                      <div style={{ fontSize: '0.65rem', color: '#8A8A8A' }}>{c.phone || 'No phone'}</div>
                    </div>
                    {activeJobs.length > 0 && (
                      <span style={{ background: '#F6E9C8', color: '#0F2B4A', fontSize: '0.5rem', fontWeight: '600', padding: '0.1rem 0.4rem', borderRadius: '10px' }}>
                        {activeJobs.length} job{activeJobs.length > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </a>
              )
            })
          )}
        </div>
      </div>

      {/* ====== QUICK STATS FOOTER ====== */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.6rem', marginTop: '1.2rem', padding: '0.8rem', background: 'rgba(255,255,255,0.5)', backdropFilter: 'blur(8px)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.2)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '0.5rem', color: '#8A8A8A', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Avg. Job Value</div>
          <div style={{ fontSize: '0.9rem', fontWeight: '700', color: '#0F2B4A' }}>
            {formatCurrency(stats.total > 0 ? (stats.totalRevenue / stats.total) : 0)}
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '0.5rem', color: '#8A8A8A', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Avg. Repair Time</div>
          <div style={{ fontSize: '0.9rem', fontWeight: '700', color: '#0F2B4A' }}>
            {stats.avgRepairTime ? `${stats.avgRepairTime}h` : '—'}
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '0.5rem', color: '#8A8A8A', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Completion Rate</div>
          <div style={{ fontSize: '0.9rem', fontWeight: '700', color: '#2E7D5E' }}>
            {stats.completionRate || 0}%
          </div>
        </div>
      </div>

      {/* ====== FOOTER ====== */}
      <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.6rem', color: '#C8C0B5' }}>
        Cresoa Repairs · {new Date().getFullYear()}
      </div>
    </div>
  )
              }
