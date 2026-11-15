'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import { parseSectorData } from '@/lib/publicPageData'
import { useCart } from '@/lib/CartContext'
import Link from 'next/link'

export default function CheckoutClient({ page, slug: propSlug }) {
  const params = useParams()
  const slug = propSlug || params?.slug
  const { cart, cartTotal } = useCart()

  const [isProcessing, setIsProcessing] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [form, setForm] = useState({ name: '', phone: '', email: '', address: '', state: '' })
  
  const [showStateDropdown, setShowStateDropdown] = useState(false)
  const stateDropdownRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(event) {
      if (stateDropdownRef.current && !stateDropdownRef.current.contains(event.target)) {
        setShowStateDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (cart.length === 0) return (
    <div style={{ padding: '80px 20px', textAlign: 'center' }}>
      <h2 style={{ fontFamily: "'Playfair Display', serif", color: '#111827' }}>Your cart is empty</h2>
      <Link href={`/${slug}/shop`} style={{ color: '#2563EB', marginTop: '20px', display: 'inline-block', fontWeight: 600 }}>Return to shop</Link>
    </div>
  )

  const sector = parseSectorData(page.sector_data)
  const freeDelivery = Boolean(sector.free_delivery)
  const deliveryRates = sector.delivery_rates || {}
  const availableStates = freeDelivery ? [] : Object.keys(deliveryRates)
  
  const deliveryFee = freeDelivery ? 0 : (deliveryRates[form.state] ?? null)
  const deliveryKnown = freeDelivery || deliveryFee !== null
  const finalTotal = deliveryKnown ? cartTotal + (deliveryFee || 0) : cartTotal

  const handlePayment = async () => {
    setErrorMsg('')
    if (!form.name || !form.phone || !form.address) return setErrorMsg("Please fill in your name, phone number, and delivery address.")
    if (!freeDelivery && !form.state) return setErrorMsg("Please select your delivery state.")

    setIsProcessing(true)
    
    try {
      // ✅ Send data to our secure API route (no direct DB inserts here)
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          slug, 
          form, 
          cart, 
          totalAmount: finalTotal,
          businessId: page.business_id
        })
      })
      
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await res.text();
        throw new Error(`Server error: ${res.status}. Check console.`);
      }

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to initialize payment')
      
      // Save the order ID to session storage just in case
      sessionStorage.setItem('last_order_id', data.orderId)
      
      // Redirect to Paystack
      window.location.href = data.url
      
    } catch (err) {
      setErrorMsg(err.message)
      setIsProcessing(false)
    }
  }

  const inputStyle = { width: '100%', padding: '16px', borderRadius: '12px', border: '1px solid #D1D5DB', fontSize: '1rem', outline: 'none', background: '#FFFFFF', color: '#111827' }
  const labelStyle = { display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#4B5563', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }

  return (
    <div style={{ background: '#F3F4F6', minHeight: '100vh', fontFamily: "'Inter', system-ui, sans-serif", paddingBottom: '120px' }}>
      
      <header style={{ padding: '20px', borderBottom: '1px solid #E5E7EB', position: 'sticky', top: 0, background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(12px)', zIndex: 100, display: 'flex', alignItems: 'center' }}>
        <Link href={`/${slug}/cart`} style={{ textDecoration: 'none', color: '#111827', fontSize: '0.95rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
          Back
        </Link>
      </header>

      <main style={{ maxWidth: '600px', margin: '0 auto', padding: '30px 20px' }}>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '2rem', color: '#111827', margin: '0 0 24px 0', fontWeight: 800 }}>Checkout</h1>

        {errorMsg && (
          <div style={{ padding: '16px', background: '#FEF2F2', color: '#B91C1C', borderRadius: '12px', marginBottom: '24px', border: '1px solid #FCA5A5', fontSize: '0.9rem', fontWeight: 500 }}>
            {errorMsg}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ background: '#FFFFFF', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#111827', marginBottom: '20px' }}>Delivery Details</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={labelStyle}>Full Name</label>
                <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Phone Number</label>
                <input type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Email (Optional)</label>
                <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Delivery Address</label>
                <textarea value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
              </div>

              {!freeDelivery && (
                <div style={{ position: 'relative' }} ref={stateDropdownRef}>
                  <label style={labelStyle}>State</label>
                  <button type="button" onClick={() => setShowStateDropdown(!showStateDropdown)} style={{ ...inputStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', color: form.state ? '#111827' : '#9CA3AF' }}>
                    {form.state || 'Select State'}
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>
                  </button>
                  {showStateDropdown && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '8px', background: '#FFF', border: '1px solid #E5E7EB', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', maxHeight: '200px', overflowY: 'auto', zIndex: 50 }}>
                      {availableStates.map(s => (
                        <button key={s} type="button" onClick={() => { setForm({ ...form, state: s }); setShowStateDropdown(false); }} style={{ width: '100%', textAlign: 'left', padding: '16px', background: '#FFF', border: 'none', borderBottom: '1px solid #F3F4F6', cursor: 'pointer', fontSize: '0.95rem', color: '#374151' }}>
                          {s} — ₦{Number(deliveryRates[s]).toLocaleString()}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div style={{ background: '#FFFFFF', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#111827', marginBottom: '20px' }}>Order Summary</h2>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', fontSize: '0.95rem', color: '#4B5563' }}>
              <span>Subtotal</span><span>₦{cartTotal.toLocaleString()}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px', fontSize: '0.95rem', color: '#4B5563' }}>
              <span>Delivery {form.state && `(${form.state})`}</span>
              <span>{!form.state && !freeDelivery ? '—' : freeDelivery ? 'Free' : deliveryKnown ? `₦${deliveryFee.toLocaleString()}` : 'Not available'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #E5E7EB', paddingTop: '20px' }}>
              <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#111827' }}>Total</span>
              <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#111827' }}>{deliveryKnown ? `₦${finalTotal.toLocaleString()}` : '—'}</span>
            </div>
          </div>
        </div>
      </main>

      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#FFFFFF', borderTop: '1px solid #E5E7EB', padding: '20px', zIndex: 100 }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <button type="button" onClick={handlePayment} disabled={!deliveryKnown || isProcessing} style={{ width: '100%', padding: '18px', fontSize: '1.1rem', fontWeight: 700, background: (!deliveryKnown || isProcessing) ? '#E5E7EB' : '#111827', color: (!deliveryKnown || isProcessing) ? '#9CA3AF' : '#FFFFFF', border: 'none', borderRadius: '12px', cursor: (!deliveryKnown || isProcessing) ? 'not-allowed' : 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
            {isProcessing ? 'Processing...' : `Pay ${deliveryKnown ? `₦${finalTotal.toLocaleString()}` : ''}`}
            {!isProcessing && <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>}
          </button>
          <p style={{ textAlign: 'center', fontSize: '0.75rem', color: '#9CA3AF', marginTop: '12px', marginBottom: 0 }}>
            Secured by Paystack
          </p>
        </div>
      </div>
    </div>
  )
    }
