'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import Logo from '../components/Logo'

export default function NotFound() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [businessId, setBusinessId] = useState(null)

  // Extract sector from path (e.g., /dashboard/printing/jobs -> 'printing')
  const getSectorFromPath = () => {
    const parts = pathname?.split('/') || []
    if (parts.length >= 3 && parts[1] === 'dashboard') {
      const possibleSector = parts[2]
      // Validate it's a known sector
      if (['fashion', 'repairs', 'printing'].includes(possibleSector)) {
        return possibleSector
      }
    }
    // If path is /dashboard/... but not sector-specific, return null
    return null
  }

  const sector = getSectorFromPath() || ''

  // Get business_id from search params or localStorage
  useEffect(() => {
    const urlBizId = searchParams.get('business_id')
    if (urlBizId) {
      setBusinessId(urlBizId)
    } else {
      const storedBizId = localStorage.getItem('selectedBusinessId')
      if (storedBizId) setBusinessId(storedBizId)
    }
  }, [searchParams])

  // Build the correct dashboard URL
  const getDashboardUrl = () => {
    if (sector && businessId) {
      return `/dashboard/${sector}?business_id=${businessId}`
    }
    if (businessId) {
      return `/dashboard?business_id=${businessId}`
    }
    return '/dashboard'
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        background: 'var(--cresoa-bg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
        textAlign: 'center',
        color: 'var(--cresoa-text)',
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <div style={{ maxWidth: '400px', width: '100%' }}>
        {/* Logo */}
        <div style={{ marginBottom: '2rem' }}>
          <Link href="/" style={{ display: 'inline-block' }}>
            <img src="/favicon.png" alt="Cresoa" style={{ width: '80px', height: '80px', objectFit: 'contain' }} />
          </Link>
        </div>

        {/* Big 404 */}
        <h1 style={{ fontSize: '5rem', fontWeight: 900, margin: 0, color: 'var(--cresoa-accent)', lineHeight: 1 }}>
          404
        </h1>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0.5rem 0' }}>
          This page doesn't exist
        </h2>
        <p style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.9rem', marginBottom: '2rem' }}>
          The link you followed may be broken, or the page may have been removed.
        </p>

        {/* Back button with proper sector + id */}
        <Link
          href={getDashboardUrl()}
          style={{
            display: 'inline-block',
            background: 'var(--cresoa-accent)',
            color: '#fff',
            padding: '0.8rem 2rem',
            borderRadius: '10px',
            fontWeight: 700,
            textDecoration: 'none',
            boxShadow: '0 4px 14px rgba(212,165,42,0.3)',
            transition: 'transform 0.1s ease',
          }}
        >
          ← Back to Dashboard
        </Link>

        <p style={{ marginTop: '1.5rem', fontSize: '0.8rem', color: 'var(--cresoa-text-muted)' }}>
          {sector ? `Sector: ${sector.charAt(0).toUpperCase() + sector.slice(1)}` : 'General'}
          {businessId ? ` · Business ID: ${businessId.slice(0, 8)}...` : ''}
        </p>
      </div>
    </main>
  )
        }
