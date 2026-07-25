'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../../lib/supabaseClient'

export default function NewGroupOrderPage() {
  const router = useRouter()
  const [businessId, setBusinessId] = useState(null)
  const [customers, setCustomers] = useState([])
  const [groupName, setGroupName] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [coordinatorId, setCoordinatorId] = useState('')
  const [members, setMembers] = useState([{ customerId: '', title: '', price: '', amountPaid: '' }])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
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

    load()
  }, [router])

  const addMemberRow = () => {
    setMembers([...members, { customerId: '', title: '', price: '', amountPaid: '' }])
  }

  const removeMemberRow = (index) => {
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

    const { data: group, error: groupError } = await supabase
      .from('group_orders')
      .insert({
        business_id: businessId,
        group_name: groupName,
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

    for (const m of validMembers) {
      const { error: orderError } = await supabase
        .from('orders')
        .insert({
          business_id: businessId,
          customer_id: m.customerId,
          title: m.title,
          price: Number(m.price) || 0,
          amount_paid: Number(m.amountPaid) || 0,
          due_date: dueDate || null,
          current_status: 'Order placed',
          group_order_id: group.id,
        })

      if (orderError) {
        setMessage('Error adding a member order: ' + orderError.message)
        setLoading(false)
        return
      }
    }

    router.push('/dashboard')
  }

  return (
    <main style={{ minHeight: '100vh', background: '#F5EFE2', padding: '2rem 1.5rem' }}>
      <div style={{ maxWidth: '450px', margin: '0 auto' }}>
        <h1 style={{ color: '#1E3A5F', fontSize: '1.5rem', marginBottom: '1.5rem' }}>
          New group order
        </h1>

        {customers.length === 0 ? (
          <p style={{ color: '#2B2620' }}>
            You need to add customers first before creating a group order.
          </p>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', color: '#2B2620', marginBottom: '0.4rem', fontSize: '0.9rem' }}>
                Group name
              </label>
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                required
                placeholder="e.g. Okafor 40th Birthday"
                style={{
                  width: '100%', padding: '0.7rem', borderRadius: '8px',
                  border: '1px solid #ccc', fontSize: '1rem', boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', color: '#2B2620', marginBottom: '0.4rem', fontSize: '0.9rem' }}>
                Coordinator (main contact)
              </label>
              <select
                value={coordinatorId}
                onChange={(e) => setCoordinatorId(e.target.value)}
                required
                style={{
                  width: '100%', padding: '0.7rem', borderRadius: '8px',
                  border: '1px solid #ccc', fontSize: '1rem', boxSizing: 'border-box'
                }}
              >
                <option value="">Select coordinator</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', color: '#2B2620', marginBottom: '0.4rem', fontSize: '0.9rem' }}>
                Shared due date (optional)
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                style={{
                  width: '100%', padding: '0.7rem', borderRadius: '8px',
                  border: '1px solid #ccc', fontSize: '1rem', boxSizing: 'border-box'
                }}
              />
            </div>

            <h2 style={{ color: '#1E3A5F', fontSize: '1rem', marginBottom: '0.8rem' }}>
              Members
            </h2>

            {members.map((m, index) => (
              <div
                key={index}
                style={{
                  background: '#fff', borderRadius: '10px', padding: '1rem',
                  border: '1px solid #e4d8c2', marginBottom: '0.8rem'
                }}
              >
                <select
                  value={m.customerId}
                  onChange={(e) => updateMember(index, 'customerId', e.target.value)}
                  style={{
                    width: '100%', padding: '0.6rem', borderRadius: '8px',
                    border: '1px solid #ccc', fontSize: '0.9rem', marginBottom: '0.5rem', boxSizing: 'border-box'
                  }}
                >
                  <option value="">Select customer</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <input
                  type="text"
                  value={m.title}
                  onChange={(e) => updateMember(index, 'title', e.target.value)}
                  placeholder="Item (e.g. Aso-ebi gown)"
                  style={{
                    width: '100%', padding: '0.6rem', borderRadius: '8px',
                    border: '1px solid #ccc', fontSize: '0.9rem', marginBottom: '0.5rem', boxSizing: 'border-box'
                  }}
                />
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <input
                    type="number"
                    value={m.price}
                    onChange={(e) => updateMember(index, 'price', e.target.value)}
                    placeholder="Price (₦)"
                    style={{
                      flex: 1, padding: '0.6rem', borderRadius: '8px',
                      border: '1px solid #ccc', fontSize: '0.9rem', boxSizing: 'border-box'
                    }}
                  />
                  <input
                    type="number"
                    value={m.amountPaid}
                    onChange={(e) => updateMember(index, 'amountPaid', e.target.value)}
                    placeholder="Deposit (₦)"
                    style={{
                      flex: 1, padding: '0.6rem', borderRadius: '8px',
                      border: '1px solid #ccc', fontSize: '0.9rem', boxSizing: 'border-box'
                    }}
                  />
                </div>
                {members.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeMemberRow(index)}
                    style={{
                      background: 'none', border: 'none', color: '#AE4A34',
                      fontSize: '0.8rem', padding: 0
                    }}
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}

            <button
              type="button"
              onClick={addMemberRow}
              style={{
                width: '100%', padding: '0.6rem', borderRadius: '8px',
                border: '1px dashed #1E3A5F', background: 'none', color: '#1E3A5F',
                fontSize: '0.9rem', fontWeight: '600', marginBottom: '1.5rem'
              }}
            >
              + Add another member
            </button>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '0.8rem', borderRadius: '8px',
                border: 'none', background: '#1E3A5F', color: '#fff',
                fontSize: '1rem', fontWeight: '600'
              }}
            >
              {loading ? 'Saving...' : 'Create group order'}
            </button>

            {message && (
              <p style={{ marginTop: '1rem', color: '#AE4A34', fontSize: '0.9rem' }}>
                {message}
              </p>
            )}
          </form>
        )}
      </div>
    </main>
  )
                   }
