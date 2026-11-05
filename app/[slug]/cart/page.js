'use client'

import { useCart } from '@/lib/CartContext'
import Link from 'next/link'

export default function CartPage({ params }) {
  const { slug } = params
  const { cart, removeFromCart, updateQuantity, cartTotal } = useCart()

  if (cart.length === 0) {
    return (
      <div style={{ padding: '80px 20px', textAlign: 'center', minHeight: '70vh' }}>
        <h2 style={{ fontSize: '2rem', color: '#0F2B4A', marginBottom: '20px' }}>Your Cart is Empty</h2>
        <Link href={`/${slug}/shop`} style={{ background: '#D4AF37', color: '#0F2B4A', padding: '15px 30px', borderRadius: '30px', textDecoration: 'none', fontWeight: 700 }}>Go Shopping</Link>
      </div>
    )
  }

  return (
    <div style={{ padding: '40px 20px', maxWidth: '800px', margin: '0 auto', minHeight: '80vh' }}>
      <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '2.5rem', color: '#0F2B4A', marginBottom: '30px' }}>Shopping Cart</h1>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '40px' }}>
        {cart.map(item => (
          <div key={item.id} style={{ display: 'flex', gap: '20px', background: '#fff', padding: '15px', borderRadius: '12px', border: '1px solid #eee' }}>
            <img src={item.image_url} style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px' }} />
            <div style={{ flex: 1 }}>
              <h3 style={{ margin: '0 0 5px 0', fontSize: '1.1rem', color: '#0F2B4A' }}>{item.item_name}</h3>
              <p style={{ margin: 0, fontWeight: 700, color: '#D4AF37' }}>₦{Number(item.selling_price).toLocaleString()}</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button onClick={() => updateQuantity(item.id, item.quantity - 1)} style={{ padding: '5px 10px', border: '1px solid #ddd', background: '#f9f9f9', borderRadius: '4px' }}>-</button>
              <span>{item.quantity}</span>
              <button onClick={() => updateQuantity(item.id, item.quantity + 1)} style={{ padding: '5px 10px', border: '1px solid #ddd', background: '#f9f9f9', borderRadius: '4px' }}>+</button>
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
