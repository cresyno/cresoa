'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCart } from '@/lib/CartContext'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'

export default function CartClient({ business, slug }) {
  const router = useRouter()
  const { cart, clearCart } = useCart() // Assuming your CartContext has these
  
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    note: ''
  })

  const total = cart.reduce((sum, item) => sum + (Number(item.product.selling_price) * item.quantity), 0)

  const handlePlaceOrder = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      // 1. Save the order to your database
      const orderItems = cart.map(item => ({
        product_id: item.product.id,
        name: item.product.item_name,
        price: item.product.selling_price,
        quantity: item.quantity
      }))

      const { data: order, error } = await supabase
        .from('public_orders')
        .insert({
          business_id: business.id,
          customer_name: formData.name,
          customer_phone: formData.phone,
          customer_address: formData.address,
          note: formData.note,
          items: orderItems,
          total_amount: total,
          status: 'new'
        })
        .select()
        .single()

      if (error) throw error

      // 2. Clear the cart
      if (clearCart) clearCart()

      // 3. Redirect to WhatsApp to confirm
      const whatsappNumber = business.whatsapp || business.phone
      const cleanNumber = whatsappNumber.replace(/\D/g, '')
      const message = encodeURIComponent(
        `Hello ${business.name}, I just placed an order on your website.\n\n*Order ID:* ${order.id.slice(0, 8)}\n*Total:* ₦${total.toLocaleString()}\n\nPlease confirm my order.`
      )
      
      window.location.href = `https://wa.me/${cleanNumber}?text=${message}`

    } catch (err) {
      alert("Failed to place order: " + err.message)
      setLoading(false)
    }
  }

  if (!cart || cart.length === 0) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#FAFAF9', padding: '20px', textAlign: 'center' }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '2rem', color: '#0F2B4A', marginBottom: '10px' }}>Your cart is empty</h2>
        <p style={{ color: '#666', marginBottom: '30px' }}>Looks like you haven't added any pieces yet.</p>
        <Link href={`/${slug}/shop`} style={{ background: '#0F2B4A', color: '#FFF', padding: '15px 30px', textDecoration: 'none', borderRadius: '4px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', fontSize: '0.9rem' }}>
          Continue Shopping
        </Link>
      </div>
    )
  }

  return (
    <div style={{ background: '#FFFFFF', minHeight: '100vh', fontFamily: "'Inter', sans-serif", paddingBottom: '50px' }}>
      
      <header style={{ padding: '20px', textAlign: 'center', borderBottom: '1px solid #F0F0F0', position: 'sticky', top: 0, background: 'rgba(255,255,255,0.98)', backdropFilter: 'blur(10px)', zIndex: 100 }}>
        <h1 style={{ margin: 0, fontFamily: "'Playfair Display', serif", fontSize: '1.5rem', color: '#0F2B4A' }}>Checkout</h1>
      </header>

      <main style={{ maxWidth: '1000px', margin: '0 auto', padding: '40px 20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '40px' }}>
        
        {/* ORDER SUMMARY */}
        <div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0F2B4A', marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '1px' }}>Order Summary</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {cart.map((item, idx) => (
              <div key={idx} style={{ display: 'flex', gap: '15px', borderBottom: '1px solid #EAEAEA', paddingBottom: '15px' }}>
                <div style={{ width: '80px', height: '100px', background: '#F9F9F9', borderRadius: '4px', overflow: 'hidden' }}>
                  {item.product.image_url && <img src={item.product.image_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                </div>
                <div style={{ flex: 1 }}>
                  <h4 style={{ margin: '0 0 5px 0', fontSize: '1rem', color: '#0F2B4A' }}>{item.product.item_name}</h4>
                  <p style={{ margin: 0, color: '#666', fontSize: '0.85rem' }}>Qty: {item.quantity}</p>
                  <p style={{ margin: '5px 0 0 0', fontWeight: 700, color: '#0F2B4A' }}>₦{(Number(item.product.selling_price) * item.quantity).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px', paddingTop: '20px', borderTop: '2px solid #0F2B4A' }}>
            <span style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0F2B4A' }}>Total</span>
            <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0F2B4A' }}>₦{total.toLocaleString()}</span>
          </div>
        </div>

        {/* CUSTOMER DETAILS FORM */}
        <div style={{ background: '#F9F9F9', padding: '30px', borderRadius: '8px' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0F2B4A', marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '1px' }}>Delivery Details</h2>
          <form onSubmit={handlePlaceOrder} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '5px', color: '#333' }}>Full Name *</label>
              <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} style={{ width: '100%', padding: '12px', border: '1px solid #DDD', borderRadius: '4px', fontSize: '0.95rem' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '5px', color: '#333' }}>Phone Number *</label>
              <input required type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} style={{ width: '100%', padding: '12px', border: '1px solid #DDD', borderRadius: '4px', fontSize: '0.95rem' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '5px', color: '#333' }}>Delivery Address *</label>
              <textarea required rows={3} value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} style={{ width: '100%', padding: '12px', border: '1px solid #DDD', borderRadius: '4px', fontSize: '0.95rem', resize: 'vertical' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '5px', color: '#333' }}>Note (Optional)</label>
              <input type="text" value={formData.note} onChange={e => setFormData({...formData, note: e.target.value})} style={{ width: '100%', padding: '12px', border: '1px solid #DDD', borderRadius: '4px', fontSize: '0.95rem' }} />
            </div>

            <button 
              type="submit" 
              disabled={loading}
              style={{ width: '100%', padding: '18px', background: '#0F2B4A', color: '#FFF', border: 'none', borderRadius: '4px', fontSize: '1rem', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', textTransform: 'uppercase', letterSpacing: '1px', marginTop: '10px', opacity: loading ? 0.7 : 1 }}
            >
              {loading ? 'Processing...' : 'Place Order via WhatsApp'}
            </button>
            <p style={{ textAlign: 'center', fontSize: '0.8rem', color: '#888', margin: 0 }}>
              You will be redirected to WhatsApp to confirm your order.
            </p>
          </form>
        </div>

      </main>
    </div>
  )
}
