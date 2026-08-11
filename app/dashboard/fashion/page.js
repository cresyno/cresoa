'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getCurrentBusinessId } from '@/lib/business'
import Icon from '@/components/Icon'

/* ============================================================
   CRESOA DASHBOARD
   Foundation / theme / shared utilities
   ============================================================ */

const THEME_STORAGE_KEY = 'cresoa-theme'

const CRESOA_THEME = {
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
    infoSoft: '#EAF3FB',
    shadow: '0 8px 28px rgba(15,45,70,0.07)',
    shadowStrong: '0 16px 45px rgba(15,45,70,0.11)',
    overlay: 'rgba(9,34,56,0.42)'
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
    infoSoft: '#142C40',
    shadow: '0 8px 28px rgba(0,0,0,0.22)',
    shadowStrong: '0 18px 48px rgba(0,0,0,0.34)',
    overlay: 'rgba(0,0,0,0.62)'
  }
}

const STATUS_MAP = {
  'Order placed': {
    label: 'Order placed',
    tone: 'info'
  },
  Cutting: {
    label: 'Cutting',
    tone: 'warning'
  },
  Sewing: {
    label: 'Sewing',
    tone: 'info'
  },
  Fitting: {
    label: 'Fitting',
    tone: 'warning'
  },
  Alteration: {
    label: 'Alteration',
    tone: 'warning'
  },
  Ready: {
    label: 'Ready',
    tone: 'success'
  },
  Delivered: {
    label: 'Delivered',
    tone: 'success'
  }
}

const PRODUCTION_STAGES = [
  'Order placed',
  'Cutting',
  'Sewing',
  'Fitting',
  'Alteration',
  'Ready',
  'Delivered'
]

function safeAmount(value) {
  const amount = Number(value)
  return Number.isFinite(amount) ? amount : 0
}

function calculateBalance(order) {
  return Math.max(
    safeAmount(order?.price) - safeAmount(order?.amount_paid),
    0
  )
}

function formatMoney(value) {
  return `₦${safeAmount(value).toLocaleString('en-NG')}`
}

function formatDate(value) {
  if (!value) return '—'

  const date = value instanceof Date ? value : new Date(value)

  if (Number.isNaN(date.getTime())) return '—'

  return date.toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}

function formatShortDate(value) {
  if (!value) return '—'

  const date = value instanceof Date ? value : new Date(value)

  if (Number.isNaN(date.getTime())) return '—'

  return date.toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'short'
  })
}

function isOrderDelivered(order) {
  return String(order?.current_status || '')
    .trim()
    .toLowerCase() === 'delivered'
}

function isOrderOverdue(order) {
  if (!order?.due_date || isOrderDelivered(order)) return false

  const due = new Date(order.due_date)
  if (Number.isNaN(due.getTime())) return false

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  due.setHours(0, 0, 0, 0)

  return due < today
}

function daysUntil(value) {
  if (!value) return null

  const target = new Date(value)
  if (Number.isNaN(target.getTime())) return null

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  target.setHours(0, 0, 0, 0)

  return Math.round((target - today) / 86400000)
}

function getStatusBadge(status) {
  return STATUS_MAP[status] || {
    label: status || 'Unknown',
    tone: 'info'
  }
}

function getGreeting() {
  const hour = new Date().getHours()

  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
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

function getDateKey(date) {
  const value = new Date(date)

  if (Number.isNaN(value.getTime())) return ''

  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
    }

function getStoredTheme() {
  if (typeof window === 'undefined') return 'light'

  const stored = window.localStorage.getItem(THEME_STORAGE_KEY)

  if (stored === 'dark' || stored === 'light') {
    return stored
  }

  if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
    return 'dark'
  }

  return 'light'
}

function ThemeStyle({ theme }) {
  const colors = CRESOA_THEME[theme]

  return (
    <style jsx global>{`
      :root {
        --cresoa-bg: ${colors.bg};
        --cresoa-surface: ${colors.surface};
        --cresoa-surface-raised: ${colors.surfaceRaised};
        --cresoa-primary: ${colors.primary};
        --cresoa-primary-deep: ${colors.primaryDeep};
        --cresoa-accent: ${colors.accent};
        --cresoa-accent-soft: ${colors.accentSoft};
        --cresoa-text: ${colors.text};
        --cresoa-text-muted: ${colors.textMuted};
        --cresoa-text-soft: ${colors.textSoft};
        --cresoa-border: ${colors.border};
        --cresoa-success: ${colors.success};
        --cresoa-success-soft: ${colors.successSoft};
        --cresoa-warning: ${colors.warning};
        --cresoa-warning-soft: ${colors.warningSoft};
        --cresoa-danger: ${colors.danger};
        --cresoa-danger-soft: ${colors.dangerSoft};
        --cresoa-info: ${colors.info};
        --cresoa-info-soft: ${colors.infoSoft};
        --cresoa-shadow: ${colors.shadow};
        --cresoa-shadow-strong: ${colors.shadowStrong};
        --cresoa-overlay: ${colors.overlay};
      }

      * {
        box-sizing: border-box;
      }

      html {
        background: var(--cresoa-bg);
      }

      body {
        margin: 0;
        background: var(--cresoa-bg);
        color: var(--cresoa-text);
        font-family:
          Inter,
          ui-sans-serif,
          system-ui,
          -apple-system,
          BlinkMacSystemFont,
          "Segoe UI",
          sans-serif;
        -webkit-font-smoothing: antialiased;
        text-rendering: optimizeLegibility;
        overflow-x: hidden;
      }

      button,
      input,
      select,
      textarea {
        font: inherit;
      }

      button {
        -webkit-tap-highlight-color: transparent;
      }

      a {
        color: inherit;
        text-decoration: none;
      }

      ::selection {
        background: var(--cresoa-accent-soft);
        color: var(--cresoa-primary);
      }

      .cresoa-page {
        min-height: 100dvh;
        width: 100%;
        background:
          radial-gradient(
            circle at 92% 0%,
            var(--cresoa-accent-soft) 0,
            transparent 22rem
          ),
          var(--cresoa-bg);
        color: var(--cresoa-text);
      }

      .cresoa-shell {
        width: min(100%, 1440px);
        margin: 0 auto;
        padding: 18px 16px 110px;
      }

      .cresoa-content {
        width: 100%;
        min-width: 0;
      }

      .cresoa-grid {
        display: grid;
        gap: 14px;
        min-width: 0;
      }

      .cresoa-card {
        min-width: 0;
        background: var(--cresoa-surface);
        border: 1px solid var(--cresoa-border);
        border-radius: 20px;
        box-shadow: var(--cresoa-shadow);
      }

      .cresoa-card-interactive {
        transition:
          transform 180ms ease,
          box-shadow 180ms ease,
          border-color 180ms ease;
      }

      .cresoa-card-interactive:hover {
        transform: translateY(-2px);
        box-shadow: var(--cresoa-shadow-strong);
      }

      .cresoa-card-interactive:active {
        transform: translateY(0);
      }

      .cresoa-section-heading {
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        gap: 12px;
        min-width: 0;
      }

      .cresoa-section-heading h2 {
        margin: 0;
        font-size: 16px;
        line-height: 1.25;
        font-weight: 750;
        letter-spacing: -0.02em;
      }

      .cresoa-section-heading p {
        margin: 4px 0 0;
        color: var(--cresoa-text-muted);
        font-size: 12px;
        line-height: 1.4;
      }

      .cresoa-button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        min-height: 42px;
        padding: 0 14px;
        border: 1px solid transparent;
        border-radius: 12px;
        cursor: pointer;
        font-size: 13px;
        font-weight: 700;
        transition:
          transform 150ms ease,
          background 150ms ease,
          border-color 150ms ease,
          box-shadow 150ms ease;
      }

      .cresoa-button:active {
        transform: scale(0.98);
      }

      .cresoa-button-primary {
        background: var(--cresoa-primary);
        color: #fff;
        box-shadow: 0 6px 18px rgba(15, 45, 70, 0.14);
      }

      .cresoa-button-primary:hover {
        background: var(--cresoa-primary-deep);
      }

      .cresoa-button-secondary {
        background: var(--cresoa-surface);
        border-color: var(--cresoa-border);
        color: var(--cresoa-text);
      }

      .cresoa-button-secondary:hover {
        border-color: var(--cresoa-accent);
      }

      .cresoa-button-accent {
        background: var(--cresoa-accent);
        color: #17202A;
      }

      .cresoa-icon-button {
        width: 42px;
        height: 42px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border: 1px solid var(--cresoa-border);
        border-radius: 12px;
        background: var(--cresoa-surface);
        color: var(--cresoa-text);
        cursor: pointer;
        transition:
          background 150ms ease,
          border-color 150ms ease,
          transform 150ms ease;
      }

      .cresoa-icon-button:hover {
        border-color: var(--cresoa-accent);
        background: var(--cresoa-accent-soft);
      }

      .cresoa-icon-button:active {
        transform: scale(0.96);
      }

      .cresoa-muted {
        color: var(--cresoa-text-muted);
      }

      .cresoa-small {
        font-size: 12px;
      }

      .cresoa-label {
        color: var(--cresoa-text-muted);
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.05em;
        text-transform: uppercase;
      }

      .cresoa-scroll-safe {
        width: 100%;
        min-width: 0;
        max-width: 100%;
      }

      @media (min-width: 640px) {
        .cresoa-shell {
          padding: 24px 22px 48px;
        }

        .cresoa-grid {
          gap: 18px;
        }
      }

      @media (min-width: 768px) {
        .cresoa-shell {
          padding: 28px 28px 56px;
        }
      }

      @media (min-width: 1024px) {
        .cresoa-shell {
          padding: 30px 34px 64px;
        }
      }

      @media (min-width: 1280px) {
        .cresoa-shell {
          padding-left: 42px;
          padding-right: 42px;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        *,
        *::before,
        *::after {
          scroll-behavior: auto !important;
          transition-duration: 0.01ms !important;
          animation-duration: 0.01ms !important;
        }
      }

            .cresoa-desktop-action {
        display: none;
      }

      @media (min-width: 640px) {
        .cresoa-desktop-action {
          display: inline;
        }
      }

      @media (min-width: 768px) {
        .cresoa-today-grid {
          grid-template-columns:
            repeat(4, minmax(0, 1fr));
        }
      }

            .cresoa-section-grid {
        width: 100%;
      }

      @media (min-width: 900px) {
        .cresoa-section-grid {
          grid-template-columns:
            repeat(2, minmax(0, 1fr));
          gap: 18px;
        }
      }

      @media (min-width: 1200px) {
        .cresoa-section-grid {
          gap: 20px;
        }
      }

            .cresoa-skeleton {
        position: relative;
        overflow: hidden;
        background: var(--cresoa-border);
      }

      .cresoa-skeleton::after {
        content: "";
        position: absolute;
        inset: 0;
        transform: translateX(-100%);
        background: linear-gradient(
          90deg,
          transparent,
          var(--cresoa-surface-raised),
          transparent
        );
        animation: cresoaSkeleton 1.35s infinite;
      }

      @keyframes cresoaSkeleton {
        100% {
          transform: translateX(100%);
        }
      }

      @media (min-width: 900px) {
        .cresoa-dashboard-layout {
          grid-template-columns:
            minmax(0, 1.55fr)
            minmax(300px, 0.75fr) !important;
          gap: 18px !important;
        }

        .cresoa-dashboard-main {
          gap: 18px !important;
        }

        .cresoa-dashboard-sidebar {
          gap: 18px !important;
        }
      }

      @media (min-width: 1180px) {
        .cresoa-dashboard-layout {
          grid-template-columns:
            minmax(0, 1.7fr)
            minmax(330px, 0.72fr) !important;
          gap: 20px !important;
        }
      }

      @media (min-width: 768px) {
        .cresoa-grid {
          gap: 18px;
        }
      }

      @media(min-width:900px){
  .cresoa-dashboard-two-column{
    grid-template-columns:
      minmax(0,1.15fr)
      minmax(300px,.85fr)!important;
  }
}

@media(min-width:1200px){
  .cresoa-dashboard-grid{
    max-width:1400px;
    margin-inline:auto;
  }
}
  )
}

function ThemeToggle({ theme, onToggle }) {
  const isDark = theme === 'dark'

  return (
    <button
      type="button"
      className="cresoa-icon-button"
      onClick={onToggle}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Light mode' : 'Dark mode'}
    >
      <Icon
        name={isDark ? 'sun' : 'moon'}
        size={18}
      />
    </button>
  )
}

function StatusBadge({ status }) {
  const badge = getStatusBadge(status)

  const toneMap = {
    success: {
      color: 'var(--cresoa-success)',
      background: 'var(--cresoa-success-soft)'
    },
    warning: {
      color: 'var(--cresoa-warning)',
      background: 'var(--cresoa-warning-soft)'
    },
    danger: {
      color: 'var(--cresoa-danger)',
      background: 'var(--cresoa-danger-soft)'
    },
    info: {
      color: 'var(--cresoa-info)',
      background: 'var(--cresoa-info-soft)'
    }
  }

  const tone = toneMap[badge.tone] || toneMap.info

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        width: 'fit-content',
        maxWidth: '100%',
        padding: '5px 9px',
        borderRadius: 999,
        color: tone.color,
        background: tone.background,
        fontSize: 11,
        lineHeight: 1,
        fontWeight: 750,
        whiteSpace: 'nowrap'
      }}
    >
      {badge.label}
    </span>
  )
}

function MetricValue({
  label,
  value,
  helper,
  tone = 'default'
}) {
  const tones = {
    default: {
      value: 'var(--cresoa-text)',
      helper: 'var(--cresoa-text-muted)'
    },
    success: {
      value: 'var(--cresoa-success)',
      helper: 'var(--cresoa-success)'
    },
    warning: {
      value: 'var(--cresoa-warning)',
      helper: 'var(--cresoa-warning)'
    },
    danger: {
      value: 'var(--cresoa-danger)',
      helper: 'var(--cresoa-danger)'
    }
  }

  const colors = tones[tone] || tones.default

  return (
    <div style={{ minWidth: 0 }}>
      <div className="cresoa-label">{label}</div>

      <div
        style={{
          marginTop: 7,
          color: colors.value,
          fontSize: 'clamp(20px, 5vw, 28px)',
          lineHeight: 1.05,
          fontWeight: 800,
          letterSpacing: '-0.04em',
          overflowWrap: 'anywhere'
        }}
      >
        {value}
      </div>

      {helper ? (
        <div
          style={{
            marginTop: 6,
            color: colors.helper,
            fontSize: 11,
            lineHeight: 1.35
          }}
        >
          {helper}
        </div>
      ) : null}
    </div>
  )
        }

function useDashboardTheme() {
  const [theme, setTheme] = useState('light')

  useEffect(() => {
    const initialTheme = getStoredTheme()
    setTheme(initialTheme)
    document.documentElement.dataset.theme = initialTheme
  }, [])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    window.localStorage.setItem(THEME_STORAGE_KEY, theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme(current => (
      current === 'dark' ? 'light' : 'dark'
    ))
  }

  return {
    theme,
    toggleTheme
  }
}

function useDashboardData(businessId) {
  const [state, setState] = useState({
    loading: true,
    refreshing: false,
    error: '',
    business: null,
    customers: [],
    orders: [],
    groups: []
  })

  const loadDashboard = async ({
    silent = false
  } = {}) => {
    if (!businessId) {
      setState(current => ({
        ...current,
        loading: false,
        refreshing: false,
        error: 'No active business was selected.'
      }))
      return
    }

    setState(current => ({
      ...current,
      loading: !silent && current.orders.length === 0,
      refreshing: silent,
      error: ''
    }))

    try {
      const [
        businessResult,
        customersResult,
        ordersResult,
        groupsResult
      ] = await Promise.all([
        supabase
          .from('businesses')
          .select('*')
          .eq('id', businessId)
          .single(),

        supabase
          .from('customers')
          .select('*')
          .eq('business_id', businessId)
          .order('created_at', {
            ascending: false
          }),

        supabase
          .from('orders')
          .select('*')
          .eq('business_id', businessId)
          .order('created_at', {
            ascending: false
          }),

        supabase
          .from('group_orders')
          .select('*')
          .eq('business_id', businessId)
          .order('created_at', {
            ascending: false
          })
      ])

      const firstError =
        businessResult.error ||
        customersResult.error ||
        ordersResult.error ||
        groupsResult.error

      if (firstError) {
        throw firstError
      }

      setState({
        loading: false,
        refreshing: false,
        error: '',
        business: businessResult.data || null,
        customers: customersResult.data || [],
        orders: ordersResult.data || [],
        groups: groupsResult.data || []
      })
    } catch (error) {
      console.error(
        'Cresoa dashboard load error:',
        error
      )

      setState(current => ({
        ...current,
        loading: false,
        refreshing: false,
        error:
          error?.message ||
          'Unable to load your dashboard right now.'
      }))
    }
  }

  useEffect(() => {
    loadDashboard()
  }, [businessId])

  return {
    ...state,
    reload: loadDashboard
  }
}

function getOrderCustomerName(order, customers) {
  if (!order) return 'Unknown customer'

  if (order.customer_name) {
    return order.customer_name
  }

  const customer = customers.find(
    item => item.id === order.customer_id
  )

  if (!customer) return 'Unknown customer'

  return (
    customer.full_name ||
    customer.name ||
    `${customer.first_name || ''} ${customer.last_name || ''}`.trim() ||
    'Unnamed customer'
  )
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

function getOrderTitle(order) {
  return (
    order?.title ||
    order?.garment_type ||
    order?.item_name ||
    'Custom outfit'
  )
}

function getOrderProgress(status) {
  const index = PRODUCTION_STAGES.indexOf(status)

  if (index < 0) return 0

  return Math.round(
    (index / (PRODUCTION_STAGES.length - 1)) * 100
  )
}

function buildDailyAnalytics(orders, days = 30) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const output = []

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(today)
    date.setDate(today.getDate() - offset)

    const key = getDateKey(date)

    const dayOrders = orders.filter(order => {
      if (!order?.created_at) return false

      return getDateKey(order.created_at) === key
    })

    const revenue = dayOrders.reduce(
      (total, order) =>
        total + safeAmount(order?.amount_paid),
      0
    )

    const orderValue = dayOrders.reduce(
      (total, order) =>
        total + safeAmount(order?.price),
      0
    )

    output.push({
      key,
      date,
      revenue,
      orderValue,
      orders: dayOrders.length
    })
  }

  return output
}

function getDashboardMetrics(orders, customers, groups) {
  const activeOrders = orders.filter(
    order => !isOrderDelivered(order)
  )

  const overdueOrders = orders.filter(
    isOrderOverdue
  )

  const outstanding = orders.reduce(
    (total, order) =>
      total + calculateBalance(order),
    0
  )

  const collected = orders.reduce(
    (total, order) =>
      total + safeAmount(order?.amount_paid),
    0
  )

  const revenue = orders.reduce(
    (total, order) =>
      total + safeAmount(order?.price),
    0
  )

  const dueSoon = orders.filter(order => {
    if (!order?.due_date || isOrderDelivered(order)) {
      return false
    }

    const days = daysUntil(order.due_date)

    return days !== null && days >= 0 && days <= 3
  })

  const production = PRODUCTION_STAGES.reduce(
    (result, stage) => {
      result[stage] = orders.filter(
        order => order?.current_status === stage
      ).length

      return result
    },
    {}
  )

  return {
    revenue,
    collected,
    outstanding,
    activeOrders: activeOrders.length,
    overdueOrders: overdueOrders.length,
    dueSoon: dueSoon.length,
    customers: customers.length,
    groups: groups.length,
    production
  }
        }

function DashboardHeader({
  business,
  theme,
  onToggleTheme,
  onRefresh,
  refreshing,
  onNewOrder
}) {
  const businessName =
    business?.name ||
    business?.business_name ||
    'Your business'

  const logo =
    business?.logo_url ||
    business?.logo ||
    ''

  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 14,
        minWidth: 0,
        marginBottom: 22
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          minWidth: 0
        }}
      >
        <div
          style={{
            width: 46,
            height: 46,
            flex: '0 0 auto',
            display: 'grid',
            placeItems: 'center',
            overflow: 'hidden',
            borderRadius: 15,
            background: 'var(--cresoa-primary)',
            color: '#fff',
            boxShadow: 'var(--cresoa-shadow)'
          }}
        >
          {logo ? (
            <img
              src={logo}
              alt=""
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }}
            />
          ) : (
            <span
              style={{
                fontSize: 15,
                fontWeight: 850
              }}
            >
              {getInitials(businessName)}
            </span>
          )}
        </div>

        <div
          style={{
            minWidth: 0
          }}
        >
          <div
            style={{
              color: 'var(--cresoa-text-muted)',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.02em'
            }}
          >
            {getGreeting()}
          </div>

          <div
            style={{
              marginTop: 2,
              maxWidth: '42vw',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              color: 'var(--cresoa-text)',
              fontSize: 17,
              lineHeight: 1.2,
              fontWeight: 800,
              letterSpacing: '-0.025em'
            }}
          >
            {businessName}
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 7,
          flex: '0 0 auto'
        }}
      >
        <button
          type="button"
          className="cresoa-icon-button"
          onClick={onRefresh}
          disabled={refreshing}
          aria-label="Refresh dashboard"
          title="Refresh dashboard"
          style={{
            opacity: refreshing ? 0.55 : 1
          }}
        >
          <Icon
            name="refresh"
            size={17}
          />
        </button>

        <ThemeToggle
          theme={theme}
          onToggle={onToggleTheme}
        />

        <button
          type="button"
          className="cresoa-button cresoa-button-primary"
          onClick={onNewOrder}
          style={{
            minHeight: 42,
            paddingLeft: 13,
            paddingRight: 13
          }}
        >
          <Icon
            name="plus"
            size={16}
          />
          <span className="cresoa-desktop-action">
            New order
          </span>
        </button>
      </div>
    </header>
  )
}

function DateGreeting() {
  const today = new Date()

  const formatted = today.toLocaleDateString(
    'en-NG',
    {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    }
  )

  return (
    <div
      style={{
        marginBottom: 18
      }}
    >
      <div
        style={{
          color: 'var(--cresoa-text)',
          fontSize: 'clamp(22px, 6vw, 30px)',
          lineHeight: 1.08,
          fontWeight: 850,
          letterSpacing: '-0.045em'
        }}
      >
        Your business at a glance.
      </div>

      <div
        style={{
          marginTop: 6,
          color: 'var(--cresoa-text-muted)',
          fontSize: 12,
          lineHeight: 1.45
        }}
      >
        {formatted}
      </div>
    </div>
  )
}

function TodayCard({
  icon,
  label,
  value,
  helper,
  tone = 'default',
  onClick
}) {
  const toneStyles = {
    default: {
      iconColor: 'var(--cresoa-primary)',
      iconBg: 'var(--cresoa-accent-soft)'
    },
    warning: {
      iconColor: 'var(--cresoa-warning)',
      iconBg: 'var(--cresoa-warning-soft)'
    },
    danger: {
      iconColor: 'var(--cresoa-danger)',
      iconBg: 'var(--cresoa-danger-soft)'
    },
    success: {
      iconColor: 'var(--cresoa-success)',
      iconBg: 'var(--cresoa-success-soft)'
    }
  }

  const currentTone =
    toneStyles[tone] || toneStyles.default

  return (
    <button
      type="button"
      onClick={onClick}
      className="cresoa-card cresoa-card-interactive"
      style={{
        width: '100%',
        minHeight: 122,
        padding: 15,
        textAlign: 'left',
        cursor: onClick ? 'pointer' : 'default',
        color: 'inherit',
        appearance: 'none'
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 10
        }}
      >
        <div
          style={{
            width: 34,
            height: 34,
            flex: '0 0 auto',
            display: 'grid',
            placeItems: 'center',
            borderRadius: 11,
            background: currentTone.iconBg,
            color: currentTone.iconColor
          }}
        >
          <Icon
            name={icon}
            size={16}
          />
        </div>

        {onClick ? (
          <Icon
            name="arrow-up-right"
            size={14}
            color="var(--cresoa-text-soft)"
          />
        ) : null}
      </div>

      <div
        style={{
          marginTop: 13
        }}
      >
        <div
          style={{
            color: 'var(--cresoa-text-muted)',
            fontSize: 11,
            lineHeight: 1.2,
            fontWeight: 700
          }}
        >
          {label}
        </div>

        <div
          style={{
            marginTop: 5,
            color: 'var(--cresoa-text)',
            fontSize: 'clamp(19px, 5vw, 24px)',
            lineHeight: 1,
            fontWeight: 850,
            letterSpacing: '-0.04em',
            overflowWrap: 'anywhere'
          }}
        >
          {value}
        </div>

        {helper ? (
          <div
            style={{
              marginTop: 5,
              color: 'var(--cresoa-text-soft)',
              fontSize: 10,
              lineHeight: 1.3
            }}
          >
            {helper}
          </div>
        ) : null}
      </div>
    </button>
  )
}

function TodayOverview({
  metrics,
  onAttention,
  onOrders,
  onPayments,
  onFittings
}) {
  return (
    <section
      className="cresoa-grid"
      style={{
        gridTemplateColumns:
          'repeat(2, minmax(0, 1fr))'
      }}
    >
      <TodayCard
        icon="calendar"
        label="Orders due soon"
        value={metrics.dueSoon}
        helper={
          metrics.dueSoon === 1
            ? 'Within 3 days'
            : 'Within 3 days'
        }
        tone={
          metrics.dueSoon > 0
            ? 'warning'
            : 'success'
        }
        onClick={onOrders}
      />

      <TodayCard
        icon="calendar-check"
        label="Fittings today"
        value={metrics.fittingsToday}
        helper="Scheduled for today"
        tone={
          metrics.fittingsToday > 0
            ? 'warning'
            : 'success'
        }
        onClick={onFittings}
      />

      <TodayCard
        icon="wallet"
        label="Expected payments"
        value={formatMoney(metrics.expectedPayments)}
        helper="Outstanding across active orders"
        tone={
          metrics.expectedPayments > 0
            ? 'default'
            : 'success'
        }
        onClick={onPayments}
      />

      <TodayCard
        icon="alert-circle"
        label="Need attention"
        value={metrics.attentionCount}
        helper="Issues requiring action"
        tone={
          metrics.attentionCount > 0
            ? 'danger'
            : 'success'
        }
        onClick={onAttention}
      />
    </section>
  )
            }

          function AttentionItem({
  icon,
  title,
  description,
  meta,
  tone = 'warning',
  onClick
}) {
  const tones = {
    warning: {
      icon: 'var(--cresoa-warning)',
      background: 'var(--cresoa-warning-soft)'
    },
    danger: {
      icon: 'var(--cresoa-danger)',
      background: 'var(--cresoa-danger-soft)'
    },
    success: {
      icon: 'var(--cresoa-success)',
      background: 'var(--cresoa-success-soft)'
    },
    info: {
      icon: 'var(--cresoa-info)',
      background: 'var(--cresoa-info-soft)'
    }
  }

  const currentTone =
    tones[tone] || tones.warning

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 11,
        padding: '11px 0',
        border: 0,
        borderBottom:
          '1px solid var(--cresoa-border)',
        background: 'transparent',
        color: 'inherit',
        textAlign: 'left',
        cursor: onClick ? 'pointer' : 'default'
      }}
    >
      <span
        style={{
          width: 36,
          height: 36,
          flex: '0 0 auto',
          display: 'grid',
          placeItems: 'center',
          borderRadius: 11,
          background: currentTone.background,
          color: currentTone.icon
        }}
      >
        <Icon
          name={icon}
          size={16}
        />
      </span>

      <span
        style={{
          flex: 1,
          minWidth: 0
        }}
      >
        <span
          style={{
            display: 'block',
            overflow: 'hidden',
            color: 'var(--cresoa-text)',
            fontSize: 12,
            lineHeight: 1.3,
            fontWeight: 750,
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
        >
          {title}
        </span>

        <span
          style={{
            display: 'block',
            marginTop: 3,
            overflow: 'hidden',
            color: 'var(--cresoa-text-muted)',
            fontSize: 11,
            lineHeight: 1.35,
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
        >
          {description}
        </span>
      </span>

      <span
        style={{
          flex: '0 0 auto',
          textAlign: 'right'
        }}
      >
        {meta && (
          <span
            style={{
              display: 'block',
              color: currentTone.icon,
              fontSize: 10,
              lineHeight: 1.2,
              fontWeight: 800
            }}
          >
            {meta}
          </span>
        )}

        {onClick ? (
          <span
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              marginTop: 4,
              color: 'var(--cresoa-text-soft)'
            }}
          >
            <Icon
              name="chevron-right"
              size={13}
            />
          </span>
        ) : null}
      </span>
    </button>
  )
}

function AttentionPanel({
  orders,
  customers,
  onOrder,
  onOrders
}) {
  const attentionItems = []

  const overdueOrders = orders
    .filter(isOrderOverdue)
    .slice(0, 3)

  overdueOrders.forEach(order => {
    const customerName =
      getOrderCustomerName(order, customers)

    attentionItems.push({
      key: `overdue-${order.id}`,
      icon: 'alert-triangle',
      title: getOrderTitle(order),
      description: `${customerName} · payment or delivery needs attention`,
      meta: 'Overdue',
      tone: 'danger',
      order
    })
  })

  const dueSoonOrders = orders
    .filter(order => {
      if (!order?.due_date || isOrderDelivered(order)) {
        return false
      }

      const days = daysUntil(order.due_date)

      return (
        days !== null &&
        days >= 0 &&
        days <= 3
      )
    })
    .slice(0, 3)

  dueSoonOrders.forEach(order => {
    const alreadyAdded = attentionItems.some(
      item => item.order?.id === order.id
    )

    if (alreadyAdded) return

    const customerName =
      getOrderCustomerName(order, customers)

    const days = daysUntil(order.due_date)

    attentionItems.push({
      key: `due-${order.id}`,
      icon: 'clock',
      title: getOrderTitle(order),
      description: `${customerName} · due ${formatShortDate(order.due_date)}`,
      meta:
        days === 0
          ? 'Today'
          : days === 1
            ? 'Tomorrow'
            : `${days} days`,
      tone: 'warning',
      order
    })
  })

  const outstandingOrders = orders
    .filter(order => {
      if (isOrderDelivered(order)) return false
      return calculateBalance(order) > 0
    })
    .sort(
      (a, b) =>
        calculateBalance(b) -
        calculateBalance(a)
    )
    .slice(0, 2)

  outstandingOrders.forEach(order => {
    const alreadyAdded = attentionItems.some(
      item => item.order?.id === order.id
    )

    if (alreadyAdded) return

    const customerName =
      getOrderCustomerName(order, customers)

    attentionItems.push({
      key: `payment-${order.id}`,
      icon: 'wallet',
      title: `${customerName} has a balance`,
      description: getOrderTitle(order),
      meta: formatMoney(
        calculateBalance(order)
      ),
      tone: 'info',
      order
    })
  })

  const visibleItems =
    attentionItems.slice(0, 5)

  return (
    <section
      className="cresoa-card"
      style={{
        padding: 16
      }}
    >
      <div
        className="cresoa-section-heading"
        style={{
          alignItems: 'center'
        }}
      >
        <div>
          <h2>Needs attention</h2>
          <p>
            The things most likely to need action today.
          </p>
        </div>

        {attentionItems.length > 0 ? (
          <button
            type="button"
            className="cresoa-button cresoa-button-secondary"
            onClick={onOrders}
            style={{
              minHeight: 34,
              padding: '0 10px',
              fontSize: 11
            }}
          >
            View all
          </button>
        ) : null}
      </div>

      <div
        style={{
          marginTop: 8
        }}
      >
        {visibleItems.length === 0 ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '18px 4px 5px'
            }}
          >
            <div
              style={{
                width: 38,
                height: 38,
                flex: '0 0 auto',
                display: 'grid',
                placeItems: 'center',
                borderRadius: 12,
                background:
                  'var(--cresoa-success-soft)',
                color: 'var(--cresoa-success)'
              }}
            >
              <Icon
                name="check-circle"
                size={18}
              />
            </div>

            <div>
              <div
                style={{
                  color: 'var(--cresoa-text)',
                  fontSize: 13,
                  fontWeight: 750
                }}
              >
                You're all caught up
              </div>

              <div
                style={{
                  marginTop: 3,
                  color: 'var(--cresoa-text-muted)',
                  fontSize: 11
                }}
              >
                No urgent dashboard issues right now.
              </div>
            </div>
          </div>
        ) : (
          visibleItems.map(item => (
            <AttentionItem
              key={item.key}
              icon={item.icon}
              title={item.title}
              description={item.description}
              meta={item.meta}
              tone={item.tone}
              onClick={() => {
                if (item.order) {
                  onOrder(item.order)
                }
              }}
            />
          ))
        )}
      </div>
    </section>
  )
}

function calculateAttentionCount(
  orders,
  customers
) {
  const overdue = orders.filter(
    isOrderOverdue
  ).length

  const dueSoon = orders.filter(order => {
    if (!order?.due_date || isOrderDelivered(order)) {
      return false
    }

    const days = daysUntil(order.due_date)

    return (
      days !== null &&
      days >= 0 &&
      days <= 3
    )
  }).length

  const unpaid = orders.filter(order => {
    if (isOrderDelivered(order)) return false
    return calculateBalance(order) > 0
  }).length

  const withoutCustomer = orders.filter(
    order =>
      !order?.customer_id &&
      !order?.customer_name
  ).length

  return Math.min(
    overdue +
      dueSoon +
      unpaid +
      withoutCustomer,
    orders.length + customers.length
  )
}

function getTodayFittingCount(orders) {
  const todayKey = getDateKey(new Date())

  return orders.filter(order => {
    const fittingDate =
      order?.fitting_date ||
      order?.fitting_at ||
      order?.appointment_date

    if (!fittingDate) return false

    return getDateKey(fittingDate) === todayKey
  }).length
}

function getExpectedPayments(orders) {
  return orders
    .filter(order => !isOrderDelivered(order))
    .reduce(
      (total, order) =>
        total + calculateBalance(order),
      0
    )
      }

function ProductionStage({
  stage,
  count,
  total,
  index,
  onClick
}) {
  const percentage =
    total > 0
      ? Math.round((count / total) * 100)
      : 0

  const isLast =
    index === PRODUCTION_STAGES.length - 1

  const stageTone =
    stage === 'Delivered'
      ? 'success'
      : stage === 'Ready'
        ? 'success'
        : stage === 'Fitting' ||
            stage === 'Alteration'
          ? 'warning'
          : 'info'

  const toneStyles = {
    success: {
      dot: 'var(--cresoa-success)',
      background: 'var(--cresoa-success-soft)'
    },
    warning: {
      dot: 'var(--cresoa-warning)',
      background: 'var(--cresoa-warning-soft)'
    },
    info: {
      dot: 'var(--cresoa-info)',
      background: 'var(--cresoa-info-soft)'
    }
  }

  const tone =
    toneStyles[stageTone] ||
    toneStyles.info

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        position: 'relative',
        width: '100%',
        minWidth: 0,
        padding: 0,
        border: 0,
        background: 'transparent',
        color: 'inherit',
        textAlign: 'left',
        cursor: onClick ? 'pointer' : 'default'
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          minWidth: 0
        }}
      >
        <div
          style={{
            width: 31,
            height: 31,
            flex: '0 0 auto',
            display: 'grid',
            placeItems: 'center',
            borderRadius: 10,
            background: tone.background,
            color: tone.dot,
            fontSize: 11,
            fontWeight: 850
          }}
        >
          {count}
        </div>

        <div
          style={{
            flex: 1,
            minWidth: 0
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8
            }}
          >
            <span
              style={{
                overflow: 'hidden',
                color: 'var(--cresoa-text)',
                fontSize: 11,
                fontWeight: 700,
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
            >
              {stage}
            </span>

            <span
              style={{
                flex: '0 0 auto',
                color: 'var(--cresoa-text-soft)',
                fontSize: 10,
                fontWeight: 700
              }}
            >
              {percentage}%
            </span>
          </div>

          <div
            style={{
              height: 5,
              marginTop: 7,
              overflow: 'hidden',
              borderRadius: 999,
              background:
                'var(--cresoa-border)'
            }}
          >
            <div
              style={{
                width: `${percentage}%`,
                height: '100%',
                borderRadius: 999,
                background: tone.dot,
                transition:
                  'width 350ms ease'
              }}
            />
          </div>
        </div>
      </div>

      {!isLast ? (
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: 15,
            top: 31,
            width: 1,
            height: 17,
            background:
              'var(--cresoa-border)'
          }}
        />
      ) : null}
    </button>
  )
}

function ProductionPipeline({
  orders,
  onStage
}) {
  const productionCounts =
    PRODUCTION_STAGES.reduce(
      (result, stage) => {
        result[stage] = orders.filter(
          order =>
            order?.current_status === stage
        ).length

        return result
      },
      {}
    )

  const activeProductionOrders =
    orders.filter(
      order => !isOrderDelivered(order)
    ).length

  return (
    <section
      className="cresoa-card"
      style={{
        padding: 16
      }}
    >
      <div
        className="cresoa-section-heading"
        style={{
          alignItems: 'center'
        }}
      >
        <div>
          <h2>Production</h2>
          <p>
            Track every garment from order to delivery.
          </p>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            padding: '5px 8px',
            borderRadius: 999,
            background:
              'var(--cresoa-accent-soft)',
            color: 'var(--cresoa-primary)',
            fontSize: 10,
            fontWeight: 800,
            whiteSpace: 'nowrap'
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background:
                'var(--cresoa-accent)'
            }}
          />
          {activeProductionOrders} active
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns:
            'repeat(2, minmax(0, 1fr))',
          gap: 16,
          marginTop: 18
        }}
      >
        {PRODUCTION_STAGES.map(
          (stage, index) => (
            <ProductionStage
              key={stage}
              stage={stage}
              count={
                productionCounts[stage] || 0
              }
              total={orders.length}
              index={index}
              onClick={() =>
                onStage(stage)
              }
            />
          )
        )}
      </div>
    </section>
  )
}

function ProgressRing({
  value,
  size = 54,
  stroke = 5,
  children
}) {
  const radius =
    (size - stroke) / 2

  const circumference =
    2 * Math.PI * radius

  const offset =
    circumference -
    (Math.min(Math.max(value, 0), 100) /
      100) *
      circumference

  return (
    <div
      style={{
        position: 'relative',
        width: size,
        height: size,
        flex: '0 0 auto'
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{
          display: 'block',
          transform: 'rotate(-90deg)'
        }}
        aria-hidden="true"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--cresoa-border)"
          strokeWidth={stroke}
        />

        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--cresoa-accent)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{
            transition:
              'stroke-dashoffset 500ms ease'
          }}
        />
      </svg>

      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'grid',
          placeItems: 'center',
          color: 'var(--cresoa-text)',
          fontSize: 11,
          fontWeight: 850
        }}
      >
        {children}
      </div>
    </div>
  )
}

function BusinessSnapshot({
  metrics
}) {
  const completionRate =
    metrics.totalOrders > 0
      ? Math.round(
          (metrics.deliveredOrders /
            metrics.totalOrders) *
            100
        )
      : 0

  return (
    <section
      className="cresoa-card"
      style={{
        padding: 16
      }}
    >
      <div
        className="cresoa-section-heading"
      >
        <div>
          <h2>Business snapshot</h2>
          <p>
            A quick read on your current workload.
          </p>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 15,
          marginTop: 18
        }}
      >
        <ProgressRing
          value={completionRate}
        >
          {completionRate}%
        </ProgressRing>

        <div
          style={{
            minWidth: 0,
            flex: 1
          }}
        >
          <div
            style={{
              color: 'var(--cresoa-text)',
              fontSize: 13,
              fontWeight: 800
            }}
          >
            Order completion
          </div>

          <div
            style={{
              marginTop: 4,
              color: 'var(--cresoa-text-muted)',
              fontSize: 11,
              lineHeight: 1.4
            }}
          >
            {metrics.deliveredOrders} of{' '}
            {metrics.totalOrders} orders
            delivered.
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns:
            'repeat(3, minmax(0, 1fr))',
          gap: 8,
          marginTop: 18
        }}
      >
        <MetricValue
          label="Revenue"
          value={formatMoney(
            metrics.revenue
          )}
        />

        <MetricValue
          label="Collected"
          value={formatMoney(
            metrics.collected
          )}
          tone="success"
        />

        <MetricValue
          label="Balance"
          value={formatMoney(
            metrics.outstanding
          )}
          tone={
            metrics.outstanding > 0
              ? 'warning'
              : 'success'
          }
        />
      </div>
    </section>
  )
}

function AnalyticsChart({
  data,
  range,
  onRangeChange
}) {
  const [selectedIndex, setSelectedIndex] =
    useState(
      Math.max(data.length - 1, 0)
    )

  const safeData =
    Array.isArray(data) ? data : []

  useEffect(() => {
    setSelectedIndex(
      Math.max(safeData.length - 1, 0)
    )
  }, [range, safeData.length])

  const chartWidth = 760
  const chartHeight = 260

  const padding = {
    top: 24,
    right: 12,
    bottom: 38,
    left: 48
  }

  const innerWidth =
    chartWidth -
    padding.left -
    padding.right

  const innerHeight =
    chartHeight -
    padding.top -
    padding.bottom

  const maxRevenue = Math.max(
    ...safeData.map(
      item => safeAmount(item.revenue)
    ),
    1
  )

  const niceMax =
    Math.ceil(maxRevenue / 10000) * 10000 ||
    10000

  const points = safeData.map(
    (item, index) => {
      const x =
        safeData.length <= 1
          ? padding.left +
            innerWidth / 2
          : padding.left +
            (index /
              (safeData.length - 1)) *
              innerWidth

      const revenue =
        safeAmount(item.revenue)

      const y =
        padding.top +
        innerHeight -
        (revenue / niceMax) *
          innerHeight

      return {
        ...item,
        x,
        y,
        revenue
      }
    }
  )

  const linePath =
    points.length > 0
      ? points
          .map(
            (point, index) =>
              `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`
          )
          .join(' ')
      : ''

  const areaPath =
    points.length > 0
      ? `${linePath} L ${
          points[points.length - 1].x
        } ${
          padding.top + innerHeight
        } L ${points[0].x} ${
          padding.top + innerHeight
        } Z`
      : ''

  const selected =
    points[selectedIndex] ||
    points[points.length - 1] ||
    null

  const gridValues = [
    niceMax,
    niceMax * 0.75,
    niceMax * 0.5,
    niceMax * 0.25,
    0
  ]

  const labelStep =
    range === 7
      ? 1
      : range === 30
        ? 5
        : 15

  const visibleLabels =
    points.filter(
      (_, index) =>
        index % labelStep === 0 ||
        index === points.length - 1
    )

  const rangeOptions = [
    { value: 7, label: '7D' },
    { value: 30, label: '30D' },
    { value: 90, label: '90D' }
  ]

  return (
    <section
      className="cresoa-card"
      style={{
        padding: 16,
        minWidth: 0,
        overflow: 'hidden'
      }}
    >
      <div
        className="cresoa-section-heading"
        style={{
          alignItems: 'center'
        }}
      >
        <div>
          <h2>Revenue analytics</h2>
          <p>
            Daily revenue and order activity.
          </p>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 3,
            padding: 3,
            borderRadius: 10,
            background:
              'var(--cresoa-bg)',
            border:
              '1px solid var(--cresoa-border)'
          }}
        >
          {rangeOptions.map(option => {
            const active =
              option.value === range

            return (
              <button
                key={option.value}
                type="button"
                onClick={() =>
                  onRangeChange(option.value)
                }
                style={{
                  minHeight: 30,
                  padding: '0 9px',
                  border: 0,
                  borderRadius: 8,
                  background: active
                    ? 'var(--cresoa-surface)'
                    : 'transparent',
                  color: active
                    ? 'var(--cresoa-primary)'
                    : 'var(--cresoa-text-muted)',
                  boxShadow: active
                    ? 'var(--cresoa-shadow)'
                    : 'none',
                  cursor: 'pointer',
                  fontSize: 10,
                  fontWeight: 800
                }}
              >
                {option.label}
              </button>
            )
          })}
        </div>
      </div>

      {selected ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            gap: 14,
            marginTop: 18
          }}
        >
          <div
            style={{
              minWidth: 0
            }}
          >
            <div
              className="cresoa-label"
            >
              {formatDate(selected.date)}
            </div>

            <div
              style={{
                marginTop: 5,
                color: 'var(--cresoa-text)',
                fontSize:
                  'clamp(23px, 7vw, 32px)',
                lineHeight: 1,
                fontWeight: 850,
                letterSpacing: '-0.045em',
                overflowWrap: 'anywhere'
              }}
            >
              {formatMoney(
                selected.revenue
              )}
            </div>
          </div>

          <div
            style={{
              flex: '0 0 auto',
              textAlign: 'right'
            }}
          >
            <div
              style={{
                color: 'var(--cresoa-text-muted)',
                fontSize: 10
              }}
            >
              Orders
            </div>

            <div
              style={{
                marginTop: 3,
                color: 'var(--cresoa-text)',
                fontSize: 15,
                fontWeight: 800
              }}
            >
              {selected.orders}
            </div>
          </div>
        </div>
      ) : null}

      <div
        className="cresoa-chart-wrap"
        style={{
          width: '100%',
          minWidth: 0,
          marginTop: 14
        }}
      >
        {safeData.length === 0 ? (
          <div
            style={{
              minHeight: 230,
              display: 'grid',
              placeItems: 'center',
              color: 'var(--cresoa-text-muted)',
              fontSize: 12
            }}
          >
            No analytics data yet.
          </div>
        ) : (
          <svg
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            width="100%"
            role="img"
            aria-label={`Revenue chart for the last ${range} days`}
            style={{
              display: 'block',
              width: '100%',
              height: 'auto',
              overflow: 'visible',
              touchAction: 'pan-y'
            }}
          >
            <defs>
              <linearGradient
                id="cresoaRevenueFill"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="0%"
                  stopColor="var(--cresoa-accent)"
                  stopOpacity="0.28"
                />
                <stop
                  offset="100%"
                  stopColor="var(--cresoa-accent)"
                  stopOpacity="0"
                />
              </linearGradient>
            </defs>

            {gridValues.map(
              (value, index) => {
                const y =
                  padding.top +
                  innerHeight -
                  (value / niceMax) *
                    innerHeight

                return (
                  <g key={value}>
                    <line
                      x1={padding.left}
                      x2={
                        padding.left +
                        innerWidth
                      }
                      y1={y}
                      y2={y}
                      stroke="var(--cresoa-border)"
                      strokeWidth="1"
                      strokeDasharray={
                        index ===
                        gridValues.length - 1
                          ? '0'
                          : '4 5'
                      }
                    />

                    <text
                      x={padding.left - 9}
                      y={y + 4}
                      textAnchor="end"
                      fill="var(--cresoa-text-soft)"
                      fontSize="10"
                    >
                      {value === 0
                        ? '₦0'
                        : value >=
                            1000000
                          ? `₦${(
                              value /
                              1000000
                            ).toFixed(
                              value %
                                1000000 ===
                                0
                                ? 0
                                : 1
                            )}m`
                          : `₦${Math.round(
                              value / 1000
                            )}k`}
                    </text>
                  </g>
                )
              }
            )}

            {areaPath ? (
              <path
                d={areaPath}
                fill="url(#cresoaRevenueFill)"
              />
            ) : null}

            {linePath ? (
              <path
                d={linePath}
                fill="none"
                stroke="var(--cresoa-accent)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ) : null}

            {points.map(
              (point, index) => (
                <g key={point.key}>
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r={
                      selectedIndex === index
                        ? 6
                        : 3.5
                    }
                    fill="var(--cresoa-surface)"
                    stroke="var(--cresoa-accent)"
                    strokeWidth={
                      selectedIndex === index
                        ? 3
                        : 2
                    }
                    style={{
                      cursor: 'pointer'
                    }}
                    onClick={() =>
                      setSelectedIndex(index)
                    }
                  />

                  <circle
                    cx={point.x}
                    cy={point.y}
                    r="14"
                    fill="transparent"
                    onClick={() =>
                      setSelectedIndex(index)
                    }
                    style={{
                      cursor: 'pointer'
                    }}
                  />
                </g>
              )
            )}

            {visibleLabels.map(
              point => (
                <text
                  key={`label-${point.key}`}
                  x={point.x}
                  y={
                    padding.top +
                    innerHeight +
                    25
                  }
                  textAnchor="middle"
                  fill="var(--cresoa-text-soft)"
                  fontSize="10"
                >
                  {formatShortDate(
                    point.date
                  )}
                </text>
              )
            )}

            {selected ? (
              <g
                pointerEvents="none"
              >
                <line
                  x1={selected.x}
                  x2={selected.x}
                  y1={padding.top}
                  y2={
                    padding.top +
                    innerHeight
                  }
                  stroke="var(--cresoa-accent)"
                  strokeWidth="1"
                  strokeDasharray="3 4"
                  opacity="0.65"
                />
              </g>
            ) : null}
          </svg>
        )}
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          marginTop: 2
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            color: 'var(--cresoa-text-muted)',
            fontSize: 10
          }}
        >
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background:
                'var(--cresoa-accent)'
            }}
          />
          Daily revenue
        </div>

        <div
          style={{
            color: 'var(--cresoa-text-soft)',
            fontSize: 10
          }}
        >
          Tap a point for details
        </div>
      </div>
    </section>
  )
          }

function RecentOrderRow({
  order,
  customerName,
  onClick
}) {
  const title = getOrderTitle(order)
  const status =
    order?.current_status ||
    order?.status ||
    'Pending'

  const balance =
    calculateBalance(order)

  const dueDate =
    order?.due_date ||
    order?.delivery_date

  const overdue =
    isOrderOverdue(order)

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: '100%',
        display: 'grid',
        gridTemplateColumns:
          'minmax(0, 1fr) auto',
        gap: 12,
        padding: '13px 0',
        border: 0,
        borderBottom:
          '1px solid var(--cresoa-border)',
        background: 'transparent',
        color: 'inherit',
        textAlign: 'left',
        cursor: 'pointer'
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 11,
          minWidth: 0
        }}
      >
        <div
          style={{
            width: 38,
            height: 38,
            flex: '0 0 auto',
            display: 'grid',
            placeItems: 'center',
            borderRadius: 12,
            background:
              'var(--cresoa-accent-soft)',
            color: 'var(--cresoa-primary)',
            fontSize: 12,
            fontWeight: 850
          }}
        >
          {getInitials(customerName)}
        </div>

        <div
          style={{
            minWidth: 0,
            flex: 1
          }}
        >
          <div
            style={{
              overflow: 'hidden',
              color: 'var(--cresoa-text)',
              fontSize: 12,
              lineHeight: 1.3,
              fontWeight: 750,
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
          >
            {title}
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              marginTop: 4,
              minWidth: 0
            }}
          >
            <span
              style={{
                overflow: 'hidden',
                color:
                  'var(--cresoa-text-muted)',
                fontSize: 10,
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
            >
              {customerName}
            </span>

            <span
              aria-hidden="true"
              style={{
                color:
                  'var(--cresoa-text-soft)'
              }}
            >
              ·
            </span>

            <span
              style={{
                color:
                  'var(--cresoa-text-muted)',
                fontSize: 10,
                whiteSpace: 'nowrap'
              }}
            >
              {formatShortDate(
                order?.created_at
              )}
            </span>
          </div>
        </div>
      </div>

      <div
        style={{
          minWidth: 78,
          textAlign: 'right'
        }}
      >
        <StatusBadge status={status} />

        {balance > 0 ? (
          <div
            style={{
              marginTop: 5,
              color:
                overdue
                  ? 'var(--cresoa-danger)'
                  : 'var(--cresoa-warning)',
              fontSize: 10,
              lineHeight: 1.2,
              fontWeight: 750
            }}
          >
            {formatMoney(balance)} due
          </div>
        ) : dueDate ? (
          <div
            style={{
              marginTop: 5,
              color:
                overdue
                  ? 'var(--cresoa-danger)'
                  : 'var(--cresoa-text-soft)',
              fontSize: 10,
              lineHeight: 1.2,
              fontWeight: overdue
                ? 750
                : 600
            }}
          >
            {overdue
              ? 'Overdue'
              : `Due ${formatShortDate(
                  dueDate
                )}`}
          </div>
        ) : null}
      </div>
    </button>
  )
}

function RecentOrders({
  orders,
  customers,
  onOrder,
  onOrders
}) {
  const recentOrders = orders
    .slice()
    .sort((a, b) => {
      const first = new Date(
        a?.created_at || 0
      ).getTime()

      const second = new Date(
        b?.created_at || 0
      ).getTime()

      return second - first
    })
    .slice(0, 6)

  return (
    <section
      className="cresoa-card"
      style={{
        padding: 16,
        minWidth: 0
      }}
    >
      <div
        className="cresoa-section-heading"
        style={{
          alignItems: 'center'
        }}
      >
        <div>
          <h2>Recent orders</h2>
          <p>
            Your latest customer work.
          </p>
        </div>

        <button
          type="button"
          className="cresoa-button cresoa-button-secondary"
          onClick={onOrders}
          style={{
            minHeight: 34,
            padding: '0 10px',
            fontSize: 11
          }}
        >
          View all
        </button>
      </div>

      <div
        style={{
          marginTop: 7
        }}
      >
        {recentOrders.length === 0 ? (
          <EmptyState
            icon="package"
            title="No orders yet"
            description="Your newest orders will appear here."
          />
        ) : (
          recentOrders.map(order => (
            <RecentOrderRow
              key={order.id}
              order={order}
              customerName={getOrderCustomerName(
                order,
                customers
              )}
              onClick={() =>
                onOrder(order)
              }
            />
          ))
        )}
      </div>
    </section>
  )
}

function EmptyState({
  icon = 'inbox',
  title,
  description,
  actionLabel,
  onAction
}) {
  return (
    <div
      style={{
        minHeight: 145,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px 10px',
        textAlign: 'center'
      }}
    >
      <div
        style={{
          width: 42,
          height: 42,
          display: 'grid',
          placeItems: 'center',
          borderRadius: 13,
          background:
            'var(--cresoa-accent-soft)',
          color: 'var(--cresoa-primary)'
        }}
      >
        <Icon
          name={icon}
          size={18}
        />
      </div>

      <div
        style={{
          marginTop: 11,
          color: 'var(--cresoa-text)',
          fontSize: 13,
          fontWeight: 750
        }}
      >
        {title}
      </div>

      {description ? (
        <div
          style={{
            maxWidth: 280,
            marginTop: 4,
            color:
              'var(--cresoa-text-muted)',
            fontSize: 11,
            lineHeight: 1.45
          }}
        >
          {description}
        </div>
      ) : null}

      {actionLabel && onAction ? (
        <button
          type="button"
          className="cresoa-button cresoa-button-primary"
          onClick={onAction}
          style={{
            minHeight: 36,
            marginTop: 12,
            fontSize: 11
          }}
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  )
}

function RecentCustomerRow({
  customer,
  onClick
}) {
  const name =
    getCustomerName(customer)

  const phone =
    customer?.phone ||
    customer?.phone_number ||
    'No phone number'

  const createdAt =
    customer?.created_at

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 11,
        padding: '12px 0',
        border: 0,
        borderBottom:
          '1px solid var(--cresoa-border)',
        background: 'transparent',
        color: 'inherit',
        textAlign: 'left',
        cursor: 'pointer'
      }}
    >
      <div
        style={{
          width: 38,
          height: 38,
          flex: '0 0 auto',
          display: 'grid',
          placeItems: 'center',
          borderRadius: 12,
          background:
            'var(--cresoa-accent-soft)',
          color: 'var(--cresoa-primary)',
          fontSize: 11,
          fontWeight: 850
        }}
      >
        {getInitials(name)}
      </div>

      <div
        style={{
          minWidth: 0,
          flex: 1
        }}
      >
        <div
          style={{
            overflow: 'hidden',
            color: 'var(--cresoa-text)',
            fontSize: 12,
            lineHeight: 1.3,
            fontWeight: 750,
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
        >
          {name}
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            marginTop: 4,
            minWidth: 0
          }}
        >
          <span
            style={{
              overflow: 'hidden',
              color:
                'var(--cresoa-text-muted)',
              fontSize: 10,
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
          >
            {phone}
          </span>

          {createdAt ? (
            <>
              <span
                style={{
                  color:
                    'var(--cresoa-text-soft)'
                }}
              >
                ·
              </span>

              <span
                style={{
                  color:
                    'var(--cresoa-text-soft)',
                  fontSize: 10,
                  whiteSpace: 'nowrap'
                }}
              >
                {formatShortDate(createdAt)}
              </span>
            </>
          ) : null}
        </div>
      </div>

      <Icon
        name="chevron-right"
        size={14}
        color="var(--cresoa-text-soft)"
      />
    </button>
  )
}

function RecentCustomers({
  customers,
  onCustomer,
  onCustomers
}) {
  const recentCustomers =
    customers
      .slice()
      .sort((a, b) => {
        const first =
          new Date(
            a?.created_at || 0
          ).getTime()

        const second =
          new Date(
            b?.created_at || 0
          ).getTime()

        return second - first
      })
      .slice(0, 5)

  return (
    <section
      className="cresoa-card"
      style={{
        padding: 16,
        minWidth: 0
      }}
    >
      <div
        className="cresoa-section-heading"
        style={{
          alignItems: 'center'
        }}
      >
        <div>
          <h2>Recent customers</h2>
          <p>
            People you've recently added.
          </p>
        </div>

        <button
          type="button"
          className="cresoa-button cresoa-button-secondary"
          onClick={onCustomers}
          style={{
            minHeight: 34,
            padding: '0 10px',
            fontSize: 11
          }}
        >
          View all
        </button>
      </div>

      <div
        style={{
          marginTop: 7
        }}
      >
        {recentCustomers.length === 0 ? (
          <EmptyState
            icon="users"
            title="No customers yet"
            description="Your customer list will appear here."
          />
        ) : (
          recentCustomers.map(
            customer => (
              <RecentCustomerRow
                key={customer.id}
                customer={customer}
                onClick={() =>
                  onCustomer(customer)
                }
              />
            )
          )
        )}
      </div>
    </section>
  )
}

function AsoEbiGroupRow({
  group,
  onClick
}) {
  const groupName =
    group?.name ||
    group?.group_name ||
    group?.title ||
    'Aso-Ebi group'

  const members =
    Number(
      group?.member_count ??
        group?.members_count ??
        group?.total_members ??
        0
    )

  const amount =
    safeAmount(
      group?.total_amount ??
        group?.amount ??
        group?.price
    )

  const eventDate =
    group?.event_date ||
    group?.date ||
    group?.delivery_date

  const status =
    group?.status ||
    group?.current_status ||
    'Active'

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 11,
        padding: '12px 0',
        border: 0,
        borderBottom:
          '1px solid var(--cresoa-border)',
        background: 'transparent',
        color: 'inherit',
        textAlign: 'left',
        cursor: 'pointer'
      }}
    >
      <div
        style={{
          width: 38,
          height: 38,
          flex: '0 0 auto',
          display: 'grid',
          placeItems: 'center',
          borderRadius: 12,
          background:
            'var(--cresoa-accent-soft)',
          color: 'var(--cresoa-primary)'
        }}
      >
        <Icon
          name="users"
          size={16}
        />
      </div>

      <div
        style={{
          minWidth: 0,
          flex: 1
        }}
      >
        <div
          style={{
            overflow: 'hidden',
            color: 'var(--cresoa-text)',
            fontSize: 12,
            lineHeight: 1.3,
            fontWeight: 750,
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
        >
          {groupName}
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            marginTop: 4,
            minWidth: 0
          }}
        >
          <span
            style={{
              color:
                'var(--cresoa-text-muted)',
              fontSize: 10,
              whiteSpace: 'nowrap'
            }}
          >
            {members} member
            {members === 1 ? '' : 's'}
          </span>

          {eventDate ? (
            <>
              <span
                style={{
                  color:
                    'var(--cresoa-text-soft)'
                }}
              >
                ·
              </span>

              <span
                style={{
                  color:
                    'var(--cresoa-text-muted)',
                  fontSize: 10,
                  whiteSpace: 'nowrap'
                }}
              >
                {formatShortDate(eventDate)}
              </span>
            </>
          ) : null}
        </div>
      </div>

      <div
        style={{
          flex: '0 0 auto',
          textAlign: 'right'
        }}
      >
        <StatusBadge
          status={status}
        />

        {amount > 0 ? (
          <div
            style={{
              marginTop: 5,
              color:
                'var(--cresoa-text-muted)',
              fontSize: 10,
              fontWeight: 650
            }}
          >
            {formatMoney(amount)}
          </div>
        ) : null}
      </div>
    </button>
  )
}

function AsoEbiGroups({
  groups,
  onGroup,
  onGroups
}) {
  const recentGroups =
    groups
      .slice()
      .sort((a, b) => {
        const first =
          new Date(
            a?.created_at || 0
          ).getTime()

        const second =
          new Date(
            b?.created_at || 0
          ).getTime()

        return second - first
      })
      .slice(0, 5)

  return (
    <section
      className="cresoa-card"
      style={{
        padding: 16,
        minWidth: 0
      }}
    >
      <div
        className="cresoa-section-heading"
        style={{
          alignItems: 'center'
        }}
      >
        <div>
          <h2>Aso-Ebi groups</h2>
          <p>
            Group orders and event outfits.
          </p>
        </div>

        <button
          type="button"
          className="cresoa-button cresoa-button-secondary"
          onClick={onGroups}
          style={{
            minHeight: 34,
            padding: '0 10px',
            fontSize: 11
          }}
        >
          View all
        </button>
      </div>

      <div
        style={{
          marginTop: 7
        }}
      >
        {recentGroups.length === 0 ? (
          <EmptyState
            icon="users"
            title="No Aso-Ebi groups yet"
            description="Create a group order to manage multiple outfits together."
          />
        ) : (
          recentGroups.map(group => (
            <AsoEbiGroupRow
              key={group.id}
              group={group}
              onClick={() =>
                onGroup(group)
              }
            />
          ))
        )}
      </div>
    </section>
  )
}

function SectionGrid({
  children,
  className = ''
}) {
  return (
    <div
      className={`cresoa-section-grid ${className}`}
      style={{
        display: 'grid',
        gridTemplateColumns:
          'minmax(0, 1fr)',
        gap: 14,
        minWidth: 0
      }}
    >
      {children}
    </div>
  )
        }

function DashboardSkeleton() {
  const skeletonCard = (
    <div
      className="cresoa-card"
      style={{
        minHeight: 122,
        padding: 16
      }}
    >
      <div
        className="cresoa-skeleton"
        style={{
          width: 34,
          height: 34,
          borderRadius: 11
        }}
      />

      <div
        className="cresoa-skeleton"
        style={{
          width: '42%',
          height: 10,
          marginTop: 15,
          borderRadius: 5
        }}
      />

      <div
        className="cresoa-skeleton"
        style={{
          width: '62%',
          height: 22,
          marginTop: 7,
          borderRadius: 6
        }}
      />
    </div>
  )

  return (
    <div
      aria-label="Loading dashboard"
      aria-busy="true"
    >
      <div
        className="cresoa-skeleton"
        style={{
          width: '52%',
          height: 12,
          marginBottom: 9,
          borderRadius: 6
        }}
      />

      <div
        className="cresoa-skeleton"
        style={{
          width: '74%',
          height: 28,
          marginBottom: 24,
          borderRadius: 8
        }}
      />

      <div
        className="cresoa-grid"
        style={{
          gridTemplateColumns:
            'repeat(2, minmax(0, 1fr))'
        }}
      >
        {skeletonCard}
        {skeletonCard}
        {skeletonCard}
        {skeletonCard}
      </div>

      <div
        className="cresoa-skeleton"
        style={{
          width: '100%',
          height: 300,
          marginTop: 14,
          borderRadius: 20
        }}
      />

      <div
        className="cresoa-grid"
        style={{
          gridTemplateColumns:
            'minmax(0, 1fr)',
          marginTop: 14
        }}
      >
        <div
          className="cresoa-skeleton"
          style={{
            width: '100%',
            height: 270,
            borderRadius: 20
          }}
        />

        <div
          className="cresoa-skeleton"
          style={{
            width: '100%',
            height: 270,
            borderRadius: 20
          }}
        />
      </div>
    </div>
  )
}

function DashboardError({
  message,
  onRetry
}) {
  return (
    <section
      className="cresoa-card"
      style={{
        padding: 24,
        textAlign: 'center'
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          margin: '0 auto',
          display: 'grid',
          placeItems: 'center',
          borderRadius: 15,
          background:
            'var(--cresoa-danger-soft)',
          color: 'var(--cresoa-danger)'
        }}
      >
        <Icon
          name="alert-circle"
          size={21}
        />
      </div>

      <h2
        style={{
          margin: '14px 0 0',
          color: 'var(--cresoa-text)',
          fontSize: 16,
          fontWeight: 800
        }}
      >
        We couldn't load your dashboard
      </h2>

      <p
        style={{
          maxWidth: 360,
          margin: '7px auto 0',
          color: 'var(--cresoa-text-muted)',
          fontSize: 12,
          lineHeight: 1.5
        }}
      >
        {message ||
          'Something went wrong while loading your business data.'}
      </p>

      <button
        type="button"
        className="cresoa-button cresoa-button-primary"
        onClick={onRetry}
        style={{
          marginTop: 16
        }}
      >
        <Icon
          name="refresh"
          size={15}
        />
        Try again
      </button>
    </section>
  )
}

function DashboardLayout({
  children,
  analytics,
  secondary
}) {
  return (
    <div
      className="cresoa-dashboard-layout"
      style={{
        display: 'grid',
        gridTemplateColumns:
          'minmax(0, 1fr)',
        gap: 14,
        minWidth: 0
      }}
    >
      <main
        className="cresoa-dashboard-main"
        style={{
          display: 'grid',
          gap: 14,
          minWidth: 0
        }}
      >
        {children}
      </main>

      {analytics ? (
        <aside
          className="cresoa-dashboard-sidebar"
          style={{
            display: 'grid',
            alignContent: 'start',
            gap: 14,
            minWidth: 0
          }}
        >
          {analytics}
          {secondary}
        </aside>
      ) : null}
    </div>
  )
}

function DashboardPageContent({
  state,
  metrics,
  analyticsData,
  analyticsRange,
  setAnalyticsRange,
  onNewOrder,
  onOrder,
  onOrders,
  onCustomer,
  onCustomers,
  onGroup,
  onGroups,
  onStage,
  onAttention,
  onPayments,
  onFittings
}) {
  return (
    <>
      <DateGreeting />

      <TodayOverview
        metrics={metrics}
        onAttention={onAttention}
        onOrders={onOrders}
        onPayments={onPayments}
        onFittings={onFittings}
      />

      <DashboardLayout
        analytics={
          <AnalyticsChart
            data={analyticsData}
            range={analyticsRange}
            onRangeChange={
              setAnalyticsRange
            }
          />
        }
        secondary={
          <BusinessSnapshot
            metrics={metrics}
          />
        }
      >
        <AttentionPanel
          orders={state.orders}
          customers={state.customers}
          onOrder={onOrder}
          onOrders={onOrders}
        />

        <ProductionPipeline
          orders={state.orders}
          onStage={onStage}
        />

        <SectionGrid>
          <RecentOrders
            orders={state.orders}
            customers={state.customers}
            onOrder={onOrder}
            onOrders={onOrders}
          />

          <RecentCustomers
            customers={state.customers}
            onCustomer={onCustomer}
            onCustomers={onCustomers}
          />

          <AsoEbiGroups
            groups={state.groups}
            onGroup={onGroup}
            onGroups={onGroups}
          />
        </SectionGrid>
      </DashboardLayout>
    </>
  )
          }

  // ─── Responsive dashboard helpers ─────────────────────
  const handleAnalyticsPeriod = (value) => {
    setPeriod(value)
    setSelectedDay(null)
  }

  const handleOrderClick = (order) => {
    if (!order?.id || !businessId) return

    router.push(
      `/dashboard/orders/${order.id}?business_id=${businessId}`
    )
  }

  const handleOrdersClick = (filter = '') => {
    if (!businessId) return

    const query = filter
      ? `?business_id=${businessId}&filter=${filter}`
      : `?business_id=${businessId}`

    router.push(`/dashboard/orders${query}`)
  }

  const handleCustomerClick = (customer) => {
    if (!customer?.id || !businessId) return

    router.push(
      `/dashboard/customers/${customer.id}?business_id=${businessId}`
    )
  }

  const handleCustomersClick = () => {
    if (!businessId) return

    router.push(
      `/dashboard/customers?business_id=${businessId}`
    )
  }

  const handleGroupClick = (group) => {
    if (!group?.id || !businessId) return

    router.push(
      `/dashboard/group-orders/${group.id}?business_id=${businessId}`
    )
  }

  const handleGroupsClick = () => {
    if (!businessId) return

    router.push(
      `/dashboard/group-orders?business_id=${businessId}`
    )
  }

  const handlePaymentsClick = () => {
    if (!businessId) return

    router.push(
      `/dashboard/payments?business_id=${businessId}&filter=outstanding`
    )
  }

  const handleFittingsClick = () => {
    if (!businessId) return

    router.push(
      `/dashboard/orders?business_id=${businessId}&filter=due_today`
    )
  }

  const handleAttentionClick = () => {
    if (!businessId) return

    router.push(
      `/dashboard/orders?business_id=${businessId}&filter=attention`
    )
  }

  const handleProductionStageClick = (stage) => {
    if (!businessId || !stage) return

    router.push(
      `/dashboard/orders?business_id=${businessId}&status=${encodeURIComponent(stage)}`
    )
  }

  const handleNewOrder = () => {
    if (!businessId) return

    router.push(
      `/dashboard/orders/new?business_id=${businessId}`
    )
  }

  // ─── Mobile-safe analytics data ───────────────────────
  const analyticsDaily = useMemo(() => {
    const days =
      period === '7d'
        ? 7
        : period === '90d'
          ? 90
          : 30

    const today = new Date()
    const result = []

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today)

      date.setDate(
        today.getDate() - i
      )

      date.setHours(
        0,
        0,
        0,
        0
      )

      const dateKey =
        date.toISOString().split('T')[0]

      const dayOrders =
        orders.filter(order => {
          if (!order?.created_at) {
            return false
          }

          return (
            order.created_at.startsWith(
              dateKey
            )
          )
        })

      const revenue =
        dayOrders.reduce(
          (sum, order) =>
            sum +
            safeAmount(
              order?.amount_paid
            ),
          0
        )

      result.push({
        key: dateKey,
        date,
        label:
          date.toLocaleDateString(
            'en-GB',
            {
              day: 'numeric',
              month: 'short'
            }
          ),
        revenue,
        orders:
          dayOrders.length
      })
    }

    return result
  }, [
    orders,
    period
  ])

  const analyticsMaxRevenue =
    Math.max(
      ...analyticsDaily.map(
        day =>
          Number(
            day.revenue || 0
          )
      ),
      1
    )

  const selectedAnalyticsDay =
    analyticsDaily.find(
      day =>
        day.key === selectedDay
    ) || null

  const analyticsPeriodRevenue =
    analyticsDaily.reduce(
      (sum, day) =>
        sum +
        Number(
          day.revenue || 0
        ),
      0
    )

  const analyticsPeriodOrders =
    analyticsDaily.reduce(
      (sum, day) =>
        sum +
        Number(
          day.orders || 0
        ),
      0
    )

  // ─── Dashboard date / greeting ────────────────────────
  const currentHour =
    new Date().getHours()

  let greeting =
    'Good evening'

  if (currentHour < 12) {
    greeting =
      'Good morning'
  } else if (
    currentHour < 17
  ) {
    greeting =
      'Good afternoon'
  }

  const dashboardBusinessName =
    business?.name ||
    'your business'

  // ─── Recent records ───────────────────────────────────
  const recentOrders =
    orders
      .slice()
      .sort(
        (a, b) =>
          new Date(
            b?.created_at || 0
          ).getTime() -
          new Date(
            a?.created_at || 0
          ).getTime()
      )
      .slice(0, 6)

  const recentCustomers =
    customers
      .slice()
      .sort(
        (a, b) =>
          new Date(
            b?.created_at || 0
          ).getTime() -
          new Date(
            a?.created_at || 0
          ).getTime()
      )
      .slice(0, 5)

  const recentGroups =
    groups
      .slice()
      .sort(
        (a, b) =>
          new Date(
            b?.created_at || 0
          ).getTime() -
          new Date(
            a?.created_at || 0
          ).getTime()
      )
      .slice(0, 5)

  // ─── Production counts ────────────────────────────────
  const productionCounts =
    orders.reduce(
      (result, order) => {
        const status =
          order?.current_status ||
          'Order placed'

        result[status] =
          (result[status] || 0) + 1

        return result
      },
      {}
    )

  const productionStages = [
    'Order placed',
    'Cutting',
    'Sewing',
    'Fitting',
    'Finishing',
    'Ready',
    'Delivered'
  ]

  // ─── Customer lookup ──────────────────────────────────
  const customerById =
    useMemo(() => {
      const map = {}

      customers.forEach(
        customer => {
          if (customer?.id) {
            map[customer.id] =
              customer
          }
        }
      )

      return map
    }, [customers])

  const getOrderCustomer =
    order => {
      if (
        !order?.customer_id
      ) {
        return null
      }

      return (
        customerById[
          order.customer_id
        ] || null
      )
    }

  // ─── Theme-safe status colours ────────────────────────
  const getStatusTone =
    status => {
      const value =
        String(
          status || ''
        ).toLowerCase()

      if (
        value.includes(
          'deliver'
        ) ||
        value.includes(
          'ready'
        )
      ) {
        return 'success'
      }

      if (
        value.includes(
          'overdue'
        ) ||
        value.includes(
          'cancel'
        )
      ) {
        return 'danger'
      }

      if (
        value.includes(
          'fitting'
        ) ||
        value.includes(
          'alter'
        )
      ) {
        return 'warning'
      }

      return 'info'
    }

  // ─── Dashboard shell ──────────────────────────────────
  const dashboardStyles = `
    .cresoa-dashboard {
      width: 100%;
      min-height: 100vh;
      background: var(--color-bg);
      color: var(--color-text);
      overflow-x: hidden;
    }

    .cresoa-dashboard-shell {
      width: 100%;
      max-width: 1440px;
      margin: 0 auto;
      padding: 16px;
      box-sizing: border-box;
    }

    .cresoa-dashboard-content {
      width: 100%;
      min-width: 0;
    }

    .cresoa-dashboard-grid {
      display: grid;
      grid-template-columns:
        minmax(0, 1fr);
      gap: 14px;
      width: 100%;
      min-width: 0;
    }

    .cresoa-dashboard-two-col {
      display: grid;
      grid-template-columns:
        minmax(0, 1fr);
      gap: 14px;
      width: 100%;
      min-width: 0;
    }

    .cresoa-dashboard-card {
      width: 100%;
      min-width: 0;
      box-sizing: border-box;
      background: var(--color-card);
      border: 1px solid var(--color-border);
      border-radius: 18px;
      box-shadow:
        0 8px 30px rgba(15, 43, 74, 0.05);
    }

    .cresoa-dashboard-card-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
      min-width: 0;
    }

    .cresoa-dashboard-card-header > div {
      min-width: 0;
    }

    .cresoa-dashboard-section-title {
      margin: 0;
      color: var(--color-text);
      font-size: 15px;
      line-height: 1.25;
      font-weight: 800;
      letter-spacing: -0.02em;
    }

    .cresoa-dashboard-section-subtitle {
      margin: 5px 0 0;
      color: var(--color-text-muted);
      font-size: 11px;
      line-height: 1.45;
    }

    .cresoa-dashboard-button {
      min-height: 36px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 7px;
      padding: 0 12px;
      border: 1px solid var(--color-border);
      border-radius: 10px;
      background: var(--color-card);
      color: var(--color-text);
      font-size: 11px;
      font-weight: 750;
      cursor: pointer;
      white-space: nowrap;
    }

    .cresoa-dashboard-button-primary {
      border-color: var(--color-accent);
      background: var(--color-accent);
      color: #fff;
    }

    .cresoa-dashboard-button:active {
      transform: translateY(1px);
    }

    .cresoa-dashboard-chart {
      width: 100%;
      min-width: 0;
      overflow: hidden;
    }

    .cresoa-dashboard-chart svg {
      display: block;
      width: 100%;
      height: auto;
      max-width: 100%;
    }

    @media (min-width: 700px) {
      .cresoa-dashboard-shell {
        padding: 20px;
      }

      .cresoa-dashboard-two-col {
        grid-template-columns:
          repeat(2, minmax(0, 1fr));
        gap: 18px;
      }
    }

    @media (min-width: 1000px) {
      .cresoa-dashboard-shell {
        padding: 24px;
      }

      .cresoa-dashboard-grid {
        grid-template-columns:
          minmax(0, 1.55fr)
          minmax(300px, 0.75fr);
        gap: 20px;
      }
    }

    @media (min-width: 1280px) {
      .cresoa-dashboard-shell {
        padding: 28px;
      }

      .cresoa-dashboard-grid {
        grid-template-columns:
          minmax(0, 1.7fr)
          minmax(330px, 0.72fr);
      }
    }

    @media (max-width: 420px) {
      .cresoa-dashboard-shell {
        padding: 12px;
      }

      .cresoa-dashboard-card {
        border-radius: 15px;
      }
    }
  `;
return (
  <>
    <style>{dashboardStyles}</style>

    <div className="cresoa-dashboard">
      <div className="cresoa-dashboard-shell">
        <div className="cresoa-dashboard-content">

          {deactivated ? (
            <div
              className="cresoa-dashboard-card"
              style={{
                padding: 22,
                marginBottom: 16,
                borderColor:
                  'var(--color-warning)',
                background:
                  'var(--color-card)'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    flex: '0 0 auto',
                    display: 'grid',
                    placeItems: 'center',
                    borderRadius: 12,
                    background:
                      'var(--color-warning-soft)',
                    color:
                      'var(--color-warning)'
                  }}
                >
                  <span
                    style={{
                      fontSize: 18
                    }}
                  >
                    !
                  </span>
                </div>

                <div
                  style={{
                    minWidth: 0
                  }}
                >
                  <h2
                    style={{
                      margin: 0,
                      color:
                        'var(--color-text)',
                      fontSize: 15,
                      fontWeight: 800
                    }}
                  >
                    Business account
                  </h2>

                  <p
                    style={{
                      margin:
                        '5px 0 0',
                      color:
                        'var(--color-text-muted)',
                      fontSize: 12,
                      lineHeight: 1.5
                    }}
                  >
                    This business account is
                    currently unavailable.
                    Please contact support if
                    you believe this is an error.
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          <div
            className="cresoa-dashboard-grid"
          >
            <div
              style={{
                minWidth: 0
              }}
            >
              <DashboardHeader
                business={business}
                businessId={businessId}
                greeting={greeting}
                onNewOrder={
                  handleNewOrder
                }
                onRefresh={() =>
                  loadDashboard(
                    true
                  )
                }
                loading={loading}
              />

              <div
                style={{
                  marginTop: 14
                }}
              >
                <TodayOverview
                  metrics={{
                    ...metrics,
                    periodRevenue:
                      analyticsPeriodRevenue,
                    periodOrders:
                      analyticsPeriodOrders
                  }}
                  onAttention={
                    handleAttentionClick
                  }
                  onOrders={
                    handleOrdersClick
                  }
                  onPayments={
                    handlePaymentsClick
                  }
                  onFittings={
                    handleFittingsClick
                  }
                />
              </div>

              <div
                style={{
                  marginTop: 14
                }}
              >
                <AttentionPanel
                  orders={orders}
                  customers={customers}
                  onOrder={
                    handleOrderClick
                  }
                  onOrders={
                    () =>
                      handleOrdersClick(
                        'attention'
                      )
                  }
                />
              </div>

              <div
                style={{
                  marginTop: 14
                }}
              >
                <ProductionPipeline
                  orders={orders}
                  stages={
                    productionStages
                  }
                  counts={
                    productionCounts
                  }
                  onStage={
                    handleProductionStageClick
                  }
                />
              </div>
            </div>

            <aside
              style={{
                minWidth: 0
              }}
            >
              <AnalyticsCard
                data={
                  analyticsDaily
                }
                period={period}
                onPeriodChange={
                  handleAnalyticsPeriod
                }
                selectedDay={
                  selectedAnalyticsDay
                }
                onSelectDay={
                  day =>
                    setSelectedDay(
                      day?.key ||
                        null
                    )
                }
                maxRevenue={
                  analyticsMaxRevenue
                }
                totalRevenue={
                  analyticsPeriodRevenue
                }
                totalOrders={
                  analyticsPeriodOrders
                }
              />

              <div
                style={{
                  marginTop: 14
                }}
              >
                <BusinessSnapshot
                  metrics={metrics}
                />
              </div>
            </aside>
          </div>

          <div
            style={{
              marginTop: 14
            }}
          >
            <div
              className="cresoa-dashboard-two-col"
            >
              <RecentOrders
                orders={
                  recentOrders
                }
                customers={
                  customers
                }
                onOrder={
                  handleOrderClick
                }
                onOrders={
                  handleOrdersClick
                }
              />

              <RecentCustomers
                customers={
                  recentCustomers
                }
                onCustomer={
                  handleCustomerClick
                }
                onCustomers={
                  handleCustomersClick
                }
              />

              <AsoEbiGroups
                groups={
                  recentGroups
                }
                onGroup={
                  handleGroupClick
                }
                onGroups={
                  handleGroupsClick
                }
              />
            </div>
          </div>

        </div>
      </div>
    </div>
  </>
)

                  function AnalyticsCard({
  data = [],
  period,
  onPeriodChange,
  selectedDay,
  onSelectDay,
  maxRevenue = 1,
  totalRevenue = 0,
  totalOrders = 0
}) {
  const width = 720
  const height = 250
  const padLeft = 12
  const padRight = 12
  const padTop = 24
  const padBottom = 34

  const chartWidth =
    width - padLeft - padRight

  const chartHeight =
    height - padTop - padBottom

  const points = data.map(
    (item, index) => {
      const x =
        data.length <= 1
          ? width / 2
          : padLeft +
            (index /
              (data.length - 1)) *
              chartWidth

      const value =
        Number(
          item?.revenue || 0
        )

      const y =
        padTop +
        chartHeight -
        (value /
          Math.max(
            maxRevenue,
            1
          )) *
          chartHeight

      return {
        ...item,
        x,
        y
      }
    }
  )

  const linePath =
    points.length
      ? points
          .map(
            (point, index) =>
              `${
                index === 0
                  ? 'M'
                  : 'L'
              } ${point.x} ${point.y}`
          )
          .join(' ')
      : ''

  const areaPath =
    points.length
      ? `${linePath}
         L ${points[points.length - 1].x}
           ${padTop + chartHeight}
         L ${points[0].x}
           ${padTop + chartHeight}
         Z`
      : ''

  const visibleLabels =
    points.filter(
      (_, index) => {
        if (period === '7d') {
          return true
        }

        if (period === '30d') {
          return (
            index === 0 ||
            index ===
              Math.floor(
                points.length / 2
              ) ||
            index ===
              points.length - 1
          )
        }

        return (
          index === 0 ||
          index ===
            Math.floor(
              points.length / 3
            ) ||
          index ===
            Math.floor(
              (points.length * 2) /
                3
            ) ||
          index ===
            points.length - 1
        )
      }
    )

  return (
    <section
      className="cresoa-dashboard-card"
      style={{
        padding: 16
      }}
    >
      <div
        className="cresoa-dashboard-card-header"
      >
        <div>
          <h2
            className="cresoa-dashboard-section-title"
          >
            Revenue analytics
          </h2>

          <p
            className="cresoa-dashboard-section-subtitle"
          >
            Daily performance for your business.
          </p>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 3,
            padding: 3,
            borderRadius: 10,
            background:
              'var(--color-bg-soft)',
            flex: '0 0 auto'
          }}
        >
          {[
            ['7d', '7D'],
            ['30d', '30D'],
            ['90d', '90D']
          ].map(
            ([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() =>
                  onPeriodChange(
                    value
                  )
                }
                style={{
                  minHeight: 30,
                  padding:
                    '0 8px',
                  border: 0,
                  borderRadius: 8,
                  background:
                    period === value
                      ? 'var(--color-card)'
                      : 'transparent',
                  color:
                    period === value
                      ? 'var(--color-text)'
                      : 'var(--color-text-muted)',
                  boxShadow:
                    period === value
                      ? '0 2px 8px rgba(0,0,0,.06)'
                      : 'none',
                  fontSize: 10,
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                {label}
              </button>
            )
          )}
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 8,
          marginTop: 16
        }}
      >
        <strong
          style={{
            color:
              'var(--color-text)',
            fontSize: 22,
            lineHeight: 1,
            letterSpacing:
              '-0.035em'
          }}
        >
          {formatMoney(
            totalRevenue
          )}
        </strong>

        <span
          style={{
            color:
              'var(--color-text-muted)',
            fontSize: 10,
            fontWeight: 650
          }}
        >
          {totalOrders}{' '}
          order
          {totalOrders === 1
            ? ''
            : 's'}
        </span>
      </div>

      <div
        className="cresoa-dashboard-chart"
        style={{
          marginTop: 12,
          position: 'relative',
          touchAction: 'pan-y'
        }}
      >
        {data.length === 0 ? (
          <EmptyState
            icon="chart"
            title="Not enough data yet"
            description="Revenue activity will appear here as orders come in."
          />
        ) : (
          <svg
            viewBox={`0 0 ${width} ${height}`}
            role="img"
            aria-label="Daily revenue analytics chart"
            preserveAspectRatio="none"
            style={{
              width: '100%',
              height: 250,
              overflow:
                'visible'
            }}
          >
            <defs>
              <linearGradient
                id="cresoaRevenueFill"
                x1="0"
                x2="0"
                y1="0"
                y2="1"
              >
                <stop
                  offset="0%"
                  stopColor="var(--color-accent)"
                  stopOpacity=".20"
                />

                <stop
                  offset="100%"
                  stopColor="var(--color-accent)"
                  stopOpacity="0"
                />
              </linearGradient>
            </defs>

            {[0, 0.5, 1].map(
              ratio => {
                const y =
                  padTop +
                  chartHeight *
                    ratio

                return (
                  <line
                    key={ratio}
                    x1={padLeft}
                    x2={
                      width -
                      padRight
                    }
                    y1={y}
                    y2={y}
                    stroke="var(--color-border)"
                    strokeWidth="1"
                    strokeDasharray="3 5"
                  />
                )
              }
            )}

            {areaPath ? (
              <path
                d={areaPath}
                fill="url(#cresoaRevenueFill)"
                stroke="none"
              />
            ) : null}

            {linePath ? (
              <path
                d={linePath}
                fill="none"
                stroke="var(--color-accent)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
            ) : null}

            {points.map(
              point => {
                const selected =
                  selectedDay?.key ===
                  point.key

                return (
                  <g
                    key={point.key}
                    onClick={() =>
                      onSelectDay(
                        point
                      )
                    }
                    style={{
                      cursor:
                        'pointer'
                    }}
                  >
                    <circle
                      cx={point.x}
                      cy={point.y}
                      r={
                        selected
                          ? 6
                          : 4
                      }
                      fill="var(--color-card)"
                      stroke="var(--color-accent)"
                      strokeWidth={
                        selected
                          ? 3
                          : 2
                      }
                      vectorEffect="non-scaling-stroke"
                    />

                    <rect
                      x={
                        point.x -
                        Math.max(
                          12,
                          chartWidth /
                            Math.max(
                              data.length,
                              1
                            ) /
                            2
                        )
                      }
                      y={padTop}
                      width={Math.max(
                        24,
                        chartWidth /
                          Math.max(
                            data.length,
                            1
                          )
                      )}
                      height={
                        chartHeight
                      }
                      fill="transparent"
                    />
                  </g>
                )
              }
            )}

            {visibleLabels.map(
              point => (
                <text
                  key={`label-${point.key}`}
                  x={point.x}
                  y={
                    height -
                    10
                  }
                  textAnchor="middle"
                  fill="var(--color-text-muted)"
                  fontSize="10"
                >
                  {point.label}
                </text>
              )
            )}
          </svg>
        )}
      </div>

      <div
        style={{
          minHeight: 48,
          marginTop: 4,
          padding: '10px 12px',
          borderRadius: 12,
          background:
            'var(--color-bg-soft)'
        }}
      >
        {selectedDay ? (
          <div
            style={{
              display: 'flex',
              alignItems:
                'center',
              justifyContent:
                'space-between',
              gap: 12
            }}
          >
            <div>
              <div
                style={{
                  color:
                    'var(--color-text)',
                  fontSize: 11,
                  fontWeight: 800
                }}
              >
                {selectedDay.label}
              </div>

              <div
                style={{
                  marginTop: 2,
                  color:
                    'var(--color-text-muted)',
                  fontSize: 10
                }}
              >
                {selectedDay.orders}{' '}
                order
                {selectedDay.orders ===
                1
                  ? ''
                  : 's'}
              </div>
            </div>

            <strong
              style={{
                color:
                  'var(--color-accent)',
                fontSize: 13
              }}
            >
              {formatMoney(
                selectedDay.revenue
              )}
            </strong>
          </div>
        ) : (
          <div
            style={{
              color:
                'var(--color-text-muted)',
              fontSize: 10,
              lineHeight: 1.4
            }}
          >
            Tap any point on the chart
            to inspect that day.
          </div>
        )}
      </div>
    </section>
  )
            }

function DashboardHeader({
  business,
  businessId,
  greeting,
  onNewOrder,
  onRefresh,
  loading = false
}) {
  const businessName =
    business?.name ||
    business?.business_name ||
    'Your fashion business'

  const initials =
    businessName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map(word =>
        word.charAt(0).toUpperCase()
      )
      .join('') || 'C'

  return (
    <header
      style={{
        width: '100%',
        minWidth: 0
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          minWidth: 0
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            minWidth: 0
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              flex: '0 0 auto',
              display: 'grid',
              placeItems: 'center',
              borderRadius: 13,
              background:
                'var(--color-accent-soft)',
              color:
                'var(--color-accent)',
              fontSize: 12,
              fontWeight: 900,
              letterSpacing: '-0.02em'
            }}
          >
            {initials}
          </div>

          <div
            style={{
              minWidth: 0
            }}
          >
            <div
              style={{
                overflow: 'hidden',
                color:
                  'var(--color-text-muted)',
                fontSize: 10,
                fontWeight: 650,
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
            >
              {businessId
                ? `Business ID: ${businessId}`
                : 'Cresoa workspace'}
            </div>

            <div
              style={{
                overflow: 'hidden',
                marginTop: 2,
                color:
                  'var(--color-text)',
                fontSize: 13,
                fontWeight: 850,
                letterSpacing: '-0.02em',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
            >
              {businessName}
            </div>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            flex: '0 0 auto'
          }}
        >
          <button
            type="button"
            className="cresoa-dashboard-button"
            onClick={onRefresh}
            disabled={loading}
            aria-label="Refresh dashboard"
            title="Refresh dashboard"
            style={{
              width: 36,
              minWidth: 36,
              padding: 0,
              opacity:
                loading ? 0.55 : 1
            }}
          >
            <span
              style={{
                display: 'inline-flex',
                transform:
                  loading
                    ? 'rotate(360deg)'
                    : 'none',
                transition:
                  'transform .7s ease'
              }}
            >
              ↻
            </span>
          </button>

          <button
            type="button"
            className="cresoa-dashboard-button cresoa-dashboard-button-primary"
            onClick={onNewOrder}
          >
            <span
              aria-hidden="true"
              style={{
                fontSize: 15,
                lineHeight: 1
              }}
            >
              +
            </span>

            <span>
              New order
            </span>
          </button>
        </div>
      </div>

      <div
        style={{
          marginTop: 22,
          minWidth: 0
        }}
      >
        <div
          style={{
            color:
              'var(--color-text-muted)',
            fontSize: 12,
            fontWeight: 650
          }}
        >
          {greeting}
        </div>

        <h1
          style={{
            maxWidth: 700,
            margin:
              '4px 0 0',
            color:
              'var(--color-text)',
            fontSize:
              'clamp(24px, 5vw, 34px)',
            lineHeight: 1.08,
            fontWeight: 900,
            letterSpacing:
              '-0.045em'
          }}
        >
          Here's how your business
          is doing today.
        </h1>

        <p
          style={{
            maxWidth: 600,
            margin:
              '8px 0 0',
            color:
              'var(--color-text-muted)',
            fontSize: 12,
            lineHeight: 1.55
          }}
        >
          Stay on top of orders, fittings,
          payments and production without
          losing sight of your customers.
        </p>
      </div>
    </header>
  )
}

function TodayOverview({
  metrics = {},
  onAttention,
  onOrders,
  onPayments,
  onFittings
}) {
  const cards = [
    {
      label: 'Revenue',
      value: formatMoney(
        metrics.todayRevenue || 0
      ),
      meta: 'Today',
      icon: '₦',
      action: null
    },
    {
      label: 'Orders',
      value:
        metrics.todayOrders ||
        0,
      meta: 'Received today',
      icon: '↗',
      action: onOrders
    },
    {
      label: 'Outstanding',
      value: formatMoney(
        metrics.outstanding ||
          0
      ),
      meta: 'Awaiting payment',
      icon: '₦',
      tone: 'warning',
      action: onPayments
    },
    {
      label: 'Attention',
      value:
        metrics.attentionCount ||
        0,
      meta: 'Need your action',
      icon: '!',
      tone: 'danger',
      action: onAttention
    }
  ]

  return (
    <section>
      <div
        className="cresoa-dashboard-card-header"
        style={{
          marginBottom: 10
        }}
      >
        <div>
          <h2 className="cresoa-dashboard-section-title">
            Today's overview
          </h2>

          <p className="cresoa-dashboard-section-subtitle">
            The numbers worth checking first.
          </p>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns:
            'repeat(2, minmax(0, 1fr))',
          gap: 9
        }}
      >
        {cards.map(card => (
          <button
            key={card.label}
            type="button"
            onClick={card.action || undefined}
            disabled={!card.action}
            className="cresoa-dashboard-card"
            style={{
              padding: 13,
              border: '1px solid var(--color-border)',
              textAlign: 'left',
              cursor: card.action
                ? 'pointer'
                : 'default',
              color: 'inherit'
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent:
                  'space-between',
                gap: 8
              }}
            >
              <span
                style={{
                  color:
                    'var(--color-text-muted)',
                  fontSize: 10,
                  fontWeight: 700
                }}
              >
                {card.label}
              </span>

              <span
                style={{
                  width: 27,
                  height: 27,
                  display: 'grid',
                  placeItems: 'center',
                  borderRadius: 9,
                  background:
                    card.tone === 'danger'
                      ? 'var(--color-danger-soft)'
                      : card.tone === 'warning'
                        ? 'var(--color-warning-soft)'
                        : 'var(--color-accent-soft)',
                  color:
                    card.tone === 'danger'
                      ? 'var(--color-danger)'
                      : card.tone === 'warning'
                        ? 'var(--color-warning)'
                        : 'var(--color-accent)',
                  fontSize: 12,
                  fontWeight: 900
                }}
              >
                {card.icon}
              </span>
            </div>

            <div
              style={{
                marginTop: 12,
                color:
                  card.tone === 'danger'
                    ? 'var(--color-danger)'
                    : 'var(--color-text)',
                fontSize:
                  'clamp(17px, 4vw, 22px)',
                lineHeight: 1,
                fontWeight: 900,
                letterSpacing:
                  '-0.035em'
              }}
            >
              {card.value}
            </div>

            <div
              style={{
                marginTop: 6,
                color:
                  'var(--color-text-muted)',
                fontSize: 9,
                lineHeight: 1.35
              }}
            >
              {card.meta}
            </div>
          </button>
        ))}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns:
            'repeat(2, minmax(0, 1fr))',
          gap: 9,
          marginTop: 9
        }}
      >
        <button
          type="button"
          onClick={onFittings}
          className="cresoa-dashboard-card"
          style={{
            minHeight: 52,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
            padding: '0 13px',
            border: '1px solid var(--color-border)',
            color: 'inherit',
            textAlign: 'left',
            cursor: 'pointer'
          }}
        >
          <span
            style={{
              color:
                'var(--color-text-muted)',
              fontSize: 10,
              fontWeight: 700
            }}
          >
            Fittings today
          </span>

          <strong
            style={{
              color:
                'var(--color-text)',
              fontSize: 15
            }}
          >
            {metrics.fittingsToday || 0}
          </strong>
        </button>

        <button
          type="button"
          onClick={onOrders}
          className="cresoa-dashboard-card"
          style={{
            minHeight: 52,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
            padding: '0 13px',
            border: '1px solid var(--color-border)',
            color: 'inherit',
            textAlign: 'left',
            cursor: 'pointer'
          }}
        >
          <span
            style={{
              color:
                'var(--color-text-muted)',
              fontSize: 10,
              fontWeight: 700
            }}
          >
            Active orders
          </span>

          <strong
            style={{
              color:
                'var(--color-accent)',
              fontSize: 15
            }}
          >
            {metrics.activeOrders || 0}
          </strong>
        </button>
      </div>
    </section>
  )
                    }

function AttentionPanel({
  orders = [],
  customers = [],
  onOrder,
  onOrders
}) {
  const now = Date.now()

  const items = orders
    .map(order => {
      const customer =
        customers.find(
          c =>
            c?.id ===
            order?.customer_id
        )

      const due =
        order?.delivery_date ||
        order?.due_date

      const dueTime = due
        ? new Date(due).getTime()
        : 0

      const balance =
        Math.max(
          0,
          safeAmount(
            order?.total_amount
          ) -
            safeAmount(
              order?.amount_paid
            )
        )

      const overdue =
        dueTime > 0 &&
        dueTime < now &&
        !String(
          order?.current_status ||
            ''
        )
          .toLowerCase()
          .includes('deliver')

      const unpaid = balance > 0

      if (!overdue && !unpaid)
        return null

      return {
        order,
        customer,
        balance,
        overdue,
        due
      }
    })
    .filter(Boolean)
    .sort(
      (a, b) =>
        Number(b.overdue) -
        Number(a.overdue)
    )
    .slice(0, 4)

  return (
    <section
      className="cresoa-dashboard-card"
      style={{
        padding: 16,
        borderColor:
          items.length
            ? 'var(--color-warning-border)'
            : 'var(--color-border)'
      }}
    >
      <div className="cresoa-dashboard-card-header">
        <div>
          <h2 className="cresoa-dashboard-section-title">
            Needs your attention
          </h2>

          <p className="cresoa-dashboard-section-subtitle">
            Payments and deliveries that may need action.
          </p>
        </div>

        {items.length > 0 && (
          <button
            type="button"
            className="cresoa-dashboard-button"
            onClick={onOrders}
          >
            View all
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginTop: 14,
            padding: 12,
            borderRadius: 12,
            background:
              'var(--color-bg-soft)'
          }}
        >
          <span
            style={{
              width: 30,
              height: 30,
              display: 'grid',
              placeItems: 'center',
              borderRadius: 9,
              background:
                'var(--color-success-soft)',
              color:
                'var(--color-success)',
              fontWeight: 900
            }}
          >
            ✓
          </span>

          <div>
            <div
              style={{
                color:
                  'var(--color-text)',
                fontSize: 11,
                fontWeight: 800
              }}
            >
              You're all caught up
            </div>

            <div
              style={{
                marginTop: 2,
                color:
                  'var(--color-text-muted)',
                fontSize: 10
              }}
            >
              No urgent orders or unpaid balances found.
            </div>
          </div>
        </div>
      ) : (
        <div
          style={{
            marginTop: 7
          }}
        >
          {items.map(item => {
            const name =
              getCustomerName(
                item.customer
              )

            return (
              <button
                key={item.order.id}
                type="button"
                onClick={() =>
                  onOrder(
                    item.order
                  )
                }
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 11,
                  padding:
                    '12px 0',
                  border: 0,
                  borderBottom:
                    '1px solid var(--color-border)',
                  background:
                    'transparent',
                  color: 'inherit',
                  textAlign: 'left',
                  cursor: 'pointer'
                }}
              >
                <span
                  style={{
                    width: 34,
                    height: 34,
                    flex: '0 0 auto',
                    display: 'grid',
                    placeItems: 'center',
                    borderRadius: 10,
                    background:
                      item.overdue
                        ? 'var(--color-danger-soft)'
                        : 'var(--color-warning-soft)',
                    color:
                      item.overdue
                        ? 'var(--color-danger)'
                        : 'var(--color-warning)',
                    fontSize: 12,
                    fontWeight: 900
                  }}
                >
                  {item.overdue
                    ? '!'
                    : '₦'}
                </span>

                <span
                  style={{
                    minWidth: 0,
                    flex: 1
                  }}
                >
                  <span
                    style={{
                      display: 'block',
                      overflow: 'hidden',
                      color:
                        'var(--color-text)',
                      fontSize: 11,
                      fontWeight: 800,
                      textOverflow:
                        'ellipsis',
                      whiteSpace:
                        'nowrap'
                    }}
                  >
                    {name ||
                      'Customer'}
                  </span>

                  <span
                    style={{
                      display: 'block',
                      marginTop: 3,
                      color:
                        'var(--color-text-muted)',
                      fontSize: 9,
                      overflow: 'hidden',
                      textOverflow:
                        'ellipsis',
                      whiteSpace:
                        'nowrap'
                    }}
                  >
                    {item.overdue
                      ? `Delivery overdue · ${formatShortDate(
                          item.due
                        )}`
                      : `${formatMoney(
                          item.balance
                        )} outstanding`}
                  </span>
                </span>

                <span
                  style={{
                    flex: '0 0 auto',
                    color:
                      'var(--color-text-muted)',
                    fontSize: 14
                  }}
                >
                  ›
                </span>
              </button>
            )
          })}
        </div>
      )}
    </section>
  )
                }

function ProductionPipeline({
  orders = [],
  stages = [],
  counts = {},
  onStage
}) {
  const total =
    orders.length || 1

  const activeStages =
    stages.filter(stage =>
      orders.some(
        order =>
          String(
            order?.current_status || ''
          ).toLowerCase() ===
          String(stage).toLowerCase()
      )
    )

  const displayStages =
    activeStages.length
      ? activeStages
      : stages

  return (
    <section
      className="cresoa-dashboard-card"
      style={{
        padding: 16
      }}
    >
      <div className="cresoa-dashboard-card-header">
        <div>
          <h2 className="cresoa-dashboard-section-title">
            Production pipeline
          </h2>

          <p className="cresoa-dashboard-section-subtitle">
            See where every order is in the making.
          </p>
        </div>

        <span
          style={{
            color:
              'var(--color-text-muted)',
            fontSize: 10,
            fontWeight: 700
          }}
        >
          {orders.length} active
        </span>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns:
            'repeat(2, minmax(0, 1fr))',
          gap: 8,
          marginTop: 14
        }}
      >
        {displayStages.map(
          (stage, index) => {
            const count =
              counts[stage] || 0

            const percentage =
              Math.round(
                (count / total) *
                  100
              )

            const isLast =
              index ===
              displayStages.length - 1

            return (
              <button
                key={stage}
                type="button"
                onClick={() =>
                  onStage(stage)
                }
                style={{
                  position: 'relative',
                  minWidth: 0,
                  padding: 12,
                  border:
                    '1px solid var(--color-border)',
                  borderRadius: 13,
                  background:
                    'var(--color-card)',
                  color:
                    'var(--color-text)',
                  textAlign: 'left',
                  cursor: 'pointer',
                  overflow: 'hidden'
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent:
                      'space-between',
                    gap: 8
                  }}
                >
                  <span
                    style={{
                      width: 23,
                      height: 23,
                      display: 'grid',
                      placeItems: 'center',
                      flex: '0 0 auto',
                      borderRadius: 7,
                      background:
                        isLast
                          ? 'var(--color-success-soft)'
                          : 'var(--color-accent-soft)',
                      color:
                        isLast
                          ? 'var(--color-success)'
                          : 'var(--color-accent)',
                      fontSize: 9,
                      fontWeight: 900
                    }}
                  >
                    {index + 1}
                  </span>

                  <strong
                    style={{
                      color:
                        'var(--color-text)',
                      fontSize: 17,
                      lineHeight: 1
                    }}
                  >
                    {count}
                  </strong>
                </div>

                <div
                  style={{
                    marginTop: 10,
                    overflow: 'hidden',
                    color:
                      'var(--color-text)',
                    fontSize: 10,
                    fontWeight: 800,
                    textOverflow:
                      'ellipsis',
                    whiteSpace:
                      'nowrap'
                  }}
                >
                  {stage}
                </div>

                <div
                  style={{
                    height: 4,
                    marginTop: 9,
                    overflow: 'hidden',
                    borderRadius: 99,
                    background:
                      'var(--color-bg-soft)'
                  }}
                >
                  <div
                    style={{
                      width: `${Math.min(
                        100,
                        percentage
                      )}%`,
                      height: '100%',
                      borderRadius: 99,
                      background:
                        isLast
                          ? 'var(--color-success)'
                          : 'var(--color-accent)',
                      transition:
                        'width .35s ease'
                    }}
                  />
                </div>

                <div
                  style={{
                    marginTop: 5,
                    color:
                      'var(--color-text-muted)',
                    fontSize: 8
                  }}
                >
                  {percentage}% of orders
                </div>
              </button>
            )
          }
        )}
      </div>

      {orders.length > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            marginTop: 14,
            padding: '9px 11px',
            borderRadius: 10,
            background:
              'var(--color-bg-soft)',
            color:
              'var(--color-text-muted)',
            fontSize: 9,
            lineHeight: 1.4
          }}
        >
          <span
            style={{
              color:
                'var(--color-accent)',
              fontSize: 11
            }}
          >
            ●
          </span>

          Tap any stage to see the
          orders currently there.
        </div>
      )}
    </section>
  )
          }

function RecentOrders({
  orders = [],
  customers = [],
  onOrder,
  onOrders
}) {
  const getCustomer = id =>
    customers.find(
      customer =>
        customer?.id === id
    )

  return (
    <section
      className="cresoa-dashboard-card"
      style={{
        padding: 16,
        minWidth: 0
      }}
    >
      <div className="cresoa-dashboard-card-header">
        <div>
          <h2 className="cresoa-dashboard-section-title">
            Recent orders
          </h2>

          <p className="cresoa-dashboard-section-subtitle">
            Your latest customer orders.
          </p>
        </div>

        <button
          type="button"
          className="cresoa-dashboard-button"
          onClick={onOrders}
        >
          View all
        </button>
      </div>

      <div
        style={{
          marginTop: 8
        }}
      >
        {orders.length === 0 ? (
          <EmptyState
            icon="bag"
            title="No orders yet"
            description="Your newest orders will appear here."
            actionLabel="Create order"
            onAction={onOrders}
          />
        ) : (
          orders.map(order => {
            const customer =
              getCustomer(
                order?.customer_id
              )

            const name =
              getCustomerName(
                customer
              ) || 'Customer'

            const status =
              order?.current_status ||
              'Order placed'

            const tone =
              getStatusTone(
                status
              )

            return (
              <button
                key={order.id}
                type="button"
                onClick={() =>
                  onOrder(order)
                }
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding:
                    '11px 0',
                  border: 0,
                  borderBottom:
                    '1px solid var(--color-border)',
                  background:
                    'transparent',
                  color: 'inherit',
                  textAlign: 'left',
                  cursor: 'pointer'
                }}
              >
                <div
                  style={{
                    width: 35,
                    height: 35,
                    flex: '0 0 auto',
                    display: 'grid',
                    placeItems: 'center',
                    borderRadius: 10,
                    background:
                      'var(--color-accent-soft)',
                    color:
                      'var(--color-accent)',
                    fontSize: 11,
                    fontWeight: 900
                  }}
                >
                  ₦
                </div>

                <div
                  style={{
                    minWidth: 0,
                    flex: 1
                  }}
                >
                  <div
                    style={{
                      overflow: 'hidden',
                      color:
                        'var(--color-text)',
                      fontSize: 11,
                      fontWeight: 800,
                      textOverflow:
                        'ellipsis',
                      whiteSpace:
                        'nowrap'
                    }}
                  >
                    {name}
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      marginTop: 3,
                      minWidth: 0
                    }}
                  >
                    <span
                      style={{
                        overflow:
                          'hidden',
                        color:
                          'var(--color-text-muted)',
                        fontSize: 9,
                        textOverflow:
                          'ellipsis',
                        whiteSpace:
                          'nowrap'
                      }}
                    >
                      {order?.order_number ||
                        `Order #${String(
                          order.id
                        ).slice(0, 8)}`}
                    </span>

                    <span
                      aria-hidden="true"
                      style={{
                        color:
                          'var(--color-border)'
                      }}
                    >
                      ·
                    </span>

                    <span
                      style={{
                        flex: '0 0 auto',
                        color:
                          tone ===
                          'danger'
                            ? 'var(--color-danger)'
                            : tone ===
                                'warning'
                              ? 'var(--color-warning)'
                              : tone ===
                                  'success'
                                ? 'var(--color-success)'
                                : 'var(--color-accent)',
                        fontSize: 9,
                        fontWeight: 750
                      }}
                    >
                      {status}
                    </span>
                  </div>
                </div>

                <div
                  style={{
                    flex: '0 0 auto',
                    textAlign: 'right'
                  }}
                >
                  <div
                    style={{
                      color:
                        'var(--color-text)',
                      fontSize: 10,
                      fontWeight: 800
                    }}
                  >
                    {formatMoney(
                      safeAmount(
                        order?.total_amount
                      )
                    )}
                  </div>

                  <div
                    style={{
                      marginTop: 3,
                      color:
                        'var(--color-text-muted)',
                      fontSize: 8
                    }}
                  >
                    {formatShortDate(
                      order?.created_at
                    )}
                  </div>
                </div>

                <span
                  aria-hidden="true"
                  style={{
                    flex: '0 0 auto',
                    color:
                      'var(--color-text-muted)',
                    fontSize: 14
                  }}
                >
                  ›
                </span>
              </button>
            )
          })
        )}
      </div>
    </section>
  )
                  }

function RecentCustomers({
  customers = [],
  onCustomer,
  onCustomers
}) {
  return (
    <section
      className="cresoa-dashboard-card"
      style={{
        padding: 16,
        minWidth: 0
      }}
    >
      <div className="cresoa-dashboard-card-header">
        <div>
          <h2 className="cresoa-dashboard-section-title">
            Recent customers
          </h2>

          <p className="cresoa-dashboard-section-subtitle">
            People you've recently worked with.
          </p>
        </div>

        <button
          type="button"
          className="cresoa-dashboard-button"
          onClick={onCustomers}
        >
          View all
        </button>
      </div>

      <div
        style={{
          marginTop: 8
        }}
      >
        {customers.length === 0 ? (
          <EmptyState
            icon="user"
            title="No customers yet"
            description="New customers will appear here."
            actionLabel="View customers"
            onAction={onCustomers}
          />
        ) : (
          customers.map(customer => {
            const name =
              getCustomerName(
                customer
              ) || 'Customer'

            const initials =
              name
                .split(' ')
                .filter(Boolean)
                .slice(0, 2)
                .map(word =>
                  word
                    .charAt(0)
                    .toUpperCase()
                )
                .join('') || 'C'

            return (
              <button
                key={customer.id}
                type="button"
                onClick={() =>
                  onCustomer(
                    customer
                  )
                }
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding:
                    '11px 0',
                  border: 0,
                  borderBottom:
                    '1px solid var(--color-border)',
                  background:
                    'transparent',
                  color: 'inherit',
                  textAlign: 'left',
                  cursor: 'pointer'
                }}
              >
                <div
                  style={{
                    width: 35,
                    height: 35,
                    flex: '0 0 auto',
                    display: 'grid',
                    placeItems: 'center',
                    borderRadius: '50%',
                    background:
                      'var(--color-accent-soft)',
                    color:
                      'var(--color-accent)',
                    fontSize: 10,
                    fontWeight: 900
                  }}
                >
                  {initials}
                </div>

                <div
                  style={{
                    minWidth: 0,
                    flex: 1
                  }}
                >
                  <div
                    style={{
                      overflow: 'hidden',
                      color:
                        'var(--color-text)',
                      fontSize: 11,
                      fontWeight: 800,
                      textOverflow:
                        'ellipsis',
                      whiteSpace:
                        'nowrap'
                    }}
                  >
                    {name}
                  </div>

                  <div
                    style={{
                      marginTop: 3,
                      overflow: 'hidden',
                      color:
                        'var(--color-text-muted)',
                      fontSize: 9,
                      textOverflow:
                        'ellipsis',
                      whiteSpace:
                        'nowrap'
                    }}
                  >
                    {customer?.phone ||
                      customer?.email ||
                      'Customer profile'}
                  </div>
                </div>

                <div
                  style={{
                    flex: '0 0 auto',
                    textAlign: 'right'
                  }}
                >
                  <div
                    style={{
                      color:
                        'var(--color-text)',
                      fontSize: 10,
                      fontWeight: 800
                    }}
                  >
                    {customer?.order_count ||
                      customer?.orders_count ||
                      0}{' '}
                    orders
                  </div>

                  <div
                    style={{
                      marginTop: 3,
                      color:
                        'var(--color-text-muted)',
                      fontSize: 8
                    }}
                  >
                    {formatShortDate(
                      customer?.created_at
                    )}
                  </div>
                </div>

                <span
                  aria-hidden="true"
                  style={{
                    flex: '0 0 auto',
                    color:
                      'var(--color-text-muted)',
                    fontSize: 14
                  }}
                >
                  ›
                </span>
              </button>
            )
          })
        )}
      </div>
    </section>
  )
}

function AsoEbiGroups({
  groups = [],
  onGroup,
  onGroups
}) {
  return (
    <section
      className="cresoa-dashboard-card"
      style={{
        padding: 16,
        minWidth: 0
      }}
    >
      <div className="cresoa-dashboard-card-header">
        <div>
          <h2 className="cresoa-dashboard-section-title">
            Aso-Ebi groups
          </h2>

          <p className="cresoa-dashboard-section-subtitle">
            Coordinate group orders and outfits in one place.
          </p>
        </div>

        <button
          type="button"
          className="cresoa-dashboard-button"
          onClick={onGroups}
        >
          View all
        </button>
      </div>

      <div
        style={{
          marginTop: 10
        }}
      >
        {groups.length === 0 ? (
          <EmptyState
            icon="group"
            title="No Aso-Ebi groups yet"
            description="Create a group order when you're coordinating outfits for an event."
            actionLabel="View groups"
            onAction={onGroups}
          />
        ) : (
          groups.map(group => {
            const name =
              group?.name ||
              group?.title ||
              'Aso-Ebi group'

            const members =
              Number(
                group?.member_count ??
                  group?.members_count ??
                  group?.members?.length ??
                  0
              )

            const status =
              group?.status ||
              'Active'

            const statusValue =
              String(status)
                .toLowerCase()

            const isComplete =
              statusValue.includes(
                'complete'
              ) ||
              statusValue.includes(
                'closed'
              )

            return (
              <button
                key={group.id}
                type="button"
                onClick={() =>
                  onGroup(group)
                }
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding:
                    '11px 0',
                  border: 0,
                  borderBottom:
                    '1px solid var(--color-border)',
                  background:
                    'transparent',
                  color: 'inherit',
                  textAlign: 'left',
                  cursor: 'pointer'
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    flex: '0 0 auto',
                    display: 'grid',
                    placeItems: 'center',
                    borderRadius: 11,
                    background:
                      isComplete
                        ? 'var(--color-success-soft)'
                        : 'var(--color-accent-soft)',
                    color:
                      isComplete
                        ? 'var(--color-success)'
                        : 'var(--color-accent)',
                    fontSize: 13,
                    fontWeight: 900
                  }}
                >
                  ◇
                </div>

                <div
                  style={{
                    minWidth: 0,
                    flex: 1
                  }}
                >
                  <div
                    style={{
                      overflow: 'hidden',
                      color:
                        'var(--color-text)',
                      fontSize: 11,
                      fontWeight: 800,
                      textOverflow:
                        'ellipsis',
                      whiteSpace:
                        'nowrap'
                    }}
                  >
                    {name}
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      marginTop: 3,
                      color:
                        'var(--color-text-muted)',
                      fontSize: 9
                    }}
                  >
                    <span>
                      {members}{' '}
                      member
                      {members === 1
                        ? ''
                        : 's'}
                    </span>

                    <span>
                      ·
                    </span>

                    <span
                      style={{
                        color:
                          isComplete
                            ? 'var(--color-success)'
                            : 'var(--color-accent)',
                        fontWeight: 750
                      }}
                    >
                      {status}
                    </span>
                  </div>
                </div>

                <div
                  style={{
                    flex: '0 0 auto',
                    color:
                      'var(--color-text-muted)',
                    fontSize: 14
                  }}
                >
                  ›
                </div>
              </button>
            )
          })
        )}
      </div>
    </section>
  )
          }

function EmptyState({
  icon = 'info',
  title,
  description,
  actionLabel,
  onAction
}) {
  const icons = {
    bag: '◇',
    user: '○',
    group: '◇',
    chart: '⌁',
    info: 'i'
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 150,
        padding: 18,
        textAlign: 'center'
      }}
    >
      <div
        style={{
          width: 42,
          height: 42,
          display: 'grid',
          placeItems: 'center',
          borderRadius: 13,
          background:
            'var(--color-accent-soft)',
          color:
            'var(--color-accent)',
          fontSize: 17,
          fontWeight: 900
        }}
      >
        {icons[icon] || icons.info}
      </div>

      <div
        style={{
          marginTop: 10,
          color:
            'var(--color-text)',
          fontSize: 11,
          fontWeight: 800
        }}
      >
        {title}
      </div>

      {description && (
        <p
          style={{
            maxWidth: 260,
            margin:
              '5px 0 0',
            color:
              'var(--color-text-muted)',
            fontSize: 9,
            lineHeight: 1.5
          }}
        >
          {description}
        </p>
      )}

      {actionLabel &&
        onAction && (
          <button
            type="button"
            className="cresoa-dashboard-button cresoa-dashboard-button-primary"
            onClick={onAction}
            style={{
              marginTop: 11,
              minHeight: 32,
              fontSize: 9
            }}
          >
            {actionLabel}
          </button>
        )}
    </div>
  )
}

function DashboardSkeleton() {
  const blocks = Array.from(
    { length: 8 },
    (_, index) => index
  )

  return (
    <div
      aria-label="Loading dashboard"
      aria-busy="true"
      style={{
        display: 'grid',
        gap: 14
      }}
    >
      <div
        className="cresoa-dashboard-card"
        style={{
          height: 125,
          padding: 16
        }}
      >
        <SkeletonLine width="24%" />
        <SkeletonLine
          width="55%"
          height={25}
          marginTop={13}
        />
        <SkeletonLine
          width="72%"
          marginTop={9}
        />
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns:
            'repeat(2, minmax(0, 1fr))',
          gap: 9
        }}
      >
        {blocks.slice(0, 4).map(
          index => (
            <div
              key={index}
              className="cresoa-dashboard-card"
              style={{
                height: 112,
                padding: 13
              }}
            >
              <SkeletonLine width="42%" />
              <SkeletonLine
                width="58%"
                height={20}
                marginTop={14}
              />
              <SkeletonLine
                width="70%"
                marginTop={9}
              />
            </div>
          )
        )}
      </div>

      <div
        className="cresoa-dashboard-card"
        style={{
          height: 280,
          padding: 16
        }}
      >
        <SkeletonLine width="35%" />
        <SkeletonLine
          width="55%"
          marginTop={9}
        />

        <div
          style={{
            height: 180,
            marginTop: 20,
            borderRadius: 12,
            background:
              'var(--color-bg-soft)'
          }}
        />
      </div>
    </div>
  )
}

function SkeletonLine({
  width = '100%',
  height = 9,
  marginTop = 0
}) {
  return (
    <div
      style={{
        width,
        height,
        marginTop,
        borderRadius: 99,
        background:
          'var(--color-bg-soft)',
        animation:
          'cresoaPulse 1.5s ease-in-out infinite'
      }}
    />
  )
}

function DashboardError({
  message,
  onRetry
}) {
  return (
    <div
      className="cresoa-dashboard-card"
      style={{
        padding: 28,
        textAlign: 'center'
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          margin: '0 auto',
          display: 'grid',
          placeItems: 'center',
          borderRadius: 14,
          background:
            'var(--color-danger-soft)',
          color:
            'var(--color-danger)',
          fontSize: 18,
          fontWeight: 900
        }}
      >
        !
      </div>

      <h2
        style={{
          margin:
            '12px 0 0',
          color:
            'var(--color-text)',
          fontSize: 14,
          fontWeight: 850
        }}
      >
        We couldn't load your dashboard
      </h2>

      <p
        style={{
          maxWidth: 360,
          margin:
            '6px auto 0',
          color:
            'var(--color-text-muted)',
          fontSize: 10,
          lineHeight: 1.5
        }}
      >
        {message ||
          'Something went wrong while loading your business data.'}
      </p>

      <button
        type="button"
        className="cresoa-dashboard-button cresoa-dashboard-button-primary"
        onClick={onRetry}
        style={{
          marginTop: 14
        }}
      >
        Try again
      </button>
    </div>
  )
}

const cresoaAnimationStyles = `
  @keyframes cresoaPulse {
    0%, 100% {
      opacity: .45;
    }

    50% {
      opacity: .9;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      animation-duration: .01ms !important;
      animation-iteration-count: 1 !important;
      scroll-behavior: auto !important;
    }
  }
`

const dashboardThemeStyles = `
:root{
  --color-bg:#f7f8fa;
  --color-card:#fff;
  --color-bg-soft:#f0f2f5;
  --color-text:#17202a;
  --color-text-muted:#68727e;
  --color-border:#e4e7eb;
  --color-accent:#173f67;
  --color-accent-soft:#e8f0f8;
  --color-success:#198754;
  --color-success-soft:#e7f6ee;
  --color-warning:#c47a00;
  --color-warning-soft:#fff4dc;
  --color-danger:#c0392b;
  --color-danger-soft:#fdecea;
}

[data-theme="dark"]{
  --color-bg:#0e141b;
  --color-card:#151d26;
  --color-bg-soft:#1b2530;
  --color-text:#f1f4f7;
  --color-text-muted:#9ba7b4;
  --color-border:#293542;
  --color-accent:#7fb2e3;
  --color-accent-soft:#1b3045;
  --color-success:#58c58a;
  --color-success-soft:#153326;
  --color-warning:#e4aa4f;
  --color-warning-soft:#392c17;
  --color-danger:#f0786c;
  --color-danger-soft:#3b201e;
}

*{box-sizing:border-box}

.cresoa-dashboard,
.cresoa-dashboard button{
  font-family:inherit;
}

.cresoa-dashboard button{
  -webkit-tap-highlight-color:transparent;
}

.cresoa-dashboard button:focus-visible{
  outline:2px solid var(--color-accent);
  outline-offset:2px;
}

@media(prefers-reduced-motion:reduce){
  .cresoa-dashboard *{
    animation-duration:.01ms!important;
    transition-duration:.01ms!important;
  }
}
`;

function formatMoney(value){
  return new Intl.NumberFormat(
    'en-NG',
    {
      style:'currency',
      currency:'NGN',
      maximumFractionDigits:0
    }
  ).format(Number(value)||0);
}

function safeAmount(value){
  const n=Number(value);
  return Number.isFinite(n)?n:0;
}

function formatShortDate(value){
  if(!value)return '—';
  const date=new Date(value);
  if(Number.isNaN(date.getTime()))return '—';

  return date.toLocaleDateString(
    'en-NG',
    {day:'numeric',month:'short'}
  );
          }

function DashboardGrid({
  children
}) {
  return (
    <main
      className="cresoa-dashboard-grid"
      style={{
        display: 'grid',
        gridTemplateColumns:
          'minmax(0, 1fr)',
        gap: 14,
        width: '100%',
        minWidth: 0
      }}
    >
      {children}
    </main>
  )
}

function DashboardTwoColumn({
  children
}) {
  return (
    <div
      className="cresoa-dashboard-two-column"
      style={{
        display: 'grid',
        gridTemplateColumns:
          'minmax(0, 1fr)',
        gap: 14,
        width: '100%',
        minWidth: 0
      }}
    >
      {children}
    </div>
  )
}

function DashboardContent({
  business,
  businessId,
  data,
  loading,
  error,
  onRefresh,
  onNewOrder,
  onOrder,
  onOrders,
  onCustomer,
  onCustomers,
  onGroup,
  onGroups,
  onStage,
  onAttention,
  onPayments,
  onFittings
}) {
  if (loading) {
    return <DashboardSkeleton />
  }

  if (error) {
    return (
      <DashboardError
        message={error}
        onRetry={onRefresh}
      />
    )
  }

  const {
    metrics = {},
    orders = [],
    customers = [],
    groups = [],
    stageCounts = {},
    stages = [
      'Cutting',
      'Sewing',
      'Fitting',
      'Finishing',
      'Ready',
      'Delivered'
    ]
  } = data || {}

  return (
    <div
      className="cresoa-dashboard"
      style={{
        minHeight: '100%',
        width: '100%',
        background:
          'var(--color-bg)',
        color:
          'var(--color-text)'
      }}
    >
      <style>
        {dashboardThemeStyles}
      </style>

      <div
        style={{
          width: '100%',
          maxWidth: 1400,
          margin: '0 auto',
          padding: '18px 14px 40px'
        }}
      >
        <DashboardHeader
          business={business}
          businessId={businessId}
          greeting={getDashboardGreeting()}
          onNewOrder={onNewOrder}
          onRefresh={onRefresh}
          loading={loading}
        />

        <div style={{ marginTop: 22 }}>
          <DashboardGrid>

            <TodayOverview
              metrics={metrics}
              onAttention={onAttention}
              onOrders={onOrders}
              onPayments={onPayments}
              onFittings={onFittings}
            />

            <AttentionPanel
              orders={orders}
              customers={customers}
              onOrder={onOrder}
              onOrders={onOrders}
            />

            <ProductionPipeline
              orders={orders}
              stages={stages}
              counts={stageCounts}
              onStage={onStage}
            />

            <AnalyticsCard
              data={data}
            />

            <DashboardTwoColumn>

              <RecentOrders
                orders={orders}
                customers={customers}
                onOrder={onOrder}
                onOrders={onOrders}
              />

              <RecentCustomers
                customers={customers}
                onCustomer={onCustomer}
                onCustomers={onCustomers}
              />

            </DashboardTwoColumn>

            <AsoEbiGroups
              groups={groups}
              onGroup={onGroup}
              onGroups={onGroups}
            />

          </DashboardGrid>
        </div>
      </div>
    </div>
  )
}

function getDashboardGreeting() {
  const hour = new Date().getHours()

  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'

  return 'Good evening'
    }
     }
export default DashboardContent;
     }
