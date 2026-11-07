'use client'

import { useEffect } from 'react'
import { useParams } from 'next/navigation'
import { useCart } from '@/lib/CartContext'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'

export default function CartPage() {
  const { slug } = useParams()
  const { cart, removeFromCart, updateQuantity, cartTotal } = useCart()

  // Live stock reconciliation
  useEffect(() => {
    if (!cart.length) return
    const sync = async () => {
      const ids = cart.map(i => i.id)
      const { data } = await supabase
        .from('inventory_items')
        .select('id, quantity_on_hand, is_listed_on_website')
        .in('id', ids)
      if (!data) return

      const stockMap = Object.fromEntries(
        data.map(p => [p.id, {
          stock: Number(p.quantity_on_hand) || 0,
          listed: Boolean(p.is_listed_on_website),
        }])
      )

      cart.forEach(item => {
        const info = stockMap[item.id]
        if (!info) { removeFromCart(item.id); return }
        if (!info.listed || info.stock === 0) { removeFromCart(item.id); return }
        if (item.quantity > info.stock) updateQuantity(item.id, info.stock)
      })
    }
    sync()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (cart.length === 0) {
    return (
      <div style={{ background: '#FFFFFF', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: "'Inter', sans-serif", padding: '20px', textAlign: 'center' }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '2rem', color: '#0F2B4A', marginBottom: '16px' }}>Your cart is empty</h2>
        <p style={{ color: '#666', marginBottom: '30px' }}>Looks like you haven't added anything to your collection yet.</p>
        <Link href={`/${slug}/shop`} style={{ background: '#0F2B4A', color: '#FFF', padding: '16px 32px', borderRadius: '8px', textDecoration: 'none', fontWeight: 700, fontSize: '1rem', letterSpacing: '0.5px' }}>
          Explore Collection
        </Link>
      </div>
    )
  }

  return (
    <div style={{ background: '#FFFFFF', minHeight: '100vh', fontFamily: "'Inter', sans-serif", paddingBottom: '100px' }}>
      
      {/* HEADER */}
      <header style={{ padding: '20px', borderBottom: '1px solid #EAEAEA', position: 'sticky', top: 0, background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(10px)', zIndex: 100, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link href={`/${slug}/shop`} style={{ textDecoration: 'none', color: '#0F2B4A', fontSize: '0.9rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
          Continue Shopping
        </Link>
      </header>

      <main style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px' }}>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '2rem', color: '#0F2B4A', margin: '0 0 30px 0' }}>Shopping Bag</h1>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginBottom: '40px' }}>
          {cart.map(item => (
            <div key={item.id} style={{ display: 'flex', gap: '16px', borderBottom: '1px solid #EAEAEA', paddingBottom: '24px' }}>
              
              {/* IMAGE */}
              <div style={{ width: '100px', height: '130px', background: '#F9F9F9', borderRadius: '8px', overflow: 'hidden', flexShrink: 0 }}>
                {item.image_url ? (
                  <img src={item.image_url} alt={item.item_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#CCC', fontSize: '0.75rem' }}>No Image</div>
                )}
              </div>

              {/* DETAILS */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3 style={{ margin: '0 0 4px 0', fontSize: '1rem', fontWeight: 600, color: '#0F2B4A' }}>{item.item_name}</h3>
                    <p style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0F2B4A' }}>₦{Number(item.selling_price).toLocaleString()}</p>
                  </div>
                  <button onClick={() => removeFromCart(item.id)} style={{ background: 'none', border: 'none', color: '#999', cursor: 'pointer', padding: '4px' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                  </button>
                </div>
                
                <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', border: '1px solid #EAEAEA', borderRadius: '6px', width: 'fit-content' }}>
                  <button onClick={() => updateQuantity(item.id, item.quantity - 1)} style={{ padding: '8px 12px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', color: '#0F2B4A' }}>-</button>
                  <span style={{ padding: '0 12px', fontWeight: 600, fontSize: '0.9rem' }}>{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.id, item.quantity + 1)} style={{ padding: '8px 12px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', color: '#0F2B4A' }}>+</button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* SUMMARY */}
        <div style={{ background: '#F9F9F9', padding: '24px', borderRadius: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '0.95rem', color: '#666' }}>
            <span>Subtotal</span>
            <span>₦{cartTotal.toLocaleString()}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px', fontSize: '0.95rem', color: '#666' }}>
            <span>Delivery</span>
            <span style={{ fontStyle: 'italic' }}>Calculated at checkout</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #EAEAEA', paddingTop: '16px', marginBottom: '24px' }}>
            <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0F2B4A' }}>Total</span>
            <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0F2B4A' }}>₦{cartTotal.toLocaleString()}</span>
          </div>
          
          <Link href={`/${slug}/checkout`} style={{ display: 'block', width: '100%', background: '#0F2B4A', color: '#FFF', textAlign: 'center', padding: '18px', borderRadius: '8px', textDecoration: 'none', fontWeight: 700, fontSize: '1rem', letterSpacing: '1px', textTransform: 'uppercase', boxShadow: '0 4px 15px rgba(15,43,74,0.2)' }}>
            Proceed to Checkout
          </Link>
        </div>
      </main>
    </div>
  )
}
