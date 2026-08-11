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

    // Count orders due soon (next 3 days)
    const now = new Date()
    const threeDaysLater = new Date()
    threeDaysLater.setDate(threeDaysLater.getDate() + 3)
    const ordersDueSoon = orders.filter(o => {
      if (!o.due_date || isOrderDelivered(o)) return false
      const due = new Date(o.due_date)
      return due >= now && due <= threeDaysLater
    }).length

    // Count fittings (we don't have fittings data, so we'll use orders with due_date soon as proxy for "fittings today"?)
    // Instead we'll use orders due today.
    const todayStr = new Date().toISOString().split('T')[0]
    const ordersDueToday = orders.filter(o => o.due_date?.startsWith(todayStr) && !isOrderDelivered(o)).length

    // Expected payments (outstanding balance)
    const expectedPayments = totalOutstanding

    // Needs attention: overdue orders + orders with high outstanding balance > 0
    const attentionItems = orders.filter(o => {
      if (isOrderDelivered(o)) return false
      const balance = calculateBalance(o)
      return isOrderOverdue(o) || balance > 0
    }).length

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
      healthTone: healthScore >= 80 ? 'healthy' : healthScore >= 60 ? 'watch' : 'risk',
      ordersDueSoon,
      ordersDueToday,
      expectedPayments,
      attentionItems,
      // Production pipeline counts by status
      production: {
        'Order placed': orders.filter(o => o.current_status === 'Order placed' && !isOrderDelivered(o)).length,
        'Cutting': orders.filter(o => o.current_status === 'Cutting' && !isOrderDelivered(o)).length,
        'Sewing': orders.filter(o => o.current_status === 'Sewing' && !isOrderDelivered(o)).length,
        'Ready': orders.filter(o => o.current_status === 'Ready' && !isOrderDelivered(o)).length,
      }
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

  // ─── Attention items ──────────────────────────────
  const attentionList = useMemo(() => {
    return orders
      .filter(o => {
        if (isOrderDelivered(o)) return false
        const balance = calculateBalance(o)
        return isOrderOverdue(o) || balance > 0
      })
      .slice(0, 3)
      .map(o => {
        const customer = customers.find(c => c.id === o.customer_id)
        const balance = calculateBalance(o)
        const overdue = isOrderOverdue(o)
        return {
          id: o.id,
          customerName: customer?.name || customer?.first_name || 'Unknown',
          title: o.title || 'Untitled',
          balance,
          overdue,
          due_date: o.due_date,
          status: o.current_status,
        }
      })
  }, [orders, customers])

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

  // ─── Main render ──────────────────────────────────────
  try {
    const {
      ordersDueSoon,
      ordersDueToday,
      expectedPayments,
      attentionItems,
      production,
      totalRevenue,
      totalOutstanding,
      collectionRate,
      deliveryRate,
      overdue,
      healthScore,
      healthLabel,
      healthTone,
      periodRevenue,
      periodOrders,
      daily
    } = analytics

    const newCustomersThisPeriod = customers.filter(c => {
      if (!c.created_at) return false
      const periodDays = period === '7d' ? 7 : period === '30d' ? 30 : 90
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - periodDays)
      return new Date(c.created_at) >= startDate
    }).length

    // Build greeting
    const hour = new Date().getHours()
    let greeting = 'Good evening'
    if (hour < 12) greeting = 'Good morning'
    else if (hour < 17) greeting = 'Good afternoon'
    const userName = business?.name || 'there'

    return (
      <div className="dashboard-page">
        <div className="dashboard-shell">
          {/* ─── HEADER ─── */}
          <header className="dashboard-header">
            <div className="greeting">
              <span className="greeting-text">{greeting}, {userName} 👋</span>
              <span className="date-text">{formatDate(new Date())}</span>
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

          {/* ─── TODAY SUMMARY ─── */}
          <section className="today-summary">
            <div className="section-label">TODAY</div>
            <div className="today-grid">
              <Link href={`/dashboard/orders?business_id=${businessId || ''}&filter=due_soon`} className="today-tile">
                <span className="today-number">{ordersDueSoon}</span>
                <span className="today-label">Orders due soon</span>
              </Link>
              <Link href={`/dashboard/orders?business_id=${businessId || ''}&filter=due_today`} className="today-tile">
                <span className="today-number">{ordersDueToday}</span>
                <span className="today-label">Fittings today</span>
              </Link>
              <Link href={`/dashboard/payments?business_id=${businessId || ''}&filter=outstanding`} className="today-tile">
                <span className="today-number">{formatMoney(expectedPayments)}</span>
                <span className="today-label">Expected payments</span>
              </Link>
              <Link href={`/dashboard/orders?business_id=${businessId || ''}&filter=attention`} className="today-tile">
                <span className="today-number">{attentionItems}</span>
                <span className="today-label">Need attention</span>
              </Link>
            </div>
          </section>

          {/* ─── NEEDS YOUR ATTENTION ─── */}
          {attentionList.length > 0 && (
            <section className="attention-section">
              <div className="section-label">NEEDS YOUR ATTENTION</div>
              <div className="attention-list">
                {attentionList.map((item) => {
                  const isCritical = item.overdue
                  const isWarning = item.balance > 0 && !item.overdue
                  return (
                    <div key={item.id} className={`attention-item ${isCritical ? 'critical' : isWarning ? 'warning' : ''}`}>
                      <div className="attention-content">
                        <div className="attention-main">
                          <span className="attention-icon">{isCritical ? '🔴' : isWarning ? '🟠' : '🟡'}</span>
                          <div>
                            <strong>{item.customerName}</strong>
                            <span className="attention-title">— {item.title}</span>
                          </div>
                        </div>
                        <div className="attention-detail">
                          {isCritical && <span className="attention-badge danger">Due {formatDate(item.due_date)}</span>}
                          {isWarning && <span className="attention-badge warning">₦{item.balance.toLocaleString()} outstanding</span>}
                          {!isCritical && !isWarning && <span className="attention-badge info">Payment overdue</span>}
                        </div>
                      </div>
                      <div className="attention-actions">
                        <Link href={`/dashboard/orders/${item.id}?business_id=${businessId || ''}`} className="attention-btn">View order</Link>
                        {isWarning && (
                          <button className="attention-btn secondary" onClick={() => alert(`Send reminder to ${item.customerName}`)}>
                            Send reminder
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          )}

               {/* ─── BUSINESS HEALTH ─── */}
          <section className="health-section">
            <div className="section-label">BUSINESS HEALTH</div>
            <div className="health-card">
              <div className="health-score-big">
                <span className={`health-score-number ${healthTone}`}>{healthScore}</span>
                <span className="health-score-label">/ 100</span>
              </div>
              <div className="health-metrics">
                <div><span>Payment collection</span><span className={collectionRate >= 80 ? 'good' : 'watch'}>{collectionRate}%</span></div>
                <div><span>Production</span><span className={deliveryRate >= 70 ? 'good' : 'watch'}>{deliveryRate}%</span></div>
                <div><span>Overdue orders</span><span className={overdue === 0 ? 'good' : 'danger'}>{overdue}</span></div>
                <div><span>Customer growth</span><span className="good">+{newCustomersThisPeriod}</span></div>
              </div>
              <div className="health-message">
                {healthTone === 'healthy' && '👍 Everything is on track. Keep up the great work!'}
                {healthTone === 'watch' && '⚠️ Some areas need attention. Review your overdue and collection.'}
                {healthTone === 'risk' && '🚨 Critical issues detected. Address overdue orders and payments immediately.'}
              </div>
            </div>
          </section>
            

          {/* ─── PRODUCTION PIPELINE ─── */}
          <section className="production-section">
            <div className="section-label">PRODUCTION</div>
            <div className="production-pipeline">
              {Object.entries(production).map(([stage, count]) => (
                <Link
                  key={stage}
                  href={`/dashboard/orders?business_id=${businessId || ''}&status=${stage}`}
                  className="production-stage"
                >
                  <span className="stage-count">{count}</span>
                  <span className="stage-name">{stage}</span>
                </Link>
              ))}
            </div>
          </section>

          {/* ─── CHART (moved lower) ─── */}
          <section className="chart-section">
            <div className="panel-header">
              <div>
                <div className="section-label">PERFORMANCE</div>
                <h2>Revenue & orders</h2>
              </div>
              <div className="period-control">
                {['7d','30d','90d'].map(v => (
                  <button key={v} className={period === v ? 'active' : ''} onClick={() => setPeriod(v)}>
                    {v}
                  </button>
                ))}
              </div>
            </div>
            <div className="chart-summary">
              <div><span>Revenue</span><strong>{formatMoney(periodRevenue)}</strong></div>
              <div><span>Orders</span><strong>{periodOrders.length}</strong></div>
            </div>
            <div className="chart-container">
              {daily.length === 0 ? (
                <div className="chart-empty">No data</div>
              ) : (
                daily.map((day) => {
                  const maxRevenue = Math.max(...daily.map(d => Number(d.revenue || 0)), 1)
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
          </section>

          {/* ─── RECENT ORDERS ─── */}
          <section className="recent-section">
            <div className="section-header">
              <div className="section-label">RECENT ORDERS</div>
              <Link href={`/dashboard/orders?business_id=${businessId || ''}`} className="view-all">View all →</Link>
            </div>
            {recentOrders.length === 0 ? (
              <div className="empty-state">No orders yet</div>
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
              <div className="section-label">RECENT CUSTOMERS</div>
              <Link href={`/dashboard/customers?business_id=${businessId || ''}`} className="view-all">View all →</Link>
            </div>
            {recentCustomers.length === 0 ? (
              <div className="empty-state">No customers yet</div>
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
              <div className="section-label">ASO-EBI GROUPS</div>
              <Link href={`/dashboard/groups?business_id=${businessId || ''}`} className="view-all">View all →</Link>
            </div>
            {recentGroups.length === 0 ? (
              <div className="empty-state">No group orders yet</div>
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

          {/* ─── BOTTOM NAVIGATION ─── */}
          <nav className="bottom-nav">
            <Link href={`/dashboard?business_id=${businessId || ''}`} className="nav-item active">
              <Icon name="bar-chart-2" size={20} stroke="currentColor" />
              <span>Home</span>
            </Link>
            <Link href={`/dashboard/orders?business_id=${businessId || ''}`} className="nav-item">
              <Icon name="file-text" size={20} stroke="currentColor" />
              <span>Orders</span>
            </Link>
            <Link href={`/dashboard/customers?business_id=${businessId || ''}`} className="nav-item">
              <Icon name="users" size={20} stroke="currentColor" />
              <span>Customers</span>
            </Link>
            <Link href={`/dashboard/orders?business_id=${businessId || ''}&status=Cutting,Sewing`} className="nav-item">
              <Icon name="scissors" size={20} stroke="currentColor" />
              <span>Production</span>
            </Link>
            <Link href={`/dashboard/settings?business_id=${businessId || ''}`} className="nav-item">
              <Icon name="settings" size={20} stroke="currentColor" />
              <span>More</span>
            </Link>
          </nav>

          {/* ─── FLOATING ACTION BUTTON ─── */}
          <button className="fab-btn" onClick={() => setShowQuickOrder(true)}>
            <Icon name="plus" size={24} stroke="#fff" />
          </button>

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

{/* ─── GLOBAL STYLES ─── */}
        <style jsx>{`
          /* ── CSS Variables (Cresoa Palette) ── */
          :root {
            --color-primary: #0F2B4A;
            --color-accent: #D4A52A;
            --color-secondary: #2E7D5E;
            --color-danger: #D9534F;
            --color-bg: #F8F6F2;
            --color-card: #FFFFFF;
            --color-text: #1A1A1A;
            --color-text-muted: #8A8A8A;
            --color-border: #E5E0D8;
            --shadow: 0 4px 16px rgba(15,43,74,0.06);
          }

          .dashboard-page {
            min-height: 100vh;
            padding: 12px 12px 100px; /* bottom padding for nav */
            background: var(--color-bg);
            color: var(--color-text);
            font-family: 'Inter', sans-serif;
          }

          .dashboard-shell {
            max-width: 800px;
            margin: 0 auto;
          }

          /* ── Header ── */
          .dashboard-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 16px;
            flex-wrap: wrap;
            gap: 8px;
          }

          .greeting {
            display: flex;
            flex-direction: column;
          }

          .greeting-text {
            font-size: 18px;
            font-weight: 700;
            color: var(--color-primary);
          }

          .date-text {
            font-size: 12px;
            color: var(--color-text-muted);
            margin-top: 2px;
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
            padding: 8px 14px;
            border: 0;
            border-radius: 8px;
            font-size: 12px;
            font-weight: 600;
            cursor: pointer;
            text-decoration: none;
            transition: all 0.15s;
          }

          .btn-quick {
            background: var(--color-primary);
            color: #fff;
          }

          .btn-quick:active { transform: scale(0.96); }

          .btn-primary {
            background: var(--color-accent);
            color: #fff;
          }

          .btn-primary:active { transform: scale(0.96); }

          /* ── Section labels ── */
          .section-label {
            font-size: 10px;
            font-weight: 700;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            color: var(--color-text-muted);
            margin-bottom: 8px;
          }

          /* ── Today Summary ── */
          .today-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
          }

          .today-tile {
            display: flex;
            flex-direction: column;
            padding: 14px 12px;
            background: var(--color-card);
            border-radius: 12px;
            border: 1px solid var(--color-border);
            text-decoration: none;
            color: var(--color-text);
            transition: all 0.15s;
            box-shadow: var(--shadow);
          }

          .today-tile:active { transform: scale(0.97); }

          .today-number {
            font-size: 22px;
            font-weight: 700;
            color: var(--color-primary);
          }

          .today-label {
            font-size: 11px;
            color: var(--color-text-muted);
            margin-top: 2px;
          }

          /* ── Attention ── */
          .attention-list {
            display: flex;
            flex-direction: column;
            gap: 8px;
          }

          .attention-item {
            background: var(--color-card);
            border-radius: 12px;
            padding: 14px 16px;
            border-left: 4px solid var(--color-border);
            box-shadow: var(--shadow);
            border: 1px solid var(--color-border);
            border-left-width: 4px;
            transition: all 0.15s;
          }

          .attention-item.critical { border-left-color: var(--color-danger); }
          .attention-item.warning { border-left-color: var(--color-accent); }
          .attention-item.info { border-left-color: var(--color-primary); }

          .attention-content {
            display: flex;
            flex-direction: column;
            gap: 6px;
          }

          .attention-main {
            display: flex;
            align-items: center;
            gap: 8px;
          }

          .attention-icon { font-size: 18px; }

          .attention-title {
            font-size: 13px;
            color: var(--color-text-muted);
            margin-left: 4px;
          }

          .attention-detail {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
          }

          .attention-badge {
            font-size: 10px;
            font-weight: 600;
            padding: 2px 8px;
            border-radius: 12px;
            background: var(--color-bg);
          }

          .attention-badge.danger { background: #fde8e8; color: var(--color-danger); }
          .attention-badge.warning { background: #fcf2e1; color: var(--color-accent); }
          .attention-badge.info { background: #e6f0f5; color: var(--color-primary); }

          .attention-actions {
            display: flex;
            gap: 8px;
            margin-top: 8px;
          }

          .attention-btn {
            padding: 4px 14px;
            border: 0;
            border-radius: 6px;
            font-size: 11px;
            font-weight: 600;
            background: var(--color-primary);
            color: #fff;
            cursor: pointer;
            text-decoration: none;
            display: inline-flex;
            align-items: center;
            transition: all 0.15s;
          }

          .attention-btn:active { transform: scale(0.95); }
          .attention-btn.secondary {
            background: var(--color-bg);
            color: var(--color-text);
            border: 1px solid var(--color-border);
          }

          /* ── Health ── */
          .health-card {
            background: var(--color-card);
            border-radius: 12px;
            padding: 16px;
            border: 1px solid var(--color-border);
            box-shadow: var(--shadow);
          }

          .health-score-big {
            display: flex;
            align-items: baseline;
            gap: 4px;
            margin-bottom: 12px;
          }

          .health-score-number {
            font-size: 32px;
            font-weight: 800;
          }

          .health-score-number.healthy { color: var(--color-secondary); }
          .health-score-number.watch { color: var(--color-accent); }
          .health-score-number.risk { color: var(--color-danger); }

          .health-score-label {
            font-size: 14px;
            color: var(--color-text-muted);
          }

          .health-metrics {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px 12px;
            margin-bottom: 12px;
          }

          .health-metrics > div {
            display: flex;
            justify-content: space-between;
            font-size: 13px;
          }

          .health-metrics span:first-child { color: var(--color-text-muted); }
          .health-metrics .good { color: var(--color-secondary); font-weight: 600; }
          .health-metrics .watch { color: var(--color-accent); font-weight: 600; }
          .health-metrics .danger { color: var(--color-danger); font-weight: 600; }

          .health-message {
            font-size: 13px;
            padding: 10px;
            border-radius: 8px;
            background: var(--color-bg);
            color: var(--color-text-muted);
            line-height: 1.4;
          }

          /* ── Production Pipeline ── */
          .production-pipeline {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
          }

          .production-stage {
            display: flex;
            flex-direction: column;
            align-items: center;
            background: var(--color-card);
            padding: 10px 14px;
            border-radius: 10px;
            border: 1px solid var(--color-border);
            text-decoration: none;
            color: var(--color-text);
            min-width: 60px;
            flex: 1 0 auto;
            transition: all 0.15s;
            box-shadow: var(--shadow);
          }

          .production-stage:active { transform: scale(0.96); }

          .stage-count {
            font-size: 18px;
            font-weight: 700;
            color: var(--color-primary);
          }

          .stage-name {
            font-size: 9px;
            text-transform: uppercase;
            color: var(--color-text-muted);
            margin-top: 2px;
            letter-spacing: 0.04em;
          }

          /* ── Chart ── */
          .chart-section {
            background: var(--color-card);
            border-radius: 12px;
            padding: 16px;
            border: 1px solid var(--color-border);
            box-shadow: var(--shadow);
            margin-bottom: 16px;
          }

          .panel-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
          }

          .panel-header h2 {
            font-size: 16px;
            font-weight: 700;
            margin: 0;
          }

          .period-control {
            display: flex;
            gap: 4px;
            background: var(--color-bg);
            padding: 3px;
            border-radius: 8px;
            border: 1px solid var(--color-border);
          }

          .period-control button {
            padding: 4px 10px;
            border: 0;
            border-radius: 6px;
            background: transparent;
            font-size: 11px;
            font-weight: 600;
            color: var(--color-text-muted);
            cursor: pointer;
            transition: all 0.15s;
          }

          .period-control button.active {
            background: var(--color-card);
            color: var(--color-text);
            box-shadow: 0 2px 4px rgba(0,0,0,0.04);
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
            font-size: 10px;
            color: var(--color-text-muted);
          }

          .chart-summary strong {
            display: block;
            font-size: 14px;
            font-weight: 700;
            margin-top: 2px;
          }

          .chart-container {
            display: flex;
            align-items: flex-end;
            gap: 3px;
            height: 80px;
            padding: 4px 0;
            border-bottom: 1px solid var(--color-border);
          }

          .chart-bar-wrap {
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 2px;
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
            opacity: 0.6;
            transition: all 0.2s;
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
            width: 100%;
            text-align: center;
            color: var(--color-text-muted);
            font-size: 13px;
            padding: 20px 0;
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

          /* ── Recent Sections ── */
          .recent-section {
            margin-bottom: 16px;
          }

          .section-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
          }

          .view-all {
            font-size: 12px;
            font-weight: 600;
            color: var(--color-accent);
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
            background: var(--color-card);
            border-radius: 10px;
            border: 1px solid var(--color-border);
            text-decoration: none;
            color: var(--color-text);
            transition: border-color 0.15s;
            box-shadow: var(--shadow);
          }

          .order-item:active, .customer-item:active, .group-item:active {
            border-color: var(--color-accent);
          }

          .order-title, .customer-name, .group-name {
            font-weight: 700;
            font-size: 13px;
          }

          .order-customer, .customer-phone, .group-meta {
            font-size: 11px;
            color: var(--color-text-muted);
            display: block;
          }

          .order-meta {
            display: flex;
            align-items: center;
            gap: 6px;
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
            gap: 6px;
            flex-shrink: 0;
          }

          .progress-track {
            width: 50px;
            height: 4px;
            border-radius: 99px;
            background: var(--color-border);
            overflow: hidden;
          }

          .progress-fill {
            height: 100%;
            background: var(--color-secondary);
          }

          .group-progress span {
            font-size: 11px;
            font-weight: 600;
          }

          .empty-state {
            text-align: center;
            padding: 24px;
            color: var(--color-text-muted);
            background: var(--color-card);
            border-radius: 10px;
            border: 1px dashed var(--color-border);
          }

          /* ── Bottom Navigation ── */
          .bottom-nav {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            display: flex;
            justify-content: space-around;
            align-items: center;
            background: rgba(255,255,255,0.92);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            border-top: 1px solid var(--color-border);
            padding: 8px 0 env(safe-area-inset-bottom, 8px);
            z-index: 100;
            box-shadow: 0 -4px 12px rgba(0,0,0,0.04);
          }

          .nav-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            text-decoration: none;
            color: var(--color-text-muted);
            font-size: 10px;
            font-weight: 500;
            gap: 2px;
            transition: color 0.15s;
            padding: 4px 12px;
            -webkit-tap-highlight-color: transparent;
          }

          .nav-item.active {
            color: var(--color-accent);
          }

          .nav-item:active { opacity: 0.6; }

                                                                                                      /* ── FAB ── */
          .fab-btn {
            position: fixed;
            bottom: 80px;
            right: 20px;
            width: 56px;
            height: 56px;
            border-radius: 50%;
            border: 0;
            background: var(--color-accent);
            color: #fff;
            box-shadow: 0 4px 20px rgba(212,165,42,0.4);
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            z-index: 99;
            transition: transform 0.15s;
          }

          .fab-btn:active { transform: scale(0.92); }

          /* ── Modal ── */
          .modal-backdrop {
            position: fixed;
            inset: 0;
            z-index: 200;
            display: grid;
            place-items: center;
            padding: 16px;
            background: rgba(0,0,0,0.4);
            backdrop-filter: blur(4px);
          }

          .modal {
            width: 100%;
            max-width: 440px;
            max-height: calc(100vh - 32px);
            overflow-y: auto;
            background: var(--color-card);
            border-radius: 16px;
            border: 1px solid var(--color-border);
            box-shadow: 0 24px 64px rgba(0,0,0,0.15);
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

          .modal-body { padding: 16px; display: grid; gap: 12px; }
          .modal-field label { display: block; margin-bottom: 4px; font-size: 12px; font-weight: 600; }
          .modal-field input, .modal-field select {
            width: 100%;
            padding: 10px 12px;
            border: 1px solid var(--color-border);
            border-radius: 8px;
            background: var(--color-bg);
            font-size: 14px;
            color: var(--color-text);
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
            font-weight: 600;
            cursor: pointer;
          }
          .btn-secondary {
            border: 1px solid var(--color-border);
            background: transparent;
          }
          .btn-primary {
            background: var(--color-accent);
            color: #fff;
          }
          .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

          /* ── Responsive adjustments ── */
          @media (min-width: 640px) {
            .dashboard-page { padding: 20px 20px 100px; }
            .today-grid { grid-template-columns: repeat(4, 1fr); }
            .health-metrics { grid-template-columns: 1fr 1fr; }
            .production-stage { flex: 1 0 auto; }
          }

          @media (min-width: 768px) {
            .dashboard-shell { max-width: 960px; }
            .today-grid { gap: 12px; }
          }

          @media (min-width: 1024px) {
            .dashboard-shell { max-width: 1200px; }
            .today-grid { gap: 16px; }
            .health-metrics { grid-template-columns: 1fr 1fr 1fr 1fr; }
          }

          /* ── Dark mode support ── */
          [data-theme="dark"] {
            --color-bg: #12121A;
            --color-card: #1E1E2A;
            --color-text: #E8E8E8;
            --color-text-muted: #AAAAAA;
            --color-border: #2A2A3A;
            --shadow: 0 4px 16px rgba(0,0,0,0.3);
          }
          [data-theme="dark"] .bottom-nav {
            background: rgba(30,30,42,0.92);
            border-top-color: var(--color-border);
          }
          [data-theme="dark"] .modal {
            background: var(--color-card);
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
