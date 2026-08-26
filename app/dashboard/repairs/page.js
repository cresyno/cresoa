'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../../lib/supabaseClient'

// ─── SELF-CONTAINED ICONS ───
const Svg = ({ name, size = 20, stroke = 'currentColor' }) => {
  const icons = {
    plus: <><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></>,
    tool: <><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" /></>,
    package: <><path d="M20.91 8.84L12 13 3.09 8.84" /><line x1="12" y1="22" x2="12" y2="13" /><line x1="2" y1="4" x2="12" y2="9" /><line x1="22" y1="4" x2="12" y2="9" /></>,
    user: <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></>,
    naira: <><path d="M6 3v18M18 3v18M6 8h12M6 16h12" /><path d="M6 3l6 9 6-9M6 21l6-9 6 9" /></>,
    file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></>,
    alert: <><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></>,
    checkCircle: <><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></>,
    arrowRight: <><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></>,
    clock: <><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></>,
    sparkles: <><path d="M12 3l1.9 5.8a2 2 0 0 0 1.3 1.3L21 12l-5.8 1.9a2 2 0 0 0-1.3 1.3L12 21l-1.9-5.8a2 2 0 0 0-1.3-1.3L3 12l5.8-1.9a2 2 0 0 0 1.3-1.3z" /></>,
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{icons[name]}</svg>
}

// ─── NAIRA MONEY FORMATTER ───
const formatMoney = (val) => `₦${Number(val || 0).toLocaleString('en-NG')}`

// ─── RELATIVE DATE FORMATTER ───
const relativeDate = (dateStr) => {
  const date = new Date(dateStr)
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)
  if (date.toDateString() === today.toDateString()) return 'Today'
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return date.toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })
}

export default function RepairsDashboardPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const businessId = searchParams.get('business_id')

  const [loading, setLoading] = useState(true)
  const [businessName, setBusinessName] = useState('')
  const [orders, setOrders] = useState([])
  const [payments, setPayments] = useState([])
  const [inventory, setInventory] = useState([])
  const [customers, setCustomers] = useState([])
  const [timeframe, setTimeframe] = useState('30D')

  // Fetch all data
  useEffect(() => {
    const fetchData = async () => {
      if (!businessId) return
      setLoading(true)
      try {
        // Fetch business name
        const { data: businessData } = await supabase
          .from('businesses')
          .select('name')
          .eq('id', businessId)
          .maybeSingle()
        setBusinessName(businessData?.name || 'Your Business')

        // Fetch orders
        const { data: ordersData } = await supabase
          .from('orders')
          .select('*')
          .eq('business_id', businessId)
          .eq('sector', 'repairs')
          .order('created_at', { ascending: false })

        // Fetch payments
        const { data: paymentsData } = await supabase
          .from('payment_records')
          .select('order_id, amount')
          .eq('business_id', businessId)

        // Fetch inventory
        const { data: inventoryData } = await supabase
          .from('inventory_items')
          .select('*')
          .eq('business_id', businessId)
          .eq('sector', 'repairs')

        // Fetch customers
        const { data: customersData } = await supabase
          .from('customers')
          .select('id, name')
          .eq('business_id', businessId)
          .eq('sector', 'repairs')

        setOrders(ordersData || [])
        setPayments(paymentsData || [])
        setInventory(inventoryData || [])
        setCustomers(customersData || [])
      } catch (e) {
        console.error('Error fetching dashboard:', e)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [businessId])

  // ─── BUSINESS INTELLIGENCE CALCULATIONS ───
  const stats = useMemo(() => {
    const paidMap = {}
    payments.forEach(p => {
      if (!paidMap[p.order_id]) paidMap[p.order_id] = 0
      paidMap[p.order_id] += Number(p.amount || 0)
    })

    let active = 0
    let overdue = 0
    let ready = 0
    let awaiting = 0
    let revenue = 0
    let outstanding = 0

    orders.forEach(o => {
      const price = Number(o.price || 0)
      const paid = paidMap[o.id] || Number(o.amount_paid || 0)
      revenue += price
      const due = price - paid
      if (due > 0) outstanding += due

      const status = (o.current_status || '').toLowerCase()
      if (['delivered', 'completed'].includes(status)) return

      active++
      if (o.due_date && new Date(o.due_date) < new Date() && !['delivered'].includes(status)) overdue++
      if (['ready', 'ready for pickup', 'ready for collection'].includes(status)) ready++
      if (['awaiting parts', 'waiting parts', 'in progress'].includes(status)) awaiting++
    })

    const lowStock = inventory.filter(i => Number(i.quantity_on_hand || 0) <= Number(i.reorder_level || 0)).length

    // Time-segmented stats
    const now = new Date()
    const todayStart = new Date(now)
    todayStart.setHours(0, 0, 0, 0)
    const weekStart = new Date(now)
    weekStart.setDate(weekStart.getDate() - 7)
    const monthStart = new Date(now)
    monthStart.setDate(monthStart.getDate() - 30)

    const getStatsForRange = (startDate) => {
      let jobsCreated = 0, completed = 0, revenueInRange = 0, outstandingInRange = 0, collectedInRange = 0
      orders.forEach(o => {
        const created = new Date(o.created_at)
        if (created >= startDate) {
          jobsCreated++
          const price = Number(o.price || 0)
          const paid = paidMap[o.id] || Number(o.amount_paid || 0)
          revenueInRange += price
          const due = price - paid
          if (due > 0) outstandingInRange += due
          collectedInRange += paid
          if (['delivered', 'completed'].includes((o.current_status || '').toLowerCase())) completed++
        }
      })
      return { jobsCreated, completed, revenueInRange, outstandingInRange, collectedInRange }
    }

    return {
      active, overdue, ready, awaiting, revenue, outstanding, lowStock,
      today: getStatsForRange(todayStart),
      week: getStatsForRange(weekStart),
      month: getStatsForRange(monthStart),
    }
  }, [orders, payments, inventory])

  // ─── REVENUE CHART DATA (7D / 30D / 90D) ───
  const chartData = useMemo(() => {
    const now = new Date()
    const days = timeframe === '7D' ? 7 : timeframe === '30D' ? 30 : 90
    const start = new Date(now)
    start.setDate(start.getDate() - (days - 1))
    start.setHours(0, 0, 0, 0)

    const daily = []
    const map = {}
    orders.forEach(o => {
      const d = new Date(o.created_at)
      if (d >= start) {
        const key = d.toISOString().split('T')[0]
        map[key] = (map[key] || 0) + Number(o.price || 0)
      }
    })

    for (let i = 0; i < days; i++) {
      const d = new Date(start)
      d.setDate(d.getDate() + i)
      const key = d.toISOString().split('T')[0]
      daily.push({ label: d.toLocaleDateString('en-NG', { day: 'numeric' }), value: map[key] || 0 })
    }
    return daily
  }, [orders, timeframe])

  const maxVal = Math.max(...chartData.map(d => d.value), 1)
  const chartHeight = 120
  const hasRevenueData = chartData.some(d => d.value > 0)

  const navigateTo = (path) => {
    router.push(`${path}?business_id=${businessId}`)
  }

  if (loading) {
    return (
      <div style={{ padding: '1.5rem', background: 'var(--cresoa-bg)', minHeight: '100vh' }}>
        <p style={{ color: 'var(--cresoa-text-muted)' }}>Loading your repair business...</p>
      </div>
    )
  }

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return `Good morning, ${businessName}`
    if (hour < 17) return `Good afternoon, ${businessName}`
    return `Good evening, ${businessName}`
  }

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto', background: 'var(--cresoa-bg)', minHeight: '100vh' }}>
      {/* ─── HEADER ─── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <p style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', margin: 0 }}>Repairs</p>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0.2rem 0', color: 'var(--cresoa-text)' }}>{getGreeting()}</h1>
          <p style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.85rem', margin: 0 }}>{new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>
        <button onClick={() => navigateTo('/dashboard/repairs/jobs/new')} className="cresoa-primary-button">
          <Svg name="plus" size={16} stroke="#fff" /> New Job
        </button>
      </div>

      {/* ─── TESSA CONTEXTUAL CARD (Static – not controlled by dashboard) ─── */}
      <div className="cresoa-card" style={{ background: 'var(--gradient-primary)', color: '#fff', display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Svg name="sparkles" size={24} stroke="var(--cresoa-accent)" />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, marginBottom: '0.2rem' }}>Tessa's Business Check</div>
          <div style={{ fontSize: '0.85rem', color: '#C8D4E3' }}>
            Ask Tessa about your business health, revenue, or outstanding payments.
          </div>
        </div>
      </div>

      {/* ─── BUSINESS HEALTH ─── */}
      <div className="cresoa-card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--cresoa-text)' }}>Business Health</h3>
          <span className={`cresoa-status ${stats.overdue > 0 ? 'cresoa-status-danger' : 'cresoa-status-success'}`}>
            {stats.overdue > 0 ? 'Needs Attention' : 'Good'}
          </span>
        </div>
        <div className="cresoa-snapshot-grid">
          <div className="cresoa-snapshot-item">
            <span>Active Jobs</span>
            <strong>{stats.active}</strong>
          </div>
          <div className="cresoa-snapshot-item">
            <span>Overdue</span>
            <strong style={{ color: stats.overdue > 0 ? 'var(--cresoa-danger)' : 'var(--cresoa-text)' }}>{stats.overdue}</strong>
          </div>
          <div className="cresoa-snapshot-item">
            <span>Revenue</span>
            <strong style={{ color: 'var(--cresoa-accent)' }}>{formatMoney(stats.revenue)}</strong>
            <small style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.7rem' }}>Last 30 days</small>
          </div>
          <div className="cresoa-snapshot-item">
            <span>Owed</span>
            <strong style={{ color: stats.outstanding > 0 ? 'var(--cresoa-danger)' : 'var(--cresoa-text)' }}>{formatMoney(stats.outstanding)}</strong>
            <small style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.7rem' }}>Outstanding</small>
          </div>
        </div>
      </div>

      {/* ─── TRACEABLE ANALYTICS TIMELINE ─── */}
      <div className="cresoa-card" style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ margin: '0 0 1rem', fontSize: '0.95rem', fontWeight: 700, color: 'var(--cresoa-text)' }}>Business Timeline</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <TimelineRow
            label="Today"
            jobsCreated={stats.today.jobsCreated}
            billed={stats.today.revenueInRange}
            collected={stats.today.collectedInRange}
            outstanding={stats.today.outstandingInRange}
          />
          <TimelineRow
            label="This Week"
            jobsCreated={stats.week.jobsCreated}
            completed={stats.week.completed}
            billed={stats.week.revenueInRange}
            outstanding={stats.week.outstandingInRange}
          />
          <TimelineRow
            label="This Month"
            jobsCreated={stats.month.jobsCreated}
            completed={stats.month.completed}
            billed={stats.month.revenueInRange}
            outstanding={stats.month.outstandingInRange}
          />
        </div>
      </div>

      {/* ─── REVENUE TREND CHART ─── */}
      <div className="cresoa-card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--cresoa-text)' }}>Revenue Trend</h3>
          <div style={{ display: 'flex', gap: '0.3rem' }}>
            {['7D', '30D', '90D'].map(t => (
              <button key={t} onClick={() => setTimeframe(t)} style={{ padding: '0.2rem 0.6rem', borderRadius: '12px', border: '1px solid var(--cresoa-border)', background: timeframe === t ? 'var(--cresoa-accent)' : 'transparent', color: timeframe === t ? '#fff' : 'var(--cresoa-text-muted)', fontWeight: 600, fontSize: '0.75rem', cursor: 'pointer' }}>{t}</button>
            ))}
          </div>
        </div>
        {hasRevenueData ? (
          <div style={{ width: '100%', overflow: 'hidden' }}>
            <svg viewBox={`0 0 ${chartData.length * 10} ${chartHeight}`} preserveAspectRatio="none" style={{ width: '100%', height: '120px' }}>
              <defs>
                <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--cresoa-accent)" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="var(--cresoa-accent)" stopOpacity="0" />
                </linearGradient>
              </defs>
              {chartData.map((d, i) => {
                const h = (d.value / maxVal) * (chartHeight - 10)
                const x = i * 10 + 2
                const y = chartHeight - h
                return <rect key={i} x={x} y={y} width="6" height={h} rx="2" fill="var(--cresoa-accent)" opacity="0.9" />
              })}
            </svg>
          </div>
        ) : (
          <div className="cresoa-empty-state" style={{ padding: '1.5rem' }}>
            <Svg name="file" size={32} stroke="var(--cresoa-text-muted)" />
            <span className="cresoa-empty-state-title">No revenue recorded yet</span>
            <span className="cresoa-empty-state-message">Revenue trends will appear here as you complete and receive payments for jobs.</span>
          </div>
        )}
      </div>

      {/* ─── NEEDS YOUR ATTENTION (Compact) ─── */}
      {stats.overdue === 0 && stats.awaiting === 0 && stats.ready === 0 && stats.lowStock === 0 ? (
        <div style={{ marginBottom: '1.5rem', padding: '0.75rem 1rem', background: 'var(--cresoa-success-soft)', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Svg name="checkCircle" size={20} stroke="var(--cresoa-success)" />
          <div>
            <span style={{ fontWeight: 600, color: 'var(--cresoa-success)' }}>You're all caught up</span>
            <div style={{ fontSize: '0.85rem', color: 'var(--cresoa-text-muted)' }}>No overdue jobs or unpaid balances need attention.</div>
          </div>
        </div>
      ) : (
        <div style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ margin: '0 0 0.75rem', fontSize: '0.95rem', fontWeight: 700, color: 'var(--cresoa-text)' }}>Needs Your Attention</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {stats.overdue > 0 && <AttentionItem type="danger" icon="alert" title={`${stats.overdue} Overdue Jobs`} subtitle="Tap to review and follow up" onClick={() => navigateTo('/dashboard/repairs/jobs')} />}
            {stats.awaiting > 0 && <AttentionItem type="warning" icon="clock" title={`${stats.awaiting} Awaiting Parts`} subtitle="Parts need to be ordered" onClick={() => navigateTo('/dashboard/repairs/jobs')} />}
            {stats.ready > 0 && <AttentionItem type="success" icon="checkCircle" title={`${stats.ready} Ready for Collection`} subtitle="Notify customers to pick up" onClick={() => navigateTo('/dashboard/repairs/jobs')} />}
            {stats.lowStock > 0 && <AttentionItem type="warning" icon="package" title={`${stats.lowStock} Parts Low on Stock`} subtitle="Reorder before they run out" onClick={() => navigateTo('/dashboard/repairs/inventory')} />}
          </div>
        </div>
      )}

      {/* ─── QUICK ACTIONS (Restructured) ─── */}
      <div style={{ marginBottom: '1.5rem' }}>
        <button onClick={() => navigateTo('/dashboard/repairs/jobs/new')} className="cresoa-primary-button" style={{ width: '100%', marginBottom: '0.5rem' }}>
          <Svg name="plus" size={16} stroke="#fff" /> New Job
        </button>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
          <button onClick={() => navigateTo('/dashboard/repairs/customers')} className="cresoa-primary-button" style={{ background: 'var(--gradient-primary)' }}>
            <Svg name="user" size={14} stroke="#fff" /> Add Customer
          </button>
          <button onClick={() => navigateTo('/dashboard/repairs/inventory')} className="cresoa-primary-button" style={{ background: 'var(--gradient-success)' }}>
            <Svg name="package" size={14} stroke="#fff" /> Parts
          </button>
        </div>
      </div>

{/* ─── RECENT JOBS ─── */}
      <div className="cresoa-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--cresoa-text)' }}>Recent Jobs</h3>
          <button onClick={() => navigateTo('/dashboard/repairs/jobs')} style={{ background: 'none', border: 'none', color: 'var(--cresoa-accent)', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}>View All →</button>
        </div>
        {orders.length === 0 ? (
          <div className="cresoa-empty-state">
            <Svg name="tool" size={32} stroke="var(--cresoa-accent)" />
            <p style={{ marginTop: '0.5rem' }}>No jobs yet. Start by creating your first repair job!</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {orders.slice(0, 5).map(job => {
              const customerName = customers.find(c => c.id === job.customer_id)?.name || 'Customer'
              return (
                <div key={job.id} onClick={() => navigateTo(`/dashboard/repairs/jobs/${job.id}`)} className="cresoa-list-row" style={{ padding: '0.75rem', borderRadius: '8px', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ fontWeight: 600, color: 'var(--cresoa-text)' }}>{job.title || 'Repair Job'}</div>
                    <div style={{ fontWeight: 700, color: 'var(--cresoa-accent)' }}>{formatMoney(job.price)}</div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.25rem' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--cresoa-text-muted)' }}>{customerName} • {job.current_status || 'Pending'}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--cresoa-text-muted)' }}>{relativeDate(job.created_at)}</div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── HELPER COMPONENTS ───

function TimelineRow({ label, jobsCreated, completed, billed, collected, outstanding }) {
  return (
    <div style={{ padding: '0.75rem', background: 'var(--cresoa-surface-soft)', borderRadius: '8px' }}>
      <div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.5rem', color: 'var(--cresoa-text)' }}>{label}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))', gap: '0.5rem' }}>
        {jobsCreated !== undefined && <TimelineMetric label="Jobs Created" value={jobsCreated} />}
        {completed !== undefined && <TimelineMetric label="Completed" value={completed} />}
        {billed !== undefined && <TimelineMetric label="Billed" value={formatMoney(billed)} />}
        {collected !== undefined && <TimelineMetric label="Collected" value={formatMoney(collected)} />}
        {outstanding !== undefined && <TimelineMetric label="Outstanding" value={formatMoney(outstanding)} />}
      </div>
    </div>
  )
}

function TimelineMetric({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: '0.7rem', color: 'var(--cresoa-text-muted)' }}>{label}</div>
      <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--cresoa-text)' }}>{value}</div>
    </div>
  )
}

function AttentionItem({ type, icon, title, subtitle, onClick }) {
  const colors = {
    danger: { bg: 'var(--cresoa-danger-soft)', iconBg: 'var(--cresoa-danger)', color: 'var(--cresoa-danger)' },
    warning: { bg: 'var(--cresoa-warning-soft)', iconBg: 'var(--cresoa-warning)', color: 'var(--cresoa-warning)' },
    success: { bg: 'var(--cresoa-success-soft)', iconBg: 'var(--cresoa-success)', color: 'var(--cresoa-success)' },
  }
  const c = colors[type]
  return (
    <button onClick={onClick} style={{ background: c.bg, border: '1px solid var(--cresoa-border)', borderRadius: '12px', padding: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', textAlign: 'left' }}>
      <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: c.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0 }}>
        <Svg name={icon} size={18} stroke="#fff" />
      </div>
      <div style={{ flex: 1 }}>
        <strong style={{ fontSize: '0.9rem', color: c.color }}>{title}</strong>
        <div style={{ fontSize: '0.8rem', color: 'var(--cresoa-text-muted)' }}>{subtitle}</div>
      </div>
      <Svg name="arrowRight" size={16} stroke={c.color} />
    </button>
  )
          }
