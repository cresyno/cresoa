'use client';
import { useState } from 'react'
import { useRouter } from 'next/navigation';
import { useCart } from '@/lib/CartContext'
import Link from 'next/link'

export default function ProductClient({ product, business, slug }) {
  const router = useRouter()
  const { addToCart } = useCart()
  
  const [quantity, setQuantity] = useState(1)
  const [showDetails, setShowDetails] = useState(false)

  const stock = Number(product.quantity_on_hand) || 0
  const isOutOfStock = stock === 0
  const maxQty = Math.max(1, stock)

  const handleAdd = () => {
    if (isOutOfStock) return
    addToCart(product, Math.min(quantity, stock))
    router.push(`/${slug}/cart`)
  }

  return (
    <div style={{ background: '#FFFFFF', minHeight: '100vh', fontFamily: "'Inter', sans-serif", paddingBottom: '90px' }}>
      
      {/* PREMIUM HEADER */}
      <header style={{ padding: '20px', textAlign: 'center', borderBottom: '1px solid #F0F0F0', position: 'sticky', top: 0, background: 'rgba(255,255,255,0.98)', backdropFilter: 'blur(10px)', zIndex: 100 }}>
        <Link href={`/${slug}/shop`} style={{ textDecoration: 'none', color: '#0F2B4A', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
          Back
        </Link>
      </header>

      {/* MAIN LAYOUT */}
      <main className="product-layout" style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
        
        {/* IMAGE */}
        <div style={{ flex: 1, background: '#F9F9F9', position: 'relative', aspectRatio: '4/5', maxHeight: '80vh' }}>
          {product.image_url ? (
            <img src={product.image_url} alt={product.item_name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#CCC' }}>No Image</div>
          )}
        </div>

        {/* DETAILS */}
        <div style={{ flex: 1, padding: '40px 24px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          
          <p style={{ color: '#D4AF37', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '2px', margin: '0 0 12px 0' }}>
            {product.category || 'Exclusive Collection'}
          </p>
          
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '2.5rem', color: '#0F2B4A', margin: '0 0 16px 0', lineHeight: 1.15 }}>
            {product.item_name}
          </h1>
          
          <p style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0F2B4A', margin: '0 0 30px 0' }}>
            ₦{Number(product.selling_price).toLocaleString()}
          </p>

          <p style={{ fontSize: '1rem', lineHeight: 1.8, color: '#555', marginBottom: '40px' }}>
            {product.web_description || 'Crafted with premium materials and meticulous attention to detail. This piece is designed to make a statement.'}
          </p>

          {/* ACCORDION */}
          <div style={{ borderTop: '1px solid #EAEAEA', borderBottom: '1px solid #EAEAEA', marginBottom: '40px' }}>
            <button 
              onClick={() => setShowDetails(!showDetails)}
              style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 0', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.95rem', fontWeight: 700, color: '#0F2B4A', textTransform: 'uppercase', letterSpacing: '1px' }}
            >
              Details & Care
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: showDetails ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s' }}><polyline points="6 9 12 15 18 9" /></svg>
            </button>
            {showDetails && (
              <div style={{ paddingBottom: '20px', fontSize: '0.9rem', color: '#666', lineHeight: 1.8 }}>
                <p style={{ margin: 0 }}>Premium hand-finished tailoring. Dry clean only. Do not bleach. Iron on low heat.</p>
                <p style={{ margin: '10px 0 0 0' }}>Please allow 3-5 business days for delivery within Nigeria.</p>
              </div>
            )}
          </div>

          {/* QUANTITY & ADD TO CART (DESKTOP) */}
          {!isOutOfStock ? (
            <div className="desktop-checkout" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #EAEAEA', borderRadius: '4px', width: 'fit-content' }}>
                <button onClick={() => setQuantity(Math.max(1, quantity - 1))} style={{ padding: '15px 20px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: '#0F2B4A' }}>-</button>
                <span style={{ padding: '0 20px', fontWeight: 700 }}>{quantity}</span>
                <button onClick={() => setQuantity(Math.min(maxQty, quantity + 1))} disabled={quantity >= maxQty} style={{ padding: '15px 20px', background: 'none', border: 'none', cursor: quantity >= maxQty ? 'not-allowed' : 'pointer', fontSize: '1.2rem', opacity: quantity >= maxQty ? 0.3 : 1, color: '#0F2B4A' }}>+</button>
              </div>
              
              <button 
                onClick={handleAdd}
                style={{ width: '100%', padding: '20px', background: '#0F2B4A', color: '#FFF', border: 'none', borderRadius: '4px', fontSize: '1rem', fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '2px', transition: 'background 0.3s' }}
                onMouseOver={(e) => e.target.style.background = '#1A3F66'}
                onMouseOut={(e) => e.target.style.background = '#0F2B4A'}
              >
                Add to Cart
              </button>
            </div>
          ) : (
            <div style={{ padding: '20px', background: '#FFF0F0', color: '#D9534F', borderRadius: '4px', fontWeight: 700, textAlign: 'center', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Sold Out
            </div>
          )}

        </div>
      </main>

      {/* STICKY MOBILE CHECKOUT BAR */}
      {!isOutOfStock && (
        <div className="mobile-checkout-bar">
          <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #EAEAEA', borderRadius: '4px' }}>
            <button onClick={() => setQuantity(Math.max(1, quantity - 1))} style={{ padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', color: '#0F2B4A' }}>-</button>
            <span style={{ padding: '0 10px', fontWeight: 700 }}>{quantity}</span>
            <button onClick={() => setQuantity(Math.min(maxQty, quantity + 1))} disabled={quantity >= maxQty} style={{ padding: '12px 16px', background: 'none', border: 'none', cursor: quantity >= maxQty ? 'not-allowed' : 'pointer', opacity: quantity >= maxQty ? 0.3 : 1, color: '#0F2B4A' }}>+</button>
          </div>
          <button 
            onClick={handleAdd}
            style={{ flex: 1, background: '#0F2B4A', color: '#FFF', border: 'none', borderRadius: '4px', fontSize: '0.95rem', fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '1px' }}
          >
            Add — ₦{(Number(product.selling_price) * quantity).toLocaleString()}
          </button>
        </div>
      )}

      {/* CORRECT WAY TO HANDLE RESPONSIVE CSS IN REACT */}
      <style dangerouslySetInnerHTML={{__html: `
        .mobile-checkout-bar {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          background: #FFF;
          padding: 15px 20px;
          border-top: 1px solid #EAEAEA;
          display: flex;
          gap: 15px;
          z-index: 100;
          box-shadow: 0 -4px 20px rgba(0,0,0,0.05);
        }
        
        @media (min-width: 768px) {
          .product-layout {
            flex-direction: row !important;
          }
          .product-layout > div:first-child {
            border-right: 1px solid #EAEAEA;
            height: 100vh;
            position: sticky;
            top: 0;
            aspect-ratio: auto !important;
          }
          .mobile-checkout-bar {
            display: none !important;
          }
          .desktop-checkout {
            display: flex !important;
          }
        }
      `}} />
    </div>
  )
}
