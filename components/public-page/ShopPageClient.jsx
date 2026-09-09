'use client'

import { useState, useMemo } from 'react'
import CheckoutModal from './CheckoutModal'

const COLORS = {
  bg: '#FAFAF9',
  surface: '#FFFFFF',
  border: '#E7E5E0',
  text: '#1E2430',
  textMuted: '#6B7280',
  navy: '#0F2B4A',
  navyDeep: '#0A1628',
  gold: '#C99A2E',
  goldSoft: '#F6ECD3',
  whatsapp: '#25D366',
  danger: '#B3441E',
  dangerSoft: '#FBEAE2',
}

function formatPrice(raw) {
  const num = parseFloat(String(raw).replace(/[^\d.]/g, ''))
  if (isNaN(num)) return raw
  return '₦' + num.toLocaleString('en-NG')
}

function CartIcon({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="21" r="1" />
      <circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.6 13.4a2 2 0 0 0 2 1.6h9.8a2 2 0 0 0 2-1.6L23 6H6" />
    </svg>
  )
}

export default function ShopPageClient({ business, page, shop }) {
  const [cartItems, setCartItems] = useState([])
  const [cartOpen, setCartOpen] = useState(false)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [query, setQuery] = useState('')

  const filteredShop = useMemo(() => {
    if (!query.trim()) return shop
    const q = query.toLowerCase()
    return shop.filter(
      (p) => p.name?.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q)
    )
  }, [shop, query])

  const addToCart = (product) => {
    if ((product.stock ?? 1) <= 0) return
    setCartItems((prev) => {
      const existing = prev.find((item) => item.name === product.name)
      if (existing) {
        return prev.map((item) =>
          item.name === product.name ? { ...item, quantity: item.quantity + 1 } : item
        )
      }
      return [...prev, { ...product, quantity: 1 }]
    })
  }

  const changeQuantity = (name, delta) => {
    setCartItems((prev) =>
      prev
        .map((item) => (item.name === name ? { ...item, quantity: item.quantity + delta } : item))
        .filter((item) => item.quantity > 0)
    )
  }

  const removeFromCart = (name) => setCartItems((prev) => prev.filter((item) => item.name !== name))

  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0)

  const getCartTotal = () => {
    return cartItems.reduce((sum, item) => {
      const price = parseFloat(String(item.price).replace(/[^\d.]/g, '')) || 0
      return sum + price * item.quantity
    }, 0)
  }

  const handleCheckoutSuccess = () => {
    setCartItems([])
    setCheckoutOpen(false)
    setCartOpen(false)
  }

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", minHeight: '100vh', background: COLORS.bg, color: COLORS.text }}>
      <style>{`
        .csoa-card { transition: transform 0.18s ease, box-shadow 0.18s ease; }
        .csoa-card:hover { transform: translateY(-3px); box-shadow: 0 10px 24px rgba(15,43,74,0.1); }
        .csoa-btn:focus-visible, .csoa-icon-btn:focus-visible, .csoa-input:focus-visible {
          outline: 2px solid ${COLORS.gold}; outline-offset: 2px;
        }
        .csoa-btn-primary { transition: background 0.15s ease; }
        .csoa-btn-primary:hover:not(:disabled) { background: #0A2038; }
        .csoa-btn-primary:disabled { background: #C9CDD3; cursor: not-allowed; }
        .csoa-icon-btn { transition: background 0.15s ease; }
        .csoa-icon-btn:hover { background: rgba(15,43,74,0.06); }
        @media (max-width: 380px) {
          .csoa-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* Header */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 100, background: 'rgba(250,250,249,0.95)',
        backdropFilter: 'blur(10px)', borderBottom: `1px solid ${COLORS.border}`,
        padding: '0.75rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem',
      }}>
        <a href={`/${page.slug}`} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', textDecoration: 'none', color: COLORS.text, minWidth: 0 }}>
          {business.logo_url ? (
            <img src={business.logo_url} alt={business.name} style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
          ) : (
            <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: COLORS.gold, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, flexShrink: 0 }}>
              {business.name.charAt(0)}
            </div>
          )}
          <span style={{ fontWeight: 700, fontSize: '1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{business.name}</span>
        </a>

        <button
          onClick={() => setCartOpen(true)}
          className="csoa-icon-btn"
          aria-label={`Cart, ${cartCount} item${cartCount === 1 ? '' : 's'}`}
          style={{
            position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: '42px', height: '42px', borderRadius: '10px', border: 'none', background: 'transparent',
            color: COLORS.navy, cursor: 'pointer', flexShrink: 0,
          }}
        >
          <CartIcon />
          {cartCount > 0 && (
            <span style={{
              position: 'absolute', top: '2px', right: '2px', background: COLORS.gold, color: '#fff',
              fontSize: '0.65rem', fontWeight: 800, borderRadius: '999px', minWidth: '17px', height: '17px',
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px',
            }}>
              {cartCount}
            </span>
          )}
        </button>
      </nav>

      {/* Page title + search */}
      <div style={{ padding: '2rem 1.25rem 1.25rem', textAlign: 'center', borderBottom: `1px solid ${COLORS.border}` }}>
        <h1 style={{ fontSize: '1.7rem', fontWeight: 700, margin: '0 0 0.35rem', letterSpacing: '-0.01em' }}>Our Shop</h1>
        <p style={{ color: COLORS.textMuted, fontSize: '0.95rem', margin: '0 0 1.1rem' }}>Browse our products</p>

        {shop.length > 0 && (
          <div style={{ maxWidth: '360px', margin: '0 auto' }}>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search products..."
              className="csoa-input"
              style={{
                width: '100%', padding: '0.6rem 0.9rem', borderRadius: '10px',
                border: `1px solid ${COLORS.border}`, background: COLORS.surface, fontSize: '0.9rem',
                boxSizing: 'border-box', color: COLORS.text,
              }}
            />
          </div>
        )}
      </div>

      {/* Product grid */}
      <div style={{ maxWidth: '1040px', margin: '0 auto', padding: '2rem 1.25rem' }}>
        {shop.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1.5rem', background: COLORS.surface, borderRadius: '14px', border: `1px solid ${COLORS.border}` }}>
            <p style={{ color: COLORS.textMuted, margin: 0 }}>No products yet. Check back soon!</p>
          </div>
        ) : filteredShop.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1.5rem', background: COLORS.surface, borderRadius: '14px', border: `1px solid ${COLORS.border}` }}>
            <p style={{ color: COLORS.textMuted, margin: 0 }}>No products match "{query}".</p>
          </div>
        ) : (
          <div className="csoa-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1.25rem' }}>
            {filteredShop.map((product, idx) => {
              const outOfStock = (product.stock ?? 1) <= 0
              return (
                <div
                  key={idx}
                  className="csoa-card"
                  style={{
                    background: COLORS.surface, borderRadius: '14px', overflow: 'hidden',
                    border: `1px solid ${COLORS.border}`, display: 'flex', flexDirection: 'column',
                    opacity: outOfStock ? 0.7 : 1,
                  }}
                >
                  <div style={{ position: 'relative', width: '100%', aspectRatio: '4 / 3', background: '#F3F4F6' }}>
                    {product.image_url ? (
                      <img src={product.image_url} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF', fontSize: '2rem' }}>
                        {product.name?.charAt(0) || '?'}
                      </div>
                    )}
                    {product.featured && (
                      <span style={{
                        position: 'absolute', top: '0.5rem', left: '0.5rem', background: COLORS.goldSoft,
                        color: '#8A6A16', fontSize: '0.68rem', fontWeight: 800, padding: '0.2rem 0.55rem', borderRadius: '999px',
                      }}>Featured</span>
                    )}
                    {outOfStock && (
                      <span style={{
                        position: 'absolute', top: '0.5rem', right: '0.5rem', background: COLORS.dangerSoft,
                        color: COLORS.danger, fontSize: '0.68rem', fontWeight: 800, padding: '0.2rem 0.55rem', borderRadius: '999px',
                      }}>Out of stock</span>
                    )}
                  </div>
                  <div style={{ padding: '0.9rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
                    <h4 style={{ margin: '0 0 0.25rem', fontWeight: 700, fontSize: '1rem' }}>{product.name}</h4>
                    <p style={{ color: COLORS.gold, fontWeight: 800, margin: '0 0 0.4rem', fontSize: '0.95rem' }}>{formatPrice(product.price)}</p>
                    {product.description && (
                      <p style={{ color: COLORS.textMuted, fontSize: '0.85rem', lineHeight: 1.5, flex: 1, margin: '0 0 0.7rem' }}>{product.description}</p>
                    )}
                    <button
                      onClick={() => addToCart(product)}
                      disabled={outOfStock}
                      className="csoa-btn csoa-btn-primary"
                      style={{
                        width: '100%', padding: '0.65rem', borderRadius: '9px', border: 'none',
                        background: COLORS.navy, color: '#fff', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer',
                      }}
                    >
                      {outOfStock ? 'Unavailable' : 'Add to Cart'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer style={{ background: COLORS.navyDeep, color: '#8899AA', padding: '1.5rem', textAlign: 'center', fontSize: '0.85rem' }}>
        © {new Date().getFullYear()} {business.name} · Powered by <span style={{ color: COLORS.gold, fontWeight: 700 }}>Cresoa</span>
      </footer>

      {/* Cart drawer */}
      {cartOpen && (
        <div
          onClick={() => setCartOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(10,22,40,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: '1rem' }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ background: COLORS.surface, borderRadius: '16px', padding: '1.5rem', maxWidth: '400px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ margin: '0 0 1rem', fontSize: '1.1rem', fontWeight: 800 }}>Your Cart</h3>
            {cartItems.length === 0 ? (
              <p style={{ color: COLORS.textMuted }}>Your cart is empty.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                {cartItems.map((item) => (
                  <div key={item.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ minWidth: 0 }}>
                      <strong style={{ display: 'block', fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</strong>
                      <div style={{ fontSize: '0.8rem', color: COLORS.textMuted }}>{formatPrice(item.price)}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
                      <button
                        onClick={() => changeQuantity(item.name, -1)}
                        aria-label={`Decrease ${item.name} quantity`}
                        style={{ width: '28px', height: '28px', borderRadius: '7px', border: `1px solid ${COLORS.border}`, background: COLORS.bg, cursor: 'pointer', fontWeight: 700 }}
                      >−</button>
                      <span style={{ minWidth: '18px', textAlign: 'center', fontWeight: 700, fontSize: '0.88rem' }}>{item.quantity}</span>
                      <button
                        onClick={() => changeQuantity(item.name, 1)}
                        aria-label={`Increase ${item.name} quantity`}
                        style={{ width: '28px', height: '28px', borderRadius: '7px', border: `1px solid ${COLORS.border}`, background: COLORS.bg, cursor: 'pointer', fontWeight: 700 }}
                      >+</button>
                      <button
                        onClick={() => removeFromCart(item.name)}
                        aria-label={`Remove ${item.name}`}
                        style={{ background: 'none', border: 'none', color: COLORS.danger, cursor: 'pointer', fontWeight: 700, fontSize: '1.1rem', lineHeight: 1, padding: '0 0.15rem' }}
                      >×</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {cartItems.length > 0 && (
              <div style={{ marginTop: '1.1rem', borderTop: `1px solid ${COLORS.border}`, paddingTop: '0.9rem', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ color: COLORS.textMuted, fontSize: '0.85rem' }}>Total</span>
                <strong style={{ fontSize: '1.1rem' }}>{formatPrice(getCartTotal())}</strong>
              </div>
            )}
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.4rem' }}>
              <button onClick={() => setCartOpen(false)} style={{ flex: 1, padding: '0.7rem', borderRadius: '9px', border: `1px solid ${COLORS.border}`, background: COLORS.surface, color: COLORS.text, cursor: 'pointer', fontWeight: 600 }}>
                Continue shopping
              </button>
              <button
                onClick={() => { setCartOpen(false); setCheckoutOpen(true) }}
                disabled={cartItems.length === 0}
                style={{ flex: 1, padding: '0.7rem', borderRadius: '9px', border: 'none', background: COLORS.whatsapp, color: '#fff', fontWeight: 700, cursor: cartItems.length === 0 ? 'not-allowed' : 'pointer', opacity: cartItems.length === 0 ? 0.6 : 1 }}
              >
                Checkout via WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Checkout modal */}
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
          
