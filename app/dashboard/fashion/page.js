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
    const dayOrders = orders.filter(o => {
      if (!o.created_at) return false;
      return new Date(o.created_at).toISOString().split('T')[0] === key
    })
    // Chart shows Collected Revenue (amount_paid)
    const collected = dayOrders.reduce((s, o) => s + safeAmount(o.amount_paid), 0)
    result.push({ key, label: date.toLocaleDateString('en-NG', { weekday: 'short' }), orders: dayOrders.length, collected })
  }
  return result
}

function getAnalyticsSummary(orders) {
  const revenue = orders.reduce((s, o) => s + safeAmount(o.price), 0)
  const paid = orders.reduce((s, o) => s + safeAmount(o.amount_paid), 0)
  // Outstanding is price - amount_paid, ensuring it doesn't go below 0
  const outstanding = orders.reduce((s, o) => s + Math.max(0, safeAmount(o.price) - safeAmount(o.amount_paid)), 0)
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
        const balance = safeAmount(o.price) - safeAmount(o.amount_paid)
        return balance > 0 ||
          status === 'order placed' ||
          status === 'fitting' ||
          status === 'alteration'
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

// ============================================================
// DASHBOARD SHELL
// ============================================================
function DashboardShell({ children, theme }) {
  return (
    <main className="cresoa-dashboard cresoa-dashboard-force-mobile" data-theme={theme}>
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
  const [activePoint, setActivePoint] = useState(null)

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

  // ---- DEFINED VARIABLES (Fixes the ReferenceError) ----
  const series = useMemo(() => getDaySeries(orders, Number(period)), [orders, period])
  const summary = useMemo(() => getAnalyticsSummary(orders), [orders])
  const productionCounts = useMemo(() => getProductionCounts(orders), [orders])
  const actionItems = useMemo(() => getActionItems(orders, customers), [orders, customers])
  const groupsWithProgress = useMemo(() => getGroupProgress(groups, orders), [groups, orders])

  // ---- Analytics Data Transformation (100% Real Data) ----
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
    
    const collectedPercent = totalOrderValue > 0 ? (collected / totalOrderValue) * 100 : 0;
    const outstandingPercent = totalOrderValue > 0 ? (outstanding / totalOrderValue) * 100 : 0;

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

    return {
      totalOrderValue,
      collected,
      outstanding,
      orderCount,
      collectedPercent,
      outstandingPercent,
      chartData,
      maxRevenue,
      labelStep,
      hasOrders: orders.length > 0,
      hasFilteredOrders: filteredOrders.length > 0
    };
  }, [orders, period]);

  // SVG Chart Calculations
  const chartWidth = 100;
  const chartHeight = 40;
  
  const chartPoints = analytics.chartData.map((d, i) => {
    const x = analytics.chartData.length > 1 ? (i / (analytics.chartData.length - 1)) * chartWidth : chartWidth / 2;
    const y = chartHeight - (d.collected / analytics.maxRevenue) * chartHeight;
    return { x, y, value: d.collected, label: d.label, shortLabel: d.shortLabel };
  });

  const getSmoothPath = (pts) => {
    if (pts.length === 0) return '';
    if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i];
      const p1 = pts[i + 1];
      const cp1x = p0.x + (p1.x - p0.x) / 3;
      const cp1y = p0.y;
      const cp2x = p1.x - (p1.x - p0.x) / 3;
      const cp2y = p1.y;
      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p1.x} ${p1.y}`;
    }
    return d;
  };

  const linePath = getSmoothPath(chartPoints);
  const areaPath = `${linePath} L ${chartPoints.length > 0 ? chartPoints[chartPoints.length - 1].x : chartWidth} ${chartHeight} L ${chartPoints.length > 0 ? chartPoints[0].x : 0} ${chartHeight} Z`;

  // ---- Health Score ----
  const healthScoreData = useMemo(() => {
    if (analytics.totalOrderValue === 0 && analytics.orderCount === 0) return { score: 0, label: 'No Data', color: 'var(--cresoa-text-muted)' }
    
    const collectionRate = analytics.totalOrderValue > 0 ? (analytics.collected / analytics.totalOrderValue) : 0;
    const deliveredOrders = orders.filter(o => String(o.current_status || '').toLowerCase() === 'delivered').length;
    const completionRate = analytics.orderCount > 0 ? (deliveredOrders / analytics.orderCount) : 0;
    
    const score = Math.round(((collectionRate * 0.5) + (completionRate * 0.5)) * 100);
    
    let label = 'Needs Attention';
    let color = 'var(--cresoa-danger)';
    if (score >= 80) { label = 'Excellent'; color = 'var(--cresoa-success)' }
    else if (score >= 50) { label = 'Good'; color = 'var(--cresoa-warning, #D9A05B)' }
    
    return { score, label, color };
  }, [analytics, orders]);

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
        <div className="elegant-empty" style={{ padding: '24px 0', textAlign: 'center' }}>
          <h4 style={{ fontSize: 16, fontStyle: 'italic', marginBottom: 4 }}>No orders yet</h4>
          <p style={{ fontSize: 13, color: 'var(--cresoa-text-muted)' }}>Create your first order to get started.</p>
        </div>
      )
    }
    return ordersList.slice(0, 4).map(order => {
      const customerName = resolveCustomerName(order, customers)
      const orderRef = getOrderTitle(order)
      const displayName = `${orderRef} – ${customerName}`
      const initials = getInitials(customerName)
      return (
        <button key={order.id} onClick={() => order.id && navigate(`/dashboard/orders/${order.id}`)} className="atelier-row">
          <span className="cresoa-avatar" style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--cresoa-primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 'bold', flexShrink: 0 }}>{initials}</span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span className="title" style={{ display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{displayName}</span>
            <span className="sub">{order.created_at ? formatShortDate(order.created_at) : 'Unknown date'}</span>
          </span>
          <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
            <span className="figure atelier-mono">{formatMoney(order.price || 0)}</span>
            <StatusPill status={order.current_status || 'Order placed'} />
          </span>
        </button>
      )
    })
  }

  const renderCustomerRows = (customersList) => {
    if (!customersList || customersList.length === 0) {
      return (
        <div className="elegant-empty" style={{ padding: '24px 0', textAlign: 'center' }}>
          <h4 style={{ fontSize: 16, fontStyle: 'italic', marginBottom: 4 }}>No customers yet</h4>
          <p style={{ fontSize: 13, color: 'var(--cresoa-text-muted)' }}>Add customers to see them here.</p>
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
        <button key={customer.id} onClick={() => navigate(`/dashboard/customers/${customer.id}`)} className="atelier-row">
          <span className="cresoa-avatar" style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--cresoa-surface-muted)', color: 'var(--cresoa-text)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 'bold', flexShrink: 0 }}>{initials}</span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span className="title" style={{ display: 'block' }}>{name}</span>
            <span className="sub">{activeOrders > 0 ? `${activeOrders} active order${activeOrders > 1 ? 's' : ''}` : 'No active orders'}</span>
          </span>
          {totalSpent > 0 && <span className="figure atelier-mono">{formatMoney(totalSpent)}</span>}
        </button>
      )
    })
  }

  const renderGroupCards = (groupsList) => {
    return groupsList.slice(0, 4).map(group => {
      const coordinator = customers.find(c => c.id === group.coordinator_customer_id)
      const progress = group.progress
      return (
        <div key={group.id} onClick={() => navigate(`/dashboard/groups/${group.id}`)} className="atelier-row" style={{ alignItems: 'flex-start' }}>
          <span className="cresoa-group-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: '50%', background: 'var(--cresoa-surface-muted)', fontSize: 14, fontWeight: 'bold', flexShrink: 0 }}>
            {group.name ? group.name.charAt(0).toUpperCase() : 'G'}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <strong className="title" style={{ display: 'block' }}>{group.name}</strong>
            <div className="sub" style={{ marginTop: 4 }}>
              {coordinator ? coordinator.name : 'No coordinator set'}
              {group.due_date && ` — due ${formatShortDate(group.due_date)}`}
            </div>
            {progress !== null ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                <div style={{ height: 3, background: 'var(--cresoa-border)', flex: 1, maxWidth: 160 }}>
                  <div style={{ width: `${progress}%`, height: '100%', background: 'var(--cresoa-success)' }} />
                </div>
                <span className="figure atelier-mono">{progress}%</span>
              </div>
            ) : (
              <span className="sub" style={{ display: 'block', marginTop: 4 }}>Progress unavailable</span>
            )}
          </div>
        </div>
      )
    })
  }

  const kpiCards = [
    { label: 'Revenue', value: formatMoney(analytics.totalOrderValue), meta: 'Total order value', onClick: () => navigate('/dashboard/orders') },
    { label: 'Orders', value: String(analytics.orderCount), meta: 'Orders in period', onClick: () => navigate('/dashboard/orders') },
    { label: 'Collected', value: formatMoney(analytics.collected), meta: `${Math.round(analytics.collectedPercent)}% of total`, onClick: () => navigate('/dashboard/orders?filter=payments') },
    { label: 'Outstanding', value: formatMoney(analytics.outstanding), meta: `${Math.round(analytics.outstandingPercent)}% of total`, onClick: () => navigate('/dashboard/orders?filter=attention') },
  ]

  return (
    <DashboardShell theme={theme}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,340;9..144,460;9..144,560&family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600&display=swap');

        .atelier-shell { font-family: 'IBM Plex Sans', var(--cresoa-font, sans-serif); }
        .atelier-serif { font-family: 'Fraunces', Georgia, serif; }
        .atelier-mono { font-family: 'IBM Plex Mono', ui-monospace, monospace; }

        .atelier-masthead {
          display: grid;
          grid-template-columns: 1fr auto;
          align-items: end;
          gap: 16px;
          padding: 20px 16px 18px;
          border-bottom: 1px solid var(--cresoa-border);
        }
        .atelier-masthead h1 {
          font-weight: 460;
          font-size: clamp(28px, 8vw, 40px);
          line-height: 1.02;
          letter-spacing: -0.01em;
          color: var(--cresoa-text);
          margin: 0;
        }
        .atelier-masthead .tag {
          font-size: 11px;
          letter-spacing: 0.06em;
          color: var(--cresoa-text-muted);
        }
        .atelier-controls { display: flex; gap: 8px; align-items: center; }

        .atelier-kpi {
          display: grid;
          grid-template-columns: 1.6fr 1fr;
          gap: 0;
          border-bottom: 1px solid var(--cresoa-border);
        }
        .atelier-kpi-hero {
          padding: 22px 16px 22px 16px;
          border-right: 1px solid var(--cresoa-border);
          cursor: pointer;
          background: none;
          border-top: none; border-bottom: none; border-left: none;
          text-align: left;
          display: block;
        }
        .atelier-kpi-hero .label {
          font-size: 12px;
          color: var(--cresoa-text-muted);
          font-family: 'IBM Plex Mono', monospace;
        }
        .atelier-kpi-hero .value {
          font-family: 'Fraunces', Georgia, serif;
          font-weight: 460;
          font-size: clamp(32px, 9vw, 46px);
          color: var(--cresoa-text);
          line-height: 1.05;
          margin: 6px 0 4px;
          letter-spacing: -0.01em;
        }
        .atelier-kpi-hero .meta {
          font-size: 12px;
          color: var(--cresoa-text-muted);
        }
        .atelier-kpi-side {
          display: flex;
          flex-direction: column;
        }
        .atelier-kpi-side button {
          flex: 1;
          border: none;
          border-bottom: 1px solid var(--cresoa-border);
          background: none;
          text-align: left;
          padding: 14px 16px;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }
        .atelier-kpi-side button:last-child { border-bottom: none; }
        .atelier-kpi-side .label {
          font-size: 11px;
          color: var(--cresoa-text-muted);
          font-family: 'IBM Plex Mono', monospace;
        }
        .atelier-kpi-side .value {
          font-family: 'IBM Plex Mono', monospace;
          font-weight: 600;
          font-size: 15px;
          color: var(--cresoa-text);
          margin-top: 3px;
        }
        .atelier-kpi-side .meta {
          font-size: 10px;
          color: var(--cresoa-text-muted);
          margin-top: 2px;
        }
        @media (max-width: 420px) {
          .atelier-kpi { grid-template-columns: 1fr; }
          .atelier-kpi-hero { border-right: none; border-bottom: 1px solid var(--cresoa-border); }
        }

        .atelier-pipeline {
          display: flex;
          align-items: stretch;
          overflow-x: auto;
        }
        .atelier-pipeline-stage {
          flex: 1;
          min-width: 78px;
          border: none;
          background: none;
          border-right: 1px solid var(--cresoa-border);
          padding: 14px 10px;
          text-align: left;
          cursor: pointer;
        }
        .atelier-pipeline-stage:last-child { border-right: none; }
        .atelier-pipeline-stage .n {
          font-family: 'Fraunces', Georgia, serif;
          font-weight: 460;
          font-size: 26px;
          color: var(--cresoa-text);
          display: block;
        }
        .atelier-pipeline-stage .label {
          font-size: 11px;
          color: var(--cresoa-text-muted);
          margin-top: 2px;
          display: block;
        }

        .atelier-row {
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
          border: none;
          background: none;
          text-align: left;
          cursor: pointer;
          padding: 13px 0;
          border-bottom: 1px solid var(--cresoa-border);
        }
        .atelier-row:last-child { border-bottom: none; }
        .atelier-row .title { font-size: 13px; font-weight: 600; color: var(--cresoa-text); }
        .atelier-row .sub { font-size: 11px; color: var(--cresoa-text-muted); margin-top: 2px; }
        .atelier-row .figure { font-family: 'IBM Plex Mono', monospace; font-size: 12px; color: var(--cresoa-text); white-space: nowrap; }
      `}</style>
      <div style={{ maxWidth: 600, margin: '0 auto', paddingBottom: 80, width: '100%' }} className="atelier-shell">

        <Navigation businessId={businessId} />

        <header className="atelier-masthead">
          <div>
            <h1 className="atelier-serif">{business?.name || 'Your business'}</h1>
            <p className="tag atelier-mono" style={{ marginTop: 8 }}>
              {new Date().toLocaleDateString('en-NG', { weekday: 'long', day: 'numeric', month: 'short' })} — good morning
            </p>
          </div>
          <div className="atelier-controls">
            <button onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')} className="cresoa-icon-button" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34, border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-surface)', cursor: 'pointer' }}>
              <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={16} />
            </button>
            <button onClick={refresh} className="cresoa-icon-button" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34, border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-surface)', cursor: 'pointer' }}>
              <Icon name="refresh-cw" size={16} />
            </button>
            <button onClick={() => navigate('/dashboard/orders/new')} className="cresoa-primary-button" style={{ height: 34, padding: '0 14px', fontSize: 13, fontWeight: 600 }}>
              + New order
            </button>
          </div>
        </header>

        {/* KPI LEDGER — one hero figure (revenue), three ledger lines beside it */}
        <div className="atelier-kpi" style={{ marginBottom: 16 }}>
          <button onClick={kpiCards[0].onClick} className="atelier-kpi-hero">
            <span className="label">{kpiCards[0].label}</span>
            <strong className="value">{kpiCards[0].value}</strong>
            <span className="meta">{kpiCards[0].meta}</span>
          </button>
          <div className="atelier-kpi-side">
            {kpiCards.slice(1).map(card => (
              <button key={card.label} onClick={card.onClick}>
                <span className="label">{card.label}</span>
                <span className="value">{card.value}</span>
                <span className="meta">{card.meta}</span>
              </button>
            ))}
          </div>
        </div>

        {/* BUSINESS HEALTH SCORE */}
        <div style={{ padding: '0 16px', marginBottom: 16 }}>
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--cresoa-text)' }}>Business Health Score</h3>
              <span style={{ fontSize: 14, fontWeight: 800, color: healthScoreData.color }}>{healthScoreData.score}%</span>
            </div>
            <div style={{ height: 10, background: 'var(--cresoa-border)', borderRadius: 99, overflow: 'hidden', marginBottom: 8 }}>
              <div style={{ width: `${healthScoreData.score}%`, height: '100%', background: healthScoreData.color, borderRadius: 99, transition: 'width 0.5s ease' }} />
            </div>
            <p style={{ fontSize: 12, color: 'var(--cresoa-text-muted)' }}>
              {healthScoreData.label} — Based on collection rate and delivery completion.
            </p>
          </Card>
        </div>

        {/* Action Center */}
        <div style={{ marginTop: 16, padding: '0 16px' }}>
          <Card>
            <SectionHeader title="Action Required" subtitle={`${actionItems.length} items need attention`} action="View all" onAction={() => navigate('/dashboard/orders')} />
            <ActionCenter items={actionItems} onActionClick={handleActionClick} onViewAll={() => navigate('/dashboard/orders')} />
          </Card>
        </div>

        {/* Production Pipeline */}
        <div style={{ marginTop: 16, padding: '0 16px' }}>
          <Card>
            <SectionHeader title="Production" subtitle="What's moving through your workshop" />
            <div className="atelier-pipeline">
              {PRODUCTION_STAGES.map(stage => (
                <button key={stage} onClick={() => navigate(`/dashboard/orders?status=${encodeURIComponent(stage)}`)} className="atelier-pipeline-stage">
                  <span className="n atelier-serif">{productionCounts[stage] || 0}</span>
                  <span className="label">{stage}</span>
                </button>
              ))}
            </div>
          </Card>
        </div>

        {/* ========================================== */}
        {/* ANALYTICS SECTION (REAL DATA, SVG CHART)   */}
        {/* ========================================== */}
        <div style={{ marginTop: 24, padding: '0 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 }}>
            <h2 className="atelier-serif" style={{ fontSize: 20, fontWeight: 460, color: 'var(--cresoa-text)' }}>Analytics</h2>
            <select 
              className="cresoa-select" 
              value={period} 
              onChange={e => setPeriod(e.target.value)} 
              style={{ fontSize: 12, background: 'var(--cresoa-surface)', border: '1px solid var(--cresoa-border)', padding: '6px 12px', borderRadius: 8, color: 'var(--cresoa-text)', fontWeight: 600, cursor: 'pointer' }}
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
            </select>
          </div>

          <Card>
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20 }}>
                <div>
                  <span className="atelier-mono" style={{ fontSize: 12, color: 'var(--cresoa-text-muted)' }}>Revenue</span>
                  <strong className="atelier-serif" style={{ display: 'block', fontSize: 30, fontWeight: 460, color: 'var(--cresoa-text)', marginTop: 4 }}>{formatMoney(analytics.collected)}</strong>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: 12, color: 'var(--cresoa-text-muted)' }}>{analytics.orderCount} orders</span>
                </div>
              </div>
              
              {/* SVG Line Chart */}
              {!analytics.hasOrders ? (
                <div style={{ height: 140, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid var(--cresoa-border)', color: 'var(--cresoa-text-muted)', fontSize: 13, fontStyle: 'italic' }}>
                  <span>No sales data yet.</span>
                  <span style={{ fontSize: 11, marginTop: 4 }}>Your analytics will appear here once customers start placing orders.</span>
                </div>
              ) : !analytics.hasFilteredOrders ? (
                <div style={{ height: 140, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid var(--cresoa-border)', color: 'var(--cresoa-text-muted)', fontSize: 13, fontStyle: 'italic' }}>
                  <span>No revenue in this period.</span>
                  <span style={{ fontSize: 11, marginTop: 4 }}>Try a longer period to see more activity.</span>
                </div>
              ) : (
                <div style={{ position: 'relative', height: 140 }}>
                  {/* Y-Axis Labels */}
                  <div style={{ position: 'absolute', top: 0, left: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%', fontSize: 10, color: 'var(--cresoa-text-muted)', width: 40 }}>
                    <span>{formatMoney(analytics.maxRevenue)}</span>
                    <span>₦0</span>
                  </div>
                  
                  {/* Chart Area */}
                  <div style={{ marginLeft: 40, height: '100%', position: 'relative' }}>
                    <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} preserveAspectRatio="none" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                      <defs>
                        <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--cresoa-primary)" stopOpacity="0.2" />
                          <stop offset="100%" stopColor="var(--cresoa-primary)" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      {/* Horizontal Grid Lines */}
                      <line x1="0" y1="0" x2={chartWidth} y2="0" stroke="var(--cresoa-border)" strokeWidth="0.5" vectorEffect="non-scaling-stroke" />
                      <line x1="0" y1={chartHeight / 2} x2={chartWidth} y2={chartHeight / 2} stroke="var(--cresoa-border)" strokeWidth="0.5" vectorEffect="non-scaling-stroke" />
                      <line x1="0" y1={chartHeight} x2={chartWidth} y2={chartHeight} stroke="var(--cresoa-border)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
                      
                      {/* Area Fill */}
                      <path d={areaPath} fill="url(#chartGradient)" />
                      {/* Smooth Line */}
                      <path d={linePath} fill="none" stroke="var(--cresoa-primary)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
                      
                      {/* Interactive Data Points */}
                      {chartPoints.map((p, i) => (
                        <circle 
                          key={i} 
                          cx={p.x} 
                          cy={p.y} 
                          r="3" 
                          fill={activePoint === i ? 'var(--cresoa-primary)' : 'var(--cresoa-surface)'} 
                          stroke="var(--cresoa-primary)" 
                          strokeWidth="1.5"
                          style={{ cursor: 'pointer' }}
                          onMouseEnter={() => setActivePoint(i)}
                          onMouseLeave={() => setActivePoint(null)}
                          onClick={() => setActivePoint(i)}
                        />
                      ))}
                    </svg>
                    
                    {/* Tooltip */}
                    {activePoint !== null && chartPoints[activePoint] && (
                      <div style={{ position: 'absolute', top: `${(chartPoints[activePoint].y / chartHeight) * 100}%`, left: `${(chartPoints[activePoint].x / chartWidth) * 100}%`, transform: 'translate(-50%, -120%)', background: 'var(--cresoa-text)', color: 'var(--cresoa-surface)', padding: '6px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap', zIndex: 10, pointerEvents: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
                        <div style={{ fontSize: 10, opacity: 0.8, marginBottom: 2 }}>{chartPoints[activePoint].label}</div>
                        <div>{formatMoney(chartPoints[activePoint].value)}</div>
                      </div>
                    )}
                  </div>

                  {/* X-Axis Labels */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, padding: '0 0 0 40px' }}>
                    {chartPoints.filter((_, i) => i % analytics.labelStep === 0 || i === chartPoints.length - 1).map((point, i) => (
                      <span key={i} className="atelier-mono" style={{ fontSize: 10, color: 'var(--cresoa-text-muted)' }}>
                        {point.shortLabel}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Financial Health */}
            <div style={{ borderTop: '1px solid var(--cresoa-border)', paddingTop: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--cresoa-text)', marginBottom: 16 }}>Financial Health</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                    <span style={{ color: 'var(--cresoa-text-muted)' }}>Collected</span>
                    <span style={{ fontWeight: 700, color: 'var(--cresoa-text)' }}>{formatMoney(analytics.collected)} <span style={{ color: 'var(--cresoa-text-muted)', fontWeight: 400 }}>({Math.round(analytics.collectedPercent)}%)</span></span>
                  </div>
                  <div style={{ height: 8, background: 'var(--cresoa-border)', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ width: `${analytics.collectedPercent}%`, height: '100%', background: 'var(--cresoa-success)', borderRadius: 99, transition: 'width 0.5s ease' }} />
                  </div>
                </div>
                
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                    <span style={{ color: 'var(--cresoa-text-muted)' }}>Outstanding</span>
                    <span style={{ fontWeight: 700, color: 'var(--cresoa-danger)' }}>{formatMoney(analytics.outstanding)} <span style={{ color: 'var(--cresoa-text-muted)', fontWeight: 400 }}>({Math.round(analytics.outstandingPercent)}%)</span></span>
                  </div>
                  <div style={{ height: 8, background: 'var(--cresoa-border)', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ width: `${analytics.outstandingPercent}%`, height: '100%', background: 'var(--cresoa-danger)', borderRadius: 99, transition: 'width 0.5s ease' }} />
                  </div>
                </div>
              </div>
              
              {analytics.outstanding > 0 && (
                <div style={{ marginTop: 16, padding: '10px 12px', background: 'var(--cresoa-danger-soft)', borderRadius: 8, color: 'var(--cresoa-danger)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 8, fontWeight: 500 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--cresoa-danger)', display: 'inline-block' }}></span>
                  {formatMoney(analytics.outstanding)} outstanding across {analytics.orderCount} orders
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Recent Orders & Customers – Stacked Vertically for Mobile */}
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

        {/* Group Orders */}
        <div style={{ marginTop: 16, padding: '0 16px' }}>
          <Card>
            <SectionHeader title="Group Orders" action="View" onAction={() => navigate('/dashboard/groups')} />
            <SafeRender fallback={<div style={{ padding: '16px', textAlign: 'center' }}><p style={{ color: 'var(--cresoa-text-muted)' }}>Couldn't load groups</p><button onClick={handleRetry} className="cresoa-primary-button" style={{ marginTop: 8 }}>Try again</button></div>}>
              {groupsWithProgress.length === 0 ? (
                <div className="elegant-empty" style={{ padding: '24px 0', textAlign: 'center' }}>
                  <h4 style={{ fontSize: 16, fontStyle: 'italic', marginBottom: 4 }}>No group orders</h4>
                  <p style={{ fontSize: 13, color: 'var(--cresoa-text-muted)', marginBottom: 20 }}>Create a group to manage coordinated outfits.</p>
                  <button 
                    onClick={() => navigate('/dashboard/groups/new')} 
                    className="cresoa-primary-button" 
                    style={{ width: '100%', maxWidth: 280, padding: '12px 24px', fontSize: 14, fontWeight: 600, borderRadius: 8, margin: '0 auto', display: 'block' }}
                  >
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
