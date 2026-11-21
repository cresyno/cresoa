'use client';

export async function generateStaticParams() {
  return [{ slug: "default", id: "default" }];
}
// app/[slug]/portfolio/page.js
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient'
import { parseSectorData } from '@/lib/publicPageData'
import Link from 'next/link'

export default function PortfolioPage() {
  const { slug } = useParams()
  const [portfolio, setPortfolio] = useState([])
  const [selectedImage, setSelectedImage] = useState(null)

  useEffect(() => {
    const fetchPortfolio = async () => {
      const { data } = await supabase
        .from('business_public_pages')
        .select('sector_data, is_enabled')
        .eq('slug', String(slug).toLowerCase())
        .maybeSingle()
      if (!data?.is_enabled) return
      const sector = parseSectorData(data.sector_data)
      setPortfolio(Array.isArray(sector.portfolio) ? sector.portfolio : [])
    }
    fetchPortfolio()
  }, [slug])

  return (
    <div style={{ padding: '40px 20px', maxWidth: '1200px', margin: '0 auto', minHeight: '80vh', fontFamily: "'Inter', sans-serif" }}>
      <div style={{ marginBottom: '40px' }}>
        <Link href={`/${slug}`} style={{ color: '#D4AF37', textDecoration: 'none', fontWeight: 600 }}>← Back to Home</Link>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '2.5rem', color: '#0F2B4A', marginTop: '10px' }}>Our Portfolio</h1>
      </div>

      {portfolio.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#666' }}>No portfolio images uploaded yet.</p>
      ) : (
        <div style={{ columnCount: '2', columnGap: '20px' }}>
          {portfolio.map((item, i) => (
            <div key={i} onClick={() => setSelectedImage(item)} style={{ breakInside: 'avoid', marginBottom: '20px', cursor: 'pointer', borderRadius: '16px', overflow: 'hidden', position: 'relative' }}>
              <img src={item.url} alt={item.title} style={{ width: '100%', display: 'block' }} />
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '20px', background: 'linear-gradient(transparent, rgba(0,0,0,0.8))' }}>
                <h3 style={{ margin: 0, color: '#fff', fontSize: '1.1rem' }}>{item.title}</h3>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedImage && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={() => setSelectedImage(null)}>
          <div style={{ maxWidth: '800px', width: '100%', position: 'relative' }} onClick={e => e.stopPropagation()}>
            <img src={selectedImage.url} style={{ width: '100%', borderRadius: '12px' }} />
            <div style={{ textAlign: 'center', color: '#fff', marginTop: '20px' }}>
              <h2 style={{ margin: '0 0 10px 0' }}>{selectedImage.title}</h2>
              <p style={{ color: '#ccc' }}>{selectedImage.desc}</p>
            </div>
            <button onClick={() => setSelectedImage(null)} style={{ position: 'absolute', top: '-40px', right: 0, background: 'none', border: 'none', color: '#fff', fontSize: '2rem', cursor: 'pointer' }}>×</button>
          </div>
        </div>
      )}
    </div>
  )
        }
