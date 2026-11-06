// app/[slug]/checkout/page.js
'use client'

import { useState, useEffect } from 'react'
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

  if (loading) return <div style={{ padding: '80px 20px', textAlign: 'center' }}>Loading…</div>

  if (!page?.is_enabled) {
    return (
      <div style={{ padding: '80px 20px', textAlign: 'center', fontFamily: "'Inter', sans-serif" }}>
        <h2>This store is currently unavailable</h2>
        <p style={{ color: '#666' }}>The business owner has paused this site.</p>
      </div>
    )
  }

  const sector = parseSectorData(page.sector_data)
  const freeDelivery = Boolean(sector.free_delivery)
  const deliveryRates = sector.delivery_rates || {}
  const configuredStates = Object.keys(deliveryRates)

  // States the business actually serves
  const availableStates = freeDelivery
    ? configuredStates.length ? configuredStates : [] // require config
    : configuredStates

  const hasDeliveryConfig = freeDelivery || configuredStates.length > 0
  const deliveryFee = freeDelivery ? 0 : (deliveryRates[form.state] ?? null)
  const deliveryKnown = freeDelivery || deliveryFee !== null
  const finalTotal = deliveryKnown ? cartTotal + (deliveryFee || 0) : cartTotal
  const canPay = form.name && form.phone && form.address && form.state && deliveryKnown && cart.length > 0

  if (cart.length === 0) {
    return (
      <div style={{ padding: '80px 20px', textAlign: 'center', fontFamily: "'Inter', sans-serif" }}>
        <h2>Your cart is empty</h2>
        <Link href={`/${slug}/shop`}>Back to shop</Link>
      </div>
    )
  }

  if (!hasDeliveryConfig) {
    return (
      <div style={{ padding: '80px 20px', textAlign: 'center', fontFamily: "'Inter', sans-serif" }}>
        <h2>Delivery not configured</h2>
        <p style={{ color: '#666' }}>This business hasn't set up delivery options yet. Please contact them directly.</p>
        <Link href={`/${slug}`}>← Back to store</Link>
      </div>
    )
  }

  return (
    <div style={{ padding: '40px 20px', maxWidth: '800px', margin: '0 auto', minHeight: '80vh', fontFamily: "'Inter', sans-serif" }}>
      <Link href={`/${slug}/cart`} style={{ color: '#D4AF37', textDecoration: 'none', fontWeight: 600 }}>← Back to Cart</Link>
      <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '2.5rem', color: '#0F2B4A', margin: '10px 0 30px' }}>Checkout</h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '30px' }}>
        <div style={{ background: '#fff', padding: '30px', borderRadius: '16px', border: '1px solid #eee' }}>
          <h2 style={{ margin: '0 0 20px 0', fontSize: '1.2rem', color: '#0F2B4A' }}>Delivery Details</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <input type="text" placeholder="Full Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={{ padding: '15px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '1rem' }} />
            <input type="tel" placeholder="Phone Number" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} style={{ padding: '15px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '1rem' }} />
            <input type="email" placeholder="Email Address" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} style={{ padding: '15px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '1rem' }} />
            <textarea placeholder="Full Delivery Address" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} style={{ padding: '15px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '1rem', resize: 'vertical' }} />
            <select value={form.state} onChange={e => setForm({ ...form, state: e.target.value })} style={{ padding: '15px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '1rem' }}>
              <option value="">Select State for Delivery</option>
              {availableStates.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <div style={{ background: '#fff', padding: '30px', borderRadius: '16px', border: '1px solid #eee' }}>
          <h2 style={{ margin: '0 0 20px 0', fontSize: '1.2rem', color: '#0F2B4A' }}>Order Summary</h2>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
            <span style={{ color: '#666' }}>Subtotal</span>
            <span style={{ fontWeight: 600 }}>₦{cartTotal.toLocaleString()}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
            <span style={{ color: '#666' }}>Delivery {form.state && `(${form.state})`}</span>
            <span style={{ fontWeight: 600 }}>
              {!form.state ? '—' : freeDelivery ? 'Free' : deliveryKnown ? `₦${deliveryFee.toLocaleString()}` : 'Not available'}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid #eee', paddingTop: '20px', marginBottom: '30px' }}>
            <span style={{ fontWeight: 800, fontSize: '1.2rem' }}>Total</span>
            <span style={{ fontWeight: 800, fontSize: '1.2rem', color: '#D4AF37' }}>
              {deliveryKnown ? `₦${finalTotal.toLocaleString()}` : '—'}
            </span>
          </div>

          <button type="button" disabled className="cresoa-primary-button" style={{ width: '100%', padding: '18px', fontSize: '1.1rem', background: '#ccc', color: '#666', border: 'none', borderRadius: '30px', cursor: 'not-allowed' }}>
            Pay {deliveryKnown ? `₦${finalTotal.toLocaleString()}` : ''} with Paystack (Coming Soon)
          </button>
        </div>
      </div>
    </div>
  )
    }
