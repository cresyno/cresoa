'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../../lib/supabaseClient'

export default function NewGroupOrderPage() {
  const router = useRouter()
  const [businessId, setBusinessId] = useState(null)
  const [customers, setCustomers] = useState([])

  // Group details
  const [groupName, setGroupName] = useState('')
  const [coordinatorId, setCoordinatorId] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  // Members
  const [members, setMembers] = useState([
    { customerId: '', title: '', price: '', amountPaid: '' }
  ])

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

    const { data: customerData } = await supabase
      .from('customers')
      .select('*')
      .eq('business_id', business.id)
      .order('name', { ascending: true })

    setCustomers(customerData || [])
  }

  useEffect(() => {
    load()
  }, [])

  // Member handlers
  const addMember = () => {
    setMembers([...members, { customerId: '', title: '', price: '', amountPaid: '' }])
  }

  const removeMember = (index) => {
    if (members.length === 1) return
    setMembers(members.filter((_, i) => i !== index))
  }

  const updateMember = (index, field, value) => {
    const updated = [...members]
    updated[index][field] = value
    setMembers(updated)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    // Validation
    if (!groupName.trim()) {
      setMessage('Please enter a group name.')
      setLoading(false)
      return
    }

    if (!coordinatorId) {
      setMessage('Please select a coordinator.')
      setLoading(false)
      return
    }

    const validMembers = members.filter(m => m.customerId && m.title && m.price)
    if (validMembers.length === 0) {
      setMessage('Please add at least one member with a customer, item, and price.')
      setLoading(false)
      return
    }

    // Create group
    const { data: group, error: groupError } = await supabase
      .from('group_orders')
      .insert({
        business_id: businessId,
        group_name: groupName.trim(),
        coordinator_customer_id: coordinatorId,
        due_date: dueDate || null,
      })
      .select()
      .single()

    if (groupError) {
      setMessage('Error creating group: ' + groupError.message)
      setLoading(false)
      return
    }

    // Create member orders
    for (const m of validMembers) {
      const { error: orderError } = await supabase
        .from('orders')
        .insert({
          business_id: businessId,
          customer_id: m.customerId,
          title: m.title.trim(),
          price: Number(m.price) || 0,
          amount_paid: Number(m.amountPaid) || 0,
          due_date: dueDate || null,
          current_status: 'Order placed',
          group_order_id: group.id,
        })

      if (orderError) {
        setMessage('Error adding member: ' + orderError.message)
        setLoading(false)
        return
      }
    }

    setMessage('✅ Group order created!')
    setLoading(false)

    setTimeout(() => {
      router.push('/dashboard')
    }, 1000)
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
          max-width: 480px;
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
        .btn-danger {
          background: none;
          border: none;
          color: #AE4A34;
          font-size: 0.75rem;
          cursor: pointer;
          padding: 0;
        }
        .btn-danger:hover {
          text-decoration: underline;
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
          background: #AE4A34;
          color: #fff;
          padding: 0.1rem 0.6rem;
          border-radius: 12px;
          font-size: 0.65rem;
          font-weight: 600;
        }
        .member-card {
          background: #F8F6F2;
          border-radius: 10px;
          padding: 1rem;
          border: 1px solid #E8E0D5;
          margin-bottom: 0.7rem;
        }
        .member-card .row {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }
        .member-card .row .field {
          flex: 1;
          min-width: 80px;
        }
        .member-card .row .field-small {
          flex: 0.5;
          min-width: 60px;
        }
        .member-card .actions {
          display: flex;
          justify-content: flex-end;
          margin-top: 0.5rem;
        }
        .add-btn {
          width: 100%;
          padding: 0.6rem;
          border-radius: 8px;
          border: 2px dashed #1E3A5F;
          background: none;
          color: #1E3A5F;
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.1s ease;
        }
        .add-btn:hover {
          background: #F5EFE2;
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
        @media (max-width: 420px) {
          .form-card {
            padding: 1rem;
          }
          .member-card .row {
            flex-direction: column;
          }
          .member-card .row .field {
            width: 100%;
          }
          .member-card .row .field-small {
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
        <h1>New Group Order</h1>
        <span className="badge">Aso-Ebi / Event</span>
      </div>

      {/* ===== FORM ===== */}
      <form onSubmit={handleSubmit} className="form-card">
        {/* Group Name */}
        <div className="form-group">
          <label>Group name</label>
          <input
            className="form-input"
            type="text"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="e.g. Okafor 40th Birthday, Johnson Wedding"
            required
          />
        </div>

        {/* Coordinator */}
        <div className="form-group">
          <label>Coordinator (main contact)</label>
          <select
            className="form-select"
            value={coordinatorId}
            onChange={(e) => setCoordinatorId(e.target.value)}
            required
          >
            <option value="">Select coordinator</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} {c.phone ? `· ${c.phone}` : ''}
              </option>
            ))}
          </select>
          {customers.length === 0 && (
            <p style={{ fontSize: '0.75rem', color: '#AE4A34', marginTop: '0.2rem' }}>
              No customers yet. <a href="/dashboard/customers/new" style={{ color: '#1E3A5F' }}>Add a customer first</a>
            </p>
          )}
        </div>

        {/* Shared Due Date */}
        <div className="form-group">
          <label>Shared due date <span style={{ fontWeight: '400', color: '#6B6255' }}>(optional)</span></label>
          <input
            className="form-input"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
          <p style={{ fontSize: '0.7rem', color: '#6B6255', marginTop: '0.2rem' }}>
            All members will share this due date by default.
          </p>
        </div>

        {/* Members */}
        <div style={{ marginTop: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
            <h2 style={{ color: '#1E3A5F', fontSize: '1rem', margin: 0 }}>👥 Members</h2>
            <span style={{ color: '#6B6255', fontSize: '0.75rem' }}>
              {members.filter(m => m.customerId && m.title && m.price).length} added
            </span>
          </div>

          {members.map((m, index) => (
            <div key={index} className="member-card">
              <div className="row">
                <div className="field">
                  <label style={{ fontSize: '0.7rem', color: '#6B6255', display: 'block', marginBottom: '0.2rem' }}>Customer</label>
                  <select
                    className="form-select"
                    value={m.customerId}
                    onChange={(e) => updateMember(index, 'customerId', e.target.value)}
                    style={{ padding: '0.4rem', fontSize: '0.8rem' }}
                  >
                    <option value="">Select</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label style={{ fontSize: '0.7rem', color: '#6B6255', display: 'block', marginBottom: '0.2rem' }}>Item</label>
                  <input
                    className="form-input"
                    type="text"
                    value={m.title}
                    onChange={(e) => updateMember(index, 'title', e.target.value)}
                    placeholder="e.g. Aso-ebi gown"
                    style={{ padding: '0.4rem', fontSize: '0.8rem' }}
                  />
                </div>
                <div className="field-small">
                  <label style={{ fontSize: '0.7rem', color: '#6B6255', display: 'block', marginBottom: '0.2rem' }}>Price (₦)</label>
                  <input
                    className="form-input"
                    type="number"
                    value={m.price}
                    onChange={(e) => updateMember(index, 'price', e.target.value)}
                    placeholder="0"
                    style={{ padding: '0.4rem', fontSize: '0.8rem' }}
                  />
                </div>
                <div className="field-small">
                  <label style={{ fontSize: '0.7rem', color: '#6B6255', display: 'block', marginBottom: '0.2rem' }}>Deposit (₦)</label>
                  <input
                    className="form-input"
                    type="number"
                    value={m.amountPaid}
                    onChange={(e) => updateMember(index, 'amountPaid', e.target.value)}
                    placeholder="0"
                    style={{ padding: '0.4rem', fontSize: '0.8rem' }}
                  />
                </div>
              </div>
              <div className="actions">
                {members.length > 1 && (
                  <button type="button" className="btn-danger" onClick={() => removeMember(index)}>
                    ✕ Remove member
                  </button>
                )}
              </div>
            </div>
          ))}

          <button type="button" className="add-btn" onClick={addMember}>
            + Add member
          </button>
        </div>

        {/* Submit */}
        <button
          type="submit"
          className="btn-primary"
          disabled={loading || customers.length === 0}
          style={{ marginTop: '1.5rem' }}
        >
          {loading ? 'Creating group...' : '🚀 Create group order'}
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
