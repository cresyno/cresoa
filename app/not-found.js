export default function NotFound() {
  return (
    <main style={{ minHeight: '100vh', background: '#F5EFE2', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1.5rem', textAlign: 'center' }}>
      <div>
        <h1 style={{ color: '#1E3A5F', fontSize: '1.6rem', marginBottom: '0.6rem' }}>Page not found</h1>
        <p style={{ color: '#6B6255', fontSize: '0.9rem', marginBottom: '1.5rem' }}>This page doesn't exist.</p>
        <a href="/dashboard" style={{ color: '#1E3A5F', fontWeight: '600' }}>← Back to dashboard</a>
      </div>
    </main>
  )
}
