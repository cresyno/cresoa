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
        due_date: row.due_date,
        customerName: row.customer_name,
        measurements: row.customer_measurements || {},
        businessName: row.business_name,
        businessPhone: row.business_phone,
        businessWhatsapp: row.business_whatsapp,
      })
      setLoading(false)
    }

    loadOrder()
  }, [params.token])

  const chatDesigner = () => {
    let phone = order.businessWhatsapp || order.businessPhone
    if (!phone) {
      alert('This business has not added a contact number yet.')
      return
    }
    phone = phone.startsWith('0') ? '234' + phone.slice(1) : phone
    const message = `Hi ${order.businessName}, this is ${order.customerName} — I'm checking in about my order "${order.title}".`
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank')
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
        <p style={{ color: '#6B6255', fontSize: '0.85rem', marginTop: '1rem' }}>Loading...</p>
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
  const measurementEntries = Object.entries(order.measurements).filter(([, v]) => v)

  const formatDate = (d) => {
    if (!d) return null
    return new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })
  }

  return (
    <main style={{ minHeight: '100vh', background: '#F5EFE2', padding: '2rem 1.5rem' }}>
      <div style={{ maxWidth: '400px', margin: '0 auto' }}>
        <p style={{ color: '#6B6255', fontSize: '0.85rem', marginBottom: '0.2rem' }}>
          {order.businessName}
        </p>
        <h1 style={{ color: '#1E3A5F', fontSize: '1.5rem', marginBottom: '0.3rem' }}>
          {order.title}
        </h1>
        <p style={{ color: '#2B2620', marginBottom: '1.5rem' }}>
          For {order.customerName}
        </p>

        <div style={{ background: '#fff', borderRadius: '12px', padding: '1.5rem', border: '1px solid #e4d8c2', marginBottom: '1.5rem' }}>
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

          <div style={{ background: order.current_status === 'Delivered' ? '#DCE8DF' : '#F6E9C8', borderRadius: '8px', padding: '0.8rem', textAlign: 'center' }}>
            <p style={{ margin: 0, fontWeight: '600', color: order.current_status === 'Delivered' ? '#4C7A5E' : '#C79A2B' }}>
              {order.current_status === 'Delivered' ? 'Delivered — thank you!' : `Currently: ${order.current_status}`}
            </p>
          </div>

          {order.due_date && (
            <p style={{ textAlign: 'center', marginTop: '0.8rem', marginBottom: 0, color: '#1E3A5F', fontWeight: '600' }}>
              Ready by: {formatDate(order.due_date)}
            </p>
          )}
        </div>

        <div style={{ background: '#fff', borderRadius: '12px', padding: '1.5rem', border: '1px solid #e4d8c2', marginBottom: '1.5rem' }}>
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

        {measurementEntries.length > 0 && (
          <div style={{ background: '#fff', borderRadius: '12px', padding: '1.5rem', border: '1px solid #e4d8c2', marginBottom: '1.5rem' }}>
            <p style={{ margin: '0 0 0.8rem', fontWeight: '600', color: '#1E3A5F' }}>Your measurements on file</p>
            {measurementEntries.map(([key, value]) => (
              <div key={key} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                <span style={{ color: '#6B6255', fontSize: '0.85rem', textTransform: 'capitalize' }}>{key.replace('_', ' ')}</span>
                <span style={{ color: '#2B2620', fontSize: '0.85rem' }}>{value}"</span>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={chatDesigner}
          style={{ width: '100%', padding: '0.8rem', borderRadius: '10px', border: 'none', background: '#4C7A5E', color: '#fff', fontSize: '0.95rem', fontWeight: '600' }}
        >
          Chat {order.businessName} on WhatsApp
        </button>
      </div>
    </main>
  )
    }
