'use client'

import { useEffect, useMemo, useState, useRef } from 'react'
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
import { supabase } from '../../../lib/supabaseClient'
import TessaFloatingWidget from '../../../components/support/TessaFloatingWidget' // NEW: Import Tessa/ NEW: Import Tessa
import './dashboard.css'

const THEME_STORAGE_KEY = 'cresoa-theme'

// ============================================================
// HELPERS
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

// ============================================================
// MAIN DASHBOARD
// ============================================================
function FashionDashboard({ businessId }) {
  const router = useRouter()
  const { orders, customers, groups, business, loading, refreshing, error, refresh } = useDashboardData(businessId)
  const [theme, setTheme] = useState('light')
  
  // Payments State for Accurate KPI Math
  const [payments, setPayments] = useState([])

  // Timeframe State
  const [timeframe, setTimeframe] = useState('current_month')
  const [showTimeframeMenu, setShowTimeframeMenu] = useState(false)
  const timeframeMenuRef = useRef(null)

  // Optimistic UI State
  const [optimisticOrders, setOptimisticOrders] = useState(null)
  const displayOrders = optimisticOrders || orders

  // Reset optimistic state when real data arrives
  useEffect(() => {
    if (optimisticOrders && orders !== optimisticOrders) {
      setOptimisticOrders(null)
    }
  }, [orders])

  // Fetch Payments directly to ensure accurate KPI calculation
  useEffect(() => {
    if (!businessId || !orders || orders.length === 0) return
    const fetchPayments = async () => {
      const orderIds = orders.map(o => o.id)
      const { data } = await supabase
        .from('payment_records')
        .select('*')
        .in('order_id', orderIds)
      setPayments(data || [])
    }
    fetchPayments()
  }, [businessId, orders])

  // Custom Modal & Toast State
  const [modalConfig, setModalConfig] = useState({
    isOpen: false, title: '', message: '', confirmText: '', isDestructive: false, onConfirm: null
  })
  const [toastMessage, setToastMessage] = useState('')
  const [toastType, setToastType] = useState('success')

  const showToast = (msg, type = 'success') => {
    setToastMessage(msg)
    setToastType(type)
    setTimeout(() => setToastMessage(''), 3000)
  }

  useEffect(() => {
    function handleClickOutside(event) {
      if (timeframeMenuRef.current && !timeframeMenuRef.current.contains(event.target)) {
        setShowTimeframeMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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

  // ─── DYNAMIC DATA CALCULATIONS ───
  const { currentOrders, previousOrders, currentPayments, previousPayments } = useMemo(() => {
    const now = new Date()
    let start, prevStart, prevEnd

    if (timeframe === '24h') {
      start = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      prevStart = new Date(start.getTime() - 24 * 60 * 60 * 1000)
      prevEnd = start
    } else if (timeframe === '7d') {
      start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      prevStart = new Date(start.getTime() - 7 * 24 * 60 * 60 * 1000)
      prevEnd = start
    } else if (timeframe === '30d') {
      start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      prevStart = new Date(start.getTime() - 30 * 24 * 60 * 60 * 1000)
      prevEnd = start
    } else if (timeframe === '90d') {
      start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
      prevStart = new Date(start.getTime() - 90 * 24 * 60 * 60 * 1000)
      prevEnd = start
    } else {
      start = new Date(now.getFullYear(), now.getMonth(), 1)
      prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      prevEnd = new Date(now.getFullYear(), now.getMonth(), 0)
    }

    // 1. Orders CREATED in timeframe (For Revenue & Outstanding)
    const currentOrd = displayOrders.filter(o => {
      if (!o.created_at) return false
      const d = new Date(o.created_at)
      return d >= start && d <= now
    })

    const prevOrd = displayOrders.filter(o => {
      if (!o.created_at) return false
      const d = new Date(o.created_at)
      return d >= prevStart && d <= prevEnd
    })

    // 2. Payments RECORDED in timeframe (For Collected)
    const currentPay = payments.filter(p => {
      if (!p.created_at) return false
      const d = new Date(p.created_at)
      return d >= start && d <= now
    })

    const prevPay = payments.filter(p => {
      if (!p.created_at) return false
      const d = new Date(p.created_at)
      return d >= prevStart && d <= prevEnd
    })

    return { 
      currentOrders: currentOrd, 
      previousOrders: prevOrd,
      currentPayments: currentPay,
      previousPayments: prevPay
    }
  }, [displayOrders, payments, timeframe])

  const currentSummary = useMemo(() => {
    const revenue = currentOrders.reduce((s, o) => s + safeAmount(o.price), 0)
    // We use the exact payment amount from payment_records, not the total order amount_paid
    const paid = currentPayments.reduce((s, p) => s + Number(p.amount || 0), 0) 
    const outstanding = currentOrders.reduce((s, o) => s + Math.max(0, safeAmount(o.price) - safeAmount(o.amount_paid)), 0)
    return { revenue, paid, outstanding, orders: currentOrders.length }
  }, [currentOrders, currentPayments])

  const previousSummary = useMemo(() => {
    const revenue = previousOrders.reduce((s, o) => s + safeAmount(o.price), 0)
    const paid = previousPayments.reduce((s, p) => s + Number(p.amount || 0), 0)
    const outstanding = previousOrders.reduce((s, o) => s + Math.max(0, safeAmount(o.price) - safeAmount(o.amount_paid)), 0)
    return { revenue, paid, outstanding, orders: previousOrders.length }
  }, [previousOrders, previousPayments])

  const getTrend = (current, previous) => {
    if (previous === 0 && current === 0) return { text: 'No activity', color: 'var(--cresoa-text-muted)' };
    if (previous === 0 && current > 0) return { text: '↑ New activity', color: 'var(--cresoa-success)' };
    const change = ((current - previous) / previous) * 100;
    if (change > 0) return { text: `↑ ${change.toFixed(1)}%`, color: 'var(--cresoa-success)' };
    if (change < 0) return { text: `↓ ${Math.abs(change).toFixed(1)}%`, color: 'var(--cresoa-danger)' };
    return { text: `0%`, color: 'var(--cresoa-text-muted)' };
  };

  const revenueTrend = getTrend(currentSummary.revenue, previousSummary.revenue);
  const ordersTrend = getTrend(currentSummary.orders, previousSummary.orders);
  const collectedTrend = getTrend(currentSummary.paid, previousSummary.paid);
  const outstandingTrend = getTrend(currentSummary.outstanding, previousSummary.outstanding);

  const healthScoreData = useMemo(() => {
    if (currentSummary.revenue === 0 && currentSummary.orders === 0) {
      return { score: 0, label: 'No Data', color: 'var(--cresoa-text-muted)' };
    }
    const rawCollectionRate = currentSummary.revenue > 0 ? (currentSummary.paid / currentSummary.revenue) : 0;
    const collectionRate = Math.min(Math.max(rawCollectionRate, 0), 1);
    const currentDeliveredCount = currentOrders.filter(o => String(o.current_status || '').toLowerCase() === 'delivered').length;
    const rawCompletionRate = currentSummary.orders > 0 ? (currentDeliveredCount / currentSummary.orders) : 0;
    const completionRate = Math.min(Math.max(rawCompletionRate, 0), 1);
    const rawScore = ((collectionRate * 0.5) + (completionRate * 0.5)) * 100;
    const score = Math.min(Math.round(rawScore), 100);

    let label = 'Needs Attention';
    let color = 'var(--cresoa-danger)';
    if (score >= 80) { label = 'Excellent'; color = 'var(--cresoa-success)'; }
    else if (score >= 50) { label = 'Good'; color = 'var(--cresoa-warning, #D9A05B)'; }

    return { score, label, color };
  }, [currentSummary, currentOrders]);

  const analytics = useMemo(() => {
    let days = 30;
    if (timeframe === '24h') days = 1;
    else if (timeframe === '7d') days = 7;
    else if (timeframe === '30d') days = 30;
    else if (timeframe === '90d') days = 90;
    else if (timeframe === 'current_month') {
      const now = new Date();
      days = now.getDate();
    }

    const totalOrderValue = currentOrders.reduce((sum, o) => sum + safeAmount(o.price), 0);
    const collected = currentPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const outstanding = currentOrders.reduce((sum, o) => sum + Math.max(0, safeAmount(o.price) - safeAmount(o.amount_paid)), 0);
    const orderCount = currentOrders.length;
    
    const collectedPercent = totalOrderValue > 0 ? Math.min((collected / totalOrderValue) * 100, 100) : 0;
    const outstandingPercent = totalOrderValue > 0 ? Math.min((outstanding / totalOrderValue) * 100, 100) : 0;

    const chartData = [];
    for (let i = Math.min(days - 1, 6); i >= 0; i--) {
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

    // Fill chart based on exact payment records
    currentPayments.forEach(p => {
      const dateStr = new Date(p.created_at).toISOString().split('T')[0];
      const dayObj = chartData.find(d => d.dateStr === dateStr);
      if (dayObj) {
        dayObj.collected += Number(p.amount || 0);
        dayObj.orders += 1;
      }
    });

    const maxRevenue = Math.max(...chartData.map(d => d.collected), 1);
    const labelStep = Math.max(Math.ceil(chartData.length / 6), 1);

    return { totalOrderValue, collected, outstanding, orderCount, collectedPercent, outstandingPercent, chartData, maxRevenue, labelStep, hasOrders: displayOrders.length > 0, hasFilteredOrders: currentOrders.length > 0 || currentPayments.length > 0 };
  }, [displayOrders, currentOrders, currentPayments, timeframe]);

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

  const productionCounts = useMemo(() => getProductionCounts(displayOrders), [displayOrders])
  const actionItems = useMemo(() => getActionItems(displayOrders, customers), [displayOrders, customers])
  const groupsWithProgress = useMemo(() => getGroupProgress(groups, displayOrders), [groups, displayOrders])

  const navigate = (path) => {
    const sep = path.includes('?') ? '&' : '?'
    router.push(`${path}${sep}business_id=${businessId}`)
  }

  const handleActionClick = (item) => {
    if (item.actionLabel === 'Collect payment') {
      setModalConfig({
        isOpen: true,
        title: 'Record Payment',
        message: `Confirm you have received full payment of ${formatMoney(item.amount)} for ${item.customerName}?`,
        confirmText: 'Confirm Payment',
        isDestructive: false,
        onConfirm: async () => {
          setModalConfig(prev => ({ ...prev, isOpen: false }))
          
          // 1. OPTIMISTIC UPDATE: Update both orders and payments state
          const previousDisplayOrders = displayOrders
          const previousPayments = [...payments]
          
          setOptimisticOrders(prev => {
            const current = prev || displayOrders
            return current.map(o => 
              o.id === item.id 
                ? { ...o, amount_paid: safeAmount(o.price), updated_at: new Date().toISOString() } 
                : o
            )
          })

          const newPaymentRecord = {
            id: `temp-${Date.now()}`,
            order_id: item.id,
            amount: item.amount,
            created_at: new Date().toISOString(),
            note: 'Payment collected from dashboard'
          }
          setPayments(prev => [newPaymentRecord, ...prev])

          showToast('Payment recorded successfully!')

          // 2. NETWORK REQUEST
          try {
            const { data: { session } } = await supabase.auth.getSession()
            const res = await fetch(`/api/orders/${item.id}/payments`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
              body: JSON.stringify({ amount: item.amount, note: 'Payment collected from dashboard' })
            })
            if (!res.ok) throw new Error('Failed')
            
            // 3. SYNC WITH BACKEND
            if (refresh) refresh() 
            router.refresh()
            
          } catch (err) {
            // ROLLBACK ON FAILURE
            setOptimisticOrders(previousDisplayOrders)
            setPayments(previousPayments)
            showToast('Failed to record payment', 'error')
          }
        }
      })
    } else if (item.order?.id) {
      navigate(`/dashboard/orders/${item.order.id}`)
    }
  }

  // ─── TESSA CONTEXT ───
  // This feeds Tessa the exact state of the dashboard so she can answer questions intelligently.
  const tessaContext = useMemo(() => ({
    page: 'Dashboard',
    view: 'Fashion Overview',
    timeframe: timeframe,
    metrics: {
      totalRevenue: currentSummary.revenue,
      totalCollected: currentSummary.paid,
      totalOutstanding: currentSummary.outstanding,
      orderCount: currentSummary.orders,
    },
    healthScore: healthScoreData.score,
    productionStatus: productionCounts
  }), [timeframe, currentSummary, healthScoreData.score, productionCounts])

  if (loading) return <DashboardShell theme={theme}><div style={{ padding: 40, textAlign: 'center', color: 'var(--cresoa-text-muted)' }}>Loading dashboard...</div></DashboardShell>
  if (error) return <DashboardShell theme={theme}><Card><p>Error: {error}</p><button onClick={refresh} className="cresoa-primary-button" style={{ marginTop: 12 }}>Retry</button></Card></DashboardShell>

  const kpiCards = [
    { label: 'Revenue', value: formatMoney(currentSummary.revenue), trend: revenueTrend, meta: 'Total order value', onClick: () => navigate('/dashboard/orders') },
    { label: 'Orders', value: String(currentSummary.orders), trend: ordersTrend, meta: 'Orders created', onClick: () => navigate('/dashboard/orders') },
    { label: 'Collected', value: formatMoney(currentSummary.paid), trend: collectedTrend, meta: `${currentSummary.revenue > 0 ? Math.min(Math.round((currentSummary.paid / currentSummary.revenue) * 100), 100) : 0}% of total`, onClick: () => navigate('/dashboard/orders?filter=payments') },
    { label: 'Outstanding', value: formatMoney(currentSummary.outstanding), trend: outstandingTrend, meta: `${currentSummary.revenue > 0 ? Math.min(Math.round((currentSummary.outstanding / currentSummary.revenue) * 100), 100) : 0}% of total`, onClick: () => navigate('/dashboard/orders?filter=attention') },
  ]

  const timeframes = [
    { label: 'Last 24 hours', value: '24h' },
    { label: 'Last 7 days', value: '7d' },
    { label: 'Last 30 days', value: '30d' },
    { label: 'Last 90 days', value: '90d' },
    { label: 'This Month', value: 'current_month' },
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

          {/* ─── TIMEFRAME SELECTOR ─── */}
        <div className="kpi-header-row">
          <h2 className="section-title">Performance Overview</h2>
          <div className="timeframe-dropdown-wrapper" ref={timeframeMenuRef}>
            <button 
              className="timeframe-btn"
              onClick={() => setShowTimeframeMenu(!showTimeframeMenu)}
            >
              {timeframes.find(t => t.value === timeframe)?.label || 'This Month'}
              <Icon name="chevron-down" size={14} style={{ marginLeft: '6px' }} />
            </button>
            
            {showTimeframeMenu && (
              <div className="timeframe-menu">
                {timeframes.map(tf => (
                  <button 
                    key={tf.value}
                    onClick={() => { setTimeframe(tf.value); setShowTimeframeMenu(false) }} 
                    className={`timeframe-item ${timeframe === tf.value ? 'active' : ''}`}
                  >
                    {tf.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ─── KPI GRID ─── */}
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

        {/* ─── BUSINESS HEALTH ─── */}
        <Card className="dashboard-card">
          <div className="health-header">
            <h3 className="section-title">Business Health Score</h3>
            <span className="health-score" style={{ color: healthScoreData.color }}>{healthScoreData.score}%</span>
          </div>
          <div className="health-bar-bg">
            <div className="health-bar-fill" style={{ width: `${healthScoreData.score}%`, background: healthScoreData.color }} />
          </div>
          <p className="health-desc">
            {healthScoreData.label} — Based on collection rate and delivery completion for selected period.
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
            <span className="analytics-period-label">
              {timeframes.find(t => t.value === timeframe)?.label || 'This Month'}
            </span>
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

        {/* ─── RECENT ORDERS ─── */}
        <Card className="dashboard-card">
          <SectionHeader title="Recent Orders" action="View" onAction={() => navigate('/dashboard/orders')} />
          {displayOrders.slice(0, 4).map(order => {
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
        </Card>

        {/* ─── RECENT CUSTOMERS ─── */}
        <Card className="dashboard-card">
          <SectionHeader title="Recent Customers" action="View" onAction={() => navigate('/dashboard/customers')} />
          {customers.slice(0, 4).map(customer => {
            const name = customer.name || 'Unnamed'
            const customerOrders = displayOrders.filter(o => o.customer_id === customer.id)
            const activeOrders = customerOrders.filter(o => o.current_status !== 'Delivered').length
            return (
              <div key={customer.id} onClick={() => navigate(`/dashboard/customers/${customer.id}`)} className="dashboard-list-item">
                <span className="cresoa-avatar">{getInitials(name)}</span>
                <div className="list-item-content">
                  <span className="list-item-title">{name}</span>
                  <span className="list-item-meta">{activeOrders > 0 ? `${activeOrders} active orders` : 'No active orders'}</span>
                </div>
                <Icon name="chevron-right" size={16} />
              </div>
            )
          })}
        </Card>

        {/* ─── GROUP ORDERS ─── */}
        <Card className="dashboard-card">
          <SectionHeader title="Group Orders" action="View" onAction={() => navigate('/dashboard/groups')} />
          {groupsWithProgress.length === 0 ? (
            <div className="elegant-empty" style={{ padding: '2rem 1rem', textAlign: 'center' }}>
              <h4 style={{ fontSize: '1rem', fontStyle: 'italic', marginBottom: '4px' }}>No group orders</h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--cresoa-text-muted)', marginBottom: '16px' }}>Create a group to manage coordinated outfits.</p>
              <button onClick={() => navigate('/dashboard/groups/new')} className="cresoa-primary-button">+ New Group Order</button>
            </div>
          ) : (
            groupsWithProgress.slice(0, 4).map(group => {
              const coordinator = customers.find(c => c.id === group.coordinator_customer_id)
              return (
                <div key={group.id} onClick={() => navigate(`/dashboard/groups/${group.id}`)} className="dashboard-list-item">
                  <span className="cresoa-avatar">{group.name ? group.name.charAt(0).toUpperCase() : 'G'}</span>
                  <div className="list-item-content">
                    <span className="list-item-title">{group.name}</span>
                    <span className="list-item-meta">
                      {group.progress !== null ? `${group.progress}% complete` : 'Progress unavailable'}
                      {coordinator && ` · ${coordinator.name}`}
                    </span>
                    {group.progress !== null && (
                      <div className="group-progress-bar-bg">
                        <div className="group-progress-bar-fill" style={{ width: `${group.progress}%` }} />
                      </div>
                    )}
                  </div>
                  <Icon name="chevron-right" size={16} />
                </div>
              )
            })
          )}
        </Card>

        <div style={{ marginTop: '2rem' }}>
          <Navigation businessId={businessId} />
        </div>

        {/* ─── CUSTOM MODALS & TOASTS ─── */}
        {modalConfig.isOpen && (
          <div className="app-modal-overlay" onClick={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}>
            <div className="app-modal-box" onClick={e => e.stopPropagation()}>
              <h3 className="app-modal-title">{modalConfig.title}</h3>
              <p className="app-modal-message">{modalConfig.message}</p>
              <div className="app-modal-actions">
                <button className="app-modal-btn cancel" onClick={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}>Cancel</button>
                <button className={`app-modal-btn confirm ${modalConfig.isDestructive ? 'destructive' : ''}`} onClick={modalConfig.onConfirm}>{modalConfig.confirmText}</button>
              </div>
            </div>
          </div>
        )}

        {toastMessage && (
          <div className={`app-toast ${toastType}`}>
            {toastMessage}
          </div>
        )}

        {/* ─── TESSA AI COPILOT ─── */}
        <TessaFloatingWidget businessId={businessId} pageContext={tessaContext} />

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
