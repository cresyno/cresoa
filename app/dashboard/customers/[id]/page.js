'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabaseClient'
import { showToast } from '../../../lib/toast'

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
  const [stats, setStats] = useState(null)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [sector, setSector] = useState(null)

  // Form state
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [measurements, setMeasurements] = useState({})
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      // Get business sector
      const { data: business } = await supabase
        .from('businesses')
        .select('sector')
        .eq('owner_id', user.id)
        .single()

      if (business) {
        setSector(business.sector)
      }

      // Get customer
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

      // Get orders
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

      setLoading(false)
    }

    load()
  }, [params.id])

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

    const updateData = {
      name: name.trim(),
      phone: phoneDigits,
      notes: notes.trim(),
      measurements: sector === 'Fashion & Custom Wear' ? measurements : {},
    }

    const { error } = await supabase
      .from('customers')
      .update(updateData)
      .eq('id', params.id)

    if (error) {
      setMessage('Error: ' + error.message)
      setSaving(false)
      return
    }

    showToast('✅ Customer updated!', '#4C7A5E')
    setSaving(false)
    setEditing(false)
    // Refresh data
    const { data: refreshed } = await supabase
      .from('customers')
      .select('*')
      .eq('id', params.id)
      .single()
    if (refreshed) {
      setCustomer(refreshed)
      setName(refreshed.name || '')
      setPhone(refreshed.phone || '')
      setNotes(refreshed.notes || '')
      setMeasurements(refreshed.measurements || {})
    }
  }

  const handleDelete = async () => {
    const confirmed = window.confirm('Delete this customer and all their orders?')
    if (!confirmed) return
    setDeleting(true)
    await supabase.from('customers').delete().eq('id', params.id)
    router.push('/dashboard/customers')
  }

  const isFashion = sector === 'Fashion & Custom Wear'

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#F5EFE2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
          .spinner {
            width: 40px; height: 40px;
            border: 4px solid #e4d8c2;
            border-top: 4px solid #1E3A5F;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
          }
        `}</style>
        <div className="spinner"></div>
      </div>
    )
  }

  if (!customer) {
    return (
      <div style={{ minHeight: '100vh', background: '#F5EFE2', padding: '2rem', textAlign: 'center' }}>
        <p>Customer not found.</p>
        <button onClick={() => router.push('/dashboard/customers')}>← Back to customers</button>
      </div>
    )
  }

  return (
    <main style={{ minHeight: '100vh', background: '#F5EFE2', padding: '1.5rem 1.2rem' }}>
      <style>{`
        .back-link {
          background: none;
          border: none;
          color: #1E3A5F;
          font-size: 0.85rem;
          padding: 0;
          margin-bottom: 1rem;
          cursor: pointer;
        }
        .back-link:hover { text-decoration: underline; }
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
          color: #1E3A5F;
          margin: 0;
        }
        .header .phone {
          color: #6B6255;
          font-size: 0.9rem;
          margin: 0.1rem 0 0;
        }
        .header-actions { display: flex; gap: 0.4rem; flex-wrap: wrap; }
        .btn {
          padding: 0.3rem 0.7rem;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 600;
          border: 1px solid #E8E0D5;
          background: #fff;
          color: #1E3A5F;
          cursor: pointer;
          transition: background 0.1s ease;
          text-decoration: none;
        }
        .btn:hover { background: #F5EFE2; }
        .btn-primary { background: #1E3A5F; border-color: #1E3A5F; color: #fff; }
        .btn-primary:hover { background: #0F1E30; }
        .btn-gold { background: #C79A2B; border-color: #C79A2B; color: #1E3A5F; }
        .btn-gold:hover { background: #B4881E; }
        .btn-danger { background: #fff; border-color: #AE4A34; color: #AE4A34; }
        .btn-danger:hover { background: #F1DBD3; }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 0.5rem;
          margin-bottom: 1.2rem;
        }
        .stat-card {
          background: #fff;
          border-radius: 8px;
          padding: 0.6rem 0.3rem;
          border: 1px solid #E8E0D5;
          text-align: center;
        }
        .stat-card .number { font-size: 1.1rem; font-weight: 700; margin: 0; }
        .stat-card .number.navy { color: #1E3A5F; }
        .stat-card .number.red { color: #AE4A34; }
        .stat-card .number.green { color: #4C7A5E; }
        .stat-card .label { font-size: 0.6rem; color: #6B6255; margin: 0.1rem 0 0; text-transform: uppercase; }
        .edit-form {
          background: #fff;
          border-radius: 12px;
          padding: 1.2rem;
          border: 1px solid #E8E0D5;
          margin-bottom: 1rem;
        }
        .edit-form .form-group { margin-bottom: 0.8rem; }
        .edit-form label { display: block; font-size: 0.8rem; font-weight: 500; color: #2B2620; margin-bottom: 0.2rem; }
        .edit-form input, .edit-form textarea {
          width: 100%;
          padding: 0.6rem;
          border-radius: 6px;
          border: 1px solid #E8E0D5;
          font-size: 0.9rem;
          box-sizing: border-box;
          font-family: inherit;
        }
        .edit-form input:focus, .edit-form textarea:focus { outline: none; border-color: #C79A2B; }
        .measurement-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.6rem;
        }
        @media (max-width: 480px) {
          .stats-grid { grid-template-columns: repeat(2, 1fr); }
          .measurement-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <button className="back-link" onClick={() => router.push('/dashboard/customers')}>← Back to customers</button>

      <div className="header">
        <div>
          <p className="name">{customer.name}</p>
          <p className="phone">{customer.phone ? `📱 ${customer.phone}` : 'No phone'}</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-gold" onClick={() => setEditing(!editing)}>
            {editing ? '✕ Close' : '✏️ Edit'}
          </button>
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
            <label>Phone number</label>
            <input
              type="tel"
              inputMode="numeric"
              value={phone}
              onChange={handlePhoneChange}
              required
              placeholder="08012345678"
            />
            <div style={{ fontSize: '0.7rem', color: phone.length === 11 ? '#4C7A5E' : '#6B6255', marginTop: '0.2rem' }}>
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
              <h3 style={{ color: '#1E3A5F', fontSize: '0.9rem', margin: '1rem 0 0.5rem' }}>📏 Measurements</h3>
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
          </div>
          {message && <p style={{ color: '#AE4A34', marginTop: '0.5rem' }}>{message}</p>}
        </form>
      )}

      <div style={{ marginTop: '1.5rem' }}>
        <button className="btn btn-danger" onClick={handleDelete} disabled={deleting}>
          {deleting ? 'Deleting...' : '🗑️ Delete customer'}
        </button>
      </div>
    </main>
  )
    }
