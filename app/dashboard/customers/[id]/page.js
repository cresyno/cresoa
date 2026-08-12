'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../../lib/supabaseClient'
import { getCurrentBusinessId } from '../../../../lib/getBusinessId'
import { Icon } from '../../../../components/Icon'
import { Card } from '../../../../components/Card'
import { SectionHeader } from '../../../../components/SectionHeader'
import { Navigation } from '../../../../components/Navigation'
import '../../../globals.css'

// ─── Helpers (can be moved to lib/utils later) ───
const formatMoney = value =>
  `₦${Number(value || 0).toLocaleString('en-NG')}`

const formatDate = value => {
  if (!value) return 'No date'
  return new Date(value).toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}

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

  // ─── Data loading ───
  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)

      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { router.push('/login'); return }

        const bizId = getCurrentBusinessId()
        if (!bizId) { router.push('/dashboard'); return }
        setBusinessId(bizId)

        const { data: { session } } = await supabase.auth.getSession()
        if (!session) { router.push('/login'); return }

        // ─── Fetch customer via API ───
        const response = await fetch(
          `/api/customers/${params.id}?business_id=${bizId}`,
          { headers: { Authorization: `Bearer ${session.access_token}` } }
        )

        const result = await response.json()
        if (!response.ok) throw new Error(result.error || 'Failed to load customer')

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
        } else {
          setStats({ totalSpent: 0, totalPaid: 0, totalOwing: 0, count: 0, avg: 0 })
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

  // ─── Helpers ───
  const updateMeasurement = (key, value) => {
    setMeasurements({ ...measurements, [key]: value })
  }

  const handlePhoneChange = (event) => {
    const digits = event.target.value.replace(/\D/g, '').slice(0, 11)
    setPhone(digits)
  }

  const refreshCustomer = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session || !businessId) return

      const response = await fetch(
        `/api/customers/${params.id}?business_id=${businessId}`,
        { headers: { Authorization: `Bearer ${session.access_token}` } }
      )
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Unable to refresh customer')

      setCustomer(result.customer)
      setOrders(result.orders || [])
      setName(result.customer.name || '')
      setPhone(result.customer.phone || '')
      setNotes(result.customer.notes || '')
      setMeasurements(result.customer.measurements || {})
    } catch (err) {
      console.error('Refresh error:', err)
    }
  }

  const handleSave = async (event) => {
    event.preventDefault()
    setSaving(true)
    setMessage('')

    const phoneDigits = phone.replace(/\D/g, '')
    if (!name.trim() || phoneDigits.length !== 11) {
      setMessage('Please provide a name and valid 11-digit phone number.')
      setSaving(false)
      return
    }

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

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
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(updateData),
      })

      const text = await response.text()
      let result = null
      try { result = JSON.parse(text) } catch (_) {}

      if (!response.ok) {
        const errorMsg = result?.error || result?.message || text || 'Failed to update customer'
        throw new Error(errorMsg)
      }

      await refreshCustomer()
      setEditing(false)
      setMessage('Customer updated successfully')
      setTimeout(() => setMessage(''), 3000)

    } catch (err) {
      console.error('Update error:', err)
      setMessage(`Error: ${err.message}`)
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
      if (!session) { router.push('/login'); return }

      const response = await fetch(`/api/customers/${params.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.access_token}` },
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

  // ─── Loading & Error states ───
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--cresoa-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="cresoa-loading-spinner" />
        <style>{`
          .cresoa-loading-spinner {
            width: 36px;
            height: 36px;
            border: 3px solid var(--cresoa-border);
            border-top-color: var(--cresoa-accent);
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
          }
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    )
  }

  if (error || !customer) {
    return (
      <div style={{ minHeight: '70vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', textAlign: 'center' }}>
        <Icon name="alert-circle" size={30} stroke="var(--cresoa-danger)" />
        <h2 style={{ margin: '14px 0 7px', color: 'var(--cresoa-text)' }}>Couldn't load customer</h2>
        <p style={{ maxWidth: '360px', margin: '0 0 18px', color: 'var(--cresoa-text-muted)' }}>{error || 'Customer not found'}</p>
        <button onClick={() => router.push(`/dashboard/customers?business_id=${businessId}`)} className="cresoa-primary-button">Back to customers</button>
      </div>
    )
  }

  // ─── Main render ───
  return (
    <div style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto', paddingBottom: '80px' }}>
      <Navigation businessId={businessId} />

      {/* ─── Back button ─── */}
      <button
        onClick={() => router.push(`/dashboard/customers?business_id=${businessId}`)}
        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cresoa-text-muted)', fontSize: '0.85rem', marginBottom: '0.5rem' }}
      >
        <Icon name="arrow-left" size={16} stroke="currentColor" /> Customers
      </button>

      {/* ─── Header ─── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span className="cresoa-avatar" style={{ width: '56px', height: '56px', fontSize: '20px' }}>
            {customer.name?.charAt(0) || '?'}
          </span>
          <div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0, color: 'var(--cresoa-text)' }}>{customer.name}</h1>
            <p style={{ color: 'var(--cresoa-text-muted)', margin: '0.1rem 0 0' }}>
              {customer.phone || 'No phone'}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => setEditing(!editing)}
            className="cresoa-primary-button"
            style={{ background: 'transparent', border: '1px solid var(--cresoa-accent)', color: 'var(--cresoa-accent)' }}
          >
            <Icon name={editing ? 'x' : 'edit-2'} size={14} stroke="currentColor" />
            {editing ? 'Close' : 'Edit'}
          </button>
          <button
            onClick={() => router.push(`/dashboard/orders/new?business_id=${businessId}&customer_id=${customer.id}`)}
            className="cresoa-primary-button"
          >
            <Icon name="plus" size={14} stroke="#fff" /> New Order
          </button>
        </div>
      </div>

      {/* ─── Stats ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px,1fr))', gap: '0.5rem', marginBottom: '1rem' }}>
        <Card style={{ padding: '0.6rem 0.8rem', textAlign: 'center' }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--cresoa-text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Total spent</div>
          <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{formatMoney(stats?.totalSpent || 0)}</div>
        </Card>
        <Card style={{ padding: '0.6rem 0.8rem', textAlign: 'center' }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--cresoa-text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Orders</div>
          <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{stats?.count || 0}</div>
        </Card>
        <Card style={{ padding: '0.6rem 0.8rem', textAlign: 'center' }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--cresoa-text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Balance</div>
          <div style={{ fontWeight: 700, fontSize: '1.1rem', color: (stats?.totalOwing || 0) > 0 ? 'var(--cresoa-danger)' : 'var(--cresoa-success)' }}>
            {(stats?.totalOwing || 0) > 0 ? formatMoney(stats.totalOwing) : '✓ Paid'}
          </div>
        </Card>
        <Card style={{ padding: '0.6rem 0.8rem', textAlign: 'center' }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--cresoa-text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Avg order</div>
          <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{formatMoney(stats?.avg || 0)}</div>
        </Card>
      </div>

      {/* ─── Edit Form ─── */}
      {editing && (
        <form onSubmit={handleSave} style={{ marginBottom: '1rem' }}>
          <Card style={{ padding: '1.2rem' }}>
            <div style={{ display: 'grid', gap: '0.8rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, marginBottom: '0.25rem' }}>Customer name</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-bg)', color: 'var(--cresoa-text)' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, marginBottom: '0.25rem' }}>Phone number</label>
                <input
                  type="tel"
                  inputMode="numeric"
                  value={phone}
                  onChange={handlePhoneChange}
                  required
                  placeholder="08012345678"
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-bg)', color: 'var(--cresoa-text)' }}
                />
                <div style={{ fontSize: '0.7rem', color: phone.length === 11 ? 'var(--cresoa-success)' : 'var(--cresoa-text-muted)', marginTop: '0.2rem' }}>
                  {phone.length}/11 digits {phone.length === 11 && '✓ valid'}
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, marginBottom: '0.25rem' }}>Notes</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Customer notes..."
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-bg)', color: 'var(--cresoa-text)' }}
                />
              </div>

              {isFashion && (
                <>
                  <SectionHeader title="Measurements" />
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px,1fr))', gap: '0.6rem' }}>
                    {MEASUREMENT_FIELDS.map(field => (
                      <div key={field.key}>
                        <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 500, marginBottom: '0.15rem' }}>{field.label}</label>
                        <input
                          type="number"
                          step="0.1"
                          value={measurements[field.key] || ''}
                          onChange={e => updateMeasurement(field.key, e.target.value)}
                          style={{ width: '100%', padding: '0.4rem', borderRadius: '6px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-bg)', color: 'var(--cresoa-text)' }}
                        />
                      </div>
                    ))}
                  </div>
                </>
              )}

              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button type="submit" className="cresoa-primary-button" disabled={saving}>
                  <Icon name={saving ? 'refresh-cw' : 'check'} size={14} stroke="#fff" />
                  {saving ? 'Saving...' : 'Save customer'}
                </button>
                <button type="button" onClick={() => setEditing(false)} style={{ padding: '0.4rem 1rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'transparent', cursor: 'pointer' }}>
                  Cancel
                </button>
              </div>

              {message && (
                <p style={{ color: message.startsWith('Customer updated') ? 'var(--cresoa-success)' : 'var(--cresoa-danger)', fontSize: '0.8rem', margin: 0 }}>
                  {message}
                </p>
              )}
            </div>
          </Card>
        </form>
      )}

      {/* ─── Order History ─── */}
      <SectionHeader title="Order History" action={orders.length > 0 ? 'View all' : ''} onAction={() => {}} />
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        {orders.length === 0 ? (
          <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--cresoa-text-muted)' }}>
            <Icon name="package" size={24} stroke="var(--cresoa-text-muted)" />
            <p style={{ margin: '0.5rem 0 0' }}>No orders yet.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {orders.map(order => {
              const status = order.current_status || 'Order placed'
              const isReady = status === 'Ready'
              const isOverdue = order.due_date && new Date(order.due_date) < new Date() && status !== 'Delivered'
              const balance = (order.price || 0) - (order.amount_paid || 0)

              return (
                <div key={order.id} style={{ padding: '0.7rem 1rem', borderBottom: '1px solid var(--cresoa-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 500, color: 'var(--cresoa-text)' }}>{order.title || 'Untitled order'}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--cresoa-text-muted)' }}>
                      {formatMoney(order.price || 0)} · {order.due_date ? `Due ${formatDate(order.due_date)}` : 'No deadline'}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-block', padding: '0.15rem 0.5rem', borderRadius: '12px', fontSize: '0.7rem', background: isReady ? '#DCEBE2' : isOverdue ? '#F1DBD3' : 'var(--cresoa-bg)', color: isReady ? '#2E7D5E' : isOverdue ? '#D9534F' : 'var(--cresoa-text-muted)' }}>
                      {isOverdue ? 'Overdue' : status}
                    </div>
                    {balance > 0 && (
                      <div style={{ fontSize: '0.65rem', color: 'var(--cresoa-danger)', marginTop: '0.15rem' }}>
                        {formatMoney(balance)} due
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      {/* ─── Notes (if not editing) ─── */}
      {!editing && customer.notes && (
        <div style={{ marginTop: '1rem' }}>
          <SectionHeader title="Notes" />
          <Card>
            <p style={{ margin: 0, whiteSpace: 'pre-wrap', color: 'var(--cresoa-text-muted)' }}>{customer.notes}</p>
          </Card>
        </div>
      )}

      {/* ─── Delete button ─── */}
      <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={handleDelete}
          disabled={deleting}
          style={{ padding: '0.4rem 1rem', borderRadius: '8px', border: '1px solid var(--cresoa-danger)', background: 'transparent', color: 'var(--cresoa-danger)', cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
        >
          <Icon name={deleting ? 'refresh-cw' : 'trash-2'} size={14} stroke="currentColor" />
          {deleting ? 'Deleting...' : 'Delete customer'}
        </button>
      </div>

      <div style={{ marginTop: '2rem' }}>
        <Navigation businessId={businessId} />
      </div>
    </div>
  )
}
