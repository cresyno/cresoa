'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '../../../../../lib/supabaseClient'
import { getCurrentBusinessId } from '../../../../../lib/getBusinessId'

// ─── Self-contained SVG icons ───
const Svg = ({ name, size = 20, stroke = 'currentColor', style }) => {
  const icons = {
    'arrow-left': <polyline points="15 18 9 12 15 6" />,
    'edit-2': <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />,
    'x': <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>,
    'plus': <><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></>,
    'check': <polyline points="20 6 9 17 4 12" />,
    'refresh-cw': <><polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></>,
    'trash-2': <><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></>,
    'alert-circle': <><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></>,
    'package': <><path d="M20.91 8.84L12 13 3.09 8.84" /><line x1="12" y1="22" x2="12" y2="13" /><line x1="2" y1="4" x2="12" y2="9" /><line x1="22" y1="4" x2="12" y2="9" /></>,
    'tool': <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />,
    'phone': <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />,
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>{icons[name]}</svg>
}

// ─── Helpers ───
const formatMoney = (value) => `₦${Number(value || 0).toLocaleString('en-NG')}`
const formatDate = (value) => !value ? 'No date' : new Date(value).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })

const inputStyle = {
  width: '100%',
  padding: '0.6rem',
  borderRadius: '8px',
  border: '1px solid var(--cresoa-border)',
  background: 'var(--cresoa-bg)',
  color: 'var(--cresoa-text)',
  fontSize: '0.9rem',
  boxSizing: 'border-box',
}

const labelStyle = {
  display: 'block',
  fontSize: '0.8rem',
  fontWeight: 500,
  marginBottom: '0.25rem',
  color: 'var(--cresoa-text-muted)',
}

export default function RepairsCustomerDetailPage() {
  const router = useRouter()
  const params = useParams()
  const customerId = params.id

  const [customer, setCustomer] = useState(null)
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [stats, setStats] = useState(null)
  const [businessId, setBusinessId] = useState(null)
  const [businessName, setBusinessName] = useState('')

  // Edit form state
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [message, setMessage] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [notes, setNotes] = useState('')

  // Load data
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

        // Fetch business name
        const { data: bizData } = await supabase
          .from('businesses')
          .select('name')
          .eq('id', bizId)
          .maybeSingle()
        if (bizData) setBusinessName(bizData.name)

        // Fetch customer (sector-scoped)
        const { data: customerData, error: customerError } = await supabase
          .from('customers')
          .select('*')
          .eq('id', customerId)
          .eq('business_id', bizId)
          .eq('sector', 'repairs')
          .maybeSingle()

        if (customerError) throw customerError
        if (!customerData) throw new Error('Customer not found in this business')

        setCustomer(customerData)
        setName(customerData.name || '')
        setPhone(customerData.phone || '')
        setNotes(customerData.notes || '')

        // Fetch orders (jobs) for this customer
        const { data: ordersData, error: ordersError } = await supabase
          .from('orders')
          .select('*')
          .eq('customer_id', customerId)
          .eq('business_id', bizId)
          .eq('sector', 'repairs')
          .order('created_at', { ascending: false })

        if (ordersError) throw ordersError
        setOrders(ordersData || [])

        // Calculate stats
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
          setStats({ totalSpent: 0, totalPaid: 0, totalOwing: 0, count: 0, avg: 0 })
        }
      } catch (err) {
        console.error('Error loading repair customer:', err)
        setError(err.message || 'Failed to load customer details.')
      } finally {
        setLoading(false)
      }
    }

    if (customerId) load()
  }, [customerId, router])

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
      setMessage('Please provide a name and valid 11-digit phone number.')
      setSaving(false)
      return
    }

    try {
      const { error: updateError } = await supabase
        .from('customers')
        .update({
          name: name.trim(),
          phone: phoneDigits,
          notes: notes.trim(),
        })
        .eq('id', customerId)
        .eq('business_id', businessId)
        .eq('sector', 'repairs')

      if (updateError) throw updateError

      // Refresh local state
      setCustomer(prev => ({ ...prev, name: name.trim(), phone: phoneDigits, notes: notes.trim() }))
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
    const confirmed = window.confirm('Delete this customer and all their jobs? This cannot be undone.')
    if (!confirmed) return

    setDeleting(true)
    try {
      const { error: deleteError } = await supabase
        .from('customers')
        .delete()
        .eq('id', customerId)
        .eq('business_id', businessId)
        .eq('sector', 'repairs')

      if (deleteError) throw deleteError

      router.push(`/dashboard/repairs/customers?business_id=${businessId}`)
    } catch (err) {
      console.error('Delete error:', err)
      alert('Failed to delete customer: ' + err.message)
      setDeleting(false)
    }
  }

  // Loading skeleton
  if (loading) {
    return (
      <div style={{ padding: '1rem', maxWidth: '1200px', margin: '0 auto', background: 'var(--cresoa-bg)', minHeight: '100vh' }}>
        <div className="cresoa-skeleton-card" style={{ marginBottom: '1rem' }}>
          <div className="cresoa-skeleton medium" />
          <div className="cresoa-skeleton short" />
        </div>
        <div className="cresoa-loading-grid" style={{ marginBottom: '1rem' }}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="cresoa-skeleton-card">
              <div className="cresoa-skeleton short" />
              <div className="cresoa-skeleton long" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Error state
  if (error || !customer) {
    return (
      <div style={{ minHeight: '70vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', textAlign: 'center' }}>
        <Svg name="alert-circle" size={30} stroke="var(--cresoa-danger)" />
        <h2 style={{ margin: '14px 0 7px', color: 'var(--cresoa-text)' }}>Couldn't load customer</h2>
        <p style={{ maxWidth: '360px', margin: '0 0 18px', color: 'var(--cresoa-text-muted)' }}>{error || 'Customer not found'}</p>
        <button onClick={() => router.push(`/dashboard/repairs/customers?business_id=${businessId}`)} className="cresoa-primary-button">Back to customers</button>
      </div>
    )
  }

  const balance = stats?.totalOwing || 0
  const customerName = customer.name || 'Unnamed customer'
  const initials = customerName.charAt(0).toUpperCase() || '?'

  return (
    <div style={{ padding: '1rem', maxWidth: '1200px', margin: '0 auto', background: 'var(--cresoa-bg)', minHeight: '100vh', paddingBottom: '80px' }}>
      {/* Back button */}
      <button
        onClick={() => router.push(`/dashboard/repairs/customers?business_id=${businessId}`)}
        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cresoa-text-muted)', fontSize: '0.85rem', marginBottom: '0.5rem' }}
      >
        <Svg name="arrow-left" size={16} stroke="currentColor" /> Customers
      </button>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span className="cresoa-avatar" style={{ width: '56px', height: '56px', fontSize: '20px' }}>{initials}</span>
          <div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0, color: 'var(--cresoa-text)' }}>{customerName}</h1>
            <p style={{ color: 'var(--cresoa-text-muted)', margin: '0.1rem 0 0' }}>{customer.phone || 'No phone'}</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => setEditing(!editing)}
            className="cresoa-primary-button"
            style={{ background: 'transparent', border: '1px solid var(--cresoa-accent)', color: 'var(--cresoa-accent)' }}
          >
            <Svg name={editing ? 'x' : 'edit-2'} size={14} stroke="currentColor" />
            {editing ? 'Close' : 'Edit'}
          </button>
          <button
            onClick={() => router.push(`/dashboard/repairs/jobs/new?business_id=${businessId}&customer_id=${customer.id}`)}
            className="cresoa-primary-button"
          >
            <Svg name="plus" size={14} stroke="#fff" /> New Job
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px,1fr))', gap: '0.5rem', marginBottom: '1rem' }}>
        <div className="cresoa-card" style={{ padding: '0.6rem 0.8rem', textAlign: 'center' }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--cresoa-text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Total spent</div>
          <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{formatMoney(stats?.totalSpent || 0)}</div>
        </div>
        <div className="cresoa-card" style={{ padding: '0.6rem 0.8rem', textAlign: 'center' }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--cresoa-text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Jobs</div>
          <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{stats?.count || 0}</div>
        </div>
        <div className="cresoa-card" style={{ padding: '0.6rem 0.8rem', textAlign: 'center', borderColor: balance > 0 ? 'var(--cresoa-danger)' : 'var(--cresoa-success)' }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--cresoa-text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Balance</div>
          <div style={{ fontWeight: 700, fontSize: '1.1rem', color: balance > 0 ? 'var(--cresoa-danger)' : 'var(--cresoa-success)' }}>
            {balance > 0 ? formatMoney(balance) : '✓ Paid'}
          </div>
        </div>
        <div className="cresoa-card" style={{ padding: '0.6rem 0.8rem', textAlign: 'center' }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--cresoa-text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Avg job</div>
          <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{formatMoney(stats?.avg || 0)}</div>
        </div>
      </div>

      {/* Edit form */}
      {editing && (
        <form onSubmit={handleSave} style={{ marginBottom: '1rem' }}>
          <div className="cresoa-card" style={{ padding: '1.2rem' }}>
            <div style={{ display: 'grid', gap: '0.8rem' }}>
              <div>
                <label style={labelStyle}>Customer name</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} required style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Phone number</label>
                <input type="tel" inputMode="numeric" value={phone} onChange={handlePhoneChange} required placeholder="08012345678" style={inputStyle} />
                <div style={{ fontSize: '0.7rem', color: phone.length === 11 ? 'var(--cresoa-success)' : 'var(--cresoa-text-muted)', marginTop: '0.2rem' }}>
                  {phone.length}/11 digits {phone.length === 11 && '✓ valid'}
                </div>
              </div>
              <div>
                <label style={labelStyle}>Notes</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Customer notes..." style={{ ...inputStyle, resize: 'vertical' }} />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button type="submit" className="cresoa-primary-button" disabled={saving}>
                  <Svg name={saving ? 'refresh-cw' : 'check'} size={14} stroke="#fff" />
                  {saving ? 'Saving...' : 'Save customer'}
                </button>
                <button type="button" onClick={() => setEditing(false)} style={{ padding: '0.4rem 1rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'transparent', cursor: 'pointer' }}>
                  Cancel
                </button>
              </div>
              {message && (
                <p style={{ color: message.startsWith('Customer updated') ? 'var(--cresoa-success)' : 'var(--cresoa-danger)', fontSize: '0.8rem', margin: 0 }}>{message}</p>
              )}
            </div>
          </div>
        </form>
      )}

      {/* Job History */}
      <div style={{ marginBottom: '1rem' }}>
        <div className="cresoa-section-header">
          <div>
            <h3 className="cresoa-section-header-title">Job History</h3>
            <p className="cresoa-section-header-subtitle">All repair jobs for this customer</p>
          </div>
        </div>
        {orders.length === 0 ? (
          <div className="cresoa-empty-state">
            <Svg name="tool" size={32} stroke="var(--cresoa-accent)" />
            <span className="cresoa-empty-state-title">No jobs yet</span>
            <span className="cresoa-empty-state-message">Start by creating a repair job for this customer.</span>
            <button onClick={() => router.push(`/dashboard/repairs/jobs/new?business_id=${businessId}&customer_id=${customer.id}`)} className="cresoa-primary-button" style={{ marginTop: '1rem' }}>
              <Svg name="plus" size={14} stroke="#fff" /> New Job
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {orders.map(job => {
              const status = job.current_status || 'Pending'
              const isOverdue = job.due_date && new Date(job.due_date) < new Date() && !['Delivered', 'Completed'].includes(status)
              const balance = (job.price || 0) - (job.amount_paid || 0)
              return (
                <div
                  key={job.id}
                  onClick={() => router.push(`/dashboard/repairs/jobs/${job.id}?business_id=${businessId}`)}
                  className="cresoa-card"
                  style={{ cursor: 'pointer', padding: '0.8rem 1rem' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600, color: 'var(--cresoa-text)' }}>{job.title || 'Untitled job'}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--cresoa-text-muted)' }}>
                        {formatMoney(job.price || 0)} · Due {job.due_date ? formatDate(job.due_date) : 'no deadline'}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span className={`cresoa-status ${isOverdue ? 'cresoa-status-danger' : 'cresoa-status-info'}`}>{status}</span>
                      {balance > 0 && <div style={{ fontSize: '0.7rem', color: 'var(--cresoa-danger)', marginTop: '0.15rem' }}>{formatMoney(balance)} due</div>}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Notes (if not editing) */}
      {!editing && customer.notes && (
        <div className="cresoa-card" style={{ padding: '1rem', marginBottom: '1rem' }}>
          <div className="cresoa-section-header">
            <div>
              <h3 className="cresoa-section-header-title">Notes</h3>
              <p className="cresoa-section-header-subtitle">Private notes about this customer</p>
            </div>
          </div>
          <p style={{ margin: 0, whiteSpace: 'pre-wrap', color: 'var(--cresoa-text-muted)' }}>{customer.notes}</p>
        </div>
      )}

      {/* Delete button */}
      <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={handleDelete}
          disabled={deleting}
          style={{ padding: '0.4rem 1rem', borderRadius: '8px', border: '1px solid var(--cresoa-danger)', background: 'transparent', color: 'var(--cresoa-danger)', cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
        >
          <Svg name={deleting ? 'refresh-cw' : 'trash-2'} size={14} stroke="currentColor" />
          {deleting ? 'Deleting...' : 'Delete customer'}
        </button>
      </div>
    </div>
  )
  }
