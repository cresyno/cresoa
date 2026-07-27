'use client'

import { Suspense } from 'react'
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../../../lib/supabaseClient'

function NewOrderContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [businessId, setBusinessId] = useState(null)
  const [customers, setCustomers] = useState([])

  // Form state
  const [customerId, setCustomerId] = useState('')
  const [itemName, setItemName] = useState('')
  const [price, setPrice] = useState('')
  const [deposit, setDeposit] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [status, setStatus] = useState('Order placed')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  // For "duplicate" functionality
  const [isDuplicating, setIsDuplicating] = useState(false)

  // Customer form
  const [showNewCustomer, setShowNewCustomer] = useState(false)
  const [newCustomerName, setNewCustomerName] = useState('')
  const [newCustomerPhone, setNewCustomerPhone] = useState('')
  const [creatingCustomer, setCreatingCustomer] = useState(false)

  const load = async () => {
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

    // Load customers
    const { data: customerData } = await supabase
      .from('customers')
      .select('*')
      .eq('business_id', business.id)
      .order('name', { ascending: true })

    setCustomers(customerData || [])

    // Check if customer ID is in URL
    const customerParam = searchParams?.get('customer')
    if (customerParam) {
      setCustomerId(customerParam)
    }

    // Check for duplicate param
    const duplicateId = searchParams?.get('duplicate')
    if (duplicateId) {
      await loadDuplicateOrder(duplicateId)
    }
  }

  const loadDuplicateOrder = async (orderId) => {
    setIsDuplicating(true)
    const { data: order } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single()

    if (order) {
      setCustomerId(order.customer_id)
      setItemName(order.title || '')
      setPrice(order.price.toString())
      setDeposit(order.amount_paid.toString())
      setDueDate(order.due_date || '')
      setStatus(order.current_status || 'Order placed')
    }
    setIsDuplicating(false)
  }

  useEffect(() => {
    load()
  }, [searchParams])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMessage('')
    setLoading(true)

    if (!customerId) {
      setMessage('Please select a customer.')
      setLoading(false)
      return
    }

    if (!itemName.trim()) {
      setMessage('Please enter the item/garment name.')
      setLoading(false)
      return
    }

    if (!price || Number(price) <= 0) {
      setMessage('Please enter a valid price.')
      setLoading(false)
      return
    }

    const priceNum = Number(price)
    const depositNum = Number(deposit) || 0

    if (depositNum > priceNum) {
      setMessage('Deposit cannot be more than the total price.')
      setLoading(false)
      return
    }

    const { data: order, error } = await supabase
      .from('orders')
      .insert({
        business_id: businessId,
        customer_id: customerId,
        title: itemName.trim(),
        price: priceNum,
        amount_paid: depositNum,
        due_date: dueDate || null,
        current_status: status,
      })
      .select()
      .single()

    if (error) {
      setMessage('Error: ' + error.message)
      setLoading(false)
      return
    }

    setMessage('✅ Order created!')
    setLoading(false)

    setTimeout(() => {
      router.push(`/dashboard/orders/${order.id}`)
    }, 800)
  }

  const handleCreateCustomer = async (e) => {
    e.preventDefault()
    setCreatingCustomer(true)
    setMessage('')

    const phoneDigits = newCustomerPhone.replace(/\D/g, '')

    if (!newCustomerName.trim()) {
      setMessage('Please enter the customer name.')
      setCreatingCustomer(false)
      return
    }

    if (phoneDigits.length !== 11) {
      setMessage('Phone number must be 11 digits.')
      setCreatingCustomer(false)
      return
    }

    const { data: customer, error } = await supabase
      .from('customers')
      .insert({
        business_id: businessId,
        name: newCustomerName.trim(),
        phone: phoneDigits,
      })
      .select()
      .single()

    if (error) {
      setMessage('Error creating customer: ' + error.message)
      setCreatingCustomer(false)
      return
    }

    // Add to customer list and select it
    setCustomers([...customers, customer])
    setCustomerId(customer.id)
    setNewCustomerName('')
    setNewCustomerPhone('')
    setShowNewCustomer(false)
    setCreatingCustomer(false)
    setMessage('✅ Customer created!')
  }

  const handlePhoneChange = (e) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 11)
    setNewCustomerPhone(digits)
  }

  if (!businessId) {
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
    <main style={{ minHeight: '100vh', background: '#F5EFE2', padding: '1.5rem 1.2rem' }}>
      <style>{`
        .form-card {
          background: #fff;
          border-radius: 14px;
          padding: 1.5rem;
          border: 1px solid #E8E0D5;
          max-width: 420px;
          margin: 0 auto;
        }
        .form-group {
          margin-bottom: 1rem;
        }
        .form-group label {
          display: block;
          color: #2B2620;
          margin-bottom: 0.3rem;
          font-size: 0.85rem;
          font-weight: 500;
        }
        .form-input {
          width: 100%;
          padding: 0.7rem;
          border-radius: 8px;
          border: 1px solid #E8E0D5;
          font-size: 0.95rem;
          background: #fff;
          box-sizing: border-box;
          color: #2B2620;
          transition: border-color 0.2s ease;
        }
        .form-input:focus {
          outline: none;
          border-color: #C79A2B;
        }
        .form-select {
          width: 100%;
          padding: 0.7rem;
          border-radius: 8px;
          border: 1px solid #E8E0D5;
          font-size: 0.95rem;
          background: #fff;
          box-sizing: border-box;
          color: #2B2620;
          transition: border-color 0.2s ease;
        }
        .form-select:focus {
          outline: none;
          border-color: #C79A2B;
        }
        .btn-primary {
          width: 100%;
          padding: 0.85rem;
          border-radius: 8px;
          border: none;
          background: linear-gradient(135deg, #C79A2B, #B4881E);
          color: #1E3A5F;
          font-size: 1rem;
          font-weight: 700;
          box-shadow: 0 4px 14px rgba(199,154,43,0.3);
          cursor: pointer;
          transition: transform 0.1s ease;
        }
        .btn-primary:active {
          transform: scale(0.98);
        }
        .btn-primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .btn-secondary {
          padding: 0.5rem 1rem;
          border-radius: 6px;
          border: 1px solid #E8E0D5;
          background: #fff;
          color: #1E3A5F;
          font-size: 0.8rem;
          cursor: pointer;
          transition: background 0.1s ease;
        }
        .btn-secondary:hover {
          background: #F5EFE2;
        }
        .btn-link {
          background: none;
          border: none;
          color: #1E3A5F;
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          padding: 0;
          text-decoration: underline;
        }
        .btn-link:hover {
          color: #C79A2B;
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
        .header-row {
          display: flex;
          align-items: center;
          gap: 0.8rem;
          margin-bottom: 1rem;
          flex-wrap: wrap;
        }
        .header-row h1 {
          color: #1E3A5F;
          font-size: 1.3rem;
          font-weight: 700;
          margin: 0;
        }
        .header-row .badge {
          background: #F6E9C8;
          color: #1E3A5F;
          padding: 0.1rem 0.6rem;
          border-radius: 12px;
          font-size: 0.65rem;
          font-weight: 600;
        }
        .duplicate-banner {
          background: #F6E9C8;
          padding: 0.5rem 1rem;
          border-radius: 8px;
          margin-bottom: 1rem;
          font-size: 0.85rem;
          color: #1E3A5F;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 0.5rem;
        }
        .message-success {
          color: #4C7A5E;
          font-size: 0.9rem;
          text-align: center;
          margin-top: 0.8rem;
        }
        .message-error {
          color: #AE4A34;
          font-size: 0.9rem;
          text-align: center;
          margin-top: 0.8rem;
        }
        .new-customer-form {
          background: #F8F6F2;
          border-radius: 8px;
          padding: 1rem;
          margin-top: 0.5rem;
          border: 1px solid #E8E0D5;
        }
        .new-customer-form .row {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }
        .new-customer-form .row input {
          flex: 1;
          min-width: 100px;
        }
        .inline-flex {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-wrap: wrap;
        }
        @media (max-width: 420px) {
          .form-card {
            padding: 1rem;
          }
          .new-customer-form .row {
            flex-direction: column;
          }
          .new-customer-form .row input {
            width: 100%;
          }
        }
      `}</style>

      {/* ===== BACK BUTTON ===== */}
      <button className="back-link" onClick={() => router.push('/dashboard')}>
        ← Back to dashboard
      </button>

      {/* ===== HEADER ===== */}
      <div className="header-row">
        <h1>New Order</h1>
        {isDuplicating && <span className="badge">📋 Duplicating</span>}
      </div>

      {isDuplicating && (
        <div className="duplicate-banner">
          <span>📋 Creating a copy of an existing order</span>
          <button
            className="btn-secondary"
            onClick={() => {
              setIsDuplicating(false)
              setCustomerId('')
              setItemName('')
              setPrice('')
              setDeposit('')
              setDueDate('')
              setStatus('Order placed')
            }}
          >
            ✕ Clear
          </button>
        </div>
      )}
               {/* ===== FORM ===== */}
      <form onSubmit={handleSubmit} className="form-card">
        {/* Customer */}
        <div className="form-group">
          <div className="inline-flex" style={{ justifyContent: 'space-between' }}>
            <label>Customer</label>
            <button
              type="button"
              className="btn-link"
              onClick={() => setShowNewCustomer(!showNewCustomer)}
            >
              {showNewCustomer ? '✕ Cancel' : '+ New customer'}
            </button>
          </div>

          {showNewCustomer ? (
            <div className="new-customer-form">
              <p style={{ fontSize: '0.8rem', color: '#6B6255', margin: '0 0 0.5rem' }}>
                Add a new customer first, then create their order.
              </p>
              <div className="row">
                <input
                  className="form-input"
                  type="text"
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                  placeholder="Customer name"
                  required
                />
                <input
                  className="form-input"
                  type="tel"
                  inputMode="numeric"
                  value={newCustomerPhone}
                  onChange={handlePhoneChange}
                  placeholder="Phone 080..."
                  required
                />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleCreateCustomer}
                  disabled={creatingCustomer}
                  style={{ flex: 1, padding: '0.5rem', fontSize: '0.85rem', width: 'auto' }}
                >
                  {creatingCustomer ? 'Creating...' : '➕ Create customer'}
                </button>
              </div>
            </div>
          ) : (
            <select
              className="form-select"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              required
            >
              <option value="">Select a customer</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.phone ? `· ${c.phone}` : ''}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Item Name */}
        <div className="form-group">
          <label>Item / Garment name</label>
          <input
            className="form-input"
            type="text"
            value={itemName}
            onChange={(e) => setItemName(e.target.value)}
            placeholder="e.g. Aso-ebi gown, Ankara top..."
            required
          />
        </div>

        {/* Price & Deposit */}
        <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap' }}>
          <div className="form-group" style={{ flex: 1, minWidth: '120px' }}>
            <label>Total Price (₦)</label>
            <input
              className="form-input"
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0.00"
              required
            />
          </div>
          <div className="form-group" style={{ flex: 1, minWidth: '120px' }}>
            <label>Deposit (₦)</label>
            <input
              className="form-input"
              type="number"
              value={deposit}
              onChange={(e) => setDeposit(e.target.value)}
              placeholder="0.00"
            />
          </div>
        </div>

        {/* Due Date */}
        <div className="form-group">
          <label>Due date</label>
          <input
            className="form-input"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>

        {/* Status (visible but can be default) */}
        <div className="form-group">
          <label>Starting status</label>
          <select
            className="form-select"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="Order placed">Order placed</option>
            <option value="Cutting">Cutting</option>
            <option value="Sewing">Sewing</option>
            <option value="Ready">Ready</option>
            <option value="Delivered">Delivered</option>
          </select>
        </div>

        {/* Submit */}
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Creating order...' : '🚀 Create order'}
        </button>

        {message && (
          <p className={message.startsWith('✅') ? 'message-success' : 'message-error'}>
            {message}
          </p>
        )}
      </form>
    </main>
  )
}

// ===== PAGE EXPORT WITH SUSPENSE BOUNDARY =====
export default function Page() {
  return (
    <Suspense fallback={
      <div style={{
        minHeight: '100vh',
        background: '#F5EFE2',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <p style={{ color: '#6B6255' }}>Loading...</p>
      </div>
    }>
      <NewOrderContent />
    </Suspense>
  )
              }
