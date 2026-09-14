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
        return safeAmount(o.balance) > 0 ||
          status === 'order placed' ||
          status === 'fitting' ||
          status === 'alteration'
      })
      .slice(0, 5)
      .map(o => {
        const customerName = resolveCustomerName(o, customers)
        const orderRef = getOrderTitle(o)
        const displayName = `${orderRef} – ${customerName}`
        return {
          id: o.id || 'unknown',
          customerName: displayName,
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

  if (loading) return <DashboardShell theme={theme}><div style={{ padding: 40, textAlign: 'center', color: 'var(--cresoa-text-muted)' }}>Loading dashboard...</div></DashboardShell>
  if (error) return <DashboardShell theme={theme}><Card><p>Error: {error}</p><button onClick={refresh} className="cresoa-primary-button" style={{ marginTop: 12 }}>Retry</button></Card></DashboardShell>

  // ---- Render functions ----
  const renderOrderRows = (ordersList) => {
    if (!ordersList || ordersList.length === 0) {
      return (
        <div className="elegant-empty">
          <h4>No orders yet</h4>
          <p>Create your first order to get started.</p>
        </div>
      )
    }
    return ordersList.slice(0, 4).map(order => {
      const customerName = resolveCustomerName(order, customers)
      const orderRef = getOrderTitle(order)
      const displayName = `${orderRef} – ${customerName}`
      const initials = getInitials(customerName)
      return (
        <button key={order.id} onClick={() => order.id && navigate(`/dashboard/orders/${order.id}`)} className="cresoa-list-row compact" style={{ width: '100%', border: 'none', background: 'transparent', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--cresoa-border)', textAlign: 'left', cursor: 'pointer' }}>
          <span className="cresoa-avatar" style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--cresoa-primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 'bold' }}>{initials}</span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span className="cresoa-row-title" style={{ display: 'block', fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{displayName}</span>
            <span className="cresoa-row-meta" style={{ display: 'block', fontSize: 11, color: 'var(--cresoa-text-muted)', marginTop: 2 }}>
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
      return (
        <div className="elegant-empty">
          <h4>No customers yet</h4>
          <p>Add customers to see them here.</p>
        </div>
      )
    }
    return customersList.slice(0, 4).map(customer => {
      const name = customer.name || 'Unnamed'
      const customerOrders = orders ? orders.filter(o => o.customer_id === customer.id) : []
      const totalSpent = customerOrders.reduce((sum, o) => sum + safeAmount(o.price), 0)
      const activeOrders = customerOrders.filter(o => o.current_status !== 'Delivered').length
      const initials = getInitials(name)
      return (
        <button key={customer.id} onClick={() => navigate(`/dashboard/customers/${customer.id}`)} className="cresoa-list-row compact" style={{ width: '100%', border: 'none', background: 'transparent', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--cresoa-border)', textAlign: 'left', cursor: 'pointer' }}>
          <span className="cresoa-avatar" style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--cresoa-surface-muted)', color: 'var(--cresoa-text)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 'bold' }}>{initials}</span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span className="cresoa-row-title" style={{ display: 'block', fontWeight: 600, fontSize: 13 }}>{name}</span>
            <span className="cresoa-row-meta" style={{ display: 'block', fontSize: 11, color: 'var(--cresoa-text-muted)', marginTop: 2 }}>
              {activeOrders > 0 ? `${activeOrders} active order${activeOrders > 1 ? 's' : ''}` : 'No active orders'}
              {totalSpent > 0 && ` · ${formatMoney(totalSpent)}`}
            </span>
          </span>
          <span className="cresoa-row-arrow" style={{ fontSize: 18, color: 'var(--cresoa-text-muted)' }}>›</span>
        </button>
      )
    })
  }

  const renderGroupCards = (groupsList) => {
    return groupsList.slice(0, 4).map(group => {
      const coordinator = customers.find(c => c.id === group.coordinator_customer_id)
      const progress = group.progress
      return (
        <div key={group.id} className="cresoa-group-card" onClick={() => navigate(`/dashboard/groups/${group.id}`)} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--cresoa-border)' }}>
          <span className="cresoa-group-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: '50%', background: 'var(--cresoa-surface-muted)', fontSize: 14, fontWeight: 'bold', flexShrink: 0 }}>
            {group.name ? group.name.charAt(0).toUpperCase() : 'G'}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <strong className="cresoa-row-title" style={{ fontSize: 13, fontWeight: 600 }}>{group.name}</strong>
            <div className="cresoa-row-meta" style={{ fontSize: 11, color: 'var(--cresoa-text-muted)', marginTop: 4 }}>
              {progress !== null ? (
                <>
                  <div style={{ height: 4, background: 'var(--cresoa-border)', borderRadius: 99, marginTop: 4, marginBottom: 4, width: '100%', maxWidth: 200 }}>
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
          <span className="cresoa-row-arrow" style={{ fontSize: 18, color: 'var(--cresoa-text-muted)' }}>›</span>
        </div>
      )
    })
  }

  // ---- Analytics & Chart Calculations ----
  const maxRevenue = Math.max(...series.map(d => safeAmount(d.revenue)), 1)
  const totalRevenue = series.reduce((s, d) => s + safeAmount(d.revenue), 0)
  const totalOrders = series.reduce((s, d) => s + safeAmount(d.orders), 0)

  const chartWidth = 100
  const chartHeight = 40
  const points = series.map((d, i) => {
    const x = series.length > 1 ? (i / (series.length - 1)) * chartWidth : chartWidth / 2
    const y = chartHeight - (safeAmount(d.revenue) / maxRevenue) * chartHeight
    return { x, y, value: d.revenue, label: d.label }
  })
  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  const areaPath = `${linePath} L ${chartWidth} ${chartHeight} L 0 ${chartHeight} Z`

  const labelStep = Math.ceil(series.length / 5)
  
  const kpiCards = [
    { label: 'Revenue', value: formatMoney(summary.revenue), trend: '↑ 14.2% vs last month', meta: 'Total order value', onClick: () => navigate('/dashboard/orders') },
    { label: 'Orders', value: String(summary.orders), trend: '↑ 3 today', meta: 'Orders in period', onClick: () => navigate('/dashboard/orders') },
    { label: 'Collected', value: formatMoney(summary.paid), trend: `${summary.orders ? Math.round((summary.paid / summary.revenue) * 100) : 0}% collected`, meta: 'Payments received', onClick: () => navigate('/dashboard/orders?filter=payments') },
    { label: 'Outstanding', value: formatMoney(summary.outstanding), trend: `${summary.outstanding > 0 ? '3 need action' : 'All clear'}`, meta: 'Balance to collect', onClick: () => navigate('/dashboard/orders?filter=attention') },
  ]

  const collectedPercent = summary.revenue ? Math.min((summary.paid / summary.revenue) * 100, 100) : 0
  const outstandingPercent = summary.revenue ? Math.min((summary.outstanding / summary.revenue) * 100, 100) : 0

  return (
    <DashboardShell theme={theme}>
      <div style={{ maxWidth: 600, margin: '0 auto', paddingBottom: 80, width: '100%' }}>

        <Navigation businessId={businessId} />

        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, padding: '16px 16px 0' }}>
          <div>
            <p style={{ color: 'var(--cresoa-text-muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Cresoa Fashion</p>
            <h1 style={{ fontSize: 'clamp(24px, 6vw, 32px)', fontWeight: 700, color: 'var(--cresoa-text)', marginTop: 4, lineHeight: 1.1 }}>
              {business?.name || 'Your business'}
            </h1>
            <p style={{ color: 'var(--cresoa-text-muted)', fontSize: 13, marginTop: 6 }}>Good morning 👋 <br /> {new Date().toLocaleDateString('en-NG', { weekday: 'short', day: 'numeric', month: 'short' })}</p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')} className="cresoa-icon-button" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: 8, border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-surface)', cursor: 'pointer' }}>
              <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={18} />
            </button>
            <button onClick={refresh} className="cresoa-icon-button" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: 8, border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-surface)', cursor: 'pointer' }}>
              <Icon name="refresh-cw" size={18} />
            </button>
            <button onClick={() => navigate('/dashboard/orders/new')} className="cresoa-primary-button" style={{ height: 36, padding: '0 16px', fontSize: 13, fontWeight: 600 }}>
              + New Order
            </button>
          </div>
        </header>

           {/* STANDARD 2x2 KPI GRID (JAKOB'S LAW) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, padding: '0 16px', marginBottom: 16 }}>
          {kpiCards.map(card => (
            <button key={card.label} onClick={card.onClick} className="cresoa-metric-card" style={{ display: 'flex', flexDirection: 'column', padding: '16px 12px', border: '1px solid var(--cresoa-border)', borderRadius: 12, background: 'var(--cresoa-surface)', textAlign: 'left', cursor: 'pointer' }}>
              <span className="cresoa-metric-label" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--cresoa-text-muted)', fontWeight: 600 }}>{card.label}</span>
              <strong className="cresoa-metric-value" style={{ fontSize: 18, fontWeight: 800, color: 'var(--cresoa-text)', margin: '6px 0' }}>{card.value}</strong>
              <span className="cresoa-metric-trend" style={{ fontSize: 10, color: card.label === 'Outstanding' ? 'var(--cresoa-danger)' : 'var(--cresoa-success)', fontWeight: 600 }}>{card.trend}</span>
              <span className="cresoa-metric-meta" style={{ fontSize: 10, color: 'var(--cresoa-text-muted)', marginTop: 4 }}>{card.meta}</span>
            </button>
          ))}
        </div>

        <div style={{ marginTop: 16, padding: '0 16px' }}>
          <Card>
            <SectionHeader title="Action Required" subtitle={`${actionItems.length} items need attention`} action="View all" onAction={() => navigate('/dashboard/orders')} />
            <ActionCenter items={actionItems} onActionClick={handleActionClick} onViewAll={() => navigate('/dashboard/orders')} />
          </Card>
        </div>

        <div style={{ marginTop: 16, padding: '0 16px' }}>
          <Card>
            <SectionHeader title="Production" subtitle="What's moving through your workshop" />
            <div className="cresoa-pipeline">
              {PRODUCTION_STAGES.map((stage, idx) => (
                <button key={stage} onClick={() => navigate(`/dashboard/orders?status=${encodeURIComponent(stage)}`)} className="cresoa-pipeline-item">
                  <span className="cresoa-pipeline-number" style={{ fontWeight: 800, fontSize: 16 }}>{productionCounts[stage] || 0}</span>
                  <span className="cresoa-pipeline-label" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{stage}</span>
                  {idx < PRODUCTION_STAGES.length - 1 && <span className="cresoa-pipeline-line" />}
                </button>
              ))}
            </div>
          </Card>
        </div>

        <div style={{ marginTop: 24, padding: '0 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--cresoa-text)', letterSpacing: '-0.3px' }}>Analytics</h2>
            <select className="cresoa-select" value={period} onChange={e => setPeriod(e.target.value)} style={{ fontSize: 12, background: 'transparent', border: 'none', color: 'var(--cresoa-text-muted)', fontWeight: 600, cursor: 'pointer' }}>
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
            </select>
          </div>

          <Card>
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20 }}>
                <div>
                  <span style={{ fontSize: 12, color: 'var(--cresoa-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Revenue</span>
                  <strong style={{ display: 'block', fontSize: 26, fontWeight: 800, color: 'var(--cresoa-text)', marginTop: 4, letterSpacing: '-0.5px' }}>{formatMoney(totalRevenue)}</strong>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: 12, color: 'var(--cresoa-text-muted)' }}>{totalOrders} orders</span>
                  <span style={{ display: 'block', fontSize: 12, color: 'var(--cresoa-success)', fontWeight: 600, marginTop: 2 }}>↑ 18% vs previous</span>
                </div>
              </div>
              
              {totalRevenue === 0 ? (
                <div style={{ height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid var(--cresoa-border)', color: 'var(--cresoa-text-muted)', fontSize: 13, fontStyle: 'italic' }}>
                  No revenue recorded for this period.
                </div>
              ) : (
                <div style={{ width: '100%', height: 100, position: 'relative' }}>
                  <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} preserveAspectRatio="none" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                    <defs>
                      <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--cresoa-primary)" stopOpacity="0.2" />
                        <stop offset="100%" stopColor="var(--cresoa-primary)" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path d={areaPath} fill="url(#chartGradient)" />
                    <path d={linePath} fill="none" stroke="var(--cresoa-primary)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
                    {points.map((p, i) => (
                      <circle key={i} cx={p.x} cy={p.y} r="2" fill="var(--cresoa-primary)" />
                    ))}
                  </svg>
                </div>
              )}
              
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, padding: '0 4px' }}>
                {series.filter((_, i) => i % labelStep === 0 || i === series.length - 1).map((day, i) => (
                  <span key={day.key} style={{ fontSize: 10, color: 'var(--cresoa-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {day.label}
                  </span>
                ))}
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--cresoa-border)', paddingTop: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--cresoa-text)', marginBottom: 16 }}>Financial Health</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                    <span style={{ color: 'var(--cresoa-text-muted)' }}>Collected</span>
                    <span style={{ fontWeight: 700, color: 'var(--cresoa-text)' }}>{formatMoney(summary.paid)} <span style={{ color: 'var(--cresoa-text-muted)', fontWeight: 400 }}>({Math.round(collectedPercent)}%)</span></span>
                  </div>
                  <div style={{ height: 8, background: 'var(--cresoa-border)', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ width: `${collectedPercent}%`, height: '100%', background: 'var(--cresoa-success)', borderRadius: 99, transition: 'width 0.5s ease' }} />
                  </div>
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                    <span style={{ color: 'var(--cresoa-text-muted)' }}>Outstanding</span>
                    <span style={{ fontWeight: 700, color: 'var(--cresoa-danger)' }}>{formatMoney(summary.outstanding)} <span style={{ color: 'var(--cresoa-text-muted)', fontWeight: 400 }}>({Math.round(outstandingPercent)}%)</span></span>
                  </div>
                  <div style={{ height: 8, background: 'var(--cresoa-border)', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ width: `${outstandingPercent}%`, height: '100%', background: 'var(--cresoa-danger)', borderRadius: 99, transition: 'width 0.5s ease' }} />
                  </div>
                </div>
              </div>
              {summary.outstanding > 0 && (
                <div style={{ marginTop: 16, padding: '10px 12px', background: 'var(--cresoa-danger-soft)', borderRadius: 8, color: 'var(--cresoa-danger)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 8, fontWeight: 500 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--cresoa-danger)', display: 'inline-block' }}></span>
                  {formatMoney(summary.outstanding)} outstanding across {summary.orders} orders
                </div>
              )}
            </div>
          </Card>
        </div>

        <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 16, padding: '0 16px' }}>
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

        <div style={{ marginTop: 16, padding: '0 16px' }}>
          <Card>
            <SectionHeader title="Group Orders" action="View" onAction={() => navigate('/dashboard/groups')} />
            <SafeRender fallback={<div style={{ padding: '16px', textAlign: 'center' }}><p style={{ color: 'var(--cresoa-text-muted)' }}>Couldn't load groups</p><button onClick={handleRetry} className="cresoa-primary-button" style={{ marginTop: 8 }}>Try again</button></div>}>
              {groupsWithProgress.length === 0 ? (
                <div className="elegant-empty">
                  <h4>No group orders</h4>
                  <p>Create a group to manage coordinated outfits.</p>
                  <button onClick={() => navigate('/dashboard/groups/new')} className="cresoa-primary-button" style={{ marginTop: 16, padding: '10px 20px', fontSize: 13, fontWeight: 600 }}>
                    + New Group Order
                  </button>
                </div>
              ) : (
                renderGroupCards(groupsWithProgress)
              )}
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
