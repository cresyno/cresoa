'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../../lib/supabaseClient'

export default function NewOrderPage() {
  const router = useRouter()
  const [customers, setCustomers] = useState([])
  const [customerId, setCustomerId] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [amountPaid, setAmountPaid] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [pageLoading, setPageLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [businessId, setBusinessId] = useState(null)

  useEffect(() => {
    const loadCustomers = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data: business } = await supabase
        .from('businesses')
        .select('id')
        .eq('owner_id', user.id)
        .single()

      setBusinessId(business.id)

      const { data: customerData } = await supabase
        .from('customers')
        .select('*')
        .eq('business_id', business.id)
        .order('name', { ascending: true })

      setCustomers(customerData || [])
      setPageLoading(false)
    }

    loadCustomers()
  }, [router])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    if (!customerId) {
      setMessage('Please select a customer.')
      setLoading(false)
      return
    }

    const priceNum = Number(price) || 0
    const paidNum = Number(amountPaid) || 0

    if (paidNum > priceNum) {
      setMessage('Amount paid cannot be more than the total price.')
      setLoading(false)
      return
    }

    const { error } = await supabase
      .from('orders')
      .insert({
        business_id: businessId,
        customer_id: customerId,
        title: title,
        description: description,
        price: priceNum,
        amount_paid: paidNum,
        due_date: dueDate || null,
        current_status: 'Order placed',
      })

    if (error) {
      setMessage('Error: ' + error.message)
      setLoading(false)
      return
    }

    router.push('/dashboard')
  }

  const inputStyle = {
    width: '100%', padding: '0.7rem', borderRadius: '8px',
    border: '1px solid #ccc', fontSize: '1rem', boxSizing: 'border-box'
  }
  const labelStyle = { display: 'block', color: '#2B2620', marginBottom: '0.4rem', fontSize: '0.9rem' }

  if (pageLoading) {
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
        <p style={{ color: '#6B6255', fontSize: '0.85rem', marginTop: '1rem' }}>Loading...</p>
      </main>
    )
  }

  return (
    <main style={{ minHeight: '100vh', background: '#F5EFE2', padding: '2rem 1.5rem' }}>
      <div style={{ maxWidth: '400px', margin: '0 auto' }}>
        <button
          onClick={() => router.push('/dashboard')}
          style={{ background: 'none', border: 'none', color: '#1E3A5F', fontSize: '0.85rem', padding: 0, marginBottom: '1rem' }}
        >
          ← Back to dashboard
        </button>

        <h1 style={{ color: '#1E3A5F', fontSize: '1.5rem', marginBottom: '1.5rem' }}>
          New order
        </h1>

        {customers.length === 0 ? (
          <div style={{ background: '#fff', borderRadius: '12px', padding: '1.5rem', border: '1px solid #e4d8c2', textAlign: 'center', color: '#2B2620' }}>
            <p>You need to add a customer first before creating an order.</p>
            <a href="/dashboard/customers/new" style={{ color: '#1E3A5F', fontWeight: '600' }}>+ Add a customer</a>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ background: '#fff', borderRadius: '14px', padding: '1.5rem', border: '1px solid #e4d8c2' }}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={labelStyle}>Customer</label>
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                required
                style={inputStyle}
              >
                <option value="">Select a customer</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={labelStyle}>Garment / style</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                placeholder="e.g. Ankara gown"
                style={inputStyle}
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={labelStyle}>Description (optional)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                style={inputStyle}
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={labelStyle}>Total price (₦)</label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
                style={inputStyle}
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={labelStyle}>Deposit paid (₦)</label>
              <input
                type="number"
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
                style={inputStyle}
              />
              {Number(amountPaid) > Number(price) && price && (
                <p style={{ fontSize: '0.78rem', color: '#AE4A34', marginTop: '0.3rem' }}>
                  Deposit cannot exceed the total price.
                </p>
              )}
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={labelStyle}>Due date (optional)</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                style={inputStyle}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: 'none', background: '#1E3A5F', color: '#fff', fontSize: '1rem', fontWeight: '600' }}
            >
              {loading ? 'Saving...' : 'Create order'}
            </button>

            {message && <p style={{ marginTop: '1rem', color: '#AE4A34', fontSize: '0.9rem' }}>{message}</p>}
          </form>
        )}
      </div>
    </main>
  )
    }
