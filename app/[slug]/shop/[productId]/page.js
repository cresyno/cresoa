'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useCart } from '@/lib/CartContext'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function ProductPage({ params }) {
  const { slug, productId } = params
  const router = useRouter()
  const { addToCart } = useCart()
  
  const [product, setProduct] = useState(null)
  const [quantity, setQuantity] = useState(1)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchProduct = async () => {
      const { data } = await supabase.from('inventory_items').select('*').eq('id', productId).single()
      setProduct(data)
      setLoading(false)
    }
    fetchProduct()
  }, [productId])

  if (loading) return <div style={{ padding: '50px', textAlign: 'center' }}>Loading...</div>
  if (!product) return <div style={{ padding: '50px', textAlign: 'center' }}>Product not found</div>

  const isOutOfStock = Number(product.quantity_on_hand) === 0

  const handleAddToCart = () => {
    addToCart(product, quantity)
    router.push(`/${slug}/cart`)
  }

  const handleBuyNow = () => {
    addToCart(product, quantity)
    router.push(`/${slug}/checkout`)
  }

  return (
    <div style={{ padding: '40px 20px', maxWidth: '1000px', margin: '0 auto', minHeight: '80vh' }}>
      <Link href={`/${slug}/shop`} style={{ color: '#D4AF37', textDecoration: 'none', fontWeight: 600 }}>← Back to Shop</Link>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '40px', marginTop: '20px' }}>
        <div style={{ borderRadius: '20px', overflow: 'hidden', background: '#fff', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
          {product.image_url ? (
             <img src={product.image_url} alt={product.item_name} style={{ width: '100%', height: '100%', maxHeight: '600px', objectFit: 'cover' }} />
          ) : (
             <div style={{ height: '500px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5' }}>No Image</div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '2.5rem', color: '#0F2B4A', margin: '0 0 10px 0' }}>{product.item_name}</h1>
          <p style={{ fontSize: '2rem', fontWeight: 800, color: '#D4AF37', margin: '0 0 20px 0' }}>₦{Number(product.selling_price).toLocaleString()}</p>
          
          <p style={{ fontSize: '1rem', lineHeight: 1.6, color: '#555', marginBottom: '30px' }}>
            {product.web_description || product.description || 'No description available.'}
          </p>

          {!isOutOfStock && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '30px' }}>
              <span style={{ fontWeight: 600 }}>Quantity:</span>
              <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #ddd', borderRadius: '30px', overflow: 'hidden' }}>
                <button onClick={() => setQuantity(Math.max(1, quantity - 1))} style={{ padding: '10px 20px', background: '#f9f9f9', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}>-</button>
                <span style={{ padding: '0 20px', fontWeight: 700 }}>{quantity}</span>
                <button onClick={() => setQuantity(quantity + 1)} style={{ padding: '10px 20px', background: '#f9f9f9', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}>+</button>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '15px', flexDirection: 'column' }}>
            <button onClick={handleAddToCart} disabled={isOutOfStock} style={{ background: isOutOfStock ? '#ccc' : '#0F2B4A', color: '#fff', padding: '16px', borderRadius: '30px', fontSize: '1rem', fontWeight: 700, border: 'none', cursor: isOutOfStock ? 'not-allowed' : 'pointer' }}>
              {isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
            </button>
            <button onClick={handleBuyNow} disabled={isOutOfStock} style={{ background: isOutOfStock ? '#ccc' : '#D4AF37', color: isOutOfStock ? '#fff' : '#0F2B4A', padding: '16px', borderRadius: '30px', fontSize: '1rem', fontWeight: 700, border: 'none', cursor: isOutOfStock ? 'not-allowed' : 'pointer' }}>
              {isOutOfStock ? 'Out of Stock' : 'Buy Now'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
