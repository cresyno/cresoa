'use client'

export default function Error({ reset }) {
  return (
    <main style={{ minHeight: '100vh', background: '#F5EFE2', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1.5rem', textAlign: 'center' }}>
      <div>
        <h1 style={{ color: '#AE4A34', fontSize: '1.6rem', marginBottom: '0.6rem' }}>Something went wrong</h1>
        <p style={{ color: '#6B6255', fontSize: '0.9rem', marginBottom: '1.5rem' }}>Please try again.</p>
        <button onClick={() => reset()} style={{ padding: '0.7rem 1.4rem', borderRadius: '8px', border: 'none', background: '#1E3A5F', color: '#fff', fontWeight: '600' }}>
          Try again
        </button>
      </div>
    </main>
  )
}
