'use client'

import { useRouter } from 'next/navigation'

export default function SectorMismatch({ sector, businessId }) {
  const router = useRouter()

  const handleGoToSector = () => {
    router.push(`/dashboard/${sector}?business_id=${businessId}`)
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--cresoa-bg)',
      padding: '1.5rem',
      textAlign: 'center',
    }}>
      <div style={{ maxWidth: '400px', background: 'var(--cresoa-surface)', padding: '2rem', borderRadius: '16px', boxShadow: 'var(--shadow-lg)' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>
          You are not registered to this sector
        </h1>
        <p style={{ color: 'var(--cresoa-text-muted)', marginBottom: '1.5rem' }}>
          Your account is linked to the <strong>{sector}</strong> sector. You cannot access this page.
        </p>
        <button
          onClick={handleGoToSector}
          style={{
            background: 'var(--cresoa-accent)',
            color: '#fff',
            padding: '0.75rem 1.5rem',
            borderRadius: '8px',
            border: 'none',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Go to your {sector} dashboard
        </button>
      </div>
    </div>
  )
}
