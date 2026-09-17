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

  // ============================================================
  // 1. CURRENT MONTH & PREVIOUS MONTH DATA (For KPI Cards & Health Score)
  // ============================================================
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

  // Calculate dynamic trends for KPI cards
  const getTrend = (current, previous) => {
    if (previous === 0 && current === 0) return { text: 'No activity', color: 'var(--cresoa-text-muted)' };
    if (previous === 0 && current > 0) return { text: '↑ New this month', color: 'var(--cresoa-success)' };
    const change = ((current - previous) / previous) * 100;
    if (change > 0) return { text: `↑ ${change.toFixed(1)}% vs last month`, color: 'var(--cresoa-success)' };
    if (change < 0) return { text: `↓ ${Math.abs(change).toFixed(1)}% vs last month`, color: 'var(--cresoa-danger)' };
    return { text: `0% vs last month`, color: 'var(--cresoa-text-muted)' };
  };

  const revenueTrend = getTrend(currentMonthSummary.revenue, previousMonthSummary.revenue);
  const ordersTrend = getTrend(currentMonthSummary.orders, previousMonthSummary.orders);
  const collectedTrend = getTrend(currentMonthSummary.paid, previousMonthSummary.paid);
  const outstandingTrend = getTrend(currentMonthSummary.outstanding, previousMonthSummary.outstanding);

  // ============================================================
  // 2. BUSINESS HEALTH SCORE (STRICTLY CAPPED AT 100%)
  // ============================================================
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

  // ============================================================
  // 3. ANALYTICS DATA (For the Stick Chart - controlled by period selector)
  // ============================================================
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
        <button key={order.id} onClick={() => order.id && navigate(`/dashboard/orders/${order.id}`)} className="cresoa-list-row compact" style={{ width: '100%', border: 'none', background: 'transparent', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--cresoa-border)', textAlign: 'left', cursor: 'pointer' }}>
          <span className="cresoa-avatar" style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--cresoa-primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 'bold', flexShrink: 0 }}>{initials}</span>
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
        <button key={customer.id} onClick={() => navigate(`/dashboard/customers/${customer.id}`)} className="cresoa-list-row compact" style={{ width: '100%', border: 'none', background: 'transparent', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--cresoa-border)', textAlign: 'left', cursor: 'pointer' }}>
          <span className="cresoa-avatar" style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--cresoa-surface-muted)', color: 'var(--cresoa-text)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 'bold', flexShrink: 0 }}>{initials}</span>
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

  // ============================================================
  // KPI CARDS CONFIGURATION (Hardcoded Inline Styles)
  // ============================================================
  const kpiCards = [
    { 
      label: 'Revenue', 
      value: formatMoney(currentMonthSummary.revenue), 
      trend: revenueTrend,
      meta: 'Total order value', 
      onClick: () => navigate('/dashboard/orders')
    },
    { 
      label: 'Orders', 
      value: String(currentMonthSummary.orders), 
      trend: ordersTrend,
      meta: 'Orders in period', 
      onClick: () => navigate('/dashboard/orders') 
    },
    { 
      label: 'Collected', 
      value: formatMoney(currentMonthSummary.paid), 
      trend: collectedTrend,
      meta: `${currentMonthSummary.revenue > 0 ? Math.min(Math.round((currentMonthSummary.paid / currentMonthSummary.revenue) * 100), 100) : 0}% of total`, 
      onClick: () => navigate('/dashboard/orders?filter=payments') 
    },
    { 
      label: 'Outstanding', 
      value: formatMoney(currentMonthSummary.outstanding), 
      trend: outstandingTrend,
      meta: `${currentMonthSummary.revenue > 0 ? Math.min(Math.round((currentMonthSummary.outstanding / currentMonthSummary.revenue) * 100), 100) : 0}% of total`, 
      onClick: () => navigate('/dashboard/orders?filter=attention') 
    },
  ]

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

        {/* HARDCODED CARD ARRANGEMENT (Impossible for global CSS to break) */}
        <div style={{ display: 'flex', gap: 10, padding: '0 16px', marginBottom: 16, flexDirection: 'row' }}>
          
          {/* Left Column: Revenue (Spans full height) */}
          <div style={{ flex: 1.2, display: 'flex', flexDirection: 'column' }}>
            <button onClick={kpiCards[0].onClick} className="cresoa-metric-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '16px 14px', border: '1px solid var(--cresoa-border)', borderRadius: 12, background: 'var(--cresoa-surface)', textAlign: 'left', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
              <span className="cresoa-metric-label" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--cresoa-text-muted)', fontWeight: 600 }}>{kpiCards[0].label}</span>
              <strong className="cresoa-metric-value" style={{ fontSize: 20, fontWeight: 800, color: 'var(--cresoa-text)', letterSpacing: '-0.5px', margin: '8px 0' }}>{kpiCards[0].value}</strong>
              <div>
                <span className="cresoa-metric-trend" style={{ fontSize: 10, color: kpiCards[0].trend.color, fontWeight: 600, display: 'block', marginBottom: 4 }}>{kpiCards[0].trend.text}</span>
                <span className="cresoa-metric-meta" style={{ fontSize: 10, color: 'var(--cresoa-text-muted)' }}>{kpiCards[0].meta}</span>
              </div>
            </button>
          </div>

          {/* Right Column: 3 stacked cards */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {kpiCards.slice(1).map((card, idx) => (
              <button key={card.label} onClick={card.onClick} className="cresoa-metric-card" style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '12px 10px', border: '1px solid var(--cresoa-border)', borderRadius: 12, background: 'var(--cresoa-surface)', textAlign: 'left', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                <span className="cresoa-metric-label" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--cresoa-text-muted)', fontWeight: 600 }}>{card.label}</span>
                <strong className="cresoa-metric-value" style={{ fontSize: 16, fontWeight: 800, color: 'var(--cresoa-text)' }}>{card.value}</strong>
                <div>
                  <span className="cresoa-metric-trend" style={{ fontSize: 9, color: card.trend.color, fontWeight: 600, display: 'block', marginBottom: 2 }}>{card.trend.text}</span>
                  <span className="cresoa-metric-meta" style={{ fontSize: 9, color: 'var(--cresoa-text-muted)' }}>{card.meta}</span>
                </div>
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

        {/* ========================================== */}
        {/* ANALYTICS SECTION (STICK CHART)            */}
        {/* ========================================== */}
        <div style={{ marginTop: 24, padding: '0 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--cresoa-text)', letterSpacing: '-0.3px' }}>Analytics</h2>
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
                  <span style={{ fontSize: 12, color: 'var(--cresoa-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Revenue</span>
                  <strong style={{ display: 'block', fontSize: 26, fontWeight: 800, color: 'var(--cresoa-text)', marginTop: 4, letterSpacing: '-0.5px' }}>{formatMoney(analytics.collected)}</strong>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: 12, color: 'var(--cresoa-text-muted)' }}>{analytics.orderCount} orders</span>
                </div>
              </div>
              
              {/* Stick Chart */}
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
                  <div style={{ position: 'absolute', top: 0, left: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%', fontSize: 10, color: 'var(--cresoa-text-muted)', width: 40 }}>
                    <span>{formatMoney(analytics.maxRevenue)}</span>
                    <span>₦0</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: '100%', paddingLeft: 40, gap: 4 }}>
                    {chartPoints.map((point, i) => (
                      <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
                        <div style={{ width: '100%', maxWidth: 20, height: point.height, background: point.hasData ? 'var(--cresoa-primary)' : 'var(--cresoa-border)', borderRadius: '4px 4px 0 0', transition: 'height 0.3s' }} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, padding: '0 0 0 40px' }}>
                {chartPoints.filter((_, i) => i % analytics.labelStep === 0 || i === chartPoints.length - 1).map((point, i) => (
                  <span key={i} style={{ fontSize: 10, color: 'var(--cresoa-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {point.shortLabel}
                  </span>
                ))}
              </div>
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

        {/* Recent Orders & Customers */}
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
