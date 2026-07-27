'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../../lib/supabaseClient'

export default function AllOrdersPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [orders, setOrders] = useState([])
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [business, setBusiness] = useState(null)

  // Settle Modal
  const [showSettleModal, setShowSettleModal] = useState(false)
  const [settleOrder, setSettleOrder] = useState(null)
  const [settleAmount, setSettleAmount] = useState('')
  const [settleNote, setSettleNote] = useState('')
  const [settleLoading, setSettleLoading] = useState(false)

  // Stats
  const [orderCounts, setOrderCounts] = useState({
    total: 0,
    overdue: 0,
    dueToday: 0,
    ready: 0,
    owing: 0,
  })

  const load = async () => {
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

    setBusiness(businessData)

    if (!businessData) return

    const { data: orderData } = await supabase
      .from('orders')
      .select('*, customers(name, phone)')
      .eq('business_id', businessData.id)
      .is('group_order_id', null)
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
    const urlSearch = searchParams?.get('search')
    if (urlSearch) setSearch(urlSearch)

    const urlFilter = searchParams?.get('filter')
    if (urlFilter) setFilter(urlFilter)

    load()
  }, [searchParams])

  // Get Status Info
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

  const getOrderName = (order) => {
    if (order.item_name && order.item_name.trim()) return order.item_name
    if (order.name && order.name.trim()) return order.name
    if (order.title && order.title.trim()) return order.title
    if (order.customers?.name) return `${order.customers.name}'s order`
    return 'Order'
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
    return <span style={{ color: '#6B6255' }}>Due {new Date(dueDate).toLocaleDateString('en-GB')}</span>
  }

  const isDueToday = (dueDate) => {
    if (!dueDate) return false
    const today = new Date().toISOString().split('T')[0]
    return dueDate === today
  }

  // Filter logic
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

  // Advance status
  const advanceStatus = async (order) => {
    const stages = ['Order placed', 'Cutting', 'Sewing', 'Ready', 'Delivered']
    const currentIndex = stages.indexOf(order.current_status)
    if (currentIndex === -1 || currentIndex === stages.length - 1) return

    await supabase
      .from('orders')
      .update({ current_status: stages[currentIndex + 1] })
      .eq('id', order.id)

    load()
  }

  // Settle handlers
  const openSettleModal = (order) => {
    setSettleOrder(order)
    setSettleAmount('')
    setSettleNote('')
    setShowSettleModal(true)
  }

  const handleSettleSubmit = async (e) => {
    e.preventDefault()
    setSettleLoading(true)

    const amount = Number(settleAmount)
    if (!amount || amount <= 0) {
      setSettleLoading(false)
      return
    }

    const newTotal = settleOrder.amount_paid + amount
    if (newTotal > settleOrder.price) {
      setSettleLoading(false)
      return
    }

    await supabase.from('payment_records').insert({
      order_id: settleOrder.id,
      amount: amount,
      note: settleNote || 'Payment recorded from orders page',
    })

    await supabase
      .from('orders')
      .update({ amount_paid: newTotal })
      .eq('id', settleOrder.id)

    setShowSettleModal(false)
    setSettleLoading(false)
    load()
  }

  const formatPhone = (phone) => {
    if (!phone) return ''
    return phone.startsWith('0') ? '234' + phone.slice(1) : phone
  }

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
          @keyframes shimmer {
            0% { background-position: -200px 0; }
            100% { background-position: calc(200px + 100%) 0; }
          }
          .skeleton {
            background: #E8E0D5;
            border-radius: 8px;
            background-image: linear-gradient(90deg, #E8E0D5 0px, #F5EFE2 40px, #E8E0D5 80px);
            background-size: 200px 100%;
            animation: shimmer 1.2s ease-in-out infinite;
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
        @keyframes pulseGlow {
          0%, 100% { opacity: 1; text-shadow: 0 0 4px rgba(174, 74, 52, 0.2); }
          50% { opacity: 0.8; text-shadow: 0 0 12px rgba(174, 74, 52, 0.5); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
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
        .stat-card .badge-count {
          font-size: 0.55rem;
          background: #F1DBD3;
          color: #AE4A34;
          padding: 0.05rem 0.4rem;
          border-radius: 8px;
          margin-left: 0.2rem;
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
        .filter-chip:hover {
          border-color: #C79A2B;
        }
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
        .filter-chip.active .count {
          opacity: 0.8;
        }
        .order-card {
          background: #fff;
          border-radius: 12px;
          padding: 0.8rem 1rem;
          border: 1px solid #E8E0D5;
          margin-bottom: 0.7rem;
          transition: border-color 0.15s ease;
        }
        .order-card:hover {
          border-color: #D6D0C5;
        }
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
        .order-card .balance.paid {
          color: #4C7A5E;
        }
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
        .order-actions .btn:hover {
          background: #F5EFE2;
        }
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
        .order-actions .btn-settle:hover {
          background: #3A5F4A;
        }
        .order-actions .btn-edit {
          background: #1E3A5F;
          border-color: #1E3A5F;
          color: #fff;
        }
        .order-actions .btn-edit:hover {
          background: #0F1E30;
        }
        .order-actions .btn-advance {
          background: #C79A2B;
          border-color: #C79A2B;
          color: #1E3A5F;
        }
        .order-actions .btn-advance:hover {
          background: #B4881E;
        }
        .order-actions .btn-advance:disabled {
          opacity: 0.5;
          cursor: not-allowed;
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
        .search-bar:focus {
          outline: none;
          border-color: #C79A2B;
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
        .empty-state .icon {
          font-size: 2.5rem;
          margin-bottom: 0.5rem;
        }
        .settle-modal {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.5);
          backdrop-filter: blur(4px);
          z-index: 1100;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1.5rem;
          animation: slideUp 0.3s ease-out;
        }
        .settle-modal-content {
          background: #F5EFE2;
          border-radius: 20px;
          padding: 1.8rem;
          max-width: 380px;
          width: 100%;
        }
        .quick-input {
          width: 100%;
          padding: 0.7rem;
          border-radius: 8px;
          border: 1px solid #E8E0D5;
          font-size: 0.95rem;
          background: #fff;
          box-sizing: border-box;
          color: #2B2620;
        }
        .quick-input:focus {
          outline: none;
          border-color: #C79A2B;
        }
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
        .back-link:hover {
          text-decoration: underline;
        }
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
        @media (max-width: 420px) {
          .order-card .row {
            flex-direction: column;
            align-items: stretch;
          }
          .order-actions {
            justify-content: flex-start;
            margin-top: 0.3rem;
          }
          .order-card .balance {
            margin-right: 0;
          }
        }
      `}</style>

      {/* ===== BACK BUTTON ===== */}
      <button className="back-link" onClick={() => router.push('/dashboard')}>
        ← Back to dashboard
      </button>

      {/* ===== HEADER ===== */}
      <div className="header-row">
        <h1>All Orders</h1>
        <span className="order-count-badge">{orders.length}</span>
      </div>

      {/* ===== STATS ===== */}
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

      {/* ===== SEARCH ===== */}
      <input
        type="text"
        className="search-bar"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="🔍 Search by item or customer..."
        style={{ marginBottom: '0.8rem' }}
      />

      {/* ===== FILTER CHIPS ===== */}
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
      {/* ===== ORDERS LIST ===== */}
      {filteredOrders.length === 0 ? (
        <div className="empty-state">
          <div className="icon">📭</div>
          <p style={{ margin: 0 }}>
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
          const dueDisplay = getDueDisplay(o.due_date)
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
                    {dueDisplay}
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span className={`balance ${balance <= 0 ? 'paid' : ''}`}>
                    {balance > 0 ? `₦${balance.toLocaleString()}` : '✓'}
                  </span>
                  <div className="order-actions">
                    <a href={`/dashboard/orders/${o.id}`} className="btn btn-view">👁️</a>
                    {phone && (
                      <a href={`tel:${phone}`} className="btn btn-call">📞</a>
                    )}
                    {balance > 0 && (
                      <button className="btn btn-settle" onClick={() => openSettleModal(o)}>
                        💰
                      </button>
                    )}
                    <a href={`/dashboard/orders/${o.id}/edit`} className="btn btn-edit">✏️</a>
                    {!isLastStage && (
                      <button
                        className="btn btn-advance"
                        onClick={() => advanceStatus(o)}
                      >
                        → {stages[currentIndex + 1]}
                      </button>
                    )}
                    {isLastStage && (
                      <button className="btn" disabled style={{ opacity: 0.4 }}>
                        ✓ Done
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })
      )}

      {/* ===== SETTLE MODAL ===== */}
      {showSettleModal && settleOrder && (
        <div className="settle-modal" onClick={() => setShowSettleModal(false)}>
          <div className="settle-modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
              <h2 style={{ color: '#1E3A5F', fontSize: '1.1rem', margin: 0 }}>💰 Record Payment</h2>
              <button
                onClick={() => setShowSettleModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.3rem', color: '#6B6255', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>
            <p style={{ color: '#6B6255', fontSize: '0.85rem', margin: '0 0 1.2rem' }}>
              {settleOrder.customers?.name || 'Customer'} · Balance: ₦{(settleOrder.price - settleOrder.amount_paid).toLocaleString()}
            </p>

            <form onSubmit={handleSettleSubmit}>
              <div style={{ marginBottom: '0.8rem' }}>
                <label style={{ display: 'block', color: '#2B2620', marginBottom: '0.3rem', fontSize: '0.85rem' }}>Amount paid (₦)</label>
                <input
                  className="quick-input"
                  type="number"
                  value={settleAmount}
                  onChange={(e) => setSettleAmount(e.target.value)}
                  placeholder="Enter amount"
                  required
                  autoFocus
                />
              </div>

              <div style={{ marginBottom: '1.2rem' }}>
                <label style={{ display: 'block', color: '#2B2620', marginBottom: '0.3rem', fontSize: '0.85rem' }}>Note (optional)</label>
                <input
                  className="quick-input"
                  type="text"
                  value={settleNote}
                  onChange={(e) => setSettleNote(e.target.value)}
                  placeholder="e.g. Cash payment"
                />
              </div>

              <button
                type="submit"
                disabled={settleLoading}
                style={{
                  width: '100%', padding: '0.8rem', borderRadius: '8px',
                  border: 'none', background: '#4C7A5E',
                  color: '#fff', fontSize: '1rem', fontWeight: '700',
                  transition: 'transform 0.1s ease',
                }}
              >
                {settleLoading ? 'Recording...' : '💰 Record payment'}
              </button>
            </form>
          </div>
        </div>
      )}
    </main>
  )
                    }
