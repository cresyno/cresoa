'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabaseClient'

const STAGES = ['Order placed', 'Cutting', 'Sewing', 'Ready', 'Delivered']

export default function TrackingPage({ params }) {
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    const loadOrder = async () => {
      const { data, error } = await supabase
        .rpc('get_tracking_order', { p_token: params.token })

      if (error || !data || data.length === 0) {
        setNotFound(true)
        setLoading(false)
        return
      }

      const row = data[0]
      setOrder({
        title: row.title,
        price: row.price,
        amount_paid: row.amount_paid,
        current_status: row.current_status,
        customers: { name: row.customer_name },
        businesses: { name: row.business_name },
      })
      setLoading(false)
    }

    loadOrder()
  }, [params.token])

  if (loading) {
    return (
      <main style={{ minHeight: '100vh', background: '#F5EFE2', padding: '2rem 1.5rem' }}>
        <p style={{ color: '#2B2620' }}>Loading...</p>
      </main>
    )
  }

  if (notFound) {
    return (
      <main style={{ minHeight: '100vh', background: '#F5EFE2', padding: '2rem 1.5rem' }}>
        <p style={{ color: '#2B2620' }}>This tracking link could not be found.</p>
      </main>
    )
  }

  const balance = order.price - order.amount_paid
  const currentIndex = STAGES.indexOf(order.current_status)

  return (
    <main style={{ minHeight: '100vh', background: '#F5EFE2', padding: '2rem 1.5rem' }}>
      <div style={{ maxWidth: '400px', margin: '0 auto' }}>
        <p style={{ color: '#6B6255', fontSize: '0.85rem', marginBottom: '0.2rem' }}>
          {order.businesses?.name}
        </p>
        <h1 style={{ color: '#1E3A5F', fontSize: '1.5rem', marginBottom: '0.3rem' }}>
          {order.title}
        </h1>
        <p style={{ color: '#2B2620', marginBottom: '1.5rem' }}>
          For {order.customers?.name}
        </p>

        <div
          style={{
            background: '#fff', borderRadius: '12px', padding: '1.5rem',
            border: '1px solid #e4d8c2', marginBottom: '1.5rem'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
            {STAGES.map((stage, i) => (
              <div key={stage} style={{ textAlign: 'center', flex: 1 }}>
                <div
                  style={{
                    width: i === currentIndex ? '20px' : '12px',
                    height: i === currentIndex ? '20px' : '12px',
                    borderRadius: '50%',
                    background: i <= currentIndex ? '#C79A2B' : '#fff',
                    border: `2px solid ${i <= currentIndex ? '#C79A2B' : '#e4d8c2'}`,
                    margin: '0 auto 0.4rem'
                  }}
                />
                <p style={{ fontSize: '0.65rem', color: i <= currentIndex ? '#2B2620' : '#6B6255', margin: 0 }}>
                  {stage}
                </p>
              </div>
            ))}
          </div>

          <div
            style={{
              background: order.current_status === 'Delivered' ? '#DCE8DF' : '#F6E9C8',
              borderRadius: '8px', padding: '0.8rem', textAlign: 'center'
            }}
          >
            <p style={{ margin: 0, fontWeight: '600', color: order.current_status === 'Delivered' ? '#4C7A5E' : '#C79A2B' }}>
              {order.current_status === 'Delivered'
                ? 'Delivered — thank you!'
                : `Currently: ${order.current_status}`}
            </p>
          </div>
        </div>

        <div
          style={{
            background: '#fff', borderRadius: '12px', padding: '1.5rem',
            border: '1px solid #e4d8c2'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
            <span style={{ color: '#6B6255' }}>Total</span>
            <span style={{ color: '#2B2620' }}>₦{order.price.toLocaleString()}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
            <span style={{ color: '#6B6255' }}>Paid</span>
            <span style={{ color: '#2B2620' }}>₦{order.amount_paid.toLocaleString()}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '600' }}>
            <span style={{ color: '#2B2620' }}>Balance</span>
            <span style={{ color: balance > 0 ? '#AE4A34' : '#4C7A5E' }}>
              {balance > 0 ? `₦${balance.toLocaleString()}` : 'Paid in full'}
            </span>
          </div>
        </div>
      </div>
    </main>
  )
          }
