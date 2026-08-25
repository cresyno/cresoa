'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../../lib/supabaseClient'
import { Navigation } from '../../../components/Navigation'

// ─── SELF-CONTAINED ICONS (INCLUDING NAIRA ICON) ───
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

// ─── NAIRA MONEY FORMATTER (Only Naira) ───
const formatMoney = (val) => `₦${Number(val || 0).toLocaleString('en-NG')}`

// ─── GOLD BUTTON STYLE ───
const goldBtn = {
  background: '#D4A52A',
  color: '#fff',
  border: 'none',
  padding: '0.6rem 1.2rem',
  borderRadius: '8px',
  fontWeight: 700,
  cursor: 'pointer',
  fontSize: '0.9rem',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '0.4rem',
  boxShadow: '0 2px 8px rgba(212,165,42,0.3)',
}

export default function RepairsDashboardPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const businessId = searchParams.get('business_id')

  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState([])
  const [payments, setPayments] = useState([])
  const [inventory, setInventory] = useState([])
  const [timeframe, setTimeframe] = useState('30D')

  // Fetch all data
  useEffect(() => {
    const fetchData = async () => {
      if (!businessId) return
      setLoading(true)
      try {
        const { data: ordersData } = await supabase
          .from('orders')
          .select('*')
          .eq('business_id', businessId)
          .eq('sector', 'repairs')
          .order('created_at', { ascending: false })

        const { data: paymentsData } = await supabase
          .from('payment_records')
          .select('order_id, amount')
          .eq('business_id', businessId)

        const { data: inventoryData } = await supabase
          .from('inventory_items')
          .select('*')
          .eq('business_id', businessId)
          .eq('sector', 'repairs')

        setOrders(ordersData || [])
        setPayments(paymentsData || [])
        setInventory(inventoryData || [])
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

    return { active, overdue, ready, awaiting, revenue, outstanding, lowStock }
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

  // Find max value for chart scaling
  const maxVal = Math.max(...chartData.map(d => d.value), 1)
  const chartHeight = 120

  const navigateTo = (path) => {
    router.push(`${path}?business_id=${businessId}`)
  }

  if (loading) {
    return <div style={{ padding: '1.5rem', background: '#F8F6F2', minHeight: '100vh' }}><Navigation businessId={businessId} /><p style={{ color: '#8A8A8A' }}>Loading your repair business...</p></div>
  }

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto', background: '#F8F6F2', minHeight: '100vh' }}>
      <Navigation businessId={businessId} />

      {/* ─── HEADER ─── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <p style={{ color: '#8A8A8A', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', margin: 0 }}>Repairs</p>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0.2rem 0', color: '#1A1A1A' }}>Good morning, Engineer 👋</h1>
          <p style={{ color: '#8A8A8A', fontSize: '0.85rem', margin: 0 }}>{new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>
        <button onClick={() => navigateTo('/dashboard/repairs/jobs/new')} style={goldBtn}>
          <Svg name="plus" size={16} stroke="#fff" /> New Job
        </button>
      </div>

      {/* ─── TESSA CONTEXTUAL INTELLIGENCE CARD (The "Employee") ─── */}
      <div style={{ background: 'linear-gradient(135deg, #0F2B4A 0%, #1A3F66 100%)', borderRadius: '16px', padding: '1rem', marginBottom: '1.5rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Svg name="sparkles" size={24} stroke="#D4A52A" />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, marginBottom: '0.2rem' }}>Tessa's Business Check</div>
          {stats.overdue > 0 || stats.outstanding > 0 ? (
            <div style={{ fontSize: '0.85rem', color: '#C8D4E3' }}>
              Tessa flagged <strong style={{ color: '#FFD966' }}>{stats.overdue} overdue job{stats.overdue !== 1 ? 's' : ''}</strong> and <strong style={{ color: '#FFD966' }}>{formatMoney(stats.outstanding)}</strong> in outstanding payments.
            </div>
          ) : (
            <div style={{ fontSize: '0.85rem', color: '#C8D4E3' }}>
              Your workload is healthy! No overdue jobs or outstanding payments right now.
            </div>
          )}
        </div>
      </div>

      {/* ─── BUSINESS HEALTH (Dense & Actionable) ─── */}
      <div style={{ background: '#fff', borderRadius: '16px', padding: '1rem', border: '1px solid #E5E0D8', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#1A1A1A' }}>Business Health</h3>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, padding: '0.2rem 0.6rem', borderRadius: '12px', background: stats.overdue > 0 ? '#FCEAEA' : '#EAF5EF', color: stats.overdue > 0 ? '#D9534F' : '#2E7D5E' }}>
            {stats.overdue > 0 ? 'Needs Attention' : 'Good'}
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
          <div style={{ padding: '0.75rem', background: '#FBF3E0', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Svg name="tool" size={16} stroke="#D4A52A" />
            <div><div style={{ fontSize: '0.7rem', color: '#8A8A8A' }}>Active Jobs</div><div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#1A1A1A' }}>{stats.active}</div></div>
          </div>
          <div style={{ padding: '0.75rem', background: '#FCEAEA', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Svg name="alert" size={16} stroke="#D9534F" />
            <div><div style={{ fontSize: '0.7rem', color: '#8A8A8A' }}>Overdue</div><div style={{ fontWeight: 700, fontSize: '1.1rem', color: stats.overdue > 0 ? '#D9534F' : '#1A1A1A' }}>{stats.overdue}</div></div>
          </div>
          <div style={{ padding: '0.75rem', background: '#FBF3E0', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Svg name="naira" size={16} stroke="#D4A52A" />
            <div><div style={{ fontSize: '0.7rem', color: '#8A8A8A' }}>Revenue</div><div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#D4A52A' }}>{formatMoney(stats.revenue)}</div></div>
          </div>
          <div style={{ padding: '0.75rem', background: '#FCEAEA', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Svg name="clock" size={16} stroke="#D9534F" />
            <div><div style={{ fontSize: '0.7rem', color: '#8A8A8A' }}>Owed</div><div style={{ fontWeight: 700, fontSize: '1.1rem', color: stats.outstanding > 0 ? '#D9534F' : '#1A1A1A' }}>{formatMoney(stats.outstanding)}</div></div>
          </div>
        </div>
      </div>

      {/* ─── REVENUE TREND CHART (Pure SVG) ─── */}
      <div style={{ background: '#fff', borderRadius: '16px', padding: '1rem', border: '1px solid #E5E0D8', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#1A1A1A' }}>Revenue Trend</h3>
          <div style={{ display: 'flex', gap: '0.3rem' }}>
            {['7D', '30D', '90D'].map(t => (
              <button key={t} onClick={() => setTimeframe(t)} style={{ padding: '0.2rem 0.6rem', borderRadius: '12px', border: '1px solid #E5E0D8', background: timeframe === t ? '#D4A52A' : 'transparent', color: timeframe === t ? '#fff' : '#8A8A8A', fontWeight: 600, fontSize: '0.75rem', cursor: 'pointer' }}>{t}</button>
            ))}
          </div>
        </div>
        <div style={{ width: '100%', overflow: 'hidden' }}>
          <svg viewBox={`0 0 ${chartData.length * 10} ${chartHeight}`} preserveAspectRatio="none" style={{ width: '100%', height: '120px' }}>
            <defs>
              <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#D4A52A" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#D4A52A" stopOpacity="0" />
              </linearGradient>
            </defs>
            {chartData.map((d, i) => {
              const h = (d.value / maxVal) * (chartHeight - 10)
              const x = i * 10 + 2
              const y = chartHeight - h
              return <rect key={i} x={x} y={y} width="6" height={h} rx="2" fill="#D4A52A" opacity="0.9" />
            })}
            {chartData.map((d, i) => {
              const h = (d.value / maxVal) * (chartHeight - 10)
              const x = i * 10 + 2
              const y = chartHeight - h
              return <circle key={i} cx={x + 3} cy={y} r="2" fill="#0F2B4A" />
            })}
          </svg>
        </div>
        <p style={{ color: '#8A8A8A', fontSize: '0.75rem', textAlign: 'center', margin: '0.5rem 0 0' }}>{timeframe} revenue trend</p>
      </div>

      {/* ─── NEEDS YOUR ATTENTION (Actionable) ─── */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ margin: '0 0 0.75rem', fontSize: '0.95rem', fontWeight: 700, color: '#1A1A1A' }}>Needs Your Attention</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {stats.overdue > 0 && (
            <button onClick={() => navigateTo('/dashboard/repairs/jobs')} style={{ background: '#FCEAEA', border: '1px solid #F5C6C6', borderRadius: '12px', padding: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', textAlign: 'left' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#D9534F', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}><Svg name="alert" size={18} stroke="#fff" /></div>
              <div style={{ flex: 1 }}><strong style={{ fontSize: '0.9rem', color: '#D9534F' }}>{stats.overdue} Overdue Jobs</strong><div style={{ fontSize: '0.8rem', color: '#8A8A8A' }}>Tap to review and follow up</div></div>
              <Svg name="arrowRight" size={16} stroke="#D9534F" />
            </button>
          )}
          {stats.awaiting > 0 && (
            <button onClick={() => navigateTo('/dashboard/repairs/jobs')} style={{ background: '#FBF3E0', border: '1px solid #E5D5A8', borderRadius: '12px', padding: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', textAlign: 'left' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#D4A52A', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}><Svg name="clock" size={18} stroke="#fff" /></div>
              <div style={{ flex: 1 }}><strong style={{ fontSize: '0.9rem', color: '#B4881E' }}>{stats.awaiting} Awaiting Parts</strong><div style={{ fontSize: '0.8rem', color: '#8A8A8A' }}>Parts need to be ordered</div></div>
              <Svg name="arrowRight" size={16} stroke="#B4881E" />
            </button>
          )}
          {stats.ready > 0 && (
            <button onClick={() => navigateTo('/dashboard/repairs/jobs')} style={{ background: '#EAF5EF', border: '1px solid #C8E6D4', borderRadius: '12px', padding: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', textAlign: 'left' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#2E7D5E', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}><Svg name="checkCircle" size={18} stroke="#fff" /></div>
              <div style={{ flex: 1 }}><strong style={{ fontSize: '0.9rem', color: '#2E7D5E' }}>{stats.ready} Ready for Collection</strong><div style={{ fontSize: '0.8rem', color: '#8A8A8A' }}>Notify customers to pick up</div></div>
              <Svg name="arrowRight" size={16} stroke="#2E7D5E" />
            </button>
          )}
          {stats.lowStock > 0 && (
            <button onClick={() => navigateTo('/dashboard/repairs/inventory')} style={{ background: '#FBF3E0', border: '1px solid #E5D5A8', borderRadius: '12px', padding: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', textAlign: 'left' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#D4A52A', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}><Svg name="package" size={18} stroke="#fff" /></div>
              <div style={{ flex: 1 }}><strong style={{ fontSize: '0.9rem', color: '#B4881E' }}>{stats.lowStock} Parts Low on Stock</strong><div style={{ fontSize: '0.8rem', color: '#8A8A8A' }}>Reorder before they run out</div></div>
              <Svg name="arrowRight" size={16} stroke="#B4881E" />
            </button>
          )}
          {stats.overdue === 0 && stats.awaiting === 0 && stats.ready === 0 && stats.lowStock === 0 && (
            <div style={{ background: '#F8F6F2', borderRadius: '12px', padding: '1rem', textAlign: 'center', color: '#8A8A8A' }}>Everything looks good! No pending actions.</div>
          )}
        </div>
      </div>

      {/* ─── QUICK ACTIONS ─── */}
      <div style={{ background: '#fff', borderRadius: '16px', padding: '1rem', border: '1px solid #E5E0D8', marginBottom: '1.5rem' }}>
        <h3 style={{ margin: '0 0 0.75rem', fontSize: '0.95rem', fontWeight: 700, color: '#1A1A1A' }}>Quick Actions</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
          <button onClick={() => navigateTo('/dashboard/repairs/jobs/new')} style={goldBtn}><Svg name="plus" size={14} stroke="#fff" /> New Job</button>
          <button onClick={() => navigateTo('/dashboard/repairs/customers')} style={{ ...goldBtn, background: '#0F2B4A' }}><Svg name="user" size={14} stroke="#fff" /> Add Customer</button>
          <button onClick={() => navigateTo('/dashboard/repairs/inventory')} style={{ ...goldBtn, background: '#2E7D5E' }}><Svg name="package" size={14} stroke="#fff" /> Parts</button>
          <button onClick={() => navigateTo('/dashboard/repairs/jobs')} style={{ ...goldBtn, background: '#8A8A8A' }}><Svg name="file" size={14} stroke="#fff" /> All Jobs</button>
        </div>
      </div>

      {/* ─── RECENT JOBS ─── */}
      <div style={{ background: '#fff', borderRadius: '16px', padding: '1rem', border: '1px solid #E5E0D8' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#1A1A1A' }}>Recent Jobs</h3>
          <button onClick={() => navigateTo('/dashboard/repairs/jobs')} style={{ background: 'none', border: 'none', color: '#D4A52A', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}>View All →</button>
        </div>
        {orders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#8A8A8A' }}>
            <Svg name="tool" size={32} stroke="#D4A52A" />
            <p style={{ marginTop: '0.5rem' }}>No jobs yet. Start by creating your first repair job!</p>
          </div>
              ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {orders.slice(0, 5).map(job => (
              <div key={job.id} onClick={() => navigateTo(`/dashboard/repairs/jobs/${job.id}`)} style={{ padding: '0.75rem', background: '#F8F6F2', borderRadius: '8px', cursor: 'pointer' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ fontWeight: 600, color: '#1A1A1A' }}>{job.title || 'Repair Job'}</div>
                  <div style={{ fontWeight: 700, color: '#D4A52A' }}>{formatMoney(job.price)}</div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.25rem' }}>
                  <div style={{ fontSize: '0.8rem', color: '#8A8A8A' }}>{job.current_status || 'Pending'}</div>
                  {job.due_date && <div style={{ fontSize: '0.75rem', color: '#D9534F' }}>Due {new Date(job.due_date).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ marginTop: '2rem' }}>
        <Navigation businessId={businessId} />
      </div>
    </div>
  )
}
