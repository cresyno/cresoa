'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '../../../../lib/supabaseClient'
import { getCurrentBusinessId } from '../../../../lib/getBusinessId'
import { isFeatureAvailable } from '../../../../lib/planLimits'
import { Icon } from '../../../../components/Icon'

const STATUS_FLOW = [
  {
    value: 'Order placed',
    label: 'Order placed',
    short: 'Placed',
    icon: 'clipboard',
    description: 'The customer has placed this order and production has not started yet.',
    customerMessage: 'Your order has been received and is now in our production queue.'
  },
  {
    value: 'Cutting',
    label: 'Cutting',
    short: 'Cutting',
    icon: 'scissors',
    description: 'Fabric is being prepared and cut according to the order.',
    customerMessage: 'Good news! Your outfit is now in the cutting stage. We are carefully preparing the fabric for production.'
  },
  {
    value: 'Sewing',
    label: 'Sewing',
    short: 'Sewing',
    icon: 'edit-2',
    description: 'Your tailor is currently sewing and assembling the outfit.',
    customerMessage: 'Your outfit is currently being sewn and assembled. We are making sure the details come together properly.'
  },
  {
    value: 'Ready',
    label: 'Ready for pickup',
    short: 'Ready',
    icon: 'check-circle',
    description: 'The outfit is finished and ready for the customer.',
    customerMessage: 'Your outfit is ready! You can now arrange pickup or delivery with us.'
  },
  {
    value: 'Delivered',
    label: 'Delivered',
    short: 'Delivered',
    icon: 'package',
    description: 'The customer has received the finished order.',
    customerMessage: 'Your order has been marked as delivered. Thank you for choosing us!'
  }
]

export default function OrderDetailPage() {
  const router = useRouter()
  const params = useParams()
  const orderId = params.id

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [order, setOrder] = useState(null)
  const [customer, setCustomer] = useState(null)
  const [payments, setPayments] = useState([])
  const [businessId, setBusinessId] = useState(null)
  const [currentBusinessId, setCurrentBusinessId] = useState(null)
  const [businessPlan, setBusinessPlan] = useState('free')
  const [userRole, setUserRole] = useState(null)

  const [notes, setNotes] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)

  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentNote, setPaymentNote] = useState('')
  const [recordingPayment, setRecordingPayment] = useState(false)

  const [showStatusModal, setShowStatusModal] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState(null)
  const [updatingStatus, setUpdatingStatus] = useState(false)

  const [showEditModal, setShowEditModal] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    title: '',
    price: '',
    due_date: ''
  })

  const [copied, setCopied] = useState(false)

  const loadOrder = async () => {
    setLoading(true)
    setError(null)

    try {
      const {
        data: { session }
      } = await supabase.auth.getSession()

      if (!session) {
        router.push('/login')
        return
      }

      const bizId = getCurrentBusinessId()

      if (!bizId) {
        router.push('/dashboard')
        return
      }

      setCurrentBusinessId(bizId)

      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select(`
          *,
          customers (
            id,
            name,
            first_name,
            last_name,
            phone,
            email,
            address
          )
        `)
        .eq('id', orderId)
        .eq('business_id', bizId)
        .single()

      if (orderError) throw orderError

      setOrder(orderData)
      setCustomer(orderData.customers)
      setBusinessId(bizId)
      setNotes(orderData.notes || '')

      setEditForm({
        title: orderData.title || '',
        price: orderData.price || '',
        due_date: orderData.due_date || ''
      })

      const { data: bizData } = await supabase
        .from('businesses')
        .select('plan')
        .eq('id', bizId)
        .single()

      if (bizData) {
        setBusinessPlan(bizData.plan || 'free')
      }

      const { data: roleData } = await supabase
        .from('business_memberships')
        .select('role')
        .eq('business_id', bizId)
        .eq('user_id', session.user.id)
        .maybeSingle()

      if (roleData) {
        setUserRole(roleData.role)
      }

      const { data: paymentData, error: paymentError } = await supabase
        .from('payment_records')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: false })

      if (paymentError) throw paymentError

      setPayments(paymentData || [])
    } catch (err) {
      console.error('Error loading order:', err)
      setError('We could not load this order.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (orderId) loadOrder()
  }, [orderId])

  const statusIndex = useMemo(() => {
  if (!order) return 0
  const index = STATUS_FLOW.findIndex(
    item => item.value === (order.current_status || 'Order placed')
  )
  return index >= 0 ? index : 0
}, [order])
  
  const balance = useMemo(() => {
    if (!order) return 0
    return Math.max(
      0,
      Number(order.price || 0) - Number(order.amount_paid || 0)
    )
  }, [order])

  const isFullyPaid = balance <= 0
  const canTracking = isFeatureAvailable(
    businessPlan,
    'tracking_links'
  )
  const canWhatsApp = isFeatureAvailable(
    businessPlan,
    'whatsapp_reminders'
  )
  const saveNotes = async () => {
    setSavingNotes(true)
    try {
      const {
        data: { session }
      } = await supabase.auth.getSession()

      if (!session) return

      const { error: updateError } = await supabase
        .from('orders')
        .update({ notes })
        .eq('id', orderId)

      if (updateError) throw updateError

      await supabase.from('business_activity_logs').insert({
        business_id: businessId,
        performed_by: session.user.id,
        action: 'order_notes_updated',
        details: { order_id: orderId }
      })
    } catch (err) {
      console.error('Error saving notes:', err)
      alert('Could not save the note. Please try again.')
    } finally {
      setSavingNotes(false)
    }
  }

  const handleRecordPayment = async (event) => {
    event.preventDefault()

    const amount = parseFloat(paymentAmount)

    if (!amount || amount <= 0) {
      alert('Enter a valid payment amount.')
      return
    }

    if (amount > balance) {
      alert(`The remaining balance is ₦${balance.toLocaleString()}.`)
      return
    }

    setRecordingPayment(true)

    try {
      const {
        data: { session }
      } = await supabase.auth.getSession()

      if (!session) {
        router.push('/login')
        return
      }

      const response = await fetch(
        `/api/orders/${orderId}/payments`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            amount,
            note: paymentNote || 'Payment recorded'
          })
        }
      )

      const result = await response.json()

      if (!response.ok) {
        throw new Error(
          result.error || 'Failed to record payment'
        )
      }

      await loadOrder()

      setPaymentAmount('')
      setPaymentNote('')
      setShowPaymentModal(false)
    } catch (err) {
      console.error('Payment error:', err)
      alert(err.message || 'Could not record payment.')
    } finally {
      setRecordingPayment(false)
    }
  }

  const updateStatus = async (status) => {
    if (!status || status === order.current_status) {
      setShowStatusModal(false)
      return
    }

    setUpdatingStatus(true)

    try {
      const {
        data: { session }
      } = await supabase.auth.getSession()

      if (!session) {
        router.push('/login')
        return
      }

      const { error: updateError } = await supabase
        .from('orders')
        .update({ current_status: status })
        .eq('id', orderId)

      if (updateError) throw updateError

      await supabase.from('business_activity_logs').insert({
        business_id: businessId,
        performed_by: session.user.id,
        action: 'order_status_updated',
        details: {
          order_id: orderId,
          previous_status: order.current_status,
          new_status: status
        }
      })

      await loadOrder()
      setShowStatusModal(false)
      setSelectedStatus(null)
    } catch (err) {
      console.error('Status update error:', err)
      alert('Could not update the order status.')
    } finally {
      setUpdatingStatus(false)
    }
  }

  const getCustomerStatusMessage = (status) => {
    const item = STATUS_FLOW.find(
      entry => entry.value === status
    )

    if (!item) {
      return `Hi ${customer?.first_name || customer?.name || ''}, there is an update on your order "${order?.title || 'order'}".`
    }

    return `Hi ${customer?.first_name || customer?.name || ''}, ${item.customerMessage} Your order is currently marked as "${item.label}".`
  }

  const sendStatusUpdate = (status) => {
    if (!customer?.phone) {
      alert('This customer does not have a phone number.')
      return
    }

    const message = getCustomerStatusMessage(status)

    const url =
      `https://wa.me/${customer.phone.replace(/\D/g, '')}` +
      `?text=${encodeURIComponent(message)}`

    window.open(url, '_blank')
  }

  const sendWhatsApp = () => {
    if (!customer?.phone) {
      alert('This customer does not have a phone number.')
      return
    }

    const message = getCustomerStatusMessage(
      order.current_status
    )

    const url =
      `https://wa.me/${customer.phone.replace(/\D/g, '')}` +
      `?text=${encodeURIComponent(message)}`

    window.open(url, '_blank')
  }

  const getTrackingLink = () => {
    if (typeof window === 'undefined') return ''

    return (
      `${window.location.origin}/track/${orderId}` +
      `?business_id=${currentBusinessId}`
    )
  }

  const copyTrackingLink = async () => {
    try {
      await navigator.clipboard.writeText(getTrackingLink())
      setCopied(true)

      window.setTimeout(() => {
        setCopied(false)
      }, 2000)
    } catch (err) {
      console.error('Copy error:', err)
      alert('Could not copy the tracking link.')
    }
  }

  const sendTrackingLink = () => {
    if (!customer?.phone) {
      alert('This customer does not have a phone number.')
      return
    }

    const message =
      `Hi ${customer?.first_name || customer?.name || ''}, ` +
      `you can follow the progress of your order "${order.title}" ` +
      `using this tracking link:\n\n${getTrackingLink()}`

    const url =
      `https://wa.me/${customer.phone.replace(/\D/g, '')}` +
      `?text=${encodeURIComponent(message)}`

    window.open(url, '_blank')
  }

  const handleEditSubmit = async (event) => {
    event.preventDefault()
    setEditing(true)

    try {
      const {
        data: { session }
      } = await supabase.auth.getSession()

      if (!session) return

      const { error: updateError } = await supabase
        .from('orders')
        .update({
          title: editForm.title,
          price: parseFloat(editForm.price) || 0,
          due_date: editForm.due_date || null
        })
        .eq('id', orderId)

      if (updateError) throw updateError

      await supabase.from('business_activity_logs').insert({
        business_id: businessId,
        performed_by: session.user.id,
        action: 'order_updated',
        details: { order_id: orderId }
      })

      await loadOrder()
      setShowEditModal(false)
    } catch (err) {
      console.error('Edit error:', err)
      alert('Could not update this order.')
    } finally {
      setEditing(false)
    }
  }

  const handleDuplicate = async () => {
    if (!confirm('Create a new order using this order as a starting point?')) {
      return
    }

    try {
      const {
        data: { session }
      } = await supabase.auth.getSession()

      if (!session) return

      const { data, error: duplicateError } = await supabase
        .from('orders')
        .insert({
          business_id: businessId,
          customer_id: order.customer_id,
          title: `${order.title} (Copy)`,
          price: order.price,
          amount_paid: 0,
          due_date: order.due_date,
          current_status: 'Order placed',
          notes: order.notes || null
        })
        .select()
        .single()

      if (duplicateError) throw duplicateError

      await supabase.from('business_activity_logs').insert({
        business_id: businessId,
        performed_by: session.user.id,
        action: 'order_duplicated',
        details: {
          original_id: orderId,
          new_id: data.id
        }
      })

      router.push(
        `/dashboard/orders/${data.id}?business_id=${currentBusinessId}`
      )
    } catch (err) {
      console.error('Duplicate error:', err)
      alert('Could not duplicate this order.')
    }
  }

  const openStatusModal = () => {
    setSelectedStatus(null)
    setShowStatusModal(true)
  }

  const selectStatus = (status) => {
    if (status === order.current_status) return
    setSelectedStatus(status)
  }

  const currentStatusInfo =
    STATUS_FLOW.find(
      item => item.value === order.current_status
    ) || STATUS_FLOW[0]

  const selectedStatusInfo =
    STATUS_FLOW.find(
      item => item.value === selectedStatus
    ) || null

  const isOverdue =
    order.due_date &&
    new Date(order.due_date) < new Date() &&
    order.current_status !== 'Delivered'

  const formatMoney = value =>
    `₦${Number(value || 0).toLocaleString('en-NG')}`

  const formatDate = value => {
    if (!value) return 'Not set'

    return new Date(value).toLocaleDateString(
      'en-NG',
      {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      }
    )
  }

  const customerName =
    customer?.first_name ||
    customer?.name ||
    'Customer'

  if (loading) {
    return (
      <main className="order-page">
        <div className="loading-card">
          <div className="skeleton skeleton-title" />
          <div className="skeleton skeleton-large" />
          <div className="skeleton skeleton-row" />
          <div className="skeleton skeleton-row" />
          <div className="skeleton skeleton-large" />
        </div>

        <style jsx>{`
          .order-page {
            min-height: 100vh;
            padding: 24px 16px;
            background: var(--color-bg);
          }

          .loading-card {
            max-width: 720px;
            margin: 0 auto;
          }

          .skeleton {
            background: var(--color-border);
            border-radius: 12px;
            animation: pulse 1.4s ease-in-out infinite;
          }

          .skeleton-title {
            width: 45%;
            height: 22px;
            margin-bottom: 20px;
          }

          .skeleton-large {
            width: 100%;
            height: 120px;
            margin-bottom: 14px;
          }

          .skeleton-row {
            width: 100%;
            height: 70px;
            margin-bottom: 14px;
          }

          @keyframes pulse {
            0%, 100% { opacity: .45; }
            50% { opacity: .8; }
          }
        `}</style>
      </main>
    )
  }

  if (error || !order) {
    return (
      <main className="order-page">
        <div className="error-card">
          <Icon
            name="alert-circle"
            size={32}
            stroke="var(--color-danger)"
          />

          <h1>
            {error || 'Order not found'}
          </h1>

          <p>
            We could not load this order. Please try again.
          </p>

          <button
            type="button"
            onClick={loadOrder}
            className="retry-button"
          >
            Try again
          </button>
        </div>

        <style jsx>{`
          .order-page {
            min-height: 100vh;
            padding: 32px 16px;
            background: var(--color-bg);
            color: var(--color-text);
          }

          .error-card {
            max-width: 520px;
            margin: 80px auto;
            padding: 32px 22px;
            text-align: center;
            background: var(--color-card);
            border: 1px solid var(--color-border);
            border-radius: 20px;
            box-shadow: var(--shadow);
          }

          .error-card h1 {
            margin: 16px 0 8px;
            font-size: 20px;
          }

          .error-card p {
            margin: 0 0 20px;
            color: var(--color-text-muted);
          }

          .retry-button {
            border: 0;
            border-radius: 10px;
            padding: 12px 22px;
            background: var(--color-accent);
            color: var(--color-primary);
            font-weight: 700;
            cursor: pointer;
          }
        `}</style>
      </main>
    )
  }

  return (
    <main className="order-page">
      <section className="page-shell">

        <header className="page-header">
          <button
            type="button"
            className="back-button"
            onClick={() =>
              router.push(
                `/dashboard/orders?business_id=${currentBusinessId || ''}`
              )
            }
            aria-label="Back to orders"
          >
            <Icon
              name="arrow-left"
              size={21}
              stroke="var(--color-primary)"
            />
          </button>

          <div className="header-copy">
            <span className="eyebrow">
              ORDER DETAILS
            </span>

            <h1>{order.title || 'Untitled order'}</h1>

            <p>
              #{orderId.slice(0, 8)} · {customerName}
            </p>
          </div>

          <button
            type="button"
            className="edit-button"
            onClick={() => setShowEditModal(true)}
          >
            <Icon
              name="edit-2"
              size={16}
              stroke="var(--color-primary)"
            />
            Edit order
          </button>
        </header>

        <section className="status-hero">
          <div className="status-heading">
            <div>
              <span className="section-label">
                CURRENT ORDER STATUS
              </span>

              <h2>
                {currentStatusInfo.label}
              </h2>

              <p>
                {currentStatusInfo.description}
              </p>
            </div>

            <div className="status-icon">
              <Icon
                name={currentStatusInfo.icon}
                size={25}
                stroke="var(--color-accent)"
              />
            </div>
          </div>

          <div className="progress-track">
            {STATUS_FLOW.map((status, index) => {
              const completed = index <= statusIndex
              const active = index === statusIndex

              return (
                <div
                  className="progress-item"
                  key={status.value}
                >
                  <div
                    className={[
                      'progress-dot',
                      completed ? 'completed' : '',
                      active ? 'active' : ''
                    ].join(' ')}
                  >
                    {completed && (
                      <Icon
                        name={
                          active
                            ? status.icon
                            : 'check'
                        }
                        size={13}
                        stroke="currentColor"
                      />
                    )}
                  </div>

                  <span
                    className={
                      active
                        ? 'progress-label active'
                        : 'progress-label'
                    }
                  >
                    {status.short}
                  </span>

                  {index < STATUS_FLOW.length - 1 && (
                    <div
                      className={
                        index < statusIndex
                          ? 'progress-line filled'
                          : 'progress-line'
                      }
                    />
                  )}
                </div>
              )
            })}
          </div>

          <button
            type="button"
            className="primary-action"
            onClick={openStatusModal}
          >
            <Icon
              name="arrow-right-circle"
              size={19}
              stroke="var(--color-primary)"
            />

            Update order progress
          </button>

          <p className="action-hint">
            Choose where the order is now. Cresoa can
            prepare a customer update for you.
          </p>
        </section>

        <section className="money-grid">
          <div className="money-card">
            <span>Total</span>
            <strong>{formatMoney(order.price)}</strong>
          </div>

          <div className="money-card paid">
            <span>Paid</span>
            <strong>{formatMoney(order.amount_paid)}</strong>
          </div>

          <div
            className={
              balance > 0
                ? 'money-card balance'
                : 'money-card balance settled'
            }
          >
            <span>Balance</span>
            <strong>{formatMoney(balance)}</strong>

            {isFullyPaid && (
              <small>
                Fully paid
              </small>
            )}
          </div>

          <div
            className={
              isOverdue
                ? 'money-card due overdue'
                : 'money-card due'
            }
          >
            <span>Due date</span>
            <strong>
              {formatDate(order.due_date)}
            </strong>

            {isOverdue && (
              <small>Overdue</small>
            )}
          </div>
        </section>

        <section className="next-action-card">
          <div className="next-action-icon">
            <Icon
              name={
                isFullyPaid
                  ? 'check-circle'
                  : 'credit-card'
              }
              size={22}
              stroke={
                isFullyPaid
                  ? 'var(--color-secondary)'
                  : 'var(--color-primary)'
              }
            />
          </div>

          <div className="next-action-copy">
            <span className="section-label">
              {isFullyPaid
                ? 'PAYMENT COMPLETE'
                : 'PAYMENT'}
            </span>

            <h2>
              {isFullyPaid
                ? 'This order is fully paid'
                : `₦${Number(balance).toLocaleString('en-NG')} still outstanding`}
            </h2>

            <p>
              {isFullyPaid
                ? 'No further payment is required for this order.'
                : 'Record a payment whenever the customer makes another payment.'}
            </p>
          </div>

          {!isFullyPaid && (
            <button
              type="button"
              className="secondary-action"
              onClick={() =>
                setShowPaymentModal(true)
              }
            >
              <Icon
                name="plus"
                size={17}
                stroke="currentColor"
              />
              Record payment
            </button>
          )}
        </section>

        <section className="customer-card">
          <div className="customer-top">
            <div className="customer-avatar">
              {customerName
                .charAt(0)
                .toUpperCase()}
            </div>

            <div className="customer-copy">
              <span className="section-label">
                CUSTOMER
              </span>

              <h2>{customerName}</h2>

              {customer?.phone && (
                <p>{customer.phone}</p>
              )}

              {customer?.email && (
                <p>{customer.email}</p>
              )}
            </div>
          </div>

          <div className="customer-actions">
            {customer?.phone && (
              <a
                href={`tel:${customer.phone}`}
                className="contact-action"
              >
                <Icon
                  name="phone"
                  size={17}
                  stroke="currentColor"
                />
                Call customer
              </a>
            )}

            {customer?.phone && (
              <button
                type="button"
                className="contact-action whatsapp"
                onClick={sendWhatsApp}
                disabled={!canWhatsApp}
              >
                <Icon
                  name="message-circle"
                  size={17}
                  stroke="currentColor"
                />
                Message on WhatsApp
              </button>
            )}
          </div>
        </section>

        <section className="communication-card">
          <div className="section-header">
            <div>
              <span className="section-label">
                CUSTOMER UPDATES
              </span>

              <h2>
                Keep the customer informed
              </h2>
            </div>

            <Icon
              name="message-circle"
              size={22}
              stroke="var(--color-primary)"
            />
          </div>

          <p className="section-description">
            Send a clear update about where this order
            is in the production process.
          </p>

          <div className="communication-actions">
            <button
              type="button"
              className="communication-button"
              onClick={openStatusModal}
            >
              <Icon
                name="send"
                size={18}
                stroke="currentColor"
              />

              <span>
                Update order & notify customer
                <small>
                  Change the status and prepare a
                  WhatsApp message
                </small>
              </span>
            </button>

            {canTracking && (
              <button
                type="button"
                className="communication-button"
                onClick={sendTrackingLink}
              >
                <Icon
                  name="link"
                  size={18}
                  stroke="currentColor"
                />

                <span>
                  Send tracking link
                  <small>
                    Let the customer check progress
                    themselves
                  </small>
                </span>
              </button>
            )}
          </div>
        </section>


        <section className="tracking-card">
          <div className="section-header">
            <div>
              <span className="section-label">
                CUSTOMER TRACKING
              </span>

              <h2>
                Let customers follow their order
              </h2>
            </div>

            <Icon
              name="globe"
              size={22}
              stroke="var(--color-primary)"
            />
          </div>

          <p className="section-description">
            Customers can use this private link to
            see the latest status without contacting you.
          </p>

          <div className="tracking-box">
            <Icon
              name="link"
              size={18}
              stroke="var(--color-text-muted)"
            />

            <span>
              {getTrackingLink()}
            </span>

            <button
              type="button"
              onClick={copyTrackingLink}
              aria-label="Copy tracking link"
            >
              <Icon
                name={copied ? 'check' : 'copy'}
                size={17}
                stroke={
                  copied
                    ? 'var(--color-secondary)'
                    : 'currentColor'
                }
              />
            </button>
          </div>

          <div className="tracking-actions">
            <button
              type="button"
              className="outline-action"
              onClick={copyTrackingLink}
            >
              <Icon
                name={copied ? 'check' : 'copy'}
                size={17}
                stroke="currentColor"
              />

              {copied
                ? 'Tracking link copied'
                : 'Copy tracking link'}
            </button>

            {customer?.phone && (
              <button
                type="button"
                className="outline-action"
                onClick={sendTrackingLink}
              >
                <Icon
                  name="send"
                  size={17}
                  stroke="currentColor"
                />

                Share with customer
              </button>
            )}
          </div>
        </section>

        <section className="details-card">
          <div className="section-header">
            <div>
              <span className="section-label">
                ORDER INFORMATION
              </span>

              <h2>
                Production details
              </h2>
            </div>

            <Icon
              name="file-text"
              size={22}
              stroke="var(--color-primary)"
            />
          </div>

          <div className="details-list">
            <div className="detail-row">
              <span>Order title</span>
              <strong>
                {order.title || 'Not specified'}
              </strong>
            </div>

            <div className="detail-row">
              <span>Category</span>
              <strong>
                {order.category || 'Fashion'}
              </strong>
            </div>

            <div className="detail-row">
              <span>Quantity</span>
              <strong>
                {order.quantity || 1}
              </strong>
            </div>

            <div className="detail-row">
              <span>Fabric</span>
              <strong>
                {order.fabric || 'Not specified'}
              </strong>
            </div>

            <div className="detail-row">
              <span>Fitting date</span>
              <strong>
                {formatDate(order.fitting_date)}
              </strong>
            </div>

            <div className="detail-row">
              <span>Event date</span>
              <strong>
                {formatDate(order.event_date)}
              </strong>
            </div>

            <div className="detail-row">
              <span>Delivery date</span>
              <strong>
                {formatDate(order.delivery_date)}
              </strong>
            </div>
          </div>
        </section>

        <section className="notes-card">
          <div className="section-header">
            <div>
              <span className="section-label">
                PRIVATE NOTES
              </span>

              <h2>
                Notes for you and your team
              </h2>
            </div>

            <Icon
              name="lock"
              size={20}
              stroke="var(--color-primary)"
            />
          </div>

          <p className="section-description">
            These notes are private. The customer will
            not see them.
          </p>

          <textarea
            value={notes}
            onChange={event =>
              setNotes(event.target.value)
            }
            placeholder="Add fitting instructions, design details, fabric notes, or anything your team needs to remember..."
            rows={5}
          />

          <div className="notes-footer">
            <span>
              Private to your business
            </span>

            <button
              type="button"
              className="secondary-action"
              onClick={saveNotes}
              disabled={savingNotes}
            >
              {savingNotes
                ? 'Saving...'
                : 'Save notes'}
            </button>
          </div>
        </section>

        <section className="payments-card">
          <div className="section-header">
            <div>
              <span className="section-label">
                PAYMENT HISTORY
              </span>

              <h2>
                Payments
              </h2>
            </div>

            <button
              type="button"
              className="small-add-button"
              onClick={() =>
                setShowPaymentModal(true)
              }
              disabled={isFullyPaid}
            >
              <Icon
                name="plus"
                size={16}
                stroke="currentColor"
              />
              Add payment
            </button>
          </div>

          {payments.length === 0 ? (
            <div className="empty-payments">
              <Icon
                name="credit-card"
                size={24}
                stroke="var(--color-text-muted)"
              />

              <p>
                No payments have been recorded yet.
              </p>
            </div>
          ) : (
            <div className="payment-list">
              {payments.map(payment => (
                <div
                  className="payment-row"
                  key={payment.id}
                >
                  <div>
                    <strong>
                      {formatMoney(payment.amount)}
                    </strong>

                    <span>
                      {formatDate(
                        payment.created_at
                      )}
                    </span>
                  </div>

                  <span>
                    {payment.note ||
                      'Payment received'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="secondary-tools">
          <button
            type="button"
            onClick={handleDuplicate}
            className="tool-button"
          >
            <Icon
              name="copy"
              size={18}
              stroke="currentColor"
            />

            <span>
              Duplicate order
              <small>
                Create another order using these
                details
              </small>
            </span>
          </button>
        </section>

        <section className="danger-zone">
          <button
            type="button"
            className="tool-button"
            onClick={() =>
              alert(
                'Delete functionality remains protected. Use the existing delete flow from the order menu.'
              )
            }
          >
            <Icon
              name="trash-2"
              size={18}
              stroke="var(--color-danger)"
            />

            <span>
              Delete order
              <small>
                Permanently remove this order
              </small>
            </span>
          </button>
        </section>

      </section>

      {showStatusModal && (
        <div
          className="modal-backdrop"
          onMouseDown={() =>
            !updatingStatus &&
            setShowStatusModal(false)
          }
        >
          <div
            className="modal"
            onMouseDown={event =>
              event.stopPropagation()
            }
          >
            <div className="modal-header">
              <div>
                <span className="section-label">
                  ORDER PROGRESS
                </span>

                <h2>
                  Where is this order now?
                </h2>
              </div>

              <button
                type="button"
                className="close-button"
                onClick={() =>
                  setShowStatusModal(false)
                }
                disabled={updatingStatus}
                aria-label="Close"
              >
                <Icon
                  name="x"
                  size={20}
                  stroke="currentColor"
                />
              </button>
            </div>

            <p className="modal-description">
              Choose the stage that best describes
              where the order is right now.
            </p>

            <div className="status-options">
              {STATUS_FLOW.map((status, index) => {
                const selected =
                  selectedStatus === status.value

                const current =
                  order.current_status ===
                  status.value

                const passed =
                  index < statusIndex

                return (
                  <button
                    type="button"
                    key={status.value}
                    className={[
                      'status-option',
                      selected ? 'selected' : '',
                      current ? 'current' : '',
                      passed ? 'passed' : ''
                    ].join(' ')}
                    onClick={() =>
                      selectStatus(status.value)
                    }
                    disabled={
                      updatingStatus || current
                    }
                  >
                    <div className="status-option-icon">
                      <Icon
                        name={status.icon}
                        size={19}
                        stroke={
                          selected
                            ? 'var(--color-primary)'
                            : current
                              ? 'var(--color-secondary)'
                              : 'var(--color-text-muted)'
                        }
                      />
                    </div>

                    <div className="status-option-copy">
                      <strong>
                        {status.label}
                      </strong>

                      <span>
                        {status.description}
                      </span>
                    </div>

                    {current && (
                      <span className="current-badge">
                        Current
                      </span>
                    )}

                    {selected && (
                      <Icon
                        name="check-circle"
                        size={20}
                        stroke="var(--color-primary)"
                      />
                    )}
                  </button>
                )
              })}
            </div>

            {selectedStatusInfo && (
              <div className="customer-preview">
                <div className="preview-icon">
                  <Icon
                    name="message-circle"
                    size={19}
                    stroke="var(--color-primary)"
                  />
                </div>

                <div>
                  <strong>
                    Customer message
                  </strong>

                  <p>
                    Hi {customerName},{' '}
                    {selectedStatusInfo.customerMessage}
                  </p>
                </div>
              </div>
            )}

            <div className="modal-footer">
              <button
                type="button"
                className="cancel-button"
                onClick={() => {
                  setSelectedStatus(null)
                  setShowStatusModal(false)
                }}
                disabled={updatingStatus}
              >
                Cancel
              </button>

              <button
                type="button"
                className="confirm-status-button"
                disabled={
                  !selectedStatus ||
                  updatingStatus
                }
                onClick={() =>
                  updateStatus(selectedStatus)
                }
              >
                {updatingStatus
                  ? 'Updating...'
                  : selectedStatus
                    ? `Move order to ${selectedStatusInfo?.short || selectedStatus}`
                    : 'Choose a status'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showPaymentModal && (
        <div
          className="modal-backdrop"
          onMouseDown={() =>
            !recordingPayment &&
            setShowPaymentModal(false)
          }
        >
          <form
            className="modal payment-modal"
            onSubmit={handleRecordPayment}
            onMouseDown={event =>
              event.stopPropagation()
            }
          >
            <div className="modal-header">
              <div>
                <span className="section-label">
                  PAYMENT
                </span>

                <h2>
                  Record a payment
                </h2>
              </div>

              <button
                type="button"
                className="close-button"
                onClick={() =>
                  setShowPaymentModal(false)
                }
                disabled={recordingPayment}
              >
                <Icon
                  name="x"
                  size={20}
                  stroke="currentColor"
                />
              </button>
            </div>

            <div className="balance-banner">
              <span>Remaining balance</span>
              <strong>
                {formatMoney(balance)}
              </strong>
            </div>

            <label className="field">
              <span>
                Amount received
              </span>

              <div className="amount-input">
                <span>₦</span>

                <input
                  type="number"
                  min="1"
                  max={balance}
                  step="0.01"
                  value={paymentAmount}
                  onChange={event =>
                    setPaymentAmount(
                      event.target.value
                    )
                  }
                  placeholder="0"
                  required
                />
              </div>
            </label>

            <label className="field">
              <span>
                Payment note
              </span>

              <input
                type="text"
                value={paymentNote}
                onChange={event =>
                  setPaymentNote(
                    event.target.value
                  )
                }
                placeholder="e.g. Cash payment, transfer"
              />
            </label>

            <div className="modal-footer">
              <button
                type="button"
                className="cancel-button"
                onClick={() =>
                  setShowPaymentModal(false)
                }
                disabled={recordingPayment}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="confirm-status-button"
                disabled={recordingPayment}
              >
                {recordingPayment
                  ? 'Recording...'
                  : 'Save payment'}
              </button>
            </div>
          </form>
        </div>
      )}

      {showEditModal && (
        <div
          className="modal-backdrop"
          onMouseDown={() =>
            !editing &&
            setShowEditModal(false)
          }
        >
          <form
            className="modal"
            onSubmit={handleEditSubmit}
            onMouseDown={event =>
              event.stopPropagation()
            }
          >
            <div className="modal-header">
              <div>
                <span className="section-label">
                  ORDER DETAILS
                </span>

                <h2>
                  Edit order
                </h2>
              </div>

              <button
                type="button"
                className="close-button"
                onClick={() =>
                  setShowEditModal(false)
                }
                disabled={editing}
              >
                <Icon
                  name="x"
                  size={20}
                  stroke="currentColor"
                />
              </button>
            </div>

            <p className="modal-description">
              Update the basic information for this
              order. Production status and payments
              are managed separately.
            </p>

            <label className="field">
              <span>Order name</span>

              <input
                type="text"
                value={editForm.title}
                onChange={event =>
                  setEditForm({
                    ...editForm,
                    title: event.target.value
                  })
                }
                placeholder="e.g. Aso-ebi dress"
                required
              />
            </label>

            <label className="field">
              <span>Total price</span>

              <div className="amount-input">
                <span>₦</span>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={editForm.price}
                  onChange={event =>
                    setEditForm({
                      ...editForm,
                      price: event.target.value
                    })
                  }
                  placeholder="0"
                  required
                />
              </div>
            </label>

            <label className="field">
              <span>Due date</span>

              <input
                type="date"
                value={editForm.due_date}
                onChange={event =>
                  setEditForm({
                    ...editForm,
                    due_date: event.target.value
                  })
                }
              />
            </label>

            <div className="modal-footer">
              <button
                type="button"
                className="cancel-button"
                onClick={() =>
                  setShowEditModal(false)
                }
                disabled={editing}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="confirm-status-button"
                disabled={editing}
              >
                {editing
                  ? 'Saving...'
                  : 'Save changes'}
              </button>
            </div>
          </form>
        </div>
      )}

      <style jsx>{`
        .order-page {
          min-height: 100vh;
          background: var(--color-bg);
          color: var(--color-text);
          padding: 0 16px 48px;
        }

        .page-shell {
          width: 100%;
          max-width: 760px;
          margin: 0 auto;
        }

        .page-header {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 20px 0 22px;
        }

        .back-button,
        .close-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          width: 42px;
          height: 42px;
          border: 1px solid var(--color-border);
          border-radius: 12px;
          background: var(--color-card);
          color: var(--color-primary);
          cursor: pointer;
        }

        .header-copy {
          min-width: 0;
          flex: 1;
        }

        .eyebrow,
        .section-label {
          display: block;
          color: var(--color-text-muted);
          font-size: 10px;
          line-height: 1.2;
          font-weight: 800;
          letter-spacing: .11em;
        }

        .header-copy h1 {
          overflow: hidden;
          margin: 4px 0 2px;
          font-size: 21px;
          line-height: 1.25;
          font-weight: 800;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .header-copy p {
          margin: 0;
          color: var(--color-text-muted);
          font-size: 13px;
        }

        .edit-button {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          flex-shrink: 0;
          border: 1px solid var(--color-border);
          border-radius: 10px;
          padding: 10px 12px;
          background: var(--color-card);
          color: var(--color-primary);
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
        }

        .status-hero,
        .customer-card,
        .communication-card,
        .tracking-card,
        .details-card,
        .notes-card,
        .payments-card,
        .next-action-card {
          margin-bottom: 14px;
          border: 1px solid var(--color-border);
          border-radius: 20px;
          background: var(--color-card);
          box-shadow: var(--shadow);
        }

        .status-hero {
          padding: 20px;
        }

        .status-heading {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
        }

        .status-heading h2 {
          margin: 7px 0 5px;
          font-size: 24px;
          line-height: 1.15;
        }

        .status-heading p {
          max-width: 540px;
          margin: 0;
          color: var(--color-text-muted);
          font-size: 13px;
          line-height: 1.55;
        }

        .status-icon,
        .next-action-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 48px;
          height: 48px;
          flex-shrink: 0;
          border-radius: 15px;
          background: rgba(212, 165, 42, .12);
        }

        .progress-track {
          display: flex;
          align-items: flex-start;
          margin: 26px 0 20px;
        }

        .progress-item {
          position: relative;
          display: flex;
          align-items: center;
          flex: 1;
        }

        .progress-item:last-child {
          flex: 0;
        }

        .progress-dot {
          position: relative;
          z-index: 2;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          flex-shrink: 0;
          border: 2px solid var(--color-border);
          border-radius: 50%;
          background: var(--color-card);
          color: var(--color-text-muted);
        }

        .progress-dot.completed {
          border-color: var(--color-secondary);
          background: var(--color-secondary);
          color: white;
        }

        .progress-dot.active {
          border-color: var(--color-accent);
          background: var(--color-accent);
          color: var(--color-primary);
          box-shadow: 0 0 0 5px rgba(212, 165, 42, .12);
        }

        .progress-line {
          width: 100%;
          height: 2px;
          background: var(--color-border);
        }

        .progress-line.filled {
          background: var(--color-secondary);
        }

        .progress-label {
          position: absolute;
          top: 35px;
          left: 0;
          color: var(--color-text-muted);
          font-size: 9px;
          font-weight: 700;
          white-space: nowrap;
        }

        .progress-label.active {
          color: var(--color-primary);
        }

        .primary-action {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-top: 18px;
          padding: 14px;
          border: 0;
          border-radius: 14px;
          background: var(--color-accent);
          color: var(--color-primary);
          font-size: 14px;
          font-weight: 800;
          cursor: pointer;
        }

        .action-hint {
          margin: 10px 0 0;
          text-align: center;
          color: var(--color-text-muted);
          font-size: 12px;
        }

        .money-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
          margin-bottom: 14px;
        }

        .money-card {
          padding: 16px;
          border-radius: 18px;
          border: 1px solid var(--color-border);
          background: var(--color-card);
          box-shadow: var(--shadow);
        }

        .money-card span {
          display: block;
          color: var(--color-text-muted);
          font-size: 12px;
          margin-bottom: 7px;
        }

        .money-card strong {
          display: block;
          font-size: 19px;
          font-weight: 800;
        }

        .money-card small {
          display: block;
          margin-top: 6px;
          font-size: 12px;
          color: var(--color-secondary);
          font-weight: 700;
        }

        .money-card.balance.overdue,
        .overdue {
          border-color: rgba(217,83,79,.4);
        }

        .settled {
          border-color: rgba(46,125,94,.3);
        }

        .next-action-card {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 18px;
        }

        .next-action-copy {
          flex: 1;
        }

        .next-action-copy h2 {
          margin: 5px 0;
          font-size: 16px;
        }

        .next-action-copy p {
          margin: 0;
          color: var(--color-text-muted);
          font-size: 13px;
        }

        .secondary-action {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          border: 0;
          border-radius: 12px;
          padding: 11px 14px;
          background: var(--color-primary);
          color: white;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
        }

        .customer-card,
        .communication-card,
        .tracking-card,
        .details-card,
        .notes-card,
        .payments-card {
          padding: 18px;
        }

        .customer-top {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .customer-avatar {
          width: 52px;
          height: 52px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: var(--color-primary);
          color: white;
          font-size: 22px;
          font-weight: 800;
        }

        .customer-copy h2,
        .section-header h2 {
          margin: 5px 0;
          font-size: 17px;
        }

        .customer-copy p {
          margin: 2px 0;
          color: var(--color-text-muted);
          font-size: 13px;
        }

        .customer-actions,
        .tracking-actions {
          display: flex;
          gap: 10px;
          margin-top: 16px;
          flex-wrap: wrap;
        }

        .contact-action,
        .outline-action {
          flex: 1;
          min-width: 140px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          padding: 12px;
          border-radius: 12px;
          border: 1px solid var(--color-border);
          background: var(--color-card);
          color: var(--color-primary);
          font-size: 12px;
          font-weight: 700;
          text-decoration: none;
          cursor: pointer;
        }

        .whatsapp {
          color: var(--color-secondary);
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
        }

        .section-description {
          margin: 10px 0;
          color: var(--color-text-muted);
          font-size: 13px;
          line-height: 1.5;
        }

        .communication-actions {
          display: grid;
          gap: 10px;
        }

        .communication-button,
        .tool-button {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px;
          border-radius: 14px;
          border: 1px solid var(--color-border);
          background: var(--color-card);
          color: var(--color-primary);
          text-align: left;
          cursor: pointer;
        }

        .communication-button span,
        .tool-button span {
          display: flex;
          flex-direction: column;
          font-weight: 700;
        }

        .communication-button small,
        .tool-button small {
          margin-top: 4px;
          color: var(--color-text-muted);
          font-weight: 400;
          line-height: 1.3;
        }

        .tracking-box {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px;
          border-radius: 12px;
          background: var(--color-bg);
          border: 1px solid var(--color-border);
        }

        .tracking-box span {
          overflow: hidden;
          flex: 1;
          white-space: nowrap;
          text-overflow: ellipsis;
          font-size: 12px;
        }

        .tracking-box button {
          border: 0;
          background: transparent;
          cursor: pointer;
                                        }

        .details-list {
          margin-top: 14px;
        }

        .detail-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          padding: 13px 0;
          border-bottom: 1px solid var(--color-border);
        }

        .detail-row:last-child {
          border-bottom: 0;
        }

        .detail-row span {
          color: var(--color-text-muted);
          font-size: 13px;
        }

        .detail-row strong {
          text-align: right;
          font-size: 13px;
        }

        .notes-card textarea {
          width: 100%;
          box-sizing: border-box;
          margin-top: 12px;
          padding: 13px;
          resize: vertical;
          min-height: 120px;
          border: 1px solid var(--color-border);
          border-radius: 12px;
          outline: none;
          background: var(--color-bg);
          color: var(--color-text);
          font: inherit;
          font-size: 13px;
          line-height: 1.5;
        }

        .notes-card textarea:focus,
        .field input:focus {
          border-color: var(--color-primary);
          box-shadow: 0 0 0 3px rgba(15,43,74,.08);
        }

        .notes-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-top: 10px;
        }

        .notes-footer span {
          color: var(--color-text-muted);
          font-size: 11px;
        }

        .payment-list {
          margin-top: 12px;
        }

        .payment-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          padding: 13px 0;
          border-bottom: 1px solid var(--color-border);
        }

        .payment-row:last-child {
          border-bottom: 0;
        }

        .payment-row div {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .payment-row strong {
          font-size: 14px;
        }

        .payment-row span {
          color: var(--color-text-muted);
          font-size: 11px;
        }

        .empty-payments {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-top: 14px;
          padding: 18px;
          border-radius: 12px;
          background: var(--color-bg);
        }

        .empty-payments p {
          margin: 0;
          color: var(--color-text-muted);
          font-size: 13px;
        }

        .small-add-button {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          border: 0;
          border-radius: 9px;
          padding: 9px 11px;
          background: var(--color-primary);
          color: white;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
        }

        .secondary-tools,
        .danger-zone {
          margin-bottom: 12px;
        }

        .danger-zone {
          padding-top: 4px;
        }

        .danger-zone .tool-button {
          color: var(--color-danger);
        }

        .modal-backdrop {
          position: fixed;
          z-index: 1000;
          inset: 0;
          display: flex;
          align-items: flex-end;
          justify-content: center;
          padding: 16px;
          background: rgba(10,22,40,.48);
        }

        .modal {
          width: 100%;
          max-width: 560px;
          max-height: calc(100vh - 32px);
          overflow-y: auto;
          padding: 20px;
          box-sizing: border-box;
          border-radius: 22px 22px 16px 16px;
          background: var(--color-card);
          box-shadow: var(--shadow-lg);
        }

        .modal-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 15px;
        }

        .modal-header h2 {
          margin: 6px 0 0;
          font-size: 20px;
        }

        .modal-description {
          margin: 12px 0 18px;
          color: var(--color-text-muted);
          font-size: 13px;
          line-height: 1.5;
        }

        .status-options {
          display: grid;
          gap: 8px;
        }

        .status-option {
          display: flex;
          align-items: center;
          gap: 11px;
          width: 100%;
          padding: 12px;
          border: 1px solid var(--color-border);
          border-radius: 13px;
          background: var(--color-card);
          color: var(--color-text);
          text-align: left;
          cursor: pointer;
        }

        .status-option.selected {
          border-color: var(--color-accent);
          background: rgba(212,165,42,.09);
        }

        .status-option.current {
          cursor: default;
          background: var(--color-bg);
        }

        .status-option-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          flex-shrink: 0;
          border-radius: 10px;
          background: var(--color-bg);
        }

        .status-option-copy {
          min-width: 0;
          flex: 1;
        }

        .status-option-copy strong {
          display: block;
          font-size: 13px;
        }

        .status-option-copy span {
          display: block;
          margin-top: 3px;
          color: var(--color-text-muted);
          font-size: 11px;
          line-height: 1.35;
        }

        .current-badge {
          padding: 4px 7px;
          border-radius: 20px;
          background: rgba(46,125,94,.1);
          color: var(--color-secondary);
          font-size: 9px;
          font-weight: 800;
          white-space: nowrap;
        }

        .customer-preview {
          display: flex;
          gap: 10px;
          margin-top: 14px;
          padding: 13px;
          border: 1px solid var(--color-border);
          border-radius: 13px;
          background: var(--color-bg);
        }

        .preview-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 34px;
          height: 34px;
          flex-shrink: 0;
          border-radius: 9px;
          background: rgba(212,165,42,.12);
        }

        .customer-preview strong {
          font-size: 12px;
        }

        .customer-preview p {
          margin: 5px 0 0;
          color: var(--color-text-muted);
          font-size: 11px;
          line-height: 1.45;
        }

        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
          margin-top: 20px;
        }

        .cancel-button,
        .confirm-status-button {
          border: 0;
          border-radius: 11px;
          padding: 12px 15px;
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
        }

        .cancel-button {
          border: 1px solid var(--color-border);
          background: var(--color-card);
          color: var(--color-text);
        }

        .confirm-status-button {
          background: var(--color-accent);
          color: var(--color-primary);
        }

        .confirm-status-button:disabled,
        .secondary-action:disabled,
        .small-add-button:disabled,
        .contact-action:disabled {
          opacity: .5;
          cursor: not-allowed;
        }

        .field {
          display: block;
          margin-top: 15px;
        }

        .field > span {
          display: block;
          margin-bottom: 6px;
          color: var(--color-text);
          font-size: 12px;
          font-weight: 700;
        }

        .field input {
          width: 100%;
          box-sizing: border-box;
          padding: 12px;
          border: 1px solid var(--color-border);
          border-radius: 11px;
          outline: none;
          background: var(--color-card);
          color: var(--color-text);
          font: inherit;
          font-size: 13px;
        }

        .amount-input {
          display: flex;
          align-items: center;
          border: 1px solid var(--color-border);
          border-radius: 11px;
          background: var(--color-card);
          overflow: hidden;
        }

        .amount-input span {
          padding-left: 12px;
          color: var(--color-text-muted);
          font-weight: 700;
        }

        .amount-input input {
          border: 0;
          flex: 1;
        }

        .balance-banner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin: 16px 0;
          padding: 13px;
          border-radius: 11px;
          background: rgba(212,165,42,.1);
        }

        .balance-banner span {
          color: var(--color-text-muted);
          font-size: 12px;
        }

        .balance-banner strong {
          color: var(--color-primary);
          font-size: 16px;
        }

        @media (min-width: 640px) {
          .order-page {
            padding: 0 24px 64px;
          }

          .page-header {
            padding-top: 28px;
          }

          .money-grid {
            grid-template-columns: repeat(4, 1fr);
          }

          .modal-backdrop {
            align-items: center;
          }

          .modal {
            border-radius: 22px;
          }
        }

        @media (max-width: 430px) {
          .edit-button {
            width: 42px;
            height: 42px;
            padding: 0;
            font-size: 0;
          }

          .edit-button :global(svg) {
            width: 17px;
            height: 17px;
          }

          .status-hero {
            padding: 17px;
          }

          .status-heading h2 {
            font-size: 21px;
          }

          .progress-label {
            font-size: 8px;
          }

          .money-card {
            padding: 13px;
          }

          .money-card strong {
            font-size: 16px;
          }

          .next-action-card {
            align-items: flex-start;
            flex-wrap: wrap;
          }

          .next-action-copy {
            min-width: calc(100% - 68px);
          }

          .next-action-card .secondary-action {
            width: 100%;
          }

          .customer-actions,
          .tracking-actions {
            flex-direction: column;
          }

          .contact-action,
          .outline-action {
            width: 100%;
          }

          .modal {
            padding: 17px;
          }

          .modal-footer {
            flex-direction: column-reverse;
          }

          .cancel-button,
          .confirm-status-button {
            width: 100%;
          }
        }
      `}</style>
    </main>
  )
          }
