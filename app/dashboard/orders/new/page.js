'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../../../lib/supabaseClient'
import { getCurrentBusinessId } from '../../../../lib/getBusinessId'
import { getPlanLimits } from '../../../../lib/planLimits'
import { Icon } from '../../../../components/Icon'

const STEPS = [
  { id: 1, label: 'Customer' },
  { id: 2, label: 'Garment' },
  { id: 3, label: 'Measurements' },
  { id: 4, label: 'Details' },
  { id: 5, label: 'Payment' },
  { id: 6, label: 'Review' },
]

const INITIAL_FORM = {
  customer_id: '',
  customer_name: '',
  customer_phone: '',
  customer_email: '',
  title: '',
  category: '',
  quantity: '1',
  fabric: '',
  notes: '',
  customer_notes: '',
  measurements: {},
  fitting_date: '',
  event_date: '',
  delivery_date: '',
  price: '',
  amount_paid: '',
  current_status: 'Order placed',
}

const MEASUREMENT_GROUPS = [
  {
    title: 'Upper body',
    fields: [
      ['bust', 'Bust'],
      ['shoulder', 'Shoulder'],
      ['sleeve', 'Sleeve'],
      ['armhole', 'Armhole'],
    ],
  },
  {
    title: 'Torso',
    fields: [
      ['waist', 'Waist'],
      ['hip', 'Hip'],
      ['blouse_length', 'Blouse length'],
    ],
  },
  {
    title: 'Lower body',
    fields: [
      ['trouser_waist', 'Trouser waist'],
      ['trouser_length', 'Trouser length'],
      ['thigh', 'Thigh'],
      ['knee', 'Knee'],
      ['bottom', 'Bottom'],
    ],
  },
]

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

  const [step, setStep] = useState(1)
  const [customerSearch, setCustomerSearch] = useState('')
  const [showCustomerList, setShowCustomerList] = useState(false)
  const [isNewCustomer, setIsNewCustomer] = useState(false)

  const [formData, setFormData] = useState(INITIAL_FORM)

  const limits = useMemo(
    () => getPlanLimits(businessPlan),
    [businessPlan]
  )

  const selectedCustomer = useMemo(() => {
    return (
      customers.find(
        customer => customer.id === formData.customer_id
      ) || null
    )
  }, [customers, formData.customer_id])

  const filteredCustomers = useMemo(() => {
    const query = customerSearch.trim().toLowerCase()

    if (!query) return customers.slice(0, 6)

    return customers
      .filter(customer =>
        [
          customer.name,
          customer.phone,
          customer.email,
        ]
          .filter(Boolean)
          .some(value =>
            value.toLowerCase().includes(query)
          )
      )
      .slice(0, 6)
  }, [customers, customerSearch])

  const remainingBalance = useMemo(() => {
    return Math.max(
      (Number(formData.price) || 0) -
        (Number(formData.amount_paid) || 0),
      0
    )
  }, [formData.price, formData.amount_paid])

  const money = value =>
    new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      maximumFractionDigits: 0,
    }).format(Number(value) || 0)

  const updateField = (name, value) => {
    setFormData(current => ({
      ...current,
      [name]: value,
    }))
    setError(null)
  }

  const updateMeasurement = (name, value) => {
    setFormData(current => ({
      ...current,
      measurements: {
        ...current.measurements,
        [name]: value,
      },
    }))
  }

  const nextStep = () => {
    setError(null)
    setStep(current => Math.min(current + 1, STEPS.length))
  }

  const previousStep = () => {
    setError(null)
    setStep(current => Math.max(current - 1, 1))
  }
    useEffect(() => {
    let mounted = true

    const load = async () => {
      try {
        const id =
          searchParams.get('business_id') ||
          await getCurrentBusinessId()

        if (!id) throw new Error('Business not found')

        const { data: business, error: businessError } =
          await supabase
            .from('businesses')
            .select('id, plan')
            .eq('id', id)
            .single()

        if (businessError) throw businessError

        const { data: customerData, error: customerError } =
          await supabase
            .from('customers')
            .select(
              'id, first_name, last_name, name, phone, email, measurements'
            )
            .eq('business_id', id)
            .order('created_at', { ascending: false })

        if (customerError) throw customerError

        const { count, error: countError } =
          await supabase
            .from('orders')
            .select('id', {
              count: 'exact',
              head: true,
            })
            .eq('business_id', id)

        if (countError) throw countError

        if (!mounted) return

        setBusinessId(id)
        setBusinessPlan(business?.plan || 'free')
        setCustomers(
          (customerData || []).map(customer => ({
            ...customer,
            name:
              customer.name ||
              [customer.first_name, customer.last_name]
                .filter(Boolean)
                .join(' '),
          }))
        )
        setOrderCount(count || 0)
      } catch (loadError) {
        if (mounted) {
          setError(
            loadError?.message ||
            'Unable to load the order page.'
          )
        }
      } finally {
        if (mounted) setLoading(false)
      }
    }

    load()

    return () => {
      mounted = false
    }
  }, [searchParams])

  const handleCustomerSelect = customer => {
    setIsNewCustomer(false)

    setFormData(current => ({
      ...current,
      customer_id: customer.id,
      customer_name: customer.name || '',
      customer_phone: customer.phone || '',
      customer_email: customer.email || '',
      measurements: customer.measurements || {},
    }))

    setCustomerSearch('')
    setShowCustomerList(false)
  }

  const handleClearCustomer = () => {
    setFormData(current => ({
      ...current,
      customer_id: '',
      customer_name: '',
      customer_phone: '',
      customer_email: '',
      measurements: {},
    }))

    setIsNewCustomer(false)
    setCustomerSearch('')
  }

  const handleCreateCustomer = () => {
    setIsNewCustomer(true)
    setFormData(current => ({
      ...current,
      customer_id: '',
      customer_name: '',
      customer_phone: '',
      customer_email: '',
      measurements: {},
    }))
    setCustomerSearch('')
    setShowCustomerList(false)
  }

  const validateStep = () => {
    if (step === 1) {
      if (
        !formData.customer_id &&
        !formData.customer_name.trim()
      ) {
        setError('Select a customer or create a new one.')
        return false
      }
    }

    if (step === 2) {
      if (!formData.title.trim()) {
        setError('Give this order a garment name.')
        return false
      }

      if (!formData.category) {
        setError('Choose the garment type.')
        return false
      }
    }

    if (step === 5) {
      const price = Number(formData.price)
      const paid = Number(formData.amount_paid) || 0

      if (!Number.isFinite(price) || price <= 0) {
        setError('Enter the total order price.')
        return false
      }

      if (paid < 0 || paid > price) {
        setError(
          'The deposit cannot be greater than the total price.'
        )
        return false
      }
    }

    return true
  }

  const handleNext = () => {
    if (!validateStep()) return
    nextStep()
  }
    const handleSubmit = async event => {
    event.preventDefault()

    if (!validateStep()) return

    setSaving(true)
    setError(null)

    try {
      if (!businessId) {
        throw new Error('Business not found.')
      }

      const price = Number(formData.price) || 0
      const amountPaid =
        Number(formData.amount_paid) || 0

      let customerId = formData.customer_id

      if (!customerId) {
        const names = formData.customer_name
          .trim()
          .split(/\s+/)

        const firstName = names.shift() || ''
        const lastName = names.join(' ')

        const { data: newCustomer, error: customerError } =
          await supabase
            .from('customers')
            .insert({
              business_id: businessId,
              first_name: firstName,
              last_name: lastName || firstName,
              name: formData.customer_name.trim(),
              phone:
                formData.customer_phone.trim() || null,
              email:
                formData.customer_email.trim() || null,
              measurements: formData.measurements || {},
            })
            .select('id')
            .single()

        if (customerError) throw customerError

        customerId = newCustomer.id
      }

      const orderPayload = {
        business_id: businessId,
        customer_id: customerId,
        title: formData.title.trim(),
        description:
          formData.notes.trim() || null,
        price,
        amount_paid: amountPaid,
        current_status: formData.current_status,
        due_date:
          formData.delivery_date || null,
        category:
          formData.category || null,
        quantity:
          Number(formData.quantity) || 1,
        fabric:
          formData.fabric.trim() || null,
        fitting_date:
          formData.fitting_date || null,
        event_date:
          formData.event_date || null,
        delivery_date:
          formData.delivery_date || null,
        measurements:
          formData.measurements || {},
        customer_notes:
          formData.customer_notes.trim() || null,
        notes:
          formData.notes.trim() || null,
      }

      const { data: order, error: orderError } =
        await supabase
          .from('orders')
          .insert(orderPayload)
          .select('id')
          .single()

      if (orderError) throw orderError

      router.push(
        `/dashboard/orders/${order.id}?business_id=${businessId}`
      )
    } catch (submitError) {
      setError(
        submitError?.message ||
        'Unable to create this order. Please try again.'
      )
    } finally {
      setSaving(false)
    }
  }

  const customerInitial =
    selectedCustomer?.name
      ?.trim()
      ?.charAt(0)
      ?.toUpperCase() || 'C'

  const progress = ((step - 1) / (STEPS.length - 1)) * 100

  if (loading) {
    return (
      <main className="order-loading">
        <div className="loading-spinner" />
        <p>Preparing new order...</p>
      </main>
    )
  }

  return (
    <main className="new-order-page">
      <style jsx>{`
        .new-order-page {
          --color-primary: #0F2B4A;
          --color-accent: #D4A52A;
          --color-secondary: #2E7D5E;
          --color-danger: #D9534F;
          --color-bg: #F8F6F2;
          --color-card: #FFFFFF;
          --color-text: #1A1A1A;
          --color-text-muted: #8A8A8A;
          --color-border: #E5E0D8;
          --shadow: 0 4px 16px rgba(15,43,74,0.06);

          min-height: 100vh;
          padding: 16px;
          background: var(--color-bg);
          color: var(--color-text);
        }

        .order-shell {
          width: 100%;
          max-width: 620px;
          margin: 0 auto;
        }

        .order-header {
          margin-bottom: 24px;
        }

        .header-row {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 18px;
        }

        .back-button {
          width: 42px;
          height: 42px;
          display: grid;
          place-items: center;
          flex-shrink: 0;
          border: 1px solid var(--color-border);
          border-radius: 12px;
          background: var(--color-card);
          color: var(--color-primary);
          cursor: pointer;
        }

        .header-copy {
          flex: 1;
        }

        .eyebrow {
          margin: 0 0 2px;
          color: var(--color-text-muted);
          font-size: 10px;
          font-weight: 800;
          letter-spacing: .08em;
          text-transform: uppercase;
        }

        .page-title {
          margin: 0;
          color: var(--color-primary);
          font-size: 24px;
          font-weight: 800;
        }

        .draft-badge {
          padding: 7px 10px;
          border-radius: 999px;
          background: rgba(212,165,42,.12);
          color: var(--color-primary);
          font-size: 10px;
          font-weight: 800;
        }

        .progress-track {
          height: 5px;
          overflow: hidden;
          border-radius: 999px;
          background: var(--color-border);
        }

        .progress-fill {
          height: 100%;
          border-radius: inherit;
          background: var(--color-accent);
          transition: width .25s ease;
        }

        .step-meta {
          display: flex;
          justify-content: space-between;
          margin-top: 9px;
        }

        .step-count {
          color: var(--color-primary);
          font-size: 11px;
          font-weight: 800;
        }

        .step-name {
          color: var(--color-text-muted);
          font-size: 11px;
          font-weight: 650;
        }
      `}</style>

      <div className="order-shell">
        <header className="order-header">
          <div className="header-row">
            <button
              type="button"
              className="back-button"
              onClick={() =>
                step === 1
                  ? router.back()
                  : previousStep()
              }
              aria-label={
                step === 1
                  ? 'Go back'
                  : 'Previous step'
              }
            >
              <Icon
                name="arrow-left"
                size={18}
                stroke="currentColor"
              />
            </button>

            <div className="header-copy">
              <p className="eyebrow">Orders</p>
              <h1 className="page-title">
                New order
              </h1>
            </div>

            <span className="draft-badge">
              Draft
            </span>
          </div>

          <div
            className="progress-track"
            aria-label={`Step ${step} of ${STEPS.length}`}
          >
            <div
              className="progress-fill"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="step-meta">
            <span className="step-count">
              {step} of {STEPS.length}
            </span>

            <span className="step-name">
              {STEPS[step - 1].label}
            </span>
          </div>
        </header>

        <form
          className="order-form"
          onSubmit={handleSubmit}
        >
          {step === 1 && (
            <section className="step-section">
              <div className="step-intro">
                <span className="step-icon">
                  <Icon
                    name="user"
                    size={20}
                    stroke="currentColor"
                  />
                </span>

                <div>
                  <h2>Who is this order for?</h2>
                  <p>
                    Select an existing customer or create a
                    new customer.
                  </p>
                </div>
              </div>

              <div className="customer-search-wrap">
                <div className="search-box">
                  <Icon
                    name="search"
                    size={17}
                    stroke="currentColor"
                  />

                  <input
                    value={customerSearch}
                    onChange={event => {
                      setCustomerSearch(event.target.value)
                      setShowCustomerList(true)
                    }}
                    onFocus={() =>
                      setShowCustomerList(true)
                    }
                    placeholder="Search customers..."
                    autoComplete="off"
                  />
                </div>

                {showCustomerList && (
                  <div className="customer-list">
                    {filteredCustomers.length ? (
                      filteredCustomers.map(customer => (
                        <button
                          key={customer.id}
                          type="button"
                          className="customer-item"
                          onClick={() =>
                            handleCustomerSelect(customer)
                          }
                        >
                          <span className="avatar">
                            {customer.name
                              ?.charAt(0)
                              ?.toUpperCase() || 'C'}
                          </span>

                          <span className="customer-info">
                            <strong>
                              {customer.name}
                            </strong>

                            <small>
                              {customer.phone ||
                                customer.email ||
                                'No contact details'}
                            </small>
                          </span>

                          <Icon
                            name="chevron-right"
                            size={16}
                            stroke="currentColor"
                          />
                        </button>
                      ))
                    ) : (
                      <div className="empty-customers">
                        <strong>
                          No customer found
                        </strong>

                        <span>
                          Create a new customer below.
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {selectedCustomer ? (
                <div className="selected-customer">
                  <div className="avatar large">
                    {customerInitial}
                  </div>

                  <div className="customer-info">
                    <strong>
                      {selectedCustomer.name}
                    </strong>

                    <small>
                      {selectedCustomer.phone ||
                        selectedCustomer.email ||
                        'Customer selected'}
                    </small>
                  </div>

                  <button
                    type="button"
                    className="change-button"
                    onClick={handleClearCustomer}
                  >
                    Change
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="new-customer-card"
                  onClick={handleCreateCustomer}
                >
                  <span className="new-customer-icon">
                    <Icon
                      name="plus"
                      size={18}
                      stroke="currentColor"
                    />
                  </span>

                  <span>
                    <strong>
                      Create new customer
                    </strong>

                    <small>
                      Save their details for future orders
                    </small>
                  </span>

                  <Icon
                    name="chevron-right"
                    size={16}
                    stroke="currentColor"
                  />
                </button>
              )}

              {isNewCustomer && (
                <div className="new-customer-fields">
                  <div className="field">
                    <label htmlFor="customer_name">
                      Full name
                      <span>*</span>
                    </label>

                    <input
                      id="customer_name"
                      value={formData.customer_name}
                      onChange={event =>
                        updateField(
                          'customer_name',
                          event.target.value
                        )
                      }
                      placeholder="e.g. Amaka Okafor"
                      autoComplete="name"
                    />
                  </div>

                  <div className="field">
                    <label htmlFor="customer_phone">
                      Phone number
                    </label>

                    <input
                      id="customer_phone"
                      type="tel"
                      value={formData.customer_phone}
                      onChange={event =>
                        updateField(
                          'customer_phone',
                          event.target.value
                        )
                      }
                      placeholder="080..."
                      autoComplete="tel"
                    />
                  </div>

                  <div className="field">
                    <label htmlFor="customer_email">
                      Email
                    </label>

                    <input
                      id="customer_email"
                      type="email"
                      value={formData.customer_email}
                      onChange={event =>
                        updateField(
                          'customer_email',
                          event.target.value
                        )
                      }
                      placeholder="customer@email.com"
                      autoComplete="email"
                    />
                  </div>
                </div>
              )}
            </section>
          )}

          {step === 2 && (
            <section className="step-section">
              <div className="step-intro">
                <span className="step-icon">
                  <Icon
                    name="scissors"
                    size={20}
                    stroke="currentColor"
                  />
                </span>

                <div>
                  <h2>What are you making?</h2>
                  <p>
                    Start with the garment and give the order
                    a name your team will recognise.
                  </p>
                </div>
              </div>

              <div className="field">
                <label htmlFor="category">
                  Garment type
                  <span>*</span>
                </label>

                <select
                  id="category"
                  value={formData.category}
                  onChange={event =>
                    updateField(
                      'category',
                      event.target.value
                    )
                  }
                >
                  <option value="">
                    Select garment type
                  </option>
                  <option value="Senator">
                    Senator
                  </option>
                  <option value="Agbada">
                    Agbada
                  </option>
                  <option value="Kaftan">
                    Kaftan
                  </option>
                  <option value="Native">
                    Native wear
                  </option>
                  <option value="Suit">
                    Suit
                  </option>
                  <option value="Dress">
                    Dress
                  </option>
                  <option value="Skirt">
                    Skirt
                  </option>
                  <option value="Trousers">
                    Trousers
                  </option>
                  <option value="Shirt">
                    Shirt
                  </option>
                  <option value="Other">
                    Other
                  </option>
                </select>
              </div>

              <div className="field">
                <label htmlFor="title">
                  Order name
                  <span>*</span>
                </label>

                <input
                  id="title"
                  value={formData.title}
                  onChange={event =>
                    updateField(
                      'title',
                      event.target.value
                    )
                  }
                  placeholder="e.g. Navy wedding senator"
                  maxLength={120}
                />

                <small>
                  Make it specific enough to recognise later.
                </small>
              </div>

              <div className="field">
                <label htmlFor="quantity">
                  Quantity
                </label>

                <div className="quantity-control">
                  <button
                    type="button"
                    onClick={() =>
                      updateField(
                        'quantity',
                        String(
                          Math.max(
                            1,
                            Number(formData.quantity) - 1
                          )
                        )
                      )
                    }
                    aria-label="Decrease quantity"
                  >
                    −
                  </button>

                  <input
                    id="quantity"
                    type="number"
                    min="1"
                    value={formData.quantity}
                    onChange={event =>
                      updateField(
                        'quantity',
                        event.target.value
                      )
                    }
                  />

                  <button
                    type="button"
                    onClick={() =>
                      updateField(
                        'quantity',
                        String(
                          Number(formData.quantity || 1) + 1
                        )
                      )
                    }
                    aria-label="Increase quantity"
                  >
                    +
                  </button>
                </div>
              </div>
            </section>
          )}

          {step === 3 && (
            <section className="step-section">
              <div className="step-intro">
                <span className="step-icon">
                  <Icon
                    name="ruler"
                    size={20}
                    stroke="currentColor"
                  />
                </span>

                <div>
                  <h2>Measurements</h2>
                  <p>
                    Use the customer's saved measurements or
                    enter the measurements for this order.
                  </p>
                </div>
              </div>

              {selectedCustomer?.measurements &&
                Object.keys(selectedCustomer.measurements)
                  .length > 0 && (
                  <button
                    type="button"
                    className="saved-measurements"
                    onClick={() =>
                      updateField(
                        'measurements',
                        selectedCustomer.measurements
                      )
                    }
                  >
                    <span className="saved-icon">
                      <Icon
                        name="check"
                        size={16}
                        stroke="currentColor"
                      />
                    </span>

                    <span>
                      <strong>
                        Saved measurements available
                      </strong>
                      <small>
                        Use {selectedCustomer.name}'s latest
                        measurement profile
                      </small>
                    </span>

                    <Icon
                      name="chevron-right"
                      size={16}
                      stroke="currentColor"
                    />
                  </button>
                )}

              <div className="measurement-unit">
                <span>Measurement unit</span>

                <div className="unit-toggle">
                  <button
                    type="button"
                    className="active"
                  >
                    cm
                  </button>

                  <button
                    type="button"
                    disabled
                    title="Inches support can be added without changing stored values."
                  >
                    in
                  </button>
                </div>
              </div>

              {MEASUREMENT_GROUPS.map(group => (
                <div
                  className="measurement-group"
                  key={group.title}
                >
                  <h3>{group.title}</h3>

                  <div className="measurement-grid">
                    {group.fields.map(([name, label]) => (
                      <div
                        className="field"
                        key={name}
                      >
                        <label htmlFor={`measurement-${name}`}>
                          {label}
                        </label>

                        <div className="measurement-input">
                          <input
                            id={`measurement-${name}`}
                            type="number"
                            inputMode="decimal"
                            min="0"
                            step="0.1"
                            value={
                              formData.measurements?.[name] ||
                              ''
                            }
                            onChange={event =>
                              updateMeasurement(
                                name,
                                event.target.value
                              )
                            }
                            placeholder="—"
                          />

                          <span>cm</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </section>
          )}

          {step === 4 && (
            <section className="step-section">
              <div className="step-intro">
                <span className="step-icon">
                  <Icon
                    name="layers"
                    size={20}
                    stroke="currentColor"
                  />
                </span>

                <div>
                  <h2>Fabric & design</h2>
                  <p>
                    Capture the materials and instructions
                    that matter to the maker.
                  </p>
                </div>
              </div>

              <div className="field">
                <label htmlFor="fabric">
                  Fabric
                </label>

                <input
                  id="fabric"
                  value={formData.fabric}
                  onChange={event =>
                    updateField(
                      'fabric',
                      event.target.value
                    )
                  }
                  placeholder="e.g. Navy wool, customer's lace"
                />
              </div>

              <div className="field">
                <label htmlFor="notes">
                  Design notes
                </label>

                <textarea
                  id="notes"
                  value={formData.notes}
                  onChange={event =>
                    updateField(
                      'notes',
                      event.target.value
                    )
                  }
                  placeholder="Style, embroidery, lining, buttons, special instructions..."
                  rows={5}
                  maxLength={2000}
                />

                <small>
                  Keep production instructions specific and
                  easy for your team to follow.
                </small>
              </div>

              <div className="field">
                <label htmlFor="customer_notes">
                  Customer instructions
                </label>

                <textarea
                  id="customer_notes"
                  value={formData.customer_notes}
                  onChange={event =>
                    updateField(
                      'customer_notes',
                      event.target.value
                    )
                  }
                  placeholder="Anything the customer specifically requested..."
                  rows={4}
                  maxLength={1000}
                />
              </div>
            </section>
          )}

          {step === 5 && (
            <section className="step-section">
              <div className="step-intro">
                <span className="step-icon">
                  <Icon
                    name="calendar"
                    size={20}
                    stroke="currentColor"
                  />
                </span>

                <div>
                  <h2>Dates & payment</h2>
                  <p>
                    Set the important dates and agree the
                    payment details.
                  </p>
                </div>
              </div>

              <div className="date-grid">
                <div className="field">
                  <label htmlFor="fitting_date">
                    Fitting date
                  </label>

                  <input
                    id="fitting_date"
                    type="date"
                    value={formData.fitting_date}
                    onChange={event =>
                      updateField(
                        'fitting_date',
                        event.target.value
                      )
                    }
                  />
                </div>

                <div className="field">
                  <label htmlFor="event_date">
                    Event date
                  </label>

                  <input
                    id="event_date"
                    type="date"
                    value={formData.event_date}
                    onChange={event =>
                      updateField(
                        'event_date',
                        event.target.value
                      )
                    }
                  />
                </div>

                <div className="field">
                  <label htmlFor="delivery_date">
                    Delivery date
                  </label>

                  <input
                    id="delivery_date"
                    type="date"
                    value={formData.delivery_date}
                    onChange={event =>
                      updateField(
                        'delivery_date',
                        event.target.value
                      )
                    }
                  />
                </div>
              </div>

              <div className="payment-box">
                <div className="payment-title">
                  <Icon
                    name="wallet"
                    size={18}
                    stroke="currentColor"
                  />

                  <span>Payment</span>
                </div>

                <div className="payment-fields">
                  <div className="field">
                    <label htmlFor="price">
                      Total price <span>*</span>
                    </label>

                    <input
                      id="price"
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="100"
                      value={formData.price}
                      onChange={event =>
                        updateField(
                          'price',
                          event.target.value
                        )
                      }
                      placeholder="150000"
                    />
                  </div>

                  <div className="field">
                    <label htmlFor="amount_paid">
                      Deposit paid
                    </label>

                    <input
                      id="amount_paid"
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="100"
                      value={formData.amount_paid}
                      onChange={event =>
                        updateField(
                          'amount_paid',
                          event.target.value
                        )
                      }
                      placeholder="50000"
                    />
                  </div>
                </div>

                <div className="balance-row">
                  <span>Balance remaining</span>

                  <strong>
                    {money(remainingBalance)}
                  </strong>
                </div>
              </div>
            </section>
          )}

          {step === 6 && (
            <section className="step-section">
              <div className="step-intro">
                <span className="step-icon success">
                  <Icon
                    name="check"
                    size={20}
                    stroke="currentColor"
                  />
                </span>

                <div>
                  <h2>Ready to create</h2>
                  <p>
                    Review the order once before saving it.
                  </p>
                </div>
              </div>

              <div className="review-card">
                <div className="review-heading">
                  <div className="avatar large">
                    {customerInitial}
                  </div>

                  <div>
                    <strong>
                      {formData.customer_name ||
                        selectedCustomer?.name ||
                        'Customer'}
                    </strong>

                    <small>
                      {formData.customer_phone ||
                        selectedCustomer?.phone ||
                        'No phone number'}
                    </small>
                  </div>
                </div>

                <div className="review-row">
                  <span>Garment</span>
                  <strong>
                    {formData.title || 'Not specified'}
                  </strong>
                </div>

                <div className="review-row">
                  <span>Type</span>
                  <strong>
                    {formData.category || 'Not specified'}
                  </strong>
                </div>

                <div className="review-row">
                  <span>Quantity</span>
                  <strong>
                    {formData.quantity || 1}
                  </strong>
                </div>

                <div className="review-row">
                  <span>Fabric</span>
                  <strong>
                    {formData.fabric || 'Not specified'}
                  </strong>
                </div>
              </div>

              <div className="review-card">
                <div className="review-section-title">
                  Schedule
                </div>

                <div className="review-row">
                  <span>Fitting</span>
                  <strong>
                    {formData.fitting_date || 'Not set'}
                  </strong>
                </div>

                <div className="review-row">
                  <span>Event</span>
                  <strong>
                    {formData.event_date || 'Not set'}
                  </strong>
                </div>

                <div className="review-row">
                  <span>Delivery</span>
                  <strong>
                    {formData.delivery_date || 'Not set'}
                  </strong>
                </div>
              </div>

              <div className="review-payment">
                <span>Total</span>
                <strong>{money(formData.price)}</strong>
                <small>
                  Deposit {money(formData.amount_paid)} ·
                  Balance {money(remainingBalance)}
                </small>
              </div>
            </section>
          )}

                    <div className="step-actions">
            {step > 1 && (
              <button
                type="button"
                className="secondary-action"
                onClick={previousStep}
                disabled={saving}
              >
                <Icon
                  name="arrow-left"
                  size={16}
                  stroke="currentColor"
                />
                Back
              </button>
            )}

            {step < STEPS.length ? (
              <button
                type="button"
                className="primary-action"
                onClick={handleNext}
                disabled={saving}
              >
                Continue
                <Icon
                  name="arrow-right"
                  size={17}
                  stroke="currentColor"
                />
              </button>
            ) : (
              <button
                type="submit"
                className="primary-action"
                disabled={saving}
              >
                {saving ? (
                  <>
                    <span className="button-spinner" />
                    Creating...
                  </>
                ) : (
                  <>
                    Create order
                    <Icon
                      name="check"
                      size={17}
                      stroke="currentColor"
                    />
                  </>
                )}
              </button>
            )}
          </div>

          {error && (
            <div
              className="error-message"
              role="alert"
            >
              <Icon
                name="alert-circle"
                size={17}
                stroke="currentColor"
              />
              <span>{error}</span>
            </div>
          )}
        </form>
      </div>

      <style jsx>{`
        .order-loading {
          min-height: 100vh;
          display: grid;
          place-items: center;
          align-content: center;
          gap: 12px;
          background: #F8F6F2;
          color: #8A8A8A;
        }

        .loading-spinner {
          width: 28px;
          height: 28px;
          border: 3px solid #E5E0D8;
          border-top-color: #D4A52A;
          border-radius: 50%;
          animation: spin .7s linear infinite;
        }

        .order-form {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .step-section {
          padding: 20px 16px;
          border: 1px solid var(--color-border);
          border-radius: 18px;
          background: var(--color-card);
          box-shadow: var(--shadow);
        }

        .step-intro {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          margin-bottom: 24px;
        }

        .step-icon {
          width: 42px;
          height: 42px;
          flex: 0 0 42px;
          display: grid;
          place-items: center;
          border-radius: 12px;
          background: rgba(212,165,42,.12);
          color: var(--color-primary);
        }

        .step-icon.success {
          background: rgba(46,125,94,.12);
          color: var(--color-secondary);
        }

        .step-intro h2 {
          margin: 1px 0 5px;
          color: var(--color-primary);
          font-size: 19px;
          line-height: 1.25;
          font-weight: 800;
        }

        .step-intro p {
          margin: 0;
          color: var(--color-text-muted);
          font-size: 12px;
          line-height: 1.55;
        }

        .field {
          display: flex;
          flex-direction: column;
          gap: 7px;
          margin-bottom: 17px;
        }

        .field:last-child {
          margin-bottom: 0;
        }

        .field label {
          color: var(--color-text);
          font-size: 11px;
          font-weight: 800;
        }

        .field label span {
          margin-left: 3px;
          color: var(--color-danger);
        }

        .field input,
        .field select,
        .field textarea {
          width: 100%;
          box-sizing: border-box;
          border: 1px solid var(--color-border);
          border-radius: 11px;
          background: var(--color-card);
          color: var(--color-text);
          font: inherit;
          font-size: 13px;
          outline: none;
          transition:
            border-color .16s ease,
            box-shadow .16s ease;
        }

        .field input,
        .field select {
          min-height: 46px;
          padding: 0 13px;
        }

        .field textarea {
          min-height: 110px;
          padding: 12px 13px;
          resize: vertical;
          line-height: 1.5;
        }

        .field input::placeholder,
        .field textarea::placeholder {
          color: var(--color-text-muted);
        }

        .field input:focus,
        .field select:focus,
        .field textarea:focus {
          border-color: var(--color-accent);
          box-shadow:
            0 0 0 3px rgba(212,165,42,.12);
        }

        .field small {
          color: var(--color-text-muted);
          font-size: 10px;
          line-height: 1.45;
        }

        .customer-search-wrap {
          position: relative;
          margin-bottom: 14px;
        }

        .search-box {
          min-height: 46px;
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 0 13px;
          border: 1px solid var(--color-border);
          border-radius: 11px;
          background: var(--color-card);
          color: var(--color-text-muted);
        }

        .search-box:focus-within {
          border-color: var(--color-accent);
          box-shadow:
            0 0 0 3px rgba(212,165,42,.12);
        }

        .search-box input {
          width: 100%;
          min-width: 0;
          border: 0;
          outline: 0;
          background: transparent;
          color: var(--color-text);
          font-size: 13px;
        }

        .customer-list {
          position: absolute;
          z-index: 10;
          top: calc(100% + 6px);
          left: 0;
          right: 0;
          overflow: hidden;
          border: 1px solid var(--color-border);
          border-radius: 13px;
          background: var(--color-card);
          box-shadow: 0 8px 32px rgba(15,43,74,.12);
        }

        .customer-item {
          width: 100%;
          min-height: 62px;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 9px 12px;
          border: 0;
          border-bottom: 1px solid var(--color-border);
          background: var(--color-card);
          color: var(--color-text);
          text-align: left;
          cursor: pointer;
        }

        .customer-item:last-child {
          border-bottom: 0;
        }

        .customer-item:hover {
          background: rgba(15,43,74,.035);
        }

        .avatar {
          width: 36px;
          height: 36px;
          flex: 0 0 36px;
          display: grid;
          place-items: center;
          border-radius: 50%;
          background: var(--color-primary);
          color: #fff;
          font-size: 12px;
          font-weight: 800;
        }

        .avatar.large {
          width: 44px;
          height: 44px;
          flex-basis: 44px;
        }

        .customer-info {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .customer-info strong {
          overflow: hidden;
          color: var(--color-text);
          font-size: 12px;
          font-weight: 800;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .customer-info small {
          overflow: hidden;
          color: var(--color-text-muted);
          font-size: 10px;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
      
          
          <style jsx>{`
  .selected-customer,
  .new-customer-card,
  .saved-measurements {
    width: 100%;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    gap: 11px;
    padding: 12px;
    border: 1px solid var(--color-border);
    border-radius: 13px;
    background: var(--color-card);
  }

  .selected-customer {
    margin-bottom: 14px;
  }

  .change-button {
    margin-left: auto;
    padding: 7px 9px;
    border: 0;
    border-radius: 8px;
    background: rgba(15,43,74,.07);
    color: var(--color-primary);
    font-size: 10px;
    font-weight: 800;
    cursor: pointer;
  }

  .new-customer-card {
    text-align: left;
    color: var(--color-text);
    cursor: pointer;
  }

  .new-customer-card:hover {
    border-color: var(--color-primary);
  }

  .new-customer-icon {
    width: 36px;
    height: 36px;
    flex: 0 0 36px;
    display: grid;
    place-items: center;
    border-radius: 10px;
    background: rgba(212,165,42,.12);
    color: var(--color-primary);
  }

  .new-customer-card > span:nth-child(2),
  .saved-measurements > span:nth-child(2) {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .new-customer-card strong,
  .saved-measurements strong {
    color: var(--color-text);
    font-size: 11px;
    font-weight: 800;
  }

  .new-customer-card small,
  .saved-measurements small {
    color: var(--color-text-muted);
    font-size: 10px;
    line-height: 1.4;
  }

  .new-customer-fields {
    margin-top: 14px;
    padding-top: 16px;
    border-top: 1px solid var(--color-border);
  }

  .measurement-unit {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 20px;
    padding: 10px 12px;
    border-radius: 11px;
    background: var(--color-bg);
  }

  .measurement-unit > span {
    color: var(--color-text);
    font-size: 11px;
    font-weight: 750;
  }

  .unit-toggle {
    display: flex;
    padding: 3px;
    border-radius: 8px;
    background: var(--color-card);
    border: 1px solid var(--color-border);
  }

  .unit-toggle button {
    min-width: 38px;
    height: 27px;
    border: 0;
    border-radius: 6px;
    background: transparent;
    color: var(--color-text-muted);
    font-size: 10px;
    font-weight: 800;
  }

  .unit-toggle button.active {
    background: var(--color-primary);
    color: #fff;
  }

  .unit-toggle button:disabled {
    opacity: .45;
  }

  .measurement-group {
    margin-top: 20px;
  }

  .measurement-group h3 {
    margin: 0 0 11px;
    color: var(--color-primary);
    font-size: 12px;
    font-weight: 800;
  }

  .measurement-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }

  .measurement-grid .field {
    margin-bottom: 0;
  }

  .measurement-input {
    position: relative;
  }

  .measurement-input input {
    padding-right: 34px;
  }

  .measurement-input span {
    position: absolute;
    top: 50%;
    right: 11px;
    transform: translateY(-50%);
    color: var(--color-text-muted);
    font-size: 9px;
    font-weight: 700;
    pointer-events: none;
  }

  .saved-measurements {
    margin-bottom: 18px;
    border-color: rgba(46,125,94,.25);
    background: rgba(46,125,94,.055);
    text-align: left;
    cursor: pointer;
  }

  .saved-icon {
    width: 32px;
    height: 32px;
    flex: 0 0 32px;
    display: grid;
    place-items: center;
    border-radius: 9px;
    background: rgba(46,125,94,.12);
    color: var(--color-secondary);
  }

  .date-grid {
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  .payment-box {
    margin-top: 22px;
    padding: 14px;
    border: 1px solid var(--color-border);
    border-radius: 14px;
    background: var(--color-bg);
  }

  .payment-title {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 15px;
    color: var(--color-primary);
    font-size: 12px;
    font-weight: 800;
  }

  .payment-fields {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }

  .payment-fields .field {
    margin-bottom: 0;
  }

  .balance-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-top: 14px;
    padding-top: 13px;
    border-top: 1px solid var(--color-border);
  }

  .balance-row span {
    color: var(--color-text-muted);
    font-size: 10px;
    font-weight: 700;
  }

  .balance-row strong {
    color: var(--color-primary);
    font-size: 16px;
    font-weight: 850;
  }

  .review-card {
    margin-bottom: 12px;
    padding: 15px;
    border: 1px solid var(--color-border);
    border-radius: 14px;
    background: var(--color-card);
  }

  .review-heading {
    display: flex;
    align-items: center;
    gap: 11px;
    padding-bottom: 14px;
    margin-bottom: 3px;
    border-bottom: 1px solid var(--color-border);
  }

  .review-heading > div:last-child {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .review-heading strong {
    color: var(--color-primary);
    font-size: 13px;
    font-weight: 850;
  }

  .review-heading small {
    color: var(--color-text-muted);
    font-size: 10px;
  }

  .review-row {
    min-height: 42px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    border-bottom: 1px solid var(--color-border);
  }

  .review-row:last-child {
    border-bottom: 0;
  }

  .review-row span {
    color: var(--color-text-muted);
    font-size: 10px;
    font-weight: 650;
  }

  .review-row strong {
    max-width: 62%;
    overflow: hidden;
    color: var(--color-text);
    font-size: 11px;
    font-weight: 800;
    text-align: right;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .review-section-title {
    margin-bottom: 4px;
    color: var(--color-primary);
    font-size: 11px;
    font-weight: 850;
  }

  .review-payment {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    margin-top: 14px;
    padding: 18px;
    border-radius: 14px;
    background: var(--color-primary);
    color: #fff;
    text-align: center;
  }

  .review-payment span {
    font-size: 10px;
    opacity: .75;
  }

  .review-payment strong {
    color: #fff;
    font-size: 24px;
    font-weight: 850;
  }

  .review-payment small {
    color: rgba(255,255,255,.72);
    font-size: 10px;
  }

  .step-actions {
    display: flex;
    gap: 10px;
  }

  .primary-action,
  .secondary-action {
    min-height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 850;
    cursor: pointer;
    transition:
      transform .15s ease,
      opacity .15s ease,
      background .15s ease;
  }

  .primary-action {
    flex: 1;
    border: 1px solid var(--color-accent);
    background: var(--color-accent);
    color: var(--color-primary);
    box-shadow:
      0 4px 12px rgba(212,165,42,.16);
  }

  .primary-action:hover {
    background: #C79A2B;
    border-color: #C79A2B;
  }

  .secondary-action {
    min-width: 88px;
    padding: 0 14px;
    border: 1px solid var(--color-border);
    background: var(--color-card);
    color: var(--color-primary);
  }

  .secondary-action:hover {
    background: var(--color-bg);
  }

  .primary-action:active,
  .secondary-action:active {
    transform: translateY(1px);
  }

  .primary-action:disabled,
  .secondary-action:disabled {
    opacity: .55;
    cursor: not-allowed;
    transform: none;
  }

  .button-spinner {
    width: 15px;
    height: 15px;
    border: 2px solid rgba(15,43,74,.25);
    border-top-color: var(--color-primary);
    border-radius: 50%;
    animation: spin .7s linear infinite;
  }

  .error-message {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 11px 12px;
    border: 1px solid rgba(217,83,79,.25);
    border-radius: 11px;
    background: rgba(217,83,79,.07);
    color: var(--color-danger);
    font-size: 11px;
    line-height: 1.45;
  }

  .quantity-control {
    width: 100%;
    min-height: 46px;
    display: grid;
    grid-template-columns: 42px 1fr 42px;
    overflow: hidden;
    border: 1px solid var(--color-border);
    border-radius: 11px;
    background: var(--color-card);
  }

  .quantity-control button {
    border: 0;
    background: var(--color-bg);
    color: var(--color-primary);
    font-size: 18px;
    font-weight: 700;
    cursor: pointer;
  }

  .quantity-control button:hover {
    background: rgba(15,43,74,.06);
  }

  .quantity-control input {
    width: 100%;
    min-width: 0;
    border: 0;
    outline: 0;
    background: transparent;
    color: var(--color-text);
    text-align: center;
    font-size: 13px;
    font-weight: 800;
  }

  .quantity-control input::-webkit-inner-spin-button,
  .quantity-control input::-webkit-outer-spin-button {
    appearance: none;
    margin: 0;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  @media (min-width: 700px) {
    .new-order-page {
      padding: 32px 24px;
    }

    .step-section {
      padding: 26px;
    }

    .date-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      column-gap: 12px;
    }

    .date-grid .field:last-child {
      grid-column: 1 / -1;
    }

    .measurement-grid {
      grid-template-columns: repeat(3, 1fr);
    }
  }
`}</style>
    </main>
  )
          }

          
