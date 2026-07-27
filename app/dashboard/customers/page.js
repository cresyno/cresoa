'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabaseClient'

export default function CustomersPage() {
  const router = useRouter()
  const [customers, setCustomers] = useState([])
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    total: 0,
    withOrders: 0,
    owing: 0,
    highValue: 0, // customers with > ₦50,000 total spent
  })

  const loadCustomers = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    const { data: businessData } = await supabase
      .from('businesses')
      .select('id')
      .eq('owner_id', user.id)
      .single()

    if (!businessData) {
      setLoading(false)
      return
    }

    // Get all customers
    const { data: customerData } = await supabase
      .from('customers')
      .select('*')
      .eq('business_id', businessData.id)
      .order('name', { ascending: true })

    const customersWithOrders = await Promise.all(
      (customerData || []).map(async (c) => {
        const { data: orders } = await supabase
          .from('orders')
          .select('price, amount_paid')
          .eq('customer_id', c.id)

        const totalSpent = orders?.reduce((sum, o) => sum + o.price, 0) || 0
        const totalPaid = orders?.reduce((sum, o) => sum + o.amount_paid, 0) || 0
        const totalOwing = totalSpent - totalPaid
        const orderCount = orders?.length || 0

        return {
          ...c,
          totalSpent,
          totalOwing,
          orderCount,
          phone: c.phone || '',
        }
      })
    )

    setCustomers(customersWithOrders)

    // Calculate stats
    const total = customersWithOrders.length
    const withOrders = customersWithOrders.filter(c => c.orderCount > 0).length
    const owing = customersWithOrders.filter(c => c.totalOwing > 0).length
    const highValue = customersWithOrders.filter(c => c.totalSpent > 50000).length

    setStats({ total, withOrders, owing, highValue })
    setLoading(false)
  }

  useEffect(() => {
    loadCustomers()
  }, [])

  const formatPhone = (phone) => {
    if (!phone) return ''
    return phone.startsWith('0') ? '234' + phone.slice(1) : phone
  }

  // Filter logic
  const filteredCustomers = customers
    .filter((c) =>
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.phone?.includes(search)
    )
    .filter((c) => {
      if (filter === 'all') return true
      if (filter === 'with_orders') return c.orderCount > 0
      if (filter === 'owing') return c.totalOwing > 0
      if (filter === 'high_value') return c.totalSpent > 50000
      if (filter === 'no_orders') return c.orderCount === 0
      return true
    })

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
        <p style={{ color: '#6B6255', fontSize: '0.85rem', marginTop: '1rem' }}>Loading customers...</p>
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
        .customer-card {
          background: #fff;
          border-radius: 12px;
          padding: 0.8rem 1rem;
          border: 1px solid #E8E0D5;
          margin-bottom: 0.7rem;
          transition: border-color 0.15s ease;
          cursor: pointer;
        }
        .customer-card:hover {
          border-color: #C79A2B;
        }
        .customer-card .row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 0.4rem;
        }
        .customer-card .info {
          flex: 1;
          min-width: 140px;
        }
        .customer-card .info .name {
          font-weight: 600;
          color: #1E3A5F;
          font-size: 0.9rem;
          margin: 0;
        }
        .customer-card .info .meta {
          font-size: 0.75rem;
          color: #6B6255;
          margin: 0.1rem 0 0;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-wrap: wrap;
        }
        .customer-card .info .meta .badge {
          background: #F6E9C8;
          color: #1E3A5F;
          padding: 0.05rem 0.5rem;
          border-radius: 10px;
          font-size: 0.6rem;
          font-weight: 600;
        }
        .customer-card .info .meta .badge.owing {
          background: #F1DBD3;
          color: #AE4A34;
        }
        .customer-card .info .meta .badge.high {
          background: #DCEBE2;
          color: #4C7A5E;
        }
        .customer-actions {
          display: flex;
          gap: 0.3rem;
          flex-wrap: wrap;
          align-items: center;
        }
        .customer-actions .btn {
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
        .customer-actions .btn:hover {
          background: #F5EFE2;
        }
        .customer-actions .btn-call {
          background: #F6E9C8;
          border-color: #C79A2B;
          font-weight: 700;
        }
        .customer-actions .btn-whatsapp {
          background: #DCEBE2;
          border-color: #4C7A5E;
          color: #4C7A5E;
          font-weight: 700;
        }
        .customer-actions .btn-whatsapp:hover {
          background: #C8DCCD;
        }
        .customer-actions .btn-order {
          background: #1E3A5F;
          border-color: #1E3A5F;
          color: #fff;
        }
        .customer-actions .btn-order:hover {
          background: #0F1E30;
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
          justify-content: space-between;
          margin-bottom: 0.8rem;
          flex-wrap: wrap;
          gap: 0.5rem;
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
        .customer-count-badge {
          background: #E8E0D5;
          color: #6B6255;
          padding: 0.05rem 0.5rem;
          border-radius: 12px;
          font-size: 0.7rem;
          font-weight: 600;
        }
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
        .add-btn:active {
          transform: scale(0.97);
        }
        @media (max-width: 420px) {
          .customer-card .row {
            flex-direction: column;
            align-items: stretch;
          }
          .customer-actions {
            justify-content: flex-start;
            margin-top: 0.3rem;
          }
          .header-row {
            flex-direction: column;
            align-items: stretch;
          }
        }
      `}</style>

      {/* ===== BACK BUTTON ===== */}
      <button className="back-link" onClick={() => router.push('/dashboard')}>
        ← Back to dashboard
      </button>

      {/* ===== HEADER ===== */}
      <div className="header-row">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
          <h1>Customers</h1>
          <span className="customer-count-badge">{customers.length}</span>
        </div>
        <a href="/dashboard/customers/new" className="add-btn">
          👤 + Add customer
        </a>
      </div>

      {/* ===== STATS ===== */}
      <div className="stats-row">
        <div className="stat-card">
          <p className="value navy">{stats.total}</p>
          <p className="label">Total</p>
        </div>
        <div className="stat-card">
          <p className="value navy">{stats.withOrders}</p>
          <p className="label">With Orders</p>
        </div>
        <div className="stat-card">
          <p className="value red">{stats.owing}</p>
          <p className="label">Owing</p>
        </div>
        <div className="stat-card">
          <p className="value green">{stats.highValue}</p>
          <p className="label">High Value</p>
        </div>
      </div>
      {/* ===== SEARCH ===== */}
      <input
        type="text"
        className="search-bar"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="🔍 Search by name or phone..."
        style={{ marginBottom: '0.8rem' }}
      />

      {/* ===== FILTER CHIPS ===== */}
      <div className="filters-row">
        {['all', 'with_orders', 'owing', 'high_value', 'no_orders'].map((f) => {
          const labels = {
            all: 'All',
            with_orders: 'With Orders',
            owing: 'Owing',
            high_value: 'High Value',
            no_orders: 'No Orders',
          }
          const counts = {
            all: stats.total,
            with_orders: stats.withOrders,
            owing: stats.owing,
            high_value: stats.highValue,
            no_orders: stats.total - stats.withOrders,
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

      {/* ===== CUSTOMERS LIST ===== */}
      {filteredCustomers.length === 0 ? (
        <div className="empty-state">
          <div className="icon">👤</div>
          <p style={{ margin: 0 }}>
            {search || filter !== 'all' ? (
              <>No customers match your search or filter.</>
            ) : (
              <>No customers yet. <a href="/dashboard/customers/new" style={{ color: '#1E3A5F', fontWeight: '600' }}>Add your first customer</a></>
            )}
          </p>
        </div>
      ) : (
        filteredCustomers.map((c) => {
          const phone = c.phone || ''
          const hasOrders = c.orderCount > 0
          const hasOwing = c.totalOwing > 0
          const isHighValue = c.totalSpent > 50000

          return (
            <div
              key={c.id}
              className="customer-card"
              onClick={() => router.push(`/dashboard/customers/${c.id}`)}
            >
              <div className="row">
                <div className="info">
                  <p className="name">{c.name}</p>
                  <div className="meta">
                    {phone && <span>📱 {phone}</span>}
                    {hasOrders && (
                      <>
                        <span>·</span>
                        <span>{c.orderCount} order{c.orderCount !== 1 ? 's' : ''}</span>
                        <span>·</span>
                        <span>₦{c.totalSpent.toLocaleString()} spent</span>
                      </>
                    )}
                    {!hasOrders && (
                      <span className="badge">No orders</span>
                    )}
                    {hasOwing && (
                      <span className="badge owing">₦{c.totalOwing.toLocaleString()} owing</span>
                    )}
                    {isHighValue && (
                      <span className="badge high">⭐ High value</span>
                    )}
                  </div>
                </div>

                <div className="customer-actions">
                  {phone && (
                    <>
                      <a href={`tel:${phone}`} className="btn btn-call" onClick={(e) => e.stopPropagation()}>
                        📞 Call
                      </a>
                      <a
                        href={`https://wa.me/${formatPhone(phone)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-whatsapp"
                        onClick={(e) => e.stopPropagation()}
                      >
                        💬 WhatsApp
                      </a>
                    </>
                  )}
                  <a
                    href={`/dashboard/orders/new?customer=${c.id}`}
                    className="btn btn-order"
                    onClick={(e) => e.stopPropagation()}
                  >
                    📋 Order
                  </a>
                </div>
              </div>
            </div>
          )
        })
      )}
    </main>
  )
        }
