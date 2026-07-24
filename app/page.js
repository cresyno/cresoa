export default function HomePage() {
  return (
    <main style={{ minHeight: '100vh', background: '#F5EFE2', padding: '2rem 1.5rem', fontFamily: 'sans-serif' }}>
      <h1 style={{ color: '#1E3A5F' }}>Cresoa</h1>
      <p style={{ color: '#2B2620' }}>Fashion designer order & customer tracking platform.</p>
      <div style={{ marginTop: '2rem' }}>
        <a href="/signup" style={{ color: '#1E3A5F', fontWeight: '600', marginRight: '1.5rem' }}>
          Sign up
        </a>
        <a href="/login" style={{ color: '#1E3A5F', fontWeight: '600' }}>
          Log in
        </a>
      </div>
    </main>
  )
}
