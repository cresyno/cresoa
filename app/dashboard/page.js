'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'
import LetterLogo from '../../components/LetterLogo'
import OrderCard from '../../components/OrderCard'

export default function DashboardPage() {
  const router = useRouter()
  const [business, setBusiness] = useState(null)
  const [customers, setCustomers] = useState([])
  const [soloOrders, setSoloOrders] = useState([])
  const [groups, setGroups] = useState([])
  const [expandedGroups, setExpandedGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [deactivated, setDeactivated] = useState(false)

  const loadDashboard = async () => {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      router.push('/login')
      return
    }

    let { data: businessData } = await supabase
      .from('businesses')
      .select('*')
      .eq('owner_id', user.id)
      .single()

    if (!businessData) {
      const businessName = user.user_metadata?.business_name || 'My Business'
      const { data: newBusiness } = await supabase
        .from('businesses')
        .insert({
          owner_id: user.id,
          name: businessName,
          business_type: 'fashion',
        })
        .select()
        .single()

      businessData = newBusiness
    }

    if (businessData && businessData.is_active === false) {
      setDeactivated(true)
      setLoading(false)
      return
    }

    if (businessData && !businessData.onboarding_completed) {
      router.push('/onboarding')
      return
    }
    setBusiness(businessData)

    if (businessData) {
      const { data: customerData } = await supabase
        .from('customers')
        .select('*')
        .eq('business_id', businessData.id)
        .order('created_at', { ascending: false })

      setCustomers(customerData || [])

      const { data: allOrders } = await supabase
        .from('orders')
        .select('*, customers(name, phone)')
        .eq('business_id', businessData.id)
        .order('created_at', { ascending: false })

      const { data: groupData } = await supabase
        .from('group_orders')
        .select('*, customers:coordinator_customer_id(name)')
        .eq('business_id', businessData.id)
        .order('created_at', { ascending: false })

      const withoutGroup = (allOrders || []).filter(o => !o.group_order_id)
      setSoloOrders(withoutGroup)

      const groupsWithOrders = (groupData || []).map(g => ({
        ...g,
        orders: (allOrders || []).filter(o => o.group_order_id === g.id)
      }))
      setGroups(groupsWithOrders)
    }

    setLoading(false)
  }

  useEffect(() => {
    loadDashboard()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const toggleGroup = (groupId) => {
    setExpandedGroups((prev) =>
      prev.includes(groupId) ? prev.filter((id) => id !== groupId) : [...prev, groupId]
    )
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
        <p style={{ color: '#6B6255', fontSize: '0.85rem', marginTop: '1rem' }}>Loading your dashboard...</p>
      </main>
    )
  }

  if (deactivated) {
    return (
      <main style={{ minHeight: '100vh', background: '#F5EFE2', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1.5rem', textAlign: 'center' }}>
        <div>
          <h1 style={{ color: '#1E3A5F', fontSize: '1.3rem', marginBottom: '0.6rem' }}>Account deactivated</h1>
          <p style={{ color: '#6B6255', fontSize: '0.9rem' }}>
            Please contact support to reactivate your account.
          </p>
        </div>
      </main>
    )
  }

  const previewCustomers = customers.slice(0, 5)
  const previewOrders = soloOrders.slice(0, 5)

  const allGroupOrders = groups.flatMap((g) => g.orders)
  const allActiveOrders = [...soloOrders, ...allGroupOrders]
  const totalOrders = allActiveOrders.length
  const totalBalanceOwed = allActiveOrders.reduce(
    (sum, o) => sum + Math.max(0, o.price - o.amount_paid), 0
  )

  const todayStr = new Date().toISOString().split('T')[0]
  const dueTodayCount = allActiveOrders.filter(
    (o) => o.due_date === todayStr && o.current_status !== 'Delivered'
  ).length
  const readyCount = allActiveOrders.filter((o) => o.current_status === 'Ready').length

  // Helper: status color and label
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

  return (
    <main style={{ minHeight: '100vh', background: '#F5EFE2', padding: '1.5rem 1.2rem' }}>
      <style>{`
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
          padding: 0.7rem 0.5rem;
          border: 1px solid #E8E0D5;
          text-align: center;
          text-decoration: none;
          transition: border-color 0.15s ease;
        }
        .stat-card:hover {
          border-color: #C79A2B;
        }
        .action-btn {
          padding: 0.6rem 1rem;
          border-radius: 8px;
          font-size: 0.8rem;
          font-weight: 600;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
          border: none;
          cursor: pointer;
          transition: transform 0.1s ease, box-shadow 0.1s ease;
        }
        .action-btn:active {
          transform: scale(0.97);
        }
        .group-card {
          border: 1px solid #E8E0D5;
          border-radius: 12px;
          padding: 1rem;
          margin-bottom: 1rem;
          background: #fff;
          box-shadow: 0 2px 6px rgba(30,58,95,0.04);
        }
        .group-card.expanded {
          border-color: #C79A2B;
        }
        .order-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.7rem 0;
          border-bottom: 1px solid #F0EDE8;
        }
        .order-row:last-child {
          border-bottom: none;
        }
        .order-info {
          flex: 1;
          min-width: 0;
        }
        .order-info .name {
          font-weight: 600;
          color: #1E3A5F;
          font-size: 0.9rem;
          margin: 0;
          line-height: 1.3;
        }
        .order-info .meta {
          color: #6B6255;
          font-size: 0.78rem;
          margin: 0.1rem 0 0;
        }
        .order-balance {
          font-weight: 700;
          font-size: 0.85rem;
          color: #AE4A34;
          margin-right: 0.8rem;
          white-space: nowrap;
        }
        .order-balance.paid {
          color: #4C7A5E;
        }
        .order-actions {
          display: flex;
          gap: 0.3rem;
          flex-shrink: 0;
        }
        .order-actions a {
          color: #6B6255;
          font-size: 0.7rem;
          text-decoration: none;
          padding: 0.2rem 0.5rem;
          border-radius: 4px;
          border: 1px solid #E8E0D5;
          background: #fff;
          transition: background 0.1s ease;
        }
        .order-actions a:hover {
          background: #F5EFE2;
        }
        .customer-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.7rem 1rem;
          background: #fff;
          border-radius: 8px;
          border: 1px solid #E8E0D5;
          text-decoration: none;
          transition: border-color 0.15s ease;
        }
        .customer-row:hover {
          border-color: #C79A2B;
        }
        .customer-row .name {
          color: #1E3A5F;
          font-weight: 600;
          font-size: 0.9rem;
          margin: 0;
        }
        .customer-row .phone {
          color: #6B6255;
          font-size: 0.8rem;
          margin: 0;
        }
        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.7rem;
        }
        .section-header h2 {
          color: #1E3A5F;
          font-size: 1rem;
          font-weight: 700;
          margin: 0;
          letter-spacing: -0.3px;
        }
        .section-header a {
          color: #6B6255;
          font-size: 0.8rem;
          font-weight: 500;
          text-decoration: none;
          border-bottom: 1px solid transparent;
          transition: border-color 0.15s ease;
        }
        .section-header a:hover {
          border-bottom-color: #6B6255;
        }
        .empty-state {
          background: #fff;
          border-radius: 12px;
          padding: 1.5rem;
          border: 1px solid #E8E0D5;
          text-align: center;
          color: #6B6255;
          font-size: 0.9rem;
          margin-bottom: 1.5rem;
        }
        .quick-actions {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
          margin-bottom: 1.5rem;
        }
        .search-bar {
          width: 100%;
          padding: 0.65rem 0.9rem;
          border-radius: 10px;
          border: 1px solid #E8E0D5;
          font-size: 0.9rem;
          background: #fff;
          box-sizing: border-box;
          transition: border-color 0.15s ease;
          color: #2B2620;
        }
        .search-bar:focus {
          outline: none;
          border-color: #C79A2B;
        }
        .search-bar::placeholder {
          color: #A89888;
        }
        .alert-badge {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 1.2rem;
        }
        .alert-badge > div {
          flex: 1;
          padding: 0.6rem 0.5rem;
          border-radius: 10px;
          text-align: center;
          font-size: 0.75rem;
          font-weight: 600;
        }
        .alert-badge .due {
          background: #F1DBD3;
          color: #AE4A34;
        }
        .alert-badge .ready {
          background: #F6E9C8;
          color: #B4881E;
        }
        .alert-badge .count {
          font-size: 1.1rem;
          font-weight: 800;
          display: block;
        }
        .group-coordinator {
          font-size: 0.78rem;
          color: #6B6255;
          margin: 0.1rem 0 0.2rem;
        }
        .group-balance {
          font-size: 0.82rem;
          font-weight: 600;
          margin: 0.2rem 0 0;
        }
        .group-balance.owing {
          color: #AE4A34;
        }
        .group-balance.paid {
          color: #4C7A5E;
        }
        .group-toggle {
          background: none;
          border: none;
          color: #6B6255;
          font-size: 0.7rem;
          cursor: pointer;
          padding: 0.2rem 0.4rem;
          border-radius: 4px;
          transition: background 0.1s ease;
        }
        .group-toggle:hover {
          background: #F0EDE8;
        }
        .group-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          width: 100%;
          cursor: pointer;
          background: none;
          border: none;
          padding: 0;
          text-align: left;
        }
        .group-header-left {
          flex: 1;
          min-width: 0;
        }
        .group-header-left h3 {
          margin: 0;
          color: #1E3A5F;
          font-size: 0.95rem;
          font-weight: 700;
        }
        .group-count {
          color: #6B6255;
          font-size: 0.7rem;
          white-space: nowrap;
          margin-left: 0.5rem;
        }
        .header-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
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
          line-height: 1.2;
        }
        .header-actions {
          display: flex;
          gap: 0.4rem;
          align-items: center;
        }
        .header-actions a,
        .header-actions button {
          padding: 0.3rem 0.6rem;
          border-radius: 6px;
          font-size: 0.75rem;
          text-decoration: none;
          border: 1px solid #E8E0D5;
          background: #fff;
          color: #1E3A5F;
          cursor: pointer;
          transition: background 0.1s ease, border-color 0.1s ease;
        }
        .header-actions a:hover,
        .header-actions button:hover {
          background: #F5EFE2;
          border-color: #C79A2B;
        }
      `}</style>

      {/* ===== HEADER ===== */}
      <div className="header-top">
        <div className="header-brand">
          <LetterLogo name={business?.name} size={44} />
          <div>
            <p className="greeting">Welcome back,</p>
            <p className="business-name">{business ? business.name : 'Your business'}</p>
          </div>
        </div>
        <div className="header-actions">
          <a href="/dashboard/profile">Profile</a>
          <button onClick={handleLogout}>Log out</button>
        </div>
      </div>

      {/* ===== STATS ===== */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', marginBottom: '1.2rem' }}>
        <a href="/dashboard/customers" className="stat-card">
          <p style={{ margin: 0, color: '#1E3A5F', fontSize: '1.3rem', fontWeight: '700' }}>{customers.length}</p>
          <p style={{ margin: '0.1rem 0 0', color: '#6B6255', fontSize: '0.7rem' }}>Customers</p>
        </a>
        <a href="/dashboard/orders" className="stat-card">
          <p style={{ margin: 0, color: '#1E3A5F', fontSize: '1.3rem', fontWeight: '700' }}>{totalOrders}</p>
          <p style={{ margin: '0.1rem 0 0', color: '#6B6255', fontSize: '0.7rem' }}>Orders</p>
        </a>
        <a href="/dashboard/orders?filter=owing" className="stat-card">
          <p style={{ margin: 0, color: totalBalanceOwed > 0 ? '#AE4A34' : '#4C7A5E', fontSize: '1.1rem', fontWeight: '700' }}>
            ₦{totalBalanceOwed.toLocaleString()}
          </p>
          <p style={{ margin: '0.1rem 0 0', color: '#6B6255', fontSize: '0.7rem' }}>Owed</p>
        </a>
      </div>

      {/* ===== ALERT BADGES ===== */}
      {(dueTodayCount > 0 || readyCount > 0) && (
        <div className="alert-badge">
          {dueTodayCount > 0 && (
            <div className="due">
              <span className="count">{dueTodayCount}</span>
              Due today
            </div>
          )}
          {readyCount > 0 && (
            <div className="ready">
              <span className="count">{readyCount}</span>
              Ready for pickup
            </div>
          )}
        </div>
      )}

      {/* ===== SEARCH ===== */}
      <div style={{ marginBottom: '1rem' }}>
        <input
          type="text"
          className="search-bar"
          placeholder="Search by customer, order, or phone..."
          onKeyDown={(e) => {
            if (e.key === 'Enter' && e.target.value.trim()) {
              router.push(`/dashboard/orders?search=${encodeURIComponent(e.target.value.trim())}`)
            }
          }}
        />
      </div>

      {/* ===== QUICK ACTIONS ===== */}
      <div className="quick-actions">
        <a href="/dashboard/customers/new" className="action-btn" style={{ background: '#1E3A5F', color: '#fff' }}>
          + Customer
        </a>
        <a href="/dashboard/orders/new" className="action-btn" style={{ background: '#C79A2B', color: '#1E3A5F' }}>
          + Order
        </a>
        <a href="/dashboard/groups/new" className="action-btn" style={{ background: '#AE4A34', color: '#fff' }}>
          + Group
        </a>
      </div>

      {/* ===== GROUP ORDERS ===== */}
      <div style={{ marginBottom: '1.8rem' }}>
        <div className="section-header">
          <h2>Group Orders</h2>
        </div>

        {groups.length === 0 ? (
          <div className="empty-state">
            <p style={{ margin: '0 0 0.4rem' }}>No group orders yet.</p>
            <a href="/dashboard/groups/new" style={{ color: '#AE4A34', fontWeight: '600', fontSize: '0.85rem', textDecoration: 'none' }}>
              + Create a group order
            </a>
          </div>
        ) : (
          groups.map((g) => {
            const isExpanded = expandedGroups.includes(g.id)
            const combinedBalance = g.orders.reduce((sum, o) => sum + (o.price - o.amount_paid), 0)
            const memberCount = g.orders.length

            return (
              <div key={g.id} className={`group-card ${isExpanded ? 'expanded' : ''}`}>
                <button className="group-header" onClick={() => toggleGroup(g.id)}>
                  <div className="group-header-left">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                      <h3>{g.group_name}</h3>
                      <span className="group-count">{memberCount} member{memberCount !== 1 ? 's' : ''}</span>
                    </div>
                    <p className="group-coordinator">Coordinator: {g.customers?.name || 'Unnamed'}</p>
                    <p className={`group-balance ${combinedBalance > 0 ? 'owing' : 'paid'}`}>
                      {combinedBalance > 0
                        ? `₦${combinedBalance.toLocaleString()} remaining`
                        : '✓ All paid'}
                    </p>
                  </div>
                  <span className="group-toggle">{isExpanded ? '▲ Hide' : '▼ Show'}</span>
                </button>

                {isExpanded && (
                  <div style={{ marginTop: '0.8rem', borderTop: '1px solid #F0EDE8', paddingTop: '0.8rem' }}>
                    {g.orders.map((o) => {
                      const status = getStatusInfo(o.current_status)
                      return (
                        <div key={o.id} className="order-row">
                          <div className="order-info">
                            <p className="name">
                              {o.item_name || 'Untitled'}
                              <span
                                className="order-status-badge"
                                style={{ background: status.bg, color: status.color, marginLeft: '0.5rem' }}
                              >
                                {status.label}
                              </span>
                            </p>
                            <p className="meta">
                              {o.customers?.name || 'No customer'} · {o.due_date ? `Due ${new Date(o.due_date).toLocaleDateString('en-GB')}` : 'No deadline'}
                            </p>
                          </div>
          )
                               }
