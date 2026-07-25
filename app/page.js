export default function HomePage() {
  return (
    <main
      style={{
        minHeight: '100vh',
        background: '#F5EFE2',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1.5rem',
        textAlign: 'center',
      }}
    >
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .cresoa-logo { animation: fadeUp 0.6s ease-out; }
        .cresoa-title { animation: fadeUp 0.6s ease-out 0.15s both; }
        .cresoa-sub { animation: fadeUp 0.6s ease-out 0.3s both; }
        .cresoa-buttons { animation: fadeUp 0.6s ease-out 0.45s both; }
      `}</style>

      <div style={{ maxWidth: '360px' }}>
        <div className="cresoa-logo" style={{ margin: '0 auto 1.5rem' }}>
          <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
            <rect width="64" height="64" rx="16" fill="#1E3A5F" />
            <path
              d="M20 22 L32 34 L44 22 M20 42 L32 30 L44 42"
              stroke="#C79A2B"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </svg>
        </div>

        <h1 className="cresoa-title" style={{ color: '#1E3A5F', fontSize: '2rem', margin: '0 0 0.6rem', fontWeight: '700' }}>
          Cresoa
        </h1>
        <p className="cresoa-sub" style={{ color: '#2B2620', fontSize: '1rem', lineHeight: '1.5', margin: '0 0 2.2rem' }}>
          Let your customers track their order, without another WhatsApp message.
        </p>

        <div className="cresoa-buttons" style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
          <a
            href="/signup"
            style={{
              background: '#1E3A5F', color: '#fff', padding: '0.85rem',
              borderRadius: '10px', fontSize: '0.95rem', fontWeight: '600',
              textDecoration: 'none', display: 'block'
            }}
          >
            Create your business account
          </a>
          <a
            href="/login"
            style={{
              background: 'none', color: '#1E3A5F', padding: '0.85rem',
              borderRadius: '10px', fontSize: '0.95rem', fontWeight: '600',
              textDecoration: 'none', display: 'block', border: '1px solid #1E3A5F'
            }}
          >
            Log in
          </a>
        </div>

        <p style={{ color: '#6B6255', fontSize: '0.8rem', marginTop: '2rem' }}>
          Built for Nigerian fashion designers and tailors.
        </p>
      </div>
    </main>
  )
                }
