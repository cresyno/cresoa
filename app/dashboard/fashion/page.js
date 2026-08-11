'use client'

import {
  useEffect,
  useMemo,
  useState
} from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getCurrentBusinessId } from '@/lib/business'
import Icon from '@/components/Icon'

/* =========================================================
   CRESOA FASHION DASHBOARD
   Single-file dashboard
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

  return Number.isFinite(number)
    ? number
    : 0
}

function calculateBalance(order) {
  return Math.max(
    safeAmount(order?.price) -
      safeAmount(order?.amount_paid),
    0
  )
}

function formatMoney(value) {
  return `₦${safeAmount(value).toLocaleString(
    'en-NG'
  )}`
}

function formatDate(value) {
  if (!value) return '—'

  const date =
    value instanceof Date
      ? value
      : new Date(value)

  if (Number.isNaN(date.getTime())) {
    return '—'
  }

  return date.toLocaleDateString(
    'en-NG',
    {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }
  )
}

function formatShortDate(value) {
  if (!value) return '—'

  const date =
    value instanceof Date
      ? value
      : new Date(value)

  if (Number.isNaN(date.getTime())) {
    return '—'
  }

  return date.toLocaleDateString(
    'en-NG',
    {
      day: 'numeric',
      month: 'short'
    }
  )
}

function getDateKey(value) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  const year = date.getFullYear()
  const month = String(
    date.getMonth() + 1
  ).padStart(2, '0')
  const day = String(
    date.getDate()
  ).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function getInitials(name) {
  const value =
    String(name || 'C').trim()

  if (!value) return 'C'

  return value
    .split(/\s+/)
    .slice(0, 2)
    .map(part =>
      part.charAt(0).toUpperCase()
    )
    .join('')
}

function getCustomerName(customer) {
  if (!customer) {
    return 'Unnamed customer'
  }

  return (
    customer.full_name ||
    customer.name ||
    `${customer.first_name || ''} ${
      customer.last_name || ''
    }`.trim() ||
    'Unnamed customer'
  )
}

function getOrderCustomerName(
  order,
  customers
) {
  if (!order) {
    return 'Unknown customer'
  }

  if (order.customer_name) {
    return order.customer_name
  }

  const customer =
    customers.find(
      item =>
        item?.id ===
        order?.customer_id
    )

  return getCustomerName(customer)
     }

     /* =========================================================
   NORMALIZATION
   ========================================================= */

function normalizeOrder(order) {
  const status =
    order?.current_status ||
    order?.status ||
    order?.order_status ||
    'Order placed'

  const createdAt =
    order?.created_at ||
    order?.createdAt ||
    order?.date ||
    new Date().toISOString()

  const price = safeAmount(
    order?.price ??
    order?.total_amount ??
    order?.amount
  )

  const amountPaid = safeAmount(
    order?.amount_paid ??
    order?.paid_amount ??
    order?.amountPaid
  )

  return {
    ...order,
    id: order?.id,
    status,
    current_status: status,
    created_at: createdAt,
    price,
    amount_paid: amountPaid,
    balance: calculateBalance({
      price,
      amount_paid: amountPaid
    }),
    customer_name:
      order?.customer_name ||
      order?.customer?.name ||
      'Unknown customer'
  }
}

function normalizeCustomer(customer) {
  return {
    ...customer,
    id: customer?.id,
    name: getCustomerName(customer),
    created_at:
      customer?.created_at ||
      new Date().toISOString()
  }
}

function normalizeGroup(group) {
  return {
    ...group,
    id: group?.id,
    name:
      group?.name ||
      group?.group_name ||
      'Aso Ebi group',
    created_at:
      group?.created_at ||
      new Date().toISOString()
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
    date.setDate(
      today.getDate() - index
    )

    const key = getDateKey(date)

    const dayOrders = orders.filter(
      order =>
        getDateKey(order.created_at) === key
    )

    const revenue = dayOrders.reduce(
      (sum, order) =>
        sum + safeAmount(order.price),
      0
    )

    result.push({
      key,
      date,
      label: date.toLocaleDateString(
        'en-NG',
        { weekday: 'short' }
      ),
      shortDate: date.toLocaleDateString(
        'en-NG',
        {
          day: 'numeric',
          month: 'short'
        }
      ),
      orders: dayOrders.length,
      revenue
    })
  }

  return result
}

function getAnalyticsSummary(orders) {
  const revenue = orders.reduce(
    (sum, order) =>
      sum + safeAmount(order.price),
    0
  )

  const paid = orders.reduce(
    (sum, order) =>
      sum + safeAmount(order.amount_paid),
    0
  )

  const outstanding = orders.reduce(
    (sum, order) =>
      sum + safeAmount(order.balance),
    0
  )

  return {
    revenue,
    paid,
    outstanding,
    orders: orders.length
  }
}

function getProductionCounts(orders) {
  return PRODUCTION_STAGES.reduce(
    (result, stage) => {
      result[stage] = orders.filter(
        order =>
          String(
            order.current_status || ''
          ).toLowerCase() ===
          stage.toLowerCase()
      ).length

      return result
    },
    {}
  )
}

function getAttentionOrders(orders) {
  return orders
    .filter(order => {
      const status =
        String(
          order.current_status || ''
        ).toLowerCase()

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
    .sort(
      (a, b) =>
        new Date(b.created_at) -
        new Date(a.created_at)
    )
    .slice(0, 6)
}

function getRecentCustomers(customers) {
  return [...customers]
    .sort(
      (a, b) =>
        new Date(b.created_at) -
        new Date(a.created_at)
    )
    .slice(0, 5)
     }

function useFashionDashboardData(
  businessId
) {
  const [orders, setOrders] = useState([])
  const [customers, setCustomers] = useState([])
  const [groups, setGroups] = useState([])
  const [business, setBusiness] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] =
    useState(false)
  const [error, setError] = useState('')

  const load = async (
    silent = false
  ) => {
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

      const [
        businessResult,
        ordersResult,
        customersResult,
        groupsResult
      ] = await Promise.all([
        supabase
          .from('businesses')
          .select('*')
          .eq('id', businessId)
          .maybeSingle(),

        supabase
          .from('orders')
          .select('*')
          .eq(
            'business_id',
            businessId
          )
          .order(
            'created_at',
            { ascending: false }
          ),

        supabase
          .from('customers')
          .select('*')
          .eq(
            'business_id',
            businessId
          )
          .order(
            'created_at',
            { ascending: false }
          ),

        supabase
          .from('aso_ebi_groups')
          .select('*')
          .eq(
            'business_id',
            businessId
          )
          .order(
            'created_at',
            { ascending: false }
          )
      ])

      if (businessResult.error) {
        throw businessResult.error
      }

      if (ordersResult.error) {
        throw ordersResult.error
      }

      if (customersResult.error) {
        throw customersResult.error
      }

      if (groupsResult.error) {
        throw groupsResult.error
      }

      setBusiness(
        businessResult.data || null
      )

      setOrders(
        (ordersResult.data || [])
          .map(normalizeOrder)
      )

      setCustomers(
        (customersResult.data || [])
          .map(normalizeCustomer)
      )

      setGroups(
        (groupsResult.data || [])
          .map(normalizeGroup)
      )
    } catch (loadError) {
      console.error(
        'Cresoa dashboard:',
        loadError
      )

      setError(
        loadError?.message ||
        'Unable to load dashboard data.'
      )
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    load()
  }, [businessId])

  return {
    orders,
    customers,
    groups,
    business,
    loading,
    refreshing,
    error,
    refresh: () => load(true)
  }
}

function DashboardCard({
  children,
  style = {},
  className = ''
}) {
  return (
    <section
      className={`cresoa-card ${className}`}
      style={{
        background:
          'var(--cresoa-surface)',
        border:
          '1px solid var(--cresoa-border)',
        borderRadius: 18,
        boxShadow:
          '0 4px 18px rgba(15,45,70,.045)',
        minWidth: 0,
        ...style
      }}
    >
      {children}
    </section>
  )
}

function SectionHeader({
  title,
  subtitle,
  action,
  onAction
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 12,
        marginBottom: 16
      }}
    >
      <div style={{ minWidth: 0 }}>
        <h2
          style={{
            margin: 0,
            color: 'var(--cresoa-text)',
            fontSize: 15,
            fontWeight: 800,
            letterSpacing: '-.01em'
          }}
        >
          {title}
        </h2>

        {subtitle && (
          <p
            style={{
              margin: '4px 0 0',
              color: 'var(--cresoa-text-muted)',
              fontSize: 11,
              lineHeight: 1.45
            }}
          >
            {subtitle}
          </p>
        )}
      </div>

      {action && (
        <button
          type="button"
          onClick={onAction}
          style={{
            border: 0,
            background: 'transparent',
            color: 'var(--cresoa-accent)',
            cursor: 'pointer',
            fontSize: 11,
            fontWeight: 800,
            padding: 4
          }}
        >
          {action}
        </button>
      )}
    </div>
  )
}

function StatusPill({
  status
}) {
  const value =
    String(status || 'Order placed')

  const lower =
    value.toLowerCase()

  const tone =
    lower.includes('deliver') ||
    lower.includes('ready')
      ? 'success'
      : lower.includes('fitting') ||
        lower.includes('alter')
      ? 'warning'
      : lower.includes('cancel')
      ? 'danger'
      : 'info'

  return (
    <span
      className={`cresoa-status cresoa-status-${tone}`}
    >
      {value}
    </span>
  )
}

       function DashboardHeader({
  business,
  onRefresh,
  refreshing,
  onNewOrder,
  theme,
  onToggleTheme
}) {
  const businessName =
    business?.name ||
    business?.business_name ||
    'Your fashion business'

  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        marginBottom: 18
      }}
    >
      <div
        style={{
          minWidth: 0,
          flex: 1
        }}
      >
        <p
          style={{
            margin: 0,
            color: 'var(--cresoa-text-muted)',
            fontSize: 11,
            fontWeight: 600
          }}
        >
          Cresoa Fashion
        </p>

        <h1
          style={{
            margin: '3px 0 0',
            color: 'var(--cresoa-text)',
            fontSize: 'clamp(20px, 5vw, 27px)',
            lineHeight: 1.15,
            fontWeight: 850,
            letterSpacing: '-.035em',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
        >
          {businessName}
        </h1>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 7,
          flexShrink: 0
        }}
      >
        <button
          type="button"
          onClick={onToggleTheme}
          aria-label="Toggle theme"
          className="cresoa-icon-button"
        >
          {theme === 'dark' ? '☀' : '☾'}
        </button>

        <button
          type="button"
          onClick={onRefresh}
          disabled={refreshing}
          aria-label="Refresh dashboard"
          className="cresoa-icon-button"
        >
          <span
            style={{
              display: 'inline-block',
              transform: refreshing
                ? 'rotate(180deg)'
                : 'none',
              transition:
                'transform .3s ease'
            }}
          >
            ↻
          </span>
        </button>

        <button
          type="button"
          onClick={onNewOrder}
          className="cresoa-primary-button"
        >
          <span>+</span>
          <span className="cresoa-new-order-text">
            New order
          </span>
        </button>
      </div>
    </header>
  )
}

function TodayOverview({
  metrics,
  onOrders,
  onPayments,
  onAttention
}) {
  const cards = [
    {
      label: 'Revenue',
      value: formatMoney(
        metrics?.revenue
      ),
      meta: 'Total order value',
      icon: '₦',
      onClick: onOrders
    },
    {
      label: 'Orders',
      value: String(
        metrics?.orders || 0
      ),
      meta: 'Orders in period',
      icon: '◫',
      onClick: onOrders
    },
    {
      label: 'Paid',
      value: formatMoney(
        metrics?.paid
      ),
      meta: 'Payments received',
      icon: '✓',
      onClick: onPayments
    },
    {
      label: 'Outstanding',
      value: formatMoney(
        metrics?.outstanding
      ),
      meta: 'Balance to collect',
      icon: '!',
      onClick: onAttention
    }
  ]

  return (
    <div
      className="cresoa-overview-grid"
      style={{
        display: 'grid',
        gridTemplateColumns:
          'repeat(2, minmax(0, 1fr))',
        gap: 10
      }}
    >
      {cards.map(card => (
        <button
          key={card.label}
          type="button"
          onClick={card.onClick}
          className="cresoa-metric-card"
        >
          <span
            className="cresoa-metric-icon"
          >
            {card.icon}
          </span>

          <span
            style={{
              minWidth: 0
            }}
          >
            <span className="cresoa-metric-label">
              {card.label}
            </span>

            <strong className="cresoa-metric-value">
              {card.value}
            </strong>

            <span className="cresoa-metric-meta">
              {card.meta}
            </span>
          </span>
        </button>
      ))}
    </div>
  )
               }

           function AttentionPanel({
  orders,
  customers,
  onOrder,
  onOrders
}) {
  const items =
    getAttentionOrders(orders)

  return (
    <DashboardCard
      style={{
        padding: 16
      }}
    >
      <SectionHeader
        title="Needs your attention"
        subtitle={
          items.length
            ? `${items.length} item${
                items.length === 1
                  ? ''
                  : 's'
              } need action`
            : 'Everything looks clear'
        }
        action="View all"
        onAction={onOrders}
      />

      {items.length === 0 ? (
        <div
          style={{
            padding: '20px 4px',
            textAlign: 'center',
            color:
              'var(--cresoa-text-muted)',
            fontSize: 12
          }}
        >
          ✓ Nothing urgent right now
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gap: 8
          }}
        >
          {items.map(order => {
            const name =
              getOrderCustomerName(
                order,
                customers
              )

            return (
              <button
                key={order.id}
                type="button"
                onClick={() =>
                  onOrder?.(order)
                }
                className="cresoa-list-row"
              >
                <span
                  className="cresoa-avatar"
                >
                  {getInitials(name)}
                </span>

                <span
                  style={{
                    minWidth: 0,
                    flex: 1,
                    textAlign: 'left'
                  }}
                >
                  <strong className="cresoa-row-title">
                    {name}
                  </strong>

                  <span className="cresoa-row-meta">
                    {order.balance > 0
                      ? `${formatMoney(
                          order.balance
                        )} outstanding`
                      : order.current_status}
                  </span>
                </span>

                <StatusPill
                  status={
                    order.current_status
                  }
                />

                <span
                  className="cresoa-row-arrow"
                >
                  ›
                </span>
              </button>
            )
          })}
        </div>
      )}
    </DashboardCard>
  )
                     }

function ProductionPipeline({
  orders,
  onStage
}) {
  const counts =
    getProductionCounts(orders)

  return (
    <DashboardCard
      style={{ padding: 16 }}
    >
      <SectionHeader
        title="Production pipeline"
        subtitle="See what is moving through your workshop"
      />

      <div
        className="cresoa-pipeline"
      >
        {PRODUCTION_STAGES.map(
          (stage, index) => {
            const count =
              counts[stage] || 0

            return (
              <button
                key={stage}
                type="button"
                onClick={() =>
                  onStage?.(stage)
                }
                className="cresoa-pipeline-item"
              >
                <span
                  className="cresoa-pipeline-number"
                >
                  {count}
                </span>

                <span
                  className="cresoa-pipeline-label"
                >
                  {stage}
                </span>

                {index <
                  PRODUCTION_STAGES.length -
                    1 && (
                  <span
                    className="cresoa-pipeline-line"
                  />
                )}
              </button>
            )
          }
        )}
      </div>
    </DashboardCard>
  )
}

function AnalyticsCard({
  series,
  period,
  onPeriodChange
}) {
  const maxRevenue = Math.max(
    ...series.map(day =>
      safeAmount(day.revenue)
    ),
    1
  )

  const totalRevenue = series.reduce(
    (sum, day) =>
      sum + safeAmount(day.revenue),
    0
  )

  const totalOrders = series.reduce(
    (sum, day) =>
      sum + safeAmount(day.orders),
    0
  )

  return (
    <DashboardCard
      style={{ padding: 16 }}
    >
      <SectionHeader
        title="Analytics"
        subtitle="Daily performance"
      />

      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: 12,
          marginBottom: 18
        }}
      >
        <div>
          <strong
            style={{
              display: 'block',
              color: 'var(--cresoa-text)',
              fontSize: 22,
              letterSpacing: '-.03em'
            }}
          >
            {formatMoney(totalRevenue)}
          </strong>

          <span
            style={{
              color:
                'var(--cresoa-text-muted)',
              fontSize: 11
            }}
          >
            {totalOrders} orders
          </span>
        </div>

        <select
          value={period}
          onChange={event =>
            onPeriodChange(
              event.target.value
            )
          }
          className="cresoa-select"
          aria-label="Analytics period"
        >
          <option value="7">
            7 days
          </option>
          <option value="14">
            14 days
          </option>
          <option value="30">
            30 days
          </option>
        </select>
      </div>

      <div
        className="cresoa-chart"
        aria-label="Daily revenue chart"
      >
        {series.map(day => {
          const height =
            Math.max(
              (safeAmount(day.revenue) /
                maxRevenue) *
                100,
              day.revenue ? 4 : 1
            )

          return (
            <div
              key={day.key}
              className="cresoa-chart-day"
            >
              <div
                className="cresoa-chart-bar-wrap"
              >
                <div
                  className="cresoa-chart-value"
                  title={formatMoney(
                    day.revenue
                  )}
                >
                  {day.revenue > 0
                    ? formatMoney(
                        day.revenue
                      )
                    : ''}
                </div>

                <div
                  className="cresoa-chart-bar"
                  style={{
                    height: `${height}%`
                  }}
                />
              </div>

              <span>
                {day.label}
              </span>
            </div>
          )
        })}
      </div>
    </DashboardCard>
  )
}

function RecentOrders({
  orders,
  customers,
  onOrder,
  onOrders
}) {
  const recent =
    getRecentOrders(orders)

  return (
    <DashboardCard
      style={{ padding: 16 }}
    >
      <SectionHeader
        title="Recent orders"
        subtitle="Your latest customer orders"
        action="View all"
        onAction={onOrders}
      />

      {recent.length === 0 ? (
        <EmptyState
          title="No orders yet"
          message="Your latest orders will appear here."
        />
      ) : (
        <div
          style={{
            display: 'grid',
            gap: 4
          }}
        >
          {recent.map(order => {
            const customer =
              getOrderCustomerName(
                order,
                customers
              )

            return (
              <button
                key={order.id}
                type="button"
                onClick={() =>
                  onOrder?.(order)
                }
                className="cresoa-list-row"
              >
                <span
                  className="cresoa-avatar"
                >
                  {getInitials(customer)}
                </span>

                <span
                  style={{
                    flex: 1,
                    minWidth: 0,
                    textAlign: 'left'
                  }}
                >
                  <strong className="cresoa-row-title">
                    {customer}
                  </strong>

                  <span className="cresoa-row-meta">
                    {formatShortDate(
                      order.created_at
                    )}{' '}
                    ·{' '}
                    {formatMoney(
                      order.price
                    )}
                  </span>
                </span>

                <StatusPill
                  status={
                    order.current_status
                  }
                />
              </button>
            )
          })}
        </div>
      )}
    </DashboardCard>
  )
}

function EmptyState({
  title,
  message
}) {
  return (
    <div
      style={{
        padding: '24px 10px',
        textAlign: 'center'
      }}
    >
      <strong
        style={{
          display: 'block',
          color: 'var(--cresoa-text)',
          fontSize: 13
        }}
      >
        {title}
      </strong>

      <span
        style={{
          display: 'block',
          marginTop: 5,
          color: 'var(--cresoa-text-muted)',
          fontSize: 11,
          lineHeight: 1.5
        }}
      >
        {message}
      </span>
    </div>
  )
         }

function RecentCustomers({
  customers,
  onCustomer,
  onCustomers
}) {
  const recent =
    getRecentCustomers(customers)

  return (
    <DashboardCard
      style={{ padding: 16 }}
    >
      <SectionHeader
        title="Recent customers"
        subtitle="People who recently ordered"
        action="View all"
        onAction={onCustomers}
      />

      {recent.length === 0 ? (
        <EmptyState
          title="No customers yet"
          message="New customers will appear here."
        />
      ) : (
        <div
          style={{
            display: 'grid',
            gap: 4
          }}
        >
          {recent.map(customer => {
            const name =
              getCustomerName(customer)

            return (
              <button
                key={customer.id}
                type="button"
                onClick={() =>
                  onCustomer?.(customer)
                }
                className="cresoa-list-row"
              >
                <span
                  className="cresoa-avatar"
                >
                  {getInitials(name)}
                </span>

                <span
                  style={{
                    flex: 1,
                    minWidth: 0,
                    textAlign: 'left'
                  }}
                >
                  <strong className="cresoa-row-title">
                    {name}
                  </strong>

                  <span className="cresoa-row-meta">
                    Joined{' '}
                    {formatShortDate(
                      customer.created_at
                    )}
                  </span>
                </span>

                <span
                  className="cresoa-row-arrow"
                >
                  ›
                </span>
              </button>
            )
          })}
        </div>
      )}
    </DashboardCard>
  )
}

function AsoEbiGroups({
  groups,
  onGroup,
  onGroups
}) {
  const recent =
    groups.slice(0, 4)

  return (
    <DashboardCard
      style={{ padding: 16 }}
    >
      <SectionHeader
        title="Aso Ebi groups"
        subtitle="Keep group orders organised"
        action="View all"
        onAction={onGroups}
      />

      {recent.length === 0 ? (
        <EmptyState
          title="No Aso Ebi groups"
          message="Create a group to manage coordinated outfits."
        />
      ) : (
        <div
          className="cresoa-groups-grid"
        >
          {recent.map(group => (
            <button
              key={group.id}
              type="button"
              onClick={() =>
                onGroup?.(group)
              }
              className="cresoa-group-card"
            >
              <span
                className="cresoa-group-icon"
              >
                ✦
              </span>

              <span
                style={{
                  minWidth: 0,
                  flex: 1,
                  textAlign: 'left'
                }}
              >
                <strong
                  className="cresoa-row-title"
                >
                  {group.name}
                </strong>

                <span
                  className="cresoa-row-meta"
                >
                  Created{' '}
                  {formatShortDate(
                    group.created_at
                  )}
                </span>
              </span>

              <span
                className="cresoa-row-arrow"
              >
                ›
              </span>
            </button>
          ))}
        </div>
      )}
    </DashboardCard>
  )
           }

function DashboardLoading() {
  return (
    <div className="cresoa-loading-grid">
      {[1, 2, 3, 4].map(item => (
        <div
          key={item}
          className="cresoa-skeleton-card"
        >
          <div className="cresoa-skeleton short" />
          <div className="cresoa-skeleton long" />
          <div className="cresoa-skeleton medium" />
        </div>
      ))}
    </div>
  )
}

function DashboardError({
  message,
  onRetry
}) {
  return (
    <DashboardCard
      style={{
        padding: 24,
        textAlign: 'center'
      }}
    >
      <div
        style={{
          width: 42,
          height: 42,
          margin: '0 auto 12px',
          display: 'grid',
          placeItems: 'center',
          borderRadius: 14,
          background:
            'var(--cresoa-danger-soft)',
          color:
            'var(--cresoa-danger)',
          fontSize: 18,
          fontWeight: 800
        }}
      >
        !
      </div>

      <h2
        style={{
          margin: 0,
          color: 'var(--cresoa-text)',
          fontSize: 16
        }}
      >
        We couldn't load your dashboard
      </h2>

      <p
        style={{
          margin: '7px auto 16px',
          maxWidth: 420,
          color:
            'var(--cresoa-text-muted)',
          fontSize: 12,
          lineHeight: 1.5
        }}
      >
        {message ||
          'Please try again.'}
      </p>

      <button
        type="button"
        onClick={onRetry}
        className="cresoa-primary-button"
      >
        Try again
      </button>
    </DashboardCard>
  )
                 }

function BusinessSnapshot({
  metrics
}) {
  const items = [
    {
      label: 'Orders',
      value: metrics?.orders || 0
    },
    {
      label: 'Revenue',
      value: formatMoney(
        metrics?.revenue
      )
    },
    {
      label: 'Collected',
      value: formatMoney(
        metrics?.paid
      )
    },
    {
      label: 'Outstanding',
      value: formatMoney(
        metrics?.outstanding
      )
    }
  ]

  return (
    <DashboardCard
      style={{ padding: 16 }}
    >
      <SectionHeader
        title="Business snapshot"
        subtitle="A quick view of your numbers"
      />

      <div
        className="cresoa-snapshot-grid"
      >
        {items.map(item => (
          <div
            key={item.label}
            className="cresoa-snapshot-item"
          >
            <span>
              {item.label}
            </span>

            <strong>
              {item.value}
            </strong>
          </div>
        ))}
      </div>
    </DashboardCard>
  )
}

function FashionDashboard({
  businessId
}) {
  const router = useRouter()
  const searchParams =
    useSearchParams()

  const {
    orders,
    customers,
    groups,
    business,
    loading,
    refreshing,
    error,
    refresh
  } = useFashionDashboardData(
    businessId
  )

  const [theme, setTheme] =
    useState('light')

  const [period, setPeriod] =
    useState('7')

  useEffect(() => {
    const saved =
      window.localStorage.getItem(
        THEME_STORAGE_KEY
      )

    const initial =
      saved === 'dark'
        ? 'dark'
        : 'light'

    setTheme(initial)
    document.documentElement.dataset.theme =
      initial
  }, [])

  useEffect(() => {
    document.documentElement.dataset.theme =
      theme

    window.localStorage.setItem(
      THEME_STORAGE_KEY,
      theme
    )
  }, [theme])

  const series = useMemo(
    () =>
      getDaySeries(
        orders,
        Number(period)
      ),
    [orders, period]
  )

  const summary = useMemo(
    () =>
      getAnalyticsSummary(orders),
    [orders]
  )

  const handleNewOrder = () => {
    router.push(
      '/dashboard/fashion/orders/new'
    )
  }

  const handleOrder = order => {
    if (!order?.id) return

    router.push(
      `/dashboard/fashion/orders/${order.id}`
    )
  }

  const handleCustomer = customer => {
    if (!customer?.id) return

    router.push(
      `/dashboard/fashion/customers/${customer.id}`
    )
  }

  const handleGroup = group => {
    if (!group?.id) return

    router.push(
      `/dashboard/fashion/aso-ebi/${group.id}`
    )
  }

  const handleOrders = () => {
    router.push(
      '/dashboard/fashion/orders'
    )
  }

  const handleCustomers = () => {
    router.push(
      '/dashboard/fashion/customers'
    )
  }

  const handleGroups = () => {
    router.push(
      '/dashboard/fashion/aso-ebi'
    )
  }

  const handleStage = stage => {
    router.push(
      `/dashboard/fashion/orders?status=${encodeURIComponent(
        stage
      )}`
    )
  }

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
        <DashboardError
          message={error}
          onRetry={refresh}
        />
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
        onToggleTheme={() =>
          setTheme(
            current =>
              current === 'dark'
                ? 'light'
                : 'dark'
          )
        }
      />

      <TodayOverview
        metrics={summary}
        onOrders={handleOrders}
        onPayments={handleOrders}
        onAttention={handleOrders}
      />

      <div
        style={{
          marginTop: 14
        }}
      >
        <AttentionPanel
          orders={orders}
          customers={customers}
          onOrder={handleOrder}
          onOrders={handleOrders}
        />
      </div>

      <div
        style={{
          marginTop: 14
        }}
      >
        <ProductionPipeline
          orders={orders}
          onStage={handleStage}
        />
      </div>

      <div
        className="cresoa-main-grid"
        style={{
          marginTop: 14
        }}
      >
        <AnalyticsCard
          series={series}
          period={period}
          onPeriodChange={setPeriod}
        />

        <BusinessSnapshot
          metrics={summary}
        />
      </div>

      <div
        className="cresoa-two-column"
        style={{
          marginTop: 14
        }}
      >
        <RecentOrders
          orders={orders}
          customers={customers}
          onOrder={handleOrder}
          onOrders={handleOrders}
        />

        <RecentCustomers
          customers={customers}
          onCustomer={handleCustomer}
          onCustomers={handleCustomers}
        />
      </div>

      <div
        style={{
          marginTop: 14
        }}
      >
        <AsoEbiGroups
          groups={groups}
          onGroup={handleGroup}
          onGroups={handleGroups}
        />
      </div>
    </DashboardShell>
  )
       }

function DashboardShell({
  children,
  theme
}) {
  return (
    <main
      className="cresoa-dashboard"
      data-theme={theme}
    >
      <div
        className="cresoa-dashboard-shell"
      >
        <div
          className="cresoa-dashboard-content"
        >
          {children}
        </div>
      </div>
    </main>
  )
}

const dashboardStyles = `
  :root {
    --cresoa-bg: #f7f8f6;
    --cresoa-surface: #ffffff;
    --cresoa-surface-soft: #f1f4f1;
    --cresoa-text: #17221c;
    --cresoa-text-muted: #718078;
    --cresoa-text-soft: #9aa69f;
    --cresoa-border: #e4e9e5;
    --cresoa-accent: #174f3a;
    --cresoa-accent-soft: #e8f1ed;
    --cresoa-success: #237a52;
    --cresoa-success-soft: #e8f5ee;
    --cresoa-warning: #a66b18;
    --cresoa-warning-soft: #fbf1df;
    --cresoa-danger: #b84a4a;
    --cresoa-danger-soft: #fbeaea;
    --cresoa-info: #3d6f96;
    --cresoa-info-soft: #eaf2f8;
  }

  [data-theme="dark"] {
    --cresoa-bg: #101513;
    --cresoa-surface: #171d1a;
    --cresoa-surface-soft: #202823;
    --cresoa-text: #edf3ef;
    --cresoa-text-muted: #9aa8a0;
    --cresoa-text-soft: #68756e;
    --cresoa-border: #29332e;
    --cresoa-accent: #8fc6ad;
    --cresoa-accent-soft: #1d352b;
    --cresoa-success: #72c49c;
    --cresoa-success-soft: #193428;
    --cresoa-warning: #e0ad60;
    --cresoa-warning-soft: #382b18;
    --cresoa-danger: #e27b7b;
    --cresoa-danger-soft: #3b2020;
    --cresoa-info: #80afd0;
    --cresoa-info-soft: #1d2e3a;
  }

  .cresoa-dashboard {
    width: 100%;
    min-height: 100vh;
    background: var(--cresoa-bg);
    color: var(--cresoa-text);
    transition:
      background-color .2s ease,
      color .2s ease;
  }

  .cresoa-dashboard-shell {
    width: 100%;
    max-width: 1440px;
    margin: 0 auto;
    padding: 20px;
    box-sizing: border-box;
  }

  .cresoa-dashboard-content {
    width: 100%;
    min-width: 0;
  }

  .cresoa-icon-button,
  .cresoa-primary-button,
  .cresoa-metric-card,
  .cresoa-list-row,
  .cresoa-pipeline-item,
  .cresoa-group-card {
    font: inherit;
  }

  .cresoa-icon-button {
    width: 38px;
    height: 38px;
    border: 1px solid var(--cresoa-border);
    border-radius: 12px;
    background: var(--cresoa-surface);
    color: var(--cresoa-text);
    display: grid;
    place-items: center;
    cursor: pointer;
  }

  .cresoa-primary-button {
    min-height: 38px;
    padding: 0 13px;
    border: 0;
    border-radius: 12px;
    background: var(--cresoa-accent);
    color: #fff;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    cursor: pointer;
    font-size: 11px;
    font-weight: 800;
  }

  .cresoa-metric-card {
    width: 100%;
    min-width: 0;
    padding: 14px;
    border: 1px solid var(--cresoa-border);
    border-radius: 16px;
    background: var(--cresoa-surface);
    color: var(--cresoa-text);
    display: flex;
    align-items: center;
    gap: 10px;
    text-align: left;
    cursor: pointer;
  }

  .cresoa-metric-icon {
    width: 34px;
    height: 34px;
    flex: 0 0 34px;
    display: grid;
    place-items: center;
    border-radius: 11px;
    background: var(--cresoa-accent-soft);
    color: var(--cresoa-accent);
    font-size: 14px;
    font-weight: 900;
  }

  .cresoa-metric-label,
  .cresoa-metric-value,
  .cresoa-metric-meta {
    display: block;
  }

  .cresoa-metric-label {
    color: var(--cresoa-text-muted);
    font-size: 10px;
    font-weight: 700;
  }

  .cresoa-metric-value {
    margin-top: 2px;
    color: var(--cresoa-text);
    font-size: 16px;
    line-height: 1.2;
  }

  .cresoa-metric-meta {
    margin-top: 2px;
    color: var(--cresoa-text-soft);
    font-size: 9px;
  }

  .cresoa-list-row {
    width: 100%;
    min-width: 0;
    padding: 9px 4px;
    border: 0;
    border-bottom: 1px solid var(--cresoa-border);
    background: transparent;
    color: var(--cresoa-text);
    display: flex;
    align-items: center;
    gap: 9px;
    cursor: pointer;
    text-align: left;
  }

  .cresoa-list-row:last-child {
    border-bottom: 0;
  }

  .cresoa-avatar {
    width: 32px;
    height: 32px;
    flex: 0 0 32px;
    display: grid;
    place-items: center;
    border-radius: 50%;
    background: var(--cresoa-accent-soft);
    color: var(--cresoa-accent);
    font-size: 10px;
    font-weight: 900;
  }

  .cresoa-row-title,
  .cresoa-row-meta {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .cresoa-row-title {
    color: var(--cresoa-text);
    font-size: 11px;
  }

  .cresoa-row-meta {
    margin-top: 3px;
    color: var(--cresoa-text-muted);
    font-size: 9px;
  }

  .cresoa-row-arrow {
    color: var(--cresoa-text-soft);
    font-size: 18px;
    flex: 0 0 auto;
  }

  .cresoa-status {
    display: inline-flex;
    align-items: center;
    min-height: 22px;
    padding: 0 7px;
    border-radius: 999px;
    font-size: 8px;
    font-weight: 800;
    white-space: nowrap;
  }

  .cresoa-status-success {
    background: var(--cresoa-success-soft);
    color: var(--cresoa-success);
  }

  .cresoa-status-warning {
    background: var(--cresoa-warning-soft);
    color: var(--cresoa-warning);
  }

  .cresoa-status-danger {
    background: var(--cresoa-danger-soft);
    color: var(--cresoa-danger);
  }

  .cresoa-status-info {
    background: var(--cresoa-info-soft);
    color: var(--cresoa-info);
  }

  .cresoa-main-grid {
    display: grid;
    grid-template-columns: minmax(0, 1.6fr) minmax(220px, .8fr);
    gap: 14px;
  }

  .cresoa-two-column {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 14px;
  }

  .cresoa-pipeline {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 4px;
  }

  .cresoa-pipeline-item {
    position: relative;
    min-width: 0;
    padding: 4px;
    border: 0;
    background: transparent;
    color: var(--cresoa-text);
    cursor: pointer;
  }

  .cresoa-pipeline-number {
    width: 38px;
    height: 38px;
    margin: 0 auto 7px;
    display: grid;
    place-items: center;
    border-radius: 50%;
    background: var(--cresoa-accent-soft);
    color: var(--cresoa-accent);
    font-size: 12px;
    font-weight: 900;
  }

  .cresoa-pipeline-label {
    display: block;
    color: var(--cresoa-text-muted);
    font-size: 9px;
    line-height: 1.3;
  }

  .cresoa-pipeline-line {
    position: absolute;
    top: 22px;
    left: calc(50% + 23px);
    right: calc(-50% + 23px);
    height: 1px;
    background: var(--cresoa-border);
    pointer-events: none;
  }

  .cresoa-chart {
    height: 190px;
    display: flex;
    align-items: stretch;
    gap: 7px;
    overflow-x: auto;
    padding-top: 4px;
  }

  .cresoa-chart-day {
    min-width: 30px;
    flex: 1 0 30px;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    align-items: center;
    gap: 6px;
    color: var(--cresoa-text-muted);
    font-size: 8px;
  }

  .cresoa-chart-bar-wrap {
    width: 100%;
    height: 155px;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    align-items: center;
  }

  .cresoa-chart-value {
    min-height: 12px;
    margin-bottom: 3px;
    color: var(--cresoa-text-soft);
    font-size: 7px;
    white-space: nowrap;
  }

  .cresoa-chart-bar {
    width: min(18px, 70%);
    min-height: 1px;
    border-radius: 7px 7px 3px 3px;
    background: var(--cresoa-accent);
    transition: height .3s ease;
  }

  .cresoa-select {
    min-height: 32px;
    padding: 0 9px;
    border: 1px solid var(--cresoa-border);
    border-radius: 9px;
    background: var(--cresoa-surface);
    color: var(--cresoa-text);
    font-size: 10px;
    font-weight: 700;
    outline: none;
  }

  .cresoa-snapshot-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }

  .cresoa-snapshot-item {
    padding: 11px;
    border-radius: 12px;
    background: var(--cresoa-surface-soft);
  }

  .cresoa-snapshot-item span,
  .cresoa-snapshot-item strong {
    display: block;
  }

  .cresoa-snapshot-item span {
    color: var(--cresoa-text-muted);
    font-size: 9px;
  }

  .cresoa-snapshot-item strong {
    margin-top: 4px;
    color: var(--cresoa-text);
    font-size: 13px;
  }

  .cresoa-groups-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }

  .cresoa-group-card {
    min-width: 0;
    padding: 11px;
    border: 1px solid var(--cresoa-border);
    border-radius: 13px;
    background: var(--cresoa-surface-soft);
    color: var(--cresoa-text);
    display: flex;
    align-items: center;
    gap: 9px;
    cursor: pointer;
  }

  .cresoa-group-icon {
    width: 30px;
    height: 30px;
    flex: 0 0 30px;
    display: grid;
    place-items: center;
    border-radius: 10px;
    background: var(--cresoa-accent);
    color: #fff;
    font-size: 12px;
  }

  .cresoa-loading-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }

  .cresoa-skeleton-card {
    min-height: 130px;
    padding: 16px;
    border-radius: 16px;
    background: var(--cresoa-surface);
    border: 1px solid var(--cresoa-border);
  }

  .cresoa-skeleton {
    height: 10px;
    margin-bottom: 12px;
    border-radius: 6px;
    background: var(--cresoa-surface-soft);
    animation: cresoa-pulse 1.2s ease-in-out infinite;
  }

  .cresoa-skeleton.short {
    width: 30%;
  }

  .cresoa-skeleton.medium {
    width: 55%;
  }

  .cresoa-skeleton.long {
    width: 80%;
    height: 24px;
  }

  @keyframes cresoa-pulse {
    50% {
      opacity: .45;
    }
  }

  @media (max-width: 760px) {
    .cresoa-dashboard-shell {
      padding: 14px;
    }

    .cresoa-main-grid,
    .cresoa-two-column {
      grid-template-columns: 1fr;
    }

    .cresoa-pipeline {
      overflow-x: auto;
      grid-template-columns: repeat(5, minmax(72px, 1fr));
    }
  }

  @media (max-width: 480px) {
    .cresoa-dashboard-shell {
      padding: 11px;
    }

    .cresoa-new-order-text {
      display: none;
    }

    .cresoa-primary-button {
      width: 38px;
      padding: 0;
    }

    .cresoa-main-grid,
    .cresoa-two-column {
      gap: 10px;
    }

    .cresoa-chart {
      height: 175px;
    }
  }
`

function DashboardStyles() {
  return (
    <style
      dangerouslySetInnerHTML={{
        __html: dashboardStyles
      }}
    />
  )
}

function FashionDashboardPage({
  businessId
}) {
  return (
    <>
      <DashboardStyles />

      <FashionDashboard
        businessId={businessId}
      />
    </>
  )
         }

function safeAmount(value) {
  const number =
    Number(value)

  return Number.isFinite(number)
    ? number
    : 0
}


function formatMoney(value) {
  const amount =
    safeAmount(value)

  return new Intl.NumberFormat(
    'en-NG',
    {
      style: 'currency',
      currency: 'NGN',
      maximumFractionDigits: 0
    }
  ).format(amount)
}


function formatShortDate(value) {
  if (!value) {
    return '—'
  }

  try {
    return new Intl.DateTimeFormat(
      'en-NG',
      {
        day: 'numeric',
        month: 'short'
      }
    ).format(
      new Date(value)
    )
  } catch {
    return '—'
  }
}


function getInitials(name = '') {
  return String(name)
    .trim()
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(
      part =>
        part[0]?.toUpperCase()
    )
    .join('') || 'C'
}


function getCustomerName(customer) {
  return (
    customer?.name ||
    customer?.full_name ||
    customer?.customer_name ||
    'Customer'
  )
}


function getOrderCustomerName(
  order,
  customers = []
) {
  if (
    order?.customer_name
  ) {
    return order.customer_name
  }

  const customer =
    customers.find(
      item =>
        item.id ===
        order?.customer_id
    )

  return getCustomerName(customer)
}

         function normalizeOrder(order = {}) {
  const price = safeAmount(
    order.price ??
      order.total_amount ??
      order.total ??
      order.amount
  )

  const paid = safeAmount(
    order.paid ??
      order.amount_paid ??
      order.paid_amount
  )

  const balance = Math.max(
    price - paid,
    0
  )

  return {
    ...order,

    id:
      order.id ||
      order.order_id ||
      null,

    price,

    paid,

    balance,

    current_status:
      order.current_status ||
      order.status ||
      order.order_status ||
      'Order placed',

    customer_id:
      order.customer_id ||
      order.customerId ||
      null,

    customer_name:
      order.customer_name ||
      order.customerName ||
      '',

    created_at:
      order.created_at ||
      order.createdAt ||
      null
  }
}


function normalizeCustomer(
  customer = {}
) {
  return {
    ...customer,

    id:
      customer.id ||
      customer.customer_id ||
      null,

    name:
      customer.name ||
      customer.full_name ||
      customer.customer_name ||
      'Customer',

    created_at:
      customer.created_at ||
      customer.createdAt ||
      null
  }
}


function normalizeGroup(group = {}) {
  return {
    ...group,

    id:
      group.id ||
      group.group_id ||
      null,

    name:
      group.name ||
      group.group_name ||
      'Aso Ebi group',

    created_at:
      group.created_at ||
      group.createdAt ||
      null
  }
}


function getRecentOrders(
  orders = []
) {
  return [...orders]
    .filter(item => item?.id)
    .sort(
      (a, b) =>
        new Date(
          b.created_at || 0
        ) -
        new Date(
          a.created_at || 0
        )
    )
    .slice(0, 5)
}


function getRecentCustomers(
  customers = []
) {
  return [...customers]
    .filter(item => item?.id)
    .sort(
      (a, b) =>
        new Date(
          b.created_at || 0
        ) -
        new Date(
          a.created_at || 0
        )
    )
    .slice(0, 5)
            }

const PRODUCTION_STAGES = [
  'Order placed',
  'Cutting',
  'Sewing',
  'Fitting',
  'Ready'
]


function getProductionCounts(
  orders = []
) {
  const counts = {}

  PRODUCTION_STAGES.forEach(
    stage => {
      counts[stage] = 0
    }
  )

  orders.forEach(order => {
    const status =
      String(
        order?.current_status || ''
      ).trim()

    const stage =
      PRODUCTION_STAGES.find(
        item =>
          item.toLowerCase() ===
          status.toLowerCase()
      )

    if (stage) {
      counts[stage] += 1
    }
  })

  return counts
}


function getAttentionOrders(
  orders = []
) {
  return [...orders]
    .filter(order => {
      const status =
        String(
          order?.current_status || ''
        ).toLowerCase()

      return (
        safeAmount(
          order?.balance
        ) > 0 ||
        status.includes(
          'fitting'
        ) ||
        status.includes(
          'overdue'
        ) ||
        status.includes(
          'pending'
        )
      )
    })
    .sort(
      (a, b) =>
        new Date(
          b.created_at || 0
        ) -
        new Date(
          a.created_at || 0
        )
    )
    .slice(0, 5)
}


function getDayKey(date) {
  const year =
    date.getFullYear()

  const month =
    String(
      date.getMonth() + 1
    ).padStart(2, '0')

  const day =
    String(
      date.getDate()
    ).padStart(2, '0')

  return `${year}-${month}-${day}`
}


function getDaySeries(
  orders = [],
  days = 7
) {
  const totalDays =
    Math.max(
      Number(days) || 7,
      1
    )

  const result = []

  for (
    let index = totalDays - 1;
    index >= 0;
    index -= 1
  ) {
    const date =
      new Date()

    date.setHours(
      0,
      0,
      0,
      0
    )

    date.setDate(
      date.getDate() - index
    )

    const key =
      getDayKey(date)

    const dayOrders =
      orders.filter(order => {
        if (!order?.created_at) {
          return false
        }

        const orderDate =
          new Date(
            order.created_at
          )

        return (
          getDayKey(orderDate) ===
          key
        )
      })

    const revenue =
      dayOrders.reduce(
        (sum, order) =>
          sum +
          safeAmount(
            order?.price
          ),
        0
      )

    result.push({
      key,
      label:
        new Intl.DateTimeFormat(
          'en-NG',
          {
            weekday: 'short'
          }
        ).format(date),
      revenue,
      orders:
        dayOrders.length
    })
  }

  return result
}

function getAnalyticsSummary(
  orders = []
) {
  const revenue = orders.reduce(
    (sum, order) =>
      sum +
      safeAmount(order?.price),
    0
  )

  const paid = orders.reduce(
    (sum, order) =>
      sum +
      safeAmount(order?.paid),
    0
  )

  const outstanding =
    orders.reduce(
      (sum, order) =>
        sum +
        safeAmount(
          order?.balance
        ),
      0
    )

  return {
    revenue,
    paid,
    outstanding,
    orders: orders.length
  }
}


function getAnalyticsPeriodSummary(
  orders = [],
  days = 7
) {
  const series =
    getDaySeries(
      orders,
      days
    )

  return {
    revenue: series.reduce(
      (sum, day) =>
        sum +
        safeAmount(
          day.revenue
        ),
      0
    ),

    orders: series.reduce(
      (sum, day) =>
        sum +
        safeAmount(
          day.orders
        ),
      0
    ),

    series
  }
}


function getMaxRevenue(
  series = []
) {
  return series.reduce(
    (maximum, day) =>
      Math.max(
        maximum,
        safeAmount(
          day?.revenue
        )
      ),
    0
  )
     }

function getPeriodSeries(
  orders = [],
  period = '7'
) {
  const days =
    Number(period) || 7

  return getDaySeries(
    orders,
    days
  )
}


function getPeriodRevenue(
  series = []
) {
  return series.reduce(
    (total, day) =>
      total +
      safeAmount(day?.revenue),
    0
  )
}


function getPeriodOrders(
  series = []
) {
  return series.reduce(
    (total, day) =>
      total +
      safeAmount(day?.orders),
    0
  )
}


function getPeriodMaxRevenue(
  series = []
) {
  return getMaxRevenue(
    series
  )
}

const THEME_STORAGE_KEY =
  'cresoa-dashboard-theme'


function getBusinessIdFromUrl() {
  if (
    typeof window ===
    'undefined'
  ) {
    return null
  }

  const params =
    new URLSearchParams(
      window.location.search
    )

  return (
    params.get(
      'business_id'
    ) ||
    params.get(
      'businessId'
    )
  )
}


function resolveBusinessId(
  explicitBusinessId
) {
  if (explicitBusinessId) {
    return explicitBusinessId
  }

  return getBusinessIdFromUrl()
}


function useResolvedBusinessId(
  explicitBusinessId
) {
  const [
    resolvedBusinessId,
    setResolvedBusinessId
  ] = useState(
    explicitBusinessId || null
  )

  useEffect(() => {
    if (explicitBusinessId) {
      setResolvedBusinessId(
        explicitBusinessId
      )
      return
    }

    setResolvedBusinessId(
      getBusinessIdFromUrl()
    )
  }, [explicitBusinessId])

  return resolvedBusinessId
}

function FashionDashboardEntry({
  businessId
}) {
  const resolvedBusinessId =
    useResolvedBusinessId(
      businessId
    )

  if (!resolvedBusinessId) {
    return (
      <DashboardShell theme="light">
        <DashboardCard
          style={{
            padding: 24,
            textAlign: 'center'
          }}
        >
          <h2
            style={{
              margin: 0,
              color:
                'var(--cresoa-text)',
              fontSize: 16
            }}
          >
            Business account required
          </h2>

          <p
            style={{
              margin:
                '7px 0 0',
              color:
                'var(--cresoa-text-muted)',
              fontSize: 12,
              lineHeight: 1.5
            }}
          >
            Select a business account
            to view its dashboard.
          </p>
        </DashboardCard>
      </DashboardShell>
    )
  }

  return (
    <FashionDashboard
      businessId={
        resolvedBusinessId
      }
    />
  )
               }

export default function Page({
  searchParams
}) {
  const businessId =
    searchParams?.business_id ||
    searchParams?.businessId ||
    null

  return (
    <FashionDashboardEntry
      businessId={
        businessId
      }
    />
  )
                 }
