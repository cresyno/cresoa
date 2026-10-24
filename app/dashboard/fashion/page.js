'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useDashboardData } from '../../../lib/hooks/useDashboardData'
import { formatMoney, formatShortDate, safeAmount } from '../../../lib/utils'
import { PRODUCTION_STAGES } from '../../../lib/constants'
import { Icon } from '../../../components/Icon'
import { Card } from '../../../components/Card'
import { SectionHeader } from '../../../components/SectionHeader'
import { StatusPill } from '../../../components/StatusPill'
import { ActionCenter } from '../../../components/ActionCenter'
import { Navigation } from '../../../components/Navigation'
import '../../../globals.css'

const THEME_STORAGE_KEY = 'cresoa-theme'

// ============================================================
// HELPERS (UNTOUCHED LOGIC)
// ============================================================
function getInitials(name) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
  if (parts.length >= 2) return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase()
  return name.charAt(0).toUpperCase()
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

function resolveCustomerName(order, customers) {
  if (!order) return 'Unknown Customer'
  if (order.customer_name && order.customer_name !== 'Unknown customer' && order.customer_name !== 'Unnamed customer') {
    return order.customer_name
  }
  if (order.customer_id) {
    const customer = customers.find(c => String(c.id) === String(order.customer_id))
    if (customer) {
      const name = customer.full_name || customer.name || `${customer.first_name || ''} ${customer.last_name || ''}`.trim()
      if (name && name !== 'Unknown customer' && name !== 'Unnamed customer') return name
    }
  }
  return 'Unknown Customer'
}

function getOrderTitle(order) {
  if (order.title) return order.title
  if (order.order_title) return order.order_title
  return `Order #${order.id?.slice(0,6) || '?'}`
}

function getActionItems(orders, customers) {
  if (!Array.isArray(orders) || !Array.isArray(customers)) return []
  try {
    return orders
      .filter(o => o && typeof o === 'object')
      .filter(o => {
        const status = String(o.current_status || '').toLowerCase()
        const balance = safeAmount(o.price) - safeAmount(o.amount_paid)
        return balance > 0 || status === 'order placed' || status === 'fitting' || status === 'alteration'
      })
      .slice(0, 5)
      .map(o => {
        const customerName = resolveCustomerName(o, customers)
        const orderRef = getOrderTitle(o)
        const displayName = `${orderRef} – ${customerName}`
        const balance = Math.max(0, safeAmount(o.price) - safeAmount(o.amount_paid))
        return {
          id: o.id || 'unknown',
          customerName: displayName,
          amount: balance,
          reason: balance > 0 ? 'Payment overdue' : 'Awaiting action',
          status: o.current_status || 'Unknown',
          actionLabel: balance > 0 ? 'Collect payment' : 'View order',
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

  const { currentMonthOrders, previousMonthOrders } = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    const current = orders.filter(o => {
      if (!o.created_at) return false;
      const d = new Date(o.created_at);
      return d >= startOfMonth && d <= endOfMonth;
    });

    const previous = orders.filter(o => {
      if (!o.created_at) return false;
      const d = new Date(o.created_at);
      return d >= startOfPrevMonth && d <= endOfPrevMonth;
    });

    return { currentMonthOrders: current, previousMonthOrders: previous };
  }, [orders]);

  const currentMonthSummary = useMemo(() => {
    const revenue = currentMonthOrders.reduce((s, o) => s + safeAmount(o.price), 0)
    const paid = currentMonthOrders.reduce((s, o) => s + safeAmount(o.amount_paid), 0)
    const outstanding = currentMonthOrders.reduce((s, o) => s + Math.max(0, safeAmount(o.price) - safeAmount(o.amount_paid)), 0)
    return { revenue, paid, outstanding, orders: currentMonthOrders.length }
  }, [currentMonthOrders]);

  const previousMonthSummary = useMemo(() => {
    const revenue = previousMonthOrders.reduce((s, o) => s + safeAmount(o.price), 0)
    const paid = previousMonthOrders.reduce((s, o) => s + safeAmount(o.amount_paid), 0)
    const outstanding = previousMonthOrders.reduce((s, o) => s + Math.max(0, safeAmount(o.price) - safeAmount(o.amount_paid)), 0)
    return { revenue, paid, outstanding, orders: previousMonthOrders.length }
  }, [previousMonthOrders]);

  const getTrend = (current, previous) => {
    if (previous === 0 && current === 0) return { text: 'No activity', color: 'var(--cresoa-text-muted)' };
    if (previous === 0 && current > 0) return { text: '↑ New this month', color: 'var(--cresoa-success)' };
    const change = ((current - previous) / previous) * 100;
    if (change > 0) return { text: `↑ ${change.toFixed(1)}%`, color: 'var(--cresoa-success)' };
    if (change < 0) return { text: `↓ ${Math.abs(change).toFixed(1)}%`, color: 'var(--cresoa-danger)' };
    return { text: `0%`, color: 'var(--cresoa-text-muted)' };
  };

  const revenueTrend = getTrend(currentMonthSummary.revenue, previousMonthSummary.revenue);
  const ordersTrend = getTrend(currentMonthSummary.orders, previousMonthSummary.orders);
  const collectedTrend = getTrend(currentMonthSummary.paid, previousMonthSummary.paid);
  const outstandingTrend = getTrend(currentMonthSummary.outstanding, previousMonthSummary.outstanding);

  const healthScoreData = useMemo(() => {
    if (currentMonthSummary.revenue === 0 && currentMonthSummary.orders === 0) {
      return { score: 0, label: 'No Data', color: 'var(--cresoa-text-muted)' };
    }
    const rawCollectionRate = currentMonthSummary.revenue > 0 ? (currentMonthSummary.paid / currentMonthSummary.revenue) : 0;
    const collectionRate = Math.min(Math.max(rawCollectionRate, 0), 1);
    const currentMonthDeliveredCount = currentMonthOrders.filter(o => String(o.current_status || '').toLowerCase() === 'delivered').length;
    const rawCompletionRate = currentMonthSummary.orders > 0 ? (currentMonthDeliveredCount / currentMonthSummary.orders) : 0;
    const completionRate = Math.min(Math.max(rawCompletionRate, 0), 1);
    const rawScore = ((collectionRate * 0.5) + (completionRate * 0.5)) * 100;
    const score = Math.min(Math.round(rawScore), 100);

    let label = 'Needs Attention';
    let color = 'var(--cresoa-danger)';
    if (score >= 80) { label = 'Excellent'; color = 'var(--cresoa-success)'; }
    else if (score >= 50) { label = 'Good'; color = 'var(--cresoa-warning, #D9A05B)'; }

    return { score, label, color };
  }, [currentMonthSummary, currentMonthOrders]);

  const analytics = useMemo(() => {
    const daysMap = { '7': 7, '30': 30, '90': 90 };
    const days = daysMap[period] || 7;
    const now = new Date();
    const startDate = new Date(now.getTime() - (days - 1) * 24 * 60 * 60 * 1000);
    startDate.setHours(0, 0, 0, 0);

    const filteredOrders = orders.filter(o => {
      if (!o.created_at) return false;
      return new Date(o.created_at) >= startDate;
    });

    const totalOrderValue = filteredOrders.reduce((sum, o) => sum + safeAmount(o.price), 0);
    const collected = filteredOrders.reduce((sum, o) => sum + safeAmount(o.amount_paid), 0);
    const outstanding = filteredOrders.reduce((sum, o) => sum + Math.max(0, safeAmount(o.price) - safeAmount(o.amount_paid)), 0);
    const orderCount = filteredOrders.length;
    
    const collectedPercent = totalOrderValue > 0 ? Math.min((collected / totalOrderValue) * 100, 100) : 0;
    const outstandingPercent = totalOrderValue > 0 ? Math.min((outstanding / totalOrderValue) * 100, 100) : 0;

    const chartData = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      chartData.push({
        dateStr,
        label: d.toLocaleDateString('en-NG', { day: 'numeric', month: 'short' }),
        shortLabel: d.toLocaleDateString('en-NG', { weekday: 'short' }),
        collected: 0,
        orders: 0
      });
    }

    filteredOrders.forEach(o => {
      const dateStr = new Date(o.created_at).toISOString().split('T')[0];
      const dayObj = chartData.find(d => d.dateStr === dateStr);
      if (dayObj) {
        dayObj.collected += safeAmount(o.amount_paid);
        dayObj.orders += 1;
      }
    });

    const maxRevenue = Math.max(...chartData.map(d => d.collected), 1);
    const labelStep = Math.max(Math.ceil(days / 6), 1);

    return { totalOrderValue, collected, outstanding, orderCount, collectedPercent, outstandingPercent, chartData, maxRevenue, labelStep, hasOrders: orders.length > 0, hasFilteredOrders: filteredOrders.length > 0 };
  }, [orders, period]);

  const chartPoints = analytics.chartData.map((d) => {
    const heightPct = analytics.maxRevenue > 0 ? (d.collected / analytics.maxRevenue) * 100 : 0;
    return {
      label: d.label,
      shortLabel: d.shortLabel,
      height: `${Math.max(heightPct, 2)}%`,
      value: d.collected,
      hasData: d.collected > 0
    };
  });

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

  if (loading) return <DashboardShell theme={theme}><div style={{ padding: 40, textAlign: 'center', color: 'var(--cresoa-text-muted)' }}>Loading dashboard...</div></DashboardShell>
  if (error) return <DashboardShell theme={theme}><Card><p>Error: {error}</p><button onClick={refresh} className="cresoa-primary-button" style={{ marginTop: 12 }}>Retry</button></Card></DashboardShell>

  const kpiCards = [
    { label: 'Revenue', value: formatMoney(currentMonthSummary.revenue), trend: revenueTrend, meta: 'Total order value', onClick: () => navigate('/dashboard/orders') },
    { label: 'Orders', value: String(currentMonthSummary.orders), trend: ordersTrend, meta: 'Orders in period', onClick: () => navigate('/dashboard/orders') },
    { label: 'Collected', value: formatMoney(currentMonthSummary.paid), trend: collectedTrend, meta: `${currentMonthSummary.revenue > 0 ? Math.min(Math.round((currentMonthSummary.paid / currentMonthSummary.revenue) * 100), 100) : 0}% of total`, onClick: () => navigate('/dashboard/orders?filter=payments') },
    { label: 'Outstanding', value: formatMoney(currentMonthSummary.outstanding), trend: outstandingTrend, meta: `${currentMonthSummary.revenue > 0 ? Math.min(Math.round((currentMonthSummary.outstanding / currentMonthSummary.revenue) * 100), 100) : 0}% of total`, onClick: () => navigate('/dashboard/orders?filter=attention') },
  ]

  return (
    <DashboardShell theme={theme}>
      <div className="dashboard-page">
        <Navigation businessId={businessId} />

        {/* ─── HEADER ─── */}
        <header className="dashboard-header">
          <div>
            <p className="dashboard-eyebrow">Cresoa Fashion</p>
            <h1 className="dashboard-title">{business?.name || 'Your business'}</h1>
            <p className="dashboard-subtitle">Good morning 👋 · {new Date().toLocaleDateString('en-NG', { weekday: 'short', day: 'numeric', month: 'short' })}</p>
          </div>
          <div className="dashboard-header-actions">
            <button onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')} className="dashboard-icon-btn">
              <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={18} />
            </button>
            <button onClick={refresh} className="dashboard-icon-btn">
              <Icon name="refresh-cw" size={18} />
            </button>
            <button onClick={() => navigate('/dashboard/orders/new')} className="cresoa-primary-button">
              + New Order
            </button>
          </div>
        </header>

        {/* ─── KPI GRID (2x2 Clean Layout) ─── */}
        <div className="dashboard-kpi-grid">
          {kpiCards.map((card, idx) => (
            <button key={card.label} onClick={card.onClick} className="dashboard-kpi-card">
              <span className="kpi-label">{card.label}</span>
              <strong className="kpi-value">{card.value}</strong>
              <div className="kpi-footer">
                <span className="kpi-trend" style={{ color: card.trend.color }}>{card.trend.text}</span>
                <span className="kpi-meta">{card.meta}</span>
              </div>
            </button>
          ))}
        </div>

        {/* ─── BUSINESS HEALTH (Merged) ─── */}
        <Card className="dashboard-card">
          <div className="health-header">
            <h3 className="section-title">Business Health Score</h3>
            <span className="health-score" style={{ color: healthScoreData.color }}>{healthScoreData.score}%</span>
          </div>
          <div className="health-bar-bg">
            <div className="health-bar-fill" style={{ width: `${healthScoreData.score}%`, background: healthScoreData.color }} />
          </div>
          <p className="health-desc">
            {healthScoreData.label} — Based on collection rate and delivery completion.
          </p>
        </Card>

        {/* ─── ACTION CENTER ─── */}
        <Card className="dashboard-card">
          <SectionHeader title="Action Required" subtitle={`${actionItems.length} items need attention`} action="View all" onAction={() => navigate('/dashboard/orders')} />
          <ActionCenter items={actionItems} onActionClick={handleActionClick} onViewAll={() => navigate('/dashboard/orders')} />
        </Card>

        {/* ─── PRODUCTION PIPELINE ─── */}
        <Card className="dashboard-card">
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

        {/* ─── ANALYTICS CHART ─── */}
        <Card className="dashboard-card">
          <div className="analytics-header">
            <h2 className="section-title">Analytics</h2>
            <select className="cresoa-select" value={period} onChange={e => setPeriod(e.target.value)}>
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
            </select>
          </div>

          <div className="analytics-summary">
            <div>
              <span className="summary-label">Revenue</span>
              <strong className="summary-value">{formatMoney(analytics.collected)}</strong>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span className="summary-label">{analytics.orderCount} orders</span>
            </div>
          </div>
          
          {/* Chart */}
          <div className="chart-container">
            {!analytics.hasOrders ? (
              <div className="chart-empty">No sales data yet.</div>
            ) : !analytics.hasFilteredOrders ? (
              <div className="chart-empty">No revenue in this period.</div>
            ) : (
              <>
                <div className="chart-y-axis">
                  <span>{formatMoney(analytics.maxRevenue)}</span>
                  <span>₦0</span>
                </div>
                <div className="chart-bars">
                  {chartPoints.map((point, i) => (
                    <div key={i} className="chart-bar-wrapper">
                      <div className="chart-bar" style={{ height: point.height, background: point.hasData ? 'var(--color-accent)' : 'var(--cresoa-border)' }} />
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
          <div className="chart-x-axis">
            {chartPoints.filter((_, i) => i % analytics.labelStep === 0 || i === chartPoints.length - 1).map((point, i) => (
              <span key={i}>{point.shortLabel}</span>
            ))}
          </div>

          <div className="financial-health-section">
            <h3 className="section-title">Financial Health</h3>
            <div className="financial-bars">
              <div>
                <div className="financial-row">
                  <span>Collected</span>
                  <span>{formatMoney(analytics.collected)} ({Math.round(analytics.collectedPercent)}%)</span>
                </div>
                <div className="financial-bar-bg">
                  <div className="financial-bar-fill success" style={{ width: `${analytics.collectedPercent}%` }} />
                </div>
              </div>
              <div>
                <div className="financial-row">
                  <span>Outstanding</span>
                  <span style={{ color: 'var(--cresoa-danger)' }}>{formatMoney(analytics.outstanding)} ({Math.round(analytics.outstandingPercent)}%)</span>
                </div>
                <div className="financial-bar-bg">
                  <div className="financial-bar-fill danger" style={{ width: `${analytics.outstandingPercent}%` }} />
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* ─── RECENT LISTS ─── */}
        <Card className="dashboard-card">
          <SectionHeader title="Recent Orders" action="View" onAction={() => navigate('/dashboard/orders')} />
          <SafeRender fallback={<p>Couldn't load orders</p>}>
            {orders.slice(0, 4).map(order => {
              const customerName = resolveCustomerName(order, customers)
              return (
                <div key={order.id} onClick={() => navigate(`/dashboard/orders/${order.id}`)} className="dashboard-list-item">
                  <span className="cresoa-avatar">{getInitials(customerName)}</span>
                  <div className="list-item-content">
                    <span className="list-item-title">{getOrderTitle(order)} – {customerName}</span>
                    <span className="list-item-meta">{formatShortDate(order.created_at)} · {formatMoney(order.price)}</span>
                  </div>
                  <StatusPill status={order.current_status || 'Order placed'} />
                </div>
              )
            })}
          </SafeRender>
        </Card>

        <Card className="dashboard-card">
          <SectionHeader title="Recent Customers" action="View" onAction={() => navigate('/dashboard/customers')} />
          <SafeRender fallback={<p>Couldn't load customers</p>}>
            {customers.slice(0, 4).map(customer => {
              const name = customer.name || 'Unnamed'
              return (
                <div key={customer.id} onClick={() => navigate(`/dashboard/customers/${customer.id}`)} className="dashboard-list-item">
                  <span className="cresoa-avatar">{getInitials(name)}</span>
                  <div className="list-item-content">
                    <span className="list-item-title">{name}</span>
                    <span className="list-item-meta">{customer.phone || 'No phone'}</span>
                  </div>
                  <Icon name="chevron-right" size={16} />
                </div>
              )
            })}
          </SafeRender>
        </Card>

        <div style={{ marginTop: '2rem' }}>
          <Navigation businessId={businessId} />
        </div>
      </div>
    </DashboardShell>
  )
}

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
