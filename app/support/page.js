'use client'

import Link from 'next/link'

export default function SupportPage() {
  const whatsappNumber = '2349049209780'
  const message = 'Hi%20Cresoa%20Support%2C%20I%20need%20help%20with...'

  return (
    <div style={{ minHeight: '100vh', background: '#F8F6F2', padding: '2rem 1.5rem', fontFamily: "'Inter', system-ui, sans-serif" }}>
      <div style={{ maxWidth: '500px', margin: '0 auto', textAlign: 'center' }}>
        <Link href="/" style={{ color: '#0F2B4A', textDecoration: 'none', fontSize: '0.85rem' }}>← Back</Link>

        <div style={{ marginTop: '2rem', background: '#fff', borderRadius: '16px', padding: '2.5rem 2rem', border: '1px solid #E5E0D8' }}>
          <div style={{ fontSize: '3.5rem', marginBottom: '0.5rem' }}>💬</div>
          <h1 style={{ color: '#0F2B4A', fontSize: '1.6rem', marginBottom: '0.3rem' }}>Support</h1>
          <p style={{ color: '#8A8A8A', fontSize: '0.95rem', marginBottom: '1.5rem' }}>
            Have questions? We’re here to help.
          </p>
          <p style={{ color: '#8A8A8A', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
            Click the button below to message us on WhatsApp. We usually reply within a few hours.
          </p>
          <a
            href={`https://wa.me/${whatsappNumber}?text=${message}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.6rem',
              padding: '0.9rem 2rem',
              borderRadius: '12px',
              background: '#25D366',
              color: '#fff',
              fontWeight: '700',
              fontSize: '1.05rem',
              textDecoration: 'none',
              boxShadow: '0 4px 16px rgba(37,211,102,0.3)',
              transition: 'transform 0.1s ease',
            }}
          >
            💬 Message us on WhatsApp
          </a>
          <p style={{ marginTop: '1.5rem', fontSize: '0.7rem', color: '#C8C0B5' }}>
            Responses typically within 24 hours (Mon–Fri)
          </p>
        </div>

        <div style={{ marginTop: '1.5rem', fontSize: '0.75rem', color: '#8A8A8A' }}>
          <Link href="/learn" style={{ color: '#0F2B4A', textDecoration: 'underline' }}>Learn about Cresoa</Link>
          {' · '}
          <Link href="/dashboard" style={{ color: '#0F2B4A', textDecoration: 'underline' }}>Go to Dashboard</Link>
        </div>
      </div>
    </div>
  )
  }
