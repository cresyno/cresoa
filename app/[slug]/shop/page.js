import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'

// ✅ Use the Service Role key to bypass RLS and caching
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export const dynamic = 'force-dynamic'

export default async function ShopPage({ params }) {
  const { slug } = await params
  
  // 1. Fetch page directly
  const { data: page } = await supabaseAdmin
    .from('business_public_pages')
    .select('*')
    .eq('slug', slug)
    .eq('is_enabled', true)
    .maybeSingle()

  if (!page) notFound()

  // 2. Fetch inventory items using Admin client
  const { data: products } = await supabaseAdmin
    .from('inventory_items')
    .select('*')
    .eq('business_id', page.business_id)
    .eq('is_listed_on_website', true)

  return (
    <div style={{ background: '#FFFFFF', minHeight: '100vh', fontFamily: "'Inter', sans-serif" }}>
      
      {/* STOREFRONT HEADER */}
      <header style={{ padding: '20px', textAlign: 'center', borderBottom: '1px solid #F0F0F0', position: 'sticky', top: 0, background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(10px)', zIndex: 100 }}>
        <Link href={`/${slug}`} style={{ textDecoration: 'none' }}>
          <h1 style={{ margin: 0, fontFamily: "'Playfair Display', serif", fontSize: '1.5rem', color: '#0F2B4A', letterSpacing: '1px' }}>
            The Collection
          </h1>
        </Link>
      </header>

      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 20px' }}>
        <div style={{ marginBottom: '30px', textAlign: 'center' }}>
          <p style={{ color: '#666', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '2px' }}>
            {products?.length || 0} Items Available
          </p>
        </div>

        {!products?.length ? (
          <div style={{ textAlign: 'center', padding: '80px 20px' }}>
            <h3 style={{ color: '#0F2B4A', fontFamily: "'Playfair Display', serif", fontSize: '1.5rem' }}>New arrivals coming soon.</h3>
            <Link href={`/${slug}`} style={{ display: 'inline-block', marginTop: '20px', color: '#D4AF37', textDecoration: 'none', fontWeight: 600, borderBottom: '1px solid #D4AF37' }}>Return to Home</Link>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px', rowGap: '40px' }}>
            {products.map((product) => (
              <Link key={product.id} href={`/${slug}/shop/${product.id}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
                <div style={{ position: 'relative', overflow: 'hidden', background: '#F9F9F9', aspectRatio: '3/4' }}>
                  {product.image_url ? (
                    <img 
                      src={product.image_url} 
                      alt={product.item_name} 
                      style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)' }} 
                      className="product-image-hover"
                    />
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#CCC', fontSize: '0.8rem' }}>No Image</div>
                  )}
                </div>
                <div style={{ marginTop: '15px', textAlign: 'center' }}>
                  <h3 style={{ margin: '0 0 6px 0', fontSize: '0.95rem', fontWeight: 600, color: '#0F2B4A' }}>{product.item_name}</h3>
                  <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800, color: '#0F2B4A' }}>
                    ₦{Number(product.selling_price).toLocaleString()}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      <style dangerouslySetInnerHTML={{__html: `
        @media (min-width: 768px) {
          div[style*="gridTemplateColumns: repeat(2, 1fr)"] {
            grid-template-columns: repeat(4, 1fr) !important;
          }
        }
        .product-card:hover img {
          transform: scale(1.05);
        }
      `}} />
    </div>
  )
                    }
