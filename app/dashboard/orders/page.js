'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabaseClient'
import UpgradeBanner from '../../../components/UpgradeBanner'
import { getPlanLimits } from '../../../lib/planLimits'

export default function OrdersPage() {
  const router = useRouter()
  const [orders, setOrders] = useState([])
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [business, setBusiness] = useState(null)
  const [plan, setPlan] = useState('free')
  const [orderCounts, setOrderCounts] = useState({
    total: 0,
    overdue: 0,
    dueToday: 0,
    ready: 0,
    owing: 0,
  })

  const loadOrders = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    const { data: businessData } = await supabase
      .from('businesses')
      .select('id, plan')
      .eq('owner_id', user.id)
      .single()

    if (!businessData) {
      setLoading(false)
      return
    }

    setBusiness(businessData)
    setPlan(businessData.plan || 'free')

    const { data: orderData } = await supabase
      .from('orders')
      .select('*, customers(name, phone)')
      .eq('business_id', businessData.id)
      .is('group_order_id', null) // individual orders only
      .order('created_at', { ascending: false })

    setOrders(orderData || [])
    calculateStats(orderData || [])
    setLoading(false)
  }

  const calculateStats = (orders) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayStr = today.toISOString().split('T')[0]

    const overdue = orders.filter(o => {
      if (!o.due_date || o.current_status === 'Delivered') return false
      const due = new Date(o.due_date)
      due.setHours(0, 0, 0, 0)
      return due < today
    }).length

    const dueToday = orders.filter(o =>
      o.due_date === todayStr && o.current_status !== 'Delivered'
    ).length

    const ready = orders.filter(o =>
      o.current_status === 'Ready'
    ).length

    const owing = orders.filter(o =>
      (o.price - o.amount_paid) > 0
    ).length

    setOrderCounts({
      total: orders.length,
      overdue,
      dueToday,
      ready,
      owing,
    })
  }

  useEffect(() => {
    loadOrders()
  }, [])

  // ---- Plan limit check ----
  const limits = getPlanLimits(plan)
  const orderCount = orders.length
  const canAddMore = orderCount < limits.orders

  // ---- Filtering logic ----
  const filteredOrders = orders
    .filter((o) =>
      o.title?.toLowerCase().includes(search.toLowerCase()) ||
      (o.customers?.name || '').toLowerCase().includes(search.toLowerCase())
    )
    .filter((o) => {
      if (filter === 'all') return true
      if (filter === 'owing') return (o.price - o.amount_paid) > 0
      if (filter === 'overdue') return isOverdue(o.due_date) && o.current_status !== 'Delivered'
      if (filter === 'due_today') return isDueToday(o.due_date) && o.current_status !== 'Delivered'
      if (filter === 'ready') return o.current_status === 'Ready'
      if (filter === 'delivered') return o.current_status === 'Delivered'
      if (filter === 'cutting') return o.current_status === 'Cutting'
      if (filter === 'sewing') return o.current_status === 'Sewing'
      if (filter === 'placed') return o.current_status === 'Order placed'
      return true
    })

  // Helper functions
  const isOverdue = (dueDate) => {
    if (!dueDate) return false
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const due = new Date(dueDate)
    due.setHours(0, 0, 0, 0)
    return due < today
  }

  const isDueToday = (dueDate) => {
    if (!dueDate) return false
    const today = new Date().toISOString().split('T')[0]
    return dueDate === today
  }

  const getStatusInfo = (status) => {
    const map = {
      'Order placed': { label: 'Placed', color: '#6B6255', bg: '#F0EDE8' },
      'Cutting': { label: 'Cutting', color: '#B4881E', bg: '#F6E9C8' },
      'Sewing': { label: 'Sewing', color: '#1E3A5F', bg: '#D6E0EB' },
      'Ready': { label: 'Ready', color: '#4C7A5E', bg: '#DCEBE2' },
      'Delivered': { label: 'Delivered', color: '#6B6255', bg: '#E8E0D5' },
    }
    return map[status] || { label: status || 'Placed', color: '#6B6255', bg: '#F0EDE8' }
  }

  const getOrderName = (order) => order?.title || 'Order'

  if (loading) {
    return (
      <main style={{ minHeight: '100vh', background: '#F5EFE2', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
          .cresoa-spinner {
            width: 40px; height: 40px;
            border: 4px solid #e4d8c2;
            border-top: 4px solid #1E3A5F;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
          }
        `}</style>
        <div className="cresoa-spinner"></div>
        <p style={{ color: '#6B6255', fontSize: '0.85rem', marginTop: '1rem' }}>Loading orders...</p>
      </main>
    )
  }

  return (
    <main style={{ minHeight: '100vh', background: '#F5EFE2', padding: '1.5rem 1.2rem' }}>
      <style>{`
        .stat-card {
          background: #fff;
          border-radius: 10px;
          padding: 0.6rem 0.4rem;
          border: 1px solid #E8E0D5;
          text-align: center;
          flex: 1;
          min-width: 50px;
        }
        .stat-card .value {
          font-size: 1.1rem;
          font-weight: 700;
          margin: 0;
        }
        .stat-card .value.red { color: #AE4A34; }
        .stat-card .value.green { color: #4C7A5E; }
        .stat-card .value.navy { color: #1E3A5F; }
        .stat-card .label {
          color: #6B6255;
          font-size: 0.6rem;
          margin: 0.1rem 0 0;
        }
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
        .order-card {
          background: #fff;
          border-radius: 12px;
          padding: 0.8rem 1rem;
          border: 1px solid #E8E0D5;
          margin-bottom: 0.7rem;
          transition: border-color 0.15s ease;
        }
        .order-card:hover { border-color: #D6D0C5; }
        .order-card .row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 0.4rem;
        }
        .order-card .info {
          flex: 1;
          min-width: 140px;
        }
        .order-card .info .name {
          font-weight: 600;
          color: #1E3A5F;
          font-size: 0.9rem;
          margin: 0;
          display: flex;
          align-items: center;
          gap: 0.4rem;
          flex-wrap: wrap;
        }
        .order-card .info .meta {
          font-size: 0.75rem;
          color: #6B6255;
          margin: 0.1rem 0 0;
          display: flex;
          align-items: center;
          gap: 0.3rem;
          flex-wrap: wrap;
        }
        .order-card .balance {
          font-weight: 700;
          font-size: 0.85rem;
          color: #AE4A34;
          margin-right: 0.5rem;
          white-space: nowrap;
        }
        .order-card .balance.paid { color: #4C7A5E; }
        .order-actions {
          display: flex;
          gap: 0.3rem;
          flex-wrap: wrap;
          align-items: center;
        }
        .order-actions .btn {
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
        .order-actions .btn:hover { background: #F5EFE2; }
        .order-actions .btn-view {
          background: #F5EFE2;
          border-color: #D6D0C5;
        }
        .order-actions .btn-call {
          background: #F6E9C8;
          border-color: #C79A2B;
          font-weight: 700;
        }
        .order-actions .btn-settle {
          background: #4C7A5E;
          border-color: #4C7A5E;
          color: #fff;
        }
        .order-actions .btn-settle:hover { background: #3A5F4A; }
        .order-actions .btn-edit {
          background: #1E3A5F;
          border-color: #1E3A5F;
          color: #fff;
        }
        .order-actions .btn-edit:hover { background: #0F1E30; }
        .order-actions .btn-advance {
          background: #C79A2B;
          border-color: #C79A2B;
          color: #1E3A5F;
        }
        .order-actions .btn-advance:hover { background: #B4881E; }
        .order-actions .btn-advance:disabled { opacity: 0.5; cursor: not-allowed; }
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
        .stats-row {
          display: flex;
          gap: 0.4rem;
          margin-bottom: 1rem;
          flex-wrap: wrap;
        }
        .filters-row {
          display: flex;
          gap: 0.4rem;
          margin-bottom: 1rem;
          flex-wrap: wrap;
          overflow-x: auto;
          padding-bottom: 0.2rem;
          -webkit-overflow-scrolling: touch;
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
          gap: 0.8rem;
          margin-bottom: 0.8rem;
          flex-wrap: wrap;
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
        .order-count-badge {
          background: #E8E0D5;
          color: #6B6255;
          padding: 0.05rem 0.5rem;
          border-radius: 12px;
          font-size: 0.7rem;
          font-weight: 600;
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
        .add-btn {
          background: linear-gradient(135deg, #C79A2B, #B4881E);
          color: #1E3A5F;
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
        .add-btn:disabled {
          background: #E8E0D5;
          color: #6B6255;
          cursor: default;
        }
        .order-status-badge {
          display: inline-block;
          padding: 0.15rem 0.6rem;
          border-radius: 20px;
          font-size: 0.65rem;
          font-weight: 600;
          letter-spacing: 0.3px;
          text-transform: uppercase;
        }
        @media (max-width: 420px) {
          .order-card .row { flex-direction: column; align-items: stretch; }
          .order-actions { justify-content: flex-start; margin-top: 0.3rem; }
          .order-card .balance { margin-right: 0; }
          .header-row { flex-direction: column; align-items: stretch; }
          .stats-row { flex-wrap: wrap; }
          .stat-card { flex: 1 0 45%; }
        }
      `}</style>

      <button className="back-link" onClick={() => router.push('/dashboard')}>
        ← Back to dashboard
      </button>

      <div className="header-row">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
          <h1>All Orders</h1>
          <span className="order-count-badge">{orders.length}</span>
        </div>
        <a
          href={canAddMore ? "/dashboard/orders/new" : "#"}
          className={`add-btn ${!canAddMore ? 'add-btn-disabled' : ''}`}
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
          {canAddMore ? '📋 + New Order' : '🔒 New Order (Upgrade)'}
        </a>
      </div>

      {/* ===== UPGRADE BANNER ===== */}
      {!canAddMore && (
        <UpgradeBanner
          resource="orders"
          currentCount={orderCount}
          limit={limits.orders}
          plan={plan}
        />
      )}

      <div className="stats-row">
        <div className="stat-card">
          <p className="value navy">{orderCounts.total}</p>
          <p className="label">Total</p>
        </div>
        <div className="stat-card">
          <p className="value red">{orderCounts.overdue}</p>
          <p className="label">Overdue</p>
        </div>
        <div className="stat-card">
          <p className="value navy">{orderCounts.dueToday}</p>
          <p className="label">Due Today</p>
        </div>
        <div className="stat-card">
          <p className="value green">{orderCounts.ready}</p>
          <p className="label">Ready</p>
        </div>
        <div className="stat-card">
          <p className="value red">{orderCounts.owing}</p>
          <p className="label">Owing</p>
        </div>
      </div>

      <input
        type="text"
        className="search-bar"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="🔍 Search by item or customer..."
        style={{ marginBottom: '0.8rem' }}
      />

      <div className="filters-row">
        {['all', 'owing', 'overdue', 'due_today', 'ready', 'delivered', 'cutting', 'sewing', 'placed'].map((f) => {
          const labels = {
            all: 'All',
            owing: 'Owing',
            overdue: 'Overdue',
            due_today: 'Due Today',
            ready: 'Ready',
            delivered: 'Delivered',
            cutting: 'Cutting',
            sewing: 'Sewing',
            placed: 'Placed',
          }
          const counts = {
            all: orderCounts.total,
            owing: orderCounts.owing,
            overdue: orderCounts.overdue,
            due_today: orderCounts.dueToday,
            ready: orderCounts.ready,
            delivered: orders.filter(o => o.current_status === 'Delivered').length,
            cutting: orders.filter(o => o.current_status === 'Cutting').length,
            sewing: orders.filter(o => o.current_status === 'Sewing').length,
            placed: orders.filter(o => o.current_status === 'Order placed').length,
          }
          return (
            <button
              key={f}
              className={`filter-chip ${filter === f ? 'active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {labels[f]}
              <span className="count">({counts[f]})</span>
            </button>
          )
        })}
      </div>

      {filteredOrders.length === 0 ? (
        <div className="empty-state">
          <div className="icon">📭</div>
          <p>
            {search || filter !== 'all' ? (
              <>No orders match your search or filter.</>
            ) : (
              <>No orders yet. <a href="/dashboard/orders/new" style={{ color: '#1E3A5F', fontWeight: '600' }}>Create your first order</a></>
            )}
          </p>
        </div>
      ) : (
        filteredOrders.map((o) => {
          const status = getStatusInfo(o.current_status)
          const orderName = getOrderName(o)
          const phone = o.customers?.phone
          const balance = o.price - o.amount_paid
          const stages = ['Order placed', 'Cutting', 'Sewing', 'Ready', 'Delivered']
          const currentIndex = stages.indexOf(o.current_status)
          const isLastStage = currentIndex === stages.length - 1

          return (
            <div key={o.id} className="order-card">
              <div className="row">
                <div className="info">
                  <p className="name">
                    {orderName}
                    <span
                      className="order-status-badge"
                      style={{ background: status.bg, color: status.color }}
                    >
                      {status.label}
                    </span>
                  </p>
                  <p className="meta">
                    <span>{o.customers?.name || 'No customer'}</span>
                    <span>·</span>
                    {o.due_date ? `Due ${new Date(o.due_date).toLocaleDateString('en-GB')}` : 'No deadline'}
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span className={`balance ${balance <= 0 ? 'paid' : ''}`}>
                    {balance > 0 ? `₦${balance.toLocaleString()}` : '✓'}
                  </span>
                  <div className="order-actions">
                    <a href={`/dashboard/orders/${o.id}`} className="btn btn-view">👁️</a>
                    {phone && <a href={`tel:${phone}`} className="btn btn-call">📞</a>}
                    {balance > 0 && <button className="btn btn-settle" onClick={() => alert('Settle payment')}>💰</button>}
                    <a href={`/dashboard/orders/${o.id}?edit=true`} className="btn btn-edit">✏️</a>
                    {!isLastStage && (
                      <button
                        className="btn btn-advance"
                        onClick={() => {
                          // Advance status
                          const nextIndex = currentIndex + 1
                          if (nextIndex < stages.length) {
                            supabase
                              .from('orders')
                              .update({ current_status: stages[nextIndex] })
                              .eq('id', o.id)
                              .then(() => loadOrders())
                          }
                        }}
                       >
                        → {stages[currentIndex + 1]}
                      </button>
                    )}
                    {isLastStage && <button className="btn" disabled style={{ opacity: 0.4 }}>✓ Done</button>}
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
