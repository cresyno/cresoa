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
        const { data: { user } } = await supabase.auth.getUser()
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

        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          router.push('/login')
          return
        }

        // ─── Fetch customer via API ───
        const response = await fetch(`/api/customers/${params.id}?business_id=${bizId}`, {
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        })

        const result = await response.json()
        if (!response.ok) {
          throw new Error(result.error || 'Failed to load customer')
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

        if (business) setSector(business.sector)

        // ─── Calculate stats ───
        if (ordersData && ordersData.length > 0) {
          const totalSpent = ordersData.reduce((sum, o) => sum + (o.amount_paid || 0), 0)
          const totalPrice = ordersData.reduce((sum, o) => sum + (o.price || 0), 0)
          const totalOwing = totalPrice - totalSpent
          setStats({
            totalSpent,
            totalPaid: totalSpent,
            totalOwing,
            count: ordersData.length,
            avg: Math.round(totalPrice / ordersData.length),
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
        setError(err.message || 'Failed to load customer details.')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [params.id, router])

  // ─── Handlers ───
  const updateMeasurement = (key, value) => {
    setMeasurements({ ...measurements, [key]: value })
  }

  const handlePhoneChange = (e) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 11)
    setPhone(digits)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setMessage('')

    const phoneDigits = phone.replace(/\D/g, '')
    if (!name.trim() || phoneDigits.length !== 11) {
      setMessage('Please provide a name and a valid 11-digit phone number.')
      setSaving(false)
      return
    }

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }

      const updateData = {
        name: name.trim(),
        phone: phoneDigits,
        notes: notes.trim(),
        measurements: sector === 'Fashion & Custom Wear' ? measurements : {},
      }

      const response = await fetch(`/api/customers/${params.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(updateData)
      })

      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.error || 'Failed to update customer')
      }

      // ─── Refresh data ───
      const refreshResponse = await fetch(`/api/customers/${params.id}?business_id=${businessId}`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      })
      const refreshResult = await refreshResponse.json()
      if (refreshResponse.ok) {
        setCustomer(refreshResult.customer)
        setName(refreshResult.customer.name || '')
        setPhone(refreshResult.customer.phone || '')
        setNotes(refreshResult.customer.notes || '')
        setMeasurements(refreshResult.customer.measurements || {})
        // Update stats
        const ordersData = refreshResult.orders || []
        setOrders(ordersData)
        if (ordersData.length > 0) {
          const totalSpent = ordersData.reduce((sum, o) => sum + (o.amount_paid || 0), 0)
          const totalPrice = ordersData.reduce((sum, o) => sum + (o.price || 0), 0)
          const totalOwing = totalPrice - totalSpent
          setStats({
            totalSpent,
            totalPaid: totalSpent,
            totalOwing,
            count: ordersData.length,
            avg: Math.round(totalPrice / ordersData.length),
          })
        }
      }

      setEditing(false)
      setMessage('✅ Customer updated!')
      setTimeout(() => setMessage(''), 3000)

    } catch (err) {
      console.error('Update error:', err)
      setMessage('Error: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    const confirmed = window.confirm('Delete this customer and all their orders? This cannot be undone.')
    if (!confirmed) return
    setDeleting(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }

      const response = await fetch(`/api/customers/${params.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || 'Failed to delete customer')
      }

      router.push(`/dashboard/customers?business_id=${businessId}`)
    } catch (err) {
      console.error('Delete error:', err)
      alert('Failed to delete customer: ' + err.message)
      setDeleting(false)
    }
  }

  const isFashion = sector === 'Fashion & Custom Wear'

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--color-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
          .spinner {
            width: 40px; height: 40px;
            border: 4px solid var(--color-border);
            border-top: 4px solid var(--color-accent);
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
          }
        `}</style>
        <div className="spinner"></div>
      </div>
    )
  }

  if (error || !customer) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--color-bg)', padding: '2rem', textAlign: 'center', color: 'var(--color-text)' }}>
        <p style={{ color: 'var(--color-danger)' }}>{error || 'Customer not found.'}</p>
        <button onClick={() => router.push(`/dashboard/customers?business_id=${businessId}`)} style={{ marginTop: '1rem', padding: '0.5rem 1.5rem', background: 'var(--color-accent)', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
          ← Back to customers
        </button>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', padding: '1.5rem 1.2rem', color: 'var(--color-text)' }}>
      <style>{`
        .back-link {
          background: none;
          border: none;
          color: var(--color-text-muted);
          font-size: 0.85rem;
          padding: 0;
          margin-bottom: 1rem;
          cursor: pointer;
        }
        .back-link:hover { color: var(--color-accent); text-decoration: underline; }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-bottom: 1rem;
        }
        .header .name {
          font-size: 1.4rem;
          font-weight: 700;
          color: var(--color-text);
          margin: 0;
        }
        .header .phone {
          color: var(--color-text-muted);
          font-size: 0.9rem;
          margin: 0.1rem 0 0;
        }
        .header-actions { display: flex; gap: 0.4rem; flex-wrap: wrap; }
        .btn {
          padding: 0.3rem 0.7rem;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 600;
          border: 1px solid var(--color-border);
          background: var(--color-card);
          color: var(--color-text);
          cursor: pointer;
          transition: background 0.1s ease;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 0.2rem;
        }
        .btn:hover { background: var(--color-bg); }
        .btn-primary { background: var(--color-primary); border-color: var(--color-primary); color: #fff; }
        .btn-primary:hover { background: var(--color-primary); opacity: 0.8; }
        .btn-gold { background: var(--color-accent); border-color: var(--color-accent); color: #0F2B4A; }
        .btn-gold:hover { opacity: 0.8; }
        .btn-danger { background: transparent; border-color: var(--color-danger); color: var(--color-danger); }
        .btn-danger:hover { background: var(--color-danger); color: #fff; }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 0.5rem;
          margin-bottom: 1.2rem;
        }
        .stat-card {
          background: var(--color-card);
          border-radius: 8px;
          padding: 0.6rem 0.3rem;
          border: 1px solid var(--color-border);
          text-align: center;
        }
        .stat-card .number { font-size: 1.1rem; font-weight: 700; margin: 0; }
        .stat-card .number.navy { color: var(--color-text); }
        .stat-card .number.red { color: var(--color-danger); }
        .stat-card .number.green { color: var(--color-success); }
        .stat-card .label { font-size: 0.6rem; color: var(--color-text-muted); margin: 0.1rem 0 0; text-transform: uppercase; letter-spacing: 0.3px; }
        .edit-form {
          background: var(--color-card);
          border-radius: 12px;
          padding: 1.2rem;
          border: 1px solid var(--color-border);
          margin-bottom: 1rem;
        }
        .edit-form .form-group { margin-bottom: 0.8rem; }
        .edit-form label { display: block; font-size: 0.8rem; font-weight: 500; color: var(--color-text); margin-bottom: 0.2rem; }
        .edit-form input, .edit-form textarea {
          width: 100%;
          padding: 0.6rem;
          border-radius: 6px;
          border: 1px solid var(--color-border);
          font-size: 0.9rem;
          box-sizing: border-box;
          font-family: inherit;
          background: var(--color-bg);
          color: var(--color-text);
        }
        .edit-form input:focus, .edit-form textarea:focus { outline: none; border-color: var(--color-accent); }
        .measurement-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.6rem;
        }
        .orders-section {
          margin-top: 1.5rem;
          background: var(--color-card);
          border-radius: 12px;
          border: 1px solid var(--color-border);
          overflow: hidden;
        }
        .orders-section .title {
          padding: 0.8rem 1rem;
          background: var(--color-bg);
          border-bottom: 1px solid var(--color-border);
          font-weight: 600;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .orders-section .title a {
          color: var(--color-accent);
          text-decoration: none;
          font-size: 0.8rem;
        }
        .order-row {
          padding: 0.6rem 1rem;
          border-bottom: 1px solid var(--color-border);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .order-row:last-child { border-bottom: none; }
        .order-row .order-title { font-weight: 500; }
        .order-row .order-status {
          font-size: 0.7rem;
          padding: 0.1rem 0.5rem;
          border-radius: 12px;
          background: var(--color-bg);
          color: var(--color-text-muted);
        }
        .order-row .order-status.ready { background: #DCEBE2; color: #2E7D5E; }
        .order-row .order-status.overdue { background: #F1DBD3; color: #D9534F; }
        @media (max-width: 480px) {
          .stats-grid { grid-template-columns: repeat(2, 1fr); }
          .measurement-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <button className="back-link" onClick={() => router.push(`/dashboard/customers?business_id=${businessId}`)}>
        ← Back to customers
      </button>

      <div className="header">
        <div>
          <p className="name">{customer.name}</p>
          <p className="phone">{customer.phone ? `📱 ${customer.phone}` : 'No phone'}</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-gold" onClick={() => setEditing(!editing)}>
            {editing ? '✕ Close' : '✏️ Edit'}
          </button>
          <a href={`/dashboard/orders/new?business_id=${businessId}&customer_id=${customer.id}`} className="btn btn-primary">
            + New Order
          </a>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <p className="number navy">₦{stats?.totalSpent.toLocaleString() || 0}</p>
          <p className="label">Total Spent</p>
        </div>
        <div className="stat-card">
          <p className="number navy">{stats?.count || 0}</p>
          <p className="label">Orders</p>
        </div>
        <div className="stat-card">
          <p className={`number ${stats?.totalOwing > 0 ? 'red' : 'green'}`}>
            {stats?.totalOwing > 0 ? `₦${stats.totalOwing.toLocaleString()}` : '✓ Paid'}
          </p>
          <p className="label">Balance</p>
        </div>
        <div className="stat-card">
          <p className="number navy">₦{stats?.avg.toLocaleString() || 0}</p>
          <p className="label">Avg Order</p>
        </div>
      </div>

      {editing && (
        <form onSubmit={handleSave} className="edit-form">
          <div className="form-group">
            <label>Customer name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Phone number (11 digits)</label>
            <input
              type="tel"
              inputMode="numeric"
              value={phone}
              onChange={handlePhoneChange}
              required
              placeholder="08012345678"
            />
            <div style={{ fontSize: '0.7rem', color: phone.length === 11 ? 'var(--color-success)' : 'var(--color-text-muted)', marginTop: '0.2rem' }}>
              {phone.length}/11 digits {phone.length === 11 && '✓ valid'}
            </div>
          </div>
          <div className="form-group">
            <label>Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Customer notes..."
            />
          </div>

          {isFashion && (
            <>
              <h3 style={{ color: 'var(--color-text)', fontSize: '0.9rem', margin: '1rem 0 0.5rem' }}>📏 Measurements</h3>
              <div className="measurement-grid">
                {MEASUREMENT_FIELDS.map((f) => (
                  <div key={f.key} className="form-group" style={{ marginBottom: '0.4rem' }}>
                    <label style={{ fontSize: '0.75rem' }}>{f.label}</label>
                    <input
                      type="number"
                      step="0.1"
                      value={measurements[f.key] || ''}
                      onChange={(e) => updateMeasurement(f.key, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            </>
          )}

          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : '💾 Save changes'}
            </button>
            <button type="button" className="btn" onClick={() => setEditing(false)}>Cancel</button>
          </div>
          {message && <p style={{ color: message.includes('✅') ? 'var(--color-success)' : 'var(--color-danger)', marginTop: '0.5rem' }}>{message}</p>}
        </form>
      )}

      {/* ─── Orders Section ─── */}
      <div className="orders-section">
        <div className="title">
          <span>Order History</span>
          <a href={`/dashboard/orders/new?business_id=${businessId}&customer_id=${customer.id}`}>+ New Order</a>
        </div>
        {orders.length === 0 ? (
          <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
            No orders yet.
          </div>
        ) : (
          orders.map(o => {
            const status = o.current_status || 'Order placed'
            const isReady = status === 'Ready'
            const isOverdue = o.due_date && new Date(o.due_date) < new Date() && status !== 'Delivered'
            const balance = (o.price || 0) - (o.amount_paid || 0)
            return (
              <div key={o.id} className="order-row">
                <div>
                  <div className="order-title">{o.title || 'Untitled'}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                    ₦{o.price?.toLocaleString() || 0} · {o.due_date ? `Due ${new Date(o.due_date).toLocaleDateString('en-GB')}` : 'No deadline'}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className={`order-status ${isReady ? 'ready' : ''} ${isOverdue ? 'overdue' : ''}`}>
                    {isOverdue ? 'Overdue' : status}
                  </div>
         {balance > 0 && (
                    <div style={{ fontSize: '0.65rem', color: 'var(--color-danger)', marginTop: '0.1rem' }}>
                      ₦{balance.toLocaleString()} due
                    </div>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* ─── Delete Button ─── */}
      <div style={{ marginTop: '1.5rem', textAlign: 'right' }}>
        <button className="btn btn-danger" onClick={handleDelete} disabled={deleting}>
          {deleting ? 'Deleting...' : '🗑️ Delete customer'}
        </button>
      </div>
    </div>
  )
           }
