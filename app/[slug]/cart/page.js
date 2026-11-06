'use client'

import { useEffect } from 'react'
import { useParams } from 'next/navigation'
import { useCart } from '@/lib/CartContext'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'

export default function CartPage() {
  const { slug } = useParams()
  const { cart, removeFromCart, updateQuantity, cartTotal } = useCart()

  // 🔄 Reconcile cart with live stock on mount:
  // - remove items that are now out of stock
  // - clamp quantities that exceed current stock
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
      <div style={{ padding: '80px 20px', textAlign: 'center', minHeight: '70vh', fontFamily: "'Inter', sans-serif" }}>
        <h2 style={{ fontSize: '2rem', color: '#0F2B4A', marginBottom: '20px' }}>Your Cart is Empty</h2>
        <Link href={`/${slug}/shop`} style={{ background: '#D4AF37', color: '#0F2B4A', padding: '15px 30px', borderRadius: '30px', textDecoration: 'none', fontWeight: 700 }}>Go Shopping</Link>
      </div>
    )
  }

  return (
    <div style={{ padding: '40px 20px', maxWidth: '800px', margin: '0 auto', minHeight: '80vh', fontFamily: "'Inter', sans-serif" }}>
      <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '2.5rem', color: '#0F2B4A', marginBottom: '30px' }}>Shopping Cart</h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '40px' }}>
        {cart.map(item => (
          <div key={item.id} style={{ display: 'flex', gap: '20px', background: '#fff', padding: '15px', borderRadius: '12px', border: '1px solid #eee', alignItems: 'center' }}>
            {item.image_url
              ? <img src={item.image_url} alt={item.item_name} style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px' }} />
              : <div style={{ width: '80px', height: '80px', borderRadius: '8px', background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ccc', fontSize: '0.75rem' }}>No Image</div>}
            <div style={{ flex: 1 }}>
              <h3 style={{ margin: '0 0 5px 0', fontSize: '1.1rem', color: '#0F2B4A' }}>{item.item_name}</h3>
              <p style={{ margin: 0, fontWeight: 700, color: '#D4AF37' }}>₦{Number(item.selling_price).toLocaleString()}</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button onClick={() => updateQuantity(item.id, item.quantity - 1)} style={{ padding: '5px 10px', border: '1px solid #ddd', background: '#f9f9f9', borderRadius: '4px', cursor: 'pointer' }}>-</button>
              <span style={{ minWidth: '24px', textAlign: 'center' }}>{item.quantity}</span>
              <button onClick={() => updateQuantity(item.id, item.quantity + 1)} style={{ padding: '5px 10px', border: '1px solid #ddd', background: '#f9f9f9', borderRadius: '4px', cursor: 'pointer' }}>+</button>
            </div>
            <button onClick={() => removeFromCart(item.id)} style={{ background: 'none', border: 'none', color: 'red', cursor: 'pointer', padding: '10px' }}>Remove</button>
          </div>
        ))}
      </div>

      <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #eee', textAlign: 'right' }}>
        <h2 style={{ margin: '0 0 20px 0', fontSize: '1.5rem' }}>Subtotal: ₦{cartTotal.toLocaleString()}</h2>
        <Link href={`/${slug}/checkout`} style={{ display: 'inline-block', background: '#0F2B4A', color: '#fff', padding: '15px 30px', borderRadius: '30px', textDecoration: 'none', fontWeight: 700 }}>Proceed to Checkout</Link>
      </div>
    </div>
  )
}
