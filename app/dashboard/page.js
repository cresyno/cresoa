'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'
import LetterLogo from '../../components/LetterLogo'

export default function DashboardPage() {
  const router = useRouter()
  const [business, setBusiness] = useState(null)
  const [customers, setCustomers] = useState([])
  const [soloOrders, setSoloOrders] = useState([])
  const [groups, setGroups] = useState([])
  const [expandedGroups, setExpandedGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [deactivated, setDeactivated] = useState(false)
  const [showOwingOnly, setShowOwingOnly] = useState(false)
  const [statusFilter, setStatusFilter] = useState('all')

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

  const toggleOwingFilter = () => {
    setShowOwingOnly(!showOwingOnly)
  }

  const clearFilter = () => {
    setShowOwingOnly(false)
    setStatusFilter('all')
  }

  // Loading skeleton
  if (loading) {
    return (
      <main style={{ minHeight: '100vh', background: '#F5EFE2', padding: '1.5rem 1.2rem' }}>
        <style>{`
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
          .skeleton-text { height: 14px; margin-bottom: 6px; }
          .skeleton-title { height: 20px; width: 60%; margin-bottom: 8px; }
          .skeleton-card { height: 80px; border-radius: 12px; }
        `}</style>

        {/* Header skeleton */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
            <div className="skeleton" style={{ width: '44px', height: '44px', borderRadius: '12px' }}></div>
            <div>
              <div className="skeleton skeleton-text" style={{ width: '80px' }}></div>
              <div className="skeleton skeleton-title" style={{ width: '120px' }}></div>
            </div>
          </div>
          <div className="skeleton" style={{ width: '60px', height: '32px', borderRadius: '6px' }}></div>
        </div>

        {/* Stats skeleton */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', marginBottom: '1.2rem' }}>
          {[1, 2, 3].map(i => (
            <div key={i} className="skeleton skeleton-card"></div>
          ))}
        </div>

        {/* Search skeleton */}
        <div className="skeleton" style={{ height: '44px', borderRadius: '10px', marginBottom: '1rem' }}></div>

        {/* Actions skeleton */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
          {[1, 2, 3].map(i => (
            <div key={i} className="skeleton" style={{ height: '40px', width: '80px', borderRadius: '8px' }}></div>
          ))}
        </div>

        {/* Orders skeleton */}
        <div className="skeleton" style={{ height: '24px', width: '120px', marginBottom: '0.7rem' }}></div>
        {[1, 2, 3].map(i => (
          <div key={i} className="skeleton" style={{ height: '60px', borderRadius: '12px', marginBottom: '0.6rem' }}></div>
        ))}
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

  // Calculate trends (mock - in production would compare to previous period)
  const getTrend = (current, previous) => {
    if (previous === 0) return { direction: 'up', percentage: 0 }
    const diff = ((current - previous) / previous) * 100
    return {
      direction: diff >= 0 ? 'up' : 'down',
      percentage: Math.abs(Math.round(diff))
    }
  }

  // Mock previous values - in production these would come from DB
  const customerTrend = getTrend(customers.length, customers.length - 2)
  const orderTrend = getTrend(totalOrders, totalOrders - 3)
  const balanceTrend = getTrend(totalBalanceOwed, totalBalanceOwed + 5000)

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

  const hasBalance = (order) => {
    return (order.price - order.amount_paid) > 0
  }

  const getFilteredOrders = (orders) => {
    let filtered = orders
    if (showOwingOnly) {
      filtered = filtered.filter(o => hasBalance(o))
    }
    if (statusFilter !== 'all') {
      filtered = filtered.filter(o => o.current_status === statusFilter)
    }
    return filtered
  }

  const getFilteredGroupOrders = (group) => {
    let filtered = group.orders
    if (showOwingOnly) {
      filtered = filtered.filter(o => hasBalance(o))
    }
    if (statusFilter !== 'all') {
      filtered = filtered.filter(o => o.current_status === statusFilter)
    }
    return filtered
  }

  const filteredPreviewOrders = getFilteredOrders(previewOrders)

  // Quick order button
  const handleQuickOrder = () => {
    router.push('/dashboard/orders/new')
  }

  return (
    <main style={{ minHeight: '100vh', background: '#F5EFE2', padding: '1.5rem 1.2rem', paddingBottom: '5rem' }}>
      <style>{`
        @keyframes pulseGlow {
          0%, 100% { opacity: 1; text-shadow: 0 0 4px rgba(174, 74, 52, 0.2); }
          50% { opacity: 0.8; text-shadow: 0 0 12px rgba(174, 74, 52, 0.5); }
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
          padding: 0.7rem 0.5rem;
          border: 1px solid #E8E0D5;
          text-align: center;
          text-decoration: none;
          transition: border-color 0.15s ease, background 0.15s ease;
          cursor: pointer;
          position: relative;
        }
        .stat-card:hover {
          border-color: #C79A2B;
          background: #FBF8F0;
        }
        .stat-card.active {
          border-color: #AE4A34;
          background: #F1DBD3;
        }
        .stat-card .trend {
          font-size: 0.6rem;
          font-weight: 600;
          margin-top: 0.1rem;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.2rem;
        }
        .stat-card .trend.up { color: #4C7A5E; }
        .stat-card .trend.down { color: #AE4A34; }
        .stat-card .label {
          color: #6B6255;
          font-size: 0.7rem;
          margin: 0.1rem 0 0;
        }
        .stat-card .value {
          font-size: 1.3rem;
          font-weight: 700;
          margin: 0;
        }
        .stat-card .value.red { color: #AE4A34; }
        .stat-card .value.green { color: #4C7A5E; }
        .stat-card .value.navy { color: #1E3A5F; }
        .stat-card.overdue-warning {
          background: linear-gradient(135deg, #FFF5F0, #F1DBD3);
          border-color: #AE4A34;
        }
        .stat-card.overdue-warning .value {
          color: #AE4A34;
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
        .action-btn:active {
          transform: scale(0.97);
        }
        .group-card {
          border: 1px solid #E8E0D5;
          border-radius: 12px;
          padding: 1rem;
          margin-bottom: 1rem;
          background: #fff;
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
          font-size: 0.78rem;
          margin: 0.1rem 0 0;
          display: flex;
          align-items: center;
          gap: 0.3rem;
          flex-wrap: wrap;
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
          gap: 0.4rem;
          flex-shrink: 0;
          align-items: center;
        }
        .order-actions .btn {
          padding: 0.3rem 0.7rem;
          border-radius: 6px;
          font-size: 0.7rem;
          font-weight: 600;
          text-decoration: none;
          border: 1px solid #E8E0D5;
          background: #fff;
          color: #1E3A5F;
          transition: background 0.1s ease;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 0.2rem;
          min-height: 30px;
          min-width: 44px;
          justify-content: center;
        }
        .order-actions .btn:hover {
          background: #F5EFE2;
        }
        .order-actions .btn-view {
          background: #F5EFE2;
          border-color: #D6D0C5;
          color: #1E3A5F;
        }
        .order-actions .btn-view:hover {
          background: #EBE3D8;
        }
        .order-actions .btn-call {
          background: #F6E9C8;
          border-color: #C79A2B;
          color: #1E3A5F;
          font-weight: 700;
        }
        .order-actions .btn-call:hover {
          background: #E8D5A0;
        }
        .order-actions .btn-edit {
          background: #1E3A5F;
          border-color: #1E3A5F;
          color: #fff;
        }
        .order-actions .btn-edit:hover {
          background: #0F1E30;
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
          flex-wrap: wrap;
          gap: 0.4rem;
        }
        .section-header h2 {
          color: #1E3A5F;
          font-size: 1rem;
          font-weight: 700;
          margin: 0;
        }
        .section-header a {
          color: #6B6255;
          font-size: 0.8rem;
          font-weight: 500;
          text-decoration: none;
          border-bottom: 1px solid transparent;
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
        }
        .header-actions {

             .fab:active {
          transform: scale(0.92);
        }
        .fab:hover {
          box-shadow: 0 6px 24px rgba(199, 154, 43, 0.5);
        }
        .fab-label {
          position: fixed;
          bottom: 2.2rem;
          right: 4.8rem;
          background: #1E3A5F;
          color: #fff;
          padding: 0.3rem 0.8rem;
          border-radius: 20px;
          font-size: 0.7rem;
          font-weight: 600;
          white-space: nowrap;
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
          z-index: 100;
          opacity: 0;
          transition: opacity 0.2s ease;
          pointer-events: none;
        }
        .fab:hover + .fab-label {
          opacity: 1;
        }
      `}</style>

      {/* HEADER */}
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

      {/* STATS with Trend Arrows */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', marginBottom: '1.2rem' }}>
        <a href="/dashboard/customers" className="stat-card">
          <p className="value navy">{customers.length}</p>
          <p className="label">👤 Customers</p>
          <div className={`trend ${customerTrend.direction === 'up' ? 'up' : 'down'}`}>
            {customerTrend.direction === 'up' ? '↑' : '↓'} {customerTrend.percentage}% from last month
          </div>
        </a>
        <a href="/dashboard/orders" className="stat-card">
          <p className="value navy">{totalOrders}</p>
          <p className="label">📦 Orders</p>
          <div className={`trend ${orderTrend.direction === 'up' ? 'up' : 'down'}`}>
            {orderTrend.direction === 'up' ? '↑' : '↓'} {orderTrend.percentage}% from last month
          </div>
        </a>
        <button
          onClick={toggleOwingFilter}
          className={`stat-card ${showOwingOnly ? 'active' : ''} ${totalBalanceOwed > 50000 ? 'overdue-warning' : ''}`}
          style={{ border: showOwingOnly ? '2px solid #AE4A34' : '' }}
        >
          <p className={`value ${totalBalanceOwed > 0 ? 'red' : 'green'}`}>
            ₦{totalBalanceOwed.toLocaleString()}
          </p>
          <p className="label">{showOwingOnly ? '🔴 Owed (filtered)' : '💰 Owed'}</p>
          <div className={`trend ${balanceTrend.direction === 'up' ? 'down' : 'up'}`}>
            {balanceTrend.direction === 'up' ? '↑' : '↓'} {balanceTrend.percentage}% from last month
          </div>
        </button>
      </div>

      {/* ALERT BADGES */}
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

      {/* SEARCH + FILTERS */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <input
          type="text"
          className="search-bar"
          placeholder="🔍 Search by customer, order, or phone..."
          style={{ flex: 1 }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && e.target.value.trim()) {
              router.push(`/dashboard/orders?search=${encodeURIComponent(e.target.value.trim())}`)
            }
          }}
        />
        <select
          className="filter-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All</option>
          <option value="Order placed">Placed</option>
          <option value="Cutting">Cutting</option>
          <option value="Sewing">Sewing</option>
          <option value="Ready">Ready</option>
          <option value="Delivered">Delivered</option>
        </select>
      </div>

      {/* QUICK ACTIONS */}
      <div className="quick-actions">
        <a href="/dashboard/customers/new" className="action-btn" style={{ background: '#1E3A5F', color: '#fff' }}>
          👤 + Customer
        </a>
        <a href="/dashboard/orders/new" className="action-btn" style={{ background: '#C79A2B', color: '#1E3A5F' }}>
          📋 + Order
        </a>
        <a href="/dashboard/groups/new" className="action-btn" style={{ background: '#AE4A34', color: '#fff' }}>
          👥 + Group
        </a>
      </div>

      {/* GROUP ORDERS */}
      <div style={{ marginBottom: '1.8rem' }}>
        <div className="section-header">
          <h2>Group Orders</h2>
          {showOwingOnly && (
            <span className="filter-badge">
              💰 Showing unpaid only
              <button onClick={clearFilter} className="clear-filter-btn">✕ Clear</button>
            </span>
          )}
        </div>

        {groups.length === 0 ? (
          <div className="empty-state">
            <p style={{ margin: '0 0 0.4rem' }}>No group orders yet.</p>
            <a href="/dashboard/groups/new" style={{ color: '#AE4A34', fontWeight: '600', fontSize: '0.85rem', textDecoration: 'none' }}>
              👥 + Create a group order
            </a>
          </div>
        ) : (
          groups.map((g) => {
            const isExpanded = expandedGroups.includes(g.id)
            const filteredOrders = getFilteredGroupOrders(g)
            const hasVisibleOrders = filteredOrders.length > 0

            if (showOwingOnly && !hasVisibleOrders) return null

            const combinedBalance = filteredOrders.reduce((sum, o) => sum + (o.price - o.amount_paid), 0)
            const memberCount = g.orders.length

            return (
              <div key={g.id} className={`group-card ${isExpanded ? 'expanded' : ''}`}>
                <button className="group-header" onClick={() => toggleGroup(g.id)}>
                  <div className="group-header-left">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                      <h3>{g.group_name}</h3>
                      <span className="group-count">{memberCount} member{memberCount !== 1 ? 's' : ''}</span>
                      {showOwingOnly && combinedBalance > 0 && (
                        <span style={{ fontSize: '0.6rem', background: '#F1DBD3', color: '#AE4A34', padding: '0.1rem 0.4rem', borderRadius: '10px', fontWeight: '700' }}>
                          owes ₦{combinedBalance.toLocaleString()}
                        </span>
                      )}
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

                {isExpanded && hasVisibleOrders && (
                  <div style={{ marginTop: '0.8rem', borderTop: '1px solid #F0EDE8', paddingTop: '0.8rem' }}>
                    {filteredOrders.map((o) => {
                      const status = getStatusInfo(o.current_status)
                      const orderName = getOrderName(o)
                      const dueDisplay = getDueDisplay(o.due_date)
                      const phone = o.customers?.phone
                      return (
                        <div key={o.id} className="order-row">
                          <div className="order-info">
                            <p className="name">
                              {orderName}
                              <span
                                className="order-status-badge"
                                style={{ background: status.bg, color: status.color, marginLeft: '0.5rem' }}
                              >
                                {status.label}
                              </span>
                            </p>
                            <div className="meta">
                              <span>{o.customers?.name || 'No customer'}</span>
                              <span>·</span>
                              {dueDisplay}
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                            <span className={`order-balance ${o.price - o.amount_paid <= 0 ? 'paid' : ''}`}>
                              {o.price - o.amount_paid > 0 ? `₦${(o.price - o.amount_paid).toLocaleString()}` : '✓'}
                            </span>
                            <div className="order-actions">
                              <a href={`/dashboard/orders/${o.id}`} className="btn btn-view">👁️ View</a>
                              {phone && (
                                <a href={`tel:${phone}`} className="btn btn-call">📞 Call</a>
                              )}
                              <a href={`/dashboard/orders/${o.id}/edit`} className="btn btn-edit">✏️ Edit</a>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
      {/* INDIVIDUAL ORDERS */}
      <div style={{ marginBottom: '1.8rem' }}>
        <div className="section-header">
          <h2>Recent Orders</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            {showOwingOnly && (
              <button onClick={clearFilter} className="clear-filter-btn">✕ Clear filter</button>
            )}
            {statusFilter !== 'all' && (
              <button 
                onClick={() => setStatusFilter('all')} 
                className="clear-filter-btn"
                style={{ background: '#6B6255' }}
              >
                ✕ {statusFilter}
              </button>
            )}
            <a href="/dashboard/orders">View all →</a>
          </div>
        </div>

        {filteredPreviewOrders.length === 0 ? (
          <div className="empty-state">
            {showOwingOnly || statusFilter !== 'all' ? (
              <p>🎉 No orders match your filters. Try clearing the filters above.</p>
            ) : (
              <p>No individual orders yet. Create your first order to get started.</p>
            )}
          </div>
        ) : (
          <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #E8E0D5', padding: '0.2rem 1rem' }}>
            {filteredPreviewOrders.map((o) => {
              const status = getStatusInfo(o.current_status)
              const orderName = getOrderName(o)
              const dueDisplay = getDueDisplay(o.due_date)
              const phone = o.customers?.phone
              return (
                <div key={o.id} className="order-row">
                  <div className="order-info">
                    <p className="name">
                      {orderName}
                      <span
                        className="order-status-badge"
                        style={{ background: status.bg, color: status.color, marginLeft: '0.5rem' }}
                      >
                        {status.label}
                      </span>
                    </p>
                    <div className="meta">
                      <span>{o.customers?.name || 'No customer'}</span>
                      <span>·</span>
                      {dueDisplay}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                    <span className={`order-balance ${o.price - o.amount_paid <= 0 ? 'paid' : ''}`}>
                      {o.price - o.amount_paid > 0 ? `₦${(o.price - o.amount_paid).toLocaleString()}` : '✓'}
                    </span>
                    <div className="order-actions">
                      <a href={`/dashboard/orders/${o.id}`} className="btn btn-view">👁️ View</a>
                      {phone && (
                        <a href={`tel:${phone}`} className="btn btn-call">📞 Call</a>
                      )}
                      <a href={`/dashboard/orders/${o.id}/edit`} className="btn btn-edit">✏️ Edit</a>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* CUSTOMERS */}
      <div>
        <div className="section-header">
          <h2>Recent Customers</h2>
          <a href="/dashboard/customers">View all →</a>
        </div>

        {previewCustomers.length === 0 ? (
          <div className="empty-state">
            <p>No customers yet. Add your first customer to start tracking orders.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {previewCustomers.map((c) => (
              <a key={c.id} href={`/dashboard/customers/${c.id}`} className="customer-row">
                <div>
                  <p className="name">{c.name}</p>
                  {c.phone && <p className="phone">{c.phone}</p>}
                </div>
                <span style={{ color: '#C79A2B', fontSize: '0.8rem' }}>→</span>
              </a>
            ))}
          </div>
        )}
      </div>

      {/* FLOATING QUICK ORDER BUTTON */}
      <a href="/dashboard/orders/new" className="fab" title="Quick Order">
        +
      </a>
      <span className="fab-label">Quick Order</span>
    </main>
  )
              }
