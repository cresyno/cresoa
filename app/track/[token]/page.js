'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '../../../lib/supabaseClient'

// Stage definitions per industry
const STAGES_BY_INDUSTRY = {
  fashion: ['Order placed', 'Cutting', 'Sewing', 'Ready', 'Delivered'],
  repairs: ['Received', 'Diagnosing', 'Awaiting Parts', 'Repairing', 'Testing', 'Ready', 'Delivered'],
  default: ['Order placed', 'Processing', 'Ready', 'Delivered'],
}

export default function TrackPage() {
  const params = useParams()
  const token = params?.token

  const [order, setOrder] = useState(null)
  const [business, setBusiness] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [industry, setIndustry] = useState('default')
  const [stages, setStages] = useState(STAGES_BY_INDUSTRY.default)

  useEffect(() => {
    if (!token) {
      setError(true)
      setLoading(false)
      return
    }

    const load = async () => {
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('*, customers(name, phone)')
        .eq('tracking_token', token)
        .single()

      if (orderError || !orderData) {
        console.error('Order error:', orderError)
        setError(true)
        setLoading(false)
        return
      }

      setOrder(orderData)

      // Fetch business info and determine industry
      const { data: businessData } = await supabase
        .from('businesses')
        .select('name, phone, whatsapp, location, sector')
        .eq('id', orderData.business_id)
        .single()

      setBusiness(businessData)

      // Determine industry
      let detectedIndustry = 'default'
      if (businessData) {
        const sector = businessData.sector || ''
        if (sector.toLowerCase().includes('fashion') || sector.toLowerCase().includes('wear')) {
          detectedIndustry = 'fashion'
        } else if (sector.toLowerCase().includes('repair') || sector.toLowerCase().includes('technical')) {
          detectedIndustry = 'repairs'
        }
      }
      setIndustry(detectedIndustry)
      setStages(STAGES_BY_INDUSTRY[detectedIndustry] || STAGES_BY_INDUSTRY.default)

      setLoading(false)
    }

    load()
  }, [token])

  // Helper: get status info with emoji and colour
  const getStatusInfo = (status, industry) => {
    const map = {
      // Fashion
      'Order placed': { label: 'Order Placed', emoji: '📋', color: '#6B6255', bg: '#F0EDE8' },
      'Cutting': { label: 'Cutting', emoji: '✂️', color: '#B4881E', bg: '#F6E9C8' },
      'Sewing': { label: 'Sewing', emoji: '🧵', color: '#1E3A5F', bg: '#D6E0EB' },
      'Ready': { label: 'Ready for Pickup', emoji: '✅', color: '#4C7A5E', bg: '#DCEBE2' },
      'Delivered': { label: 'Delivered', emoji: '🎉', color: '#6B6255', bg: '#E8E0D5' },
      // Repairs
      'Received': { label: 'Received', emoji: '📥', color: '#6B6255', bg: '#F0EDE8' },
      'Diagnosing': { label: 'Diagnosing', emoji: '🔍', color: '#1E3A5F', bg: '#D6E0EB' },
      'Awaiting Parts': { label: 'Awaiting Parts', emoji: '⏳', color: '#B4881E', bg: '#F6E9C8' },
      'Repairing': { label: 'Repairing', emoji: '🔧', color: '#1E3A5F', bg: '#D6E0EB' },
      'Testing': { label: 'Testing', emoji: '🧪', color: '#1E3A5F', bg: '#D6E0EB' },
      // Default
      'Processing': { label: 'Processing', emoji: '⚙️', color: '#6B6255', bg: '#F0EDE8' },
    }
    return map[status] || { label: status || 'Processing', emoji: '📌', color: '#6B6255', bg: '#F0EDE8' }
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
      <div style={{ minHeight: '100vh', background: '#F8F6F2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '40px', height: '40px', border: '4px solid #E5E0D8', borderTop: '4px solid #0F2B4A', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', background: '#F8F6F2', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center' }}>
        <div style={{ background: '#fff', borderRadius: '16px', padding: '2rem', maxWidth: '400px', border: '1px solid #E5E0D8' }}>
          <div style={{ fontSize: '3rem' }}>🔍</div>
          <h1 style={{ color: '#0F2B4A' }}>Order not found</h1>
          <p style={{ color: '#8A8A8A' }}>The tracking link may be invalid or expired.</p>
        </div>
      </div>
    )
  }

  // Prepare data for rendering
  const status = getStatusInfo(order.current_status, industry)
  const currentIndex = stages.indexOf(order.current_status)
  const balance = order.price - order.amount_paid
  const isRepairs = industry === 'repairs'

  // We'll now render the UI in part 2
  return (
    <div style={{ minHeight: '100vh', background: '#F8F6F2', padding: '1.2rem 1rem', fontFamily: "'Inter', system-ui, sans-serif" }}>
      <style>{`
        .glass {
          background: rgba(255,255,255,0.7);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255,255,255,0.3);
          border-radius: 16px;
          box-shadow: 0 4px 16px rgba(15,43,74,0.06);
          padding: 1.5rem;
          max-width: 480px;
          margin: 0 auto 1rem;
        }
        .glass-header {
          text-align: center;
          border-bottom: 1px solid #E5E0D8;
          padding-bottom: 0.8rem;
        }
        .business-name {
          color: #0F2B4A;
          font-size: 1.2rem;
          font-weight: 700;
          margin: 0;
        }
        .business-name span { color: #D4A52A; }
        .tagline {
          color: #8A8A8A;
          font-size: 0.75rem;
          margin: 0.2rem 0 0;
        }
        .order-title {
          color: #0F2B4A;
          font-size: 1.2rem;
          font-weight: 700;
          margin: 0;
        }
        .order-customer {
          color: #8A8A8A;
          font-size: 0.9rem;
          margin: 0.2rem 0 1rem;
        }
        .status-badge {
          display: inline-block;
          padding: 0.2rem 0.8rem;
          border-radius: 20px;
          font-size: 0.8rem;
          font-weight: 600;
        }
        .timeline {
          display: flex;
          justify-content: space-between;
          position: relative;
          padding: 0.5rem 0;
          margin: 0.5rem 0 1rem;
        }
        .timeline::before {
          content: '';
          position: absolute;
          top: 16px;
          left: 5%;
          right: 5%;
          height: 2px;
          background: #E5E0D8;
          z-index: 0;
        }
        .timeline .line-done {
          position: absolute;
          top: 16px;
          left: 5%;
          height: 2px;
          background: #2E7D5E;
          z-index: 0;
          transition: width 0.5s ease;
        }
        .status-dot {
          display: flex;
          flex-direction: column;
          align-items: center;
          flex: 1;
          position: relative;
          z-index: 1;
        }
        .status-dot .dot {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: 3px solid #E5E0D8;
          background: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.8rem;
          transition: all 0.3s ease;
        }
        .status-dot .dot.active {
          border-color: #D4A52A;
          background: #D4A52A;
          color: #0F2B4A;
        }
        .status-dot .dot.done {
          border-color: #2E7D5E;
          background: #2E7D5E;
          color: #fff;
        }
        .status-dot .label {
          font-size: 0.55rem;
          color: #8A8A8A;
          text-align: center;
          margin-top: 0.3rem;
          max-width: 50px;
          line-height: 1.2;
        }
        .status-dot .label.active {
          color: #0F2B4A;
          font-weight: 600;
        }
        .detail-row {
          display: flex;
          justify-content: space-between;
          padding: 0.4rem 0;
          border-bottom: 1px solid #F0EDE8;
        }
        .detail-row:last-child { border-bottom: none; }
        .detail-label { color: #8A8A8A; font-size: 0.85rem; }
        .detail-value { font-weight: 600; color: #0F2B4A; font-size: 0.85rem; text-align: right; }
        .detail-value.gold { color: #D4A52A; }
        .detail-value.positive { color: #D9534F; }
        .detail-value.zero { color: #2E7D5E; }
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
          border: none;
          cursor: pointer;
        }
        .btn-whatsapp:hover { transform: scale(1.02); }
        .btn-whatsapp:active { transform: scale(0.97); }
        .footer {
          text-align: center;
          color: #C8C0B5;
          font-size: 0.7rem;
          padding-top: 1rem;
        }
        .footer strong { color: #0F2B4A; }
        @media (max-width: 480px) {
          .glass { padding: 1rem; }
          .status-dot .dot { width: 28px; height: 28px; font-size: 0.7rem; }
          .status-dot .label { font-size: 0.5rem; max-width: 40px; }
          .timeline .line-done { top: 14px; }
          .timeline::before { top: 14px; }
        }
      `}</style>

      {/* ─── HEADER ─── */}
      <div className="glass glass-header">
        <h1 className="business-name">
          {business?.name || 'Business'} <span>✦</span>
        </h1>
        <p className="tagline">Track your {isRepairs ? 'repair' : 'order'} status</p>
      </div>

      {/* ─── ORDER CARD ─── */}
      <div className="glass">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.3rem' }}>
          <div>
            <h2 className="order-title">{order.title || 'Order'}</h2>
            <p className="order-customer">{order.customers?.name || 'Customer'}</p>
          </div>
          <span className="status-badge" style={{ background: status.bg, color: status.color }}>
            {status.emoji} {status.label}
          </span>
        </div>

        {/* Timeline */}
        <div className="timeline">
          <div
            className="line-done"
            style={{
              width: `${(currentIndex / (stages.length - 1)) * 90 + 5}%`,
              maxWidth: '90%',
            }}
          />
          {stages.map((stage, i) => {
            const isActive = i === currentIndex
            const isDone = i < currentIndex
            const info = getStatusInfo(stage, industry)
            return (
              <div key={stage} className="status-dot">
                <div className={`dot ${isActive ? 'active' : ''} ${isDone ? 'done' : ''}`}>
                  {isActive ? info.emoji : isDone ? '✓' : i + 1}
                </div>
                <div className={`label ${isActive ? 'active' : ''}`}>
                  {info.label}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ─── DETAILS ─── */}
      <div className="glass">
        <div className="detail-row">
          <span className="detail-label">Order</span>
          <span className="detail-value">{order.title || '—'}</span>
        </div>
        <div className="detail-row">
          <span className="detail-label">Status</span>
          <span className="detail-value" style={{ color: status.color }}>{status.label}</span>
        </div>
        {order.due_date && (
          <div className="detail-row">
            <span className="detail-label">Expected by</span>
            <span className="detail-value">{formatDate(order.due_date)}</span>
          </div>
        )}
        {order.device_type && (
          <div className="detail-row">
            <span className="detail-label">Device</span>
            <span className="detail-value">{order.device_type} {order.device_model || ''}</span>
          </div>
        )}
        <div className="detail-row">
          <span className="detail-label">Total</span>
          <span className="detail-value gold">₦{order.price.toLocaleString()}</span>
        </div>
        <div className="detail-row">
          <span className="detail-label">Paid</span>
          <span className="detail-value gold">₦{order.amount_paid.toLocaleString()}</span>
        </div>
        <div className="detail-row">
          <span className="detail-label">Balance</span>
          <span className={`detail-value ${balance > 0 ? 'positive' : 'zero'}`}>
            {balance > 0 ? `₦${balance.toLocaleString()}` : '✅ Paid in full'}
          </span>
        </div>
      </div>

      {/* ─── CONTACT ─── */}
      {(business?.whatsapp || business?.phone) && (
        <div className="glass" style={{ textAlign: 'center' }}>
          <p style={{ color: '#8A8A8A', fontSize: '0.85rem', margin: '0 0 0.8rem' }}>
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
            <p style={{ color: '#8A8A8A', fontSize: '0.75rem', marginTop: '0.5rem' }}>
              Or call: <a href={`tel:${business.phone}`} style={{ color: '#0F2B4A', fontWeight: '600', textDecoration: 'none' }}>{business.phone}</a>
            </p>
          )}
        </div>
      )}

      {/* ─── FOOTER ─── */}
      <div className="footer">
        Powered by <strong>Cresoa</strong> · Built for Nigerian businesses
      </div>
    </div>
  )
                  }
