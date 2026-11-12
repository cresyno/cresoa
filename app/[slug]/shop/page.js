import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    global: {
      fetch: (url, options) => fetch(url, { ...options, cache: 'no-store' })
    }
  }
)

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function ShopPage({ params }) {
  const { slug } = await params
  
  const { data: page } = await supabaseAdmin
    .from('business_public_pages')
    .select('*')
    .eq('slug', slug)
    .eq('is_enabled', true)
    .maybeSingle()

  if (!page) notFound()

  // Fetch business details for the header/logo
  const { data: business } = await supabaseAdmin
    .from('businesses')
    .select('name, logo_url')
    .eq('id', page.business_id)
    .single()

  const { data: products } = await supabaseAdmin
    .from('inventory_items')
    .select('*')
    .eq('business_id', page.business_id)
    .eq('is_listed_on_website', true)
    .order('created_at', { ascending: false })

  return (
    <div style={{ background: '#FFFFFF', minHeight: '100vh', fontFamily: "'Inter', sans-serif" }}>
      
      {/* 🌟 PREMIUM STICKY HEADER */}
      <header style={{ 
        padding: '20px', 
        borderBottom: '1px solid #F0F0F0', 
        position: 'sticky', 
        top: 0, 
        background: 'rgba(255,255,255,0.98)', 
        backdropFilter: 'blur(10px)', 
        zIndex: 100, 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center' 
      }}>
        <Link href={`/${slug}`} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px' }}>
          {business?.logo_url ? (
            <img src={business.logo_url} alt="Logo" style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} />
          ) : null}
          <span style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.2rem', color: '#0F2B4A', fontWeight: 700, letterSpacing: '1px' }}>
            {business?.name || 'Boutique'}
          </span>
        </Link>
        <Link href={`/${slug}`} style={{ textDecoration: 'none', color: '#666', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>
          Home
        </Link>
      </header>

      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 20px' }}>
        
        {/* 🌟 SHOP TITLE */}
        <div style={{ textAlign: 'center', marginBottom: '50px' }}>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '2.5rem', color: '#0F2B4A', margin: '0 0 10px 0' }}>
            The Collection
          </h1>
          <p style={{ color: '#888', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '3px', margin: 0 }}>
            {products?.length || 0} Pieces Available
          </p>
        </div>

        {!products?.length ? (
          <div style={{ textAlign: 'center', padding: '80px 20px' }}>
            <h3 style={{ color: '#0F2B4A', fontFamily: "'Playfair Display', serif", fontSize: '1.5rem' }}>New arrivals coming soon.</h3>
            <Link href={`/${slug}`} style={{ display: 'inline-block', marginTop: '20px', color: '#D4AF37', textDecoration: 'none', fontWeight: 600, borderBottom: '1px solid #D4AF37' }}>Return to Home</Link>
          </div>
        ) : (
          /* 🌟 PREMIUM PRODUCT GRID */
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', 
            gap: '30px 20px' 
          }}>
            {products.map((product) => (
              <Link key={product.id} href={`/${slug}/shop/${product.id}`} style={{ textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column' }}>
                
                {/* Image Container with Fixed 4:5 Ratio */}
                <div style={{ position: 'relative', width: '100%', aspectRatio: '4/5', background: '#F7F7F7', overflow: 'hidden', borderRadius: '4px' }}>
                  {product.image_url ? (
                    <img 
                      src={product.image_url} 
                      alt={product.item_name} 
                      style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.8s ease' }} 
                      className="premium-product-img"
                    />
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#CCC' }}>No Image</div>
                  )}
                  
                  {/* Out of Stock Overlay */}
                  {product.quantity_on_hand <= 0 && (
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ border: '1px solid #0F2B4A', color: '#0F2B4A', padding: '5px 15px', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>Sold Out</span>
                    </div>
                  )}
                </div>

                {/* Product Details */}
                <div style={{ marginTop: '16px', textAlign: 'center' }}>
                  <h3 style={{ margin: '0 0 6px 0', fontSize: '0.95rem', fontWeight: 600, color: '#0F2B4A', letterSpacing: '0.5px' }}>
                    {product.item_name}
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: '#666' }}>
                    ₦{Number(product.selling_price).toLocaleString()}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      {/* 🌟 HOVER ANIMATION CSS */}
      <style dangerouslySetInnerHTML={{__html: `
        .premium-product-img:hover {
          transform: scale(1.04);
        }
      `}} />
    </div>
  )
        }
