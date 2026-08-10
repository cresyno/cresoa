'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../../../lib/supabaseClient'
import { getCurrentBusinessId } from '../../../../lib/getBusinessId'
import { getPlanLimits } from '../../../../lib/planLimits'
import { Icon } from '../../../../components/Icon'

const STATUS_OPTIONS = [
  {
    value: 'Order placed',
    label: 'Order placed',
    description: 'New order received',
    icon: 'inbox',
  },
  {
    value: 'Cutting',
    label: 'Cutting',
    description: 'Fabric is being cut',
    icon: 'scissors',
  },
  {
    value: 'Sewing',
    label: 'Sewing',
    description: 'Garment is being sewn',
    icon: 'sewing',
  },
  {
    value: 'Ready',
    label: 'Ready',
    description: 'Ready for collection',
    icon: 'check-circle',
  },
  {
    value: 'Delivered',
    label: 'Delivered',
    description: 'Customer has received it',
    icon: 'package',
  },
]

const INITIAL_FORM = {
  customer_id: '',
  customer_name: '',
  customer_phone: '',
  customer_email: '',
  title: '',
  price: '',
  amount_paid: '',
  due_date: '',
  current_status: 'Order placed',
  notes: '',
}

export default function NewOrderPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [businessId, setBusinessId] = useState(null)
  const [businessPlan, setBusinessPlan] = useState('free')
  const [customers, setCustomers] = useState([])
  const [orderCount, setOrderCount] = useState(0)
  const [isNewCustomer, setIsNewCustomer] = useState(false)
  const [showCustomerList, setShowCustomerList] = useState(false)
  const [customerSearch, setCustomerSearch] = useState('')

  const [formData, setFormData] = useState(INITIAL_FORM)

  useEffect(() => {
    let mounted = true

    const load = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          router.push('/login')
          return
        }

        const queryBusinessId = searchParams.get('business_id')
        const bizId = queryBusinessId || getCurrentBusinessId()

        if (!bizId) {
          router.push('/dashboard')
          return
        }

        if (!mounted) return
        setBusinessId(bizId)

        const { data: bizData, error: businessError } = await supabase
          .from('businesses')
          .select('plan')
          .eq('id', bizId)
          .single()

        if (businessError && businessError.code !== 'PGRST116') {
          throw businessError
        }

        if (mounted && bizData) {
          setBusinessPlan(bizData.plan || 'free')
        }

        const { data: customerData, error: customerError } =
          await supabase
            .from('customers')
            .select('id, name, phone, email')
            .eq('business_id', bizId)
            .order('name')

        if (customerError) throw customerError

        if (mounted) {
          setCustomers(customerData || [])
        }

        const { count, error: countError } = await supabase
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .eq('business_id', bizId)

        if (countError) throw countError

        if (mounted) {
          setOrderCount(count || 0)
        }
      } catch (err) {
        console.error('New order load error:', err)

        if (mounted) {
          setError('We could not load your order form. Please try again.')
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    load()

    return () => {
      mounted = false
    }
  }, [router, searchParams])

  const limits = useMemo(
    () => getPlanLimits(businessPlan),
    [businessPlan]
  )

  const filteredCustomers = useMemo(() => {
    const query = customerSearch.trim().toLowerCase()

    if (!query) {
      return customers.slice(0, 8)
    }

    return customers
      .filter((customer) => {
        const name = customer.name || ''
        const phone = customer.phone || ''
        const email = customer.email || ''

        return (
          name.toLowerCase().includes(query) ||
          phone.toLowerCase().includes(query) ||
          email.toLowerCase().includes(query)
        )
      })
      .slice(0, 8)
  }, [customers, customerSearch])

  const selectedCustomer = useMemo(() => {
    if (!formData.customer_id) return null

    return (
      customers.find(
        (customer) => customer.id === formData.customer_id
      ) || null
    )
  }, [customers, formData.customer_id])

  const remainingBalance = useMemo(() => {
    const price = Number(formData.price) || 0
    const paid = Number(formData.amount_paid) || 0

    return Math.max(price - paid, 0)
  }, [formData.price, formData.amount_paid])

  const formattedRemainingBalance = useMemo(() => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      maximumFractionDigits: 0,
    }).format(remainingBalance)
  }, [remainingBalance])

  const formattedOrderCount = useMemo(() => {
    if (limits.orders === Infinity) {
      return `${orderCount} orders`
    }

    return `${orderCount} of ${limits.orders} orders`
  }, [limits.orders, orderCount])

  const handleChange = (event) => {
    const { name, value } = event.target

    setFormData((current) => ({
      ...current,
      [name]: value,
    }))

    if (error) {
      setError(null)
    }
  }

  const handleCustomerSelect = (customer) => {
    setIsNewCustomer(false)
    setShowCustomerList(false)
    setCustomerSearch('')

    setFormData((current) => ({
      ...current,
      customer_id: customer.id,
      customer_name: customer.name || '',
      customer_phone: customer.phone || '',
      customer_email: customer.email || '',
    }))

    setError(null)
  }

  const handleCreateCustomer = () => {
    setIsNewCustomer(true)
    setShowCustomerList(false)
    setCustomerSearch('')

    setFormData((current) => ({
      ...current,
      customer_id: '',
      customer_name: '',
      customer_phone: '',
      customer_email: '',
    }))

    setError(null)
  }

  const handleClearCustomer = () => {
    setIsNewCustomer(false)
    setShowCustomerList(false)
    setCustomerSearch('')

    setFormData((current) => ({
      ...current,
      customer_id: '',
      customer_name: '',
      customer_phone: '',
      customer_email: '',
    }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError(null)

    try {
      if (!businessId) {
        throw new Error('No business selected.')
      }

      if (orderCount >= limits.orders) {
        throw new Error(
          `You have reached the ${limits.orders} order limit on your current plan. Please upgrade to create another order.`
        )
      }

      const title = formData.title.trim()

      if (!title) {
        throw new Error('Enter the garment or order name.')
      }

      const price = Number(formData.price)

      if (!Number.isFinite(price) || price <= 0) {
        throw new Error('Enter a valid total price.')
      }

      const amountPaid = Number(formData.amount_paid) || 0

      if (amountPaid < 0) {
        throw new Error('Deposit cannot be negative.')
      }

      if (amountPaid > price) {
        throw new Error(
          'The deposit cannot be greater than the total price.'
        )
      }

      if (isNewCustomer && !formData.customer_name.trim()) {
        throw new Error('Enter the new customer’s name.')
      }

      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        router.push('/login')
        return
      }

      const payload = {
        business_id: businessId,
        title,
        price,
        amount_paid: amountPaid,
        due_date: formData.due_date || null,
        current_status: formData.current_status,
        notes: formData.notes.trim() || null,
      }

      if (isNewCustomer) {
        payload.customer_name = formData.customer_name.trim()
        payload.customer_phone =
          formData.customer_phone.trim() || null
        payload.customer_email =
          formData.customer_email.trim() || null
      } else if (formData.customer_id) {
        payload.customer_id = formData.customer_id
      }

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(payload),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(
          result.error || 'Failed to create the order.'
        )
      }

      router.push(
        `/dashboard/orders?business_id=${businessId}`
      )
    } catch (err) {
      console.error('Create order error:', err)

      setError(
        err instanceof Error
          ? err.message
          : 'Something went wrong while creating the order.'
      )

      setSaving(false)
    }
  }

  const handleRetry = () => {
    window.location.reload()
  }

  if (loading) {
    return (
      <div className="page">
        <style>{`
          .page {
            min-height: 100vh;
            background: var(--color-bg);
            color: var(--color-text);
            padding: 20px 16px 120px;
          }

          .skeleton {
            max-width: 760px;
            margin: 0 auto;
          }

          .skeleton-bar {
            height: 14px;
            border-radius: 8px;
            background: var(--color-border);
            margin-bottom: 12px;
            animation: shimmer 1.4s ease-in-out infinite;
          }

          .skeleton-title {
            width: 190px;
            height: 30px;
            margin-bottom: 10px;
          }

          .skeleton-copy {
            width: 280px;
            height: 14px;
            margin-bottom: 28px;
          }

          .skeleton-card {
            height: 150px;
            border-radius: 18px;
            background: var(--color-card);
            border: 1px solid var(--color-border);
            box-shadow: var(--shadow);
            margin-bottom: 14px;
            animation: shimmer 1.4s ease-in-out infinite;
          }

          @keyframes shimmer {
            0%, 100% { opacity: .55; }
            50% { opacity: 1; }
          }
        `}</style>

        <div className="skeleton">
          <div className="skeleton-bar skeleton-title" />
          <div className="skeleton-bar skeleton-copy" />
          <div className="skeleton-card" />
          <div className="skeleton-card" />
          <div className="skeleton-card" />
        </div>
      </div>
    )
  }

  if (error && !businessId) {
    return (
      <div className="error-page">
        <style>{`
          .error-page {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 24px;
            background: var(--color-bg);
            color: var(--color-text);
          }

          .error-card {
            width: 100%;
            max-width: 420px;
            padding: 28px 22px;
            border: 1px solid var(--color-border);
            border-radius: 20px;
            background: var(--color-card);
            box-shadow: var(--shadow);
            text-align: center;
          }

          .error-icon {
            width: 52px;
            height: 52px;
            margin: 0 auto 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 16px;
            background: rgba(217, 83, 79, .10);
            color: var(--color-danger);
          }

          .error-title {
            margin: 0 0 8px;
            font-size: 20px;
            font-weight: 750;
          }

          .error-copy {
            margin: 0 0 20px;
            color: var(--color-text-muted);
            line-height: 1.55;
            font-size: 14px;
          }

          .retry {
            min-height: 46px;
            padding: 0 18px;
            border: 0;
            border-radius: 12px;
            background: var(--color-accent);
            color: var(--color-primary);
            font-weight: 750;
            cursor: pointer;
          }
        `}</style>

        <div className="error-card">
          <div className="error-icon">
            <Icon
              name="alert-circle"
              size={25}
              stroke="var(--color-danger)"
            />
          </div>

          <h1 className="error-title">
            We couldn’t load your order form
          </h1>

          <p className="error-copy">
            Something went wrong while loading your business data.
            Please try again.
          </p>

          <button
            type="button"
            className="retry"
            onClick={handleRetry}
          >
            Try again
          </button>
        </div>
      </div>
    )
  }

  return (

          <div className="new-order-page">
        <style>{`
          .new-order-page {
            --page-max: 760px;
            min-height: 100vh;
            background: var(--color-bg);
            color: var(--color-text);
            padding: 18px 16px 110px;
          }

          .new-order-shell {
            width: 100%;
            max-width: var(--page-max);
            margin: 0 auto;
          }

          .topbar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 14px;
            margin-bottom: 24px;
          }

          .back-button {
            width: 42px;
            height: 42px;
            flex: 0 0 42px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            border: 1px solid var(--color-border);
            border-radius: 12px;
            background: var(--color-card);
            color: var(--color-primary);
            box-shadow: var(--shadow-sm);
            cursor: pointer;
            transition: transform .16s ease,
              background .16s ease,
              border-color .16s ease;
          }

          .back-button:hover {
            background: var(--color-bg);
            border-color: var(--color-primary);
          }

          .back-button:active {
            transform: scale(.97);
          }

          .back-button:focus-visible {
            outline: 3px solid rgba(212, 165, 42, .32);
            outline-offset: 2px;
          }

          .topbar-copy {
            flex: 1;
            min-width: 0;
          }

          .eyebrow {
            margin: 0 0 3px;
            color: var(--color-text-muted);
            font-size: 11px;
            line-height: 1.3;
            font-weight: 750;
            letter-spacing: .08em;
            text-transform: uppercase;
          }

          .page-title {
            margin: 0;
            color: var(--color-primary);
            font-size: clamp(24px, 7vw, 32px);
            line-height: 1.08;
            letter-spacing: -.025em;
            font-weight: 800;
          }

          .order-counter {
            flex: 0 0 auto;
            min-height: 34px;
            display: inline-flex;
            align-items: center;
            gap: 7px;
            padding: 0 10px;
            border: 1px solid var(--color-border);
            border-radius: 999px;
            background: var(--color-card);
            color: var(--color-text-muted);
            font-size: 11px;
            font-weight: 700;
            white-space: nowrap;
          }

          .order-counter-dot {
            width: 7px;
            height: 7px;
            border-radius: 50%;
            background: var(--color-secondary);
          }

          .intro {
            margin: 0 0 22px;
            color: var(--color-text-muted);
            font-size: 14px;
            line-height: 1.55;
          }

          .form {
            display: flex;
            flex-direction: column;
            gap: 14px;
          }

          .card {
            padding: 18px 16px;
            border: 1px solid var(--color-border);
            border-radius: 18px;
            background: var(--color-card);
            box-shadow: var(--shadow);
          }

          .card-heading {
            display: flex;
            align-items: flex-start;
            gap: 12px;
            margin-bottom: 17px;
          }

          .card-icon {
            width: 38px;
            height: 38px;
            flex: 0 0 38px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 11px;
            background: rgba(15, 43, 74, .07);
            color: var(--color-primary);
          }

          .card-title {
            margin: 0 0 3px;
            font-size: 16px;
            line-height: 1.25;
            font-weight: 800;
            color: var(--color-primary);
          }

          .card-description {
            margin: 0;
            color: var(--color-text-muted);
            font-size: 12px;
            line-height: 1.45;
          }

          .field-group {
            display: flex;
            flex-direction: column;
            gap: 7px;
          }

          .field-group + .field-group {
            margin-top: 14px;
          }

          .field-label {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 8px;
            color: var(--color-text);
            font-size: 12px;
            line-height: 1.3;
            font-weight: 750;
          }

          .required {
            color: var(--color-danger);
          }

          .optional {
            color: var(--color-text-muted);
            font-size: 10px;
            font-weight: 600;
          }

          .field-input,
          .field-textarea {
            width: 100%;
            box-sizing: border-box;
            border: 1px solid var(--color-border);
            border-radius: 12px;
            background: var(--color-card);
            color: var(--color-text);
            font: inherit;
            font-size: 14px;
            transition: border-color .16s ease,
              box-shadow .16s ease,
              background .16s ease;
          }

          .field-input {
            min-height: 48px;
            padding: 0 13px;
          }

          .field-textarea {
            min-height: 108px;
            padding: 12px 13px;
            resize: vertical;
            line-height: 1.5;
          }

          .field-input::placeholder,
          .field-textarea::placeholder {
            color: var(--color-muted, #C8C0B5);
          }

          .field-input:hover,
          .field-textarea:hover {
            border-color: #cfc7bb;
          }

          .field-input:focus,
          .field-textarea:focus {
            border-color: var(--color-primary);
            outline: none;
            box-shadow: 0 0 0 3px rgba(15, 43, 74, .08);
          }

          .field-help {
            margin: 0;
            color: var(--color-text-muted);
            font-size: 11px;
            line-height: 1.45;
          }

          .customer-tools {
            position: relative;
          }

          .customer-search-row {
            display: flex;
            gap: 8px;
          }

          .customer-search {
            position: relative;
            flex: 1;
          }

          .customer-search-icon {
            position: absolute;
            left: 13px;
            top: 50%;
            transform: translateY(-50%);
            color: var(--color-text-muted);
            pointer-events: none;
          }

          .customer-search .field-input {
            padding-left: 40px;
          }

          .new-customer-button {
            min-height: 48px;
            padding: 0 13px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            border: 1px solid var(--color-primary);
            border-radius: 12px;
            background: var(--color-primary);
            color: #fff;
            font-size: 12px;
            font-weight: 750;
            cursor: pointer;
            white-space: nowrap;
          }

          .new-customer-button:hover {
            background: var(--color-primary-light, #1A3F66);
          }

          .customer-results {
            position: absolute;
            z-index: 20;
            top: calc(100% + 7px);
            left: 0;
            right: 0;
            max-height: 300px;
            overflow-y: auto;
            padding: 6px;
            border: 1px solid var(--color-border);
            border-radius: 14px;
            background: var(--color-card);
            box-shadow: var(--shadow-lg);
          }

          .customer-result {
            width: 100%;
            min-height: 58px;
            display: flex;
            align-items: center;
            gap: 11px;
            padding: 8px 9px;
            border: 0;
            border-radius: 10px;
            background: transparent;
            color: var(--color-text);
            text-align: left;
            cursor: pointer;
          }

          .customer-result:hover {
            background: var(--color-bg);
          }

          .customer-avatar {
            width: 36px;
            height: 36px;
            flex: 0 0 36px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            background: rgba(212, 165, 42, .14);
            color: var(--color-primary);
            font-size: 12px;
            font-weight: 800;
          }

          .customer-result-copy {
            min-width: 0;
            flex: 1;
          }

          .customer-result-name {
            display: block;
            overflow: hidden;
            color: var(--color-text);
            font-size: 13px;
            font-weight: 750;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .customer-result-meta {
            display: block;
            margin-top: 2px;
            overflow: hidden;
            color: var(--color-text-muted);
            font-size: 11px;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .empty-results {
            padding: 18px 12px;
            color: var(--color-text-muted);
            font-size: 12px;
            line-height: 1.5;
            text-align: center;
          }

          .selected-customer {
            display: flex;
            align-items: center;
            gap: 11px;
            padding: 11px;
            border: 1px solid rgba(46, 125, 94, .24);
            border-radius: 13px;
            background: rgba(46, 125, 94, .055);
          }

          .selected-customer-copy {
            flex: 1;
            min-width: 0;
          }

          .selected-customer-name {
            margin: 0 0 3px;
            overflow: hidden;
            color: var(--color-text);
            font-size: 13px;
            font-weight: 800;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .selected-customer-meta {
            margin: 0;
            overflow: hidden;
            color: var(--color-text-muted);
            font-size: 11px;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .clear-customer {
            width: 34px;
            height: 34px;
            flex: 0 0 34px;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 1px solid var(--color-border);
            border-radius: 9px;
            background: var(--color-card);
            color: var(--color-text-muted);
            cursor: pointer;
          }

          .clear-customer:hover {
            color: var(--color-danger);
            border-color: var(--color-danger);
          }

          .customer-new-fields {
            margin-top: 13px;
          }

          .two-column {
            display: grid;
            grid-template-columns: 1fr;
            gap: 14px;
          }

          .price-summary {
            margin-top: 15px;
            padding: 13px;
            border-radius: 13px;
            background: var(--color-bg);
            border: 1px solid var(--color-border);
          }

          .price-summary-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 15px;
          }

          .price-summary-row + .price-summary-row {
            margin-top: 8px;
          }

          .price-summary-label {
            color: var(--color-text-muted);
            font-size: 11px;
            font-weight: 650;
          }

          .price-summary-value {
            color: var(--color-text);
            font-size: 12px;
            font-weight: 800;
          }

          .price-summary-value.balance {
            color: var(--color-danger);
          }

          @media (min-width: 600px) {
            .new-order-page {
              padding: 30px 24px 100px;
            }

            .card {
              padding: 22px;
            }

            .two-column {
              grid-template-columns: 1fr 1fr;
            }

            .field-group + .field-group {
              margin-top: 0;
            }
          }
        `}</style>

        <main className="new-order-shell">
          <header className="topbar">
            <button
              type="button"
              className="back-button"
              onClick={() =>
                router.push(
                  `/dashboard/orders?business_id=${businessId}`
                )
              }
              aria-label="Back to orders"
            >
              <Icon
                name="arrow-left"
                size={19}
                stroke="var(--color-primary)"
              />
            </button>

            <div className="topbar-copy">
              <p className="eyebrow">Orders</p>
              <h1 className="page-title">New order</h1>
            </div>

            <div className="order-counter">
              <span className="order-counter-dot" />
              {formattedOrderCount}
            </div>
          </header>

          <p className="intro">
            Capture the customer, garment details, payment and
            delivery information in one simple flow.
          </p>

          <form
            className="form"
            onSubmit={handleSubmit}
            noValidate
          >
                          <section className="card" aria-labelledby="customer-heading">
              <div className="card-heading">
                <div className="card-icon" aria-hidden="true">
                  <Icon
                    name="user"
                    size={19}
                    stroke="var(--color-primary)"
                  />
                </div>

                <div>
                  <h2
                    id="customer-heading"
                    className="card-title"
                  >
                    Customer
                  </h2>

                  <p className="card-description">
                    Who is this order for?
                  </p>
                </div>
              </div>

              {selectedCustomer ? (
                <div className="selected-customer">
                  <div className="customer-avatar">
                    {(selectedCustomer.name || '?')
                      .trim()
                      .charAt(0)
                      .toUpperCase()}
                  </div>

                  <div className="selected-customer-copy">
                    <p className="selected-customer-name">
                      {selectedCustomer.name}
                    </p>

                    <p className="selected-customer-meta">
                      {selectedCustomer.phone ||
                        selectedCustomer.email ||
                        'Customer saved'}
                    </p>
                  </div>

                  <button
                    type="button"
                    className="clear-customer"
                    onClick={handleClearCustomer}
                    aria-label="Change customer"
                  >
                    <Icon
                      name="x"
                      size={16}
                      stroke="currentColor"
                    />
                  </button>
                </div>
              ) : (
                <div className="customer-tools">
                  <div className="customer-search-row">
                    <div className="customer-search">
                      <span
                        className="customer-search-icon"
                        aria-hidden="true"
                      >
                        <Icon
                          name="search"
                          size={17}
                          stroke="currentColor"
                        />
                      </span>

                      <input
                        type="text"
                        className="field-input"
                        value={customerSearch}
                        onChange={(event) => {
                          setCustomerSearch(event.target.value)
                          setShowCustomerList(true)
                        }}
                        onFocus={() =>
                          setShowCustomerList(true)
                        }
                        placeholder="Search customers"
                        aria-label="Search customers"
                        autoComplete="off"
                      />
                    </div>

                    <button
                      type="button"
                      className="new-customer-button"
                      onClick={handleCreateCustomer}
                    >
                      <Icon
                        name="plus"
                        size={15}
                        stroke="currentColor"
                      />
                      New
                    </button>
                  </div>

                  {showCustomerList && (
                    <div
                      className="customer-results"
                      role="listbox"
                      aria-label="Customer results"
                    >
                      {filteredCustomers.length > 0 ? (
                        filteredCustomers.map((customer) => (
                          <button
                            key={customer.id}
                            type="button"
                            className="customer-result"
                            onClick={() =>
                              handleCustomerSelect(customer)
                            }
                          >
                            <span className="customer-avatar">
                              {(customer.name || '?')
                                .trim()
                                .charAt(0)
                                .toUpperCase()}
                            </span>

                            <span className="customer-result-copy">
                              <span className="customer-result-name">
                                {customer.name}
                              </span>

                              <span className="customer-result-meta">
                                {customer.phone ||
                                  customer.email ||
                                  'No contact details'}
                              </span>
                            </span>

                            <Icon
                              name="chevron-right"
                              size={15}
                              stroke="var(--color-text-muted)"
                            />
                          </button>
                        ))
                      ) : (
                        <div className="empty-results">
                          No matching customers found.
                          <br />
                          Use <strong>New</strong> to create one.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {isNewCustomer && (
                <div className="customer-new-fields">
                  <div className="field-group">
                    <label
                      className="field-label"
                      htmlFor="customer_name"
                    >
                      Customer name
                      <span className="required">*</span>
                    </label>

                    <input
                      id="customer_name"
                      name="customer_name"
                      type="text"
                      className="field-input"
                      value={formData.customer_name}
                      onChange={handleChange}
                      placeholder="e.g. Amaka Okafor"
                      autoComplete="name"
                      required
                    />
                  </div>

                  <div className="two-column">
                    <div className="field-group">
                      <label
                        className="field-label"
                        htmlFor="customer_phone"
                      >
                        Phone
                        <span className="optional">
                          Optional
                        </span>
                      </label>

                      <input
                        id="customer_phone"
                        name="customer_phone"
                        type="tel"
                        className="field-input"
                        value={formData.customer_phone}
                        onChange={handleChange}
                        placeholder="080..."
                        autoComplete="tel"
                      />
                    </div>

                    <div className="field-group">
                      <label
                        className="field-label"
                        htmlFor="customer_email"
                      >
                        Email
                        <span className="optional">
                          Optional
                        </span>
                      </label>

                      <input
                        id="customer_email"
                        name="customer_email"
                        type="email"
                        className="field-input"
                        value={formData.customer_email}
                        onChange={handleChange}
                        placeholder="customer@email.com"
                        autoComplete="email"
                      />
                    </div>
                  </div>
                </div>
              )}
            </section>

            <section
              className="card"
              aria-labelledby="garment-heading"
            >
              <div className="card-heading">
                <div className="card-icon" aria-hidden="true">
                  <Icon
                    name="scissors"
                    size={19}
                    stroke="var(--color-primary)"
                  />
                </div>

                <div>
                  <h2
                    id="garment-heading"
                    className="card-title"
                  >
                    Garment details
                  </h2>

                  <p className="card-description">
                    Give the order a clear name your team will
                    recognise.
                  </p>
                </div>
              </div>

              <div className="field-group">
                <label
                  className="field-label"
                  htmlFor="title"
                >
                  Garment / order name
                  <span className="required">*</span>
                </label>

                <input
                  id="title"
                  name="title"
                  type="text"
                  className="field-input"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="e.g. Navy senator for wedding"
                  maxLength={120}
                  required
                />

                <p className="field-help">
                  Use something specific enough to find quickly
                  later.
                </p>
              </div>

              <div className="field-group">
                <label
                  className="field-label"
                  htmlFor="notes"
                >
                  Order notes
                  <span className="optional">
                    Optional
                  </span>
                </label>

                <textarea
                  id="notes"
                  name="notes"
                  className="field-textarea"
                  value={formData.notes}
                  onChange={handleChange}
                  placeholder="Style details, fabric instructions, fitting notes, or anything your team should remember..."
                  maxLength={2000}
                />
              </div>
            </section>

            <section
              className="card"
              aria-labelledby="payment-heading"
            >
              <div className="card-heading">
                <div className="card-icon" aria-hidden="true">
                  <Icon
                    name="wallet"
                    size={19}
                    stroke="var(--color-primary)"
                  />
                </div>

                <div>
                  <h2
                    id="payment-heading"
                    className="card-title"
                  >
                    Price & payment
                  </h2>

                  <p className="card-description">
                    Keep the amount owed and deposit clear.
                  </p>
                </div>
              </div>

              <div className="two-column">
                <div className="field-group">
                  <label
                    className="field-label"
                    htmlFor="price"
                  >
                    Total price
                    <span className="required">*</span>
                  </label>

                  <input
                    id="price"
                    name="price"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="100"
                    className="field-input"
                    value={formData.price}
                    onChange={handleChange}
                    placeholder="0"
                    required
                  />
                </div>

                <div className="field-group">
                  <label
                    className="field-label"
                    htmlFor="amount_paid"
                  >
                    Deposit paid
                    <span className="optional">
                      Optional
                    </span>
                  </label>

                  <input
                    id="amount_paid"
                    name="amount_paid"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="100"
                    className="field-input"
                    value={formData.amount_paid}
                    onChange={handleChange}
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="price-summary">
                <div className="price-summary-row">
                  <span className="price-summary-label">
                    Balance remaining
                  </span>

                  <span className="price-summary-value balance">
                    {formattedRemainingBalance}
                  </span>
                </div>
              </div>
            </section>

            <section
              className="card"
              aria-labelledby="schedule-heading"
            >
              <div className="card-heading">
                <div className="card-icon" aria-hidden="true">
                  <Icon
                    name="calendar"
                    size={19}
                    stroke="var(--color-primary)"
                  />
                </div>

                <div>
                  <h2
                    id="schedule-heading"
                    className="card-title"
                  >
                    Schedule
                  </h2>

                  <p className="card-description">
                    Set when the garment should be completed.
                  </p>
                </div>
              </div>

              <div className="field-group">
                <label
                  className="field-label"
                  htmlFor="due_date"
                >
                  Due date
                  <span className="optional">
                    Optional
                  </span>
                </label>

                <input
                  id="due_date"
                  name="due_date"
                  type="date"
                  className="field-input"
                  value={formData.due_date}
                  onChange={handleChange}
                />

                <p className="field-help">
                  Add the promised completion date so it is
                  visible when you manage your orders.
                </p>
              </div>
            </section>

            <section
              className="card"
              aria-labelledby="status-heading"
            >
              <div className="card-heading">
                <div className="card-icon" aria-hidden="true">
                  <Icon
                    name="activity"
                    size={19}
                    stroke="var(--color-primary)"
                  />
                </div>

                <div>
                  <h2
                    id="status-heading"
                    className="card-title"
                  >
                    Starting status
                  </h2>

                  <p className="card-description">
                    Where is this order right now?
                  </p>
                </div>
              </div>

              <div
                className="status-options"
                role="radiogroup"
                aria-label="Order status"
              >
                {STATUS_OPTIONS.map((status) => {
                  const active =
                    formData.current_status === status.value

                  return (
                    <button
                      key={status.value}
                      type="button"
                      className={`status-option ${
                        active ? 'active' : ''
                      }`}
                      onClick={() =>
                        setFormData((current) => ({
                          ...current,
                          current_status: status.value,
                        }))
                      }
                      role="radio"
                      aria-checked={active}
                    >
                      <span className="status-option-icon">
                        <Icon
                          name={status.icon}
                          size={16}
                          stroke="currentColor"
                        />
                      </span>

                      <span className="status-option-copy">
                        <span className="status-option-label">
                          {status.label}
                        </span>

                        <span className="status-option-description">
                          {status.description}
                        </span>
                      </span>

                      <span
                        className="status-radio"
                        aria-hidden="true"
                      >
                        {active && (
                          <span className="status-radio-dot" />
                        )}
                      </span>
                    </button>
                  )
                })}
              </div>
            </section>

            {error && (
              <div
                className="form-error"
                role="alert"
                aria-live="polite"
              >
                <div className="form-error-icon">
                  <Icon
                    name="alert-circle"
                    size={18}
                    stroke="var(--color-danger)"
                  />
                </div>

                <div className="form-error-copy">
                  <strong>Check the order details</strong>
                  <span>{error}</span>
                </div>
              </div>
            )}

            <div className="submit-area">
              <button
                type="submit"
                className="submit-button"
                disabled={saving}
              >
                {saving ? (
                  <>
                    <span
                      className="button-spinner"
                      aria-hidden="true"
                    />
                    Creating order...
                  </>
                ) : (
                  <>
                    <Icon
                      name="check"
                      size={18}
                      stroke="currentColor"
                    />
                    Create order
                  </>
                )}
              </button>

              <button
                type="button"
                className="cancel-button"
                disabled={saving}
                onClick={() =>
                  router.push(
                    `/dashboard/orders?business_id=${businessId}`
                  )
                }
              >
                Cancel
              </button>

              <p className="submit-help">
                You can update the order details and status later.
              </p>
            </div>
          </form>
        </main>

        <style>{`
          .status-options {
            display: flex;
            flex-direction: column;
            gap: 8px;
          }

          .status-option {
            width: 100%;
            min-height: 62px;
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 9px 11px;
            border: 1px solid var(--color-border);
            border-radius: 13px;
            background: var(--color-card);
            color: var(--color-text);
            text-align: left;
            cursor: pointer;
            transition:
              border-color .16s ease,
              background .16s ease,
              box-shadow .16s ease,
              transform .16s ease;
          }

          .status-option:hover {
            border-color: var(--color-primary);
            background: rgba(15, 43, 74, .025);
          }

          .status-option:active {
            transform: scale(.995);
          }

          .status-option.active {
            border-color: var(--color-accent);
            background: rgba(212, 165, 42, .07);
            box-shadow:
              0 0 0 2px rgba(212, 165, 42, .08);
          }

          .status-option:focus-visible {
            outline: 3px solid rgba(212, 165, 42, .28);
            outline-offset: 2px;
          }

          .status-option-icon {
            width: 34px;
            height: 34px;
            flex: 0 0 34px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 10px;
            background: var(--color-bg);
            color: var(--color-primary);
          }

          .status-option.active .status-option-icon {
            background: var(--color-accent);
            color: var(--color-primary);
          }

          .status-option-copy {
            flex: 1;
            min-width: 0;
            display: flex;
            flex-direction: column;
            gap: 2px;
          }

          .status-option-label {
            color: var(--color-text);
            font-size: 12px;
            line-height: 1.3;
            font-weight: 800;
          }

          .status-option-description {
            color: var(--color-text-muted);
            font-size: 10px;
            line-height: 1.35;
          }

          .status-radio {
            width: 19px;
            height: 19px;
            flex: 0 0 19px;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 1.5px solid var(--color-border);
            border-radius: 50%;
          }

          .status-option.active .status-radio {
            border-color: var(--color-accent);
          }

          .status-radio-dot {
            width: 9px;
            height: 9px;
            border-radius: 50%;
            background: var(--color-accent);
          }

          .form-error {
            display: flex;
            align-items: flex-start;
            gap: 11px;
            padding: 13px;
            border: 1px solid rgba(217, 83, 79, .25);
            border-radius: 14px;
            background: rgba(217, 83, 79, .06);
            color: var(--color-danger);
          }

          .form-error-icon {
            width: 30px;
            height: 30px;
            flex: 0 0 30px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 9px;
            background: rgba(217, 83, 79, .10);
          }

          .form-error-copy {
            min-width: 0;
            display: flex;
            flex-direction: column;
            gap: 3px;
          }

          .form-error-copy strong {
            color: var(--color-text);
            font-size: 12px;
            line-height: 1.35;
          }

          .form-error-copy span {
            color: var(--color-danger);
            font-size: 11px;
            line-height: 1.5;
          }

          .submit-area {
            display: flex;
            flex-direction: column;
            align-items: stretch;
            gap: 9px;
            padding-top: 4px;
          }

          .submit-button {
            width: 100%;
            min-height: 52px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            border: 0;
            border-radius: 14px;
            background: var(--color-accent);
            color: var(--color-primary);
            font-size: 14px;
            font-weight: 800;
            box-shadow: var(--shadow-md);
            cursor: pointer;
            transition:
              transform .16s ease,
              filter .16s ease,
              box-shadow .16s ease;
          }

          .submit-button:hover:not(:disabled) {
            filter: brightness(.94);
            box-shadow: var(--shadow-lg);
          }

          .submit-button:active:not(:disabled) {
            transform: translateY(1px);
          }

          .submit-button:focus-visible {
            outline: 3px solid rgba(212, 165, 42, .35);
            outline-offset: 3px;
          }

          .submit-button:disabled {
            opacity: .65;
            cursor: wait;
          }

          .button-spinner {
            width: 16px;
            height: 16px;
            border: 2px solid rgba(15, 43, 74, .25);
            border-top-color: var(--color-primary);
            border-radius: 50%;
            animation: spin .75s linear infinite;
          }

          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }

          .cancel-button {
            min-height: 44px;
            border: 0;
            background: transparent;
            color: var(--color-text-muted);
            font-size: 12px;
            font-weight: 700;
            cursor: pointer;
          }

          .cancel-button:hover:not(:disabled) {
            color: var(--color-primary);
          }

          .cancel-button:disabled {
            opacity: .5;
            cursor: not-allowed;
          }

          .submit-help {
            margin: 0;
            color: var(--color-text-muted);
            font-size: 10px;
            line-height: 1.45;
            text-align: center;
          }

          @media (min-width: 600px) {
            .status-options {
              display: grid;
              grid-template-columns: 1fr 1fr;
            }

            .status-option:last-child {
              grid-column: 1 / -1;
            }

            .submit-area {
              max-width: 420px;
              margin-left: auto;
              margin-right: auto;
            }
          }
        `}</style>
      </div>
    )
  }
                    }

