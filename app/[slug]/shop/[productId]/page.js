// app/[slug]/shop/[productId]/page.js
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

  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true)
      // 1. Resolve business from slug
      const { data: page } = await supabase
        .from('business_public_pages')
        .select('business_id, is_enabled')
        .eq('slug', String(slug).toLowerCase())
        .maybeSingle()

      if (!page?.is_enabled) { setProduct(null); setLoading(false); return }

      // 2. Fetch product SCOPED to that business
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

  if (loading) return <div style={{ padding: '50px', textAlign: 'center' }}>Loading...</div>
  if (!product) return <div style={{ padding: '50px', textAlign: 'center' }}>Product not found</div>

  const stock = Number(product.quantity_on_hand) || 0
  const isOutOfStock = stock === 0
  const maxQty = Math.max(1, stock)

  const safeAdd = () => {
    const qty = Math.min(quantity, stock)
    if (qty < 1) return
    addToCart(product, qty)
    router.push(`/${slug}/cart`)
  }

  return (
    <div style={{ padding: '40px 20px', maxWidth: '1000px', margin: '0 auto', minHeight: '80vh', fontFamily: "'Inter', sans-serif" }}>
      <Link href={`/${slug}/shop`} style={{ color: '#D4AF37', textDecoration: 'none', fontWeight: 600 }}>← Back to Shop</Link>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '40px', marginTop: '20px' }}>
        <div style={{ borderRadius: '20px', overflow: 'hidden', background: '#fff', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
          {product.image_url
            ? <img src={product.image_url} alt={product.item_name} style={{ width: '100%', height: '100%', maxHeight: '600px', objectFit: 'cover' }} />
            : <div style={{ height: '500px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5' }}>No Image</div>}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '2.5rem', color: '#0F2B4A', margin: '0 0 10px 0' }}>{product.item_name}</h1>
          <p style={{ fontSize: '2rem', fontWeight: 800, color: '#D4AF37', margin: '0 0 20px 0' }}>
            ₦{Number(product.selling_price).toLocaleString()}
          </p>
          <p style={{ fontSize: '1rem', lineHeight: 1.6, color: '#555', marginBottom: '30px' }}>
            {product.web_description || product.description || 'No description available.'}
          </p>

          {!isOutOfStock && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '30px' }}>
              <span style={{ fontWeight: 600 }}>Quantity:</span>
              <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #ddd', borderRadius: '30px', overflow: 'hidden' }}>
                <button onClick={() => setQuantity(Math.max(1, quantity - 1))} style={{ padding: '10px 20px', background: '#f9f9f9', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}>-</button>
                <span style={{ padding: '0 20px', fontWeight: 700 }}>{quantity}</span>
                <button onClick={() => setQuantity(Math.min(maxQty, quantity + 1))} disabled={quantity >= maxQty} style={{ padding: '10px 20px', background: '#f9f9f9', border: 'none', cursor: quantity >= maxQty ? 'not-allowed' : 'pointer', fontSize: '1.2rem', opacity: quantity >= maxQty ? 0.4 : 1 }}>+</button>
              </div>
              <span style={{ fontSize: '0.85rem', color: '#999' }}>{stock} in stock</span>
            </div>
          )}

          <div style={{ display: 'flex', gap: '15px', flexDirection: 'column' }}>
            <button onClick={safeAdd} disabled={isOutOfStock} style={{ background: isOutOfStock ? '#ccc' : '#0F2B4A', color: '#fff', padding: '16px', borderRadius: '30px', fontSize: '1rem', fontWeight: 700, border: 'none', cursor: isOutOfStock ? 'not-allowed' : 'pointer' }}>
              {isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
            </button>
            <button onClick={safeAdd} disabled={isOutOfStock} style={{ background: isOutOfStock ? '#ccc' : '#D4AF37', color: isOutOfStock ? '#fff' : '#0F2B4A', padding: '16px', borderRadius: '30px', fontSize: '1rem', fontWeight: 700, border: 'none', cursor: isOutOfStock ? 'not-allowed' : 'pointer' }}>
              {isOutOfStock ? 'Out of Stock' : 'Buy Now'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
