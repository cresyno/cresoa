'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabaseClient'
import LetterLogo from '../../../components/LetterLogo'
import FeedbackBanner from '../../../components/FeedbackBanner'
import { getPlanLimits } from '../../../lib/planLimits'
import { getCurrentBusinessId } from '../../../lib/getBusinessId'

export default function RepairsDashboardPage() {
  const router = useRouter()
  const [business, setBusiness] = useState(null)
  const [jobs, setJobs] = useState([])
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    awaitingParts: 0,
    ready: 0,
    received: 0,
    diagnosing: 0,
    awaitingApproval: 0,
    repairing: 0,
    testing: 0,
    overdue: 0,
    totalOwing: 0,
    totalRevenue: 0,
  })
  const [totalOrdersCount, setTotalOrdersCount] = useState(0)
  const [plan, setPlan] = useState('free')

  const loadDashboard = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const businessId = getCurrentBusinessId()
      let businessData = null

      if (businessId) {
        const { data, error } = await supabase
          .from('businesses')
          .select('*')
          .eq('id', businessId)
          .maybeSingle()
        if (data && !error) businessData = data
      }

      if (!businessData) {
        const { data, error } = await supabase
          .from('businesses')
          .select('*')
          .eq('owner_id', user.id)
          .single()
        if (error || !data) {
          router.push('/onboarding')
          return
        }
        businessData = data
      }

      setBusiness(businessData)
      setPlan(businessData.plan || 'free')

      const { count: totalCount } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', businessData.id)
      setTotalOrdersCount(totalCount || 0)

      const { data: jobData, error: jobError } = await supabase
        .from('orders')
        .select('*, customers(name, phone)')
        .eq('business_id', businessData.id)
        .not('device_type', 'is', null)
        .order('created_at', { ascending: false })

      if (jobError) {
        console.error('Error loading jobs:', jobError)
        setJobs([])
      } else {
        setJobs(jobData || [])
      }

      const { data: customerData, error: custError } = await supabase
        .from('customers')
        .select('*')
        .eq('business_id', businessData.id)
        .order('created_at', { ascending: false })

      if (custError) {
        console.error('Error loading customers:', custError)
        setCustomers([])
      } else {
        setCustomers(customerData || [])
      }

      const total = jobData?.length || 0
      const active = jobData?.filter(j => j.current_status !== 'Completed' && j.current_status !== 'Delivered').length || 0
      const awaitingParts = jobData?.filter(j => j.current_status === 'Awaiting Parts').length || 0
      const ready = jobData?.filter(j => j.current_status === 'Ready').length || 0
      const received = jobData?.filter(j => j.current_status === 'Received').length || 0
      const diagnosing = jobData?.filter(j => j.current_status === 'Diagnosing').length || 0
      const awaitingApproval = jobData?.filter(j => j.current_status === 'Awaiting Approval').length || 0
      const repairing = jobData?.filter(j => j.current_status === 'Repairing').length || 0
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
      const totalRevenue = jobData?.reduce((sum, j) => sum + j.amount_paid, 0) || 0

      setStats({
        total, active, awaitingParts, ready, received, diagnosing,
        awaitingApproval, repairing, testing, overdue, totalOwing, totalRevenue
      })

    } catch (err) {
      console.error('Error loading dashboard:', err)
      setError('Failed to load dashboard. Please refresh.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDashboard()
  }, [])

  const getDeviceDisplay = (job) => {
    let type = job.device_type || ''
    let model = job.device_model || ''
    if (type && model.toLowerCase().startsWith(type.toLowerCase())) return model
    if (type && model) return `${type} ${model}`
    if (type) return type
    return job.title || 'Device'
  }

  const getStatusInfo = (status) => {
    const map = {
      'Received': { label: 'Received', color: '#6B6255', bg: '#F0EDE8' },
      'Diagnosing': { label: 'Diagnosing', color: '#6B6255', bg: '#F0EDE8' },
      'Awaiting Approval': { label: 'Approval', color: '#B4881E', bg: '#F6E9C8' },
      'Awaiting Parts': { label: 'Parts', color: '#B4881E', bg: '#F6E9C8' },
      'Repairing': { label: 'Repairing', color: '#1E3A5F', bg: '#D6E0EB' },
      'Testing': { label: 'Testing', color: '#1E3A5F', bg: '#D6E0EB' },
      'Ready': { label: 'Ready', color: '#4C7A5E', bg: '#DCEBE2' },
      'Completed': { label: 'Done', color: '#4C7A5E', bg: '#DCEBE2' },
      'Delivered': { label: 'Delivered', color: '#6B6255', bg: '#E8E0D5' },
    }
    return map[status] || { label: status || 'Received', color: '#6B6255', bg: '#F0EDE8' }
  }

  const limits = getPlanLimits(plan)
  const canAddMore = totalOrdersCount < limits.orders

  // ─── Skeleton Loading ───
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#F8F6F2', padding: '1rem' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ background: '#fff', borderRadius: '16px', padding: '1rem', marginBottom: '1rem', animation: 'pulse 1.5s infinite' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div><div style={{ width: '120px', height: '16px', background: '#E5E0D8', borderRadius: '6px', marginBottom: '4px' }} /><div style={{ width: '80px', height: '10px', background: '#E5E0D8', borderRadius: '6px' }} /></div>
              <div><div style={{ width: '60px', height: '10px', background: '#E5E0D8', borderRadius: '6px' }} /></div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '0.5rem', marginBottom: '1rem' }}>
            {[1,2,3,4].map(i => <div key={i} style={{ background: '#fff', borderRadius: '12px', padding: '0.8rem', animation: 'pulse 1.5s infinite' }}><div style={{ width: '50%', height: '16px', background: '#E5E0D8', borderRadius: '6px', marginBottom: '4px' }} /><div style={{ width: '30%', height: '10px', background: '#E5E0D8', borderRadius: '6px' }} /></div>)}
          </div>
          <div style={{ background: '#fff', borderRadius: '12px', padding: '0.8rem', animation: 'pulse 1.5s infinite' }}>
            <div style={{ display: 'flex', gap: '0.5rem' }}>{[1,2,3,4,5].map(i => <div key={i} style={{ flex:1, textAlign:'center' }}><div style={{ width:'100%', height:'12px', background:'#E5E0D8', borderRadius:'6px' }} /></div>)}</div>
          </div>
          <style>{`@keyframes pulse { 0% { opacity: 0.6; } 50% { opacity: 1; } 100% { opacity: 0.6; } }`}</style>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', background: '#F8F6F2', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center' }}>
        <div style={{ background: '#fff', padding: '2rem', borderRadius: '16px', maxWidth: '400px' }}>
          <h2 style={{ color: '#D9534F' }}>Oops!</h2>
          <p style={{ color: '#8A8A8A' }}>{error}</p>
          <button onClick={loadDashboard} style={{ background: '#D4A52A', color: '#0F2B4A', padding: '0.6rem 2rem', border: 'none', borderRadius: '8px', fontSize: '1rem', fontWeight: '600', cursor: 'pointer' }}>Retry</button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg, #F8F6F2)', padding: '1rem', fontFamily: "'Inter', system-ui, sans-serif" }}>
      <style>{`
        .glass { background: rgba(255,255,255,0.7); backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,0.3); border-radius: 16px; box-shadow: 0 4px 16px rgba(15,43,74,0.06); padding: 1rem; transition: all 0.2s; }
        .glass:hover { box-shadow: 0 8px 24px rgba(15,43,74,0.08); }
        .stat-card { background: rgba(255,255,255,0.7); backdrop-filter: blur(12px); border-radius: 12px; padding: 0.6rem; text-align: center; border: 1px solid rgba(255,255,255,0.3); box-shadow: 0 2px 8px rgba(15,43,74,0.04); text-decoration: none; transition: all 0.2s; }
        .stat-card:hover { transform: translateY(-2px); border-color: #D4A52A; }
        .stat-card .number { font-size: 1.4rem; font-weight: 700; margin: 0; color: #0F2B4A; }
        .stat-card .label { font-size: 0.6rem; color: #8A8A8A; text-transform: uppercase; letter-spacing: 0.3px; margin: 0.1rem 0 0; }
        .action-btn { padding: 0.5rem 1rem; border-radius: 10px; font-size: 0.8rem; font-weight: 600; text-decoration: none; display: inline-flex; align-items: center; gap: 0.3rem; border: none; cursor: pointer; transition: all 0.2s; box-shadow: 0 2px 8px rgba(15,43,74,0.04); }
        .action-btn:active { transform: scale(0.96); }
        .action-btn.primary { background: linear-gradient(135deg, #D4A52A, #C79A2B); color: #0F2B4A; }
        .action-btn.secondary { background: #0F2B4A; color: #fff; }
        .action-btn.outline { background: #fff; color: #0F2B4A; border: 1px solid #E5E0D8; }
        .section-title { display: flex; justify-content: space-between; align-items: center; margin: 1.2rem 0 0.6rem; }
        .section-title h3 { color: #0F2B4A; font-size: 1rem; font-weight: 700; margin: 0; }
        .section-title a { color: #8A8A8A; font-size: 0.75rem; text-decoration: none; }
        .section-title a:hover { text-decoration: underline; }
        .order-row { display: flex; justify-content: space-between; align-items: center; padding: 0.6rem 0; border-bottom: 1px solid #F0EDE8; cursor: pointer; }
        .order-row:last-child { border-bottom: none; }
        .order-row .device { font-weight: 600; color: #0F2B4A; font-size: 0.9rem; }
        .order-row .customer { font-size: 0.75rem; color: #8A8A8A; }
        .order-row .status { font-size: 0.65rem; font-weight: 600; padding: 0.1rem 0.5rem; border-radius: 12px; }
        .customer-row { display: flex; justify-content: space-between; align-items: center; padding: 0.5rem 0; border-bottom: 1px solid #F0EDE8; cursor: pointer; }
        .customer-row:last-child { border-bottom: none; }
        .customer-row .name { font-weight: 600; color: #0F2B4A; }
        .customer-row .phone { font-size: 0.7rem; color: #8A8A8A; }
        .empty-state { text-align: center; padding: 1.5rem; color: #8A8A8A; }
        .empty-state .icon { font-size: 2.5rem; display: block; margin-bottom: 0.3rem; }
        .pipeline-item { flex: 1; text-align: center; background: rgba(255,255,255,0.5); border-radius: 8px; padding: 0.2rem 0; min-width: 50px; }
        .pipeline-item .count { font-weight: 700; font-size: 1rem; color: #0F2B4A; margin: 0; }
        .pipeline-item .label { font-size: 0.45rem; color: #8A8A8A; text-transform: uppercase; letter-spacing: 0.3px; margin: 0; }
        @media (max-width: 480px) {
          .stat-card .number { font-size: 1rem; }
          .action-btn { font-size: 0.7rem; padding: 0.4rem 0.6rem; }
        }
      `}</style>

      {/* ─── HEADER ─── */}
      <div className="glass" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.2rem', color: '#0F2B4A', margin: 0 }}>{business?.name || 'Repairs'}</h1>
          <div style={{ fontSize: '0.7rem', color: '#8A8A8A' }}>
            {new Date().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.6rem', color: '#8A8A8A' }}>Total Revenue</div>
          <div style={{ fontSize: '1.1rem', fontWeight: '700', color: '#0F2B4A' }}>
            ₦{(stats.totalRevenue || 0).toLocaleString()}
          </div>
        </div>
      </div>

      {business && <FeedbackBanner business={business} />}

      {/* ─── STATS ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', marginBottom: '1rem' }}>
        <div className="stat-card"><div className="number">{stats.total || 0}</div><div className="label">Jobs</div></div>
        <div className="stat-card"><div className="number">{stats.active || 0}</div><div className="label">Active</div></div>
        <div className="stat-card"><div className="number">{stats.ready || 0}</div><div className="label">Ready</div></div>
        <div className="stat-card"><div className="number">{stats.overdue || 0}</div><div className="label">Overdue</div></div>
      </div>

      {/* ─── QUICK ACTIONS ─── */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        <a href={canAddMore ? "/dashboard/repairs/jobs/new" : "#"} className="action-btn primary" style={{ opacity: canAddMore ? 1 : 0.6 }} onClick={(e) => { if (!canAddMore) { e.preventDefault(); router.push('/dashboard/subscription') } }}>
          {canAddMore ? '🔧 + Job' : '🔒 Upgrade'}
        </a>
        <a href="/dashboard/customers/new" className="action-btn secondary">👤 + Customer</a>
        <a href="/dashboard/repairs/parts" className="action-btn outline">📦 Parts</a>
      </div>

      {/* ─── PIPELINE ─── */}
      <div className="glass" style={{ padding: '0.6rem 1rem', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
          <span style={{ fontWeight: '600', color: '#0F2B4A', fontSize: '0.75rem' }}>📊 Pipeline</span>
          <span style={{ fontSize: '0.6rem', color: '#8A8A8A' }}>{stats.active || 0} active</span>
        </div>
        <div style={{ display: 'flex', gap: '0.3rem', overflowX: 'auto', paddingBottom: '0.2rem' }}>
          {[
            { key: 'Received', label: 'Received', count: stats.received || 0 },
            { key: 'Diagnosing', label: 'Diagnosing', count: stats.diagnosing || 0 },
            { key: 'Awaiting Parts', label: 'Parts', count: stats.awaitingParts || 0 },
            { key: 'Repairing', label: 'Repairing', count: stats.repairing || 0 },
            { key: 'Ready', label: 'Ready', count: stats.ready || 0 },
          ].map((s) => (
            <div key={s.key} className="pipeline-item">
              <div className="count">{s.count}</div>
              <div className="label">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── RECENT JOBS ─── */}
      <div style={{ marginBottom: '1.2rem' }}>
        <div className="section-title"><h3>📋 Recent Jobs</h3><a href="/dashboard/repairs/jobs">View all →</a></div>
        {jobs.length === 0 ? (
          <div className="empty-state"><span className="icon">🔧</span><p>No repair jobs yet</p></div>
        ) : (
          jobs.slice(0, 5).map((j) => {
            const status = getStatusInfo(j.current_status)
            const device = getDeviceDisplay(j)
            return (
              <div key={j.id} className="order-row" onClick={() => router.push(`/dashboard/repairs/jobs/${j.id}`)}>
                <div>
                  <div className="device">{device}</div>
                  <div className="customer">{j.customers?.name || 'No customer'}</div>
                </div>
                <span className="status" style={{ background: status.bg, color: status.color }}>{status.label}</span>
              </div>
            )
          })
        )}
      </div>

      {/* ─── RECENT CUSTOMERS ─── */}
      <div>
        <div className="section-title"><h3>👤 Recent Customers</h3><a href="/dashboard/customers">View all →</a></div>
        {customers.length === 0 ? (
          <div className="empty-state"><span className="icon">👤</span><p>No customers yet</p></div>
        ) : (
          customers.slice(0, 5).map((c) => (
            <div key={c.id} className="customer-row" onClick={() => router.push(`/dashboard/customers/${c.id}`)}>
              <div><div className="name">{c.name}</div><div className="phone">{c.phone || ''}</div></div>
            </div>
          ))
        )}
      </div>

      <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.6rem', color: '#C8C0B5' }}>
        Cresoa Repairs · {new Date().getFullYear()}
      </div>
    </div>
  )
                               }
