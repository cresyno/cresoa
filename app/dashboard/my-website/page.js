import { useClientSearchParams as useSearchParams } from '../../lib/useClientSearchParams';
'use client'

import { useSearchParams } from 'next/navigation'
import EditorTab from './components/EditorTab'
import '../../globals.css'

export default function MyWebsitePage() {
  const searchParams = useSearchParams()
  const businessId = searchParams.get('business_id')

  if (!businessId) {
    return (
      <div style={{ padding: '4rem 2rem', textAlign: 'center', color: '#0F2B4A', fontWeight: 600 }}>
        Missing Business ID. Please log in again.
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF', fontFamily: "'Inter', sans-serif" }}>
      
      {/* HEADER */}
      <div style={{ padding: '2rem 1.5rem 1rem 1.5rem', maxWidth: '800px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 800, margin: 0, color: '#0F2B4A', letterSpacing: '-0.5px' }}>
          My Website
        </h1>
        <p style={{ margin: '0.4rem 0 0 0', fontSize: '0.95rem', color: '#666' }}>
          Design your storefront, add your portfolio, and manage delivery settings.
        </p>
      </div>

      {/* TAB CONTENT (The EditorTab handles its own internal tabs now) */}
      <div style={{ padding: '0 1.5rem', maxWidth: '800px', margin: '0 auto' }}>
        <EditorTab businessId={businessId} />
      </div>

    </div>
  )
}
