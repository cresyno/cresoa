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
      <div style={{ maxWidth: '360px' }}>
        <div
          style={{
            width: '56px', height: '56px', borderRadius: '14px',
            background: '#1E3A5F', display: 'flex', alignItems: 'center',
            justifyContent: 'center', margin: '0 auto 1.5rem'
          }}
        >
          <span style={{ color: '#C79A2B', fontSize: '1.6rem', fontWeight: '700' }}>C</span>
        </div>

        <h1 style={{ color: '#1E3A5F', fontSize: '2rem', margin: '0 0 0.6rem', fontWeight: '700' }}>
          Cresoa
        </h1>
        <p style={{ color: '#2B2620', fontSize: '1rem', lineHeight: '1.5', margin: '0 0 2.2rem' }}>
          Let your customers track their order, without another WhatsApp message.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
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
