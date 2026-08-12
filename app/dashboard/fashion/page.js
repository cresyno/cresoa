'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

import { Card } from '../../../components/Card'
import { SectionHeader } from '../../../components/SectionHeader'
import { StatusPill } from '../../../components/StatusPill'
import { KpiCards } from '../../../components/KpiCards'
import { ActionCenter } from '../../../components/ActionCenter'
import { ProductionPipeline } from '../../../components/ProductionPipeline'
import { FinancialHealth } from '../../../components/FinancialHealth'
import { DashboardLoading } from '../../../components/Loading'
import { EmptyState } from '../../../components/EmptyState'
import { Navigation } from '../../../components/Navigation'

import { useDashboardData } from '../../../lib/hooks/useDashboardData'
import { formatMoney, formatShortDate, getInitials, safeAmount } from '../../../lib/utils'
import { PRODUCTION_STAGES } from '../../../lib/constants'
import { getOrderCustomerName } from '../../../lib/order-helpers' // we'll create this

const THEME_STORAGE_KEY = 'cresoa-theme'

/* ============================================================
   Helper functions for analytics and data shaping
   ============================================================ */

function getDaySeries(orders, days = 7) {
  const result = []
  const today = new Date()
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today)
    date.setHours(0,0,0,0)
    date.setDate(today.getDate() - i)
    const key = date.toISOString().split('T')[0]
    const dayOrders = orders.filter(o => {
      const d = new Date(o.created_at)
      return d.toISOString().split('T')[0] === key
    })
    const revenue = dayOrders.reduce((sum, o) => sum + safeAmount(o.price), 0)
    result.push({
      key,
      date,
      label: date.toLocaleDateString('en-NG', { weekday: 'short' }),
      orders: dayOrders.length,
      revenue
    })
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
  return orders
    .filter(o => {
      const status = String(o.current_status || '').toLowerCase()
      return safeAmount(o.balance) > 0 ||
        status.includes('fitting') ||
        status.includes('alteration') ||
        status === 'order placed'
    })
    .slice(0, 5)
    .map(o => {
      const name = getOrderCustomerName(o, customers)
      return {
        id: o.id,
        customerName: name,
        amount: o.balance,
        reason: o.balance > 0 ? 'Payment overdue' : 'Awaiting action',
        status: o.current_status,
        actionLabel: o.balance > 0 ? 'Collect payment' : 'View order',
        order: o
      }
    })
}

function getGroupProgress(groups, orders) {
  return groups.map(group => {
    const groupOrders = orders.filter(o => o.group_order_id === group.id)
    const total = groupOrders.length
    const delivered = groupOrders.filter(o => String(o.current_status || '').toLowerCase() === 'delivered').length
    const progress = total === 0 ? null : Math.round((delivered / total) * 100)
    return { ...group, totalOrders: total, deliveredOrders: delivered, progress }
  })
}

/* ============================================================
   COMPONENTS
   ============================================================ */

function DashboardHeader({ business, refreshing, onRefresh, onNewOrder, theme, onToggleTheme }) {
  const name = business?.name || business?.business_name || 'Your business'
  return (
    <header className="cresoa-dashboard-header">
      <div>
        <p className="cresoa-brand-label">Cresoa Fashion</p>
        <h1 className="cresoa-business-name">{name}</h1>
        <p className="cresoa-greeting">Good morning 👋</p>
        <p className="cresoa-date">{new Date().toLocaleDateString('en-NG', { weekday: 'short', day: 'numeric', month: 'short' })}</p>
      </div>
      <div className="cresoa-header-actions">
        <button type="button" onClick={onToggleTheme} className="cresoa-icon-button">
          {theme === 'dark' ? '☀' : '☾'}
        </button>
        <button type="button" onClick={onRefresh} disabled={refreshing} className="cresoa-icon-button">
          <span style={{ display: 'inline-block', transform: refreshing ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s' }}>↻</span>
        </button>
        <button type="button" onClick={onNewOrder} className="cresoa-primary-button">
          <span>＋</span>
          <span className="cresoa-new-order-text">New Order</span>
        </button>
      </div>
    </header>
  )
}

function PerformanceChart({ series, period, onPeriodChange }) {
  const maxRevenue = Math.max(...series.map(d => safeAmount(d.revenue)), 1)
  const totalRevenue = series.reduce((s, d) => s + safeAmount(d.revenue), 0)
  const totalOrders = series.reduce((s, d) => s + safeAmount(d.orders), 0)

  return (
    <Card>
      <SectionHeader
        title="Performance"
        subtitle="Daily performance"
        action={period}
        onAction={() => {}}
      />
      <div className="cresoa-chart-summary">
        <strong>{formatMoney(totalRevenue)}</strong>
        <span>{totalOrders} orders</span>
        <span className="cresoa-trend">↑ 18% vs previous period</span>
      </div>
      <select
        value={period}
        onChange={e => onPeriodChange(e.target.value)}
        className="cresoa-select"
        style={{ marginBottom: 12 }}
      >
        <option value="7">7 days</option>
        <option value="30">30 days</option>
        <option value="90">90 days</option>
      </select>
      <div className="cresoa-chart">
        {series.map(day => {
          const height = Math.max((safeAmount(day.revenue) / maxRevenue) * 100, day.revenue ? 4 : 1)
          return (
            <div key={day.key} className="cresoa-chart-day">
              <div className="cresoa-chart-bar-wrap">
                <div className="cresoa-chart-value">{day.revenue > 0 ? formatMoney(day.revenue) : ''}</div>
                <div className="cresoa-chart-bar" style={{ height: `${height}%` }} />
              </div>
              <span>{day.label}</span>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

function RecentOrdersList({ orders, customers, onOrderClick, onViewAll }) {
  const recent = orders.slice(0, 4)
  return (
    <Card>
      <SectionHeader title="Recent Orders" action="View" onAction={onViewAll} />
      {recent.length === 0 ? (
        <EmptyState title="No orders" message="Create your first order to get started." />
      ) : (
        <div style={{ display: 'grid', gap: 6 }}>
          {recent.map(order => {
            const name = getOrderCustomerName(order, customers)
            return (
              <button key={order.id} onClick={() => onOrderClick(order)} className="cresoa-list-row compact">
                <span className="cresoa-avatar">{getInitials(name)}</span>
                <span style={{ flex: 1, textAlign: 'left' }}>
                  <span className="cresoa-row-title">{name}</span>
                  <span className="cresoa-row-meta">{formatShortDate(order.created_at)} · {formatMoney(order.price)}</span>
                </span>
                <StatusPill status={order.current_status} />
              </button>
            )
          })}
        </div>
      )}
    </Card>
  )
}

function RecentCustomersList({ customers, onCustomerClick, onViewAll }) {
  const recent = customers.slice(0, 3)
  return (
    <Card>
      <SectionHeader title="Recent Customers" action="View" onAction={onViewAll} />
      {recent.length === 0 ? (
        <EmptyState title="No customers" message="Add customers to see them here." />
      ) : (
        <div style={{ display: 'grid', gap: 6 }}>
          {recent.map(customer => {
            const name = customer.name || 'Unnamed'
            return (
              <button key={customer.id} onClick={() => onCustomerClick(customer)} className="cresoa-list-row compact">
                <span className="cresoa-avatar">{getInitials(name)}</span>
                <span style={{ flex: 1, textAlign: 'left' }}>
                  <span className="cresoa-row-title">{name}</span>
                  <span className="cresoa-row-meta">{customer.orders_count || 0} orders</span>
                </span>
                <span className="cresoa-row-arrow">›</span>
              </button>
            )
          })}
        </div>
      )}
    </Card>
  )
}

function GroupOrdersList({ groups, orders, customers, onGroupClick, onViewAll }) {
  const groupsWithProgress = getGroupProgress(groups, orders)
  const [expandedId, setExpandedId] = useState(null)

  return (
    <Card>
      <SectionHeader title="Group Orders" action="View" onAction={onViewAll} />
      {groupsWithProgress.length === 0 ? (
        <EmptyState title="No group orders" message="Create a group to manage coordinated outfits." />
      ) : (
        <div className="cresoa-groups-grid">
          {groupsWithProgress.slice(0, 2).map(group => {
            const isExpanded = expandedId === group.id
            const coordinator = customers.find(c => c.id === group.coordinator_customer_id)
            return (
              <div key={group.id} className="cresoa-group-card" onClick={() => setExpandedId(isExpanded ? null : group.id)}>
                <span className="cresoa-group-icon">✦</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <strong className="cresoa-row-title">{group.name}</strong>
                  <div className="cresoa-row-meta">
                    {group.progress !== null ? (
                      <>
                        <div className="cresoa-group-progress-bar">
                          <div className="cresoa-group-progress-fill" style={{ width: `${group.progress}%` }} />
                        </div>
                        <span>{group.progress}% complete</span>
                      </>
                    ) : (
                      'N/A'
                    )}
                    {coordinator && ` · ${coordinator.name}`}
                    {group.due_date && ` · Due ${formatShortDate(group.due_date)}`}
                  </div>
                </div>
                <span className={`cresoa-row-arrow ${isExpanded ? 'open' : ''}`}>›</span>
                {isExpanded && (
                  <div className="cresoa-group-detail">
                    <div className="cresoa-group-detail-row">
                      <span>Total orders</span>
                      <strong>{group.totalOrders}</strong>
                    </div>
                    <div className="cresoa-group-detail-row">
                      <span>Delivered</span>
                      <strong>{group.deliveredOrders}</strong>
                    </div>
                    {coordinator && (
                      <>
                        <div className="cresoa-group-detail-row">
                          <span>Coordinator</span>
                          <strong>{coordinator.name}</strong>
                        </div>
                        {coordinator.phone && (
                          <div className="cresoa-group-detail-row">
                            <span>Phone</span>
                            <strong>{coordinator.phone}</strong>
                          </div>
                        )}
                      </>
                    )}
                    {group.due_date && (
                      <div className="cresoa-group-detail-row">
                        <span>Due date</span>
                        <strong>{formatShortDate(group.due_date)}</strong>
                      </div>
                    )}
                    <button
                      type="button"
                      className="cresoa-group-detail-button"
                      onClick={(e) => {
                        e.stopPropagation()
                        onGroupClick(group)
                      }}
                    >
                      View Group →
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}

/* ============================================================
   MAIN DASHBOARD
   ============================================================ */

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

  const navigateWithBusiness = (path) => {
    const separator = path.includes('?') ? '&' : '?'
    router.push(`${path}${separator}business_id=${businessId}`)
  }

  const handleNewOrder = () => navigateWithBusiness('/dashboard/orders/new')
  const handleOrder = (order) => order?.id && navigateWithBusiness(`/dashboard/orders/${order.id}`)
  const handleCustomer = (customer) => customer?.id && navigateWithBusiness(`/dashboard/customers/${customer.id}`)
  const handleGroup = (group) => group?.id && navigateWithBusiness(`/dashboard/groups/${group.id}`)
  const handleOrders = () => navigateWithBusiness('/dashboard/orders')
  const handleCustomers = () => navigateWithBusiness('/dashboard/customers')
  const handleGroups = () => navigateWithBusiness('/dashboard/groups')
  const handleStage = (stage) => navigateWithBusiness(`/dashboard/orders?status=${encodeURIComponent(stage)}`)

  if (loading) {
    return (
      <DashboardShell theme={theme}>
        <DashboardLoading />
      </DashboardShell>
    )
  }

  if (error) {
    return (
      <DashboardShell theme={theme}>
        <Card style={{ padding: '40px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 24, marginBottom: 12 }}>!</div>
          <h2 style={{ color: 'var(--cresoa-text)' }}>Couldn't load dashboard</h2>
          <p style={{ color: 'var(--cresoa-text-muted)' }}>{error}</p>
          <button type="button" onClick={refresh} className="cresoa-primary-button">Try again</button>
        </Card>
      </DashboardShell>
    )
  }

  return (
    <DashboardShell theme={theme}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <Navigation businessId={businessId} />

        <DashboardHeader
          business={business}
          refreshing={refreshing}
          onRefresh={refresh}
          onNewOrder={handleNewOrder}
          theme={theme}
          onToggleTheme={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
        />

        <KpiCards
          metrics={summary}
          onOrders={handleOrders}
          onPayments={handleOrders}
          onAttention={handleOrders}
        />

        <div style={{ marginTop: 16 }}>
          <Card>
            <SectionHeader
              title="Action Required"
              subtitle={`${actionItems.length} item${actionItems.length > 1 ? 's' : ''} need your attention`}
              action="View all"
              onAction={handleOrders}
            />
            <ActionCenter
              items={actionItems}
              onActionClick={(item) => handleOrder(item.order)}
              onViewAll={handleOrders}
            />
          </Card>
        </div>

        <div style={{ marginTop: 16 }}>
          <Card>
            <SectionHeader title="Production" subtitle="What's moving through your workshop" />
            <ProductionPipeline counts={productionCounts} onStageClick={handleStage} />
          </Card>
        </div>

        <div style={{ marginTop: 16 }}>
          <PerformanceChart series={series} period={period} onPeriodChange={setPeriod} />
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

        <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <RecentOrdersList
            orders={orders}
            customers={customers}
            onOrderClick={handleOrder}
            onViewAll={handleOrders}
          />
          <RecentCustomersList
            customers={customers}
            onCustomerClick={handleCustomer}
            onViewAll={handleCustomers}
          />
        </div>

        <div style={{ marginTop: 16 }}>
          <GroupOrdersList
            groups={groups}
            orders={orders}
            customers={customers}
            onGroupClick={handleGroup}
            onViewAll={handleGroups}
          />
        </div>

        <div style={{ marginTop: 24 }}>
          <Navigation businessId={businessId} />
        </div>
      </div>
    </DashboardShell>
  )
}

/* ============================================================
   SHELL
   ============================================================ */

function DashboardShell({ children, theme }) {
  return (
    <main className="cresoa-dashboard" data-theme={theme}>
      <div className="cresoa-dashboard-shell">
        <div className="cresoa-dashboard-content">{children}</div>
      </div>
    </main>
  )
}

/* ============================================================
   ENTRY
   ============================================================ */

export default function Page() {
  const searchParams = useSearchParams()
  const businessId = searchParams?.get('business_id') || searchParams?.get('businessId') || null

  if (!businessId) {
    return (
      <DashboardShell theme="light">
        <Card style={{ padding: '40px 24px', textAlign: 'center' }}>
          <h2 style={{ color: 'var(--cresoa-text)' }}>Business account required</h2>
          <p style={{ color: 'var(--cresoa-text-muted)' }}>Select a business to view its dashboard.</p>
        </Card>
      </DashboardShell>
    )
  }

  return <FashionDashboard businessId={businessId} />
     }
