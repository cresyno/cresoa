'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '../../../lib/supabaseClient'
import { useWorkflowStages } from '../../../lib/useWorkflowStages' // ✅ Imported
import { Icon } from '../../../components/Icon'
import '../../globals.css'

// Stage definitions per industry (DEFAULT fallbacks only)
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

  // ─── DYNAMIC WORKFLOW STAGES HOOK ───
  // Gets the business ID from the loaded business, and passes the industry default as fallback
  const fallbackStages = STAGES_BY_INDUSTRY[industry] || STAGES_BY_INDUSTRY.default
  const { stages: dynamicStages } = useWorkflowStages(business?.id, fallbackStages)

  useEffect(() => {
    if (!token) { setError(true); setLoading(false); return }

    const load = async () => {
      try {
        const { data: orderData, error: orderError } = await supabase
          .from('orders')
          .select('*, customers(name, phone)')
          .eq('tracking_token', token)
          .single()

        if (orderError || !orderData) {
          console.error('Order error:', orderError)
          setError(true); setLoading(false); return
        }

        setOrder(orderData)
        if (orderData.customers) setCustomer(orderData.customers)

        const { data: businessData } = await supabase
          .from('businesses')
          .select('name, phone, whatsapp, location, sector, plan, tracking_primary_color, tracking_bg_color, tracking_logo_url, tracking_welcome_message, tracking_footer_message')
          .eq('id', orderData.business_id)
          .single()

        setBusiness(businessData)

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
        setLoading(false)
      } catch (err) {
        console.error('Load error:', err)
        setError(true); setLoading(false)
      }
    }

    load()
  }, [token])

  // ─── Status info ───
  const getStatusInfo = (status, industry) => {
    const map = {
      'Order placed': { label: 'Order Placed', icon: 'file-text', color: 'var(--cresoa-text-muted)', bg: 'var(--cresoa-surface-soft)' },
      'Cutting': { label: 'Cutting', icon: 'scissors', color: 'var(--cresoa-warning)', bg: 'var(--cresoa-warning-soft)' },
      'Sewing': { label: 'Sewing', icon: 'edit-2', color: 'var(--cresoa-info)', bg: 'var(--cresoa-info-soft)' },
      'Ready': { label: 'Ready for Pickup', icon: 'check-circle', color: 'var(--cresoa-success)', bg: 'var(--cresoa-success-soft)' },
      'Delivered': { label: 'Delivered', icon: 'package', color: 'var(--cresoa-text-muted)', bg: 'var(--cresoa-surface-soft)' },
      'Received': { label: 'Received', icon: 'inbox', color: 'var(--cresoa-text-muted)', bg: 'var(--cresoa-surface-soft)' },
      'Diagnosing': { label: 'Diagnosing', icon: 'search', color: 'var(--cresoa-info)', bg: 'var(--cresoa-info-soft)' },
      'Awaiting Parts': { label: 'Awaiting Parts', icon: 'clock', color: 'var(--cresoa-warning)', bg: 'var(--cresoa-warning-soft)' },
      'Repairing': { label: 'Repairing', icon: 'tool', color: 'var(--cresoa-info)', bg: 'var(--cresoa-info-soft)' },
      'Testing': { label: 'Testing', icon: 'check-circle', color: 'var(--cresoa-info)', bg: 'var(--cresoa-info-soft)' },
      'Processing': { label: 'Processing', icon: 'settings', color: 'var(--cresoa-text-muted)', bg: 'var(--cresoa-surface-soft)' },
    }
    return map[status] || { label: status || 'Processing', icon: 'file-text', color: 'var(--cresoa-text-muted)', bg: 'var(--cresoa-surface-soft)' }
  }

  const formatDate = (d) => {
    if (!d) return ''
    return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  }

  const formatPhone = (phone) => {
    if (!phone) return ''
    return phone.startsWith('0') ? '234' + phone.slice(1) : phone
  }

  // ─── Share link ───
  const [copied, setCopied] = useState(false)

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch (_) {
      alert('Copy the URL from your browser address bar.')
    }
  }

  // ─── Customisation settings ───
  const isProOrBeta = business?.plan === 'pro' || business?.plan === 'beta'
  const primaryColor = isProOrBeta && business?.tracking_primary_color ? business.tracking_primary_color : 'var(--cresoa-accent)'
  const bgColor = isProOrBeta && business?.tracking_bg_color ? business.tracking_bg_color : 'var(--cresoa-bg)'
  const logoUrl = isProOrBeta ? business?.tracking_logo_url : null
  const welcomeMsg = isProOrBeta ? business?.tracking_welcome_message : null
  const footerMsg = isProOrBeta ? business?.tracking_footer_message : null

  // ─── DERIVE STAGES (Use dynamic custom stages or fallback) ───
  const currentStages = dynamicStages.length > 0 ? dynamicStages : fallbackStages
  const status = getStatusInfo(order?.current_status, industry)
  const currentIndex = currentStages.indexOf(order?.current_status)
  const balance = (order?.price || 0) - (order?.amount_paid || 0)
  const isRepairs = industry === 'repairs'
  const hasContact = business?.phone || business?.whatsapp

  // ─── Loading state ───
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--cresoa-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '40px', height: '40px', border: '4px solid var(--cresoa-border)', borderTop: '4px solid var(--cresoa-accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--cresoa-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center' }}>
        <div style={{ background: 'var(--cresoa-surface)', borderRadius: '16px', padding: '2rem', maxWidth: '400px', border: '1px solid var(--cresoa-border)' }}>
          <Icon name="alert-triangle" size={48} stroke="var(--cresoa-danger)" />
          <h1 style={{ color: 'var(--cresoa-text)' }}>Order not found</h1>
          <p style={{ color: 'var(--cresoa-text-muted)' }}>The tracking link may be invalid or expired.</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: bgColor, padding: '1rem', fontFamily: "'Inter', system-ui, sans-serif" }}>
      <style>{`
        .track-container { max-width: 480px; margin: 0 auto; }
        .track-card { background: var(--cresoa-surface); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); border: 1px solid var(--cresoa-border); border-radius: 16px; box-shadow: var(--shadow-md); padding: 1.5rem; margin-bottom: 1rem; }
        .track-card-header { text-align: center; border-bottom: 1px solid var(--cresoa-border); padding-bottom: 0.8rem; }
        .business-name { color: var(--cresoa-text); font-size: 1.2rem; font-weight: 700; margin: 0; }
        .business-name span { color: ${primaryColor}; }
        .tagline { color: var(--cresoa-text-muted); font-size: 0.75rem; margin: 0.2rem 0 0; }
        .business-contact { display: flex; justify-content: center; gap: 0.8rem; margin-top: 0.3rem; flex-wrap: wrap; }
        .business-contact a { color: var(--cresoa-text); font-size: 0.75rem; text-decoration: none; background: var(--cresoa-surface-soft); padding: 0.2rem 0.8rem; border-radius: 20px; border: 1px solid var(--cresoa-border); display: inline-flex; align-items: center; gap: 0.3rem; }
        .business-contact a:hover { background: var(--cresoa-surface); }
        .business-location { color: var(--cresoa-text-muted); font-size: 0.7rem; margin-top: 0.2rem; }
        .order-title { color: var(--cresoa-text); font-size: 1.2rem; font-weight: 700; margin: 0; }
        .order-customer { color: var(--cresoa-text-muted); font-size: 0.9rem; margin: 0.2rem 0 1rem; }
        .status-badge { display: inline-block; padding: 0.2rem 0.8rem; border-radius: 20px; font-size: 0.8rem; font-weight: 600; background: ${status.bg}; color: ${status.color}; }
        .status-badge svg { vertical-align: middle; margin-right: 0.2rem; }
        .stepper-wrapper { position: relative; padding: 0.5rem 0; margin: 0.5rem 0 1rem; }
        .stepper-line { position: absolute; top: 16px; left: 5%; right: 5%; height: 2px; background: var(--cresoa-border); z-index: 0; }
        .stepper-line-fill { position: absolute; top: 16px; left: 5%; height: 2px; background: ${primaryColor}; z-index: 0; transition: width 0.6s ease; }
        .stepper { display: flex; justify-content: space-between; position: relative; z-index: 1; }
        .stepper-item { display: flex; flex-direction: column; align-items: center; flex: 1; }
        .stepper-dot { width: 32px; height: 32px; border-radius: 50%; border: 3px solid var(--cresoa-border); background: var(--cresoa-surface); display: flex; align-items: center; justify-content: center; font-size: 0.8rem; transition: all 0.3s ease; }
        .stepper-dot.active { border-color: ${primaryColor}; background: ${primaryColor}; color: #0F2B4A; }
        .stepper-dot.done { border-color: var(--cresoa-success); background: var(--cresoa-success); color: #fff; }
        .stepper-dot.done svg { stroke: #fff; }
        .stepper-label { font-size: 0.55rem; color: var(--cresoa-text-muted); text-align: center; margin-top: 0.3rem; max-width: 60px; line-height: 1.2; }
        .stepper-label.active { color: var(--cresoa-text); font-weight: 600; }
        .detail-row { display: flex; justify-content: space-between; padding: 0.4rem 0; border-bottom: 1px solid var(--cresoa-border); }
        .detail-row:last-child { border-bottom: none; }
        .detail-label { color: var(--cresoa-text-muted); font-size: 0.85rem; }
        .detail-value { font-weight: 600; color: var(--cresoa-text); font-size: 0.85rem; text-align: right; }
        .detail-value.gold { color: ${primaryColor}; }
        .detail-value.positive { color: var(--cresoa-danger); }
        .detail-value.zero { color: var(--cresoa-success); }
        .btn-whatsapp { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.6rem 1.2rem; border-radius: 8px; background: #25D366; color: #fff; text-decoration: none; font-weight: 600; font-size: 0.9rem; transition: transform 0.1s ease; border: none; cursor: pointer; }
        .btn-whatsapp:hover { transform: scale(1.02); }
        .btn-call { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.6rem 1.2rem; border-radius: 8px; background: var(--cresoa-primary); color: #fff; text-decoration: none; font-weight: 600; font-size: 0.9rem; transition: transform 0.1s ease; border: none; cursor: pointer; }
        .btn-call:hover { transform: scale(1.02); }
        .share-link { display: inline-flex; align-items: center; gap: 0.3rem; background: transparent; border: none; color: var(--cresoa-text); font-size: 0.8rem; cursor: pointer; padding: 0.2rem 0.4rem; }
        .share-link:hover { text-decoration: underline; }
        .footer { text-align: center; color: var(--cresoa-text-muted); font-size: 0.7rem; padding-top: 0.5rem; }
        .footer strong { color: var(--cresoa-text); }
        @media (max-width: 480px) {
          .track-card { padding: 1rem; }
          .stepper-dot { width: 28px; height: 28px; font-size: 0.7rem; }
          .stepper-label { font-size: 0.5rem; max-width: 40px; }
          .stepper-line, .stepper-line-fill { top: 14px; }
          .business-contact a { font-size: 0.65rem; padding: 0.15rem 0.6rem; }
        }
      `}</style>

      <div className="track-container">

        {/* ─── HEADER ─── */}
        <div className="track-card track-card-header">
          {logoUrl && <img src={logoUrl} alt="Business logo" style={{ maxHeight: '60px', marginBottom: '0.5rem' }} />}
          <h1 className="business-name">{business?.name || 'Business'} <span>✦</span></h1>
          <p className="tagline">{welcomeMsg || `Track your ${isRepairs ? 'repair' : 'order'} status`}</p>
          {hasContact && (
            <div className="business-contact">
              {business.phone && (<a href={`tel:${business.phone}`}><Icon name="phone" size={12} stroke="currentColor" /> Call {business.phone}</a>)}
              {business.whatsapp && (<a href={`https://wa.me/${formatPhone(business.whatsapp)}`} target="_blank" rel="noopener noreferrer"><Icon name="message-circle" size={12} stroke="currentColor" /> WhatsApp</a>)}
            </div>
          )}
          {business?.location && (
            <div className="business-location"><Icon name="map-pin" size={12} stroke="var(--cresoa-text-muted)" style={{ verticalAlign: 'middle' }} /> {business.location}</div>
          )}
        </div>

        {/* ─── ORDER SUMMARY ─── */}
        <div className="track-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.3rem' }}>
            <div>
              <h2 className="order-title">{order.title || 'Order'}</h2>
              <p className="order-customer">{customer?.name || 'Customer'}</p>
            </div>
            <span className="status-badge"><Icon name={status.icon} size={14} stroke={status.color} /> {status.label}</span>
          </div>

          {isRepairs && order.device_type && (
            <div style={{ background: 'var(--cresoa-surface-soft)', borderRadius: '8px', padding: '0.4rem 0.8rem', marginTop: '0.2rem', fontSize: '0.85rem', color: 'var(--cresoa-text)' }}>
              <Icon name="smartphone" size={12} stroke="var(--cresoa-text)" style={{ verticalAlign: 'middle' }} /> {order.device_type} {order.device_model || ''}
              {order.serial_number && ` · SN: ${order.serial_number}`}
            </div>
          )}

          {order.due_date && (
            <p style={{ margin: '0.3rem 0 0', color: 'var(--cresoa-text-muted)', fontSize: '0.85rem' }}>
              Expected by <strong style={{ color: 'var(--cresoa-text)' }}>{formatDate(order.due_date)}</strong>
            </p>
          )}
        </div>

        {/* ─── STEPPER (Uses Dynamic Workflow Stages) ─── */}
        <div className="track-card">
          <div className="stepper-wrapper">
            <div className="stepper-line-fill" style={{ width: `${(currentIndex / (currentStages.length - 1)) * 90 + 5}%`, maxWidth: '90%' }} />
            <div className="stepper">
              {currentStages.map((stage, i) => {
                const isActive = i === currentIndex
                const isDone = i < currentIndex
                const info = getStatusInfo(stage, industry)
                return (
                  <div key={stage} className="stepper-item">
                    <div className={`stepper-dot ${isActive ? 'active' : ''} ${isDone ? 'done' : ''}`}>
                      {isActive ? (<Icon name={info.icon} size={14} stroke="#0F2B4A" />) : isDone ? (<Icon name="check" size={14} stroke="#fff" />) : (i + 1)}
                    </div>
                    <div className={`stepper-label ${isActive ? 'active' : ''}`}>{info.label}</div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* ─── ORDER DETAILS ─── */}
        <div className="track-card">
          <div className="detail-row"><span className="detail-label">Order</span><span className="detail-value">{order.title || '—'}</span></div>
          <div className="detail-row"><span className="detail-label">Status</span><span className="detail-value" style={{ color: status.color }}>{status.label}</span></div>
          {order.due_date && (<div className="detail-row"><span className="detail-label">Expected by</span><span className="detail-value">{formatDate(order.due_date)}</span></div>)}
          <div className="detail-row"><span className="detail-label">Total</span><span className="detail-value gold">₦{order.price.toLocaleString()}</span></div>
          <div className="detail-row"><span className="detail-label">Paid</span><span className="detail-value gold">₦{order.amount_paid.toLocaleString()}</span></div>
          <div className="detail-row"><span className="detail-label">Balance</span><span className={`detail-value ${balance > 0 ? 'positive' : 'zero'}`}>{balance > 0 ? `₦${balance.toLocaleString()}` : (<><Icon name="check" size={12} stroke="var(--cresoa-success)" /> Paid in full</>)}</span></div>
        </div>

        {/* ─── SHARE LINK ─── */}
        <div className="track-card" style={{ textAlign: 'center' }}>
          <button onClick={copyLink} className="share-link"><Icon name={copied ? 'check' : 'link'} size={16} stroke="var(--cresoa-text)" /> {copied ? 'Link copied!' : 'Share this tracking link'}</button>
        </div>

        {/* ─── SUPPORT ACTIONS ─── */}
        {business?.whatsapp && (
          <div className="track-card" style={{ textAlign: 'center' }}>
            <p style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.85rem', margin: '0 0 0.8rem' }}>Have questions? Contact the business</p>
            <div style={{ display: 'flex', gap: '0.8rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              {business.phone && (<a href={`tel:${business.phone}`} className="btn-call"><Icon name="phone" size={16} stroke="#fff" /> Call</a>)}
              {business.whatsapp && (<a href={`https://wa.me/${formatPhone(business.whatsapp)}`} target="_blank" rel="noopener noreferrer" className="btn-whatsapp"><Icon name="message-circle" size={16} stroke="#fff" /> WhatsApp</a>)}
            </div>
          </div>
        )}

        {/* ─── CUSTOM FOOTER ─── */}
        {footerMsg && (
          <div className="track-card" style={{ textAlign: 'center', padding: '1rem' }}>
            <p style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.8rem', margin: 0 }}>{footerMsg}</p>
          </div>
        )}

        {/* ─── POWERED BY ─── */}
        <div className="footer">Powered by <a href="/" style={{ color: 'var(--cresoa-text)', fontWeight: '600', textDecoration: 'none' }}>Cresoa</a> · Built for Nigerian businesses</div>

      </div>
    </div>
  )
    }
