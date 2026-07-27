'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../../../lib/supabaseClient'

export default function CustomerOrdersPage({ params }) {
  const router = useRouter()
  const [customer, setCustomer] = useState(null)
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState(null)

  // Settle Modal
  const [showSettleModal, setShowSettleModal] = useState(false)
  const [settleOrder, setSettleOrder] = useState(null)
  const [settleAmount, setSettleAmount] = useState('')
  const [settleNote, setSettleNote] = useState('')
  const [settleLoading, setSettleLoading] = useState(false)

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    // Load customer
    const { data: customerData } = await supabase
      .from('customers')
      .select('*')
      .eq('id', params.id)
      .single()

    if (!customerData) {
      setLoading(false)
      return
    }

    setCustomer(customerData)

    // Load orders
    const { data: orderData } = await supabase
      .from('orders')
      .select('*')
      .eq('customer_id', params.id)
      .order('created_at', { ascending: false })

    setOrders(orderData || [])

    // Calculate stats
    if (orderData && orderData.length > 0) {
      const totalSpent = orderData.reduce((sum, o) => sum + o.price, 0)
      const totalPaid = orderData.reduce((sum, o) => sum + o.amount_paid, 0)
      const totalOwing = totalSpent - totalPaid

      setStats({
        totalSpent,
        totalPaid,
        totalOwing,
        count: orderData.length,
        avg: Math.round(totalSpent / orderData.length),
      })
    } else {
      setStats({
        totalSpent: 0,
        totalPaid: 0,
        totalOwing: 0,
        count: 0,
        avg: 0,
      })
    }

    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [params.id])

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
    if (order.title && order.title.trim()) return order.title
    if (order.item_name && order.item_name.trim()) return order.item_name
    if (order.name && order.name.trim()) return order.name
    return 'Order'
  }

  const formatPhone = (phone) => {
    if (!phone) return ''
    return phone.startsWith('0') ? '234' + phone.slice(1) : phone
  }

  const formatDate = (d) => {
    if (!d) return ''
    return new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
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
      note: settleNote || 'Payment recorded from customer orders page',
    })

    await supabase
      .from('orders')
      .update({ amount_paid: newTotal })
      .eq('id', settleOrder.id)

    setShowSettleModal(false)
    setSettleLoading(false)
    load()
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
        `}</style>
        <div className="cresoa-spinner"></div>
        <p style={{ color: '#6B6255', fontSize: '0.85rem', marginTop: '1rem' }}>Loading orders...</p>
      </main>
    )
  }

  if (!customer) {
    return (
      <main style={{ minHeight: '100vh', background: '#F5EFE2', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1.5rem' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: '#6B6255', fontSize: '1rem' }}>Customer not found.</p>
          <button
            onClick={() => router.push('/dashboard/customers')}
            style={{ marginTop: '1rem', padding: '0.6rem 1.2rem', borderRadius: '8px', border: '1px solid #1E3A5F', background: '#fff', color: '#1E3A5F', cursor: 'pointer' }}
          >
            ← Back to customers
          </button>
        </div>
      </main>
    )
  }

  const balance = stats?.totalOwing || 0

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
        .stat-card {
          background: #fff;
          border-radius: 10px;
          padding: 0.6rem 0.4rem;
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
        .stat-card .label {
          color: #6B6255;
          font-size: 0.6rem;
          margin: 0.1rem 0 0;
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
          justify-content: space-between;
          align-items: flex-start;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-bottom: 1rem;
        }
        .header-row .name-section h1 {
          color: #1E3A5F;
          font-size: 1.3rem;
          font-weight: 700;
          margin: 0;
        }
        .header-row .name-section .sub {
          color: #6B6255;
          font-size: 0.85rem;
          margin: 0.1rem 0 0;
        }
        .header-actions {
          display: flex;
          gap: 0.4rem;
          flex-wrap: wrap;
        }
        .header-actions .btn {
          padding: 0.3rem 0.7rem;
          border-radius: 6px;
          font-size: 0.7rem;
          font-weight: 600;
          text-decoration: none;
          border: 1px solid #E8E0D5;
          background: #fff;
          color: #1E3A5F;
          cursor: pointer;
          transition: background 0.1s ease;
          display: inline-flex;
          align-items: center;
          gap: 0.2rem;
        }
        .header-actions .btn:hover {
          background: #F5EFE2;
        }
        .header-actions .btn-call {
          background: #F6E9C8;
          border-color: #C79A2B;
          font-weight: 700;
        }
        .header-actions .btn-whatsapp {
          background: #DCEBE2;
          border-color: #4C7A5E;
          color: #4C7A5E;
          font-weight: 700;
        }
        .header-actions .btn-whatsapp:hover {
          background: #C8DCCD;
        }
        .header-actions .btn-order {
          background: #1E3A5F;
          border-color: #1E3A5F;
          color: #fff;
        }
        .header-actions .btn-order:hover {
          background: #0F1E30;
        }
        .stats-row {
          display: flex;
          gap: 0.4rem;
          margin-bottom: 1.2rem;
          flex-wrap: wrap;
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
          .header-row {
            flex-direction: column;
          }
          .header-actions {
            width: 100%;
          }
          .header-actions .btn {
            flex: 1;
            justify-content: center;
          }
        }
      `}</style>

      {/* ===== BACK BUTTON ===== */}
      <button className="back-link" onClick={() => router.push(`/dashboard/customers/${params.id}`)}>
        ← Back to customer
      </button>

      {/* ===== HEADER ===== */}
      <div className="header-row">
        <div className="name-section">
          <h1>{customer.name}'s Orders</h1>
          <p className="sub">
            {customer.phone && `📱 ${customer.phone}`}
            {customer.phone && <span style={{ margin: '0 0.4rem' }}>·</span>}
            {orders.length} order{orders.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="header-actions">
          {customer.phone && (
            <>
              <a href={`tel:${customer.phone}`} className="btn btn-call">📞 Call</a>
              <a
                href={`https://wa.me/${formatPhone(customer.phone)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-whatsapp"
              >
                💬 WhatsApp
              </a>
            </>
          )}
          <a href={`/dashboard/orders/new?customer=${customer.id}`} className="btn btn-order">
            📋 New Order
          </a>
        </div>
      </div>

      {/* ===== STATS ===== */}
      <div className="stats-row">
        <div className="stat-card">
          <p className="value navy">{stats?.count || 0}</p>
          <p className="label">Orders</p>
        </div>
        <div className="stat-card">
          <p className="value navy">₦{stats?.totalSpent.toLocaleString() || 0}</p>
          <p className="label">Total Spent</p>
        </div>
        <div className="stat-card">
          <p className={`value ${balance > 0 ? 'red' : 'green'}`}>
            {balance > 0 ? `₦${balance.toLocaleString()}` : '✓ Paid'}
          </p>
          <p className="label">Balance</p>
        </div>
        <div className="stat-card">
          <p className="value navy">₦{stats?.avg.toLocaleString() || 0}</p>
          <p className="label">Avg Order</p>
        </div>
      </div>
      {/* ===== ORDERS LIST ===== */}
      {orders.length === 0 ? (
        <div className="empty-state">
          <div className="icon">📭</div>
          <p>No orders yet for this customer.</p>
          <a href={`/dashboard/orders/new?customer=${customer.id}`} style={{ color: '#1E3A5F', fontWeight: '600' }}>
            Create their first order
          </a>
        </div>
      ) : (
        orders.map((o) => {
          const status = getStatusInfo(o.current_status)
          const orderName = getOrderName(o)
          const dueDisplay = getDueDisplay(o.due_date)
          const phone = customer.phone
          const balance = o.price - o.amount_paid

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
                    <span>₦{o.price.toLocaleString()}</span>
                    <span>·</span>
                    {dueDisplay}
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span className={`balance ${balance <= 0 ? 'paid' : ''}`}>
                    {balance > 0 ? `₦${balance.toLocaleString()}` : '✓'}
                  </span>
                  <div className="order-actions">
                    <a href={`/dashboard/orders/${o.id}`} className="btn btn-view">👁️ View</a>
                    {phone && (
                      <a href={`tel:${phone}`} className="btn btn-call">📞 Call</a>
                    )}
                    {balance > 0 && (
                      <button className="btn btn-settle" onClick={() => openSettleModal(o)}>
                        💰 Settle
                      </button>
                    )}
                    <a href={`/dashboard/orders/${o.id}/edit`} className="btn btn-edit">✏️ Edit</a>
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
              {customer.name} · Balance: ₦{(settleOrder.price - settleOrder.amount_paid).toLocaleString()}
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
