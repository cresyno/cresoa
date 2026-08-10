'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../../lib/supabaseClient'
import { getCurrentBusinessId } from '../../lib/getBusinessId'
import { isFeatureAvailable } from '../../lib/planLimits'
import { Icon } from '../../components/Icon'
import FeedbackBanner from '../../components/FeedbackBanner'
import Banner from '../../components/Banner'

const PERIOD_OPTIONS = [
  { value: '7', label: '7 days' },
  { value: '30', label: '30 days' },
  { value: '90', label: '90 days' }
]

const ORDER_STATUSES = [
  'Order placed',
  'Cutting',
  'Sewing',
  'Ready',
  'Delivered'
]

const currencyFormatter = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  maximumFractionDigits: 0
})

const numberFormatter = new Intl.NumberFormat('en-NG')

const formatCurrency = (value) => {
  return currencyFormatter.format(Number(value) || 0)
}

const formatNumber = (value) => {
  return numberFormatter.format(Number(value) || 0)
}

const startOfDay = (date) => {
  const result = new Date(date)
  result.setHours(0, 0, 0, 0)
  return result
}

const endOfDay = (date) => {
  const result = new Date(date)
  result.setHours(23, 59, 59, 999)
  return result
}

const addDays = (date, amount) => {
  const result = new Date(date)
  result.setDate(result.getDate() + amount)
  return result
}

const dateKey = (date) => {
  const d = new Date(date)
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0')
  ].join('-')
}

const formatDay = (date, options = {}) => {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    ...options
  }).format(new Date(date))
}

const formatLongDate = (date) => {
  if (!date) return '—'

  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(new Date(date))
}

const getGreeting = () => {
  const hour = new Date().getHours()

  if (hour < 12) {
    return {
      title: 'Good morning',
      icon: 'sun'
    }
  }

  if (hour < 17) {
    return {
      title: 'Good afternoon',
      icon: 'sun'
    }
  }

  return {
    title: 'Good evening',
    icon: 'moon'
  }
}

const getStatusLabel = (status) => {
  const labels = {
    'Order placed': 'Placed',
    Cutting: 'Cutting',
    Sewing: 'Sewing',
    Ready: 'Ready',
    Delivered: 'Delivered'
  }

  return labels[status] || status || 'Placed'
}

const getStatusClass = (status) => {
  return String(status || 'Order placed')
    .toLowerCase()
    .replace(/\s+/g, '-')
}

const safeAmount = (value) => {
  const amount = Number(value)
  return Number.isFinite(amount) ? amount : 0
}

const calculateBalance = (order) => {
  return Math.max(
    safeAmount(order?.price) -
      safeAmount(order?.amount_paid),
    0
  )
}

const isOrderDelivered = (order) => {
  return order?.current_status === 'Delivered'
}

const isOrderOverdue = (order, now = new Date()) => {
  if (!order?.due_date || isOrderDelivered(order)) {
    return false
  }

  return endOfDay(order.due_date) < now
}

const getPercentageChange = (current, previous) => {
  const currentValue = safeAmount(current)
  const previousValue = safeAmount(previous)

  if (previousValue === 0) {
    if (currentValue === 0) return 0
    return null
  }

  return Math.round(
    ((currentValue - previousValue) / previousValue) * 100
  )
}

const getChangeLabel = (change) => {
  if (change === null) return 'New activity'

  if (change === 0) return 'No change'

  return `${change > 0 ? '+' : ''}${change}%`
}

const getBusinessHealthLabel = (score) => {
  if (score >= 85) return 'Excellent'
  if (score >= 70) return 'Healthy'
  if (score >= 50) return 'Watch closely'
  return 'Needs attention'
}

export default function FashionDashboardPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [business, setBusiness] = useState(null)
  const [customers, setCustomers] = useState([])
  const [orders, setOrders] = useState([])
  const [groups, setGroups] = useState([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deactivated, setDeactivated] = useState(false)

  const [businessId, setBusinessId] = useState(null)
  const [period, setPeriod] = useState('30')
  const [selectedDay, setSelectedDay] = useState(null)

  const [showQuickOrder, setShowQuickOrder] = useState(false)
  const [showSettleModal, setShowSettleModal] = useState(false)

  const [quickOrderCustomer, setQuickOrderCustomer] = useState('')
  const [quickOrderItem, setQuickOrderItem] = useState('')
  const [quickOrderPrice, setQuickOrderPrice] = useState('')
  const [quickOrderDeposit, setQuickOrderDeposit] = useState('')
  const [quickOrderDue, setQuickOrderDue] = useState('')
  const [quickOrderLoading, setQuickOrderLoading] = useState(false)
  const [quickOrderMessage, setQuickOrderMessage] = useState('')

  const [settleOrder, setSettleOrder] = useState(null)
  const [settleAmount, setSettleAmount] = useState('')
  const [settleNote, setSettleNote] = useState('')
  const [settleLoading, setSettleLoading] = useState(false)

  const greeting = useMemo(() => getGreeting(), [])

  const currentPeriodDays = Number(period) || 30

  const canCreateGroup = useMemo(() => {
    if (!business) return false

    return isFeatureAvailable(
      business.plan || 'free',
      'groups'
    )
  }, [business])
    const analytics = useMemo(() => {
    const today = startOfDay(new Date())
    const currentEnd = endOfDay(today)
    const currentStart = startOfDay(
      addDays(today, -(currentPeriodDays - 1))
    )

    const previousEnd = addDays(currentStart, -1)
    const previousStart = startOfDay(
      addDays(previousEnd, -(currentPeriodDays - 1))
    )

    const currentOrders = orders.filter((order) => {
      const created = new Date(order.created_at)
      return created >= currentStart && created <= currentEnd
    })

    const previousOrders = orders.filter((order) => {
      const created = new Date(order.created_at)
      return created >= previousStart && created <= previousEnd
    })

    const currentRevenue = currentOrders.reduce(
      (sum, order) => sum + safeAmount(order.amount_paid),
      0
    )

    const previousRevenue = previousOrders.reduce(
      (sum, order) => sum + safeAmount(order.amount_paid),
      0
    )

    const currentOrderValue = currentOrders.reduce(
      (sum, order) => sum + safeAmount(order.price),
      0
    )

    const previousOrderValue = previousOrders.reduce(
      (sum, order) => sum + safeAmount(order.price),
      0
    )

    const outstanding = orders.reduce(
      (sum, order) => sum + calculateBalance(order),
      0
    )

    const overdueOrders = orders.filter((order) =>
      isOrderOverdue(order)
    )

    const deliveredOrders = orders.filter((order) =>
      isOrderDelivered(order)
    )

    const activeOrders = orders.filter(
      (order) => !isOrderDelivered(order)
    )

    const periodCustomers = customers.filter((customer) => {
      const created = new Date(customer.created_at)
      return created >= currentStart && created <= currentEnd
    })

    const previousCustomers = customers.filter((customer) => {
      const created = new Date(customer.created_at)
      return created >= previousStart && created <= previousEnd
    })

    const daily = []

    for (let index = 0; index < currentPeriodDays; index += 1) {
      const day = startOfDay(
        addDays(currentStart, index)
      )

      const key = dateKey(day)

      const dayOrders = currentOrders.filter(
        (order) => dateKey(order.created_at) === key
      )

      const revenue = dayOrders.reduce(
        (sum, order) =>
          sum + safeAmount(order.amount_paid),
        0
      )

      const orderValue = dayOrders.reduce(
        (sum, order) => sum + safeAmount(order.price),
        0
      )

      const paidOrders = dayOrders.filter(
        (order) =>
          calculateBalance(order) === 0
      ).length

      const delivered = dayOrders.filter(
        (order) => isOrderDelivered(order)
      ).length

      daily.push({
        date: day,
        key,
        label: formatDay(day, {
          weekday:
            currentPeriodDays <= 7 ? 'short' : undefined
        }),
        revenue,
        orderValue,
        orders: dayOrders.length,
        paidOrders,
        delivered
      })
    }

    const totalDeliveredInPeriod =
      currentOrders.filter(isOrderDelivered).length

    const deliveryRate =
      currentOrders.length > 0
        ? Math.round(
            (totalDeliveredInPeriod /
              currentOrders.length) *
              100
          )
        : 0

    const overdueRate =
      orders.length > 0
        ? Math.round(
            (overdueOrders.length / orders.length) * 100
          )
        : 0

    const collectionRate =
      currentOrderValue > 0
        ? Math.round(
            (currentRevenue / currentOrderValue) * 100
          )
        : 0

    const customerGrowth = getPercentageChange(
      periodCustomers.length,
      previousCustomers.length
    )

    const revenueChange = getPercentageChange(
      currentRevenue,
      previousRevenue
    )

    const ordersChange = getPercentageChange(
      currentOrders.length,
      previousOrders.length
    )

    const orderValueChange = getPercentageChange(
      currentOrderValue,
      previousOrderValue
    )

    /*
     * Business health is deliberately transparent.
     *
     * It uses live operational signals rather than
     * pretending that one arbitrary number represents
     * the whole business.
     */
    const revenueScore =
      currentRevenue > 0
        ? Math.min(
            100,
            55 +
              Math.max(
                -20,
                Math.min(35, revenueChange || 0)
              )
          )
        : 35

    const collectionScore = collectionRate

    const deliveryScore = deliveryRate

    const overdueScore = Math.max(
      0,
      100 - overdueRate * 2
    )

    const activityScore =
      currentOrders.length > 0
        ? Math.min(
            100,
            60 +
              Math.min(
                40,
                currentOrders.length
              )
          )
        : 35

    const healthScore = Math.round(
      revenueScore * 0.25 +
        collectionScore * 0.25 +
        deliveryScore * 0.2 +
        overdueScore * 0.2 +
        activityScore * 0.1
    )

    return {
      currentStart,
      currentEnd,
      previousStart,
      previousEnd,

      currentOrders,
      previousOrders,

      currentRevenue,
      previousRevenue,

      currentOrderValue,
      previousOrderValue,

      outstanding,
      overdueOrders,
      activeOrders,
      deliveredOrders,

      periodCustomers,
      previousCustomers,

      daily,

      totalDeliveredInPeriod,
      deliveryRate,
      overdueRate,
      collectionRate,

      revenueChange,
      ordersChange,
      orderValueChange,
      customerGrowth,

      healthScore,
      healthLabel:
        getBusinessHealthLabel(healthScore)
    }
  }, [
    orders,
    customers,
    currentPeriodDays
  ])

  const stats = useMemo(() => {
    const totalOrders = orders.length

    const totalRevenue = orders.reduce(
      (sum, order) =>
        sum + safeAmount(order.amount_paid),
      0
    )

    const totalOrderValue = orders.reduce(
      (sum, order) =>
        sum + safeAmount(order.price),
      0
    )

    const delivered = orders.filter(
      (order) => order.current_status === 'Delivered'
    ).length

    const outstanding = orders.reduce(
      (sum, order) =>
        sum + calculateBalance(order),
      0
    )

    const overdue = orders.filter((order) =>
      isOrderOverdue(order)
    ).length

    return {
      totalOrders,
      totalRevenue,
      totalOrderValue,
      delivered,
      outstanding,
      overdue,
      customers: customers.length,
      groups: groups.length
    }
  }, [orders, customers, groups])

  const attentionItems = useMemo(() => {
    const items = []

    if (analytics.overdueOrders.length > 0) {
      items.push({
        type: 'danger',
        title: `${analytics.overdueOrders.length} overdue order${
          analytics.overdueOrders.length === 1
            ? ''
            : 's'
        }`,
        description:
          'Orders have passed their due date and still need attention.',
        href: `/dashboard/orders?business_id=${
          businessId || ''
        }&filter=overdue`,
        action: 'Review overdue'
      })
    }

    if (analytics.outstanding > 0) {
      items.push({
        type: 'warning',
        title: `${formatCurrency(
          analytics.outstanding
        )} outstanding`,
        description:
          'There are unpaid balances across your current orders.',
        href: `/dashboard/orders?business_id=${
          businessId || ''
        }&filter=unpaid`,
        action: 'Review balances'
      })
    }

    const readyOrders = orders.filter(
      (order) => order.current_status === 'Ready'
    )

    if (readyOrders.length > 0) {
      items.push({
        type: 'success',
        title: `${readyOrders.length} order${
          readyOrders.length === 1 ? '' : 's'
        } ready`,
        description:
          'These orders can move to collection or delivery.',
        href: `/dashboard/orders?business_id=${
          businessId || ''
        }&status=Ready`,
        action: 'View ready orders'
      })
    }

    return items.slice(0, 4)
  }, [
    analytics,
    orders,
    businessId
  ])

  const selectedDayData = useMemo(() => {
    if (!selectedDay) return null

    return (
      analytics.daily.find(
        (item) => item.key === selectedDay
      ) || null
    )
  }, [analytics.daily, selectedDay])

  const maxDailyRevenue = useMemo(() => {
    return Math.max(
      ...analytics.daily.map(
        (item) => item.revenue
      ),
      1
    )
  }, [analytics.daily])

  const maxDailyOrders = useMemo(() => {
    return Math.max(
      ...analytics.daily.map(
        (item) => item.orders
      ),
      1
    )
  }, [analytics.daily])

  const recentOrders = useMemo(() => {
    return [...orders]
      .sort(
        (a, b) =>
          new Date(b.created_at) -
          new Date(a.created_at)
      )
      .slice(0, 8)
  }, [orders])

  const upcomingOrders = useMemo(() => {
    return [...orders]
      .filter(
        (order) =>
          order.due_date &&
          !isOrderDelivered(order)
      )
      .sort(
        (a, b) =>
          new Date(a.due_date) -
          new Date(b.due_date)
      )
      .slice(0, 5)
  }, [orders])

  const topCustomers = useMemo(() => {
    const customerMap = new Map()

    orders.forEach((order) => {
      const customerId = order.customer_id

      if (!customerId) return

      const existing =
        customerMap.get(customerId) || {
          id: customerId,
          name: 'Customer',
          orders: 0,
          value: 0,
          paid: 0
        }

      existing.orders += 1
      existing.value += safeAmount(order.price)
      existing.paid += safeAmount(
        order.amount_paid
      )

      customerMap.set(
        customerId,
        existing
      )
    })

    customers.forEach((customer) => {
      const existing =
        customerMap.get(customer.id)

      if (existing) {
        existing.name =
          customer.name ||
          [
            customer.first_name,
            customer.last_name
          ]
            .filter(Boolean)
            .join(' ') ||
          'Customer'
      }
    })

    return [...customerMap.values()]
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)
  }, [orders, customers])

  const statusBreakdown = useMemo(() => {
    return ORDER_STATUSES.map((status) => ({
      status,
      label: getStatusLabel(status),
      count: orders.filter(
        (order) =>
          order.current_status === status
      ).length
    }))
  }, [orders])

  const loadDashboard = async () => {
    setLoading(true)
    setError('')

    try {
      const {
        data: { user },
        error: userError
      } = await supabase.auth.getUser()

      if (userError || !user) {
        router.push('/login')
        return
      }

      const resolvedBusinessId =
        getCurrentBusinessId() ||
        searchParams.get('business_id')

      if (!resolvedBusinessId) {
        router.push('/dashboard')
        return
      }

      setBusinessId(resolvedBusinessId)

      const {
        data: businessData,
        error: businessError
      } = await supabase
        .from('businesses')
        .select(
          'id, name, sector, plan, owner_id, is_active, created_at'
        )
        .eq('id', resolvedBusinessId)
        .single()

      if (businessError || !businessData) {
        throw new Error(
          'Unable to load business information.'
        )
      }

      if (
        businessData.owner_id !== user.id &&
        !businessData.is_active
      ) {
        setDeactivated(true)
        return
      }

      setBusiness(businessData)

      const [
        customersResult,
        ordersResult,
        groupsResult
      ] = await Promise.all([
        supabase
          .from('customers')
          .select(
            'id, business_id, name, first_name, last_name, phone, email, created_at, updated_at'
          )
          .eq(
            'business_id',
            resolvedBusinessId
          )
          .order('created_at', {
            ascending: false
          }),

        supabase
          .from('orders')
          .select(`
            id,
            business_id,
            customer_id,
            title,
            description,
            price,
            amount_paid,
            current_status,
            due_date,
            group_order_id,
            created_at,
            delivery_date,
            category,
            quantity
          `)
          .eq(
            'business_id',
            resolvedBusinessId
          )
          .order('created_at', {
            ascending: false
          }),

        supabase
          .from('group_orders')
          .select(`
            id,
            business_id,
            group_name,
            coordinator_customer_id,
            due_date,
            status,
            created_at,
            updated_at
          `)
          .eq(
            'business_id',
            resolvedBusinessId
          )
          .order('created_at', {
            ascending: false
          })
      ])

      if (customersResult.error) {
        throw customersResult.error
      }

      if (ordersResult.error) {
        throw ordersResult.error
      }

      if (groupsResult.error) {
        throw groupsResult.error
      }

      setCustomers(
        customersResult.data || []
      )

      setOrders(
        ordersResult.data || []
      )

      setGroups(
        groupsResult.data || []
      )
    } catch (loadError) {
      console.error(
        'Dashboard loading error:',
        loadError
      )

      setError(
        loadError?.message ||
          'Unable to load your dashboard.'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDashboard()
  }, [searchParams])

  useEffect(() => {
    if (
      analytics.daily.length > 0 &&
      !selectedDay
    ) {
      setSelectedDay(
        analytics.daily[
          analytics.daily.length - 1
        ].key
      )
    }
  }, [
    analytics.daily,
    selectedDay
  ])

  const handlePeriodChange = (value) => {
    setPeriod(value)
    setSelectedDay(null)
  }

  const handleCreateQuickOrder = async (
    event
  ) => {
    event.preventDefault()

    if (!businessId) {
      setQuickOrderMessage(
        'Business information is unavailable.'
      )
      return
    }

    if (
      !quickOrderCustomer ||
      !quickOrderItem ||
      !quickOrderPrice
    ) {
      setQuickOrderMessage(
        'Customer, item and price are required.'
      )
      return
    }

    setQuickOrderLoading(true)
    setQuickOrderMessage('')

    try {
      const price = safeAmount(
        quickOrderPrice
      )

      const deposit = Math.min(
        Math.max(
          safeAmount(quickOrderDeposit),
          0
        ),
        price
      )

      const {
        error: insertError
      } = await supabase
        .from('orders')
        .insert({
          business_id: businessId,
          customer_id:
            quickOrderCustomer,
          title: quickOrderItem,
          price,
          amount_paid: deposit,
          due_date:
            quickOrderDue || null,
          current_status:
            'Order placed'
        })

      if (insertError) {
        throw insertError
      }

      setShowQuickOrder(false)

      setQuickOrderCustomer('')
      setQuickOrderItem('')
      setQuickOrderPrice('')
      setQuickOrderDeposit('')
      setQuickOrderDue('')

      await loadDashboard()
    } catch (createError) {
      console.error(
        'Quick order error:',
        createError
      )

      setQuickOrderMessage(
        createError?.message ||
          'Unable to create the order.'
      )
    } finally {
      setQuickOrderLoading(false)
    }
  }

  const openSettleModal = (order) => {
    setSettleOrder(order)
    setSettleAmount(
      String(
        calculateBalance(order)
      )
    )
    setSettleNote('')
    setShowSettleModal(true)
  }

  const closeSettleModal = () => {
    if (settleLoading) return

    setShowSettleModal(false)
    setSettleOrder(null)
    setSettleAmount('')
    setSettleNote('')
  }

  const handleSettleOrder = async (
    event
  ) => {
    event.preventDefault()

    if (!settleOrder) return

    const balance =
      calculateBalance(settleOrder)

    const payment = Math.min(
      Math.max(
        safeAmount(settleAmount),
        0
      ),
      balance
    )

    if (payment <= 0) {
      return
    }

    setSettleLoading(true)

    try {
      const newAmountPaid =
        safeAmount(
          settleOrder.amount_paid
        ) + payment

      const {
        error: updateError
      } = await supabase
        .from('orders')
        .update({
          amount_paid: newAmountPaid
        })
        .eq(
          'id',
          settleOrder.id
        )
        .eq(
          'business_id',
          businessId
        )

      if (updateError) {
        throw updateError
      }

      closeSettleModal()

      await loadDashboard()
    } catch (settleError) {
      console.error(
        'Settlement error:',
        settleError
      )

      setError(
        settleError?.message ||
          'Unable to record payment.'
      )
    } finally {
      setSettleLoading(false)
    }
  }

  const renderCustomerName = (
    customerId
  ) => {
    const customer =
      customers.find(
        (item) =>
          item.id === customerId
      )

    if (!customer) {
      return 'Unknown customer'
    }

    return (
      customer.name ||
      [
        customer.first_name,
        customer.last_name
      ]
        .filter(Boolean)
        .join(' ') ||
      customer.email ||
      'Customer'
    )
  }

  const renderOrderTitle = (
    order
  ) => {
    return (
      order?.title ||
      order?.description ||
      'Untitled order'
    )
  }

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="dashboard-loading-shell">
          <div className="loading-header">
            <div className="loading-heading" />
            <div className="loading-action" />
          </div>

          <div className="loading-metrics">
            {[
              1,
              2,
              3,
              4
            ].map((item) => (
              <div
                className="loading-card"
                key={item}
              />
            ))}
          </div>

          <div className="loading-main">
            <div className="loading-panel large" />
            <div className="loading-panel" />
          </div>

          <div className="loading-table" />
        </div>

        <style jsx>{`
          .dashboard-loading {
            min-height: 100vh;
            padding: 28px;
            background: var(--color-bg);
          }

          .dashboard-loading-shell {
            max-width: 1280px;
            margin: 0 auto;
          }

          .loading-header {
            display: flex;
            justify-content: space-between;
            gap: 20px;
            margin-bottom: 22px;
          }

          .loading-heading {
            width: 330px;
            height: 54px;
            border-radius: 12px;
            background: var(--color-border);
            opacity: .55;
          }

          .loading-action {
            width: 130px;
            height: 40px;
            border-radius: 9px;
            background: var(--color-border);
            opacity: .55;
          }

          .loading-metrics {
            display: grid;
            grid-template-columns:
              repeat(4, minmax(0, 1fr));
            gap: 12px;
            margin-bottom: 18px;
          }

          .loading-card {
            height: 125px;
            border-radius: 14px;
            background: var(--color-card);
            border: 1px solid var(--color-border);
            animation: dashboardPulse 1.4s ease-in-out infinite;
          }

          .loading-main {
            display: grid;
            grid-template-columns:
              minmax(0, 2fr)
              minmax(280px, 1fr);
            gap: 14px;
            margin-bottom: 14px;
          }

          .loading-panel {
            height: 330px;
            border-radius: 14px;
            background: var(--color-card);
            border: 1px solid var(--color-border);
            animation: dashboardPulse 1.4s ease-in-out infinite;
          }

          .loading-panel.large {
            min-height: 360px;
          }

          .loading-table {
            height: 300px;
            border-radius: 14px;
            background: var(--color-card);
            border: 1px solid var(--color-border);
            animation: dashboardPulse 1.4s ease-in-out infinite;
          }

          @keyframes dashboardPulse {
            0%,
            100% {
              opacity: .45;
            }

            50% {
              opacity: .8;
            }
          }

          @media (max-width: 900px) {
            .loading-metrics {
              grid-template-columns:
                repeat(2, minmax(0, 1fr));
            }

            .loading-main {
              grid-template-columns: 1fr;
            }
          }

          @media (max-width: 560px) {
            .dashboard-loading {
              padding: 16px;
            }

            .loading-metrics {
              grid-template-columns: 1fr;
            }
          }
        `}</style>
      </div>
    )
      }

  if (deactivated) {
    return (
      <div className="dashboard-state-page">
        <div className="dashboard-state-card">
          <div className="state-icon warning">
            <Icon
              name="alert-circle"
              size={24}
              stroke="currentColor"
            />
          </div>

          <h1>Business unavailable</h1>

          <p>
            This business is currently inactive.
            Contact the account owner if you believe
            this is an error.
          </p>

          <Link
            href="/dashboard"
            className="state-action"
          >
            Return to dashboard
          </Link>
        </div>

        <style jsx>{`
          .dashboard-state-page {
            min-height: 70vh;
            display: grid;
            place-items: center;
            padding: 32px 20px;
            background: var(--color-bg);
          }

          .dashboard-state-card {
            width: min(100%, 440px);
            padding: 34px;
            text-align: center;
            border: 1px solid var(--color-border);
            border-radius: 18px;
            background: var(--color-card);
            box-shadow: var(--shadow-sm);
          }

          .state-icon {
            width: 52px;
            height: 52px;
            margin: 0 auto 16px;
            display: grid;
            place-items: center;
            border-radius: 50%;
            background: color-mix(
              in srgb,
              var(--color-warning) 12%,
              transparent
            );
            color: var(--color-warning);
          }

          .dashboard-state-card h1 {
            margin: 0 0 8px;
            color: var(--color-text);
            font-size: 20px;
          }

          .dashboard-state-card p {
            margin: 0 0 22px;
            color: var(--color-text-muted);
            font-size: 13px;
            line-height: 1.6;
          }

          .state-action {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-height: 38px;
            padding: 0 16px;
            border-radius: 9px;
            background: var(--color-accent);
            color: #fff;
            text-decoration: none;
            font-size: 12px;
            font-weight: 700;
          }
        `}</style>
      </div>
    )
  }

  if (error) {
    return (
      <div className="dashboard-state-page">
        <div className="dashboard-state-card">
          <div className="state-icon error">
            <Icon
              name="alert-circle"
              size={24}
              stroke="currentColor"
            />
          </div>

          <h1>We couldn't load your dashboard</h1>

          <p>{error}</p>

          <button
            type="button"
            className="state-action"
            onClick={loadDashboard}
          >
            Try again
          </button>
        </div>

        <style jsx>{`
          .dashboard-state-page {
            min-height: 70vh;
            display: grid;
            place-items: center;
            padding: 32px 20px;
            background: var(--color-bg);
          }

          .dashboard-state-card {
            width: min(100%, 440px);
            padding: 34px;
            text-align: center;
            border: 1px solid var(--color-border);
            border-radius: 18px;
            background: var(--color-card);
            box-shadow: var(--shadow-sm);
          }

          .state-icon {
            width: 52px;
            height: 52px;
            margin: 0 auto 16px;
            display: grid;
            place-items: center;
            border-radius: 50%;
          }

          .state-icon.error {
            background: color-mix(
              in srgb,
              var(--color-danger) 12%,
              transparent
            );
            color: var(--color-danger);
          }

          .dashboard-state-card h1 {
            margin: 0 0 8px;
            color: var(--color-text);
            font-size: 20px;
          }

          .dashboard-state-card p {
            margin: 0 0 22px;
            color: var(--color-text-muted);
            font-size: 13px;
            line-height: 1.6;
          }

          .state-action {
            min-height: 38px;
            padding: 0 18px;
            border: 0;
            border-radius: 9px;
            background: var(--color-accent);
            color: #fff;
            cursor: pointer;
            font: inherit;
            font-size: 12px;
            font-weight: 700;
          }
        `}</style>
      </div>
    )
  }

  const today = new Date()

  const formatCompactMoney = (value) => {
    const amount = safeAmount(value)

    if (amount >= 1000000) {
      return `₦${(amount / 1000000).toFixed(1)}m`
    }

    if (amount >= 1000) {
      return `₦${(amount / 1000).toFixed(1)}k`
    }

    return `₦${amount.toLocaleString()}`
  }

  const formatDateLabel = (value) => {
    if (!value) return '—'

    return new Date(value).toLocaleDateString(
      'en-GB',
      {
        day: 'numeric',
        month: 'short'
      }
    )
  }

  const formatLongDate = (value) => {
    if (!value) return '—'

    return new Date(value).toLocaleDateString(
      'en-GB',
      {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      }
    )
  }

  const getOrderStatusTone = (status) => {
    const value = String(
      status || ''
    ).toLowerCase()

    if (
      value.includes('deliver') ||
      value.includes('complete')
    ) {
      return 'success'
    }

    if (
      value.includes('cancel') ||
      value.includes('reject')
    ) {
      return 'danger'
    }

    if (
      value.includes('ready') ||
      value.includes('progress')
    ) {
      return 'accent'
    }

    return 'neutral'
  }

  const getCustomerDisplayName = (
    customer
  ) => {
    if (!customer) {
      return 'Unknown customer'
    }

    return (
      customer.name ||
      [
        customer.first_name,
        customer.last_name
      ]
        .filter(Boolean)
        .join(' ') ||
      customer.email ||
      'Customer'
    )
  }

  const customerMap = new Map(
    customers.map((customer) => [
      customer.id,
      customer
    ])
  )

  const recentOrders = [...orders]
    .sort(
      (a, b) =>
        new Date(b.created_at || 0) -
        new Date(a.created_at || 0)
    )
    .slice(0, 8)

  const outstandingOrders = orders
    .filter(
      (order) =>
        calculateBalance(order) > 0
    )
    .sort(
      (a, b) =>
        calculateBalance(b) -
        calculateBalance(a)
    )
    .slice(0, 5)

  const upcomingOrders = orders
    .filter((order) => {
      if (!order.due_date) {
        return false
      }

      const dueDate = new Date(
        `${order.due_date}T23:59:59`
      )

      return dueDate >= today
    })
    .sort(
      (a, b) =>
        new Date(
          `${a.due_date}T23:59:59`
        ) -
        new Date(
          `${b.due_date}T23:59:59`
        )
    )
    .slice(0, 5)

  const activeOrders = orders.filter(
    (order) => {
      const status = String(
        order.current_status || ''
      ).toLowerCase()

      return (
        !status.includes('deliver') &&
        !status.includes('cancel') &&
        !status.includes('complete')
      )
    }
  )

  const deliveredOrders = orders.filter(
    (order) =>
      String(
        order.current_status || ''
      )
        .toLowerCase()
        .includes('deliver')
  )

  const totalRevenue = orders.reduce(
    (sum, order) =>
      sum + safeAmount(order.amount_paid),
    0
  )

  const totalOrderValue = orders.reduce(
    (sum, order) =>
      sum + safeAmount(order.price),
    0
  )

  const totalOutstanding =
    orders.reduce(
      (sum, order) =>
        sum + calculateBalance(order),
      0
    )

  const collectionRate =
    totalOrderValue > 0
      ? Math.round(
          (totalRevenue /
            totalOrderValue) *
            100
        )
      : 0

  const deliveryRate =
    orders.length > 0
      ? Math.round(
          (deliveredOrders.length /
            orders.length) *
            100
        )
      : 0

  const overdueOrders = orders.filter(
    (order) => {
      if (!order.due_date) {
        return false
      }

      const status = String(
        order.current_status || ''
      ).toLowerCase()

      const completed =
        status.includes('deliver') ||
        status.includes('complete') ||
        status.includes('cancel')

      return (
        !completed &&
        new Date(
          `${order.due_date}T23:59:59`
        ) < today
      )
    }
  )

  const newCustomersThisPeriod =
    customers.filter((customer) => {
      if (!customer.created_at) {
        return false
      }

      return (
        new Date(customer.created_at) >=
        analytics.startDate
      )
    }).length

  const businessHealthScore =
    Math.round(
      (
        Math.min(collectionRate, 100) *
          0.35 +
        Math.min(deliveryRate, 100) *
          0.25 +
        (overdueOrders.length === 0
          ? 100
          : Math.max(
              0,
              100 -
                overdueOrders.length *
                  12
            )) *
          0.2 +
        (customers.length > 0
          ? Math.min(
              100,
              (newCustomersThisPeriod /
                Math.max(
                  customers.length,
                  1
                )) *
                100 *
                3
            )
          : 0) *
          0.2
      )
    )

  const healthLabel =
    businessHealthScore >= 80
      ? 'Healthy'
      : businessHealthScore >= 60
        ? 'Watch closely'
        : 'Needs attention'

  const healthTone =
    businessHealthScore >= 80
      ? 'healthy'
      : businessHealthScore >= 60
        ? 'watch'
        : 'risk'

  const selectedAnalyticsDay =
    analytics.daily.find(
      (day) =>
        day.key === selectedDay
    ) ||
    analytics.daily[
      analytics.daily.length - 1
    ]

  const selectedDayOrders =
    selectedAnalyticsDay?.orders || 0

  const selectedDayRevenue =
    selectedAnalyticsDay?.revenue || 0

  const selectedDayCollected =
    selectedAnalyticsDay?.collected || 0

  const selectedDayOutstanding =
    selectedAnalyticsDay?.outstanding || 0

  const periodLabel =
    period === '7d'
      ? 'Last 7 days'
      : period === '30d'
        ? 'Last 30 days'
        : 'Last 90 days'

  return (
    <main className="dashboard-page">
      <div className="dashboard-shell">
        <header className="dashboard-header">
          <div>
            <div className="dashboard-eyebrow">
              Business overview
            </div>

            <h1>
              Good{' '}
              {today.getHours() < 12
                ? 'morning'
                : today.getHours() < 17
                  ? 'afternoon'
                  : 'evening'}
              {business?.name
                ? `, ${business.name}`
                : ''}
            </h1>

            <p>
              Your business at a glance — activity,
              money, customers and delivery.
            </p>
          </div>

          <div className="dashboard-header-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={() =>
                setShowQuickOrder(true)
              }
            >
              <Icon
                name="plus"
                size={15}
                stroke="currentColor"
              />
              Quick order
            </button>

            <Link
              href={`/dashboard/orders/new?business_id=${businessId || ''}`}
              className="primary-button"
            >
              <Icon
                name="plus"
                size={15}
                stroke="#fff"
              />
              New order
            </Link>
          </div>
        </header>

        <section className="headline-grid">
          <article className="headline-card revenue-card">
            <div className="headline-card-top">
              <span>Collected</span>

              <span className="headline-icon">
                ₦
              </span>
            </div>

            <strong>
              {formatCompactMoney(totalRevenue)}
            </strong>

            <div className="headline-meta">
              <span>
                {collectionRate}% collected
              </span>

              <span>
                of {formatCompactMoney(
                  totalOrderValue
                )}{' '}
                order value
              </span>
            </div>
          </article>

          <article className="headline-card">
            <div className="headline-card-top">
              <span>Outstanding</span>

              <span className="headline-icon">
                <Icon
                  name="wallet"
                  size={15}
                  stroke="currentColor"
                />
              </span>
            </div>

            <strong>
              {formatCompactMoney(
                totalOutstanding
              )}
            </strong>

            <div className="headline-meta">
              <span>
                {outstandingOrders.length}{' '}
                orders need payment
              </span>
            </div>
          </article>

          <article className="headline-card">
            <div className="headline-card-top">
              <span>Orders</span>

              <span className="headline-icon">
                <Icon
                  name="clipboard"
                  size={15}
                  stroke="currentColor"
                />
              </span>
            </div>

            <strong>
              {orders.length}
            </strong>

            <div className="headline-meta">
              <span>
                {activeOrders.length} active
              </span>

              <span>
                {deliveredOrders.length}{' '}
                delivered
              </span>
            </div>
          </article>

          <article className="headline-card">
            <div className="headline-card-top">
              <span>Customers</span>

              <span className="headline-icon">
                <Icon
                  name="users"
                  size={15}
                  stroke="currentColor"
                />
              </span>
            </div>

            <strong>
              {customers.length}
            </strong>

            <div className="headline-meta">
              <span>
                +{newCustomersThisPeriod}{' '}
                this period
              </span>
            </div>
          </article>
        </section>

        <section className="dashboard-grid-primary">
          <article className="dashboard-panel analytics-panel">
            <div className="panel-header">
              <div>
                <div className="panel-kicker">
                  Performance
                </div>

                <h2>
                  Business activity
                </h2>

                <p>
                  Daily order and collection
                  movement from your real records.
                </p>
              </div>

              <div className="period-control">
                {[
                  ['7d', '7D'],
                  ['30d', '30D'],
                  ['90d', '90D']
                ].map(
                  ([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      className={
                        period === value
                          ? 'active'
                          : ''
                      }
                      onClick={() =>
                        handlePeriodChange(
                          value
                        )
                      }
                    >
                      {label}
                    </button>
                  )
                )}
              </div>
            </div>

            <div className="analytics-summary">
              <div>
                <span>
                  {periodLabel}
                </span>

                <strong>
                  {formatMoney(
                    analytics.periodRevenue
                  )}
                </strong>
              </div>

              <div>
                <span>
                  Orders
                </span>

                <strong>
                  {analytics.periodOrders}
                </strong>
              </div>

              <div>
                <span>
                  Collected
                </span>

                <strong>
                  {formatMoney(
                    analytics.periodCollected
                  )}
                </strong>
              </div>
            </div>

            <div className="activity-chart">
              {analytics.daily.length === 0 ? (
                <div className="chart-empty">
                  <Icon
                    name="bar-chart"
                    size={22}
                    stroke="currentColor"
                  />

                  <span>
                    No activity recorded for
                    this period.
                  </span>
                </div>
              ) : (
                analytics.daily.map(
                  (day) => {
                    const maxRevenue =
                      Math.max(
                        ...analytics.daily.map(
                          (item) =>
                            Number(
                              item.revenue || 0
                            )
                        ),
                        1
                      )

                    const height = Math.max(
                      4,
                      Math.round(
                        (Number(
                          day.revenue || 0
                        ) /
                          maxRevenue) *
                          100
                      )
                    )

                    const selected =
                      day.key ===
                      selectedAnalyticsDay?.key

                    return (
                      <button
                        key={day.key}
                        type="button"
                        className={`chart-column ${
                          selected
                            ? 'selected'
                            : ''
                        }`}
                        onClick={() =>
                          setSelectedDay(
                            day.key
                          )
                        }
                        title={`${formatLongDate(
                          day.key
                        )}: ${formatMoney(
                          day.revenue
                        )}`}
                      >
                        <div className="chart-value">
                          {day.revenue > 0
                            ? formatCompactMoney(
                                day.revenue
                              )
                            : ''}
                        </div>

                        <div className="chart-bar-wrap">
                          <div
                            className="chart-bar"
                            style={{
                              height: `${height}%`
                            }}
                          />
                        </div>

                        <span>
                          {day.label}
                        </span>
                      </button>
                    )
                  }
                )
              )}
            </div>

            {selectedAnalyticsDay && (
  <div className="selected-day">
    <div>
      <span>
        <strong>
          {formatLongDate(
            selectedAnalyticsDay.key
          )}
        </strong>
      </span>
    </div>

    <div>
      <span>Orders</span>
      <strong>
        {selectedDayOrders}
      </strong>
    </div>

                <div>
                  <span>
                    Collected
                  </span>

                  <strong>
                    {formatMoney(
                      selectedDayCollected
                    )}
                  </strong>
                </div>

                <div>
                  <span>
                    Outstanding
                  </span>

                  <strong>
                    {formatMoney(
                      selectedDayOutstanding
                    )}
                  </strong>
                </div>
              </div>
            )}
          </article>

          <aside className="dashboard-panel health-panel">
            <div className="panel-header compact">
              <div>
                <div className="panel-kicker">
                  Business health
                </div>

                <h2>
                  {healthLabel}
                </h2>
              </div>

              <span
                className={`health-score ${healthTone}`}
              >
                {businessHealthScore}
              </span>
            </div>

            <div className="health-ring">
              <div
                className="health-ring-fill"
                style={{
                  '--health-progress': `${businessHealthScore * 3.6}deg`
                }}
              >
                <div>
                  <strong>
                    {businessHealthScore}
                  </strong>

                  <span>
                    / 100
                  </span>
                </div>
              </div>
            </div>

            <div className="health-list">
              <div>
                <span>
                  Payment collection
                </span>

                <strong>
                  {collectionRate}%
                </strong>
              </div>

              <div>
                <span>
                  Delivery completion
                </span>

                <strong>
                  {deliveryRate}%
                </strong>
              </div>

              <div>
                <span>
                  Overdue orders
                </span>

                <strong
                  className={
                    overdueOrders.length
                      ? 'negative'
                      : 'positive'
                  }
                >
                  {overdueOrders.length}
                </strong>
              </div>

              <div>
                <span>
                  New customers
                </span>

                <strong>
                  +{newCustomersThisPeriod}
                </strong>
              </div>
            </div>

            <div className="health-message">
              {healthTone ===
              'healthy'
                ? 'Your payment, delivery and customer activity are tracking well.'
                : healthTone ===
                    'watch'
                  ? 'A few areas deserve attention before they become bigger issues.'
                  : 'There are overdue or collection issues worth addressing today.'}
            </div>
          </aside>
        </section>

    )
  }

  if (deactivated) {
    return (
      <div className="dashboard-state">
        <div className="dashboard-state-card">
          <div className="state-icon">
            <Icon
              name="lock"
              size={24}
              stroke="currentColor"
            />
          </div>

          <div className="state-copy">
            <div className="section-eyebrow">
              Business access
            </div>

            <h2>Business is currently inactive</h2>

            <p>
              This business has been deactivated. Contact the
              business owner or administrator to restore access.
            </p>
          </div>
        </div>

        <style jsx>{`
          .dashboard-state {
            min-height: 100vh;
            padding: 32px 20px;
            background: var(--color-bg);
            display: grid;
            place-items: center;
          }

          .dashboard-state-card {
            width: min(100%, 620px);
            padding: 28px;
            display: flex;
            gap: 18px;
            align-items: flex-start;
            background: var(--color-card);
            border: 1px solid var(--color-border);
            border-radius: 18px;
            box-shadow: var(--shadow-sm);
          }

          .state-icon {
            width: 48px;
            height: 48px;
            flex: 0 0 48px;
            display: grid;
            place-items: center;
            border-radius: 14px;
            color: var(--color-danger);
            background: rgba(220, 70, 70, .10);
          }

          .section-eyebrow {
            margin-bottom: 5px;
            color: var(--color-text-muted);
            font-size: 10px;
            font-weight: 800;
            letter-spacing: .09em;
            text-transform: uppercase;
          }

          .state-copy h2 {
            margin: 0;
            color: var(--color-text);
            font-size: 20px;
            line-height: 1.2;
          }

          .state-copy p {
            margin: 9px 0 0;
            color: var(--color-text-muted);
            font-size: 13px;
            line-height: 1.6;
          }

          @media (max-width: 560px) {
            .dashboard-state {
              padding: 20px 14px;
            }

            .dashboard-state-card {
              padding: 20px;
            }
          }
        `}</style>
      </div>
    )
  }

  if (error) {
    return (
      <div className="dashboard-state">
        <div className="dashboard-state-card error-card">
          <div className="state-icon error">
            <Icon
              name="alert-circle"
              size={24}
              stroke="currentColor"
            />
          </div>

          <div className="state-copy">
            <div className="section-eyebrow">
              Dashboard error
            </div>

            <h2>We couldn't load your dashboard</h2>

            <p>{error}</p>

            <button
              type="button"
              className="retry-button"
              onClick={loadDashboard}
            >
              Try again
            </button>
          </div>
        </div>

        <style jsx>{`
          .dashboard-state {
            min-height: 100vh;
            padding: 32px 20px;
            background: var(--color-bg);
            display: grid;
            place-items: center;
          }

          .dashboard-state-card {
            width: min(100%, 620px);
            padding: 28px;
            display: flex;
            gap: 18px;
            align-items: flex-start;
            background: var(--color-card);
            border: 1px solid var(--color-border);
            border-radius: 18px;
            box-shadow: var(--shadow-sm);
          }

          .state-icon {
            width: 48px;
            height: 48px;
            flex: 0 0 48px;
            display: grid;
            place-items: center;
            border-radius: 14px;
            color: var(--color-danger);
            background: rgba(220, 70, 70, .10);
          }

          .state-copy {
            min-width: 0;
          }

          .section-eyebrow {
            margin-bottom: 5px;
            color: var(--color-text-muted);
            font-size: 10px;
            font-weight: 800;
            letter-spacing: .09em;
            text-transform: uppercase;
          }

          .state-copy h2 {
            margin: 0;
            color: var(--color-text);
            font-size: 20px;
            line-height: 1.2;
          }

          .state-copy p {
            margin: 9px 0 0;
            color: var(--color-text-muted);
            font-size: 13px;
            line-height: 1.6;
          }

          .retry-button {
            margin-top: 16px;
            padding: 9px 15px;
            border: 0;
            border-radius: 9px;
            background: var(--color-accent);
            color: #fff;
            font: inherit;
            font-size: 12px;
            font-weight: 700;
            cursor: pointer;
          }

          .retry-button:hover {
            opacity: .92;
          }

          @media (max-width: 560px) {
            .dashboard-state {
              padding: 20px 14px;
            }

            .dashboard-state-card {
              padding: 20px;
            }
          }
        `}</style>
      </div>
    )
  }

  const businessLabel =
    business?.name || 'Your business'

  const planLabel =
    business?.plan
      ? String(business.plan)
          .replace(/_/g, ' ')
          .replace(/\b\w/g, (letter) =>
            letter.toUpperCase()
          )
      : 'Free'

  const today = new Date()

  const todayKey =
    `${today.getFullYear()}-${String(
      today.getMonth() + 1
    ).padStart(2, '0')}-${String(
      today.getDate()
    ).padStart(2, '0')`

  const todayOrders =
    orders.filter((order) =>
      String(order.created_at || '').startsWith(
        todayKey
      )
    )

  const todayRevenue = todayOrders.reduce(
    (sum, order) =>
      sum + safeAmount(order.amount_paid),
    0
  )

  const totalRevenue = orders.reduce(
    (sum, order) =>
      sum + safeAmount(order.amount_paid),
    0
  )

  const totalOrderValue = orders.reduce(
    (sum, order) =>
      sum + safeAmount(order.price),
    0
  )

  const outstandingBalance = orders.reduce(
    (sum, order) =>
      sum + calculateBalance(order),
    0
  )

  const completedOrders = orders.filter(
    (order) =>
      String(order.current_status || '')
        .toLowerCase() === 'delivered'
  )

  const activeOrders = orders.filter(
    (order) => {
      const status = String(
        order.current_status || ''
      ).toLowerCase()

      return (
        status !== 'delivered' &&
        status !== 'cancelled' &&
        status !== 'canceled'
      )
    }
  )

  const overdueOrders = orders.filter(
    (order) => {
      if (!order.due_date) return false

      const status = String(
        order.current_status || ''
      ).toLowerCase()

      if (
        status === 'delivered' ||
        status === 'cancelled' ||
        status === 'canceled'
      ) {
        return false
      }

      return (
        new Date(
          `${order.due_date}T23:59:59`
        ) < new Date()
      )
    }
  )

  const completionRate =
    orders.length > 0
      ? Math.round(
          (completedOrders.length /
            orders.length) *
            100
        )
      : 0

  const collectionRate =
    totalOrderValue > 0
      ? Math.round(
          (totalRevenue /
            totalOrderValue) *
            100
        )
      : 0

  const groupMemberEstimate =
    groups.reduce(
      (sum, group) =>
        sum +
        Number(
          group.member_count ||
            group.memberCount ||
            0
        ),
      0
    )

  return (
    <div className="dashboard-page">
      <div className="dashboard-shell">
        <header className="dashboard-header">
          <div className="dashboard-heading">
            <div className="section-eyebrow">
              Business overview
            </div>

            <h1>{businessLabel}</h1>

            <p>
              A live view of orders, customers,
              collections and business health.
            </p>
          </div>

          <div className="dashboard-header-actions">
            <div className="plan-pill">
              {planLabel}
            </div>

            <button
              type="button"
              className="quick-order-button"
              onClick={() =>
                setShowQuickOrder(true)
              }
            >
              <Icon
                name="plus"
                size={15}
                stroke="#fff"
              />
              Quick order
            </button>
          </div>
        </header>

        <section className="dashboard-metrics">
          <article className="metric-card">
            <div className="metric-card-top">
              <span className="metric-label">
                Collected
              </span>

              <span className="metric-icon">
                ₦
              </span>
            </div>

            <strong className="metric-value">
              {formatMoney(totalRevenue)}
            </strong>

            <span className="metric-note">
              {formatMoney(todayRevenue)} collected today
            </span>
          </article>

          <article className="metric-card">
            <div className="metric-card-top">
              <span className="metric-label">
                Outstanding
              </span>

              <span className="metric-icon danger">
                ₦
              </span>
            </div>

            <strong className="metric-value">
              {formatMoney(outstandingBalance)}
            </strong>

            <span className="metric-note">
              {overdueOrders.length} overdue order
              {overdueOrders.length === 1 ? '' : 's'}
            </span>
          </article>

          <article className="metric-card">
            <div className="metric-card-top">
              <span className="metric-label">
                Orders
              </span>

              <span className="metric-icon">
                <Icon
                  name="shopping-bag"
                  size={15}
                  stroke="currentColor"
                />
              </span>
            </div>

            <strong className="metric-value">
              {orders.length}
            </strong>

            <span className="metric-note">
              {activeOrders.length} currently active
            </span>
          </article>

          <article className="metric-card">
            <div className="metric-card-top">
              <span className="metric-label">
                Customers
              </span>

              <span className="metric-icon">
                <Icon
                  name="users"
                  size={15}
                  stroke="currentColor"
                />
              </span>
            </div>

            <strong className="metric-value">
              {customers.length}
            </strong>

            <span className="metric-note">
              {todayOrders.length} new orders today
            </span>
          </article>
        </section>
      </div>
    </div>
  )
      }

  if (deactivated) {
    return (
      <div className="dashboard-page">
        <div className="dashboard-shell">
          <section className="dashboard-state-card">
            <div className="state-icon danger">
              <Icon
                name="lock"
                size={24}
                stroke="currentColor"
              />
            </div>

            <div>
              <div className="section-eyebrow">
                Business access
              </div>

              <h1>Business unavailable</h1>

              <p>
                This business is currently inactive. Contact the
                business owner or administrator to restore access.
              </p>
            </div>
          </section>
        </div>

        <style jsx>{`
          .dashboard-page {
            min-height: 100vh;
            padding: 28px;
            background: var(--color-bg);
            color: var(--color-text);
          }

          .dashboard-shell {
            max-width: 1280px;
            margin: 0 auto;
          }

          .dashboard-state-card {
            min-height: 320px;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 18px;
            padding: 40px;
            background: var(--color-card);
            border: 1px solid var(--color-border);
            border-radius: 18px;
            text-align: left;
            box-shadow: var(--shadow-sm);
          }

          .state-icon {
            width: 52px;
            height: 52px;
            flex: 0 0 52px;
            display: grid;
            place-items: center;
            border-radius: 14px;
          }

          .state-icon.danger {
            color: var(--color-danger);
            background: rgba(220, 70, 70, .1);
          }

          .dashboard-state-card h1 {
            margin: 5px 0 8px;
            font-size: 24px;
            letter-spacing: -.03em;
          }

          .dashboard-state-card p {
            max-width: 520px;
            margin: 0;
            color: var(--color-text-muted);
            line-height: 1.6;
            font-size: 13px;
          }

          @media (max-width: 600px) {
            .dashboard-page {
              padding: 16px;
            }

            .dashboard-state-card {
              flex-direction: column;
              text-align: center;
            }
          }
        `}</style>
      </div>
    )
  }

  const totalRevenue = orders.reduce(
    (sum, order) =>
      sum + safeAmount(order.price),
    0
  )

  const totalCollected = orders.reduce(
    (sum, order) =>
      sum + safeAmount(order.amount_paid),
    0
  )

  const totalOutstanding = orders.reduce(
    (sum, order) =>
      sum + calculateBalance(order),
    0
  )

  const activeOrders = orders.filter(
    (order) =>
      ![
        'Delivered',
        'Cancelled',
        'Completed'
      ].includes(order.current_status)
  )

  const deliveredOrders = orders.filter(
    (order) =>
      order.current_status === 'Delivered' ||
      order.current_status === 'Completed'
  )

  const overdueOrders = orders.filter(
    (order) =>
      order.due_date &&
      new Date(`${order.due_date}T23:59:59`) <
        new Date() &&
      calculateBalance(order) > 0 &&
      ![
        'Delivered',
        'Cancelled',
        'Completed'
      ].includes(order.current_status)
  )

  const collectionRate =
    totalRevenue > 0
      ? Math.round(
          (totalCollected / totalRevenue) * 100
        )
      : 0

  const deliveryRate =
    orders.length > 0
      ? Math.round(
          (deliveredOrders.length /
            orders.length) *
            100
        )
      : 0

  const customerGrowth =
    customers.length > 0
      ? customers.filter((customer) => {
          if (!customer.created_at) return false

          const created =
            new Date(customer.created_at)

          const now = new Date()

          const days =
            (now.getTime() -
              created.getTime()) /
            86400000

          return days <= 30
        }).length
      : 0

  const healthItems = [
    {
      label: 'Collection',
      value: `${collectionRate}%`,
      tone:
        collectionRate >= 80
          ? 'positive'
          : collectionRate >= 50
          ? 'warning'
          : 'danger'
    },
    {
      label: 'Delivery',
      value: `${deliveryRate}%`,
      tone:
        deliveryRate >= 80
          ? 'positive'
          : deliveryRate >= 50
          ? 'warning'
          : 'danger'
    },
    {
      label: 'Outstanding',
      value: formatMoney(totalOutstanding),
      tone:
        totalOutstanding === 0
          ? 'positive'
          : overdueOrders.length > 0
          ? 'danger'
          : 'warning'
    }
  ]

  const dashboardPeriodLabel =
    period === '7d'
      ? 'Last 7 days'
      : period === '30d'
      ? 'Last 30 days'
      : period === '90d'
      ? 'Last 90 days'
      : 'This year'

  const selectedAnalyticsDay =
    analytics.daily.find(
      (day) => day.key === selectedDay
    ) || null

  const recentOrders = [...orders]
    .sort(
      (a, b) =>
        new Date(b.created_at || 0).getTime() -
        new Date(a.created_at || 0).getTime()
    )
    .slice(0, 8)

  const upcomingOrders = [...orders]
    .filter(
      (order) =>
        order.due_date &&
        ![
          'Delivered',
          'Cancelled',
          'Completed'
        ].includes(order.current_status)
    )
    .sort(
      (a, b) =>
        new Date(a.due_date).getTime() -
        new Date(b.due_date).getTime()
    )
    .slice(0, 6)

  const topCustomers = customers
    .map((customer) => {
      const customerOrders = orders.filter(
        (order) =>
          order.customer_id === customer.id
      )

      const value = customerOrders.reduce(
        (sum, order) =>
          sum + safeAmount(order.price),
        0
      )

      const paid = customerOrders.reduce(
        (sum, order) =>
          sum + safeAmount(order.amount_paid),
        0
      )

      return {
        ...customer,
        orderCount: customerOrders.length,
        value,
        paid,
        outstanding: Math.max(
          0,
          value - paid
        )
      }
    })
    .filter(
      (customer) =>
        customer.orderCount > 0
    )
    .sort(
      (a, b) => b.value - a.value
    )
    .slice(0, 5)

  const formatCompactMoney = (amount) => {
    const value = safeAmount(amount)

    if (value >= 1000000) {
      return `₦${(value / 1000000).toFixed(1)}m`
    }

    if (value >= 1000) {
      return `₦${(value / 1000).toFixed(1)}k`
    }

    return `₦${value.toLocaleString()}`
  }

  const formatShortDate = (value) => {
    if (!value) return '—'

    const date = new Date(value)

    if (Number.isNaN(date.getTime())) {
      return '—'
    }

    return date.toLocaleDateString(
      'en-GB',
      {
        day: 'numeric',
        month: 'short'
      }
    )
  }

  const getOrderStatusClass = (status) => {
    const normalized = String(
      status || ''
    ).toLowerCase()

    if (
      normalized.includes('deliver') ||
      normalized.includes('complete')
    ) {
      return 'positive'
    }

    if (
      normalized.includes('cancel')
    ) {
      return 'danger'
    }

    if (
      normalized.includes('progress') ||
      normalized.includes('production') ||
      normalized.includes('ready')
    ) {
      return 'accent'
    }

    return 'neutral'
  }

  const getInitials = (name) => {
    const parts = String(
      name || 'Customer'
    )
      .trim()
      .split(/\s+/)
      .filter(Boolean)

    if (!parts.length) {
      return 'C'
    }

    if (parts.length === 1) {
      return parts[0]
        .slice(0, 2)
        .toUpperCase()
    }

    return (
      parts[0][0] +
      parts[parts.length - 1][0]
    ).toUpperCase()
  }

  const businessInitials =
    getInitials(
      business?.name || 'Business'
    )

  return (
    <div className="dashboard-page">
      <div className="dashboard-shell">

        <header className="dashboard-header">
          <div className="dashboard-heading">
            <div className="business-context">
              <span className="business-avatar">
                {businessInitials}
              </span>

              <div>
                <div className="section-eyebrow">
                  Business overview
                </div>

                <div className="business-name">
                  {business?.name ||
                    'Your business'}
                </div>
              </div>
            </div>

            <h1>
              Good business decisions
              start with a clear view.
            </h1>

            <p>
              Track sales, customers,
              collections and delivery
              performance from one place.
            </p>
          </div>

          <div className="dashboard-header-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={() =>
                setShowQuickOrder(true)
              }
            >
              <Icon
                name="plus"
                size={15}
                stroke="currentColor"
              />
              Quick order
            </button>

            <Link
              href={`/dashboard/orders/new?business_id=${businessId || ''}`}
              className="primary-button"
            >
              <Icon
                name="plus"
                size={15}
                stroke="#fff"
              />
              New order
            </Link>
          </div>
        </header>

        {error && (
          <div className="dashboard-alert">
            <div className="alert-icon">
              <Icon
                name="alert-circle"
                size={16}
                stroke="currentColor"
              />
            </div>

            <div>
              <strong>
                Something needs attention
              </strong>

              <span>{error}</span>
            </div>

            <button
              type="button"
              onClick={loadDashboard}
            >
              Retry
            </button>
          </div>
        )}

        <section className="metric-grid">

          <article className="metric-card featured">
            <div className="metric-card-top">
              <span className="metric-label">
                Total sales
              </span>

              <span className="metric-icon">
                ₦
              </span>
            </div>

            <div className="metric-value">
              {formatCompactMoney(
                totalRevenue
              )}
            </div>

            <div className="metric-footer">
              <span className="metric-trend positive">
                {collectionRate}%
              </span>

              <span>
                collected
              </span>
            </div>
          </article>

          <article className="metric-card">
            <div className="metric-card-top">
              <span className="metric-label">
                Outstanding
              </span>

              <span className="metric-icon danger">
                ₦
              </span>
            </div>

            <div className="metric-value">
              {formatCompactMoney(
                totalOutstanding
              )}
            </div>

            <div className="metric-footer">
              <span
                className={
                  overdueOrders.length > 0
                    ? 'metric-trend danger'
                    : 'metric-trend positive'
                }
              >
                {overdueOrders.length}
              </span>

              <span>
                overdue order
                {overdueOrders.length !== 1
                  ? 's'
                  : ''}
              </span>
            </div>
          </article>

          <article className="metric-card">
            <div className="metric-card-top">
              <span className="metric-label">
                Active orders
              </span>

              <span className="metric-icon">
                <Icon
                  name="shopping-bag"
                  size={16}
                  stroke="currentColor"
                />
              </span>
            </div>

            <div className="metric-value">
              {activeOrders.length}
            </div>

            <div className="metric-footer">
              <span>
                {deliveredOrders.length}
              </span>

              <span>
                delivered
              </span>
            </div>
          </article>

          <article className="metric-card">
            <div className="metric-card-top">
              <span className="metric-label">
                Customers
              </span>

              <span className="metric-icon">
                <Icon
                  name="users"
                  size={16}
                  stroke="currentColor"
                />
              </span>
            </div>

            <div className="metric-value">
              {customers.length}
            </div>

            <div className="metric-footer">
              <span className="metric-trend positive">
                +{customerGrowth}
              </span>

              <span>
                added in 30 days
              </span>
            </div>
          </article>

        </section>

        <section className="dashboard-main-grid">

          <article className="analytics-panel">
            <div className="panel-header">
              <div>
                <div className="section-eyebrow">
                  Performance
                </div>

                <h2>
                  Sales activity
                </h2>

                <p>
                  Follow business performance
                  day by day instead of relying
                  on a single total.
                </p>
              </div>

              <div className="period-switcher">
                {[
                  ['7d', '7D'],
                  ['30d', '30D'],
                  ['90d', '90D'],
                  ['year', 'Year']
                ].map(
                  ([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      className={
                        period === value
                          ? 'period-button active'
                          : 'period-button'
                      }
                      onClick={() =>
                        handlePeriodChange(
                          value
                        )
                      }
                    >
                      {label}
                    </button>
                  )
                )}
              </div>
            </div>

            <div className="analytics-summary">
              <div>
                <span>
                  Revenue
                </span>

                <strong>
                  {formatMoney(
                    analytics.totalRevenue
                  )}
                </strong>
              </div>

              <div>
                <span>
                  Orders
                </span>

                <strong>
                  {analytics.totalOrders}
                </strong>
              </div>

              <div>
                <span>
                  Collected
                </span>

                <strong>
                  {formatMoney(
                    analytics.totalCollected
                  )}
                </strong>
              </div>

              <div>
                <span>
                  Outstanding
                </span>

                <strong className="danger-text">
                  {formatMoney(
                    analytics.totalOutstanding
                  )}
                </strong>
              </div>
            </div>

            <div className="chart-area">
              {analytics.daily.length === 0 ? (
                <div className="chart-empty">
                  <Icon
                    name="bar-chart"
                    size={24}
                    stroke="currentColor"
                  />

                  <span>
                    Not enough activity to
                    display a trend yet.
                  </span>
                </div>
              ) : (
                <div className="daily-chart">

                  <div className="chart-y-axis">
                    <span>
                      {formatCompactMoney(
                        analytics.chartMax
                      )}
                    </span>

                    <span>
                      {formatCompactMoney(
                        analytics.chartMax *
                          0.75
                      )}
                    </span>

                    <span>
                      {formatCompactMoney(
                        analytics.chartMax *
                          0.5
                      )}
                    </span>

                    <span>
                      {formatCompactMoney(
                        analytics.chartMax *
                          0.25
                      )}
                    </span>

                    <span>₦0</span>
                  </div>

                  <div className="chart-content">

                    <div className="chart-grid-lines">
                      <span />
                      <span />
                      <span />
                      <span />
                      <span />
                    </div>

                    <div className="chart-bars">
                      {analytics.daily.map(
                        (day) => {
                          const height =
                            analytics.chartMax >
                            0
                              ? Math.max(
                                  3,
                                  Math.round(
                                    (day.revenue /
                                      analytics.chartMax) *
                                      100
                                  )
                                )
                              : 3

                          const isSelected =
                            selectedDay ===
                            day.key

                          return (
                            <button
                              type="button"
                              key={day.key}
                              className={
                                isSelected
                                  ? 'chart-bar-column selected'
                                  : 'chart-bar-column'
                              }
                              onClick={() =>
                                setSelectedDay(
                                  day.key
                                )
                              }
                              title={`${day.label}: ${formatMoney(day.revenue)}`}
                            >
                              <span
                                className="chart-bar"
                                style={{
                                  height: `${height}%`
                                }}
                              />

                              <span className="chart-label">
                                {day.shortLabel}
                              </span>
                            </button>
                          )
                        }
                      )}
                    </div>

                  </div>
                </div>
              )}
            </div>

            {selectedAnalyticsDay && (
              <div className="selected-day-card">
                <div>
                  <span>
                    Selected day
                  </span>

                  <strong>
                    {
                      selectedAnalyticsDay.label
                    }
                  </strong>
                </div>

                <div>
                  <span>
                    Sales
                  </span>

                  <strong>
                    {formatMoney(
                      selectedAnalyticsDay.revenue
                    )}
                  </strong>
                </div>

                <div>
                  <span>
                    Orders
                  </span>

                  <strong>
                    {
                      selectedAnalyticsDay.orders
                    }
                  </strong>
                </div>

                <div>
                  <span>
                    Collected
                  </span>

                  <strong>
                    {formatMoney(
                      selectedAnalyticsDay.collected
                    )}
                  </strong>
                </div>
              </div>
            )}

            <div className="chart-footnote">
              <span>
                {dashboardPeriodLabel}
              </span>

              <span>
                Click any day to inspect
                performance.
              </span>
            </div>
          </article>

          <aside className="health-panel">
            <div className="panel-header compact">
              <div>
                <div className="section-eyebrow">
                  Business health
                </div>

                <h2>
                  At a glance
                </h2>
              </div>

              <span
                className={`health-score health-${businessHealth.level}`}
              >
                {businessHealth.score}
              </span>
            </div>

            <div className="health-overview">
              <div
                className={`health-ring health-${businessHealth.level}`}
              >
                <div>
                  <strong>
                    {businessHealth.score}
                  </strong>

                  <span>
                    / 100
                  </span>
                </div>
              </div>

              <div>
                <strong>
                  {businessHealth.label}
                </strong>

                <p>
                  {businessHealth.message}
                </p>
              </div>
            </div>

            <div className="health-checks">

              <div className="health-check">
                <span className="health-check-icon">
                  <Icon
                    name="credit-card"
                    size={14}
                    stroke="currentColor"
                  />
                </span>

                <div>
                  <strong>
                    Collections
                  </strong>

                  <span>
                    {collectionRate}% of
                    order value collected
                  </span>
                </div>

                <b
                  className={
                    collectionRate >= 80
                      ? 'positive-text'
                      : collectionRate >= 50
                      ? 'warning-text'
                      : 'danger-text'
                  }
                >
                  {collectionRate}%
                </b>
              </div>

              <div className="health-check">
                <span className="health-check-icon">
                  <Icon
                    name="clock"
                    size={14}
                    stroke="currentColor"
                  />
                </span>

                <div>
                  <strong>
                    Delivery
                  </strong>

                  <span>
                    {deliveryRate}% delivered
                    successfully
                  </span>
                </div>

                <b
                  className={
                    deliveryRate >= 80
                      ? 'positive-text'
                      : deliveryRate >= 50
                      ? 'warning-text'
                      : 'danger-text'
                  }
                >
                  {deliveryRate}%
                </b>
              </div>

              <div className="health-check">
                <span className="health-check-icon">
                  <Icon
                    name="users"
                    size={14}
                    stroke="currentColor"
                  />
                </span>

                <div>
                  <strong>
                    Customers
                  </strong>

                  <span>
                    {repeatCustomerRate}% returning
                    customers
                  </span>
                </div>

                <b
                  className={
                    repeatCustomerRate >= 40
                      ? 'positive-text'
                      : repeatCustomerRate >= 20
                      ? 'warning-text'
                      : 'neutral-text'
                  }
                >
                  {repeatCustomerRate}%
                </b>
              </div>

              <div className="health-check">
                <span className="health-check-icon">
                  <Icon
                    name="alert-circle"
                    size={14}
                    stroke="currentColor"
                  />
                </span>

                <div>
                  <strong>
                    Attention
                  </strong>

                  <span>
                    {overdueOrders.length > 0
                      ? `${overdueOrders.length} overdue order${overdueOrders.length === 1 ? '' : 's'} need attention`
                      : 'No overdue orders'}
                  </span>
                </div>

                <b
                  className={
                    overdueOrders.length === 0
                      ? 'positive-text'
                      : 'danger-text'
                  }
                >
                  {overdueOrders.length}
                </b>
              </div>

            </div>

            <Link
              href={`/dashboard/orders?business_id=${businessId || ''}`}
              className="health-action"
            >
              Review business activity
              <Icon
                name="arrow-right"
                size={14}
                stroke="currentColor"
              />
            </Link>
          </aside>

        </section>

        <section className="dashboard-lower-grid">

          <article className="orders-panel">
            <div className="panel-header">
              <div>
                <div className="section-eyebrow">
                  Recent activity
                </div>

                <h2>
                  Orders needing attention
                </h2>

                <p>
                  The orders most likely to
                  require an action right now.
                </p>
              </div>

              <Link
                href={`/dashboard/orders?business_id=${businessId || ''}`}
                className="panel-link"
              >
                View all
                <Icon
                  name="arrow-right"
                  size={14}
                  stroke="currentColor"
                />
              </Link>
            </div>

            {priorityOrders.length === 0 ? (
              <div className="panel-empty">
                <div className="panel-empty-icon">
                  <Icon
                    name="check-circle"
                    size={22}
                    stroke="currentColor"
                  />
                </div>

                <strong>
                  Everything looks clear
                </strong>

                <span>
                  There are no outstanding
                  orders requiring immediate
                  attention.
                </span>
              </div>
            ) : (
              <div className="priority-list">
                {priorityOrders
                  .slice(0, 6)
                  .map((order) => {
                    const balance =
                      calculateBalance(order)

                    const customerName =
                      renderCustomerName(
                        order.customer_id
                      )

                    const orderTitle =
                      renderOrderTitle(order)

                    const overdue =
                      isOrderOverdue(order)

                    return (
                      <div
                        className="priority-row"
                        key={order.id}
                      >
                        <div className="priority-main">

                          <div className="priority-avatar">
                            {customerName
                              .charAt(0)
                              .toUpperCase()}
                          </div>

                          <div className="priority-copy">
                            <strong>
                              {orderTitle}
                            </strong>

                            <span>
                              {customerName}
                            </span>
                          </div>

                        </div>

                        <div className="priority-meta">

                          <div>
                            <span>
                              Balance
                            </span>

                            <strong
                              className={
                                balance > 0
                                  ? 'danger-text'
                                  : 'positive-text'
                              }
                            >
                              {formatMoney(
                                balance
                              )}
                            </strong>
                          </div>

                          <div>
                            <span>
                              Status
                            </span>

                            <strong
                              className={
                                overdue
                                  ? 'danger-text'
                                  : ''
                              }
                            >
                              {overdue
                                ? 'Overdue'
                                : order.current_status ||
                                  'Order placed'}
                            </strong>
                          </div>

                          <button
                            type="button"
                            className="row-action"
                            onClick={() =>
                              openSettleModal(
                                order
                              )
                            }
                            disabled={
                              balance <= 0
                            }
                          >
                            {balance > 0
                              ? 'Settle'
                              : 'Paid'}
                          </button>

                        </div>
                      </div>
                    )
                  })}
              </div>
            )}
          </article>

          <article className="quick-actions-panel">
            <div className="panel-header">
              <div>
                <div className="section-eyebrow">
                  Workspace
                </div>

                <h2>
                  Quick actions
                </h2>

                <p>
                  Common tasks without leaving
                  your dashboard.
                </p>
              </div>
            </div>

            <div className="quick-actions">

              <button
                type="button"
                className="quick-action primary"
                onClick={() =>
                  setShowQuickOrder(true)
                }
              >
                <span className="quick-action-icon">
                  <Icon
                    name="plus"
                    size={18}
                    stroke="currentColor"
                  />
                </span>

                <span>
                  <strong>
                    Create order
                  </strong>

                  <small>
                    Add a customer order
                    immediately
                  </small>
                </span>

                <Icon
                  name="arrow-right"
                  size={14}
                  stroke="currentColor"
                />
              </button>

              <Link
                href={`/dashboard/customers?business_id=${businessId || ''}`}
                className="quick-action"
              >
                <span className="quick-action-icon">
                  <Icon
                    name="users"
                    size={18}
                    stroke="currentColor"
                  />
                </span>

                <span>
                  <strong>
                    Customers
                  </strong>

                  <small>
                    View and manage your
                    customer base
                  </small>
                </span>

                <Icon
                  name="arrow-right"
                  size={14}
                  stroke="currentColor"
                />
              </Link>

              <Link
                href={`/dashboard/groups?business_id=${businessId || ''}`}
                className="quick-action"
              >
                <span className="quick-action-icon">
                  <Icon
                    name="users"
                    size={18}
                    stroke="currentColor"
                  />
                </span>

                <span>
                  <strong>
                    Group orders
                  </strong>

                  <small>
                    Track coordinated orders
                    and deliveries
                  </small>
                </span>

                <Icon
                  name="arrow-right"
                  size={14}
                  stroke="currentColor"
                />
              </Link>

              <Link
                href={`/dashboard/orders?business_id=${businessId || ''}`}
                className="quick-action"
              >
                <span className="quick-action-icon">
                  <Icon
                    name="clipboard"
                    size={18}
                    stroke="currentColor"
                  />
                </span>

                <span>
                  <strong>
                    All orders
                  </strong>

                  <small>
                    Search, update and track
                    orders
                  </small>
                </span>

                <Icon
                  name="arrow-right"
                  size={14}
                  stroke="currentColor"
                />
              </Link>

            </div>
          </article>

        </section>

        <section className="dashboard-insights-grid">

          <article className="insight-panel">

            <div className="panel-header">
              <div>
                <div className="section-eyebrow">
                  Customers
                </div>

                <h2>
                  Customer momentum
                </h2>

                <p>
                  Understand whether your
                  customer base is growing.
                </p>
              </div>

              <span className="insight-value">
                {customersThisPeriod}
              </span>
            </div>

            <div className="customer-momentum">

              <div className="momentum-stat">
                <span>
                  New customers
                </span>

                <strong>
                  {customersThisPeriod}
                </strong>

                <small>
                  {customerGrowthLabel}
                </small>
              </div>

              <div className="momentum-stat">
                <span>
                  Total customers
                </span>

                <strong>
                  {customers.length}
                </strong>

                <small>
                  Across this business
                </small>
              </div>

              <div className="momentum-stat">
                <span>
                  Repeat customers
                </span>

                <strong>
                  {repeatCustomers}
                </strong>

                <small>
                  More than one order
                </small>
              </div>

            </div>

            <div className="customer-bars">
              {customerTrend.map(
                (item) => {
                  const max =
                    customerTrendMax ||
                    1

                  const width = Math.max(
                    4,
                    Math.round(
                      (item.value / max) *
                        100
                    )
                  )

                  return (
                    <button
                      type="button"
                      className="customer-bar-row"
                      key={item.key}
                      onClick={() =>
                        setSelectedDay(
                          item.key
                        )
                      }
                    >
                      <span>
                        {item.label}
                      </span>

                      <div className="mini-bar-track">
                        <div
                          className="mini-bar-fill"
                          style={{
                            width: `${width}%`
                          }}
                        />
                      </div>

                      <strong>
                        {item.value}
                      </strong>
                    </button>
                  )
                }
              )}
            </div>

          </article>

          <article className="insight-panel">

            <div className="panel-header">
              <div>
                <div className="section-eyebrow">
                  Order pipeline
                </div>

                <h2>
                  Where work stands
                </h2>

                <p>
                  A live view of your current
                  order workload.
                </p>
              </div>
            </div>

            <div className="pipeline">

              {orderPipeline.map(
                (stage) => (
                  <div
                    className="pipeline-row"
                    key={stage.key}
                  >
                    <div className="pipeline-label">
                      <span
                        className={`pipeline-dot pipeline-${stage.key}`}
                      />

                      <strong>
                        {stage.label}
                      </strong>
                    </div>

                    <div className="pipeline-track">
                      <div
                        className={`pipeline-fill pipeline-${stage.key}`}
                        style={{
                          width: `${
                            stage.percent
                          }%`
                        }}
                      />
                    </div>

                    <span className="pipeline-count">
                      {stage.count}
                    </span>
                  </div>
                )
              )}

            </div>

            <div className="pipeline-footer">
              <span>
                {orders.length} total orders
              </span>

              <span>
                {completedOrders} completed
              </span>
            </div>

          </article>

        </section>

        <section className="dashboard-bottom-grid">

          <article className="business-health-panel">

            <div className="panel-header">
              <div>
                <div className="section-eyebrow">
                  Business health
                </div>

                <h2>
                  How the business is performing
                </h2>

                <p>
                  A practical snapshot based on
                  your real orders, payments and
                  customer activity.
                </p>
              </div>

              <div
                className={`health-score health-${healthStatus}`}
              >
                <strong>
                  {healthScore}
                </strong>

                <span>
                  / 100
                </span>
              </div>
            </div>

            <div className="health-grid">

              <div className="health-item">
                <div className="health-item-top">
                  <span>
                    Collections
                  </span>

                  <span
                    className={
                      collectionRate >= 70
                        ? 'health-good'
                        : collectionRate >= 40
                        ? 'health-watch'
                        : 'health-risk'
                    }
                  >
                    {collectionRate}%
                  </span>
                </div>

                <div className="health-track">
                  <div
                    className="health-fill"
                    style={{
                      width: `${Math.min(
                        100,
                        collectionRate
                      )}%`
                    }}
                  />
                </div>

                <small>
                  {formatMoney(totalPaid)}
                  collected from{' '}
                  {formatMoney(totalRevenue)}
                  {' '}ordered
                </small>
              </div>

              <div className="health-item">
                <div className="health-item-top">
                  <span>
                    Delivery
                  </span>

                  <span
                    className={
                      deliveryRate >= 70
                        ? 'health-good'
                        : deliveryRate >= 40
                        ? 'health-watch'
                        : 'health-risk'
                    }
                  >
                    {deliveryRate}%
                  </span>
                </div>

                <div className="health-track">
                  <div
                    className="health-fill"
                    style={{
                      width: `${Math.min(
                        100,
                        deliveryRate
                      )}%`
                    }}
                  />
                </div>

                <small>
                  {completedOrders} of{' '}
                  {orders.length} orders
                  completed
                </small>
              </div>

              <div className="health-item">
                <div className="health-item-top">
                  <span>
                    On-time orders
                  </span>

                  <span
                    className={
                      onTimeRate >= 70
                        ? 'health-good'
                        : onTimeRate >= 40
                        ? 'health-watch'
                        : 'health-risk'
                    }
                  >
                    {onTimeRate}%
                  </span>
                </div>

                <div className="health-track">
                  <div
                    className="health-fill"
                    style={{
                      width: `${Math.min(
                        100,
                        onTimeRate
                      )}%`
                    }}
                  />
                </div>

                <small>
                  Based on orders with
                  delivery dates
                </small>
              </div>

              <div className="health-item">
                <div className="health-item-top">
                  <span>
                    Customer retention
                  </span>

                  <span
                    className={
                      retentionRate >= 50
                        ? 'health-good'
                        : retentionRate >= 25
                        ? 'health-watch'
                        : 'health-risk'
                    }
                  >
                    {retentionRate}%
                  </span>
                </div>

                <div className="health-track">
                  <div
                    className="health-fill"
                    style={{
                      width: `${Math.min(
                        100,
                        retentionRate
                      )}%`
                    }}
                  />
                </div>

                <small>
                  Customers with repeat
                  orders
                </small>
              </div>

            </div>

            <div className="health-summary">

              <div className="health-summary-icon">
                <Icon
                  name={
                    healthStatus === 'good'
                      ? 'check-circle'
                      : healthStatus === 'watch'
                      ? 'alert-circle'
                      : 'alert-triangle'
                  }
                  size={18}
                  stroke="currentColor"
                />
              </div>

              <div>
                <strong>
                  {healthHeadline}
                </strong>

                <p>
                  {healthMessage}
                </p>
              </div>

            </div>

          </article>

          <article className="activity-panel">

            <div className="panel-header">
              <div>
                <div className="section-eyebrow">
                  Activity
                </div>

                <h2>
                  Recent business events
                </h2>

                <p>
                  The latest meaningful changes
                  across your workspace.
                </p>
              </div>
            </div>

            {recentActivity.length === 0 ? (
              <div className="panel-empty compact">
                <div className="panel-empty-icon">
                  <Icon
                    name="activity"
                    size={20}
                    stroke="currentColor"
                  />
                </div>

                <strong>
                  No recent activity
                </strong>

                <span>
                  New orders, customers and
                  payments will appear here.
                </span>
              </div>
            ) : (
              <div className="activity-list">

                {recentActivity
                  .slice(0, 8)
                  .map((activity) => (
                    <div
                      className="activity-item"
                      key={activity.id}
                    >
                      <div
                        className={`activity-icon activity-${activity.type}`}
                      >
                        <Icon
                          name={
                            activity.type ===
                            'order'
                              ? 'clipboard'
                              : activity.type ===
                                'customer'
                              ? 'user'
                              : activity.type ===
                                'payment'
                              ? 'credit-card'
                              : 'users'
                          }
                          size={15}
                          stroke="currentColor"
                        />
                      </div>

                      <div className="activity-copy">
                        <strong>
                          {activity.title}
                        </strong>

                        <span>
                          {activity.description}
                        </span>
                      </div>

                      <time>
                        {formatRelativeTime(
                          activity.date
                        )}
                      </time>
                    </div>
                  ))}

              </div>
            )}

          </article>

        </section>

        <section className="dashboard-table-panel">

          <div className="panel-header table-panel-header">
            <div>
              <div className="section-eyebrow">
                Daily trace
              </div>

              <h2>
                Business activity by day
              </h2>

              <p>
                Track orders, customers and
                collections across the selected
                period instead of relying on a
                single headline number.
              </p>
            </div>

            <div className="period-controls">
              {[
                ['7d', '7 days'],
                ['30d', '30 days'],
                ['90d', '90 days']
              ].map(
                ([value, label]) => (
                  <button
                    type="button"
                    key={value}
                    className={
                      period === value
                        ? 'period-button selected'
                        : 'period-button'
                    }
                    onClick={() =>
                      handlePeriodChange(
                        value
                      )
                    }
                  >
                    {label}
                  </button>
                )
              )}
            </div>
          </div>

          <div className="daily-table-wrap">
            <table className="daily-table">

              <thead>
                <tr>
                  <th>
                    Day
                  </th>

                  <th>
                    Orders
                  </th>

                  <th>
                    New customers
                  </th>

                  <th>
                    Collected
                  </th>

                  <th>
                    Outstanding
                  </th>

                  <th>
                    Activity
                  </th>
                </tr>
              </thead>

              <tbody>
                {analytics.daily
                  .slice()
                  .reverse()
                  .slice(0, 14)
                  .map((day) => (
                    <tr
                      key={day.key}
                      className={
                        selectedDay ===
                        day.key
                          ? 'selected-day'
                          : ''
                      }
                      onClick={() =>
                        setSelectedDay(
                          day.key
                        )
                      }
                    >
                      <td>
                        <strong>
                          {day.label}
                        </strong>
                      </td>

                      <td>
                        {day.orders}
                      </td>

                      <td>
                        {day.customers}
                      </td>

                      <td className="table-money">
                        {formatMoney(
                          day.collected
                        )}
                      </td>

                      <td
                        className={
                          day.outstanding > 0
                            ? 'danger-text'
                            : 'positive-text'
                        }
                      >
                        {formatMoney(
                          day.outstanding
                        )}
                      </td>

                      <td>
                        <div className="table-activity">
                          <span
                            className="table-activity-track"
                          >
                            <span
                              className="table-activity-fill"
                              style={{
                                width: `${Math.min(
                                  100,
                                  day.activityPercent ||
                                    0
                                )}%`
                              }}
                            />
                          </span>

                          <small>
                            {day.activityPercent ||
                              0}
                            %
                          </small>
                        </div>
                      </td>
                    </tr>
                  ))}

                {analytics.daily.length ===
                  0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="table-empty"
                    >
                      No daily activity is
                      available yet.
                    </td>
                  </tr>
                )}

              </tbody>

            </table>
          </div>

        </section>

        <section className="dashboard-footer-grid">

          <article className="top-customers-panel">

            <div className="panel-header">
              <div>
                <div className="section-eyebrow">
                  Customer value
                </div>

                <h2>
                  Most valuable customers
                </h2>

                <p>
                  Ranked by total order value
                  recorded in this business.
                </p>
              </div>

              <Link
                href={`/dashboard/customers?business_id=${businessId || ''}`}
                className="panel-link"
              >
                Customers
                <Icon
                  name="arrow-right"
                  size={14}
                  stroke="currentColor"
                />
              </Link>
            </div>

            {topCustomers.length === 0 ? (
              <div className="panel-empty compact">
                <strong>
                  No customer data yet
                </strong>

                <span>
                  Customer value will appear
                  after orders are recorded.
                </span>
              </div>
            ) : (
              <div className="customer-ranking">

                {topCustomers
                  .slice(0, 5)
                  .map(
                    (
                      customer,
                      index
                    ) => (
                      <div
                        className="customer-ranking-row"
                        key={customer.id}
                      >
                        <span className="customer-rank">
                          {index + 1}
                        </span>

                        <div className="customer-ranking-avatar">
                          {customer.name
                            .charAt(0)
                            .toUpperCase()}
                        </div>

                        <div className="customer-ranking-copy">
                          <strong>
                            {customer.name}
                          </strong>

                          <span>
                            {customer.orders}{' '}
                            {customer.orders ===
                            1
                              ? 'order'
                              : 'orders'}
                          </span>
                        </div>

                        <strong className="customer-ranking-value">
                          {formatMoney(
                            customer.value
                          )}
                        </strong>
                      </div>
                    )
                  )}

              </div>
            )}

          </article>

          <article className="attention-panel">

            <div className="panel-header">
              <div>
                <div className="section-eyebrow">
                  Attention
                </div>

                <h2>
                  What needs action
                </h2>

                <p>
                  Keep the business moving by
                  resolving the highest-impact
                  issues first.
                </p>
              </div>
            </div>

            <div className="attention-list">

              <Link
                href={`/dashboard/orders?business_id=${businessId || ''}&status=overdue`}
                className="attention-item"
              >
                <span className="attention-icon danger">
                  <Icon
                    name="alert-triangle"
                    size={16}
                    stroke="currentColor"
                  />
                </span>

                <span>
                  <strong>
                    {overdueOrders}
                  </strong>

                  <small>
                    overdue orders
                  </small>
                </span>

                <Icon
                  name="arrow-right"
                  size={14}
                  stroke="currentColor"
                />
              </Link>

              <Link
                href={`/dashboard/orders?business_id=${businessId || ''}`}
                className="attention-item"
              >
                <span className="attention-icon warning">
                  <Icon
                    name="credit-card"
                    size={16}
                    stroke="currentColor"
                  />
                </span>

                <span>
                  <strong>
                    {formatMoney(
                      totalBalance
                    )}
                  </strong>

                  <small>
                    outstanding balance
                  </small>
                </span>

                <Icon
                  name="arrow-right"
                  size={14}
                  stroke="currentColor"
                />
              </Link>

              <Link
                href={`/dashboard/customers?business_id=${businessId || ''}`}
                className="attention-item"
              >
                <span className="attention-icon">
                  <Icon
                    name="user-plus"
                    size={16}
                    stroke="currentColor"
                  />
                </span>

                <span>
                  <strong>
                    {customersThisPeriod}
                  </strong>

                  <small>
                    new customers this period
                  </small>
                </span>

                <Icon
                  name="arrow-right"
                  size={14}
                  stroke="currentColor"
                />
              </Link>

              <Link
                href={`/dashboard/groups?business_id=${businessId || ''}`}
                className="attention-item"
              >
                <span className="attention-icon">
                  <Icon
                    name="users"
                    size={16}
                    stroke="currentColor"
                  />
                </span>

                <span>
                  <strong>
                    {activeGroups}
                  </strong>

                  <small>
                    active group orders
                  </small>
                </span>

                <Icon
                  name="arrow-right"
                  size={14}
                  stroke="currentColor"
                />
              </Link>

            </div>

          </article>

        </section>

      </div>

        <style jsx>{`

          .dashboard-page {
            min-height: 100vh;
            padding: 28px;
            background: var(--color-bg);
            color: var(--color-text);
          }

          .dashboard-shell {
            width: 100%;
            max-width: 1320px;
            margin: 0 auto;
          }

          .dashboard-header {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 24px;
            margin-bottom: 22px;
          }

          .dashboard-heading {
            min-width: 0;
          }

          .dashboard-eyebrow,
          .section-eyebrow {
            color: var(--color-text-muted);
            font-size: 10px;
            font-weight: 800;
            letter-spacing: .12em;
            line-height: 1.2;
            text-transform: uppercase;
          }

          .dashboard-heading h1 {
            margin: 5px 0 5px;
            color: var(--color-text);
            font-size: clamp(1.55rem, 2.5vw, 2rem);
            font-weight: 750;
            letter-spacing: -.035em;
            line-height: 1.1;
          }

          .dashboard-heading p {
            max-width: 650px;
            margin: 0;
            color: var(--color-text-muted);
            font-size: 13px;
            line-height: 1.55;
          }

          .dashboard-actions {
            display: flex;
            align-items: center;
            gap: 8px;
            flex-wrap: wrap;
          }

          .dashboard-button {
            min-height: 38px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 7px;
            padding: 0 13px;
            border: 1px solid var(--color-border);
            border-radius: 9px;
            background: var(--color-card);
            color: var(--color-text);
            font: inherit;
            font-size: 12px;
            font-weight: 650;
            text-decoration: none;
            cursor: pointer;
            transition:
              transform .16s ease,
              border-color .16s ease,
              box-shadow .16s ease,
              background .16s ease;
          }

          .dashboard-button:hover {
            transform: translateY(-1px);
            border-color: var(--color-accent);
            box-shadow: var(--shadow-sm);
          }

          .dashboard-button.primary {
            border-color: var(--color-accent);
            background: var(--color-accent);
            color: #fff;
          }

          .dashboard-button.primary:hover {
            border-color: var(--color-accent);
            background: var(--color-accent);
          }

          .dashboard-period {
            display: flex;
            align-items: center;
            gap: 3px;
            padding: 3px;
            border: 1px solid var(--color-border);
            border-radius: 9px;
            background: var(--color-card);
          }

          .dashboard-period button {
            min-height: 31px;
            padding: 0 9px;
            border: 0;
            border-radius: 6px;
            background: transparent;
            color: var(--color-text-muted);
            font: inherit;
            font-size: 11px;
            font-weight: 650;
            cursor: pointer;
          }

          .dashboard-period button:hover {
            color: var(--color-text);
          }

          .dashboard-period button.selected {
            background: var(--color-bg);
            color: var(--color-text);
            box-shadow: var(--shadow-sm);
          }

          .dashboard-overview {
            display: grid;
            grid-template-columns:
              repeat(4, minmax(0, 1fr));
            gap: 12px;
            margin-bottom: 14px;
          }

          .overview-card {
            min-width: 0;
            padding: 16px;
            border: 1px solid var(--color-border);
            border-radius: 13px;
            background: var(--color-card);
            box-shadow: var(--shadow-sm);
          }

          .overview-card-top {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
            margin-bottom: 12px;
          }

          .overview-label {
            color: var(--color-text-muted);
            font-size: 10px;
            font-weight: 750;
            letter-spacing: .06em;
            text-transform: uppercase;
          }

          .overview-icon {
            width: 29px;
            height: 29px;
            display: grid;
            place-items: center;
            border: 1px solid var(--color-border);
            border-radius: 8px;
            background: var(--color-bg);
            color: var(--color-text-muted);
          }

          .overview-value {
            color: var(--color-text);
            font-size: 1.45rem;
            font-weight: 750;
            letter-spacing: -.04em;
            line-height: 1.1;
          }

          .overview-value.money {
            font-size: 1.2rem;
          }

          .overview-meta {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 8px;
            margin-top: 9px;
            color: var(--color-text-muted);
            font-size: 10px;
            line-height: 1.4;
          }

          .trend-positive {
            color: var(--color-success);
            font-weight: 700;
          }

          .trend-negative {
            color: var(--color-danger);
            font-weight: 700;
          }

          .dashboard-primary-grid {
            display: grid;
            grid-template-columns:
              minmax(0, 1.75fr)
              minmax(280px, .85fr);
            gap: 14px;
            margin-bottom: 14px;
          }

          .dashboard-panel {
            min-width: 0;
            border: 1px solid var(--color-border);
            border-radius: 14px;
            background: var(--color-card);
            box-shadow: var(--shadow-sm);
          }

          .panel-header {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 18px;
            padding: 18px 18px 0;
          }

          .panel-header h2 {
            margin: 5px 0 4px;
            color: var(--color-text);
            font-size: 14px;
            font-weight: 720;
            letter-spacing: -.015em;
          }

          .panel-header p {
            max-width: 570px;
            margin: 0;
            color: var(--color-text-muted);
            font-size: 11px;
            line-height: 1.5;
          }

          .panel-link {
            display: inline-flex;
            align-items: center;
            gap: 5px;
            flex-shrink: 0;
            color: var(--color-text-muted);
            font-size: 11px;
            font-weight: 650;
            text-decoration: none;
          }

          .panel-link:hover {
            color: var(--color-accent);
          }

          .analytics-panel {
            overflow: hidden;
          }

          .analytics-controls {
            display: flex;
            align-items: center;
            gap: 6px;
          }

          .analytics-chart {
            position: relative;
            min-height: 300px;
            margin: 20px 18px 0;
            padding: 14px 0 34px 42px;
          }

          .chart-grid {
            position: absolute;
            inset: 12px 0 34px 42px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            pointer-events: none;
          }

          .chart-grid-line {
            width: 100%;
            height: 1px;
            background: var(--color-border);
            opacity: .7;
          }

          .chart-axis-labels {
            position: absolute;
            top: 12px;
            bottom: 34px;
            left: 0;
            width: 34px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            color: var(--color-text-muted);
            font-size: 9px;
            text-align: right;
          }

          .chart-bars {
            position: relative;
            z-index: 1;
            height: 255px;
            display: grid;
            grid-template-columns:
              repeat(
                var(--chart-count, 7),
                minmax(18px, 1fr)
              );
            align-items: end;
            gap: 8px;
            border-bottom: 1px solid var(--color-border);
          }

          .chart-column {
            min-width: 0;
            height: 100%;
            display: flex;
            flex-direction: column;
            justify-content: flex-end;
            align-items: center;
            gap: 6px;
            cursor: pointer;
          }

          .chart-column-value {
            min-height: 12px;
            color: var(--color-text-muted);
            font-size: 8px;
            font-weight: 650;
          }

          .chart-bar {
            width: min(28px, 72%);
            min-height: 3px;
            border-radius: 5px 5px 2px 2px;
            background: var(--color-accent);
            opacity: .82;
            transition:
              height .2s ease,
              opacity .2s ease,
              transform .2s ease;
          }

          .chart-column:hover .chart-bar,
          .chart-column.selected .chart-bar {
            opacity: 1;
            transform: scaleX(1.08);
          }

          .chart-column.selected .chart-bar {
            box-shadow:
              0 0 0 2px
              color-mix(
                in srgb,
                var(--color-accent) 20%,
                transparent
              );
          }

          .chart-column-label {
            position: absolute;
            bottom: 10px;
            color: var(--color-text-muted);
            font-size: 8px;
            white-space: nowrap;
            transform: translateY(100%);
          }

          .analytics-summary {
            display: grid;
            grid-template-columns:
              repeat(3, minmax(0, 1fr));
            gap: 8px;
            margin: 0 18px 18px;
          }

          .analytics-summary-card {
            padding: 10px 11px;
            border: 1px solid var(--color-border);
            border-radius: 9px;
            background: var(--color-bg);
          }

          .analytics-summary-card span {
            display: block;
            margin-bottom: 4px;
            color: var(--color-text-muted);
            font-size: 9px;
          }

          .analytics-summary-card strong {
            color: var(--color-text);
            font-size: 12px;
            font-weight: 720;
          }

          .health-panel {
            overflow: hidden;
          }

          .health-score {
            display: flex;
            align-items: baseline;
            gap: 2px;
            padding: 7px 10px;
            border-radius: 9px;
            background: var(--color-bg);
            color: var(--color-text);
          }

          .health-score strong {
            font-size: 20px;
            line-height: 1;
          }

          .health-score span {
            color: var(--color-text-muted);
            font-size: 9px;
          }

          .health-score.good {
            color: var(--color-success);
          }

          .health-score.watch {
            color: var(--color-accent);
          }

          .health-score.risk {
            color: var(--color-danger);
          }

          .health-items {
            display: grid;
            gap: 14px;
            padding: 20px 18px;
          }

          .health-item-head {
            display: flex;
            justify-content: space-between;
            gap: 10px;
            margin-bottom: 6px;
          }

          .health-item-head span {
            color: var(--color-text-muted);
            font-size: 10px;
          }

          .health-item-head strong {
            color: var(--color-text);
            font-size: 10px;
          }

          .health-bar {
            width: 100%;
            height: 6px;
            overflow: hidden;
            border-radius: 99px;
            background: var(--color-bg);
          }

          .health-bar-fill {
            height: 100%;
            border-radius: inherit;
            background: var(--color-success);
          }

          .health-bar-fill.watch {
            background: var(--color-accent);
          }

          .health-bar-fill.risk {
            background: var(--color-danger);
          }

          .health-item small {
            display: block;
            margin-top: 5px;
            color: var(--color-text-muted);
            font-size: 9px;
            line-height: 1.4;
          }

          .health-message {
            display: flex;
            gap: 9px;
            margin: 0 18px 18px;
            padding: 11px;
            border: 1px solid var(--color-border);
            border-radius: 9px;
            background: var(--color-bg);
          }

          .health-message-icon {
            flex: 0 0 auto;
            color: var(--color-success);
          }

          .health-message strong {
            display: block;
            margin-bottom: 2px;
            color: var(--color-text);
            font-size: 10px;
          }

          .health-message span {
            display: block;
            color: var(--color-text-muted);
            font-size: 9px;
            line-height: 1.45;
          }

          .dashboard-lower-grid,
          .dashboard-insights-grid,
          .dashboard-bottom-grid,
          .dashboard-footer-grid {
            display: grid;
            grid-template-columns:
              minmax(0, 1.5fr)
              minmax(300px, .8fr);
            gap: 14px;
            margin-bottom: 14px;
          }

          .orders-panel,
          .quick-actions-panel,
          .insight-panel,
          .business-health-panel,
          .activity-panel,
          .top-customers-panel,
          .attention-panel,
          .dashboard-table-panel {
            min-width: 0;
            overflow: hidden;
            border: 1px solid var(--color-border);
            border-radius: 14px;
            background: var(--color-card);
            box-shadow: var(--shadow-sm);
          }

          .priority-list {
            margin-top: 14px;
            border-top: 1px solid var(--color-border);
          }

          .priority-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 14px;
            padding: 12px 18px;
            border-bottom: 1px solid var(--color-border);
          }

          .priority-row:last-child {
            border-bottom: 0;
          }

          .priority-main {
            min-width: 0;
            display: flex;
            align-items: center;
            gap: 9px;
          }

          .priority-avatar,
          .customer-ranking-avatar {
            width: 31px;
            height: 31px;
            flex: 0 0 auto;
            display: grid;
            place-items: center;
            border-radius: 50%;
            background: var(--color-bg);
            color: var(--color-text);
            font-size: 10px;
            font-weight: 750;
          }

          .priority-copy {
            min-width: 0;
          }

          .priority-copy strong {
            display: block;
            overflow: hidden;
            color: var(--color-text);
            font-size: 11px;
            font-weight: 680;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .priority-copy span {
            display: block;
            margin-top: 2px;
            overflow: hidden;
            color: var(--color-text-muted);
            font-size: 9px;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .priority-meta {
            display: flex;
            align-items: center;
            gap: 16px;
          }

          .priority-meta > div {
            min-width: 70px;
          }

          .priority-meta span,
          .priority-meta strong {
            display: block;
          }

          .priority-meta span {
            margin-bottom: 2px;
            color: var(--color-text-muted);
            font-size: 8px;
          }

          .priority-meta strong {
            color: var(--color-text);
            font-size: 9px;
            font-weight: 700;
          }

          .danger-text,
          .amount-due {
            color: var(--color-danger) !important;
          }

          .positive-text,
          .amount-paid {
            color: var(--color-success) !important;
          }

          .row-action {
            min-height: 28px;
            padding: 0 8px;
            border: 1px solid var(--color-border);
            border-radius: 6px;
            background: var(--color-bg);
            color: var(--color-text);
            font: inherit;
            font-size: 9px;
            font-weight: 650;
            cursor: pointer;
          }

          .row-action:hover:not(:disabled) {
            border-color: var(--color-accent);
            color: var(--color-accent);
          }

          .row-action:disabled {
            cursor: default;
            opacity: .55;
          }

          .quick-actions {
            display: grid;
            gap: 7px;
            padding: 16px 18px 18px;
          }

          .quick-action {
            width: 100%;
            min-width: 0;
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 11px;
            border: 1px solid var(--color-border);
            border-radius: 9px;
            background: var(--color-bg);
            color: var(--color-text);
            text-align: left;
            text-decoration: none;
            cursor: pointer;
            transition:
              border-color .16s ease,
              transform .16s ease;
          }

          .quick-action:hover {
            transform: translateY(-1px);
            border-color: var(--color-accent);
          }

          .quick-action-icon {
            width: 31px;
            height: 31px;
            flex: 0 0 auto;
            display: grid;
            place-items: center;
            border-radius: 8px;
            background: var(--color-card);
            color: var(--color-accent);
          }

          .quick-action > span:nth-child(2) {
            min-width: 0;
            flex: 1;
          }

          .quick-action strong,
          .quick-action small {
            display: block;
          }

          .quick-action strong {
            font-size: 10px;
            font-weight: 700;
          }

          .quick-action small {
            margin-top: 2px;
            overflow: hidden;
            color: var(--color-text-muted);
            font-size: 8px;
            line-height: 1.35;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .quick-action > svg {
            flex: 0 0 auto;
            color: var(--color-text-muted);
          }

          .panel-empty {
            min-height: 190px;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-direction: column;
            gap: 5px;
            padding: 25px;
            text-align: center;
          }

          .panel-empty.compact {
            min-height: 140px;
          }

          .panel-empty-icon {
            width: 42px;
            height: 42px;
            display: grid;
            place-items: center;
            margin-bottom: 5px;
            border-radius: 50%;
            background: var(--color-bg);
            color: var(--color-success);
          }

      .panel-empty strong {
            color: var(--color-text);
            font-size: 11px;
          }

          .panel-empty span {
            max-width: 310px;
            color: var(--color-text-muted);
            font-size: 9px;
            line-height: 1.5;
          }

          .customer-momentum {
            display: grid;
            grid-template-columns:
              repeat(3, minmax(0, 1fr));
            gap: 7px;
            margin: 16px 18px;
          }

          .momentum-stat {
            padding: 10px;
            border: 1px solid var(--color-border);
            border-radius: 8px;
            background: var(--color-bg);
          }

          .momentum-stat span,
          .momentum-stat small {
            display: block;
            color: var(--color-text-muted);
            font-size: 8px;
          }

          .momentum-stat strong {
            display: block;
            margin: 4px 0;
            color: var(--color-text);
            font-size: 16px;
          }

          .customer-bars {
            display: grid;
            gap: 8px;
            padding: 0 18px 18px;
          }

          .customer-bar-row {
            display: grid;
            grid-template-columns: 35px minmax(0, 1fr) 25px;
            align-items: center;
            gap: 8px;
            padding: 0;
            border: 0;
            background: transparent;
            color: var(--color-text-muted);
            font: inherit;
            font-size: 8px;
            text-align: left;
            cursor: pointer;
          }

          .customer-bar-row strong {
            color: var(--color-text);
            font-size: 8px;
            text-align: right;
          }

          .mini-bar-track,
          .pipeline-track {
            height: 5px;
            overflow: hidden;
            border-radius: 99px;
            background: var(--color-bg);
          }

          .mini-bar-fill,
          .pipeline-fill {
            height: 100%;
            border-radius: inherit;
            background: var(--color-accent);
          }

          .pipeline {
            display: grid;
            gap: 14px;
            padding: 20px 18px 12px;
          }

          .pipeline-row {
            display: grid;
            grid-template-columns: 105px minmax(0, 1fr) 25px;
            align-items: center;
            gap: 9px;
          }

          .pipeline-label {
            display: flex;
            align-items: center;
            gap: 6px;
            min-width: 0;
          }

          .pipeline-label strong {
            overflow: hidden;
            color: var(--color-text);
            font-size: 9px;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .pipeline-dot {
            width: 6px;
            height: 6px;
            flex: 0 0 auto;
            border-radius: 50%;
            background: var(--color-accent);
          }

          .pipeline-count {
            color: var(--color-text);
            font-size: 9px;
            font-weight: 700;
            text-align: right;
          }

          .pipeline-footer {
            display: flex;
            justify-content: space-between;
            gap: 10px;
            margin: 0 18px 18px;
            padding-top: 10px;
            border-top: 1px solid var(--color-border);
            color: var(--color-text-muted);
            font-size: 8px;
          }

          .health-grid {
            display: grid;
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
            gap: 10px;
            padding: 18px;
          }

          .health-card {
            padding: 11px;
            border: 1px solid var(--color-border);
            border-radius: 9px;
            background: var(--color-bg);
          }

          .health-card-head {
            display: flex;
            justify-content: space-between;
            gap: 7px;
          }

          .health-card-head span {
            color: var(--color-text-muted);
            font-size: 8px;
          }

          .health-card-head strong {
            color: var(--color-text);
            font-size: 9px;
          }

          .health-card .health-bar {
            margin-top: 8px;
          }

          .health-card small {
            display: block;
            margin-top: 5px;
            color: var(--color-text-muted);
            font-size: 8px;
          }

          .health-summary {
            display: flex;
            gap: 9px;
            margin: 0 18px 18px;
            padding: 11px;
            border: 1px solid var(--color-border);
            border-radius: 9px;
            background: var(--color-bg);
          }

          .health-summary-icon {
            flex: 0 0 auto;
            color: var(--color-success);
          }

          .health-summary strong {
            display: block;
            color: var(--color-text);
            font-size: 9px;
          }

          .health-summary p {
            margin: 3px 0 0;
            color: var(--color-text-muted);
            font-size: 8px;
            line-height: 1.45;
          }

          .activity-list {
            margin-top: 14px;
            border-top: 1px solid var(--color-border);
          }

          .activity-item {
            display: flex;
            align-items: center;
            gap: 9px;
            padding: 11px 18px;
            border-bottom: 1px solid var(--color-border);
          }

          .activity-item:last-child {
            border-bottom: 0;
            }
            
            .activity-icon {
            width: 29px;
            height: 29px;
            flex: 0 0 auto;
            display: grid;
            place-items: center;
            border-radius: 8px;
            background: var(--color-bg);
            color: var(--color-accent);
          }

          .activity-copy {
            min-width: 0;
            flex: 1;
          }

          .activity-copy strong {
            display: block;
            overflow: hidden;
            color: var(--color-text);
            font-size: 9px;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .activity-copy span {
            display: block;
            margin-top: 2px;
            overflow: hidden;
            color: var(--color-text-muted);
            font-size: 8px;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .activity-item time {
            flex: 0 0 auto;
            color: var(--color-text-muted);
            font-size: 8px;
          }

          .daily-table-wrap {
            overflow-x: auto;
            margin-top: 15px;
            border-top: 1px solid var(--color-border);
          }

          .daily-table {
            width: 100%;
            min-width: 720px;
            border-collapse: collapse;
          }

          .daily-table th,
          .daily-table td {
            padding: 10px 14px;
            border-bottom: 1px solid var(--color-border);
            text-align: left;
            white-space: nowrap;
          }

          .daily-table th {
            color: var(--color-text-muted);
            background: var(--color-bg);
            font-size: 8px;
            font-weight: 750;
            letter-spacing: .04em;
            text-transform: uppercase;
          }

          .daily-table td {
            color: var(--color-text-muted);
            font-size: 9px;
          }

          .daily-table td strong {
            color: var(--color-text);
            font-size: 9px;
          }

          .daily-table tbody tr {
            cursor: pointer;
            transition: background .15s ease;
          }

          .daily-table tbody tr:hover,
          .daily-table tbody tr.selected-day {
            background: var(--color-bg);
          }

          .table-money {
            color: var(--color-text) !important;
            font-weight: 650;
          }

          .table-activity {
            display: flex;
            align-items: center;
            gap: 7px;
          }

          .table-activity-track {
            width: 65px;
            height: 4px;
            overflow: hidden;
            border-radius: 99px;
            background: var(--color-bg);
          }

          .table-activity-fill {
            display: block;
            height: 100%;
            border-radius: inherit;
            background: var(--color-accent);
          }

          .table-activity small {
            color: var(--color-text-muted);
            font-size: 8px;
          }

          .table-empty {
            padding: 35px !important;
            color: var(--color-text-muted) !important;
            text-align: center !important;
          }

          .period-controls {
            display: flex;
            gap: 3px;
            padding: 3px;
            border: 1px solid var(--color-border);
            border-radius: 8px;
            background: var(--color-bg);
          }

          .period-button {
            padding: 6px 8px;
            border: 0;
            border-radius: 5px;
            background: transparent;
            color: var(--color-text-muted);
            font: inherit;
            font-size: 8px;
            cursor: pointer;
          }

          .period-button.selected {
            background: var(--color-card);
            color: var(--color-text);
            box-shadow: var(--shadow-sm);
          }

          .customer-ranking {
            margin-top: 14px;
            border-top: 1px solid var(--color-border);
          }

          .customer-ranking-row {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 10px 18px;
            border-bottom: 1px solid var(--color-border);
          }

          .customer-rank {
            width: 15px;
            color: var(--color-text-muted);
            font-size: 8px;
            font-weight: 700;
            text-align: center;
          }

          .customer-ranking-copy {
            min-width: 0;
            flex: 1;
          }

          .customer-ranking-copy strong,
          .customer-ranking-copy span {
            display: block;
          }

          .customer-ranking-copy strong {
            overflow: hidden;
            color: var(--color-text);
            font-size: 9px;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .customer-ranking-copy span {
            margin-top: 2px;
            color: var(--color-text-muted);
            font-size: 8px;
          }

          .customer-ranking-value {
            color: var(--color-text);
            font-size: 9px;
          }

          .attention-list {
            display: grid;
            gap: 7px;
            padding: 16px 18px 18px;
          }

          .attention-item {
            display: flex;
            align-items: center;
            gap: 9px;
            padding: 10px;
            border: 1px solid var(--color-border);
            border-radius: 9px;
            background: var(--color-bg);
            color: var(--color-text);
            text-decoration: none;
          }

          .attention-item:hover {
            border-color: var(--color-accent);
          }

          .attention-icon {
            width: 29px;
            height: 29px;
            flex: 0 0 auto;
            display: grid;
            place-items: center;
            border-radius: 8px;
            background: var(--color-card);
            color: var(--color-accent);
          }

          .attention-icon.danger {
            color: var(--color-danger);
          }

          .attention-icon.warning {
            color: var(--color-accent);
          }

          .attention-item > span:nth-child(2) {
            min-width: 0;
            flex: 1;
          }

          .attention-item strong,
          .attention-item small {
            display: block;
          }

          .attention-item strong {
            color: var(--color-text);
            font-size: 10px;
          }

          .attention-item small {
            margin-top: 2px;
            color: var(--color-text-muted);
            font-size: 8px;
          }

          .attention-item > svg {
            flex: 0 0 auto;
            color: var(--color-text-muted);
          }

          .dashboard-modal-backdrop {
            position: fixed;
            z-index: 1000;
            inset: 0;
            display: grid;
            place-items: center;
            padding: 20px;
            background: rgba(0, 0, 0, .48);
            backdrop-filter: blur(5px);
          }

          .dashboard-modal {
            width: min(100%, 470px);
            max-height: calc(100vh - 40px);
            overflow-y: auto;
            border: 1px solid var(--color-border);
            border-radius: 15px;
            background: var(--color-card);
            color: var(--color-text);
            box-shadow: 0 25px 80px rgba(0, 0, 0, .25);
          }

          .dashboard-modal-header {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 15px;
            padding: 18px;
            border-bottom: 1px solid var(--color-border);
          }

          .dashboard-modal-header h2 {
            margin: 0 0 4px;
            font-size: 15px;
                    }

                      .dashboard-modal-header p {
            margin: 0;
            color: var(--color-text-muted);
            font-size: 9px;
            line-height: 1.5;
          }

          .modal-close {
            width: 29px;
            height: 29px;
            display: grid;
            place-items: center;
            border: 1px solid var(--color-border);
            border-radius: 7px;
            background: var(--color-bg);
            color: var(--color-text-muted);
            font-size: 18px;
            cursor: pointer;
          }

          .dashboard-modal form {
            padding: 18px;
          }

          .modal-form-grid {
            display: grid;
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
            gap: 12px;
          }

          .modal-field.full {
            grid-column: 1 / -1;
          }

          .modal-field label {
            display: block;
            margin-bottom: 5px;
            color: var(--color-text);
            font-size: 9px;
            font-weight: 700;
          }

          .modal-field input,
          .modal-field select,
          .modal-field textarea {
            width: 100%;
            box-sizing: border-box;
            padding: 9px 10px;
            border: 1px solid var(--color-border);
            border-radius: 8px;
            outline: none;
            background: var(--color-bg);
            color: var(--color-text);
            font: inherit;
            font-size: 10px;
          }

          .modal-field textarea {
            min-height: 70px;
            resize: vertical;
          }

          .modal-field input:focus,
          .modal-field select:focus,
          .modal-field textarea:focus {
            border-color: var(--color-accent);
            box-shadow:
              0 0 0 3px
              color-mix(
                in srgb,
                var(--color-accent) 14%,
                transparent
              );
          }

          .modal-error {
            margin-bottom: 12px;
            padding: 9px 10px;
            border: 1px solid var(--color-danger);
            border-radius: 7px;
            background: color-mix(
              in srgb,
              var(--color-danger) 8%,
              transparent
            );
            color: var(--color-danger);
            font-size: 9px;
          }

          .modal-footer {
            display: flex;
            justify-content: flex-end;
            gap: 7px;
            margin-top: 17px;
            padding-top: 14px;
            border-top: 1px solid var(--color-border);
          }

          @media (max-width: 1050px) {
            .dashboard-overview {
              grid-template-columns:
                repeat(2, minmax(0, 1fr));
            }

            .dashboard-primary-grid,
            .dashboard-lower-grid,
            .dashboard-insights-grid,
            .dashboard-bottom-grid,
            .dashboard-footer-grid {
              grid-template-columns: 1fr;
            }
          }

          @media (max-width: 720px) {
            .dashboard-page {
              padding: 16px;
            }

            .dashboard-header {
              flex-direction: column;
            }

            .dashboard-actions {
              width: 100%;
            }

            .dashboard-actions > * {
              flex: 1;
            }

            .analytics-summary,
            .customer-momentum,
            .health-grid {
              grid-template-columns: 1fr;
            }

            .priority-row {
              align-items: flex-start;
              flex-direction: column;
            }

            .priority-meta {
              width: 100%;
              justify-content: space-between;
            }

            .panel-header {
              flex-direction: column;
            }

            .panel-link {
              align-self: flex-start;
            }
          }

          @media (max-width: 500px) {
            .dashboard-overview {
              grid-template-columns: 1fr;
            }

            .modal-form-grid {
              grid-template-columns: 1fr;
            }

            .modal-field.full {
              grid-column: auto;
            }

            .dashboard-period {
              width: 100%;
            }

            .dashboard-period button {
              flex: 1;
            }

            .chart-bars {
              gap: 4px;
            }

            .chart-column-label {
              font-size: 7px;
            }
          }

        `}</style>

      </div>
    </div>
  )
}
