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

  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true)
      const { data: page } = await supabase
        .from('business_public_pages')
        .select('business_id, is_enabled')
        .eq('slug', String(slug).toLowerCase())
        .maybeSingle()

      if (!page?.is_enabled) { setProduct(null); setLoading(false); return }

      const { data } = await supabase
        .from('inventory_items')
        .select('*')
        .eq('id', productId)
        .eq('business_id', page.business_id)
        .eq('is_listed_on_website', true)
        .maybeSingle()

      setProduct(data || null)
      setLoading(false)
    }
    fetchProduct()
  }, [productId, slug])

  if (loading) return <div style={{ padding: '100px', textAlign: 'center', color: '#0F2B4A', fontWeight: 600 }}>Loading...</div>
  if (!product) return <div style={{ padding: '100px', textAlign: 'center', fontFamily: "'Inter', sans-serif" }}><h2 style={{ color: '#0F2B4A' }}>Product Not Found</h2><Link href={`/${slug}/shop`} style={{ color: '#D4AF37', marginTop: '20px', display: 'inline-block' }}>Back to Shop</Link></div>

  const stock = Number(product.quantity_on_hand) || 0
  const isOutOfStock = stock === 0
  const maxQty = Math.max(1, stock)

  const handleAdd = () => {
    if (isOutOfStock) return
    addToCart(product, Math.min(quantity, stock))
    router.push(`/${slug}/cart`)
  }

  return (
    <div style={{ background: '#FFFFFF', minHeight: '100vh', fontFamily: "'Inter', sans-serif", paddingBottom: '100px' }}>
      
      {/* SIMPLE HEADER */}
      <header style={{ padding: '20px', textAlign: 'center', borderBottom: '1px solid #F0F0F0', position: 'sticky', top: 0, background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(10px)', zIndex: 100 }}>
        <Link href={`/${slug}/shop`} style={{ textDecoration: 'none', color: '#0F2B4A', fontSize: '0.9rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
          Back to Collection
        </Link>
      </header>

      <main style={{ maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* DESKTOP: SPLIT SCREEN, MOBILE: STACKED */}
        <div style={{ display: 'flex', flexDirection: 'column', '@media(minWidth: 768px)': { flexDirection: 'row' } }}>
          
          {/* IMAGE SECTION */}
          <div style={{ flex: 1, background: '#F9F9F9' }}>
            {product.image_url ? (
              <img 
                src={product.image_url} 
                alt={product.item_name} 
                style={{ width: '100%', height: '100%', maxHeight: '80vh', objectFit: 'contain', display: 'block' }} 
              />
            ) : (
              <div style={{ height: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#CCC' }}>No Image</div>
            )}
          </div>

          {/* DETAILS SECTION */}
          <div style={{ flex: 1, padding: '40px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <p style={{ color: '#D4AF37', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '2px', margin: '0 0 10px 0' }}>
              {product.category || 'Exclusive Collection'}
            </p>
            <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '2.5rem', color: '#0F2B4A', margin: '0 0 15px 0', lineHeight: 1.1 }}>
              {product.item_name}
            </h1>
            <p style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0F2B4A', margin: '0 0 30px 0' }}>
              ₦{Number(product.selling_price).toLocaleString()}
            </p>

            <p style={{ fontSize: '1rem', lineHeight: 1.8, color: '#555', marginBottom: '30px' }}>
              {product.web_description || 'Crafted with premium materials and meticulous attention to detail. This piece is designed to make a statement.'}
            </p>

            {/* ACCORDION FOR DETAILS */}
            <div style={{ borderTop: '1px solid #EAEAEA', borderBottom: '1px solid #EAEAEA', marginBottom: '30px' }}>
              <button 
                onClick={() => setShowDetails(!showDetails)}
                style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 0', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.95rem', fontWeight: 700, color: '#0F2B4A' }}
              >
                Details & Care
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: showDetails ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s' }}><polyline points="6 9 12 15 18 9" /></svg>
              </button>
              {showDetails && (
                <div style={{ paddingBottom: '20px', fontSize: '0.9rem', color: '#666', lineHeight: 1.6 }}>
                  <p style={{ margin: 0 }}>Premium hand-finished tailoring. Dry clean only. Do not bleach. Iron on low heat.</p>
                  <p style={{ margin: '10px 0 0 0' }}>Please allow 3-5 business days for delivery within Nigeria.</p>
                </div>
              )}
            </div>

            {/* QUANTITY & ADD TO CART (DESKTOP) */}
            {!isOutOfStock ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #EAEAEA', borderRadius: '8px', width: 'fit-content' }}>
                  <button onClick={() => setQuantity(Math.max(1, quantity - 1))} style={{ padding: '15px 20px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}>-</button>
                  <span style={{ padding: '0 20px', fontWeight: 700 }}>{quantity}</span>
                  <button onClick={() => setQuantity(Math.min(maxQty, quantity + 1))} disabled={quantity >= maxQty} style={{ padding: '15px 20px', background: 'none', border: 'none', cursor: quantity >= maxQty ? 'not-allowed' : 'pointer', fontSize: '1.2rem', opacity: quantity >= maxQty ? 0.3 : 1 }}>+</button>
                </div>
                
                <button 
                  onClick={handleAdd}
                  style={{ width: '100%', padding: '18px', background: '#0F2B4A', color: '#FFF', border: 'none', borderRadius: '8px', fontSize: '1rem', fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '1px' }}
                >
                  Add to Cart
                </button>
              </div>
            ) : (
              <div style={{ padding: '20px', background: '#FFF0F0', color: '#FF3B30', borderRadius: '8px', fontWeight: 700, textAlign: 'center' }}>
                Out of Stock
              </div>
            )}

          </div>
        </div>
      </main>

      {/* STICKY MOBILE ADD TO CART BAR */}
      {!isOutOfStock && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#FFF', padding: '15px 20px', borderTop: '1px solid #EAEAEA', display: 'flex', gap: '15px', zIndex: 100, boxShadow: '0 -4px 15px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #EAEAEA', borderRadius: '8px' }}>
            <button onClick={() => setQuantity(Math.max(1, quantity - 1))} style={{ padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer' }}>-</button>
            <span style={{ padding: '0 10px', fontWeight: 700 }}>{quantity}</span>
            <button onClick={() => setQuantity(Math.min(maxQty, quantity + 1))} disabled={quantity >= maxQty} style={{ padding: '12px 16px', background: 'none', border: 'none', cursor: quantity >= maxQty ? 'not-allowed' : 'pointer', opacity: quantity >= maxQty ? 0.3 : 1 }}>+</button>
          </div>
          <button 
            onClick={handleAdd}
            style={{ flex: 1, background: '#0F2B4A', color: '#FFF', border: 'none', borderRadius: '8px', fontSize: '0.95rem', fontWeight: 700, cursor: 'pointer' }}
          >
            Add to Cart — ₦{(Number(product.selling_price) * quantity).toLocaleString()}
          </button>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        @media (min-width: 768px) {
          main > div { flex-direction: row !important; }
          main > div > div:first-child { border-right: 1px solid #EAEAEA; }
          div[style*="position: 'fixed'"] { display: none !important; }
        }
      `}} />
    </div>
  )
                }
