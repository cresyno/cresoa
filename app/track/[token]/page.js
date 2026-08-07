'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '../../../lib/supabaseClient'
import { Icon } from '../../../components/Icon'

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
  const [customer, setCustomer] = useState(null)
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
      try {
        // 1. Fetch the order by tracking token
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
        if (orderData.customers) setCustomer(orderData.customers)

        // 2. Fetch the business details
        const { data: businessData } = await supabase
          .from('businesses')
          .select('name, phone, whatsapp, location, sector, plan, tracking_primary_color, tracking_bg_color, tracking_logo_url, tracking_welcome_message, tracking_footer_message')
          .eq('id', orderData.business_id)
          .single()

        setBusiness(businessData)

        // 3. Detect industry
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
      } catch (err) {
        console.error('Load error:', err)
        setError(true)
        setLoading(false)
      }
    }

    load()
  }, [token])

  // ─── Status info with SVG icons ───
  const getStatusInfo = (status, industry) => {
    const map = {
      // Fashion
      'Order placed': { label: 'Order Placed', icon: 'file-text', color: '#6B6255', bg: '#F0EDE8' },
      'Cutting': { label: 'Cutting', icon: 'scissors', color: '#B4881E', bg: '#F6E9C8' },
      'Sewing': { label: 'Sewing', icon: 'sewing', color: '#1E3A5F', bg: '#D6E0EB' },
      'Ready': { label: 'Ready for Pickup', icon: 'check-circle', color: '#4C7A5E', bg: '#DCEBE2' },
      'Delivered': { label: 'Delivered', icon: 'package', color: '#6B6255', bg: '#E8E0D5' },
      // Repairs
      'Received': { label: 'Received', icon: 'inbox', color: '#6B6255', bg: '#F0EDE8' },
      'Diagnosing': { label: 'Diagnosing', icon: 'search', color: '#1E3A5F', bg: '#D6E0EB' },
      'Awaiting Parts': { label: 'Awaiting Parts', icon: 'clock', color: '#B4881E', bg: '#F6E9C8' },
      'Repairing': { label: 'Repairing', icon: 'tool', color: '#1E3A5F', bg: '#D6E0EB' },
      'Testing': { label: 'Testing', icon: 'flask', color: '#1E3A5F', bg: '#D6E0EB' },
      // Default
      'Processing': { label: 'Processing', icon: 'settings', color: '#6B6255', bg: '#F0EDE8' },
    }
    return map[status] || { label: status || 'Processing', icon: 'file-text', color: '#6B6255', bg: '#F0EDE8' }
  }

  const formatDate = (d) => {
    if (!d) return ''
    return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  }

  const formatPhone = (phone) => {
    if (!phone) return ''
    return phone.startsWith('0') ? '234' + phone.slice(1) : phone
  }

  // ─── Get icon component ───
  const getIcon = (name, size = 16, stroke = 'currentColor') => {
    return <Icon name={name} size={size} stroke={stroke} />
  }

  // Loading state
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#F8F6F2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '40px', height: '40px', border: '4px solid #E5E0D8', borderTop: '4px solid #0F2B4A', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div style={{ minHeight: '100vh', background: '#F8F6F2', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center' }}>
        <div style={{ background: '#fff', borderRadius: '16px', padding: '2rem', maxWidth: '400px', border: '1px solid #E5E0D8' }}>
          <Icon name="alert-triangle" size={48} stroke="#D9534F" />
          <h1 style={{ color: '#0F2B4A' }}>Order not found</h1>
          <p style={{ color: '#8A8A8A' }}>The tracking link may be invalid or expired.</p>
        </div>
      </div>
    )
  }

  // ─── Customisation settings ───
  const isProOrBeta = business?.plan === 'pro' || business?.plan === 'beta'
  const primaryColor = isProOrBeta && business?.tracking_primary_color ? business.tracking_primary_color : '#D4A52A'
  const bgColor = isProOrBeta && business?.tracking_bg_color ? business.tracking_bg_color : '#F8F6F2'
  const logoUrl = isProOrBeta ? business?.tracking_logo_url : null
  const welcomeMsg = isProOrBeta ? business?.tracking_welcome_message : null
  const footerMsg = isProOrBeta ? business?.tracking_footer_message : null

  const status = getStatusInfo(order.current_status, industry)
  const currentIndex = stages.indexOf(order.current_status)
  const balance = order.price - order.amount_paid
  const isRepairs = industry === 'repairs'
  const hasContact = business?.phone || business?.whatsapp
  const statusColor = status.color

  return (
    <div style={{ minHeight: '100vh', background: bgColor, padding: '1.2rem 1rem', fontFamily: "'Inter', system-ui, sans-serif" }}>
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
        .business-name span { color: ${primaryColor}; }
        .tagline { color: #8A8A8A; font-size: 0.75rem; margin: 0.2rem 0 0; }
        .business-contact { display: flex; justify-content: center; gap: 0.8rem; margin-top: 0.3rem; flex-wrap: wrap; }
        .business-contact a { color: #0F2B4A; font-size: 0.75rem; text-decoration: none; background: rgba(255,255,255,0.5); padding: 0.2rem 0.8rem; border-radius: 20px; border: 1px solid #E5E0D8; display: inline-flex; align-items: center; gap: 0.3rem; }
        .business-contact a:hover { background: #fff; }
        .business-location { color: #8A8A8A; font-size: 0.7rem; margin-top: 0.2rem; }
        .order-title { color: #0F2B4A; font-size: 1.2rem; font-weight: 700; margin: 0; }
        .order-customer { color: #8A8A8A; font-size: 0.9rem; margin: 0.2rem 0 1rem; }
        .status-badge { display: inline-block; padding: 0.2rem 0.8rem; border-radius: 20px; font-size: 0.8rem; font-weight: 600; background: ${status.bg}; color: ${statusColor}; }
        .timeline { display: flex; justify-content: space-between; position: relative; padding: 0.5rem 0; margin: 0.5rem 0 1rem; }
        .timeline::before { content: ''; position: absolute; top: 16px; left: 5%; right: 5%; height: 2px; background: #E5E0D8; z-index: 0; }
        .timeline .line-done { position: absolute; top: 16px; left: 5%; height: 2px; background: #2E7D5E; z-index: 0; transition: width 0.5s ease; }
        .status-dot { display: flex; flex-direction: column; align-items: center; flex: 1; position: relative; z-index: 1; }
        .status-dot .dot { width: 32px; height: 32px; border-radius: 50%; border: 3px solid #E5E0D8; background: #fff; display: flex; align-items: center; justify-content: center; font-size: 0.8rem; transition: all 0.3s ease; }
        .status-dot .dot.active { border-color: ${primaryColor}; background: ${primaryColor}; color: #0F2B4A; }
        .status-dot .dot.done { border-color: #2E7D5E; background: #2E7D5E; color: #fff; }
        .status-dot .label { font-size: 0.55rem; color: #8A8A8A; text-align: center; margin-top: 0.3rem; max-width: 50px; line-height: 1.2; }
        .status-dot .label.active { color: #0F2B4A; font-weight: 600; }
        .detail-row { display: flex; justify-content: space-between; padding: 0.4rem 0; border-bottom: 1px solid #F0EDE8; }
        .detail-row:last-child { border-bottom: none; }
        .detail-label { color: #8A8A8A; font-size: 0.85rem; }
        .detail-value { font-weight: 600; color: #0F2B4A; font-size: 0.85rem; text-align: right; }
        .detail-value.gold { color: ${primaryColor}; }
        .detail-value.positive { color: #D9534F; }
        .detail-value.zero { color: #2E7D5E; }
        .btn-whatsapp { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.6rem 1.2rem; border-radius: 8px; background: #25D366; color: #fff; text-decoration: none; font-weight: 600; font-size: 0.9rem; transition: transform 0.1s ease; border: none; cursor: pointer; }
        .btn-whatsapp:hover { transform: scale(1.02); }
        .btn-whatsapp:active { transform: scale(0.97); }
        .footer { text-align: center; color: #C8C0B5; font-size: 0.7rem; padding-top: 1rem; }
        .footer strong { color: #0F2B4A; }
        @media (max-width: 480px) {
          .glass { padding: 1rem; }
          .status-dot .dot { width: 28px; height: 28px; font-size: 0.7rem; }
          .status-dot .label { font-size: 0.5rem; max-width: 40px; }
          .timeline .line-done { top: 14px; }
          .timeline::before { top: 14px; }
          .business-contact a { font-size: 0.65rem; padding: 0.15rem 0.6rem; }
        }
      `}</style>

      {/* ─── HEADER ─── */}
      <div className="glass glass-header">
        {logoUrl && (
          <img src={logoUrl} alt="Business logo" style={{ maxHeight: '60px', marginBottom: '0.5rem' }} />
        )}
        <h1 className="business-name">
          {business?.name || 'Business'} <span>✦</span>
        </h1>
        <p className="tagline">
          {welcomeMsg || `Track your ${isRepairs ? 'repair' : 'order'} status`}
        </p>
        {hasContact && (
          <div className="business-contact">
            {business.phone && (
              <a href={`tel:${business.phone}`}>
                <Icon name="phone" size={12} stroke="#0F2B4A" /> Call {business.phone}
              </a>
            )}
            {business.whatsapp && (
              <a href={`https://wa.me/${formatPhone(business.whatsapp)}`} target="_blank" rel="noopener noreferrer">
                <Icon name="message-circle" size={12} stroke="#0F2B4A" /> WhatsApp
              </a>
            )}
          </div>
        )}
        {business?.location && (
          <div className="business-location">
            <Icon name="map-pin" size={12} stroke="#8A8A8A" style={{ verticalAlign: 'middle' }} /> {business.location}
          </div>
        )}
      </div>

      {/* ─── ORDER CARD ─── */}
      <div className="glass">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.3rem' }}>
          <div>
            <h2 className="order-title">{order.title || 'Order'}</h2>
            <p className="order-customer">{customer?.name || 'Customer'}</p>
          </div>
          <span className="status-badge" style={{ background: status.bg, color: status.color }}>
            <Icon name={status.icon} size={12} stroke={status.color} style={{ verticalAlign: 'middle', marginRight: '0.2rem' }} />
            {status.label}
          </span>
        </div>

        {isRepairs && order.device_type && (
          <div style={{ background: 'rgba(255,255,255,0.3)', borderRadius: '8px', padding: '0.4rem 0.8rem', marginTop: '0.2rem', fontSize: '0.85rem', color: '#0F2B4A', display: 'inline-block' }}>
            <Icon name="smartphone" size={12} stroke="#0F2B4A" style={{ verticalAlign: 'middle' }} /> {order.device_type} {order.device_model || ''}
            {order.serial_number && ` · SN: ${order.serial_number}`}
          </div>
        )}

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
                  {isActive ? (
                    <Icon name={info.icon} size={14} stroke={isActive ? '#0F2B4A' : '#fff'} />
                  ) : isDone ? (
                    <Icon name="check" size={14} stroke="#fff" />
                  ) : (
                    i + 1
                  )}
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
        {isRepairs && order.device_type && (
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
            {balance > 0 ? `₦${balance.toLocaleString()}` : (
              <><Icon name="check" size={12} stroke="#2E7D5E" /> Paid in full</>
            )}
          </span>
        </div>
      </div>

      {/* ─── CONTACT ─── */}
      {business?.whatsapp && (
        <div className="glass" style={{ textAlign: 'center' }}>
          <p style={{ color: '#8A8A8A', fontSize: '0.85rem', margin: '0 0 0.8rem' }}>
            Have questions? Contact the business
          </p>
          <a
            href={`https://wa.me/${formatPhone(business.whatsapp)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-whatsapp"
          >
            <Icon name="message-circle" size={16} stroke="#fff" /> Message on WhatsApp
          </a>
        </div>
      )}

      {/* ─── CUSTOM FOOTER MESSAGE ─── */}
      {footerMsg && (
        <div className="glass" style={{ textAlign: 'center', padding: '1rem' }}>
          <p style={{ color: '#8A8A8A', fontSize: '0.8rem', margin: 0 }}>{footerMsg}</p>
        </div>
      )}

      {/* ─── POWERED BY ─── */}
      <div className="footer">
        Powered by <a href="/" style={{ color: '#0F2B4A', fontWeight: '600', textDecoration: 'none' }}>Cresoa</a> · Built for Nigerian businesses
      </div>
    </div>
  )
      }
