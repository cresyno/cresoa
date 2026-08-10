'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../../../lib/supabaseClient'
import { getCurrentBusinessId } from '../../../lib/getBusinessId'
import { isFeatureAvailable } from '../../../lib/planLimits'
import { Icon } from '../../../components/Icon'

const currencyFormatter = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  maximumFractionDigits: 0
})

const formatCurrency = (value) => {
  return currencyFormatter.format(Number(value) || 0)
}

const safeAmount = (value) => {
  const amount = Number(value)
  return Number.isFinite(amount) ? amount : 0
}

const calculateBalance = (order) => {
  return Math.max(
    safeAmount(order?.price) - safeAmount(order?.amount_paid),
    0
  )
}

const isOrderDelivered = (order) => {
  return order?.current_status === 'Delivered'
}

const isOrderOverdue = (order, now = new Date()) => {
  if (!order?.due_date || isOrderDelivered(order)) {
    return false
  }
  const endOfDay = new Date(order.due_date)
  endOfDay.setHours(23, 59, 59, 999)
  return endOfDay < now
}

const formatMoney = (value) => {
  return `₦${Number(value || 0).toLocaleString('en-NG')}`
}

const formatCompactMoney = (value) => {
  const amount = safeAmount(value)
  if (amount >= 1000000) {
    return `₦${(amount / 1000000).toFixed(1)}m`
  }
  if (amount >= 1000) {
    return `₦${(amount / 1000).toFixed(1)}k`
  }
  return `₦${amount.toLocaleString()}`
}

const formatLongDate = (value) => {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}

const formatDate = (value) => {
  if (!value) return 'Not set'
  return new Date(value).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
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
          .select('id, business_id, name, first_name, last_name, phone, email, created_at, updated_at')
          .eq('business_id', resolvedBusinessId)
          .order('created_at', { ascending: false }),
        supabase
          .from('orders')
          .select('id, business_id, customer_id, title, description, price, amount_paid, current_status, due_date, group_order_id, created_at, delivery_date, category, quantity')
          .eq('business_id', resolvedBusinessId)
          .order('created_at', { ascending: false }),
        supabase
          .from('group_orders')
          .select('id, business_id, group_name, coordinator_customer_id, due_date, status, created_at, updated_at')
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
    const totalRevenue = orders.reduce((sum, order) => sum + safeAmount(order.amount_paid), 0)
    const totalOrderValue = orders.reduce((sum, order) => sum + safeAmount(order.price), 0)
    const totalOutstanding = orders.reduce((sum, order) => sum + calculateBalance(order), 0)
    const delivered = orders.filter(order => isOrderDelivered(order)).length
    const overdue = orders.filter(order => isOrderOverdue(order)).length
    const active = orders.filter(order => !isOrderDelivered(order)).length

    const periodDays = period === '7d' ? 7 : period === '30d' ? 30 : 90
    const today = new Date()
    const startDate = new Date(today)
    startDate.setDate(startDate.getDate() - periodDays)

    const periodOrders = orders.filter(order => new Date(order.created_at) >= startDate)
    const periodRevenue = periodOrders.reduce((sum, order) => sum + safeAmount(order.amount_paid), 0)
    const periodCollected = periodOrders.reduce((sum, order) => sum + safeAmount(order.amount_paid), 0)
    const periodOrderValue = periodOrders.reduce((sum, order) => sum + safeAmount(order.price), 0)

    // Daily data for chart
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
        orders: dayOrders.length,
        collected: dayOrders.reduce((sum, o) => sum + safeAmount(o.amount_paid), 0),
        outstanding: dayOrders.reduce((sum, o) => sum + calculateBalance(o), 0)
      })
    }

    const collectionRate = totalOrderValue > 0 ? Math.round((totalRevenue / totalOrderValue) * 100) : 0
    const deliveryRate = orders.length > 0 ? Math.round((delivered / orders.length) * 100) : 0

    const healthScore = Math.round(
      (Math.min(collectionRate, 100) * 0.35) +
      (Math.min(deliveryRate, 100) * 0.25) +
      (overdue === 0 ? 100 : Math.max(0, 100 - overdue * 10)) * 0.2 +
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
      periodCollected,
      periodOrderValue,
      daily,
      collectionRate,
      deliveryRate,
      healthScore,
      healthLabel: healthScore >= 80 ? 'Healthy' : healthScore >= 60 ? 'Watch closely' : 'Needs attention',
      healthTone: healthScore >= 80 ? 'healthy' : healthScore >= 60 ? 'watch' : 'risk'
    }
  }, [orders, customers, period])

  // ─── Selected day data ──────────────────────────────
  const selectedAnalyticsDay = useMemo(() => {
    if (!selectedDay) {
      return analytics.daily[analytics.daily.length - 1] || null
    }
    return analytics.daily.find(d => d.key === selectedDay) || null
  }, [analytics.daily, selectedDay])

  const selectedDayOrders = selectedAnalyticsDay?.orders || 0
  const selectedDayCollected = selectedAnalyticsDay?.collected || 0
  const selectedDayOutstanding = selectedAnalyticsDay?.outstanding || 0

  // ─── Quick order handler ────────────────────────────
  const handleCreateQuickOrder = async (event) => {
    event.preventDefault()

    if (!businessId) {
      setQuickOrderMessage('Business information is unavailable.')
      return
    }

    if (!quickOrderCustomer || !quickOrderItem || !quickOrderPrice) {
      setQuickOrderMessage('Customer, item and price are required.')
      return
    }

    setQuickOrderLoading(true)
    setQuickOrderMessage('')

    try {
      const price = safeAmount(quickOrderPrice)
      const deposit = Math.min(Math.max(safeAmount(quickOrderDeposit), 0), price)

      const { error: insertError } = await supabase
        .from('orders')
        .insert({
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
      setQuickOrderCustomer('')
      setQuickOrderItem('')
      setQuickOrderPrice('')
      setQuickOrderDeposit('')
      setQuickOrderDue('')
      await loadDashboard()
    } catch (createError) {
      console.error('Quick order error:', createError)
      setQuickOrderMessage(createError?.message || 'Unable to create the order.')
    } finally {
      setQuickOrderLoading(false)
    }
  }

  // ─── Render loading state ────────────────────────────
  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="dashboard-loading-shell">
          <div className="loading-header">
            <div className="loading-heading" />
            <div className="loading-action" />
          </div>
          <div className="loading-metrics">
            {[1, 2, 3, 4].map((item) => (
              <div className="loading-card" key={item} />
            ))}
          </div>
          <div className="loading-main">
            <div className="loading-panel large" />
            <div className="loading-panel" />
          </div>
          <div className="loading-table" />
        </div>
      </div>
    )
  }

  // ─── Render deactivated state ────────────────────────
  if (deactivated) {
    return (
      <div className="dashboard-state">
        <div className="dashboard-state-card">
          <div className="state-icon danger">
            <Icon name="lock" size={24} stroke="currentColor" />
          </div>
          <div className="state-copy">
            <div className="section-eyebrow">Business access</div>
            <h2>Business unavailable</h2>
            <p>This business is currently inactive. Contact the account owner to restore access.</p>
          </div>
        </div>
      </div>
    )
  }

  // ─── Render error state ──────────────────────────────
  if (error) {
    return (
      <div className="dashboard-state">
        <div className="dashboard-state-card error-card">
          <div className="state-icon error">
            <Icon name="alert-circle" size={24} stroke="currentColor" />
          </div>
          <div className="state-copy">
            <div className="section-eyebrow">Dashboard error</div>
            <h2>We couldn't load your dashboard</h2>
            <p>{error}</p>
            <button type="button" className="retry-button" onClick={loadDashboard}>
              Try again
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ─── Main render ──────────────────────────────────────
  const today = new Date()
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
          <div className="dashboard-heading">
            <div className="section-eyebrow">Business overview</div>
            <h1>{business?.name || 'Your business'}</h1>
            <p>A live view of orders, customers, collections and business health.</p>
          </div>

          <div className="dashboard-header-actions">
            <button type="button" className="quick-order-button" onClick={() => setShowQuickOrder(true)}>
              <Icon name="plus" size={15} stroke="#fff" />
              Quick order
            </button>
            <Link href={`/dashboard/orders/new?business_id=${businessId || ''}`} className="primary-button">
              <Icon name="plus" size={15} stroke="#fff" />
              New order
            </Link>
          </div>
        </header>

        {/* ─── METRICS ─── */}
        <section className="dashboard-metrics">
          <article className="metric-card">
            <div className="metric-card-top">
              <span className="metric-label">Collected</span>
              <span className="metric-icon">₦</span>
            </div>
            <strong className="metric-value">{formatMoney(totalRevenue)}</strong>
            <span className="metric-note">{collectionRate}% collected</span>
          </article>

          <article className="metric-card">
            <div className="metric-card-top">
              <span className="metric-label">Outstanding</span>
              <span className="metric-icon danger">₦</span>
            </div>
            <strong className="metric-value">{formatMoney(totalOutstanding)}</strong>
            <span className="metric-note">{overdueOrders} overdue orders</span>
          </article>

          <article className="metric-card">
            <div className="metric-card-top">
              <span className="metric-label">Orders</span>
              <span className="metric-icon">
                <Icon name="shopping-bag" size={15} stroke="currentColor" />
              </span>
            </div>
            <strong className="metric-value">{orders.length}</strong>
            <span className="metric-note">{activeOrders} currently active</span>
          </article>

          <article className="metric-card">
            <div className="metric-card-top">
              <span className="metric-label">Customers</span>
              <span className="metric-icon">
                <Icon name="users" size={15} stroke="currentColor" />
              </span>
            </div>
            <strong className="metric-value">{customers.length}</strong>
            <span className="metric-note">+{newCustomersThisPeriod} this period</span>
          </article>
        </section>

        {/* ─── ANALYTICS PANEL ─── */}
        <section className="dashboard-main-grid">
          <article className="analytics-panel">
            <div className="panel-header">
              <div>
                <div className="section-eyebrow">Performance</div>
                <h2>Business activity</h2>
                <p>Daily order and collection movement from your real records.</p>
              </div>
              <div className="period-control">
                {['7d', '30d', '90d'].map((value) => (
                  <button
                    key={value}
                    type="button"
                    className={period === value ? 'active' : ''}
                    onClick={() => setPeriod(value)}
                  >
                    {value === '7d' ? '7D' : value === '30d' ? '30D' : '90D'}
                  </button>
                ))}
              </div>
            </div>

            <div className="analytics-summary">
              <div>
                <span>{period === '7d' ? 'Last 7 days' : period === '30d' ? 'Last 30 days' : 'Last 90 days'}</span>
                <strong>{formatMoney(analytics.periodRevenue)}</strong>
              </div>
              <div>
                <span>Orders</span>
                <strong>{analytics.periodOrders.length}</strong>
              </div>
              <div>
                <span>Collected</span>
                <strong>{formatMoney(analytics.periodCollected)}</strong>
              </div>
            </div>

            <div className="activity-chart">
              {analytics.daily.length === 0 ? (
                <div className="chart-empty">
                  <Icon name="bar-chart" size={22} stroke="currentColor" />
                  <span>No activity recorded for this period.</span>
                </div>
              ) : (
                analytics.daily.map((day) => {
                  const maxRevenue = Math.max(...analytics.daily.map((d) => Number(d.revenue || 0)), 1)
                  const height = Math.max(4, Math.round((Number(day.revenue || 0) / maxRevenue) * 100))
                  const selected = day.key === selectedAnalyticsDay?.key

                  return (
                    <button
                      key={day.key}
                      type="button"
                      className={`chart-column ${selected ? 'selected' : ''}`}
                      onClick={() => setSelectedDay(day.key)}
                      title={`${formatLongDate(day.key)}: ${formatMoney(day.revenue)}`}
                    >
                      <div className="chart-value">
                        {day.revenue > 0 ? formatCompactMoney(day.revenue) : ''}
                      </div>
                      <div className="chart-bar-wrap">
                        <div className="chart-bar" style={{ height: `${height}%` }} />
                      </div>
                      <span>{day.label}</span>
                    </button>
                  )
                })
              )}
            </div>

            {/* ─── SELECTED DAY DETAILS ─── */}
            {selectedAnalyticsDay && (
              <div className="selected-day">
                <div>
                  <span>
                    <strong>{formatLongDate(selectedAnalyticsDay.key)}</strong>
                  </span>
                </div>
                <div>
                  <span>Orders</span>
                  <strong>{selectedDayOrders}</strong>
                </div>
                <div>
                  <span>Collected</span>
                  <strong>{formatMoney(selectedDayCollected)}</strong>
                </div>
                <div>
                  <span>Outstanding</span>
                  <strong>{formatMoney(selectedDayOutstanding)}</strong>
                </div>
              </div>
            )}
          </article>

            {/* ─── HEALTH PANEL ─── */}
          <aside className="health-panel">
            <div className="panel-header compact">
              <div>
                <div className="section-eyebrow">Business health</div>
                <h2>{analytics.healthLabel}</h2>
              </div>
              <span className={`health-score ${analytics.healthTone}`}>
                {analytics.healthScore}
              </span>
            </div>

            <div className="health-list">
              <div>
                <span>Payment collection</span>
                <strong>{collectionRate}%</strong>
              </div>
              <div>
                <span>Delivery completion</span>
                <strong>{deliveryRate}%</strong>
              </div>
              <div>
                <span>Overdue orders</span>
                <strong className={overdueOrders > 0 ? 'negative' : 'positive'}>{overdueOrders}</strong>
              </div>
              <div>
                <span>New customers</span>
                <strong>+{newCustomersThisPeriod}</strong>
              </div>
            </div>

            <div className="health-message">
              {analytics.healthTone === 'healthy'
                ? 'Your payment, delivery and customer activity are tracking well.'
                : analytics.healthTone === 'watch'
                ? 'A few areas deserve attention before they become bigger issues.'
                : 'There are overdue or collection issues worth addressing today.'}
            </div>
          </aside>
        </section>

        {/* ─── QUICK ORDER MODAL ─── */}
        {showQuickOrder && (
          <div className="dashboard-modal-backdrop" onClick={() => setShowQuickOrder(false)}>
            <div className="dashboard-modal" onClick={(e) => e.stopPropagation()}>
              <div className="dashboard-modal-header">
                <div>
                  <h2>Quick order</h2>
                  <p>Create an order in seconds. Fill in the essential details.</p>
                </div>
                <button type="button" className="modal-close" onClick={() => setShowQuickOrder(false)}>
                  <Icon name="x" size={18} stroke="currentColor" />
                </button>
              </div>

              <form onSubmit={handleCreateQuickOrder}>
                <div className="modal-form-grid">
                  <div className="modal-field full">
                    <label>Customer</label>
                    <select
                      value={quickOrderCustomer}
                      onChange={(e) => setQuickOrderCustomer(e.target.value)}
                      required
                    >
                      <option value="">Select customer</option>
                      {customers.map((customer) => (
                        <option key={customer.id} value={customer.id}>
                          {customer.name || customer.first_name || 'Unknown'}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="modal-field full">
                    <label>Item / service</label>
                    <input
                      type="text"
                      value={quickOrderItem}
                      onChange={(e) => setQuickOrderItem(e.target.value)}
                      placeholder="e.g. Senator outfit"
                      required
                    />
                  </div>

                  <div className="modal-field">
                    <label>Price</label>
                    <input
                      type="number"
                      value={quickOrderPrice}
                      onChange={(e) => setQuickOrderPrice(e.target.value)}
                      placeholder="0"
                      min="0"
                      step="100"
                      required
                    />
                  </div>

                  <div className="modal-field">
                    <label>Deposit</label>
                    <input
                      type="number"
                      value={quickOrderDeposit}
                      onChange={(e) => setQuickOrderDeposit(e.target.value)}
                      placeholder="0"
                      min="0"
                      step="100"
                    />
                  </div>

                  <div className="modal-field full">
                    <label>Due date</label>
                    <input
                      type="date"
                      value={quickOrderDue}
                      onChange={(e) => setQuickOrderDue(e.target.value)}
                    />
                  </div>
                </div>

                {quickOrderMessage && (
                  <div className="modal-error">{quickOrderMessage}</div>
                )}

                <div className="modal-footer">
                  <button type="button" className="secondary-button" onClick={() => setShowQuickOrder(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="primary-button" disabled={quickOrderLoading}>
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
          padding: 28px;
          background: var(--color-bg);
          color: var(--color-text);
        }

        .dashboard-shell {
          max-width: 1320px;
          margin: 0 auto;
        }

        /* ─── HEADER ─── */
        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 24px;
          margin-bottom: 22px;
        }

        .dashboard-heading {
          min-width: 0;
        }

        .section-eyebrow {
          color: var(--color-text-muted);
          font-size: 10px;
          font-weight: 800;
          letter-spacing: .12em;
          text-transform: uppercase;
        }

        .dashboard-heading h1 {
          margin: 5px 0;
          font-size: clamp(1.55rem, 2.5vw, 2rem);
          font-weight: 750;
          letter-spacing: -.035em;
        }

        .dashboard-heading p {
          max-width: 650px;
          margin: 0;
          color: var(--color-text-muted);
          font-size: 13px;
          line-height: 1.55;
        }

        .dashboard-header-actions {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-shrink: 0;
        }

        .quick-order-button,
        .primary-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          min-height: 38px;
          padding: 0 16px;
          border: 0;
          border-radius: 9px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          text-decoration: none;
        }

        .quick-order-button {
          background: var(--color-primary);
          color: #fff;
        }

        .quick-order-button:hover {
          opacity: .9;
        }

        .primary-button {
          background: var(--color-accent);
          color: #fff;
        }

        .primary-button:hover {
          opacity: .9;
        }

        /* ─── METRICS ─── */
        .dashboard-metrics {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
          margin-bottom: 18px;
        }

        .metric-card {
          padding: 16px;
          border: 1px solid var(--color-border);
          border-radius: 14px;
          background: var(--color-card);
          box-shadow: 0 2px 8px rgba(0,0,0,0.04);
        }

        .metric-card-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .metric-label {
          color: var(--color-text-muted);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: .06em;
          text-transform: uppercase;
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
          margin-top: 10px;
          font-size: 24px;
          font-weight: 750;
          line-height: 1.1;
        }

        .metric-note {
          display: block;
          margin-top: 6px;
          color: var(--color-text-muted);
          font-size: 10px;
        }

        /* ─── MAIN GRID ─── */
        .dashboard-main-grid {
          display: grid;
          grid-template-columns: 1.75fr 0.85fr;
          gap: 14px;
        }

        .analytics-panel,
        .health-panel {
          border: 1px solid var(--color-border);
          border-radius: 14px;
          background: var(--color-card);
          box-shadow: 0 2px 8px rgba(0,0,0,0.04);
          padding: 18px;
        }

        .panel-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 18px;
          margin-bottom: 16px;
        }

        .panel-header h2 {
          margin: 5px 0 4px;
          font-size: 14px;
          font-weight: 720;
        }

        .panel-header p {
          margin: 0;
          color: var(--color-text-muted);
          font-size: 11px;
          line-height: 1.5;
        }

        .period-control {
          display: flex;
          gap: 3px;
          padding: 3px;
          border: 1px solid var(--color-border);
          border-radius: 8px;
          background: var(--color-bg);
          flex-shrink: 0;
        }

        .period-control button {
          padding: 6px 10px;
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

        .analytics-summary {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
          margin-bottom: 18px;
        }

        .analytics-summary > div {
          padding: 10px 12px;
          border: 1px solid var(--color-border);
          border-radius: 9px;
          background: var(--color-bg);
        }

        .analytics-summary span {
          display: block;
          color: var(--color-text-muted);
          font-size: 9px;
        }

        .analytics-summary strong {
          display: block;
          margin-top: 3px;
          font-size: 13px;
          font-weight: 720;
        }

        /* ─── CHART ─── */
        .activity-chart {
          display: flex;
          align-items: flex-end;
          gap: 4px;
          height: 140px;
          padding: 10px 0;
          border-bottom: 1px solid var(--color-border);
        }

        .chart-column {
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

        .chart-value {
          font-size: 7px;
          color: var(--color-text-muted);
          white-space: nowrap;
          min-height: 14px;
        }

        .chart-bar-wrap {
          width: 100%;
          height: 80px;
          display: flex;
          align-items: flex-end;
          justify-content: center;
        }

        .chart-bar {
          width: min(20px, 70%);
          min-height: 3px;
          border-radius: 3px 3px 0 0;
          background: var(--color-accent);
          opacity: .7;
          transition: all .2s ease;
        }

        .chart-column.selected .chart-bar {
          opacity: 1;
          transform: scaleX(1.1);
          box-shadow: 0 0 0 2px rgba(212,165,42,0.2);
        }

        .chart-column span:last-child {
          font-size: 7px;
          color: var(--color-text-muted);
        }

        .chart-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 140px;
          width: 100%;
          color: var(--color-text-muted);
          gap: 8px;
        }

        /* ─── SELECTED DAY ─── */
        .selected-day {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
          margin-top: 14px;
          padding: 12px;
          border: 1px solid var(--color-border);
          border-radius: 10px;
          background: var(--color-bg);
        }

        .selected-day > div {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .selected-day span {
          font-size: 8px;
          color: var(--color-text-muted);
          text-transform: uppercase;
          letter-spacing: .04em;
        }

        .selected-day strong {
          font-size: 13px;
          font-weight: 700;
        }

        /* ─── HEALTH PANEL ─── */
        .health-list {
          display: grid;
          gap: 12px;
          margin: 16px 0;
        }

        .health-list > div {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 0;
          border-bottom: 1px solid var(--color-border);
        }

        .health-list > div:last-child {
          border-bottom: 0;
        }

        .health-list span {
          color: var(--color-text-muted);
          font-size: 11px;
        }

        .health-list strong {
          font-size: 13px;
          font-weight: 700;
        }

        .health-list .positive {
          color: var(--color-success);
        }

        .health-list .negative {
          color: var(--color-danger);
        }

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

        .health-score.healthy {
          color: var(--color-success);
        }

        .health-score.watch {
          color: var(--color-accent);
        }

        .health-score.risk {
          color: var(--color-danger);
        }

        .health-message {
          padding: 12px;
          border: 1px solid var(--color-border);
          border-radius: 9px;
          background: var(--color-bg);
          font-size: 11px;
          color: var(--color-text-muted);
          line-height: 1.5;
        }

        /* ─── MODAL ─── */
        .dashboard-modal-backdrop {
          position: fixed;
          z-index: 1000;
          inset: 0;
          display: grid;
          place-items: center;
          padding: 20px;
          background: rgba(0, 0, 0, .48);
          backdrop-filter: blur(4px);
        }

        .dashboard-modal {
          width: min(100%, 470px);
          max-height: calc(100vh - 40px);
          overflow-y: auto;
          border: 1px solid var(--color-border);
          border-radius: 16px;
          background: var(--color-card);
          box-shadow: 0 25px 80px rgba(0,0,0,0.25);
        }

        .dashboard-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 15px;
          padding: 18px;
          border-bottom: 1px solid var(--color-border);
        }

        .dashboard-modal-header h2 {
          margin: 0 0 4px;
          font-size: 16px;
        }

        .dashboard-modal-header p {
          margin: 0;
          color: var(--color-text-muted);
          font-size: 12px;
        }

        .modal-close {
          display: grid;
          place-items: center;
          width: 32px;
          height: 32px;
          border: 1px solid var(--color-border);
          border-radius: 8px;
          background: var(--color-bg);
          color: var(--color-text-muted);
          cursor: pointer;
          font-size: 18px;
        }

        .dashboard-modal form {
          padding: 18px;
        }

        .modal-form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .modal-field.full {
          grid-column: 1 / -1;
        }

        .modal-field label {
          display: block;
          margin-bottom: 5px;
          font-size: 11px;
          font-weight: 700;
        }

        .modal-field input,
        .modal-field select {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid var(--color-border);
          border-radius: 8px;
          background: var(--color-bg);
          color: var(--color-text);
          font-size: 13px;
          outline: none;
        }

        .modal-field input:focus,
        .modal-field select:focus {
          border-color: var(--color-accent);
        }

        .modal-error {
          margin: 12px 0;
          padding: 10px 12px;
          border: 1px solid var(--color-danger);
          border-radius: 8px;
          background: rgba(217,83,79,0.06);
          color: var(--color-danger);
          font-size: 12px;
        }

        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 18px;
          padding-top: 14px;
          border-top: 1px solid var(--color-border);
        }

        .secondary-button {
          padding: 10px 18px;
          border: 1px solid var(--color-border);
          border-radius: 8px;
          background: transparent;
          color: var(--color-text);
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
        }

        .secondary-button:hover {
          background: var(--color-bg);
        }

        .modal-footer .primary-button {
          padding: 10px 18px;
          border: 0;
          border-radius: 8px;
          background: var(--color-accent);
          color: #fff;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
        }

        .modal-footer .primary-button:disabled {
          opacity: .5;
          cursor: not-allowed;
        }

               /* ─── LOADING ─── */
        .dashboard-loading {
          min-height: 100vh;
          padding: 28px;
          background: var(--color-bg);
        }

        .dashboard-loading-shell {
          max-width: 1320px;
          margin: 0 auto;
        }

        .loading-header {
          display: flex;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 22px;
        }

        .loading-heading {
          width: 330px;
          height: 54px;
          border-radius: 12px;
          background: var(--color-border);
          opacity: .55;
        }

        .loading-action {
          width: 130px;
          height: 40px;
          border-radius: 9px;
          background: var(--color-border);
          opacity: .55;
        }

        .loading-metrics {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
          margin-bottom: 18px;
        }

        .loading-card {
          height: 125px;
          border-radius: 14px;
          background: var(--color-card);
          border: 1px solid var(--color-border);
          animation: dashboardPulse 1.4s ease-in-out infinite;
        }

        .loading-main {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 14px;
          margin-bottom: 14px;
        }

        .loading-panel {
          height: 330px;
          border-radius: 14px;
          background: var(--color-card);
          border: 1px solid var(--color-border);
          animation: dashboardPulse 1.4s ease-in-out infinite;
        }

        .loading-panel.large {
          min-height: 360px;
        }

        .loading-table {
          height: 300px;
          border-radius: 14px;
          background: var(--color-card);
          border: 1px solid var(--color-border);
          animation: dashboardPulse 1.4s ease-in-out infinite;
        }

        @keyframes dashboardPulse {
          0%, 100% { opacity: .45; }
          50% { opacity: .8; }
        }

        /* ─── STATE PAGES ─── */
        .dashboard-state {
          min-height: 100vh;
          padding: 32px 20px;
          background: var(--color-bg);
          display: grid;
          place-items: center;
        }

        .dashboard-state-card {
          width: min(100%, 620px);
          padding: 28px;
          display: flex;
          gap: 18px;
          align-items: flex-start;
          background: var(--color-card);
          border: 1px solid var(--color-border);
          border-radius: 18px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.04);
        }

        .state-icon {
          width: 48px;
          height: 48px;
          flex: 0 0 48px;
          display: grid;
          place-items: center;
          border-radius: 14px;
          color: var(--color-danger);
          background: rgba(220,70,70,0.1);
        }

        .state-icon.danger {
          color: var(--color-danger);
          background: rgba(220,70,70,0.1);
        }

        .state-icon.error {
          color: var(--color-danger);
          background: rgba(220,70,70,0.1);
        }

        .state-copy {
          min-width: 0;
        }

        .state-copy h2 {
          margin: 0;
          font-size: 20px;
          line-height: 1.2;
        }

        .state-copy p {
          margin: 9px 0 0;
          color: var(--color-text-muted);
          font-size: 13px;
          line-height: 1.6;
        }

        .retry-button {
          margin-top: 16px;
          padding: 10px 18px;
          border: 0;
          border-radius: 9px;
          background: var(--color-accent);
          color: #fff;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
        }

        .retry-button:hover {
          opacity: .9;
        }

        /* ─── RESPONSIVE ─── */
        @media (max-width: 1050px) {
          .dashboard-main-grid {
            grid-template-columns: 1fr;
          }

          .dashboard-metrics {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 720px) {
          .dashboard-page {
            padding: 16px;
          }

          .dashboard-header {
            flex-direction: column;
          }

          .dashboard-header-actions {
            width: 100%;
          }

          .dashboard-header-actions > * {
            flex: 1;
          }

          .dashboard-metrics {
            grid-template-columns: 1fr 1fr;
          }

          .selected-day {
            grid-template-columns: 1fr 1fr;
          }

          .modal-form-grid {
            grid-template-columns: 1fr;
          }

          .modal-field.full {
            grid-column: auto;
          }
        }

        @media (max-width: 480px) {
          .dashboard-metrics {
            grid-template-columns: 1fr;
          }

          .analytics-summary {
            grid-template-columns: 1fr;
          }

          .dashboard-state-card {
            flex-direction: column;
            text-align: center;
          }
        }
      `}</style>
    </div>
  )
}
