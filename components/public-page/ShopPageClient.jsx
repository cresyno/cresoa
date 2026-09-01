'use client'

import { useState } from 'react'
import { getTemplate } from '../../lib/templateRegistry'
import CartModal from './CartModal'

export default function ShopPageClient({ business, page, shop, templateId }) {
  const [cartItems, setCartItems] = useState([])
  const [cartOpen, setCartOpen] = useState(false)
  const Template = getTemplate(templateId)

  const addToCart = (product) => {
    setCartItems(prev => {
      const existing = prev.find(item => item.name === product.name)
      if (existing) return prev.map(item => item.name === product.name ? { ...item, quantity: item.quantity + 1 } : item)
      return [...prev, { ...product, quantity: 1 }]
    })
  }

  const removeFromCart = (name) => setCartItems(prev => prev.filter(item => item.name !== name))
  const getCartTotal = () => cartItems.reduce((sum, item) => { const price = parseFloat(item.price.replace(/[^\d.]/g, '')) || 0; return sum + (price * item.quantity) }, 0)

  const handleCheckout = () => {
    if (!cartItems.length) return
    const customerName = prompt('What is your name?') || 'Customer'
    const customerPhone = prompt('What is your phone number?') || ''
    const customerAddress = prompt('What is your delivery address?') || ''
    const itemsText = cartItems.map(item => `- ${item.name} (x${item.quantity}) - ${item.price}`).join('\n')
    const totalText = `Total: ₦${getCartTotal().toLocaleString()}`
    const message = `Hello ${business.name},\n\nI would like to order:\n\n${itemsText}\n\n${totalText}\n\nName: ${customerName}\nPhone: ${customerPhone}\nAddress: ${customerAddress}`
    const waUrl = `https://wa.me/${business.phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`
    window.open(waUrl, '_blank')
    setCartItems([])
    setCartOpen(false)
  }

  return (
    <div>
      <Template business={business} page={{ ...page, has_shop: true, has_services: false }} services={[]} shop={shop} portfolio={[]} reviews={[]} onQuoteClick={() => {}} onReviewClick={() => {}} />
      {cartItems.length > 0 && <button onClick={() => setCartOpen(true)} style={{ position: 'fixed', bottom: '20px', right: '20px', background: '#25D366', color: '#fff', padding: '1rem 1.5rem', borderRadius: '999px', border: 'none', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 14px rgba(37,211,102,0.4)', zIndex: 1000 }}>🛒 Cart ({cartItems.length})</button>}
      <CartModal open={cartOpen} onClose={() => setCartOpen(false)} cartItems={cartItems} onRemove={removeFromCart} onCheckout={handleCheckout} />
    </div>
  )
}
