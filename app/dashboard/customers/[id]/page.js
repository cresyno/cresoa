'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../../lib/supabaseClient'
import { getCurrentBusinessId } from '../../../../lib/getBusinessId'
import { Icon } from '../../../../components/Icon'

const MEASUREMENT_FIELDS = [
  { key: 'bust', label: 'Bust/Chest (inches)' },
  { key: 'waist', label: 'Waist (inches)' },
  { key: 'hip', label: 'Hip (inches)' },
  { key: 'shoulder', label: 'Shoulder (inches)' },
  { key: 'sleeve_length', label: 'Sleeve length (inches)' },
  { key: 'full_length', label: 'Full length (inches)' },
]

export default function CustomerDetailPage({ params }) {
  const router = useRouter()
  const [customer, setCustomer] = useState(null)
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [stats, setStats] = useState(null)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [sector, setSector] = useState(null)
  const [businessId, setBusinessId] = useState(null)

  // ─── Form state ───
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [measurements, setMeasurements] = useState({})
  const [deleting, setDeleting] = useState(false)

  // ─── Load data ───
  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          router.push('/login')
          return
        }

        const bizId = getCurrentBusinessId()

        if (!bizId) {
          router.push('/dashboard')
          return
        }

        setBusinessId(bizId)

        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (!session) {
          router.push('/login')
          return
        }

        // ─── Fetch customer via API ───
        const response = await fetch(
          `/api/customers/${params.id}?business_id=${bizId}`,
          {
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          }
        )

        const result = await response.json()

        if (!response.ok) {
          throw new Error(
            result.error || 'Failed to load customer'
          )
        }

        const customerData = result.customer
        const ordersData = result.orders || []

        setCustomer(customerData)
        setOrders(ordersData)
        setName(customerData.name || '')
        setPhone(customerData.phone || '')
        setNotes(customerData.notes || '')
        setMeasurements(customerData.measurements || {})

        // ─── Get sector for measurements ───
        const { data: business } = await supabase
          .from('businesses')
          .select('sector')
          .eq('id', bizId)
          .single()

        if (business) {
          setSector(business.sector)
        }

        // ─── Calculate stats ───
        if (ordersData.length > 0) {
          const totalSpent = ordersData.reduce(
            (sum, o) => sum + (o.amount_paid || 0),
            0
          )

          const totalPrice = ordersData.reduce(
            (sum, o) => sum + (o.price || 0),
            0
          )

          const totalOwing = totalPrice - totalSpent

          setStats({
            totalSpent,
            totalPaid: totalSpent,
            totalOwing,
            count: ordersData.length,
            avg: Math.round(
              totalPrice / ordersData.length
            ),
          })
        } else {
          setStats({
            totalSpent: 0,
            totalPaid: 0,
            totalOwing: 0,
            count: 0,
            avg: 0,
          })
        }

      } catch (err) {
        console.error('Error loading customer:', err)

        setError(
          err.message ||
          'Failed to load customer details.'
        )

      } finally {
        setLoading(false)
      }
    }

    load()

  }, [params.id, router])

  // ─── Helpers ───

  const updateMeasurement = (key, value) => {
    setMeasurements({
      ...measurements,
      [key]: value,
    })
  }

  const handlePhoneChange = (event) => {
    const digits = event.target.value
      .replace(/\D/g, '')
      .slice(0, 11)

    setPhone(digits)
  }

  const refreshCustomer = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session || !businessId) return

      const response = await fetch(
        `/api/customers/${params.id}?business_id=${businessId}`,
        {
          headers: {
            Authorization:
              `Bearer ${session.access_token}`,
          },
        }
      )

      const result = await response.json()

      if (!response.ok) {
        throw new Error(
          result.error ||
          'Unable to refresh customer'
        )
      }

      setCustomer(result.customer)

      setOrders(
        result.orders || []
      )

      setName(
        result.customer.name || ''
      )

      setPhone(
        result.customer.phone || ''
      )

      setNotes(
        result.customer.notes || ''
      )

      setMeasurements(
        result.customer.measurements || {}
      )

    } catch (err) {
      console.error(
        'Refresh error:',
        err
      )
    }
  }

  const handleSave = async (event) => {
  event.preventDefault()

  setSaving(true)
  setMessage('')

  const phoneDigits = phone.replace(/\D/g, '')

  if (!name.trim() || phoneDigits.length !== 11) {
    setMessage(
      'Please provide a name and valid 11-digit phone number.'
    )
    setSaving(false)
    return
  }

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      router.push('/login')
      return
    }

    const updateData = {
      name: name.trim(),
      phone: phoneDigits,
      notes: notes.trim(),
      measurements:
        sector === 'Fashion & Custom Wear'
          ? measurements
          : {},
    }

    const response = await fetch(
      `/api/customers/${params.id}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type':
            'application/json',
          Authorization:
            `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(updateData),
      }
    )

    // Handle empty response safely
    const text = await response.text()
    let result = null
    try {
      result = JSON.parse(text)
    } catch (_) {
      // Response is empty or not JSON – that's OK if status is 200
    }

    if (!response.ok) {
      const errorMsg = result?.error || result?.message || text || 'Failed to update customer'
      throw new Error(errorMsg)
    }

    await refreshCustomer()

    setEditing(false)

    setMessage(
      'Customer updated successfully'
    )

    setTimeout(() => {
      setMessage('')
    }, 3000)

  } catch (err) {
    console.error(
      'Update error:',
      err
    )

    setMessage(
      `Error: ${err.message}`
    )
  } finally {
    setSaving(false)
  }
  }
  const handleDelete = async () => {
    const confirmed = window.confirm(
      'Delete this customer and all their orders? This cannot be undone.'
    )

    if (!confirmed) return

    setDeleting(true)

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        router.push('/login')
        return
      }

      const response = await fetch(
        `/api/customers/${params.id}`,
        {
          method: 'DELETE',
          headers: {
            Authorization:
              `Bearer ${session.access_token}`,
          },
        }
      )

      if (!response.ok) {
        const result = await response.json()

        throw new Error(
          result.error ||
          'Failed to delete customer'
        )
      }

      router.push(
        `/dashboard/customers?business_id=${businessId}`
      )

    } catch (err) {
      console.error(
        'Delete error:',
        err
      )

      alert(
        'Failed to delete customer: ' +
        err.message
      )

      setDeleting(false)
    }
  }

  const isFashion =
    sector === 'Fashion & Custom Wear'

  // ─── Loading state ───

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: 'var(--color-bg)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div className="customer-loading-spinner" />

        <style>{`
          @keyframes customer-spin {
            to {
              transform: rotate(360deg);
            }
          }

          .customer-loading-spinner {
            width: 36px;
            height: 36px;
            border: 3px solid var(--color-border);
            border-top-color: var(--color-accent);
            border-radius: 50%;
            animation:
              customer-spin
              0.8s linear infinite;
          }
        `}</style>
      </div>
    )
  }

  // ─── Error state ───

  if (error || !customer) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: 'var(--color-bg)',
          padding: '2rem',
          textAlign: 'center',
          color: 'var(--color-text)',
        }}
      >
        <Icon
          name="alert-circle"
          size={32}
          stroke="var(--color-danger)"
        />

        <p
          style={{
            color: 'var(--color-danger)',
            marginTop: '0.75rem',
          }}
        >
          {error ||
            'Customer not found.'}
        </p>

        <button
          className="btn btn-primary"
          onClick={() =>
            router.push(
              `/dashboard/customers?business_id=${businessId}`
            )
          }
        >
          <Icon
            name="arrow-left"
            size={15}
          />

          Back to customers
        </button>
      </div>
    )
  }

  // ─── Customer detail page ───

  return (
    <div
      className="customer-page"
      style={{
        minHeight: '100vh',
        background: 'var(--color-bg)',
        padding: '1.5rem 1.2rem',
        color: 'var(--color-text)',
      }}
    >
      <style>{`
        .customer-page {
          max-width: 1100px;
          margin: 0 auto;
        }

        .customer-back {
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
          background: none;
          border: none;
          color: var(--color-text-muted);
          font-size: 0.85rem;
          padding: 0;
          margin-bottom: 1rem;
          cursor: pointer;
        }

        .customer-back:hover {
          color: var(--color-accent);
        }

        .customer-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 1rem;
          flex-wrap: wrap;
          margin-bottom: 1.2rem;
        }

        .customer-heading {
          min-width: 0;
        }

        .customer-name {
          margin: 0;
          font-size: 1.5rem;
          line-height: 1.2;
          font-weight: 700;
          color: var(--color-text);
        }

        .customer-phone {
          margin: 0.35rem 0 0;
          color: var(--color-text-muted);
          font-size: 0.9rem;
        }

        .customer-header-actions {
          display: flex;
          align-items: center;
          gap: 0.45rem;
          flex-wrap: wrap;
        }

        .customer-btn {
          min-height: 34px;
          padding: 0.4rem 0.7rem;
          border-radius: 7px;
          font-size: 0.75rem;
          font-weight: 600;
          border: 1px solid var(--color-border);
          background: var(--color-card);
          color: var(--color-text);
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.3rem;
          text-decoration: none;
        }

        .customer-btn:hover {
          background: var(--color-bg);
        }

        .customer-btn-primary {
          background: var(--color-primary);
          border-color: var(--color-primary);
          color: #fff;
        }

        .customer-btn-gold {
          background: var(--color-accent);
          border-color: var(--color-accent);
          color: #0F2B4A;
        }

        .customer-btn-danger {
          background: transparent;
          border-color: var(--color-danger);
          color: var(--color-danger);
        }

        .customer-btn-danger:hover {
          background: var(--color-danger);
          color: #fff;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 0.6rem;
          margin-bottom: 1.2rem;
        }

        .stat-card {
          background:
            var(--color-card);
          border:
            1px solid var(--color-border);
          border-radius: 9px;
          padding: 0.7rem 0.4rem;
          text-align: center;
        }

        .stat-card .number {
          margin: 0;
          font-size: 1.05rem;
          font-weight: 700;
        }

        .stat-card .number.navy {
          color:
            var(--color-text);
        }

        .stat-card .number.red {
          color:
            var(--color-danger);
        }

        .stat-card .number.green {
          color:
            var(--color-success);
        }

        .stat-card .label {
          margin:
            0.15rem 0 0;
          font-size: 0.6rem;
          color:
            var(--color-text-muted);
          text-transform:
            uppercase;
          letter-spacing:
            0.3px;
        }

        .edit-form {
          background:
            var(--color-card);
          border:
            1px solid var(--color-border);
          border-radius: 12px;
          padding: 1.2rem;
          margin-bottom: 1rem;
        }

        .edit-form .form-group {
          margin-bottom: 0.8rem;
        }

        .edit-form label {
          display: block;
          margin-bottom: 0.25rem;
          font-size: 0.8rem;
          font-weight: 500;
        }

        .edit-form input,
        .edit-form textarea {
          width: 100%;
          box-sizing: border-box;
          padding: 0.6rem;
          border:
            1px solid var(--color-border);
          border-radius: 6px;
          background:
            var(--color-bg);
          color:
            var(--color-text);
          font-family: inherit;
          font-size: 0.9rem;
        }

        .edit-form input:focus,
        .edit-form textarea:focus {
          outline: none;
          border-color:
            var(--color-accent);
        }

        .measurement-grid {
          display: grid;
          grid-template-columns:
            repeat(2, minmax(0, 1fr));
          gap: 0.6rem;
        }

        .orders-section {
          margin-top: 1.5rem;
          background:
            var(--color-card);
          border:
            1px solid var(--color-border);
          border-radius: 12px;
          overflow: hidden;
        }

        .orders-section .title {
          padding: 0.8rem 1rem;
          background:
            var(--color-bg);
          border-bottom:
            1px solid var(--color-border);
          font-weight: 600;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.75rem;
        }

        .orders-section .title a {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          color:
            var(--color-accent);
          text-decoration: none;
          font-size: 0.8rem;
          white-space: nowrap;
        }

        .orders-section .title a:hover {
          text-decoration: underline;
        }

        .order-row {
          padding: 0.7rem 1rem;
          border-bottom:
            1px solid var(--color-border);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
        }

        .order-row:last-child {
          border-bottom: none;
        }

        .order-title {
          font-weight: 500;
          color:
            var(--color-text);
          font-size: 0.85rem;
        }

        .order-status {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 0.7rem;
          padding: 0.15rem 0.5rem;
          border-radius: 12px;
          background:
            var(--color-bg);
          color:
            var(--color-text-muted);
          white-space: nowrap;
        }

        .order-status.ready {
          background: #DCEBE2;
          color: #2E7D5E;
        }

        .order-status.overdue {
          background: #F1DBD3;
          color: #D9534F;
        }

        .customer-btn:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .customer-btn-primary:disabled {
          opacity: 0.55;
        }

        @media (max-width: 700px) {
          .customer-page {
            padding:
              1.2rem 0.9rem;
          }

          .customer-header {
            align-items: stretch;
          }

          .customer-header-actions {
            width: 100%;
          }

          .customer-header-actions
            .customer-btn,
          .customer-header-actions a {
            flex: 1;
          }

          .stats-grid {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 480px) {
          .customer-name {
            font-size: 1.3rem;
          }

          .stats-grid {
            gap: 0.45rem;
          }

          .stat-card {
            padding:
              0.65rem 0.25rem;
          }

          .stat-card .number {
            font-size: 0.95rem;
          }

          .measurement-grid {
            grid-template-columns: 1fr;
          }

          .order-row {
            align-items: flex-start;
          }

          .order-row > div:last-child {
            flex-shrink: 0;
          }

          .edit-form {
            padding: 1rem;
          }
        }
      `}</style>

      <button
        type="button"
        className="customer-back"
        onClick={() =>
          router.push(
            `/dashboard/customers?business_id=${businessId}`
          )
        }
      >
        <Icon
          name="arrow-left"
          size={15}
        />

        Back to customers
      </button>

      <div className="customer-header">
        <div className="customer-heading">
          <h1 className="customer-name">
            {customer.name}
          </h1>

          <p className="customer-phone">
            {customer.phone ? (
              <>
                <Icon
                  name="phone"
                  size={14}
                />
                {' '}
                {customer.phone}
              </>
            ) : (
              'No phone number'
            )}
          </p>
        </div>

        <div className="customer-header-actions">
          <button
            type="button"
            className="customer-btn customer-btn-gold"
            onClick={() =>
              setEditing(!editing)
            }
          >
            <Icon
              name={editing ? 'x' : 'edit-2'}
              size={15}
            />

            {editing
              ? 'Close'
              : 'Edit'}
          </button>

          <a
            href={`/dashboard/orders/new?business_id=${businessId}&customer_id=${customer.id}`}
            className="customer-btn customer-btn-primary"
          >
            <Icon
              name="plus"
              size={15}
            />

            New Order
          </a>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <p className="number navy">
            ₦
            {(
              stats?.totalSpent || 0
            ).toLocaleString()}
          </p>

          <p className="label">
            Total Spent
          </p>
        </div>

        <div className="stat-card">
          <p className="number navy">
            {stats?.count || 0}
          </p>

          <p className="label">
            Orders
          </p>
        </div>

        <div className="stat-card">
          <p
            className={`number ${
              stats?.totalOwing > 0
                ? 'red'
                : 'green'
            }`}
          >
            {stats?.totalOwing > 0
              ? `₦${stats.totalOwing.toLocaleString()}`
              : '✓ Paid'}
          </p>

          <p className="label">
            Balance
          </p>
        </div>

        <div className="stat-card">
          <p className="number navy">
            ₦
            {(
              stats?.avg || 0
            ).toLocaleString()}
          </p>

          <p className="label">
            Avg Order
          </p>
        </div>
      </div>

      {editing && (
        <form
          onSubmit={handleSave}
          className="edit-form"
        >
          <div className="form-group">
            <label>
              Customer name
            </label>

            <input
              type="text"
              value={name}
              onChange={(e) =>
                setName(e.target.value)
              }
              required
            />
          </div>

          <div className="form-group">
            <label>
              Phone number
            </label>

            <input
              type="tel"
              inputMode="numeric"
              value={phone}
              onChange={
                handlePhoneChange
              }
              required
              placeholder="08012345678"
            />

            <div
              style={{
                fontSize: '0.7rem',
                color:
                  phone.length === 11
                    ? 'var(--color-success)'
                    : 'var(--color-text-muted)',
                marginTop: '0.2rem',
              }}
            >
              {phone.length}/11 digits

              {phone.length === 11 &&
                ' ✓ valid'}
            </div>
          </div>

          <div className="form-group">
            <label>
              Notes
            </label>

            <textarea
              value={notes}
              onChange={(e) =>
                setNotes(e.target.value)
              }
              rows={3}
              placeholder="Customer notes..."
            />
          </div>

          {isFashion && (
            <>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  margin:
                    '1rem 0 0.6rem',
                }}
              >
                <Icon
                  name="ruler"
                  size={16}
                  stroke="var(--color-accent)"
                />

                <h3
                  style={{
                    color:
                      'var(--color-text)',
                    fontSize: '0.9rem',
                    margin: 0,
                  }}
                >
                  Measurements
                </h3>
              </div>

              <div className="measurement-grid">
                {MEASUREMENT_FIELDS.map(
                  (field) => (
                    <div
                      key={field.key}
                      className="form-group"
                    >
                      <label>
                        {field.label}
                      </label>

                      <input
                        type="number"
                        step="0.1"
                        value={
                          measurements[
                            field.key
                          ] || ''
                        }
                        onChange={(e) =>
                          updateMeasurement(
                            field.key,
                            e.target.value
                          )
                        }
                      />
                    </div>
                  )
                )}
              </div>
            </>
          )}

          <div
            style={{
              display: 'flex',
              gap: '0.5rem',
              marginTop: '0.7rem',
              flexWrap: 'wrap',
            }}
          >
            <button
              type="submit"
              className="customer-btn customer-btn-primary"
              disabled={saving}
            >
              <Icon
                name={
                  saving
                    ? 'refresh-cw'
                    : 'check'
                }
                size={15}
              />
                   {saving
                ? 'Saving changes...'
                : 'Save customer'}
            </button>

            <button
              type="button"
              className="customer-btn"
              onClick={() =>
                setEditing(false)
              }
            >
              <Icon
                name="x"
                size={15}
              />

              Cancel
            </button>
          </div>

          {message && (
            <p
              style={{
                color:
                  message.startsWith(
                    'Customer updated'
                  )
                    ? 'var(--color-success)'
                    : 'var(--color-danger)',
                marginTop: '0.6rem',
                fontSize: '0.8rem',
              }}
            >
              {message}
            </p>
          )}
        </form>
      )}

      {/* ─── Order History ─── */}

      <div className="orders-section">
        <div className="title">
          <span>Order History</span>

          <a
            href={`/dashboard/orders/new?business_id=${businessId}&customer_id=${customer.id}`}
          >
            <Icon
              name="plus"
              size={13}
            />

            New Order
          </a>
        </div>

        {orders.length === 0 ? (
          <div
            style={{
              padding: '1.5rem',
              textAlign: 'center',
              color:
                'var(--color-text-muted)',
              fontSize: '0.9rem',
            }}
          >
            <Icon
              name="package"
              size={24}
              stroke="var(--color-text-muted)"
            />

            <p
              style={{
                margin:
                  '0.5rem 0 0',
              }}
            >
              No orders yet.
            </p>
          </div>
        ) : (
          orders.map((order) => {
            const status =
              order.current_status ||
              'Order placed'

            const isReady =
              status === 'Ready'

            const isOverdue =
              order.due_date &&
              new Date(order.due_date) <
                new Date() &&
              status !== 'Delivered'

            const balance =
              (order.price || 0) -
              (order.amount_paid || 0)

            return (
              <div
                key={order.id}
                className="order-row"
              >
                <div>
                  <div className="order-title">
                    {order.title ||
                      'Untitled order'}
                  </div>

                  <div
                    style={{
                      fontSize:
                        '0.75rem',
                      color:
                        'var(--color-text-muted)',
                      marginTop:
                        '0.15rem',
                    }}
                  >
                    ₦
                    {(
                      order.price || 0
                    ).toLocaleString()}

                    {' · '}

                    {order.due_date
                      ? `Due ${new Date(
                          order.due_date
                        ).toLocaleDateString(
                          'en-GB'
                        )}`
                      : 'No deadline'}
                  </div>
                </div>

                <div
                  style={{
                    textAlign: 'right',
                  }}
                >
                  <div
                    className={`order-status ${
                      isReady
                        ? 'ready'
                        : ''
                    } ${
                      isOverdue
                        ? 'overdue'
                        : ''
                    }`}
                  >
                    {isOverdue
                      ? 'Overdue'
                      : status}
                  </div>

                  {balance > 0 && (
                    <div
                      style={{
                        fontSize:
                          '0.65rem',
                        color:
                          'var(--color-danger)',
                        marginTop:
                          '0.15rem',
                      }}
                    >
                      ₦
                      {balance.toLocaleString()}
                      {' due'}
                    </div>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* ─── Customer Notes ─── */}

      {!editing &&
        customer.notes && (
          <div
            className="customer-notes"
            style={{
              marginTop: '1rem',
              background:
                'var(--color-card)',
              border:
                '1px solid var(--color-border)',
              borderRadius: '12px',
              padding: '1rem',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                marginBottom:
                  '0.45rem',
              }}
            >
              <Icon
                name="file-text"
                size={15}
                stroke="var(--color-accent)"
              />

              <strong
                style={{
                  fontSize: '0.8rem',
                }}
              >
                Notes
              </strong>
            </div>

            <p
              style={{
                margin: 0,
                fontSize: '0.85rem',
                lineHeight: 1.5,
                color:
                  'var(--color-text-muted)',
                whiteSpace:
                  'pre-wrap',
              }}
            >
              {customer.notes}
            </p>
          </div>
        )}

      {/* ─── Customer Actions ─── */}

      <div
        style={{
          display: 'flex',
          justifyContent:
            'flex-end',
          marginTop: '1.5rem',
          paddingTop: '1rem',
          borderTop:
            '1px solid var(--color-border)',
        }}
      >
        <button
          type="button"
          className="customer-btn customer-btn-danger"
          onClick={handleDelete}
          disabled={deleting}
        >
          <Icon
            name={
              deleting
                ? 'refresh-cw'
                : 'trash-2'
            }
            size={15}
          />

          {deleting
            ? 'Deleting...'
            : 'Delete customer'}
        </button>
      </div>
    </div>
  )
                }
        
