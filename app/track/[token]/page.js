'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { useWorkflowStages } from '../../../lib/useWorkflowStages'
import { Icon } from '../../../components/Icon'
import '../../globals.css'

// Default stages per industry (only used if no custom stages exist)
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

  // Dark/Light mode toggle
  const [darkMode, setDarkMode] = useState(false)

  // Share modal
  const [showShareModal, setShowShareModal] = useState(false)
  const [copied, setCopied] = useState(false)

  // Safe URL state (prevents "window is not defined" crash)
  const [shareUrl, setShareUrl] = useState('')

  // Get custom workflow stages
  const fallbackStages = STAGES_BY_INDUSTRY[industry] || STAGES_BY_INDUSTRY.default
  const { stages: dynamicStages } = useWorkflowStages(business?.id, fallbackStages)

  // Fetch data from server-side API
  useEffect(() => {
    if (!token) { setError(true); setLoading(false); return }

    const load = async () => {
      try {
        const response = await fetch(`/api/track/${token}`)
        const data = await response.json()

        if (data.error) {
          setError(true); setLoading(false); return
        }

        setOrder(data.order)
        setCustomer(data.order.customers)
        setBusiness(data.business)

        let detectedIndustry = 'default'
        if (data.business) {
          const sector = data.business.sector || ''
          if (sector.toLowerCase().includes('fashion') || sector.toLowerCase().includes('wear')) detectedIndustry = 'fashion'
          else if (sector.toLowerCase().includes('repair') || sector.toLowerCase().includes('technical')) detectedIndustry = 'repairs'
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

  // Safely set the URL
  useEffect(() => {
    setShareUrl(window.location.href)
  }, [])

  const getStatusInfo = (status) => {
    const map = {
      'Order placed': { label: 'Order Placed', icon: 'file-text' },
      'Cutting': { label: 'Cutting', icon: 'scissors' },
      'Sewing': { label: 'Sewing', icon: 'edit-2' },
      'Ready': { label: 'Ready for Pickup', icon: 'check-circle' },
      'Delivered': { label: 'Delivered', icon: 'package' },
      'Received': { label: 'Received', icon: 'inbox' },
      'Diagnosing': { label: 'Diagnosing', icon: 'search' },
      'Awaiting Parts': { label: 'Awaiting Parts', icon: 'clock' },
      'Repairing': { label: 'Repairing', icon: 'tool' },
      'Testing': { label: 'Testing', icon: 'check-circle' },
      'Processing': { label: 'Processing', icon: 'settings' },
    }
    return map[status] || { label: status || 'Processing', icon: 'file-text' }
  }

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : ''
  const formatDateTime = (d) => d ? new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''
  const formatPhone = (p) => p ? (p.startsWith('0') ? '234' + p.slice(1) : p) : ''

  const primaryColor = business?.tracking_primary_color || '#D4A52A'
  const bgColor = business?.tracking_bg_color || (darkMode ? '#12121A' : '#F8F6F2')
  const logoUrl = business?.tracking_logo_url || null
  const welcomeMsg = business?.tracking_welcome_message || 'Track your order status'
  const footerMsg = business?.tracking_footer_message || 'Thank you for choosing us!'
  const isRepairs = industry === 'repairs'

  const currentStages = dynamicStages.length > 0 ? dynamicStages : fallbackStages
  const currentStatus = order?.current_status || 'Order placed'
  const currentIndex = currentStages.indexOf(currentStatus)
  const statusInfo = getStatusInfo(currentStatus)
  const balance = (order?.price || 0) - (order?.amount_paid || 0)

  // Share modal functions
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch (_) {
      alert('Copy the URL from your browser address bar.')
    }
  }

  const shareWhatsApp = () => {
    const message = `Hi! You can track your ${isRepairs ? 'repair' : 'order'} here: ${shareUrl}`
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank')
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: bgColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '40px', height: '40px', border: '4px solid #ccc', borderTop: '4px solid ' + primaryColor, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div style={{ minHeight: '100vh', background: bgColor, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center' }}>
        <div style={{ background: darkMode ? '#1E1E2A' : '#fff', borderRadius: '16px', padding: '2rem', maxWidth: '400px' }}>
          <h1 style={{ color: darkMode ? '#fff' : '#1A1A1A' }}>Order not found</h1>
          <p style={{ color: darkMode ? '#aaa' : '#8A8A8A' }}>The tracking link may be invalid or expired.</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: bgColor, padding: '1rem', fontFamily: "'Inter', system-ui, sans-serif", color: darkMode ? '#E8E8E8' : '#1A1A1A' }}>
      <style>{`
        .track-container { max-width: 480px; margin: 0 auto; }
        .track-card { background: ${darkMode ? '#1E1E2A' : '#FFFFFF'}; backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); border: 1px solid ${darkMode ? '#2A2A3A' : '#E5E0D8'}; border-radius: 16px; box-shadow: 0 4px 16px rgba(0,0,0,0.06); padding: 1.5rem; margin-bottom: 1rem; }
        .track-card-header { text-align: center; border-bottom: 1px solid ${darkMode ? '#2A2A3A' : '#E5E0D8'}; padding-bottom: 0.8rem; }
        .business-name { font-size: 1.2rem; font-weight: 700; margin: 0; color: ${darkMode ? '#fff' : '#1A1A1A'}; }
        .business-name span { color: ${primaryColor}; }
        .tagline { font-size: 0.75rem; margin: 0.2rem 0 0; color: ${darkMode ? '#aaa' : '#8A8A8A'}; }
        .business-contact { display: flex; justify-content: center; gap: 0.8rem; margin-top: 0.3rem; flex-wrap: wrap; }
        .business-contact a { font-size: 0.75rem; text-decoration: none; background: ${darkMode ? '#2A2A3A' : '#F8F6F2'}; padding: 0.2rem 0.8rem; border-radius: 20px; display: inline-flex; align-items: center; gap: 0.3rem; color: ${darkMode ? '#fff' : '#1A1A1A'}; }
        .business-location { font-size: 0.7rem; margin-top: 0.2rem; color: ${darkMode ? '#aaa' : '#8A8A8A'}; }
        .order-title { font-size: 1.2rem; font-weight: 700; margin: 0; color: ${darkMode ? '#fff' : '#1A1A1A'}; }
        .order-customer { font-size: 0.9rem; margin: 0.2rem 0 1rem; color: ${darkMode ? '#aaa' : '#8A8A8A'}; }
        .status-badge { display: inline-block; padding: 0.2rem 0.8rem; border-radius: 20px; font-size: 0.8rem; font-weight: 600; background: rgba(212,165,42,0.1); color: ${primaryColor}; }
        .detail-row { display: flex; justify-content: space-between; padding: 0.4rem 0; border-bottom: 1px solid ${darkMode ? '#2A2A3A' : '#E5E0D8'}; }
        .detail-row:last-child { border-bottom: none; }
        .detail-label { font-size: 0.85rem; color: ${darkMode ? '#aaa' : '#8A8A8A'}; }
        .detail-value { font-weight: 600; font-size: 0.85rem; text-align: right; color: ${darkMode ? '#fff' : '#1A1A1A'}; }
        .btn-whatsapp { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.6rem 1.2rem; border-radius: 8px; background: #25D366; color: #fff; text-decoration: none; font-weight: 600; font-size: 0.9rem; border: none; cursor: pointer; }
        .btn-call { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.6rem 1.2rem; border-radius: 8px; background: ${primaryColor}; color: #fff; text-decoration: none; font-weight: 600; font-size: 0.9rem; border: none; cursor: pointer; }
        .footer { text-align: center; font-size: 0.7rem; padding-top: 0.5rem; color: ${darkMode ? '#aaa' : '#8A8A8A'}; }
        .footer strong { color: ${primaryColor}; }
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 1rem; }
        .modal-content { background: ${darkMode ? '#1E1E2A' : '#fff'}; border-radius: 16px; padding: 1.5rem; width: 100%; max-width: 400px; }
        .dark-toggle { position: fixed; top: 1rem; right: 1rem; z-index: 999; background: ${darkMode ? '#2A2A3A' : '#fff'}; border: 1px solid ${darkMode ? '#3A3A4A' : '#E5E0D8'}; border-radius: 50%; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: ${primaryColor}; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
      `}</style>

      {/* Dark Mode Toggle */}
      <button className="dark-toggle" onClick={() => setDarkMode(!darkMode)}>
        {darkMode ? '☀️' : '🌙'}
      </button>

      <div className="track-container">
        {/* Header */}
        <div className="track-card track-card-header">
          {logoUrl && <img src={logoUrl} alt="Business logo" style={{ maxHeight: '60px', marginBottom: '0.5rem', borderRadius: '8px' }} />}
          <h1 className="business-name">{business?.name || 'Business'} <span>✦</span></h1>
          <p className="tagline">{welcomeMsg}</p>
          {business?.phone && <p className="business-location" style={{ marginTop: '0.5rem' }}>📞 {business.phone}</p>}
          {business?.location && <p className="business-location">📍 {business.location}</p>}
        </div>

        {/* Order Summary */}
        <div className="track-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.3rem' }}>
            <div>
              <h2 className="order-title">{order.title || 'Order'}</h2>
              {customer && (
                <p className="order-customer">
                  {customer.name || 'Customer'}
                  {customer.phone && <span> · 📞 {customer.phone}</span>}
                  {customer.email && <span> · ✉️ {customer.email}</span>}
                </p>
              )}
            </div>
            <span className="status-badge"><Icon name={statusInfo.icon} size={14} /> {statusInfo.label}</span>
          </div>
          {order.due_date && (
            <p style={{ margin: '0.3rem 0 0', fontSize: '0.85rem', color: darkMode ? '#aaa' : '#8A8A8A' }}>
              Expected by <strong style={{ color: darkMode ? '#fff' : '#1A1A1A' }}>{formatDate(order.due_date)}</strong>
            </p>
          )}
          {order.updated_at && (
            <p style={{ margin: '0.5rem 0 0', fontSize: '0.75rem', color: darkMode ? '#888' : '#aaa' }}>
              Last updated: {formatDateTime(order.updated_at)}
            </p>
          )}
        </div>

        {/* Stepper */}
        <div className="track-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative' }}>
            <div style={{ position: 'absolute', top: '16px', left: '5%', right: '5%', height: '2px', background: darkMode ? '#2A2A3A' : '#E5E0D8', zIndex: 0 }} />
            <div style={{ position: 'absolute', top: '16px', left: '5%', height: '2px', background: primaryColor, zIndex: 0, width: `${Math.max(0, Math.min(90, (currentIndex / (currentStages.length - 1)) * 90))}%` }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', position: 'relative', zIndex: 1 }}>
              {currentStages.map((stage, i) => {
                const isActive = i === currentIndex
                const isDone = i < currentIndex
                const info = getStatusInfo(stage)
                return (
                  <div key={stage} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', border: `3px solid ${isDone ? 'var(--cresoa-success)' : isActive ? primaryColor : darkMode ? '#2A2A3A' : '#E5E0D8'}`, background: isDone ? 'var(--cresoa-success)' : isActive ? primaryColor : darkMode ? '#1E1E2A' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: isDone ? '#fff' : isActive ? '#fff' : darkMode ? '#aaa' : '#8A8A8A', fontSize: '0.7rem' }}>
                      {isDone ? <Icon name="check" size={14} stroke="#fff" /> : isActive ? <Icon name={info.icon} size={14} stroke="#fff" /> : i + 1}
                    </div>
                    <div style={{ fontSize: '0.55rem', textAlign: 'center', marginTop: '0.3rem', color: isActive ? primaryColor : darkMode ? '#aaa' : '#8A8A8A', fontWeight: isActive ? 700 : 400, maxWidth: '60px', lineHeight: '1.2' }}>{info.label}</div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="track-card">
          <div className="detail-row"><span className="detail-label">Order</span><span className="detail-value">{order.title || '—'}</span></div>
          <div className="detail-row"><span className="detail-label">Status</span><span className="detail-value" style={{ color: primaryColor }}>{statusInfo.label}</span></div>
          {order.due_date && <div className="detail-row"><span className="detail-label">Expected by</span><span className="detail-value">{formatDate(order.due_date)}</span></div>}
          <div className="detail-row"><span className="detail-label">Total</span><span className="detail-value" style={{ color: primaryColor }}>₦{order.price?.toLocaleString()}</span></div>
          <div className="detail-row"><span className="detail-label">Paid</span><span className="detail-value" style={{ color: primaryColor }}>₦{order.amount_paid?.toLocaleString()}</span></div>
          <div className="detail-row"><span className="detail-label">Balance</span><span className="detail-value" style={{ color: balance > 0 ? 'var(--cresoa-danger)' : 'var(--cresoa-success)' }}>{balance > 0 ? `₦${balance.toLocaleString()}` : '✓ Paid'}</span></div>
        </div>

        {/* Share Button (opens modal) */}
        <div className="track-card" style={{ textAlign: 'center' }}>
          <button onClick={() => setShowShareModal(true)} style={{ background: 'transparent', border: 'none', color: primaryColor, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
            <Icon name="link" size={16} stroke="currentColor" /> Share this tracking link
          </button>
        </div>

        {/* Support Actions */}
        {business?.whatsapp && (
          <div className="track-card" style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '0.85rem', margin: '0 0 0.8rem', color: darkMode ? '#aaa' : '#8A8A8A' }}>Have questions? Contact us</p>
            <div style={{ display: 'flex', gap: '0.8rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              {business.phone && <a href={`tel:${business.phone}`} className="btn-call"><Icon name="phone" size={16} stroke="#fff" /> Call</a>}
              {business.whatsapp && <a href={`https://wa.me/${formatPhone(business.whatsapp)}`} target="_blank" rel="noopener noreferrer" className="btn-whatsapp"><Icon name="message-circle" size={16} stroke="#fff" /> WhatsApp</a>}
            </div>
          </div>
        )}

        {/* Footer */}
        {footerMsg && <div className="track-card" style={{ textAlign: 'center', padding: '1rem' }}><p style={{ fontSize: '0.8rem', margin: 0, color: darkMode ? '#aaa' : '#8A8A8A' }}>{footerMsg}</p></div>}
        <div className="footer">Powered by <a href="/" style={{ color: primaryColor, fontWeight: '600', textDecoration: 'none' }}>Cresoa</a> · Built for Nigerian businesses</div>
      </div>

      {/* Share Modal */}
      {showShareModal && (
        <div className="modal-overlay" onClick={() => setShowShareModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, color: darkMode ? '#fff' : '#1A1A1A' }}>Share Tracking Link</h3>
              <button onClick={() => setShowShareModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: darkMode ? '#aaa' : '#8A8A8A' }}>
                <Icon name="x" size={20} stroke="currentColor" />
              </button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem', borderRadius: '8px', background: darkMode ? '#2A2A3A' : '#F8F6F2', marginBottom: '1rem' }}>
              <span style={{ flex: 1, fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: darkMode ? '#fff' : '#1A1A1A' }}>{shareUrl}</span>
              <button onClick={copyLink} style={{ background: 'none', border: 'none', cursor: 'pointer', color: primaryColor }}>
                <Icon name={copied ? 'check' : 'copy'} size={16} stroke="currentColor" /> {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <button onClick={shareWhatsApp} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.75rem', borderRadius: '8px', background: '#25D366', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
              <Icon name="message-circle" size={16} stroke="#fff" /> Share via WhatsApp
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
