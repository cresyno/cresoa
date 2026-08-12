'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useDashboardData } from '../../../lib/hooks/useDashboardData'
import { formatMoney, formatShortDate, getInitials, safeAmount } from '../../../lib/utils'
import { getOrderCustomerName } from '../../../lib/order-helpers'
import { PRODUCTION_STAGES } from '../../../lib/constants'

// ✅ Shared components
import { Card } from '../../../components/Card'
import { SectionHeader } from '../../../components/SectionHeader'
import { StatusPill } from '../../../components/StatusPill'
import { DashboardLoading } from '../../../components/Loading'
import { EmptyState } from '../../../components/EmptyState'
import { KpiCards } from '../../../components/KpiCards'
import { ActionCenter } from '../../../components/ActionCenter'
import { FinancialHealth } from '../../../components/FinancialHealth'

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

function getActionItems(orders, customers) {
  if (!Array.isArray(orders) || !Array.isArray(customers)) return []
  try {
    const items = orders
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
        let name = 'Unknown'
        try {
          name = getOrderCustomerName(o, customers)
        } catch (_) { /* ignore */ }
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
    return items
  } catch (e) {
    console.error('getActionItems error:', e)
    return []
  }
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

  const navigate = (path) => {
    const sep = path.includes('?') ? '&' : '?'
    router.push(`${path}${sep}business_id=${businessId}`)
  }

  const handleActionClick = (item) => {
    if (item?.order?.id) navigate(`/dashboard/orders/${item.order.id}`)
  }

  if (loading) return <DashboardShell theme={theme}><DashboardLoading /></DashboardShell>
  if (error) return <DashboardShell theme={theme}><Card><p>Error: {error}</p><button onClick={refresh}>Retry</button></Card></DashboardShell>

  return (
    <DashboardShell theme={theme}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        {/* Header */}
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

        <KpiCards
          metrics={summary}
          onOrders={() => navigate('/dashboard/orders')}
          onPayments={() => navigate('/dashboard/orders?filter=payments')}
          onAttention={() => navigate('/dashboard/orders?filter=attention')}
        />

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

        <div style={{ marginTop: 16 }}>
          <Card>
            <SectionHeader title="Performance" subtitle="Daily performance" />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <div><strong style={{ fontSize: 22 }}>{formatMoney(series.reduce((s,d) => s + safeAmount(d.revenue), 0))}</strong> <span>{series.reduce((s,d) => s + safeAmount(d.orders), 0)} orders</span> <span style={{ color: 'var(--cresoa-success)' }}>↑ 18% vs previous</span></div>
              <select className="cresoa-select" value={period} onChange={e => setPeriod(e.target.value)}><option value="7">7 days</option><option value="30">30 days</option><option value="90">90 days</option></select>
            </div>
            <div className="cresoa-chart">
              {series.map(day => {
                const max = Math.max(...series.map(d => safeAmount(d.revenue)), 1)
                const height = Math.max((safeAmount(day.revenue)/max)*100, day.revenue ? 4 : 1)
                return <div key={day.key} className="cresoa-chart-day"><div className="cresoa-chart-bar-wrap"><div className="cresoa-chart-value">{day.revenue > 0 ? formatMoney(day.revenue) : ''}</div><div className="cresoa-chart-bar" style={{ height: height+'%' }} /></div><span>{day.label}</span></div>
              })}
            </div>
          </Card>
        </div>

        <div style={{ marginTop: 16 }}>
          <Card>
            <SectionHeader title="Financial Health" />
            <FinancialHealth
              revenue={summary.revenue}
              collected={summary.paid}
              outstanding={summary.outstanding}
            />
          </Card>
        </div>

        {/* ✅ SAFE Recent Orders – no StatusPill, no onClick, just text */}
        <div style={{ marginTop: 16 }}>
          <Card>
            <SectionHeader title="Recent Orders (safe)" />
            <div style={{ padding: '8px 0' }}>
              {orders.length === 0 ? (
                <EmptyState title="No orders" message="Create your first order to get started." />
              ) : (
                <div>
                  {orders.slice(0, 4).map(order => (
                    <div key={order.id} style={{ padding: '6px 0', borderBottom: '1px solid var(--cresoa-border)' }}>
                      <span>{getOrderCustomerName(order, customers)}</span>
                      <span style={{ float: 'right' }}>{formatMoney(order.price)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>

        <div style={{ marginTop: 16 }}>
          <Card>
            <SectionHeader title="EmptyState Test" subtitle="Testing the shared component" />
            <EmptyState title="No data" message="This is a placeholder message." />
          </Card>
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
