'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { parseSectorData } from '@/lib/publicPageData'
import { useCart } from '@/lib/CartContext'
import Link from 'next/link'

export default function CheckoutPage() {
  const { slug } = useParams()
  const { cart, cartTotal } = useCart()

  const [page, setPage] = useState(null)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ name: '', phone: '', email: '', address: '', state: '' })
  
  // Custom Dropdown State
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

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('business_public_pages')
        .select('sector_data, is_enabled')
        .eq('slug', String(slug).toLowerCase())
        .maybeSingle()
      setPage(data || null)
      setLoading(false)
    }
    load()
  }, [slug])

  if (loading) return <div style={{ padding: '100px', textAlign: 'center', color: '#0F2B4A', fontWeight: 600 }}>Loading...</div>

  if (!page?.is_enabled) {
    return (
      <div style={{ padding: '80px 20px', textAlign: 'center', fontFamily: "'Inter', sans-serif" }}>
        <h2 style={{ color: '#0F2B4A' }}>This store is currently unavailable</h2>
        <p style={{ color: '#666' }}>The business owner has paused this site.</p>
      </div>
    )
  }

  if (cart.length === 0) {
    return (
      <div style={{ padding: '80px 20px', textAlign: 'center', fontFamily: "'Inter', sans-serif" }}>
        <h2 style={{ color: '#0F2B4A' }}>Your cart is empty</h2>
        <Link href={`/${slug}/shop`} style={{ color: '#D4AF37', marginTop: '20px', display: 'inline-block', fontWeight: 600 }}>Back to shop</Link>
      </div>
    )
  }

  const sector = parseSectorData(page.sector_data)
  const freeDelivery = Boolean(sector.free_delivery)
  const deliveryRates = sector.delivery_rates || {}
  const configuredStates = Object.keys(deliveryRates)
  const availableStates = freeDelivery ? [] : configuredStates
  const hasDeliveryConfig = freeDelivery || configuredStates.length > 0

  // Fee Logic
  const deliveryFee = freeDelivery ? 0 : (deliveryRates[form.state] ?? null)
  const deliveryKnown = freeDelivery || deliveryFee !== null
  const finalTotal = deliveryKnown ? cartTotal + (deliveryFee || 0) : cartTotal

  if (!hasDeliveryConfig) {
    return (
      <div style={{ padding: '80px 20px', textAlign: 'center', fontFamily: "'Inter', sans-serif" }}>
        <h2 style={{ color: '#0F2B4A' }}>Delivery not configured</h2>
        <p style={{ color: '#666' }}>This business hasn't set up delivery options yet.</p>
        <Link href={`/${slug}`} style={{ color: '#D4AF37', marginTop: '20px', display: 'inline-block', fontWeight: 600 }}>← Back to store</Link>
      </div>
    )
  }

  return (
    <div style={{ background: '#FFFFFF', minHeight: '100vh', fontFamily: "'Inter', sans-serif", paddingBottom: '100px' }}>
      
      <header style={{ padding: '20px', borderBottom: '1px solid #EAEAEA', position: 'sticky', top: 0, background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(10px)', zIndex: 100 }}>
        <Link href={`/${slug}/cart`} style={{ textDecoration: 'none', color: '#0F2B4A', fontSize: '0.9rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
          Back to Bag
        </Link>
      </header>

      <main style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px' }}>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '2rem', color: '#0F2B4A', margin: '0 0 30px 0' }}>Checkout</h1>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
          
          {/* DELIVERY FORM */}
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0F2B4A', marginBottom: '16px', borderBottom: '1px solid #EAEAEA', paddingBottom: '10px' }}>Delivery Details</h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <input 
                type="text" 
                placeholder="Full Name" 
                value={form.name} 
                onChange={e => setForm({ ...form, name: e.target.value })} 
                style={{ width: '100%', padding: '16px', borderRadius: '8px', border: '1px solid #EAEAEA', fontSize: '1rem', outline: 'none' }} 
              />
              <input 
                type="tel" 
                placeholder="Phone Number" 
                value={form.phone} 
                onChange={e => setForm({ ...form, phone: e.target.value })} 
                style={{ width: '100%', padding: '16px', borderRadius: '8px', border: '1px solid #EAEAEA', fontSize: '1rem', outline: 'none' }} 
              />
              <input 
                type="email" 
                placeholder="Email Address (Optional)" 
                value={form.email} 
                onChange={e => setForm({ ...form, email: e.target.value })} 
                style={{ width: '100%', padding: '16px', borderRadius: '8px', border: '1px solid #EAEAEA', fontSize: '1rem', outline: 'none' }} 
              />
              <textarea 
                placeholder="Full Delivery Address" 
                value={form.address} 
                onChange={e => setForm({ ...form, address: e.target.value })} 
                rows={3}
                style={{ width: '100%', padding: '16px', borderRadius: '8px', border: '1px solid #EAEAEA', fontSize: '1rem', outline: 'none', resize: 'vertical' }} 
              />

              {/* CUSTOM STATE DROPDOWN */}
              {!freeDelivery && (
                <div style={{ position: 'relative' }} ref={stateDropdownRef}>
                  <button 
                    type="button"
                    onClick={() => setShowStateDropdown(!showStateDropdown)}
                    style={{ width: '100%', padding: '16px', borderRadius: '8px', border: '1px solid #EAEAEA', background: '#FFF', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '1rem', color: form.state ? '#0F2B4A' : '#999', cursor: 'pointer' }}
                  >
                    {form.state || 'Select State for Delivery'}
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>
                  </button>

                  {showStateDropdown && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px', background: '#FFF', border: '1px solid #EAEAEA', borderRadius: '8px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', maxHeight: '200px', overflowY: 'auto', zIndex: 50 }}>
                      {availableStates.map(s => (
                        <button 
                          key={s} 
                          type="button"
                          onClick={() => { setForm({ ...form, state: s }); setShowStateDropdown(false); }}
                          style={{ width: '100%', textAlign: 'left', padding: '14px 16px', background: '#FFF', border: 'none', borderBottom: '1px solid #F0F0F0', cursor: 'pointer', fontSize: '0.95rem', color: '#333' }}
                          onMouseEnter={(e) => e.target.style.background = '#F9F9F9'}
                          onMouseLeave={(e) => e.target.style.background = '#FFF'}
                        >
                          {s} — ₦{Number(deliveryRates[s]).toLocaleString()}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* SUMMARY */}
          <div style={{ background: '#F9F9F9', padding: '24px', borderRadius: '12px' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0F2B4A', marginBottom: '20px' }}>Order Summary</h2>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '0.95rem', color: '#666' }}>
              <span>Subtotal</span>
              <span>₦{cartTotal.toLocaleString()}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', fontSize: '0.95rem', color: '#666' }}>
              <span>Delivery {form.state && `(${form.state})`}</span>
              <span>
                {!form.state && !freeDelivery ? '—' : freeDelivery ? 'Free' : deliveryKnown ? `₦${deliveryFee.toLocaleString()}` : 'Not available'}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #EAEAEA', paddingTop: '20px', marginBottom: '24px' }}>
              <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0F2B4A' }}>Total</span>
              <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0F2B4A' }}>
                {deliveryKnown ? `₦${finalTotal.toLocaleString()}` : '—'}
              </span>
            </div>

            <button 
              type="button" 
              disabled={true} 
              style={{ 
                width: '100%', padding: '18px', fontSize: '1rem', fontWeight: 700, 
                background: '#EAEAEA', color: '#999', border: 'none', borderRadius: '8px', 
                cursor: 'not-allowed', textTransform: 'uppercase', letterSpacing: '1px'
              }}
            >
              Pay {deliveryKnown ? `₦${finalTotal.toLocaleString()}` : ''} with Paystack (Coming Soon)
            </button>
            <p style={{ textAlign: 'center', fontSize: '0.8rem', color: '#999', marginTop: '12px' }}>
              Secure checkout powered by Paystack
            </p>
          </div>

        </div>
      </main>
    </div>
  )
}
