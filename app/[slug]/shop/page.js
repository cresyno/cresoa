import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function ShopPage({ params }) {
  const { slug } = params

  const { data: page } = await supabase.from('business_public_pages').select('*').eq('slug', slug).maybeSingle()
  if (!page) notFound()

  const { data: products } = await supabase
    .from('inventory_items')
    .select('*')
    .eq('business_id', page.business_id)
    .eq('is_listed_on_website', true)

  return (
    <div style={{ padding: '40px 20px', maxWidth: '1200px', margin: '0 auto', minHeight: '80vh', fontFamily: "'Inter', sans-serif" }}>
      <div style={{ marginBottom: '40px' }}>
        <Link href={`/${slug}`} style={{ color: '#D4AF37', textDecoration: 'none', fontWeight: 600 }}>← Back to Home</Link>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '2.5rem', color: '#0F2B4A', marginTop: '10px' }}>Shop Collection</h1>
      </div>

      {products?.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '50px 0' }}>
          <h3 style={{ color: '#666' }}>No products available yet.</h3>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '24px' }}>
          {products?.map(product => (
            <Link key={product.id} href={`/${slug}/shop/${product.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
              <div style={{ background: '#fff', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
                <div style={{ height: '300px', background: '#f5f5f5' }}>
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.item_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#ccc' }}>No Image</div>
                  )}
                </div>
                <div style={{ padding: '20px' }}>
                  <h3 style={{ margin: '0 0 5px 0', fontSize: '1.1rem', color: '#0F2B4A' }}>{product.item_name}</h3>
                  <p style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#D4AF37' }}>₦{Number(product.selling_price).toLocaleString()}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
            }
