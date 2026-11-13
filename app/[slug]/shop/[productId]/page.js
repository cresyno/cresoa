'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { useCart } from '@/lib/CartContext'
import Link from 'next/link'

export default function ProductPage() {
  const { slug, productId } = useParams()
  const router = useRouter()
  const { addToCart } = useCart()
  
  const [product, setProduct] = useState(null)
  const [quantity, setQuantity] = useState(1)
  const [loading, setLoading] = useState(true)
  const [showDetails, setShowDetails] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true)
      
      // 1. Fetch the business page
      const { data: page, error: pageError } = await supabase
        .from('business_public_pages')
        .select('business_id, is_enabled')
        .eq('slug', String(slug).toLowerCase())
        .maybeSingle()

      if (pageError || !page?.is_enabled) { 
        setError(true)
        setLoading(false)
        return 
      }

      // 2. Fetch the exact product
      const { data, error: productError } = await supabase
        .from('inventory_items')
        .select('*')
        .eq('id', productId)
        .eq('business_id', page.business_id)
        .eq('is_listed_on_website', true)
        .maybeSingle()

      if (productError || !data) {
        setError(true)
      } else {
        setProduct(data)
      }
      setLoading(false)
    }
    fetchProduct()
  }, [productId, slug])

  // ── LOADING SKELETON ──
  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', md: 'row', minHeight: '100vh', background: '#FFFFFF' }} className="product-layout">
        <div style={{ flex: 1, background: '#F5F5F5', height: '50vh' }} className="skeleton-image" />
        <div style={{ flex: 1, padding: '40px 20px' }}>
          <div style={{ width: '150px', height: '15px', background: '#EEE', marginBottom: '20px' }} />
          <div style={{ width: '80%', height: '40px', background: '#EEE', marginBottom: '20px' }} />
          <div style={{ width: '100px', height: '30px', background: '#EEE', marginBottom: '30px' }} />
          <div style={{ width: '100%', height: '100px', background: '#EEE' }} />
        </div>
      </div>
    )
  }

  // ── NOT FOUND / ERROR STATE ──
  if (error || !product) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#FAFAF9', padding: '20px', textAlign: 'center' }}>
        <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#F0F0F0', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        </div>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '2rem', color: '#0F2B4A', margin: '0 0 10px 0' }}>Piece Unavailable</h2>
        <p style={{ color: '#666', marginBottom: '30px', maxWidth: '400px' }}>This item may have been sold out or removed from the collection.</p>
        <Link href={`/${slug}/shop`} style={{ background: '#0F2B4A', color: '#FFF', padding: '12px 30px', textDecoration: 'none', borderRadius: '4px', fontWeight: 600 }}>
          Return to Collection
        </Link>
      </div>
    )
  }

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
