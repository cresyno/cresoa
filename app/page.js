export default function HomePage() {
  const features = [
    { icon: '📏', title: 'Customer & measurements', desc: 'Save every customer’s measurements once — reuse them for every future order, no re-measuring.' },
    { icon: '🧵', title: 'Order tracking', desc: 'Move orders through real stages: Order placed → Cutting → Sewing → Ready → Delivered. Know where every job stands.' },
    { icon: '💰', title: 'Payments & balances', desc: 'Record deposits, track outstanding balances, and see who owes what — no more guessing.' },
    { icon: '🔗', title: 'Customer tracking link', desc: 'Give each customer a private link to check their own order status. No more "is it ready?" messages.' },
    { icon: '👗', title: 'Aso‑Ebi & group orders', desc: 'Manage group orders effortlessly — one coordinator, many members, one shared deadline.' },
  ]

  const steps = [
    'Create your free business account',
    'Add your customers and their measurements',
    'Create orders and track them through production',
    'Share a tracking link with each customer via WhatsApp',
  ]

  return (
    <main style={{ minHeight: '100vh', background: '#F5EFE2' }}>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .fade { animation: fadeUp 0.6s ease-out both; }
      `}</style>

      <div style={{ background: 'linear-gradient(160deg, #1E3A5F 0%, #16293F 100%)', padding: '3rem 1.5rem 3.5rem', borderRadius: '0 0 32px 32px' }}>
        <div className="fade" style={{ maxWidth: '480px', margin: '0 auto', textAlign: 'center' }}>
          <div style={{ margin: '0 auto 1.2rem', boxShadow: '0 8px 24px rgba(0,0,0,0.25)', borderRadius: '16px', display: 'inline-block' }}>
            <svg width="56" height="56" viewBox="0 0 64 64" fill="none">
              <rect width="64" height="64" rx="16" fill="#1E3A5F" />
              <line x1="44" y1="18" x2="20" y2="42" stroke="#C79A2B" strokeWidth="3" strokeLinecap="round" />
              <circle cx="44" cy="18" r="4.5" fill="none" stroke="#C79A2B" strokeWidth="2.5" />
              <path d="M20 42 C 13 38, 11 29, 18 24" stroke="#C79A2B" strokeWidth="2.5" strokeLinecap="round" fill="none" />
            </svg>
          </div>
          <h1 style={{ color: '#fff', fontSize: '2.2rem', margin: '0 0 0.3rem' }}>Cresoa</h1>
          <p style={{ color: '#E4D8C2', fontSize: '1.1rem', lineHeight: '1.6', margin: '0 0 1.7rem', fontWeight: '500' }}>
            The simple business system for Nigerian <br style={{ display: 'block' }} /> fashion designers and tailors
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
            <a href="/signup" style={{ background: 'linear-gradient(135deg, #C79A2B, #B4881E)', color: '#1E3A5F', padding: '0.9rem', borderRadius: '10px', fontSize: '0.95rem', fontWeight: '700', textDecoration: 'none', display: 'block', boxShadow: '0 6px 16px rgba(199,154,43,0.35)' }}>
              Start free – no credit card
            </a>
            <a href="/login" style={{ background: 'rgba(255,255,255,0.08)', color: '#fff', padding: '0.85rem', borderRadius: '10px', fontSize: '0.95rem', fontWeight: '600', textDecoration: 'none', display: 'block', border: '1px solid rgba(255,255,255,0.25)' }}>
              Log in
            </a>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '480px', margin: '0 auto', padding: '2rem 1.5rem 3rem' }}>
        <div className="fade" style={{ background: '#fff', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 6px 20px rgba(30,58,95,0.08)', marginBottom: '1.3rem' }}>
          <h2 style={{ color: '#1E3A5F', fontSize: '1.15rem', margin: '0 0 0.8rem' }}>Stop juggling notebooks and WhatsApp</h2>
          <p style={{ color: '#2B2620', fontSize: '0.92rem', lineHeight: '1.6', margin: 0 }}>
            Lost measurements, missed payments, and endless <em>"is my order ready?"</em> messages — that’s not business, that’s stress.
            Cresoa helps you keep everything in one place so you can focus on what you do best: creating beautiful fashion.
          </p>
        </div>

        <div className="fade" style={{ background: '#fff', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 6px 20px rgba(30,58,95,0.08)', marginBottom: '1.3rem' }}>
          <h2 style={{ color: '#1E3A5F', fontSize: '1.15rem', margin: '0 0 1rem' }}>What you can do with Cresoa</h2>
          {features.map((f) => (
            <div key={f.title} style={{ display: 'flex', gap: '0.9rem', marginBottom: '1.1rem', alignItems: 'flex-start' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#F6E9C8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', flexShrink: 0 }}>
                {f.icon}
              </div>
              <div>
                <p style={{ margin: '0 0 0.2rem', color: '#1E3A5F', fontWeight: '600', fontSize: '0.95rem' }}>{f.title}</p>
                <p style={{ margin: 0, color: '#6B6255', fontSize: '0.85rem', lineHeight: '1.5' }}>{f.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="fade" style={{ background: '#fff', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 6px 20px rgba(30,58,95,0.08)', marginBottom: '1.3rem' }}>
          <h2 style={{ color: '#1E3A5F', fontSize: '1.15rem', margin: '0 0 1rem' }}>Get started in 4 simple steps</h2>
          {steps.map((step, i) => (
            <div key={step} style={{ display: 'flex', gap: '0.8rem', marginBottom: '0.9rem', alignItems: 'flex-start' }}>
              <span style={{ background: 'linear-gradient(135deg, #C79A2B, #B4881E)', color: '#1E3A5F', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: '700', flexShrink: 0, boxShadow: '0 2px 6px rgba(199,154,43,0.4)' }}>
                {i + 1}
              </span>
              <p style={{ margin: 0, color: '#2B2620', fontSize: '0.88rem', paddingTop: '0.15rem' }}>{step}</p>
            </div>
          ))}
        </div>

        <div className="fade" style={{ background: '#fff', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 6px 20px rgba(30,58,95,0.08)', marginBottom: '1.3rem', textAlign: 'center' }}>
          <p style={{ margin: 0, color: '#6B6255', fontSize: '0.85rem' }}>
            ✨ Built for Nigerian fashion businesses — <strong style={{ color: '#1E3A5F' }}>start free today</strong>
          </p>
          <a href="/signup" style={{ display: 'inline-block', marginTop: '0.8rem', background: '#1E3A5F', color: '#fff', padding: '0.7rem 2rem', borderRadius: '10px', fontSize: '0.9rem', fontWeight: '600', textDecoration: 'none', boxShadow: '0 4px 12px rgba(30,58,95,0.25)' }}>
            Create your account
          </a>
        </div>

        <p style={{ textAlign: 'center', color: '#6B6255', fontSize: '0.75rem', marginTop: '1.5rem' }}>
          Built in Nigeria, for Nigerian businesses. <br />
          <span style={{ opacity: 0.7 }}>Support for repairs and custom products coming soon.</span>
        </p>
      </div>
    </main>
  )
  }
