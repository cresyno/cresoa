'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../../lib/supabaseClient'
import { getCurrentBusinessId } from '../../../../lib/getBusinessId'
import { Navigation } from '../../../../components/Navigation'
import '../../../globals.css'

// ─── Embedded Icons ───
const Svg = ({ name, size = 20, stroke = 'currentColor', style }) => {
  const icons = {
    'arrow-left': <><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></>,
    'edit-2': <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />,
    'more-vertical': <><circle cx="12" cy="12" r="1.5" fill="currentColor"/><circle cx="12" cy="5" r="1.5" fill="currentColor"/><circle cx="12" cy="19" r="1.5" fill="currentColor"/></>,
    'trash-2': <><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></>,
    'phone': <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />,
    'message-circle': <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />,
    'x': <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>,
    'check': <polyline points="20 6 9 17 4 12" />,
    'package': <><path d="M20.91 8.84L12 13 3.09 8.84" /><line x1="12" y1="22" x2="12" y2="13" /><line x1="2" y1="4" x2="12" y2="9" /><line x1="22" y1="4" x2="12" y2="9" /></>,
    'chevron-right': <polyline points="9 18 15 12 9 6" />,
    'refresh-cw': <><path d="M23 4v6h-6" /><path d="M1 20v-6h6" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></>,
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>{icons[name]}</svg>
}

const formatMoney = value => `₦${Number(value || 0).toLocaleString('en-NG')}`
const formatDate = value => !value ? 'Not set' : new Date(value).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })

const MEASUREMENT_FIELDS = [
  { key: 'bust', label: 'Bust/Chest' },
  { key: 'waist', label: 'Waist' },
  { key: 'hip', label: 'Hip' },
  { key: 'shoulder', label: 'Shoulder' },
  { key: 'sleeve_length', label: 'Sleeve Length' },
  { key: 'full_length', label: 'Full Length' },
]

export default function CustomerDetailPage({ params }) {
  const router = useRouter()
  const [customer, setCustomer] = useState(null)
  const [orders, setOrders] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [businessId, setBusinessId] = useState(null)
  const [sector, setSector] = useState(null)

  // UI State
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef(null)

  // Form State
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [measurements, setMeasurements] = useState({})

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) setShowMenu(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const loadCustomer = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      const bizId = getCurrentBusinessId()
      if (!bizId) { router.push('/dashboard'); return }
      setBusinessId(bizId)

      const response = await fetch(`/api/customers/${params.id}?business_id=${bizId}`, {
        headers: { Authorization: `Bearer ${session.access_token}` }
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Failed to load customer')

      setCustomer(result.customer)
      setOrders(result.orders || [])
      setName(result.customer.name || '')
      setPhone(result.customer.phone || '')
      setNotes(result.customer.notes || '')
      setMeasurements(result.customer.measurements || {})

      const { data: business } = await supabase.from('businesses').select('sector').eq('id', bizId).single()
      if (business) setSector(business.sector)

      const ordersData = result.orders || []
      if (ordersData.length > 0) {
        const totalSpent = ordersData.reduce((sum, o) => sum + Number(o.amount_paid || 0), 0)
        const totalPrice = ordersData.reduce((sum, o) => sum + Number(o.price || 0), 0)
        const totalOwing = totalPrice - totalSpent
        setStats({ totalSpent, totalOwing, count: ordersData.length, avg: Math.round(totalPrice / ordersData.length) })
      } else {
        setStats({ totalSpent: 0, totalOwing: 0, count: 0, avg: 0 })
      }

    } catch (err) {
      setError(err.message || 'Failed to load customer details.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadCustomer() }, [params.id])

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const updateData = {
        name: name.trim(),
        phone: phone.replace(/\D/g, '').slice(0, 11),
        notes: notes.trim(),
        measurements: sector === 'Fashion & Custom Wear' ? measurements : {},
      }

      const response = await fetch(`/api/customers/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify(updateData),
      })

      if (!response.ok) throw new Error('Failed to update customer')
      
      await loadCustomer()
      setEditing(false)
    } catch (err) {
      alert(`Error: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('Delete this customer and all their orders? This cannot be undone.')) return
    setDeleting(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch(`/api/customers/${params.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (!response.ok) throw new Error('Failed to delete customer')
      router.push(`/dashboard/customers?business_id=${businessId}`)
    } catch (err) {
      alert('Failed to delete: ' + err.message)
      setDeleting(false)
    }
  }

  const handleCall = () => {
    if (!customer?.phone) return
    window.location.href = `tel:${customer.phone.replace(/\D/g, '')}`
  }

  const handleWhatsApp = () => {
    if (!customer?.phone) return
    let cleanPhone = customer.phone.replace(/\D/g, '')
    if (cleanPhone.startsWith('0')) cleanPhone = '234' + cleanPhone.slice(1)
    window.open(`https://wa.me/${cleanPhone}`, '_blank')
  }

  const getInitials = (n) => {
    if (!n) return '?'
    const parts = n.trim().split(/\s+/)
    return parts.length === 1 ? parts[0].charAt(0).toUpperCase() : (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
  }

  const isFashion = sector === 'Fashion & Custom Wear'
  const hasMeasurements = isFashion && Object.values(measurements || {}).some(v => v)

  if (loading) return <div className="order-page-loading"><div className="spinner" /></div>
  if (error || !customer) return <div className="order-page-error"><h2>Couldn't load customer</h2><button onClick={loadCustomer} className="cresoa-primary-button">Try again</button></div>

  return (
    <div className="order-details-page">
      <Navigation businessId={businessId} />

      <button onClick={() => router.push(`/dashboard/customers?business_id=${businessId}`)} className="order-back-btn">
        <Svg name="arrow-left" size={16} /> Customers
      </button>

      {/* ─── HEADER COMMAND CENTER ─── */}
      <div className="customer-profile-header">
        <div className="customer-profile-left">
          <div className="customer-avatar-large">
            {getInitials(customer.name)}
          </div>
          <div>
            <h1 className="order-title">{customer.name}</h1>
            <p className="order-subtitle">{customer.phone || 'No phone number'}</p>
          </div>
        </div>

        <div className="customer-header-actions">
          {!editing && (
            <button onClick={() => setEditing(true)} className="order-btn-secondary">
              <Svg name="edit-2" size={16} /> Edit
            </button>
          )}
          
          <div className="menu-container" ref={menuRef}>
            <button className="order-btn-secondary icon-only" onClick={() => setShowMenu(!showMenu)}>
              <Svg name="more-vertical" size={20} />
            </button>
            {showMenu && (
              <div className="dropdown-menu">
                <button onClick={handleDelete} disabled={deleting} className="dropdown-item text-danger">
                  <Svg name="trash-2" size={16} /> {deleting ? 'Deleting...' : 'Delete Customer'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── CONTACT ACTIONS ─── */}
      {!editing && customer.phone && (
        <div className="customer-action-row">
          <button onClick={handleCall} className="order-btn-secondary full-width">
            <Svg name="phone" size={16} /> Call
          </button>
          <button onClick={handleWhatsApp} className="order-btn-secondary full-width text-success">
            <Svg name="message-circle" size={16} /> WhatsApp
          </button>
          <button 
            onClick={() => router.push(`/dashboard/orders/new?business_id=${businessId}&customer_id=${customer.id}`)} 
            className="cresoa-primary-button full-width"
          >
            New Order
          </button>
        </div>
      )}

      {/* ─── FINANCIAL SUMMARY ─── */}
      {!editing && (
        <div className="order-finance-card">
          <div className="order-finance-grid">
            <div className="order-finance-item">
              <span className="label">Total Spent</span>
              <span className="value">{formatMoney(stats?.totalSpent || 0)}</span>
            </div>
            <div className="order-finance-item">
              <span className="label">Orders</span>
              <span className="value">{stats?.count || 0}</span>
            </div>
            <div className="order-finance-item">
              <span className="label">Balance</span>
              <span className={`value ${(stats?.totalOwing || 0) > 0 ? 'text-danger' : 'text-success'}`}>
                {(stats?.totalOwing || 0) > 0 ? formatMoney(stats.totalOwing) : '✓ Paid'}
              </span>
            </div>
            <div className="order-finance-item">
              <span className="label">Avg Order</span>
              <span className="value">{formatMoney(stats?.avg || 0)}</span>
            </div>
          </div>
        </div>
      )}

      {/* ─── EDIT FORM ─── */}
      {editing ? (
        <form onSubmit={handleSave} className="order-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <h3 className="order-section-title">Edit Customer Details</h3>
          
          <div>
            <label className="order-label">Full Name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} required className="order-input" />
          </div>

          <div>
            <label className="order-label">Phone Number</label>
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))} required className="order-input" />
          </div>

          {isFashion && (
            <div>
              <h4 className="order-section-title" style={{ fontSize: '0.95rem', marginTop: '1rem' }}>Measurements (Inches)</h4>
              <div className="measurements-grid">
                {MEASUREMENT_FIELDS.map(field => (
                  <div key={field.key}>
                    <label className="order-label">{field.label}</label>
                    <input 
                      type="number" 
                      step="0.1" 
                      value={measurements[field.key] || ''} 
                      onChange={e => setMeasurements({ ...measurements, [field.key]: e.target.value })}
                      className="order-input" 
                      placeholder="0.0"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="order-label">Private Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} className="order-notes-textarea" placeholder="Add any important details here..." />
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '1rem' }}>
            <button type="button" onClick={() => setEditing(false)} className="order-btn-secondary" style={{ flex: 1 }}>Cancel</button>
            <button type="submit" disabled={saving} className="cresoa-primary-button" style={{ flex: 1 }}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      ) : (
        <>
          {/* ─── READ-ONLY MEASUREMENTS ─── */}
          {hasMeasurements && (
            <div className="order-card">
              <h3 className="order-section-title">Measurements</h3>
              <div className="measurements-display-grid">
                {MEASUREMENT_FIELDS.map(field => (
                  measurements[field.key] ? (
                    <div key={field.key} className="measurement-item">
                      <span className="label">{field.label}</span>
                      <span className="value">{measurements[field.key]}"</span>
                    </div>
                  ) : null
                ))}
              </div>
            </div>
          )}

          {/* ─── READ-ONLY NOTES ─── */}
          {notes && (
            <div className="order-card">
              <h3 className="order-section-title">Notes</h3>
              <p style={{ margin: 0, color: 'var(--cresoa-text-muted)', fontSize: '0.9rem', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                {notes}
              </p>
            </div>
          )}
        </>
      )}

      {/* ─── ORDER HISTORY ─── */}
      <div className="order-card">
        <h3 className="order-section-title">Order History</h3>
        {orders.length === 0 ? (
          <div className="orders-empty" style={{ padding: '2rem 1rem' }}>
            <Svg name="package" size={32} stroke="var(--cresoa-text-muted)" />
            <h3 style={{ marginTop: '12px' }}>No orders yet</h3>
            <p>This customer hasn't placed any orders.</p>
          </div>
        ) : (
          <div className="customer-order-list">
            {orders.map(order => {
              const isOverdue = order.due_date && new Date(order.due_date) < new Date() && order.current_status !== 'Delivered'
              const balance = (order.price || 0) - (order.amount_paid || 0)
              
              return (
                <div 
                  key={order.id} 
                  className="customer-order-item"
                  onClick={() => router.push(`/dashboard/orders/${order.id}?business_id=${businessId}`)}
                >
                  <div className="order-item-left">
                    <h4 className="order-item-title">{order.title || 'Untitled Order'}</h4>
                    <p className="order-item-date">{formatDate(order.created_at)}</p>
                  </div>
                  <div className="order-item-right">
                    <span className="order-item-price">{formatMoney(order.price)}</span>
                    {balance > 0 ? (
                      <span className="customer-balance-due">{formatMoney(balance)} due</span>
                    ) : (
                      <span className="customer-balance-paid">✓ Paid</span>
                    )}
                  </div>
                  <Svg name="chevron-right" size={16} stroke="var(--cresoa-text-muted)" />
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div style={{ marginTop: '2rem' }}>
        <Navigation businessId={businessId} />
      </div>
    </div>
  )
      }
