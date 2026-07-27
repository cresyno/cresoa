'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../../lib/supabaseClient'

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
  const [stats, setStats] = useState(null)
  const [lastOrderId, setLastOrderId] = useState(null)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [measurements, setMeasurements] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [orderCount, setOrderCount] = useState(0)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', params.id)
        .single()

      if (error || !data) {
        setMessage('Customer not found.')
        setLoading(false)
        return
      }

      setName(data.name || '')
      setPhone(data.phone || '')
      setNotes(data.notes || '')
      setMeasurements(data.measurements || {})

      const { count } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('customer_id', params.id)

      setOrderCount(count || 0)

      const { data: custOrders } = await supabase
        .from('orders')
        .select('*')
        .eq('customer_id', params.id)
        .order('created_at', { ascending: false })

      if (custOrders && custOrders.length > 0) {
        const totalSpent = custOrders.reduce((sum, o) => sum + o.price, 0)
        const totalPaid = custOrders.reduce((sum, o) => sum + o.amount_paid, 0)
        setStats({
          totalSpent,
          totalPaid,
          count: custOrders.length,
          lastDate: custOrders[0].created_at,
          avg: totalSpent / custOrders.length,
        })
        setLastOrderId(custOrders[0].id)
      }

      setLoading(false)
    }

    load()
  }, [params.id])
  const updateMeasurement = (key, value) => {
    setMeasurements({ ...measurements, [key]: value })
  }

  const handlePhoneChange = (e) => {
    const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 11)
    setPhone(digitsOnly)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setMessage('')

    if (phone.length !== 11) {
      setMessage('Phone number must be exactly 11 digits.')
      setSaving(false)
      return
    }

    const { error } = await supabase
      .from('customers')
      .update({ name, phone, notes, measurements })
      .eq('id', params.id)

    if (error) {
      setMessage('Error: ' + error.message)
      setSaving(false)
      return
    }

    setMessage('Saved!')
    setSaving(false)
  }

  const handleDelete = async () => {
    if (orderCount > 0) {
      alert(`${name} has ${orderCount} order(s). Delete those orders first before deleting this customer.`)
      return
    }

    const confirmed = window.confirm(`Do you want to delete "${name}"? This can't be undone.`)
    if (!confirmed) return

    setDeleting(true)
    await supabase.from('customers').delete().eq('id', params.id)
    router.push('/dashboard/customers')
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

  return (
    <main style={{ minHeight: '100vh', background: '#F5EFE2', padding: '2rem 1.5rem' }}>
      <div style={{ maxWidth: '400px', margin: '0 auto' }}>
        <button
          onClick={() => router.push('/dashboard/customers')}
          style={{ background: 'none', border: 'none', color: '#1E3A5F', fontSize: '0.85rem', padding: 0, marginBottom: '1rem' }}
        >
          ← Back to customers
        </button>

        <h1 style={{ color: '#1E3A5F', fontSize: '1.5rem', marginBottom: '1.5rem' }}>
          Edit customer
        </h1>

        {stats && (
          <div style={{ background: '#fff', borderRadius: '14px', padding: '1.2rem', border: '1px solid #e4d8c2', marginBottom: '1.2rem' }}>
            <h2 style={{ color: '#1E3A5F', fontSize: '1rem', margin: '0 0 0.8rem' }}>Customer value</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', fontSize: '0.85rem' }}>
              <div>
                <p style={{ margin: 0, color: '#6B6255' }}>Total Spent</p>
                <p style={{ margin: 0, fontWeight: '700', color: '#1E3A5F' }}>₦{stats.totalSpent.toLocaleString()}</p>
              </div>
              <div>
                <p style={{ margin: 0, color: '#6B6255' }}>Total Paid</p>
                <p style={{ margin: 0, fontWeight: '700', color: '#4C7A5E' }}>₦{stats.totalPaid.toLocaleString()}</p>
              </div>
              <div>
                <p style={{ margin: 0, color: '#6B6255' }}>Orders</p>
                <p style={{ margin: 0, fontWeight: '700', color: '#1E3A5F' }}>{stats.count}</p>
              </div>
              <div>
                <p style={{ margin: 0, color: '#6B6255' }}>Avg Order</p>
                <p style={{ margin: 0, fontWeight: '700', color: '#1E3A5F' }}>₦{Math.round(stats.avg).toLocaleString()}</p>
              </div>
            </div>
            <p style={{ fontSize: '0.78rem', color: '#6B6255', marginTop: '0.6rem', marginBottom: 0 }}>
              Last order: {new Date(stats.lastDate).toLocaleDateString('en-NG')}
            </p>
          </div>
        )}

        {lastOrderId && (
          <button
            onClick={() => router.push(`/dashboard/orders/new?duplicate=${lastOrderId}`)}
            style={{ width: '100%', padding: '0.7rem', borderRadius: '8px', border: '1px solid #C79A2B', background: '#fff', color: '#C79A2B', fontSize: '0.9rem', fontWeight: '600', marginBottom: '1.2rem' }}
          >
            Duplicate last order
          </button>
        )}

        <form onSubmit={handleSave}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', color: '#2B2620', marginBottom: '0.4rem', fontSize: '0.9rem' }}>
              Customer name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              style={{ width: '100%', padding: '0.7rem', borderRadius: '8px', border: '1px solid #ccc', fontSize: '1rem', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', color: '#2B2620', marginBottom: '0.4rem', fontSize: '0.9rem' }}>
              Phone number
            </label>
            <input
              type="tel"
              inputMode="numeric"
              pattern="[0-9]*"
              value={phone}
              onChange={handlePhoneChange}
              required
              style={{ width: '100%', padding: '0.7rem', borderRadius: '8px', border: '1px solid #ccc', fontSize: '1rem', boxSizing: 'border-box' }}
            />
            <p style={{ fontSize: '0.78rem', color: phone.length === 11 ? '#4C7A5E' : '#6B6255', marginTop: '0.3rem' }}>
              {phone.length}/11 digits
            </p>
          </div>

          <h2 style={{ color: '#1E3A5F', fontSize: '1rem', margin: '1.5rem 0 0.8rem' }}>
            Measurements
          </h2>

          {MEASUREMENT_FIELDS.map((f) => (
            <div key={f.key} style={{ marginBottom: '0.8rem' }}>
              <label style={{ display: 'block', color: '#2B2620', marginBottom: '0.3rem', fontSize: '0.85rem' }}>
                {f.label}
              </label>
              <input
                type="number"
                step="0.1"
                value={measurements[f.key] || ''}
                onChange={(e) => updateMeasurement(f.key, e.target.value)}
                style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #ccc', fontSize: '0.95rem', boxSizing: 'border-box' }}
              />
            </div>
          ))}

          <div style={{ marginBottom: '1.5rem', marginTop: '1rem' }}>
            <label style={{ display: 'block', color: '#2B2620', marginBottom: '0.4rem', fontSize: '0.9rem' }}>
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              style={{ width: '100%', padding: '0.7rem', borderRadius: '8px', border: '1px solid #ccc', fontSize: '1rem', boxSizing: 'border-box' }}
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: 'none', background: '#1E3A5F', color: '#fff', fontSize: '1rem', fontWeight: '600' }}
          >
            {saving ? 'Saving...' : 'Save changes'}
          </button>

          {message && <p style={{ marginTop: '1rem', color: message === 'Saved!' ? '#4C7A5E' : '#AE4A34', fontSize: '0.9rem' }}>{message}</p>}
        </form>

        <button
          onClick={handleDelete}
          disabled={deleting}
          style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #AE4A34', background: '#fff', color: '#AE4A34', fontSize: '0.9rem', fontWeight: '600', marginTop: '1rem' }}
        >
          {deleting ? 'Deleting...' : 'Delete customer'}
        </button>
        {orderCount > 0 && (
          <p style={{ fontSize: '0.78rem', color: '#6B6255', marginTop: '0.5rem', textAlign: 'center' }}>
            This customer has {orderCount} order(s) — delete those first.
          </p>
        )}
      </div>
    </main>
  )
                   }
