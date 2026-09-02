'use client'

import { useState } from 'react'
import CheckoutModal from './CheckoutModal'

export default function ShopPageClient({ business, page, shop }) {
  const [cartItems, setCartItems] = useState([])
  const [cartOpen, setCartOpen] = useState(false)
  const [checkoutOpen, setCheckoutOpen] = useState(false)

  const addToCart = (product) => {
    setCartItems(prev => {
      const existing = prev.find(item => item.name === product.name)
      if (existing) return prev.map(item => item.name === product.name ? { ...item, quantity: item.quantity + 1 } : item)
      return [...prev, { ...product, quantity: 1 }]
    })
  }

  const removeFromCart = (name) => setCartItems(prev => prev.filter(item => item.name !== name))

  const getCartTotal = () => {
    return cartItems.reduce((sum, item) => {
      const price = parseFloat(item.price.replace(/[^\d.]/g, '')) || 0
      return sum + (price * item.quantity)
    }, 0)
  }

  const handleCheckoutSuccess = () => {
    setCartItems([])
    setCheckoutOpen(false)
    setCartOpen(false)
  }

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", minHeight: '100vh', background: '#FAFAF9', color: '#1E293B' }}>
      {/* Header */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(250,250,249,0.95)', backdropFilter: 'blur(10px)', borderBottom: '1px solid #E5E7EB', padding: '0.8rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <a href={`/${page.slug}`} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', textDecoration: 'none', color: '#1E293B' }}>
          {business.logo_url ? (
            <img src={business.logo_url} alt={business.name} style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'contain' }} />
          ) : (
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#D4A52A', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800 }}>{business.name.charAt(0)}</div>
          )}
          <span style={{ fontWeight: 600, fontSize: '1.1rem' }}>{business.name}</span>
        </a>
        <a href={`/${page.slug}`} style={{ textDecoration: 'none', color: '#6B7280', fontSize: '0.85rem', fontWeight: 500 }}>← Back to Home</a>
      </nav>

      {/* Header */}
      <div style={{ padding: '2rem 1.5rem', textAlign: 'center', borderBottom: '1px solid #E5E7EB' }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 400, margin: '0 0 0.5rem' }}>Our Shop</h1>
        <p style={{ color: '#6B7280', fontSize: '1rem' }}>Browse our products</p>
      </div>

      {/* Product Grid */}
      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '2rem 1.5rem' }}>
        {shop.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', background: '#fff', borderRadius: '12px' }}>
            <p style={{ color: '#6B7280' }}>No products yet. Check back soon!</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1.5rem' }}>
            {shop.map((product, idx) => (
              <div key={idx} style={{ background: '#fff', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column' }}>
                {product.image_url ? (
                  <img src={product.image_url} alt={product.name} style={{ width: '100%', height: '220px', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '100%', height: '220px', background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF', fontSize: '2rem' }}>
                    {product.name?.charAt(0) || '?'}
                  </div>
                )}
                <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
                  <h4 style={{ margin: '0 0 0.3rem', fontWeight: 600, fontSize: '1.1rem' }}>{product.name}</h4>
                  <p style={{ color: '#D4A52A', fontWeight: 700, margin: '0 0 0.5rem' }}>{product.price}</p>
                  <p style={{ color: '#6B7280', fontSize: '0.9rem', lineHeight: 1.5, flex: 1 }}>{product.description}</p>
                  <button onClick={() => addToCart(product)} style={{ marginTop: '0.5rem', width: '100%', padding: '0.7rem', borderRadius: '8px', border: 'none', background: '#0F2B4A', color: '#fff', fontWeight: 600, cursor: 'pointer', transition: 'background 0.2s' }}>
                    Add to Cart
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer style={{ background: '#0A1628', color: '#8899AA', padding: '1.5rem', textAlign: 'center', fontSize: '0.85rem' }}>
        © {new Date().getFullYear()} {business.name} · Powered by <span style={{ color: '#D4A52A', fontWeight: 700 }}>Cresoa</span>
      </footer>

      {/* Floating Cart Button */}
      {cartItems.length > 0 && (
        <button onClick={() => setCartOpen(true)} style={{ position: 'fixed', bottom: '20px', right: '20px', background: '#25D366', color: '#fff', padding: '1rem 1.5rem', borderRadius: '999px', border: 'none', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 14px rgba(37,211,102,0.4)', zIndex: 1000 }}>
          🛒 Cart ({cartItems.length}) - ₦{getCartTotal().toLocaleString()}
        </button>
      )}

      {/* Cart Modal */}
      <CartModal
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        cartItems={cartItems}
        onRemove={removeFromCart}
        onCheckout={() => {
          setCartOpen(false)
          setCheckoutOpen(true)
        }}
      />

      {/* Checkout Modal */}
      {checkoutOpen && (
        <CheckoutModal
          open={checkoutOpen}
          onClose={() => setCheckoutOpen(false)}
          cartItems={cartItems}
          business={business}
          page={page}
          onSuccess={handleCheckoutSuccess}
        />
      )}
    </div>
  )
}
