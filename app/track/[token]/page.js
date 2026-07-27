'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabaseClient'

const STAGES = ['Order placed', 'Cutting', 'Sewing', 'Ready', 'Delivered']

export default function TrackPage({ params }) {
  const router = useRouter()
  const [order, setOrder] = useState(null)
  const [business, setBusiness] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    const load = async () => {
      const { token } = await params

      if (!token) {
        setError(true)
        setLoading(false)
        return
      }

      // Fetch order by tracking token
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('*, customers(name, phone)')
        .eq('tracking_token', token)
        .single()

      if (orderError || !orderData) {
        setError(true)
        setLoading(false)
        return
      }

      setOrder(orderData)

      // Fetch business info
      const { data: businessData } = await supabase
        .from('businesses')
        .select('name, phone, whatsapp, location')
        .eq('id', orderData.business_id)
        .single()

      setBusiness(businessData)
      setLoading(false)
    }

    load()
  }, [params])

  // Get status info
  const getStatusInfo = (status) => {
    const map = {
      'Order placed': { label: 'Order Placed', emoji: '📋', color: '#6B6255', bg: '#F0EDE8' },
      'Cutting': { label: 'Cutting', emoji: '✂️', color: '#B4881E', bg: '#F6E9C8' },
      'Sewing': { label: 'Sewing', emoji: '🧵', color: '#1E3A5F', bg: '#D6E0EB' },
      'Ready': { label: 'Ready for Pickup', emoji: '✅', color: '#4C7A5E', bg: '#DCEBE2' },
      'Delivered': { label: 'Delivered', emoji: '🎉', color: '#6B6255', bg: '#E8E0D5' },
    }
    return map[status] || { label: status || 'Order Placed', emoji: '📋', color: '#6B6255', bg: '#F0EDE8' }
  }

  const formatDate = (d) => {
    if (!d) return ''
    return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  }

  const formatPhone = (phone) => {
    if (!phone) return ''
    return phone.startsWith('0') ? '234' + phone.slice(1) : phone
  }

  if (loading) {
    return (
      <main style={{ minHeight: '100vh', background: '#F5EFE2', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
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
        <p style={{ color: '#6B6255', fontSize: '0.85rem', marginTop: '1rem' }}>Loading your order...</p>
      </main>
    )
  }

  if (error) {
    return (
      <main style={{ minHeight: '100vh', background: '#F5EFE2', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center' }}>
        <div style={{ maxWidth: '360px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🔍</div>
          <h1 style={{ color: '#1E3A5F', fontSize: '1.3rem', marginBottom: '0.5rem' }}>Order not found</h1>
          <p style={{ color: '#6B6255', fontSize: '0.95rem' }}>
            The tracking link you clicked may be invalid or expired. Please check with the business.
          </p>
        </div>
      </main>
    )
  }

  const status = getStatusInfo(order.current_status)
  const currentIndex = STAGES.indexOf(order.current_status)
  const balance = order.price - order.amount_paid

  return (
    <main style={{ minHeight: '100vh', background: '#F5EFE2', padding: '2rem 1.5rem' }}>
      <style>{`
        .card {
          background: #fff;
          border-radius: 16px;
          padding: 1.5rem;
          border: 1px solid #E8E0D5;
          max-width: 420px;
          margin: 0 auto;
          margin-bottom: 1rem;
          box-shadow: 0 4px 12px rgba(30,58,95,0.06);
        }
        .status-dot {
          display: flex;
          flex-direction: column;
          align-items: center;
          flex: 1;
          position: relative;
        }
        .status-dot .dot {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: 3px solid #E8E0D5;
          background: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.8rem;
          transition: all 0.3s ease;
          position: relative;
          z-index: 2;
        }
        .status-dot .dot.active {
          border-color: #C79A2B;
          background: #C79A2B;
          color: #fff;
        }
        .status-dot .dot.done {
          border-color: #4C7A5E;
          background: #4C7A5E;
          color: #fff;
        }
        .status-dot .label {
          font-size: 0.6rem;
          color: #6B6255;
          text-align: center;
          margin-top: 0.3rem;
          max-width: 50px;
        }
        .status-dot .label.active {
          color: #1E3A5F;
          font-weight: 600;
        }
        .timeline {
          display: flex;
          justify-content: space-between;
          position: relative;
          padding: 0.5rem 0;
          margin-bottom: 0.5rem;
        }
        .timeline::before {
          content: '';
          position: absolute;
          top: 16px;
          left: 10%;
          right: 10%;
          height: 2px;
          background: #E8E0D5;
          z-index: 1;
        }
        .timeline .line-done {
          position: absolute;
          top: 16px;
          left: 10%;
          height: 2px;
          background: #4C7A5E;
          z-index: 1;
          transition: width 0.5s ease;
        }
        .badge {
          display: inline-block;
          padding: 0.3rem 1rem;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 600;
          letter-spacing: 0.3px;
        }
        .row {
          display: flex;
          justify-content: space-between;
          padding: 0.3rem 0;
          border-bottom: 1px solid #F0EDE8;
        }
        .row:last-child {
          border-bottom: none;
        }
        .row .label {
          color: #6B6255;
          font-size: 0.85rem;
        }
        .row .value {
          font-weight: 600;
          color: #1E3A5F;
          font-size: 0.85rem;
          text-align: right;
        }
        .row .value.gold {
          color: #C79A2B;
        }
        .btn-whatsapp {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.6rem 1.2rem;
          border-radius: 8px;
          background: #25D366;
          color: #fff;
          text-decoration: none;
          font-weight: 600;
          font-size: 0.9rem;
          transition: transform 0.1s ease;
        }
        .btn-whatsapp:hover {
          transform: scale(1.02);
        }
        .btn-whatsapp:active {
          transform: scale(0.97);
        }
        .header {
          text-align: center;
          margin-bottom: 1.5rem;
        }
        .header .business-name {
          color: #1E3A5F;
          font-size: 1.1rem;
          font-weight: 700;
          margin: 0;
        }
        .header .business-name span {
          color: #C79A2B;
        }
        .header .tagline {
          color: #6B6255;
          font-size: 0.75rem;
          margin: 0.1rem 0 0;
          opacity: 0.7;
        }
        .order-status-badge {
          display: inline-block;
          padding: 0.25rem 1rem;
          border-radius: 20px;
          font-size: 0.8rem;
          font-weight: 600;
        }
        .balance-positive {
          color: #AE4A34;
          font-weight: 700;
        }
        .balance-zero {
          color: #4C7A5E;
          font-weight: 700;
        }
        .footer {
          text-align: center;
          color: #6B6255;
          font-size: 0.7rem;
          margin-top: 1.5rem;
          opacity: 0.6;
        }
      `}</style>

      {/* ===== HEADER ===== */}
      <div className="header">
        <h1 className="business-name">
          {business?.name || 'Business'} <span>✦</span>
        </h1>
        <p className="tagline">Track your order status</p>
      </div>

      {/* ===== ORDER CARD ===== */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <h2 style={{ color: '#1E3A5F', fontSize: '1.2rem', margin: 0, fontWeight: '700' }}>
            {order.title || 'Order'}
          </h2>
          <span
            className="order-status-badge"
            style={{ background: status.bg, color: status.color }}
          >
            {status.emoji} {status.label}
          </span>
        </div>

        <p style={{ color: '#6B6255', fontSize: '0.9rem', margin: '0 0 1.2rem' }}>
          {order.customers?.name || 'Customer'}
        </p>

        {/* ===== TIMELINE ===== */}
        <div className="timeline">
          <div
            className="line-done"
            style={{
              width: `${(currentIndex / (STAGES.length - 1)) * 80 + 10}%`,
              maxWidth: '80%',
            }}
          />
          {STAGES.map((stage, i) => {
            const isActive = i === currentIndex
            const isDone = i < currentIndex
            const stageInfo = getStatusInfo(stage)
            return (
              <div key={stage} className="status-dot">
                <div className={`dot ${isActive ? 'active' : ''} ${isDone ? 'done' : ''}`}>
                  {isActive ? stageInfo.emoji : isDone ? '✓' : i + 1}
                </div>
                <div className={`label ${isActive ? 'active' : ''}`}>
                  {stageInfo.label}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ===== DETAILS CARD ===== */}
      <div className="card">
        <div className="row">
          <span className="label">Order</span>
          <span className="value">{order.title || '—'}</span>
        </div>
        <div className="row">
          <span className="label">Status</span>
          <span className="value" style={{ color: status.color }}>{status.label}</span>
        </div>
        {order.due_date && (
          <div className="row">
            <span className="label">Expected by</span>
            <span className="value">{formatDate(order.due_date)}</span>
          </div>
        )}
        <div className="row">
          <span className="label">Total</span>
          <span className="value gold">₦{order.price.toLocaleString()}</span>
        </div>
        <div className="row">
          <span className="label">Paid</span>
          <span className="value gold">₦{order.amount_paid.toLocaleString()}</span>
        </div>
        <div className="row" style={{ borderBottom: 'none' }}>
          <span className="label">Balance</span>
          <span className={balance > 0 ? 'balance-positive' : 'balance-zero'}>
            {balance > 0 ? `₦${balance.toLocaleString()}` : '✅ Paid in full'}
          </span>
        </div>
      </div>

      {/* ===== CONTACT CARD ===== */}
      {(business?.whatsapp || business?.phone) && (
        <div className="card" style={{ textAlign: 'center' }}>
          <p style={{ color: '#6B6255', fontSize: '0.85rem', margin: '0 0 0.8rem' }}>
            Have questions? Contact the business
          </p>
          <a
            href={`https://wa.me/${formatPhone(business.whatsapp || business.phone)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-whatsapp"
          >
            💬 Message on WhatsApp
          </a>
          {business?.phone && (
            <p style={{ color: '#6B6255', fontSize: '0.75rem', marginTop: '0.5rem' }}>
              Or call: <a href={`tel:${business.phone}`} style={{ color: '#1E3A5F', fontWeight: '600', textDecoration: 'none' }}>{business.phone}</a>
            </p>
          )}
        </div>
      )}

      {/* ===== FOOTER ===== */}
      <div className="footer">
        Powered by <span style={{ fontWeight: '600', color: '#1E3A5F' }}>Cresoa</span>
        <span style={{ margin: '0 0.3rem' }}>·</span>
        Built for Nigerian businesses
      </div>
    </main>
  )
      }
