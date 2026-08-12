'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../../lib/supabaseClient'
import { getCurrentBusinessId } from '../../../lib/getBusinessId'
import { isFeatureAvailable, getPlanLimits } from '../../../lib/planLimits'
import { Icon } from '../../../components/Icon'

/* =========================================================
   CRESOA FASHION DASHBOARD – v2.1 (Stable)
   ========================================================= */

const PRODUCTION_STAGES = [
  'Order placed',
  'Cutting',
  'Sewing',
  'Fitting',
  'Alteration',
  'Ready',
  'Delivered'
]

const THEME_STORAGE_KEY = 'cresoa-theme'

const THEME = {
  light: {
    bg: '#F7F6F2',
    surface: '#FFFFFF',
    surfaceRaised: '#FFFFFF',
    primary: '#0F2D46',
    primaryDeep: '#092238',
    accent: '#D9A928',
    accentSoft: '#F8EFCF',
    text: '#17202A',
    textMuted: '#6B7280',
    textSoft: '#8A929B',
    border: '#E5E2DA',
    success: '#159570',
    successSoft: '#E7F5EF',
    warning: '#D49A18',
    warningSoft: '#FFF4D8',
    danger: '#D9534F',
    dangerSoft: '#FCEBEA',
    info: '#3478B9',
    infoSoft: '#EAF3FB'
  },

  dark: {
    bg: '#0B1117',
    surface: '#111A23',
    surfaceRaised: '#17232E',
    primary: '#E8F0F5',
    primaryDeep: '#F5F8FA',
    accent: '#E0B536',
    accentSoft: '#332B14',
    text: '#EDF2F5',
    textMuted: '#9CAAB5',
    textSoft: '#74838F',
    border: '#25333F',
    success: '#3AC08E',
    successSoft: '#12372C',
    warning: '#E0AD32',
    warningSoft: '#3A3016',
    danger: '#EF7771',
    dangerSoft: '#3A1E1D',
    info: '#61A5DC',
    infoSoft: '#142C40'
  }
}

/* =========================================================
   DATA HELPERS
   ========================================================= */

function safeAmount(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

function calculateBalance(order) {
  return Math.max(safeAmount(order?.price) - safeAmount(order?.amount_paid), 0)
}

function formatMoney(value) {
  return `₦${safeAmount(value).toLocaleString('en-NG')}`
}

function formatDate(value) {
  if (!value) return '—'
  const date = value instanceof Date ? value : new Date(value)
  if (isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatShortDate(value) {
  if (!value) return '—'
  const date = value instanceof Date ? value : new Date(value)
  if (isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })
}

function getDateKey(value) {
  const date = new Date(value)
  if (isNaN(date.getTime())) return ''
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getInitials(name) {
  const value = String(name || 'C').trim()
  if (!value) return 'C'
  return value
    .split(/\s+/)
    .slice(0, 2)
    .map(part => part.charAt(0).toUpperCase())
    .join('')
}

function getCustomerName(customer) {
  if (!customer) return 'Unnamed customer'
  return (
    customer.full_name ||
    customer.name ||
    `${customer.first_name || ''} ${customer.last_name || ''}`.trim() ||
    'Unnamed customer'
  )
}

function getOrderCustomerName(order, customers) {
  if (!order) return 'Unknown customer'
  if (order.customer_name) return order.customer_name
  const customer = customers.find(item => item?.id === order?.customer_id)
  if (customer) return getCustomerName(customer)
  return order.customer_id ? `Customer (${order.customer_id.slice(0, 8)})` : 'Unknown customer'
}

/* =========================================================
   NORMALIZATION
   ========================================================= */

function normalizeOrder(order) {
  const status = order?.current_status || order?.status || order?.order_status || 'Order placed'
  const createdAt = order?.created_at || order?.createdAt || order?.date || new Date().toISOString()
  const price = safeAmount(order?.price ?? order?.total_amount ?? order?.amount)
  const amountPaid = safeAmount(order?.amount_paid ?? order?.paid_amount ?? order?.amountPaid)

  return {
    ...order,
    id: order?.id,
    status,
    current_status: status,
    created_at: createdAt,
    price,
    amount_paid: amountPaid,
    balance: calculateBalance({ price, amount_paid: amountPaid }),
    customer_name: order?.customer_name || order?.customer?.name || ''
  }
}

function normalizeCustomer(customer) {
  return {
    ...customer,
    id: customer?.id,
    name: getCustomerName(customer),
    created_at: customer?.created_at || new Date().toISOString()
  }
}

function normalizeGroup(group) {
  return {
    ...group,
    id: group?.id,
    name: group?.group_name || group?.name || 'Group',
    created_at: group?.created_at || new Date().toISOString(),
    coordinator_customer_id: group?.coordinator_customer_id || null,
    due_date: group?.due_date || null,
    status: group?.status || 'pending'
  }
}

/* =========================================================
   ANALYTICS
   ========================================================= */

function getDaySeries(orders, days = 7) {
  const result = []
  const today = new Date()
  for (let index = days - 1; index >= 0; index -= 1) {
    const date = new Date(today)
    date.setHours(0, 0, 0, 0)
    date.setDate(today.getDate() - index)
    const key = getDateKey(date)
    const dayOrders = orders.filter(order => getDateKey(order.created_at) === key)
    const revenue = dayOrders.reduce((sum, order) => sum + safeAmount(order.price), 0)
    result.push({
      key,
      date,
      label: date.toLocaleDateString('en-NG', { weekday: 'short' }),
      shortDate: formatShortDate(date),
      orders: dayOrders.length,
      revenue
    })
  }
  return result
}

function getAnalyticsSummary(orders) {
  const revenue = orders.reduce((sum, order) => sum + safeAmount(order.price), 0)
  const paid = orders.reduce((sum, order) => sum + safeAmount(order.amount_paid), 0)
  const outstanding = orders.reduce((sum, order) => sum + safeAmount(order.balance), 0)
  return { revenue, paid, outstanding, orders: orders.length }
}

function getProductionCounts(orders) {
  return PRODUCTION_STAGES.reduce((result, stage) => {
    result[stage] = orders.filter(
      order => String(order.current_status || '').toLowerCase() === stage.toLowerCase()
    ).length
    return result
  }, {})
}

function getAttentionOrders(orders) {
  return orders
    .filter(order => {
      const status = String(order.current_status || '').toLowerCase()
      return (
        status.includes('fitting') ||
        status.includes('alteration') ||
        status.includes('payment') ||
        safeAmount(order.balance) > 0
      )
    })
    .slice(0, 5)
}

function getRecentOrders(orders) {
  return [...orders]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 6)
}

function getRecentCustomers(customers) {
  return [...customers]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 5)
}

/* =========================================================
   DATA FETCHING HOOK
   ========================================================= */

function useFashionDashboardData(businessId) {
  const [orders, setOrders] = useState([])
  const [customers, setCustomers] = useState([])
  const [groups, setGroups] = useState([])
  const [business, setBusiness] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

  const load = async (silent = false) => {
    if (!businessId) {
      setLoading(false)
      return
    }

    try {
      if (silent) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }
      setError('')

      const [businessResult, ordersResult, customersResult, groupsResult] = await Promise.all([
        supabase.from('businesses').select('*').eq('id', businessId).maybeSingle(),
        supabase.from('orders').select('*').eq('business_id', businessId).order('created_at', { ascending: false }),
        supabase.from('customers').select('*').eq('business_id', businessId).order('created_at', { ascending: false }),
        supabase.from('group_orders').select('*').eq('business_id', businessId).order('created_at', { ascending: false })
      ])

      if (businessResult.error) throw businessResult.error
      if (ordersResult.error) throw ordersResult.error
      if (customersResult.error) throw customersResult.error
      if (groupsResult.error) throw groupsResult.error

      setBusiness(businessResult.data || null)
      setOrders((ordersResult.data || []).map(normalizeOrder))
      setCustomers((customersResult.data || []).map(normalizeCustomer))
      setGroups((groupsResult.data || []).map(normalizeGroup))
    } catch (loadError) {
      console.error('Cresoa dashboard:', loadError)
      setError(loadError?.message || 'Unable to load dashboard data.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    load()
  }, [businessId])

  return { orders, customers, groups, business, loading, refreshing, error, refresh: () => load(true) }
}

/* =========================================================
   COMPONENTS
   ========================================================= */

function DashboardCard({ children, style = {}, className = '' }) {
  return (
    <section className={`cresoa-card ${className}`} style={style}>
      {children}
    </section>
  )
}

function SectionHeader({ title, subtitle, action, onAction }) {
  return (
    <div className="cresoa-section-header">
      <div style={{ minWidth: 0 }}>
        <h2 className="cresoa-section-header-title">{title}</h2>
        {subtitle && <p className="cresoa-section-header-subtitle">{subtitle}</p>}
      </div>
      {action && (
        <button type="button" onClick={onAction} className="cresoa-section-header-action">
          {action} →
        </button>
      )}
    </div>
  )
}

function StatusPill({ status }) {
  const value = String(status || 'Order placed')
  const lower = value.toLowerCase()
  const tone = lower.includes('deliver') || lower.includes('ready')
    ? 'success'
    : lower.includes('fitting') || lower.includes('alter')
    ? 'warning'
    : lower.includes('cancel')
    ? 'danger'
    : 'info'

  return <span className={`cresoa-status cresoa-status-${tone}`}>{value}</span>
}

function DashboardHeader({ business, onRefresh, refreshing, onNewOrder, theme, onToggleTheme }) {
  const businessName = business?.name || business?.business_name || 'Your fashion business'

  return (
    <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 24 }}>
      <div style={{ minWidth: 0, flex: 1 }}>
        <p style={{ margin: 0, color: 'var(--cresoa-text-muted)', fontSize: 12, fontWeight: 600 }}>
          Cresoa Fashion
        </p>
        <h1
          style={{
            margin: '2px 0 0',
            color: 'var(--cresoa-text)',
            fontSize: 'clamp(22px, 5vw, 30px)',
            fontWeight: 850,
            letterSpacing: '-0.03em',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
        >
          {businessName}
        </h1>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <button type="button" onClick={onToggleTheme} aria-label="Toggle theme" className="cresoa-icon-button">
          {theme === 'dark' ? '☀' : '☾'}
        </button>
        <button type="button" onClick={onRefresh} disabled={refreshing} aria-label="Refresh dashboard" className="cresoa-icon-button">
          <span style={{ display: 'inline-block', transform: refreshing ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s' }}>↻</span>
        </button>
        <button type="button" onClick={onNewOrder} className="cresoa-primary-button">
          <span>+</span>
          <span className="cresoa-new-order-text">New order</span>
        </button>
      </div>
    </header>
  )
}

function TodayOverview({ metrics, onOrders, onPayments, onAttention }) {
  const cards = [
    { label: 'Revenue', value: formatMoney(metrics?.revenue), meta: 'Total order value', icon: '₦', onClick: onOrders },
    { label: 'Orders', value: String(metrics?.orders || 0), meta: 'Orders in period', icon: '◫', onClick: onOrders },
    { label: 'Paid', value: formatMoney(metrics?.paid), meta: 'Payments received', icon: '✓', onClick: onPayments },
    { label: 'Outstanding', value: formatMoney(metrics?.outstanding), meta: 'Balance to collect', icon: '!', onClick: onAttention }
  ]

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
      {cards.map(card => (
        <button key={card.label} type="button" onClick={card.onClick} className="cresoa-metric-card">
          <span className="cresoa-metric-icon">{card.icon}</span>
          <span style={{ minWidth: 0 }}>
            <span className="cresoa-metric-label">{card.label}</span>
            <strong className="cresoa-metric-value">{card.value}</strong>
            <span className="cresoa-metric-meta">{card.meta}</span>
          </span>
        </button>
      ))}
    </div>
  )
}

function AttentionPanel({ orders, customers, onOrder, onOrders }) {
  const items = getAttentionOrders(orders)

  return (
    <DashboardCard>
      <SectionHeader
        title="Needs your attention"
        subtitle={items.length ? `${items.length} item${items.length > 1 ? 's' : ''} need action` : 'Everything looks clear'}
        action="View all"
        onAction={onOrders}
      />
      {items.length === 0 ? (
        <div className="cresoa-empty-state">
          <span className="cresoa-empty-state-message">✓ Nothing urgent right now</span>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 6 }}>
          {items.map(order => {
            const name = getOrderCustomerName(order, customers)
            return (
              <button key={order.id} type="button" onClick={() => onOrder?.(order)} className="cresoa-list-row">
                <span className="cresoa-avatar">{getInitials(name)}</span>
                <span style={{ minWidth: 0, flex: 1, textAlign: 'left' }}>
                  <strong className="cresoa-row-title">{name}</strong>
                  <span className="cresoa-row-meta">
                    {order.balance > 0 ? `${formatMoney(order.balance)} outstanding` : order.current_status}
                  </span>
                </span>
                <StatusPill status={order.current_status} />
                <span className="cresoa-row-arrow">›</span>
              </button>
            )
          })}
        </div>
      )}
    </DashboardCard>
  )
}

function ProductionPipeline({ orders, onStage }) {
  const counts = getProductionCounts(orders)

  return (
    <DashboardCard>
      <SectionHeader title="Production pipeline" subtitle="See what is moving through your workshop" />
      <div className="cresoa-pipeline">
        {PRODUCTION_STAGES.map((stage, index) => {
          const count = counts[stage] || 0
          return (
            <button key={stage} type="button" onClick={() => onStage?.(stage)} className="cresoa-pipeline-item">
              <span className="cresoa-pipeline-number">{count}</span>
              <span className="cresoa-pipeline-label">{stage}</span>
              {index < PRODUCTION_STAGES.length - 1 && <span className="cresoa-pipeline-line" />}
            </button>
          )
        })}
      </div>
    </DashboardCard>
  )
}

function AnalyticsCard({ series, period, onPeriodChange }) {
  const maxRevenue = Math.max(...series.map(day => safeAmount(day.revenue)), 1)
  const totalRevenue = series.reduce((sum, day) => sum + safeAmount(day.revenue), 0)
  const totalOrders = series.reduce((sum, day) => sum + safeAmount(day.orders), 0)

  return (
    <DashboardCard>
      <SectionHeader title="Analytics" subtitle="Daily performance" />
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, marginBottom: 18 }}>
        <div>
          <strong style={{ display: 'block', color: 'var(--cresoa-text)', fontSize: 24, letterSpacing: '-0.03em' }}>
            {formatMoney(totalRevenue)}
          </strong>
          <span style={{ color: 'var(--cresoa-text-muted)', fontSize: 12 }}>{totalOrders} orders</span>
        </div>
        <select value={period} onChange={e => onPeriodChange(e.target.value)} className="cresoa-select">
          <option value="7">7 days</option>
          <option value="14">14 days</option>
          <option value="30">30 days</option>
        </select>
      </div>
      <div className="cresoa-chart">
        {series.map(day => {
          const height = Math.max((safeAmount(day.revenue) / maxRevenue) * 100, day.revenue ? 4 : 1)
          return (
            <div key={day.key} className="cresoa-chart-day">
              <div className="cresoa-chart-bar-wrap">
                <div className="cresoa-chart-value" title={formatMoney(day.revenue)}>
                  {day.revenue > 0 ? formatMoney(day.revenue) : ''}
                </div>
                <div className="cresoa-chart-bar" style={{ height: `${height}%` }} />
              </div>
              <span>{day.label}</span>
            </div>
          )
        })}
      </div>
    </DashboardCard>
  )
}

function RecentOrders({ orders, customers, onOrder, onOrders }) {
  const recent = getRecentOrders(orders)

  return (
    <DashboardCard>
      <SectionHeader title="Recent orders" subtitle="Your latest customer orders" action="View all" onAction={onOrders} />
      {recent.length === 0 ? (
        <div className="cresoa-empty-state">
          <span className="cresoa-empty-state-title">No orders yet</span>
          <span className="cresoa-empty-state-message">Your latest orders will appear here.</span>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 4 }}>
          {recent.map(order => {
            const customer = getOrderCustomerName(order, customers)
            return (
              <button key={order.id} type="button" onClick={() => onOrder?.(order)} className="cresoa-list-row">
                <span className="cresoa-avatar">{getInitials(customer)}</span>
                <span style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                  <strong className="cresoa-row-title">{customer}</strong>
                  <span className="cresoa-row-meta">{formatShortDate(order.created_at)} · {formatMoney(order.price)}</span>
                </span>
                <StatusPill status={order.current_status} />
              </button>
            )
          })}
        </div>
      )}
    </DashboardCard>
  )
}


function RecentCustomers({ customers, onCustomer, onCustomers }) {
  const recent = getRecentCustomers(customers)

  return (
    <DashboardCard>
      <SectionHeader title="Recent customers" subtitle="People who recently ordered" action="View all" onAction={onCustomers} />
      {recent.length === 0 ? (
        <div className="cresoa-empty-state">
          <span className="cresoa-empty-state-title">No customers yet</span>
          <span className="cresoa-empty-state-message">New customers will appear here.</span>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 4 }}>
          {recent.map(customer => {
            const name = getCustomerName(customer)
            return (
              <button key={customer.id} type="button" onClick={() => onCustomer?.(customer)} className="cresoa-list-row">
                <span className="cresoa-avatar">{getInitials(name)}</span>
                <span style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                  <strong className="cresoa-row-title">{name}</strong>
                  <span className="cresoa-row-meta">Joined {formatShortDate(customer.created_at)}</span>
                </span>
                <span className="cresoa-row-arrow">›</span>
              </button>
            )
          })}
        </div>
      )}
    </DashboardCard>
  )
}

function GroupOrders({ groups, orders, customers, onGroup, onGroups }) {
  const [expandedId, setExpandedId] = useState(null)

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id)
  }

  const groupsWithProgress = groups.map(group => {
    const groupOrders = orders.filter(o => o.group_order_id === group.id)
    const total = groupOrders.length
    const delivered = groupOrders.filter(o => String(o.current_status || '').toLowerCase() === 'delivered').length
    const progress = total === 0 ? null : Math.round((delivered / total) * 100)
    return { ...group, totalOrders: total, deliveredOrders: delivered, progress }
  })

  return (
    <DashboardCard>
      <SectionHeader title="Group Orders" subtitle="Keep group orders organised" action="View all" onAction={onGroups} />
      {groupsWithProgress.length === 0 ? (
        <div className="cresoa-empty-state">
          <span className="cresoa-empty-state-title">No group orders</span>
          <span className="cresoa-empty-state-message">Create a group to manage coordinated outfits.</span>
        </div>
      ) : (
        <div className="cresoa-groups-grid">
          {groupsWithProgress.map(group => {
            const isExpanded = expandedId === group.id
            const coordinator = customers.find(c => c.id === group.coordinator_customer_id)

            return (
              <div key={group.id} className="cresoa-group-card" onClick={() => toggleExpand(group.id)}>
                <span className="cresoa-group-icon">✦</span>
                <div style={{ minWidth: 0, flex: 1, textAlign: 'left' }}>
                  <strong className="cresoa-row-title">{group.name}</strong>
                  <span className="cresoa-row-meta">
                    {group.progress !== null ? (
                      <span className="cresoa-group-progress">
                        <span className="cresoa-group-progress-bar">
                          <span className="cresoa-group-progress-bar-fill" style={{ width: `${group.progress}%` }} />
                        </span>
                        {group.progress}% complete
                      </span>
                    ) : (
                      'N/A'
                    )}
                    {coordinator && ` · ${coordinator.name}`}
                    {group.due_date && ` · Due ${formatShortDate(group.due_date)}`}
                  </span>
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
                        <strong>{formatDate(group.due_date)}</strong>
                      </div>
                    )}
                    <button
                      type="button"
                      className="cresoa-group-detail-button"
                      onClick={(e) => {
                        e.stopPropagation()
                        onGroup?.(group)
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
    </DashboardCard>
  )
}

function DashboardLoading() {
  return (
    <div className="cresoa-loading-grid">
      {[1, 2, 3, 4].map(item => (
        <div key={item} className="cresoa-skeleton-card">
          <div className="cresoa-skeleton short" />
          <div className="cresoa-skeleton long" />
          <div className="cresoa-skeleton medium" />
        </div>
      ))}
    </div>
  )
}

function DashboardError({ message, onRetry }) {
  return (
    <DashboardCard style={{ padding: '40px 24px', textAlign: 'center' }}>
      <div style={{ width: 48, height: 48, margin: '0 auto 16px', display: 'grid', placeItems: 'center', borderRadius: '50%', background: 'var(--cresoa-danger-soft)', color: 'var(--cresoa-danger)', fontSize: 24, fontWeight: 900 }}>
        !
      </div>
      <h2 style={{ margin: 0, color: 'var(--cresoa-text)', fontSize: 18 }}>Couldn't load dashboard</h2>
      <p style={{ margin: '8px auto 20px', maxWidth: 400, color: 'var(--cresoa-text-muted)', fontSize: 13 }}>{message || 'Please try again.'}</p>
      <button type="button" onClick={onRetry} className="cresoa-primary-button">Try again</button>
    </DashboardCard>
  )
}

function BusinessSnapshot({ metrics }) {
  const items = [
    { label: 'Orders', value: metrics?.orders || 0 },
    { label: 'Revenue', value: formatMoney(metrics?.revenue) },
    { label: 'Collected', value: formatMoney(metrics?.paid) },
    { label: 'Outstanding', value: formatMoney(metrics?.outstanding) }
  ]

  return (
    <DashboardCard>
      <SectionHeader title="Business snapshot" subtitle="A quick view of your numbers" />
      <div className="cresoa-snapshot-grid">
        {items.map(item => (
          <div key={item.label} className="cresoa-snapshot-item">
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </div>
        ))}
      </div>
    </DashboardCard>
  )
}

/* =========================================================
   MAIN DASHBOARD
   ========================================================= */

function FashionDashboard({ businessId }) {
  const router = useRouter()
  const { orders, customers, groups, business, loading, refreshing, error, refresh } = useFashionDashboardData(businessId)

  const [theme, setTheme] = useState('light')
  const [period, setPeriod] = useState('7')

  useEffect(() => {
    const saved = window.localStorage.getItem(THEME_STORAGE_KEY)
    const initial = saved === 'dark' ? 'dark' : 'light'
    setTheme(initial)
    document.documentElement.dataset.theme = initial
  }, [])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    window.localStorage.setItem(THEME_STORAGE_KEY, theme)
  }, [theme])

  const series = useMemo(() => getDaySeries(orders, Number(period)), [orders, period])
  const summary = useMemo(() => getAnalyticsSummary(orders), [orders])

  const navigateWithBusiness = (path) => {
  if (!businessId) {
    console.error('No businessId available for navigation')
    return
  }
  const separator = path.includes('?') ? '&' : '?'
  const url = `${path}${separator}business_id=${businessId}`
  console.log('Navigating to:', url)
  // Try router.push first, fallback to window.location if fails
  try {
    router.push(url)
  } catch (e) {
    console.warn('router.push failed, using window.location', e)
    window.location.href = url
  }
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
        <DashboardError message={error} onRetry={refresh} />
      </DashboardShell>
    )
  }

  return (
    <DashboardShell theme={theme}>
      <DashboardHeader
        business={business}
        refreshing={refreshing}
        onRefresh={refresh}
        onNewOrder={handleNewOrder}
        theme={theme}
        onToggleTheme={() => setTheme(current => (current === 'dark' ? 'light' : 'dark'))}
      />

      <TodayOverview metrics={summary} onOrders={handleOrders} onPayments={handleOrders} onAttention={handleOrders} />

      <div style={{ marginTop: 16 }}>
        <AttentionPanel orders={orders} customers={customers} onOrder={handleOrder} onOrders={handleOrders} />
      </div>

      <div style={{ marginTop: 16 }}>
        <ProductionPipeline orders={orders} onStage={handleStage} />
      </div>

      <div className="cresoa-main-grid" style={{ marginTop: 16 }}>
        <AnalyticsCard series={series} period={period} onPeriodChange={setPeriod} />
        <BusinessSnapshot metrics={summary} />
      </div>

      <div className="cresoa-two-column" style={{ marginTop: 16 }}>
        <RecentOrders orders={orders} customers={customers} onOrder={handleOrder} onOrders={handleOrders} />
        <RecentCustomers customers={customers} onCustomer={handleCustomer} onCustomers={handleCustomers} />
      </div>

      <div style={{ marginTop: 16 }}>
        <GroupOrders groups={groups} orders={orders} customers={customers} onGroup={handleGroup} onGroups={handleGroups} />
      </div>
    </DashboardShell>
  )
}

/* =========================================================
   SHELL & ENTRY
   ========================================================= */

function DashboardShell({ children, theme }) {
  return (
    <main className="cresoa-dashboard" data-theme={theme}>
      <div className="cresoa-dashboard-shell">
        <div className="cresoa-dashboard-content">{children}</div>
      </div>
    </main>
  )
}

function getBusinessIdFromUrl() {
  if (typeof window === 'undefined') return null
  const params = new URLSearchParams(window.location.search)
  return params.get('business_id') || params.get('businessId')
}

function useResolvedBusinessId(explicitBusinessId) {
  const [resolved, setResolved] = useState(explicitBusinessId || null)

  useEffect(() => {
    if (explicitBusinessId) {
      setResolved(explicitBusinessId)
      return
    }
    setResolved(getBusinessIdFromUrl())
  }, [explicitBusinessId])

  return resolved
}

function FashionDashboardEntry({ businessId }) {
  const resolvedBusinessId = useResolvedBusinessId(businessId)

  if (!resolvedBusinessId) {
    return (
      <DashboardShell theme="light">
        <DashboardCard style={{ padding: '40px 24px', textAlign: 'center' }}>
          <h2 style={{ margin: 0, color: 'var(--cresoa-text)', fontSize: 18 }}>Business account required</h2>
          <p style={{ margin: '8px 0 0', color: 'var(--cresoa-text-muted)', fontSize: 13 }}>
            Select a business account to view its dashboard.
          </p>
        </DashboardCard>
      </DashboardShell>
    )
  }

  return <FashionDashboard businessId={resolvedBusinessId} />
}

export default function Page({ searchParams }) {
  const businessId = searchParams?.business_id || searchParams?.businessId || null
  return <FashionDashboardEntry businessId={businessId} />
         }
