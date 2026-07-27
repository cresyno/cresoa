'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../../lib/supabaseClient'

const MEASUREMENT_FIELDS = [
  { key: 'bust', label: 'Bust/Chest', unit: 'inches' },
  { key: 'waist', label: 'Waist', unit: 'inches' },
  { key: 'hip', label: 'Hip', unit: 'inches' },
  { key: 'shoulder', label: 'Shoulder', unit: 'inches' },
  { key: 'sleeve_length', label: 'Sleeve Length', unit: 'inches' },
  { key: 'full_length', label: 'Full Length', unit: 'inches' },
]

export default function CustomerDetailPage({ params }) {
  const router = useRouter()
  const [customer, setCustomer] = useState(null)
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState(null)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  // Form state
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [measurements, setMeasurements] = useState({})

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    // Load customer
    const { data: customerData } = await supabase
      .from('customers')
      .select('*')
      .eq('id', params.id)
      .single()

    if (!customerData) {
      setLoading(false)
      return
    }

    setCustomer(customerData)
    setName(customerData.name || '')
    setPhone(customerData.phone || '')
    setNotes(customerData.notes || '')
    setMeasurements(customerData.measurements || {})

    // Load orders
    const { data: orderData } = await supabase
      .from('orders')
      .select('*')
      .eq('customer_id', params.id)
      .order('created_at', { ascending: false })

    setOrders(orderData || [])

    // Calculate stats
    if (orderData && orderData.length > 0) {
      const totalSpent = orderData.reduce((sum, o) => sum + o.price, 0)
      const totalPaid = orderData.reduce((sum, o) => sum + o.amount_paid, 0)
      const totalOwing = totalSpent - totalPaid

      setStats({
        totalSpent,
        totalPaid,
        totalOwing,
        count: orderData.length,
        avg: Math.round(totalSpent / orderData.length),
        lastOrder: orderData[0],
      })
    } else {
      setStats({
        totalSpent: 0,
        totalPaid: 0,
        totalOwing: 0,
        count: 0,
        avg: 0,
        lastOrder: null,
      })
    }

    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [params.id])

  // Get Status Info
  const getStatusInfo = (status) => {
    const map = {
      'Order placed': { label: 'Placed', color: '#6B6255', bg: '#F0EDE8' },
      'Cutting': { label: 'Cutting', color: '#B4881E', bg: '#F6E9C8' },
      'Sewing': { label: 'Sewing', color: '#1E3A5F', bg: '#D6E0EB' },
      'Ready': { label: 'Ready', color: '#4C7A5E', bg: '#DCEBE2' },
      'Delivered': { label: 'Delivered', color: '#6B6255', bg: '#E8E0D5' },
    }
    return map[status] || { label: status || 'Placed', color: '#6B6255', bg: '#F0EDE8' }
  }

  const getOrderName = (order) => {
    if (order.item_name && order.item_name.trim()) return order.item_name
    if (order.name && order.name.trim()) return order.name
    if (order.title && order.title.trim()) return order.title
    return 'Order'
  }

  const formatPhone = (phone) => {
    if (!phone) return ''
    return phone.startsWith('0') ? '234' + phone.slice(1) : phone
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setMessage('')

    const phoneDigits = phone.replace(/\D/g, '')

    if (phoneDigits.length !== 11) {
      setMessage('Phone number must be exactly 11 digits.')
      setSaving(false)
      return
    }

    const { error } = await supabase
      .from('customers')
      .update({
        name,
        phone: phoneDigits,
        notes,
        measurements,
      })
      .eq('id', params.id)

    if (error) {
      setMessage('Error: ' + error.message)
      setSaving(false)
      return
    }

    setMessage('✅ Saved!')
    setSaving(false)
    setEditing(false)
    load()
  }

  const updateMeasurement = (key, value) => {
    setMeasurements({ ...measurements, [key]: value })
  }

  const handlePhoneChange = (e) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 11)
    setPhone(digits)
  }

  const duplicateLastOrder = () => {
    if (stats?.lastOrder) {
      router.push(`/dashboard/orders/new?duplicate=${stats.lastOrder.id}`)
    }
  }

  if (loading) {
    return (
      <main style={{ minHeight: '100vh', background: '#F5EFE2', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
          .cresoa-spinner {
            width: 40px; height: 40px;
            border: 4px solid #e4d8c2;
            border-top: 4px solid #1E3A5F;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
          }
        `}</style>
        <div className="cresoa-spinner"></div>
        <p style={{ color: '#6B6255', fontSize: '0.85rem', marginTop: '1rem' }}>Loading customer...</p>
      </main>
    )
  }

  if (!customer) {
    return (
      <main style={{ minHeight: '100vh', background: '#F5EFE2', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1.5rem' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: '#6B6255', fontSize: '1rem' }}>Customer not found.</p>
          <button
            onClick={() => router.push('/dashboard/customers')}
            style={{ marginTop: '1rem', padding: '0.6rem 1.2rem', borderRadius: '8px', border: '1px solid #1E3A5F', background: '#fff', color: '#1E3A5F', cursor: 'pointer' }}
          >
            ← Back to customers
          </button>
        </div>
      </main>
    )
  }

  const balance = stats?.totalOwing || 0

  return (
    <main style={{ minHeight: '100vh', background: '#F5EFE2', padding: '1.5rem 1.2rem' }}>
      <style>{`
        .stat-card {
          background: #fff;
          border-radius: 10px;
          padding: 0.7rem 0.5rem;
          border: 1px solid #E8E0D5;
          text-align: center;
          flex: 1;
          min-width: 60px;
        }
        .stat-card .value {
          font-size: 1.1rem;
          font-weight: 700;
          margin: 0;
        }
        .stat-card .value.red { color: #AE4A34; }
        .stat-card .value.green { color: #4C7A5E; }
        .stat-card .value.navy { color: #1E3A5F; }
        .stat-card .label {
          color: #6B6255;
          font-size: 0.6rem;
          margin: 0.1rem 0 0;
        }
        .measurement-card {
          background: #fff;
          border-radius: 12px;
          padding: 1rem;
          border: 1px solid #E8E0D5;
          margin-bottom: 1rem;
        }
        .measurement-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.5rem;
        }
        .measurement-item {
          display: flex;
          justify-content: space-between;
          padding: 0.3rem 0;
          border-bottom: 1px solid #F0EDE8;
        }
        .measurement-item:last-child {
          border-bottom: none;
        }
        .measurement-item .label {
          color: #6B6255;
          font-size: 0.8rem;
        }
        .measurement-item .value {
          font-weight: 600;
          color: #1E3A5F;
          font-size: 0.85rem;
        }
        .order-history-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.6rem 0;
          border-bottom: 1px solid #F0EDE8;
          cursor: pointer;
          transition: background 0.1s ease;
          text-decoration: none;
        }
        .order-history-item:last-child {
          border-bottom: none;
        }
        .order-history-item:hover {
          background: #F8F6F2;
          padding-left: 0.3rem;
          padding-right: 0.3rem;
          border-radius: 4px;
        }
        .order-history-item .info {
          flex: 1;
        }
        .order-history-item .info .name {
          font-weight: 600;
          color: #1E3A5F;
          font-size: 0.9rem;
          margin: 0;
          display: flex;
          align-items: center;
          gap: 0.4rem;
          flex-wrap: wrap;
        }
        .order-history-item .info .meta {
          font-size: 0.75rem;
          color: #6B6255;
          margin: 0.1rem 0 0;
        }
        .order-history-item .balance {
          font-weight: 700;
          font-size: 0.85rem;
          color: #AE4A34;
          white-space: nowrap;
        }
        .order-history-item .balance.paid {
          color: #4C7A5E;
        }
        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.7rem;
          flex-wrap: wrap;
          gap: 0.4rem;
        }
        .section-header h2 {
          color: #1E3A5F;
          font-size: 1rem;
          font-weight: 700;
          margin: 0;
        }
        .quick-input {
          width: 100%;
          padding: 0.6rem;
          border-radius: 8px;
          border: 1px solid #E8E0D5;
          font-size: 0.9rem;
          background: #fff;
          box-sizing: border-box;
          color: #2B2620;
        }
        .quick-input:focus {
          outline: none;
          border-color: #C79A2B;
        }
        .quick-textarea {
          width: 100%;
          padding: 0.6rem;
          border-radius: 8px;
          border: 1px solid #E8E0D5;
          font-size: 0.9rem;
          background: #fff;
          box-sizing: border-box;
          color: #2B2620;
          font-family: inherit;
          resize: vertical;
        }
        .quick-textarea:focus {
          outline: none;
          border-color: #C79A2B;
        }
        .back-link {
          background: none;
          border: none;
          color: #1E3A5F;
          font-size: 0.85rem;
          padding: 0;
          margin-bottom: 1rem;
          cursor: pointer;
        }
        .back-link:hover {
          text-decoration: underline;
        }
        .header-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-bottom: 1rem;
        }
        .header-top .name-section {
          flex: 1;
        }
        .header-top .name-section h1 {
          color: #1E3A5F;
          font-size: 1.4rem;
          font-weight: 700;
          margin: 0;
        }
        .header-top .name-section .phone {
          color: #6B6255;
          font-size: 0.9rem;
          margin: 0.1rem 0 0;
        }
        .header-actions {
          display: flex;
          gap: 0.4rem;
          flex-wrap: wrap;
        }
        .header-actions .btn {
          padding: 0.3rem 0.7rem;
          border-radius: 6px;
          font-size: 0.7rem;
          font-weight: 600;
          text-decoration: none;
          border: 1px solid #E8E0D5;
          background: #fff;
          color: #1E3A5F;
          cursor: pointer;
          transition: background 0.1s ease;
          display: inline-flex;
          align-items: center;
          gap: 0.2rem;
        }
        .header-actions .btn:hover {
          background: #F5EFE2;
        }
        .header-actions .btn-call {
          background: #F6E9C8;
          border-color: #C79A2B;
          font-weight: 700;
        }
        .header-actions .btn-whatsapp {
          background: #DCEBE2;
          border-color: #4C7A5E;
          color: #4C7A5E;
          font-weight: 700;
        }
        .header-actions .btn-whatsapp:hover {
          background: #C8DCCD;
        }
        .header-actions .btn-order {
          background: #1E3A5F;
          border-color: #1E3A5F;
          color: #fff;
        }
        .header-actions .btn-order:hover {
          background: #0F1E30;
        }
        .header-actions .btn-edit {
          background: #C79A2B;
          border-color: #C79A2B;
          color: #1E3A5F;
        }
        .header-actions .btn-edit:hover {
          background: #B4881E;
        }
        .stats-row {
          display: flex;
          gap: 0.4rem;
          margin-bottom: 1rem;
          flex-wrap: wrap;
        }
        .empty-state {
          background: #fff;
          border-radius: 12px;
          padding: 1.5rem;
          border: 1px solid #E8E0D5;
          text-align: center;
          color: #6B6255;
          font-size: 0.9rem;
        }
        .empty-state .icon {
          font-size: 2rem;
          margin-bottom: 0.3rem;
        }
        .order-status-badge {
          display: inline-block;
          padding: 0.1rem 0.5rem;
          border-radius: 12px;
          font-size: 0.6rem;
          font-weight: 600;
          letter-spacing: 0.3px;
          text-transform: uppercase;
        }
        .edit-section {
          background: #fff;
          border-radius: 12px;
          padding: 1.2rem;
          border: 1px solid #E8E0D5;
          margin-bottom: 1rem;
        }
        .edit-section .row {
          margin-bottom: 0.8rem;
        }
        .edit-section .row label {
          display: block;
          color: #2B2620;
          margin-bottom: 0.3rem;
          font-size: 0.85rem;
          font-weight: 500;
        }
        .btn-save {
          width: 100%;
          padding: 0.7rem;
          border-radius: 8px;
          border: none;
          background: linear-gradient(135deg, #C79A2B, #B4881E);
          color: #1E3A5F;
          font-size: 0.95rem;
          font-weight: 700;
          cursor: pointer;
          transition: transform 0.1s ease;
        }
        .btn-save:active {
          transform: scale(0.98);
        }
        .btn-save:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        @media (max-width: 420px) {
          .measurement-grid {
            grid-template-columns: 1fr;
          }
          .header-top {
            flex-direction: column;
          }
          .header-actions {
            width: 100%;
          }
          .header-actions .btn {
            flex: 1;
            justify-content: center;
          }
          .order-history-item {
            flex-wrap: wrap;
            gap: 0.3rem;
          }
        }
      `}</style>

      {/* ===== BACK BUTTON ===== */}
      <button className="back-link" onClick={() => router.push('/dashboard/customers')}>
        ← Back to customers
      </button>

      {/* ===== HEADER ===== */}
      <div className="header-top">
        <div className="name-section">
          <h1>{customer.name}</h1>
          <p className="phone">{customer.phone ? `📱 ${customer.phone}` : 'No phone number'}</p>
        </div>
        <div className="header-actions">
          {customer.phone && (
            <>
              <a href={`tel:${customer.phone}`} className="btn btn-call">📞 Call</a>
              <a
                href={`https://wa.me/${formatPhone(customer.phone)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-whatsapp"
              >
                💬 WhatsApp
              </a>
            </>
          )}
          <a href={`/dashboard/orders/new?customer=${customer.id}`} className="btn btn-order">
            📋 Order
          </a>
          {stats?.lastOrder && (
            <button className="btn btn-edit" onClick={duplicateLastOrder}>
              🔄 Duplicate last
            </button>
          )}
          <button className="btn btn-edit" onClick={() => setEditing(!editing)}>
            {editing ? '✕ Close' : '✏️ Edit'}
          </button>
        </div>
      </div>

      {/* ===== STATS ===== */}
      <div className="stats-row">
        <div className="stat-card">
          <p className="value navy">₦{stats?.totalSpent.toLocaleString() || 0}</p>
          <p className="label">Total Spent</p>
        </div>
        <div className="stat-card">
          <p className="value navy">{stats?.count || 0}</p>
          <p className="label">Orders</p>
        </div>
        <div className="stat-card">
          <p className={`value ${balance > 0 ? 'red' : 'green'}`}>
            {balance > 0 ? `₦${balance.toLocaleString()}` : '✓ Paid'}
          </p>
          <p className="label">Balance</p>
        </div>
        <div className="stat-card">
          <p className="value navy">₦{stats?.avg.toLocaleString() || 0}</p>
          <p className="label">Avg Order</p>
        </div>
      </div>
      {/* ===== EDIT SECTION ===== */}
      {editing && (
        <div className="edit-section">
          <form onSubmit={handleSave}>
            <div className="row">
              <label>Customer name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="quick-input"
                required
              />
            </div>

            <div className="row">
              <label>Phone number</label>
              <input
                type="tel"
                inputMode="numeric"
                value={phone}
                onChange={handlePhoneChange}
                className="quick-input"
                required
                placeholder="08012345678"
              />
              <p style={{ fontSize: '0.7rem', color: phone.length === 11 ? '#4C7A5E' : '#6B6255', marginTop: '0.2rem' }}>
                {phone.length}/11 digits
              </p>
            </div>

            <div className="row">
              <label>Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="quick-textarea"
                rows={2}
                placeholder="Customer notes..."
              />
            </div>

            <h3 style={{ color: '#1E3A5F', fontSize: '0.95rem', margin: '1rem 0 0.5rem' }}>
              Measurements
            </h3>

            <div className="measurement-grid">
              {MEASUREMENT_FIELDS.map((f) => (
                <div key={f.key} style={{ marginBottom: '0.4rem' }}>
                  <label style={{ fontSize: '0.8rem', color: '#6B6255' }}>
                    {f.label} ({f.unit})
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={measurements[f.key] || ''}
                    onChange={(e) => updateMeasurement(f.key, e.target.value)}
                    className="quick-input"
                    style={{ padding: '0.4rem' }}
                  />
                </div>
              ))}
            </div>

            <button type="submit" className="btn-save" disabled={saving}>
              {saving ? 'Saving...' : '💾 Save changes'}
            </button>

            {message && (
              <p style={{ marginTop: '0.8rem', fontSize: '0.85rem', color: message.startsWith('✅') ? '#4C7A5E' : '#AE4A34' }}>
                {message}
              </p>
            )}
          </form>
        </div>
      )}

      {/* ===== MEASUREMENTS ===== */}
      {!editing && (
        <div className="measurement-card">
          <div className="section-header">
            <h2>📏 Measurements</h2>
          </div>

          {Object.keys(measurements).length === 0 || Object.values(measurements).every(v => !v) ? (
            <p style={{ color: '#6B6255', fontSize: '0.85rem', margin: 0 }}>
              No measurements saved yet. Click <strong>Edit</strong> to add them.
            </p>
          ) : (
            <div className="measurement-grid">
              {MEASUREMENT_FIELDS.map((f) => {
                const value = measurements[f.key]
                return (
                  <div key={f.key} className="measurement-item">
                    <span className="label">{f.label}</span>
                    <span className="value">{value || '—'} {value ? f.unit : ''}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ===== NOTES ===== */}
      {!editing && notes && (
        <div className="measurement-card">
          <div className="section-header">
            <h2>📝 Notes</h2>
          </div>
          <p style={{ color: '#2B2620', fontSize: '0.9rem', margin: 0, whiteSpace: 'pre-wrap' }}>
            {notes}
          </p>
        </div>
      )}

      {/* ===== ORDER HISTORY ===== */}
      <div style={{ marginTop: '1.5rem' }}>
        <div className="section-header">
          <h2>📋 Order History</h2>
          <span style={{ color: '#6B6255', fontSize: '0.75rem' }}>
            {orders.length} order{orders.length !== 1 ? 's' : ''}
          </span>
        </div>

        {orders.length === 0 ? (
          <div className="empty-state">
            <div className="icon">📭</div>
            <p>No orders yet for this customer.</p>
            <a href={`/dashboard/orders/new?customer=${customer.id}`} style={{ color: '#1E3A5F', fontWeight: '600' }}>
              Create their first order
            </a>
          </div>
        ) : (
          <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #E8E0D5', padding: '0.2rem 1rem' }}>
            {orders.slice(0, 10).map((o) => {
              const status = getStatusInfo(o.current_status)
              const orderName = getOrderName(o)
              const balance = o.price - o.amount_paid

              return (
                <a
                  key={o.id}
                  href={`/dashboard/orders/${o.id}`}
                  className="order-history-item"
                >
                  <div className="info">
                    <p className="name">
                      {orderName}
                      <span
                        className="order-status-badge"
                        style={{ background: status.bg, color: status.color }}
                      >
                        {status.label}
                      </span>
                    </p>
                    <p className="meta">
                      ₦{o.price.toLocaleString()} · {o.due_date ? `Due ${new Date(o.due_date).toLocaleDateString('en-GB')}` : 'No deadline'}
                    </p>
                  </div>
                  <span className={`balance ${balance <= 0 ? 'paid' : ''}`}>
                    {balance > 0 ? `₦${balance.toLocaleString()}` : '✓'}
                  </span>
                </a>
              )
            })}

            {orders.length > 10 && (
              <div style={{ padding: '0.6rem 0', textAlign: 'center' }}>
                <a href={`/dashboard/customers/${customer.id}/orders`} style={{ color: '#6B6255', fontSize: '0.8rem' }}>
                  View all {orders.length} orders →
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
