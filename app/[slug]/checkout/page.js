'use client'

import { useState, useEffect } from 'react'
import { useCart } from '@/lib/CartContext'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'

const NIGERIAN_STATES = ['Lagos', 'Abuja', 'Rivers', 'Oyo', 'Kano', 'Enugu', 'Anambra', 'Ogun', 'Kaduna', 'Delta']

export default function CheckoutPage({ params }) {
  const { slug } = params
  const { cart, cartTotal } = useCart()
  
  const [page, setPage] = useState(null)
  const [form, setForm] = useState({ name: '', phone: '', email: '', address: '', state: '' })
  
  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase.from('business_public_pages').select('sector_data').eq('slug', slug).single()
      setPage(data)
    }
    fetchSettings()
  }, [slug])

  const deliveryRates = page?.sector_data?.delivery_rates || {}
  const freeDelivery = page?.sector_data?.free_delivery || false
  
  const deliveryFee = freeDelivery ? 0 : (deliveryRates[form.state] || 0)
  const finalTotal = cartTotal + deliveryFee

  if (cart.length === 0) {
    return <div style={{ padding: '80px 20px', textAlign: 'center' }}><h2>Your cart is empty</h2><Link href={`/${slug}/shop`}>Back to shop</Link></div>
  }

  return (
    <div style={{ padding: '40px 20px', maxWidth: '800px', margin: '0 auto', minHeight: '80vh' }}>
      <Link href={`/${slug}/cart`} style={{ color: '#D4AF37', textDecoration: 'none', fontWeight: 600 }}>← Back to Cart</Link>
      <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '2.5rem', color: '#0F2B4A', margin: '10px 0 30px' }}>Checkout</h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '30px' }}>
        <div style={{ background: '#fff', padding: '30px', borderRadius: '16px', border: '1px solid #eee' }}>
          <h2 style={{ margin: '0 0 20px 0', fontSize: '1.2rem', color: '#0F2B4A' }}>Delivery Details</h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <input type="text" placeholder="Full Name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} style={{ padding: '15px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '1rem' }} />
            <input type="tel" placeholder="Phone Number" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} style={{ padding: '15px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '1rem' }} />
            <input type="email" placeholder="Email Address" value={form.email} onChange={e => setForm({...form, email: e.target.value})} style={{ padding: '15px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '1rem' }} />
            <textarea placeholder="Full Delivery Address" value={form.address} onChange={e => setForm({...form, address: e.target.value})} style={{ padding: '15px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '1rem', resize: 'vertical' }} />
            
            <select value={form.state} onChange={e => setForm({...form, state: e.target.value})} style={{ padding: '15px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '1rem' }}>
              <option value="">Select State for Delivery</option>
              {NIGERIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
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
            <span style={{ fontWeight: 600 }}>{freeDelivery ? 'Free' : `₦${deliveryFee.toLocaleString()}`}</span>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid #eee', paddingTop: '20px', marginBottom: '30px' }}>
            <span style={{ fontWeight: 800, fontSize: '1.2rem' }}>Total</span>
            <span style={{ fontWeight: 800, fontSize: '1.2rem', color: '#D4AF37' }}>₦{finalTotal.toLocaleString()}</span>
          </div>

          <button type="button" disabled className="cresoa-primary-button" style={{ width: '100%', padding: '18px', fontSize: '1.1rem', background: '#ccc', color: '#666', border: 'none', borderRadius: '30px', cursor: 'not-allowed' }}>
             Pay ₦{finalTotal.toLocaleString()} with Paystack (Coming Soon)
          </button>
        </div>
      </div>
    </div>
  )
}
