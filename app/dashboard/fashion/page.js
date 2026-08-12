'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useDashboardData } from '../../../lib/hooks/useDashboardData'
import { formatMoney, formatShortDate, getInitials, safeAmount, getCustomerName } from '../../../lib/utils'
import { getOrderCustomerName } from '../../../lib/order-helpers'
import { PRODUCTION_STAGES } from '../../../lib/constants'

import { Card } from '../../../components/Card'
import { SectionHeader } from '../../../components/SectionHeader'
import { StatusPill } from '../../../components/StatusPill'
import { DashboardLoading } from '../../../components/Loading'
import { EmptyState } from '../../../components/EmptyState'
import { ActionCenter } from '../../../components/ActionCenter'
import { Navigation } from '../../../components/Navigation'

const THEME_STORAGE_KEY = 'cresoa-theme'

// ============================================================
// HELPERS
// ============================================================
function getDaySeries(orders, days = 7) {
  const result = []
  const today = new Date()
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today)
    date.setHours(0,0,0,0)
    date.setDate(today.getDate() - i)
    const key = date.toISOString().split('T')[0]
    const dayOrders = orders.filter(o => new Date(o.created_at).toISOString().split('T')[0] === key)
    const revenue = dayOrders.reduce((s, o) => s + safeAmount(o.price), 0)
    result.push({ key, label: date.toLocaleDateString('en-NG', { weekday: 'short' }), orders: dayOrders.length, revenue })
  }
  return result
}

function getAnalyticsSummary(orders) {
  const revenue = orders.reduce((s, o) => s + safeAmount(o.price), 0)
  const paid = orders.reduce((s, o) => s + safeAmount(o.amount_paid), 0)
  const outstanding = orders.reduce((s, o) => s + safeAmount(o.balance), 0)
  return { revenue, paid, outstanding, orders: orders.length }
}

function getProductionCounts(orders) {
  const counts = {}
  PRODUCTION_STAGES.forEach(s => counts[s] = 0)
  orders.forEach(o => {
    const status = String(o.current_status || '').trim()
    if (counts[status] !== undefined) counts[status]++
  })
  return counts
}

// ---- Robust customer name resolver ----
function resolveCustomerName(order, customers) {
  if (!order) return 'Unknown Customer'
  // First, check if order has a customer_name directly
  if (order.customer_name && order.customer_name !== 'Unknown customer' && order.customer_name !== 'Unnamed customer') {
    return order.customer_name
  }
  // Try to find by customer_id with string conversion
  if (order.customer_id) {
    const customer = customers.find(c => String(c.id) === String(order.customer_id))
    if (customer) {
      const name = getCustomerName(customer)
      if (name && name !== 'Unknown customer' && name !== 'Unnamed customer') {
        return name
      }
    }
  }
  // Fallback
  return 'Unknown Customer'
}

function getActionItems(orders, customers) {
  if (!Array.isArray(orders) || !Array.isArray(customers)) return []
  try {
    return orders
      .filter(o => o && typeof o === 'object')
      .filter(o => {
        const status = String(o.current_status || '').toLowerCase()
        return safeAmount(o.balance) > 0 ||
          status === 'order placed' ||
          status === 'fitting' ||
          status === 'alteration'
      })
      .slice(0, 5)
      .map(o => {
        const name = resolveCustomerName(o, customers)
        return {
          id: o.id || 'unknown',
          customerName: name,
          amount: o.balance || 0,
          reason: o.balance > 0 ? 'Payment overdue' : 'Awaiting action',
          status: o.current_status || 'Unknown',
          actionLabel: o.balance > 0 ? 'Collect payment' : 'View order',
          order: o
        }
      })
  } catch (e) {
    console.error('getActionItems error:', e)
    return []
  }
}

function getGroupProgress(groups, orders) {
  if (!Array.isArray(groups) || !Array.isArray(orders)) return []
  return groups.map(group => {
    const groupOrders = orders.filter(o => o.group_order_id === group.id)
    const total = groupOrders.length
    const delivered = groupOrders.filter(o => String(o.current_status || '').toLowerCase() === 'delivered').length
    const progress = total === 0 ? null : Math.round((delivered / total) * 100)
    return { ...group, totalOrders: total, deliveredOrders: delivered, progress }
  })
}

// ============================================================
// DASHBOARD SHELL
// ============================================================
function DashboardShell({ children, theme }) {
  return (
    <main className="cresoa-dashboard" data-theme={theme}>
      <div className="cresoa-dashboard-shell">{children}</div>
    </main>
  )
}

function SafeRender({ children, fallback = null }) {
  try { return children } catch (e) { console.error('Render error:', e); return fallback }
}

// ============================================================
// MAIN DASHBOARD
// ============================================================
function FashionDashboard({ businessId }) {
  const router = useRouter()
  const { orders, customers, groups, business, loading, refreshing, error, refresh } = useDashboardData(businessId)
  const [theme, setTheme] = useState('light')
  const [period, setPeriod] = useState('7')

  useEffect(() => {
    const saved = localStorage.getItem(THEME_STORAGE_KEY)
    const initial = saved === 'dark' ? 'dark' : 'light'
    setTheme(initial)
    document.documentElement.dataset.theme = initial
  }, [])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem(THEME_STORAGE_KEY, theme)
  }, [theme])

  const series = useMemo(() => getDaySeries(orders, Number(period)), [orders, period])
  const summary = useMemo(() => getAnalyticsSummary(orders), [orders])
  const productionCounts = useMemo(() => getProductionCounts(orders), [orders])
  const actionItems = useMemo(() => getActionItems(orders, customers), [orders, customers])
  const groupsWithProgress = useMemo(() => getGroupProgress(groups, orders), [groups, orders])

  const navigate = (path) => {
    const sep = path.includes('?') ? '&' : '?'
    router.push(`${path}${sep}business_id=${businessId}`)
  }

  const handleActionClick = (item) => {
    if (item?.order?.id) navigate(`/dashboard/orders/${item.order.id}`)
  }

  const handleRetry = () => refresh()

  if (loading) return <DashboardShell theme={theme}><DashboardLoading /></DashboardShell>
  if (error) return <DashboardShell theme={theme}><Card><p>Error: {error}</p><button onClick={refresh}>Retry</button></Card></DashboardShell>

  // ---- Render functions (using robust name resolver) ----
  const renderOrderRows = (ordersList) => {
    if (!ordersList || ordersList.length === 0) {
      return <EmptyState title="No orders" message="Create your first order to get started." />
    }
    return ordersList.slice(0, 4).map(order => {
      const name = resolveCustomerName(order, customers)
      const orderId = order.id || `temp-${Math.random()}`
      return (
        <button key={orderId} onClick={() => order.id && navigate(`/dashboard/orders/${order.id}`)} className="cresoa-list-row compact">
          <span className="cresoa-avatar">{getInitials(name)}</span>
          <span style={{ flex: 1, textAlign: 'left' }}>
            <span className="cresoa-row-title">{name}</span>
            <span className="cresoa-row-meta">
              {order.created_at ? formatShortDate(order.created_at) : 'Unknown date'} · {formatMoney(order.price || 0)}
            </span>
          </span>
          <StatusPill status={order.current_status || 'Order placed'} />
        </button>
      )
    })
  }

  const renderCustomerRows = (customersList) => {
    if (!customersList || customersList.length === 0) {
      return <EmptyState title="No customers" message="Add customers to see them here." />
    }
    return customersList.slice(0, 4).map(customer => {
      const name = customer.name || 'Unnamed'
      const customerOrders = orders ? orders.filter(o => o.customer_id === customer.id) : []
      const totalSpent = customerOrders.reduce((sum, o) => sum + safeAmount(o.price), 0)
      const activeOrders = customerOrders.filter(o => o.current_status !== 'Delivered').length
      return (
        <button key={customer.id} onClick={() => navigate(`/dashboard/customers/${customer.id}`)} className="cresoa-list-row compact">
          <span className="cresoa-avatar">{getInitials(name)}</span>
          <span style={{ flex: 1, textAlign: 'left' }}>
            <span className="cresoa-row-title">{name}</span>
            <span className="cresoa-row-meta">
              {activeOrders > 0 ? `${activeOrders} active order${activeOrders > 1 ? 's' : ''}` : 'No active orders'}
              {totalSpent > 0 && ` · ${formatMoney(totalSpent)}`}
            </span>
          </span>
          <span className="cresoa-row-arrow">›</span>
        </button>
      )
    })
  }

  const renderGroupCards = (groupsList) => {
    if (!groupsList || groupsList.length === 0) {
      return <EmptyState title="No group orders" message="Create a group to manage coordinated outfits." />
    }
    return groupsList.slice(0, 4).map(group => {
      const coordinator = customers.find(c => c.id === group.coordinator_customer_id)
      const progress = group.progress
      return (
        <div key={group.id} className="cresoa-group-card" onClick={() => navigate(`/dashboard/groups/${group.id}`)}>
          <span className="cresoa-group-icon">✦</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <strong className="cresoa-row-title">{group.name}</strong>
            <div className="cresoa-row-meta">
              {progress !== null ? (
                <>
                  <div style={{ height: 6, background: 'var(--cresoa-border)', borderRadius: 99, marginTop: 4 }}>
                    <div style={{ width: `${progress}%`, height: '100%', background: 'var(--cresoa-success)', borderRadius: 99 }} />
                  </div>
                  <span>{progress}% complete</span>
                </>
              ) : (
                <span>Progress unavailable</span>
              )}
              {coordinator && ` · ${coordinator.name}`}
              {group.due_date && ` · Due ${formatShortDate(group.due_date)}`}
            </div>
          </div>
          <span className="cresoa-row-arrow">›</span>
        </div>
      )
    })
  }

  // ---- Chart ----
  const maxRevenue = Math.max(...series.map(d => safeAmount(d.revenue)), 1)
  const totalRevenue = series.reduce((s, d) => s + safeAmount(d.revenue), 0)
  const totalOrders = series.reduce((s, d) => s + safeAmount(d.orders), 0)

  // ---- Inline KPI (2×2) ----
  const kpiCards = [
    { label: 'Revenue', value: formatMoney(summary.revenue), trend: '↑ 14.2%', meta: 'Total order value', icon: '₦', onClick: () => navigate('/dashboard/orders') },
    { label: 'Orders', value: String(summary.orders), trend: '↑ 3 today', meta: 'Orders in period', icon: '◫', onClick: () => navigate('/dashboard/orders') },
    { label: 'Collected', value: formatMoney(summary.paid), trend: `${summary.orders ? Math.round((summary.paid / summary.revenue) * 100) : 0}% collected`, meta: 'Payments received', icon: '✓', onClick: () => navigate('/dashboard/orders?filter=payments') },
    { label: 'Outstanding', value: formatMoney(summary.outstanding), trend: `${summary.outstanding > 0 ? '3 need action' : 'All clear'}`, meta: 'Balance to collect', icon: '!', onClick: () => navigate('/dashboard/orders?filter=attention') },
  ]

  // ---- Inline Financial Health ----
  const collectedPercent = summary.revenue ? Math.min((summary.paid / summary.revenue) * 100, 100) : 0
  const outstandingPercent = summary.revenue ? Math.min((summary.outstanding / summary.revenue) * 100, 100) : 0

  return (
    <DashboardShell theme={theme}>
      <div style={{ maxWidth: 800, margin: '0 auto', paddingBottom: 80 }}>

        <Navigation businessId={businessId} />

        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <p style={{ color: 'var(--cresoa-text-muted)', fontSize: 12 }}>Cresoa Fashion</p>
            <h1 style={{ fontSize: 'clamp(22px, 5vw, 30px)', fontWeight: 850, color: 'var(--cresoa-text)' }}>
              {business?.name || 'Your business'}
            </h1>
            <p style={{ color: 'var(--cresoa-text-muted)' }}>Good morning 👋</p>
            <p style={{ color: 'var(--cresoa-text-muted)', fontSize: 12 }}>{new Date().toLocaleDateString('en-NG', { weekday: 'short', day: 'numeric', month: 'short' })}</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')} className="cresoa-icon-button">{theme === 'dark' ? '☀' : '☾'}</button>
            <button onClick={refresh} className="cresoa-icon-button">↻</button>
            <button onClick={() => navigate('/dashboard/orders/new')} className="cresoa-primary-button">+ New Order</button>
          </div>
        </header>

        {/* KPI 2×2 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {kpiCards.map(card => (
            <button key={card.label} type="button" onClick={card.onClick} className="cresoa-metric-card">
              <span className="cresoa-metric-icon">{card.icon}</span>
              <span style={{ minWidth: 0 }}>
                <span className="cresoa-metric-label">{card.label}</span>
                <strong className="cresoa-metric-value">{card.value}</strong>
                <span className="cresoa-metric-trend" style={{ display: 'block', fontSize: 11, color: 'var(--cresoa-success)' }}>{card.trend}</span>
                <span className="cresoa-metric-meta">{card.meta}</span>
              </span>
            </button>
          ))}
        </div>

        {/* Action Center */}
        <div style={{ marginTop: 16 }}>
          <Card>
            <SectionHeader
              title="Action Required"
              subtitle={`${actionItems.length} item${actionItems.length > 1 ? 's' : ''} need your attention`}
              action="View all"
              onAction={() => navigate('/dashboard/orders')}
            />
            <ActionCenter
              items={actionItems}
              onActionClick={handleActionClick}
              onViewAll={() => navigate('/dashboard/orders')}
            />
          </Card>
        </div>

        {/* Production Pipeline */}
        <div style={{ marginTop: 16 }}>
          <Card>
            <SectionHeader title="Production" subtitle="What's moving through your workshop" />
            <div className="cresoa-pipeline">
              {PRODUCTION_STAGES.map((stage, idx) => (
                <button key={stage} onClick={() => navigate(`/dashboard/orders?status=${encodeURIComponent(stage)}`)} className="cresoa-pipeline-item">
                  <span className="cresoa-pipeline-number">{productionCounts[stage] || 0}</span>
                  <span className="cresoa-pipeline-label">{stage}</span>
                  {idx < PRODUCTION_STAGES.length - 1 && <span className="cresoa-pipeline-line" />}
                </button>
              ))}
            </div>
          </Card>
        </div>

        {/* Performance Chart */}
        <div style={{ marginTop: 16 }}>
          <Card>
            <SectionHeader title="Performance" subtitle="Daily performance" />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
              <div>
                <strong style={{ fontSize: 22 }}>{formatMoney(totalRevenue)}</strong>
                <span style={{ marginLeft: 8, color: 'var(--cresoa-text-muted)' }}>{totalOrders} orders</span>
                <span style={{ display: 'block', fontSize: 12, color: 'var(--cresoa-success)' }}>↑ 18% vs previous</span>
              </div>
              <select className="cresoa-select" value={period} onChange={e => setPeriod(e.target.value)}>
                <option value="7">7 days</option>
                <option value="30">30 days</option>
                <option value="90">90 days</option>
              </select>
            </div>
            <div className="cresoa-chart" style={{ minHeight: 120 }}>
              {series.map(day => {
                const height = Math.max((safeAmount(day.revenue) / maxRevenue) * 100, day.revenue ? 4 : 1)
                return (
                  <div key={day.key} className="cresoa-chart-day">
                    <div className="cresoa-chart-bar-wrap">
                      <div className="cresoa-chart-value">{day.revenue > 0 ? formatMoney(day.revenue) : ''}</div>
                      <div className="cresoa-chart-bar" style={{ height: height+'%' }} />
                    </div>
                    <span>{day.label}</span>
                  </div>
                )
              })}
            </div>
          </Card>
        </div>

        {/* Inline Financial Health */}
        <div style={{ marginTop: 16 }}>
          <Card>
            <SectionHeader title="Financial Health" />
            <div style={{ display: 'grid', gap: 16 }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                  <span style={{ color: 'var(--cresoa-text-muted)' }}>Revenue</span>
                  <strong>{formatMoney(summary.revenue)}</strong>
                </div>
                <div style={{ height: 6, background: 'var(--cresoa-border)', borderRadius: 99, marginTop: 4 }}>
                  <div style={{ width: '100%', height: '100%', background: 'var(--gradient-accent)', borderRadius: 99 }} />
                </div>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                  <span style={{ color: 'var(--cresoa-text-muted)' }}>Collected</span>
                  <div>
                    <strong>{formatMoney(summary.paid)}</strong>
                    <span style={{ marginLeft: 8, color: 'var(--cresoa-text-muted)' }}>({Math.round(collectedPercent)}%)</span>
                  </div>
                </div>
                <div style={{ height: 6, background: 'var(--cresoa-border)', borderRadius: 99, marginTop: 4 }}>
                  <div style={{ width: `${collectedPercent}%`, height: '100%', background: 'var(--cresoa-success)', borderRadius: 99 }} />
                </div>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                  <span style={{ color: 'var(--cresoa-text-muted)' }}>Outstanding</span>
                  <div>
                    <strong>{formatMoney(summary.outstanding)}</strong>
                    <span style={{ marginLeft: 8, color: 'var(--cresoa-text-muted)' }}>({Math.round(outstandingPercent)}%)</span>
                  </div>
                </div>
                <div style={{ height: 6, background: 'var(--cresoa-border)', borderRadius: 99, marginTop: 4 }}>
                  <div style={{ width: `${outstandingPercent}%`, height: '100%', background: 'var(--cresoa-danger)', borderRadius: 99 }} />
                </div>
              </div>
              {summary.outstanding > 0 && (
                <div style={{ padding: '8px 12px', background: 'var(--cresoa-danger-soft)', borderRadius: 8, color: 'var(--cresoa-danger)' }}>
                  ⚠ {formatMoney(summary.outstanding)} outstanding across {summary.orders} orders
                </div>
              )}
            </div>
          </Card>
        </div>

           {/* Recent Orders & Customers – 2-col */}
        <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Card>
            <SectionHeader title="Recent Orders" action="View" onAction={() => navigate('/dashboard/orders')} />
            <SafeRender fallback={<div style={{ padding: '16px', textAlign: 'center' }}><p style={{ color: 'var(--cresoa-text-muted)' }}>Couldn't load orders</p><button onClick={handleRetry} className="cresoa-primary-button" style={{ marginTop: 8 }}>Try again</button></div>}>
              {renderOrderRows(orders)}
            </SafeRender>
          </Card>

          <Card>
            <SectionHeader title="Recent Customers" action="View" onAction={() => navigate('/dashboard/customers')} />
            <SafeRender fallback={<div style={{ padding: '16px', textAlign: 'center' }}><p style={{ color: 'var(--cresoa-text-muted)' }}>Couldn't load customers</p><button onClick={handleRetry} className="cresoa-primary-button" style={{ marginTop: 8 }}>Try again</button></div>}>
              {renderCustomerRows(customers)}
            </SafeRender>
          </Card>
        </div>

        <div style={{ marginTop: 16 }}>
          <Card>
            <SectionHeader title="Group Orders" action="View" onAction={() => navigate('/dashboard/groups')} />
            <SafeRender fallback={<div style={{ padding: '16px', textAlign: 'center' }}><p style={{ color: 'var(--cresoa-text-muted)' }}>Couldn't load groups</p><button onClick={handleRetry} className="cresoa-primary-button" style={{ marginTop: 8 }}>Try again</button></div>}>
              {renderGroupCards(groupsWithProgress)}
            </SafeRender>
          </Card>
        </div>

        <div style={{ marginTop: 24, paddingBottom: 'env(safe-area-inset-bottom)' }}>
          <Navigation businessId={businessId} />
        </div>

      </div>
    </DashboardShell>
  )
}

// ============================================================
// ENTRY
// ============================================================
export default function Page() {
  const searchParams = useSearchParams()
  const businessId = searchParams?.get('business_id') || searchParams?.get('businessId') || null

  if (!businessId) {
    return (
      <DashboardShell theme="light">
        <Card><h2>Business account required</h2><p>Select a business to view its dashboard.</p></Card>
      </DashboardShell>
    )
  }

  return <FashionDashboard businessId={businessId} />
}
