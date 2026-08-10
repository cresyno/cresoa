'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../../../lib/supabaseClient'
import { getCurrentBusinessId } from '../../../lib/getBusinessId'
import { isFeatureAvailable } from '../../../lib/planLimits'
import { Icon } from '../../../components/Icon'

const safeAmount = (value) => {
  const amount = Number(value)
  return Number.isFinite(amount) ? amount : 0
}

const calculateBalance = (order) => {
  return Math.max(safeAmount(order?.price) - safeAmount(order?.amount_paid), 0)
}

const isOrderDelivered = (order) => {
  return order?.current_status === 'Delivered'
}

const isOrderOverdue = (order) => {
  if (!order?.due_date || isOrderDelivered(order)) return false
  const endOfDay = new Date(order.due_date)
  endOfDay.setHours(23, 59, 59, 999)
  return endOfDay < new Date()
}

const formatMoney = (value) => `₦${Number(value || 0).toLocaleString('en-NG')}`

const formatDate = (value) => {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}

const getStatusBadge = (status) => {
  const map = {
    'Order placed': { label: 'Placed', class: 'status-placed' },
    'Cutting': { label: 'Cutting', class: 'status-cutting' },
    'Sewing': { label: 'Sewing', class: 'status-sewing' },
    'Ready': { label: 'Ready', class: 'status-ready' },
    'Delivered': { label: 'Delivered', class: 'status-delivered' }
  }
  return map[status] || { label: status || 'Placed', class: 'status-placed' }
}

export default function FashionDashboardPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [business, setBusiness] = useState(null)
  const [customers, setCustomers] = useState([])
  const [orders, setOrders] = useState([])
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deactivated, setDeactivated] = useState(false)
  const [businessId, setBusinessId] = useState(null)
  const [period, setPeriod] = useState('30d')
  const [selectedDay, setSelectedDay] = useState(null)
  const [showQuickOrder, setShowQuickOrder] = useState(false)
  const [quickOrderCustomer, setQuickOrderCustomer] = useState('')
  const [quickOrderItem, setQuickOrderItem] = useState('')
  const [quickOrderPrice, setQuickOrderPrice] = useState('')
  const [quickOrderDeposit, setQuickOrderDeposit] = useState('')
  const [quickOrderDue, setQuickOrderDue] = useState('')
  const [quickOrderLoading, setQuickOrderLoading] = useState(false)
  const [quickOrderMessage, setQuickOrderMessage] = useState('')

  const loadDashboard = async () => {
    setLoading(true)
    setError('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const resolvedBusinessId = getCurrentBusinessId() || searchParams.get('business_id')
      if (!resolvedBusinessId) {
        router.push('/dashboard')
        return
      }

      setBusinessId(resolvedBusinessId)

      const { data: businessData, error: businessError } = await supabase
        .from('businesses')
        .select('id, name, sector, plan, owner_id, is_active, created_at')
        .eq('id', resolvedBusinessId)
        .single()

      if (businessError || !businessData) {
        throw new Error('Unable to load business information.')
      }

      if (businessData.owner_id !== user.id && !businessData.is_active) {
        setDeactivated(true)
        setLoading(false)
        return
      }

      setBusiness(businessData)

      const [customersResult, ordersResult, groupsResult] = await Promise.all([
        supabase
          .from('customers')
          .select('id, business_id, name, first_name, last_name, phone, email, created_at')
          .eq('business_id', resolvedBusinessId)
          .order('created_at', { ascending: false }),
        supabase
          .from('orders')
          .select('id, customer_id, title, price, amount_paid, current_status, due_date, group_order_id, created_at')
          .eq('business_id', resolvedBusinessId)
          .order('created_at', { ascending: false }),
        supabase
          .from('group_orders')
          .select('id, group_name, due_date, status, created_at')
          .eq('business_id', resolvedBusinessId)
          .order('created_at', { ascending: false })
      ])

      if (customersResult.error) throw customersResult.error
      if (ordersResult.error) throw ordersResult.error
      if (groupsResult.error) throw groupsResult.error

      setCustomers(customersResult.data || [])
      setOrders(ordersResult.data || [])
      setGroups(groupsResult.data || [])
    } catch (loadError) {
      console.error('Dashboard loading error:', loadError)
      setError(loadError?.message || 'Unable to load your dashboard.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDashboard()
  }, [searchParams])

  // ─── Analytics ──────────────────────────────────────
  const analytics = useMemo(() => {
    const totalRevenue = orders.reduce((sum, o) => sum + safeAmount(o.amount_paid), 0)
    const totalOrderValue = orders.reduce((sum, o) => sum + safeAmount(o.price), 0)
    const totalOutstanding = orders.reduce((sum, o) => sum + calculateBalance(o), 0)
    const delivered = orders.filter(o => isOrderDelivered(o)).length
    const overdue = orders.filter(o => isOrderOverdue(o)).length
    const active = orders.filter(o => !isOrderDelivered(o)).length

    const periodDays = period === '7d' ? 7 : period === '30d' ? 30 : 90
    const today = new Date()
    const startDate = new Date(today)
    startDate.setDate(startDate.getDate() - periodDays)

    const periodOrders = orders.filter(o => new Date(o.created_at) >= startDate)
    const periodRevenue = periodOrders.reduce((sum, o) => sum + safeAmount(o.amount_paid), 0)

    const daily = []
    for (let i = 0; i < periodDays; i++) {
      const date = new Date(today)
      date.setDate(date.getDate() - (periodDays - 1 - i))
      date.setHours(0, 0, 0, 0)

      const dateStr = date.toISOString().split('T')[0]
      const dayOrders = orders.filter(o => o.created_at?.startsWith(dateStr))

      daily.push({
        key: dateStr,
        label: date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
        revenue: dayOrders.reduce((sum, o) => sum + safeAmount(o.amount_paid), 0),
        orders: dayOrders.length
      })
    }

    const collectionRate = totalOrderValue > 0 ? Math.round((totalRevenue / totalOrderValue) * 100) : 0
    const deliveryRate = orders.length > 0 ? Math.round((delivered / orders.length) * 100) : 0
    const overdueRate = orders.length > 0 ? Math.round((overdue / orders.length) * 100) : 0

    const healthScore = Math.round(
      (Math.min(collectionRate, 100) * 0.35) +
      (Math.min(deliveryRate, 100) * 0.25) +
      (overdue === 0 ? 100 : Math.max(0, 100 - overdueRate)) * 0.2 +
      (customers.length > 0 ? Math.min(100, (customers.length / 10) * 10) : 0) * 0.2
    )

    return {
      totalRevenue,
      totalOrderValue,
      totalOutstanding,
      delivered,
      overdue,
      active,
      periodOrders,
      periodRevenue,
      daily,
      collectionRate,
      deliveryRate,
      overdueRate,
      healthScore,
      healthLabel: healthScore >= 80 ? 'Healthy' : healthScore >= 60 ? 'Watch closely' : 'Needs attention',
      healthTone: healthScore >= 80 ? 'healthy' : healthScore >= 60 ? 'watch' : 'risk'
    }
  }, [orders, customers, period])

  const selectedAnalyticsDay = useMemo(() => {
    if (!selectedDay) return analytics.daily[analytics.daily.length - 1] || null
    return analytics.daily.find(d => d.key === selectedDay) || null
  }, [analytics.daily, selectedDay])

  // ─── Recent data ────────────────────────────────────
  const recentOrders = useMemo(() => orders.slice(0, 6), [orders])
  const recentCustomers = useMemo(() => customers.slice(0, 6), [customers])
  const recentGroups = useMemo(() => groups.slice(0, 4), [groups])

  // ─── Loading state ──────────────────────────────────
  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-skeleton">
          <div className="skeleton-header" />
          <div className="skeleton-metrics">
            {[1,2,3,4].map(i => <div key={i} className="skeleton-card" />)}
          </div>
          <div className="skeleton-grid">
            <div className="skeleton-panel" />
            <div className="skeleton-panel" />
          </div>
        </div>
        <style jsx>{`
          .dashboard-loading { min-height: 100vh; padding: 16px; background: var(--color-bg); }
          .loading-skeleton { max-width: 1200px; margin: 0 auto; }
          .skeleton-header { height: 60px; background: var(--color-border); border-radius: 12px; margin-bottom: 16px; opacity: .5; animation: pulse 1.4s infinite; }
          .skeleton-metrics { display: grid; grid-template-columns: repeat(2,1fr); gap: 12px; margin-bottom: 16px; }
          .skeleton-card { height: 100px; background: var(--color-border); border-radius: 12px; opacity: .5; animation: pulse 1.4s infinite; }
          .skeleton-grid { display: grid; gap: 16px; }
          .skeleton-panel { height: 200px; background: var(--color-border); border-radius: 12px; opacity: .5; animation: pulse 1.4s infinite; }
          @keyframes pulse { 0%,100% { opacity: .4; } 50% { opacity: .7; } }
          @media (min-width: 768px) {
            .skeleton-metrics { grid-template-columns: repeat(4,1fr); }
            .skeleton-grid { grid-template-columns: 2fr 1fr; }
          }
        `}</style>
      </div>
    )
  }

  if (deactivated) {
    return (
      <div className="dashboard-error">
        <div className="error-card">
          <Icon name="lock" size={32} stroke="var(--color-danger)" />
          <h2>Business unavailable</h2>
          <p>This business is currently inactive. Contact the account owner.</p>
        </div>
        <style jsx>{`
          .dashboard-error { min-height: 100vh; display: grid; place-items: center; padding: 20px; background: var(--color-bg); }
          .error-card { max-width: 420px; padding: 32px; text-align: center; background: var(--color-card); border-radius: 16px; border: 1px solid var(--color-border); }
          .error-card h2 { margin: 16px 0 8px; }
          .error-card p { color: var(--color-text-muted); }
        `}</style>
      </div>
    )
  }

  if (error) {
    return (
      <div className="dashboard-error">
        <div className="error-card">
          <Icon name="alert-circle" size={32} stroke="var(--color-danger)" />
          <h2>Something went wrong</h2>
          <p>{error}</p>
          <button onClick={loadDashboard} className="retry-btn">Try again</button>
        </div>
        <style jsx>{`
          .dashboard-error { min-height: 100vh; display: grid; place-items: center; padding: 20px; background: var(--color-bg); }
          .error-card { max-width: 420px; padding: 32px; text-align: center; background: var(--color-card); border-radius: 16px; border: 1px solid var(--color-border); }
          .error-card h2 { margin: 16px 0 8px; }
          .error-card p { color: var(--color-text-muted); margin-bottom: 16px; }
          .retry-btn { padding: 10px 24px; border: 0; border-radius: 8px; background: var(--color-accent); color: #fff; font-weight: 700; cursor: pointer; }
        `}</style>
      </div>
    )
  }

  // ─── Main render with try-catch ─────────────────────
  try {
    const totalRevenue = analytics.totalRevenue
    const totalOutstanding = analytics.totalOutstanding
    const activeOrders = analytics.active
    const deliveredOrders = analytics.delivered
    const overdueOrders = analytics.overdue
    const collectionRate = analytics.collectionRate
    const deliveryRate = analytics.deliveryRate

    const newCustomersThisPeriod = customers.filter(c => {
      if (!c.created_at) return false
      const periodDays = period === '7d' ? 7 : period === '30d' ? 30 : 90
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - periodDays)
      return new Date(c.created_at) >= startDate
    }).length

    return (
      <div className="dashboard-page">
        <div className="dashboard-shell">
          {/* ─── HEADER ─── */}
          <header className="dashboard-header">
            <div>
              <div className="section-eyebrow">Business overview</div>
              <h1>{business?.name || 'Your business'}</h1>
              <p className="header-sub">A live view of orders, customers, collections and business health.</p>
            </div>
            <div className="header-actions">
              <button className="btn-quick" onClick={() => setShowQuickOrder(true)}>
                <Icon name="plus" size={16} stroke="currentColor" />
                Quick order
              </button>
              <Link href={`/dashboard/orders/new?business_id=${businessId || ''}`} className="btn-primary">
                <Icon name="plus" size={16} stroke="#fff" />
                New order
              </Link>
            </div>
          </header>

          {/* ─── METRICS ─── */}
          <section className="metrics-grid">
            <div className="metric-card">
              <div className="metric-top">
                <span className="metric-label">Collected</span>
                <span className="metric-icon">₦</span>
              </div>
              <strong className="metric-value">{formatMoney(totalRevenue)}</strong>
              <span className="metric-note">{collectionRate}% collected</span>
            </div>
            <div className="metric-card">
              <div className="metric-top">
                <span className="metric-label">Outstanding</span>
                <span className="metric-icon danger">₦</span>
              </div>
              <strong className="metric-value">{formatMoney(totalOutstanding)}</strong>
              <span className="metric-note">{overdueOrders} overdue orders</span>
            </div>
            <div className="metric-card">
              <div className="metric-top">
                <span className="metric-label">Orders</span>
                <span className="metric-icon"><Icon name="shopping-bag" size={15} stroke="currentColor" /></span>
              </div>
              <strong className="metric-value">{orders.length}</strong>
              <span className="metric-note">{activeOrders} currently active</span>
            </div>
            <div className="metric-card">
              <div className="metric-top">
                <span className="metric-label">Customers</span>
                <span className="metric-icon"><Icon name="users" size={15} stroke="currentColor" /></span>
              </div>
              <strong className="metric-value">{customers.length}</strong>
              <span className="metric-note">+{newCustomersThisPeriod} this period</span>
            </div>
          </section>

          {/* ─── MAIN GRID ─── */}
          <section className="main-grid">
            {/* ─── CHART ─── */}
            <div className="chart-panel">
              <div className="panel-header">
                <div>
                  <div className="section-eyebrow">Performance</div>
                  <h2>Business activity</h2>
                  <p>Daily order and collection movement from your real records.</p>
                </div>
                <div className="period-control">
                  {['7d','30d','90d'].map(v => (
                    <button key={v} className={period === v ? 'active' : ''} onClick={() => setPeriod(v)}>
                      {v === '7d' ? '7D' : v === '30d' ? '30D' : '90D'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="chart-summary">
                <div>
                  <span>{period === '7d' ? 'Last 7 days' : period === '30d' ? 'Last 30 days' : 'Last 90 days'}</span>
                  <strong>{formatMoney(analytics.periodRevenue)}</strong>
                </div>
                <div>
                  <span>Orders</span>
                  <strong>{analytics.periodOrders.length}</strong>
                </div>
              </div>

              <div className="chart-container">
                {analytics.daily.length === 0 ? (
                  <div className="chart-empty">
                    <Icon name="bar-chart" size={24} stroke="var(--color-text-muted)" />
                    <span>No activity recorded</span>
                  </div>
                ) : (
                  analytics.daily.map((day) => {
                    const maxRevenue = Math.max(...analytics.daily.map(d => Number(d.revenue || 0)), 1)
                    const height = Math.max(4, Math.round((Number(day.revenue || 0) / maxRevenue) * 100))
                    const selected = day.key === selectedAnalyticsDay?.key
                    return (
                      <button key={day.key} className={`chart-bar-wrap ${selected ? 'selected' : ''}`} onClick={() => setSelectedDay(day.key)}>
                        <div className="chart-bar" style={{ height: `${height}%` }} />
                        <span className="chart-label">{day.label}</span>
                      </button>
                    )
                  })
                )}
              </div>

              {selectedAnalyticsDay && (
                <div className="selected-day">
                  <div><span>Date</span><strong>{formatDate(selectedAnalyticsDay.key)}</strong></div>
                  <div><span>Orders</span><strong>{selectedAnalyticsDay.orders}</strong></div>
                  <div><span>Revenue</span><strong>{formatMoney(selectedAnalyticsDay.revenue)}</strong></div>
                </div>
              )}
            </div>

            {/* ─── HEALTH ─── */}
            <div className="health-panel">
              <div className="panel-header compact">
                <div>
                  <div className="section-eyebrow">Business health</div>
                  <h2>{analytics.healthLabel}</h2>
                </div>
                <span className={`health-score ${analytics.healthTone}`}>{analytics.healthScore}</span>
              </div>

              <div className="health-items">
                <div><span>Payment collection</span><strong>{collectionRate}%</strong></div>
                <div><span>Delivery completion</span><strong>{deliveryRate}%</strong></div>
                <div><span>Overdue orders</span><strong className={overdueOrders > 0 ? 'text-danger' : 'text-success'}>{overdueOrders}</strong></div>
                <div><span>New customers</span><strong>+{newCustomersThisPeriod}</strong></div>
              </div>

              <div className="health-message">
                {analytics.healthTone === 'healthy'
                  ? 'Your payment, delivery and customer activity are tracking well.'
                  : analytics.healthTone === 'watch'
                  ? 'A few areas deserve attention before they become bigger issues.'
                  : 'There are overdue or collection issues worth addressing today.'}
              </div>
            </div>
          </section>

          {/* ─── RECENT ORDERS ─── */}
          <section className="recent-section">
            <div className="section-header">
              <div>
                <div className="section-eyebrow">Activity</div>
                <h2>Recent orders</h2>
              </div>
              <Link href={`/dashboard/orders?business_id=${businessId || ''}`} className="view-all">View all →</Link>
            </div>

     {recentOrders.length === 0 ? (
              <div className="empty-state">
                <Icon name="clipboard" size={24} stroke="var(--color-text-muted)" />
                <p>No orders yet</p>
              </div>
            ) : (
              <div className="order-list">
                {recentOrders.map((order) => {
                  const customer = customers.find(c => c.id === order.customer_id)
                  const status = getStatusBadge(order.current_status)
                  const balance = calculateBalance(order)
                  return (
                    <Link key={order.id} href={`/dashboard/orders/${order.id}?business_id=${businessId || ''}`} className="order-item">
                      <div>
                        <strong className="order-title">{order.title || 'Untitled'}</strong>
                        <span className="order-customer">{customer?.name || 'Unknown'}</span>
                      </div>
                      <div className="order-meta">
                        <span className={`status-badge ${status.class}`}>{status.label}</span>
                        <strong className="order-price">{formatMoney(order.price)}</strong>
                        {balance > 0 && <span className="order-balance">₦{balance.toLocaleString()} due</span>}
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </section>

          {/* ─── RECENT CUSTOMERS ─── */}
          <section className="recent-section">
            <div className="section-header">
              <div>
                <div className="section-eyebrow">People</div>
                <h2>Recent customers</h2>
              </div>
              <Link href={`/dashboard/customers?business_id=${businessId || ''}`} className="view-all">View all →</Link>
            </div>

            {recentCustomers.length === 0 ? (
              <div className="empty-state">
                <Icon name="users" size={24} stroke="var(--color-text-muted)" />
                <p>No customers yet</p>
              </div>
            ) : (
              <div className="customer-list">
                {recentCustomers.map((customer) => {
                  const customerOrders = orders.filter(o => o.customer_id === customer.id)
                  return (
                    <Link key={customer.id} href={`/dashboard/customers/${customer.id}?business_id=${businessId || ''}`} className="customer-item">
                      <div className="customer-avatar">
                        {(customer.name || customer.first_name || 'C').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <strong className="customer-name">{customer.name || customer.first_name || 'Unknown'}</strong>
                        <span className="customer-phone">{customer.phone || 'No phone'}</span>
                      </div>
                      <span className="customer-orders">{customerOrders.length} orders</span>
                    </Link>
                  )
                })}
              </div>
            )}
          </section>

          {/* ─── RECENT GROUPS ─── */}
          <section className="recent-section">
            <div className="section-header">
              <div>
                <div className="section-eyebrow">Groups</div>
                <h2>Recent group orders</h2>
              </div>
              <Link href={`/dashboard/groups?business_id=${businessId || ''}`} className="view-all">View all →</Link>
            </div>

            {recentGroups.length === 0 ? (
              <div className="empty-state">
                <Icon name="users" size={24} stroke="var(--color-text-muted)" />
                <p>No group orders yet</p>
              </div>
            ) : (
              <div className="group-list">
                {recentGroups.map((group) => {
                  const groupOrders = orders.filter(o => o.group_order_id === group.id)
                  const delivered = groupOrders.filter(o => isOrderDelivered(o)).length
                  const progress = groupOrders.length > 0 ? Math.round((delivered / groupOrders.length) * 100) : 0
                  return (
                    <Link key={group.id} href={`/dashboard/groups/${group.id}?business_id=${businessId || ''}`} className="group-item">
                      <div>
                        <strong className="group-name">{group.group_name}</strong>
                        <span className="group-meta">{groupOrders.length} members · {progress}% delivered</span>
                      </div>
                      <div className="group-progress">
                        <div className="progress-track"><div className="progress-fill" style={{ width: `${progress}%` }} /></div>
                        <span>{progress}%</span>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </section>

          {/* ─── QUICK ORDER MODAL ─── */}
          {showQuickOrder && (
            <div className="modal-backdrop" onClick={() => setShowQuickOrder(false)}>
              <div className="modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                  <div>
                    <h2>Quick order</h2>
                    <p>Create an order in seconds</p>
                  </div>
                  <button className="modal-close" onClick={() => setShowQuickOrder(false)}>
                    <Icon name="x" size={20} stroke="currentColor" />
                  </button>
                </div>
                <form onSubmit={async (e) => {
                  e.preventDefault()
                  setQuickOrderLoading(true)
                  try {
                    const price = safeAmount(quickOrderPrice)
                    const deposit = Math.min(Math.max(safeAmount(quickOrderDeposit), 0), price)
                    const { error: insertError } = await supabase.from('orders').insert({
                      business_id: businessId,
                      customer_id: quickOrderCustomer,
                      title: quickOrderItem,
                      price,
                      amount_paid: deposit,
                      due_date: quickOrderDue || null,
                      current_status: 'Order placed'
                    })
                    if (insertError) throw insertError
                    setShowQuickOrder(false)
                    await loadDashboard()
                  } catch (err) {
                    setQuickOrderMessage(err.message)
                  } finally {
                    setQuickOrderLoading(false)
                  }
                }}>
                  <div className="modal-body">
                    {quickOrderMessage && <div className="modal-error">{quickOrderMessage}</div>}
                    <div className="modal-field">
                      <label>Customer</label>
                      <select value={quickOrderCustomer} onChange={e => setQuickOrderCustomer(e.target.value)} required>
                        <option value="">Select customer</option>
                        {customers.map(c => (
                          <option key={c.id} value={c.id}>{c.name || c.first_name || 'Unknown'}</option>
                        ))}
                      </select>
                    </div>
                    <div className="modal-field">
                      <label>Item</label>
                      <input type="text" value={quickOrderItem} onChange={e => setQuickOrderItem(e.target.value)} placeholder="e.g. Senator outfit" required />
                    </div>
                    <div className="modal-field">
                      <label>Price</label>
                      <input type="number" value={quickOrderPrice} onChange={e => setQuickOrderPrice(e.target.value)} placeholder="0" min="0" required />
                    </div>
                    <div className="modal-field">
                      <label>Deposit (optional)</label>
                      <input type="number" value={quickOrderDeposit} onChange={e => setQuickOrderDeposit(e.target.value)} placeholder="0" min="0" />
                    </div>
                    <div className="modal-field">
                      <label>Due date (optional)</label>
                      <input type="date" value={quickOrderDue} onChange={e => setQuickOrderDue(e.target.value)} />
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="btn-secondary" onClick={() => setShowQuickOrder(false)}>Cancel</button>
                    <button type="submit" className="btn-primary" disabled={quickOrderLoading}>
                      {quickOrderLoading ? 'Creating...' : 'Create order'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>

        {/* ─── STYLES ─── */}
        <style jsx>{`
          .dashboard-page {
            min-height: 100vh;
            padding: 12px;
            background: var(--color-bg);
            color: var(--color-text);
          }

          .dashboard-shell {
            max-width: 1200px;
            margin: 0 auto;
          }

          /* ─── HEADER ─── */
          .dashboard-header {
            display: flex;
            flex-direction: column;
            gap: 12px;
            margin-bottom: 16px;
          }

          .section-eyebrow {
            color: var(--color-text-muted);
            font-size: 10px;
            font-weight: 800;
            letter-spacing: .12em;
            text-transform: uppercase;
          }

          .dashboard-header h1 {
            margin: 4px 0 0;
            font-size: 22px;
            font-weight: 750;
          }

          .header-sub {
            margin: 4px 0 0;
            color: var(--color-text-muted);
            font-size: 13px;
          }

          .header-actions {
            display: flex;
            gap: 8px;
          }

          .btn-quick, .btn-primary {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            padding: 10px 14px;
            border: 0;
            border-radius: 8px;
            font-size: 12px;
            font-weight: 700;
            cursor: pointer;
            text-decoration: none;
            flex: 1;
          }

          .btn-quick {
            background: var(--color-primary);
            color: #fff;
          }

          .btn-primary {
            background: var(--color-accent);
            color: #fff;
       }

        /* ─── METRICS ─── */
          .metrics-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
            margin-bottom: 16px;
          }

          .metric-card {
            padding: 14px;
            border: 1px solid var(--color-border);
            border-radius: 12px;
            background: var(--color-card);
          }

          .metric-top {
            display: flex;
            justify-content: space-between;
            align-items: center;
          }

          .metric-label {
            color: var(--color-text-muted);
            font-size: 10px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: .06em;
          }

          .metric-icon {
            font-size: 14px;
            font-weight: 700;
            color: var(--color-accent);
          }

          .metric-icon.danger {
            color: var(--color-danger);
          }

          .metric-value {
            display: block;
            margin-top: 6px;
            font-size: 20px;
            font-weight: 750;
          }

          .metric-note {
            display: block;
            margin-top: 4px;
            color: var(--color-text-muted);
            font-size: 10px;
          }

          /* ─── MAIN GRID ─── */
          .main-grid {
            display: grid;
            gap: 14px;
            margin-bottom: 16px;
          }

          .chart-panel, .health-panel {
            padding: 16px;
            border: 1px solid var(--color-border);
            border-radius: 12px;
            background: var(--color-card);
          }

          .panel-header {
            display: flex;
            flex-direction: column;
            gap: 8px;
            margin-bottom: 14px;
          }

          .panel-header h2 {
            margin: 4px 0 0;
            font-size: 16px;
            font-weight: 700;
          }

          .panel-header p {
            margin: 4px 0 0;
            color: var(--color-text-muted);
            font-size: 12px;
          }

          .period-control {
            display: flex;
            gap: 3px;
            padding: 3px;
            border: 1px solid var(--color-border);
            border-radius: 8px;
            background: var(--color-bg);
            align-self: flex-start;
          }

          .period-control button {
            padding: 4px 10px;
            border: 0;
            border-radius: 5px;
            background: transparent;
            color: var(--color-text-muted);
            font-size: 10px;
            font-weight: 700;
            cursor: pointer;
          }

          .period-control button.active {
            background: var(--color-card);
            color: var(--color-text);
            box-shadow: 0 2px 4px rgba(0,0,0,0.06);
          }

          .chart-summary {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
            margin-bottom: 12px;
          }

          .chart-summary > div {
            padding: 8px 10px;
            border: 1px solid var(--color-border);
            border-radius: 8px;
            background: var(--color-bg);
          }

          .chart-summary span {
            display: block;
            color: var(--color-text-muted);
            font-size: 9px;
          }

          .chart-summary strong {
            display: block;
            margin-top: 2px;
            font-size: 14px;
            font-weight: 700;
          }

          .chart-container {
            display: flex;
            align-items: flex-end;
            gap: 3px;
            height: 100px;
            padding: 8px 0;
            border-bottom: 1px solid var(--color-border);
          }

          .chart-bar-wrap {
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 4px;
            background: transparent;
            border: 0;
            cursor: pointer;
            min-width: 0;
          }

          .chart-bar {
            width: min(16px, 60%);
            min-height: 3px;
            border-radius: 3px 3px 0 0;
            background: var(--color-accent);
            opacity: .6;
            transition: all .2s;
          }

          .chart-bar-wrap.selected .chart-bar {
            opacity: 1;
            transform: scaleX(1.15);
            box-shadow: 0 0 0 2px rgba(212,165,42,0.2);
          }

          .chart-label {
            font-size: 7px;
            color: var(--color-text-muted);
          }

          .chart-empty {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100px;
            width: 100%;
            color: var(--color-text-muted);
            gap: 6px;
          }

          .selected-day {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 8px;
            margin-top: 12px;
            padding: 10px;
            border: 1px solid var(--color-border);
            border-radius: 8px;
            background: var(--color-bg);
          }

          .selected-day > div {
            display: flex;
            flex-direction: column;
            gap: 1px;
          }

          .selected-day span {
            font-size: 8px;
            color: var(--color-text-muted);
            text-transform: uppercase;
          }

          .selected-day strong {
            font-size: 12px;
            font-weight: 700;
          }

          /* ─── HEALTH ─── */
          .health-items {
            display: grid;
            gap: 8px;
            margin: 12px 0;
          }

          .health-items > div {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 6px 0;
            border-bottom: 1px solid var(--color-border);
          }

          .health-items > div:last-child {
            border-bottom: 0;
          }

          .health-items span {
            color: var(--color-text-muted);
            font-size: 12px;
          }

          .health-items strong {
            font-size: 13px;
            font-weight: 700;
          }

          .text-success { color: var(--color-success); }
          .text-danger { color: var(--color-danger); }

          .health-score {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            padding: 4px 12px;
            border-radius: 8px;
            font-size: 18px;
            font-weight: 750;
            background: var(--color-bg);
          }

          .health-score.healthy { color: var(--color-success); }
          .health-score.watch { color: var(--color-accent); }
          .health-score.risk { color: var(--color-danger); }

          .health-message {
            padding: 10px;
            border: 1px solid var(--color-border);
            border-radius: 8px;
            background: var(--color-bg);
            font-size: 12px;
            color: var(--color-text-muted);
            line-height: 1.5;
          }

          /* ─── RECENT SECTIONS ─── */
          .recent-section {
            margin-bottom: 16px;
          }

          .section-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
          }

          .section-header h2 {
            margin: 0;
            font-size: 16px;
            font-weight: 700;
          }

          .view-all {
            color: var(--color-accent);
            font-size: 12px;
            font-weight: 600;
            text-decoration: none;
          }

          .order-list, .customer-list, .group-list {
            display: grid;
            gap: 8px;
          }

          .order-item, .customer-item, .group-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px;
            border: 1px solid var(--color-border);
            border-radius: 10px;
            background: var(--color-card);
            text-decoration: none;
            color: var(--color-text);
            transition: border-color .2s;
          }

          .order-item:hover, .customer-item:hover, .group-item:hover {
            border-color: var(--color-accent);
          }

          .order-title, .customer-name, .group-name {
            display: block;
            font-weight: 700;
            font-size: 13px;
          }

          .order-customer, .customer-phone, .group-meta {
            display: block;
            font-size: 11px;
            color: var(--color-text-muted);
          }

          .order-meta {
            display: flex;
            align-items: center;
            gap: 8px;
            flex-shrink: 0;
          }

          .order-price {
            font-weight: 700;
            font-size: 13px;
          }

          .order-balance {
            font-size: 10px;
            color: var(--color-danger);
          }

          .status-badge {
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 9px;
            font-weight: 700;
            text-transform: capitalize;
          }

          .status-placed { background: #e5e7eb; color: #374151; }
          .status-cutting { background: #fef3c7; color: #92400e; }
          .status-sewing { background: #dbeafe; color: #1e40af; }
          .status-ready { background: #d1fae5; color: #065f46; }
          .status-delivered { background: #d1fae5; color: #065f46; }

          .customer-avatar {
            width: 36px;
            height: 36px;
            display: grid;
            place-items: center;
            border-radius: 50%;
            background: var(--color-primary);
            color: #fff;
            font-size: 14px;
            font-weight: 700;
            flex-shrink: 0;
          }

          .customer-orders {
            font-size: 11px;
            color: var(--color-text-muted);
            flex-shrink: 0;
          }

          .group-progress {
            display: flex;
            align-items: center;
            gap: 8px;
            flex-shrink: 0;
          }

          .progress-track {
            width: 60px;
            height: 5px;
            border-radius: 99px;
            background: var(--color-border);
            overflow: hidden;
          }

          .progress-fill {
            height: 100%;
            border-radius: inherit;
            background: var(--color-success);
          }

          .group-progress span {
            font-size: 11px;
            font-weight: 700;
          }

          .empty-state {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 32px 16px;
            border: 1px dashed var(--color-border);
            border-radius: 10px;
            color: var(--color-text-muted);
            gap: 6px;
          }

          .empty-state p {
            margin: 0;
            font-size: 13px;
          }

                 /* ─── MODAL ─── */
          .modal-backdrop {
            position: fixed;
            z-index: 1000;
            inset: 0;
            display: grid;
            place-items: center;
            padding: 16px;
            background: rgba(0,0,0,0.48);
            backdrop-filter: blur(4px);
          }

          .modal {
            width: min(100%, 440px);
            max-height: calc(100vh - 32px);
            overflow-y: auto;
            border: 1px solid var(--color-border);
            border-radius: 16px;
            background: var(--color-card);
            box-shadow: 0 24px 64px rgba(0,0,0,0.2);
          }

          .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            padding: 16px;
            border-bottom: 1px solid var(--color-border);
          }

          .modal-header h2 { margin: 0; font-size: 18px; }
          .modal-header p { margin: 4px 0 0; color: var(--color-text-muted); font-size: 13px; }

          .modal-close {
            display: grid;
            place-items: center;
            width: 32px;
            height: 32px;
            border: 1px solid var(--color-border);
            border-radius: 8px;
            background: var(--color-bg);
            cursor: pointer;
          }

          .modal-body {
            padding: 16px;
            display: grid;
            gap: 12px;
          }

          .modal-field label {
            display: block;
            margin-bottom: 4px;
            font-size: 12px;
            font-weight: 700;
          }

          .modal-field input, .modal-field select {
            width: 100%;
            padding: 10px 12px;
            border: 1px solid var(--color-border);
            border-radius: 8px;
            background: var(--color-bg);
            color: var(--color-text);
            font-size: 14px;
            outline: none;
          }

          .modal-field input:focus, .modal-field select:focus {
            border-color: var(--color-accent);
          }

          .modal-error {
            padding: 8px 12px;
            border: 1px solid var(--color-danger);
            border-radius: 6px;
            background: rgba(217,83,79,0.06);
            color: var(--color-danger);
            font-size: 12px;
          }

          .modal-footer {
            display: flex;
            gap: 8px;
            padding: 16px;
            border-top: 1px solid var(--color-border);
          }

          .btn-secondary, .btn-primary {
            flex: 1;
            padding: 10px;
            border: 0;
            border-radius: 8px;
            font-size: 13px;
            font-weight: 700;
            cursor: pointer;
          }

          .btn-secondary {
            border: 1px solid var(--color-border);
            background: transparent;
            color: var(--color-text);
          }

          .btn-primary {
            background: var(--color-accent);
            color: #fff;
          }

          .btn-primary:disabled { opacity: .5; cursor: not-allowed; }

          /* ─── RESPONSIVE ─── */
          @media (min-width: 480px) {
            .metrics-grid { grid-template-columns: repeat(2, 1fr); }
          }

          @media (min-width: 640px) {
            .dashboard-page { padding: 20px; }
            .dashboard-header { flex-direction: row; align-items: center; }
            .header-actions { flex: 0 0 auto; }
            .btn-quick, .btn-primary { flex: 0 0 auto; }
            .chart-container { height: 130px; }
          }

          @media (min-width: 768px) {
            .metrics-grid { grid-template-columns: repeat(4, 1fr); }
            .main-grid { grid-template-columns: 2fr 1fr; }
            .selected-day { grid-template-columns: 1fr 1fr 1fr; }
            .order-item, .customer-item, .group-item { padding: 14px 16px; }
          }

          @media (min-width: 1024px) {
            .dashboard-page { padding: 28px; }
            .chart-container { height: 160px; }
          }
        `}</style>
      </div>
    )
  } catch (err) {
    console.error('Dashboard render error:', err)
    return (
      <div className="dashboard-error">
        <div className="error-card">
          <Icon name="alert-circle" size={32} stroke="var(--color-danger)" />
          <h2>Something went wrong</h2>
          <p>{err.message}</p>
          <button onClick={() => window.location.reload()}>Reload page</button>
        </div>
        <style jsx>{`
          .dashboard-error { min-height: 100vh; display: grid; place-items: center; padding: 20px; background: var(--color-bg); }
          .error-card { max-width: 420px; padding: 32px; text-align: center; background: var(--color-card); border-radius: 16px; border: 1px solid var(--color-border); }
          .error-card h2 { margin: 16px 0 8px; }
          .error-card p { color: var(--color-text-muted); margin-bottom: 16px; }
          .error-card button { padding: 10px 24px; border: 0; border-radius: 8px; background: var(--color-accent); color: #fff; font-weight: 700; cursor: pointer; }
        `}</style>
      </div>
    )
  }
}
