import Link from 'next/link'

export const metadata = {
  title: 'Cresoa — Business OS for Nigerian SMEs',
  description: 'Manage customers, orders, payments, and production in one place. Built for Nigerian fashion, repairs, and manufacturing businesses.',
}

export default function HomePage() {
  return (
    <main style={{ minHeight: '100vh', background: '#F5EFE2' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        body { margin: 0; font-family: 'Inter', -apple-system, sans-serif; }
        h1, h2, h3 { font-family: 'Fraunces', serif; }
        .container {
          max-width: 1100px;
          margin: 0 auto;
          padding: 0 1.5rem;
        }
        .btn {
          display: inline-block;
          padding: 0.75rem 2rem;
          border-radius: 8px;
          font-weight: 600;
          text-decoration: none;
          font-size: 0.95rem;
          transition: transform 0.1s ease, box-shadow 0.2s ease;
          border: none;
          cursor: pointer;
          text-align: center;
        }
        .btn:active { transform: scale(0.97); }
        .btn-primary {
          background: linear-gradient(135deg, #C79A2B, #B4881E);
          color: #1E3A5F;
          box-shadow: 0 4px 14px rgba(199,154,43,0.3);
        }
        .btn-primary:hover { box-shadow: 0 6px 20px rgba(199,154,43,0.4); }
        .btn-secondary {
          background: #1E3A5F;
          color: #fff;
        }
        .btn-secondary:hover { background: #0F1E30; }
        .btn-outline {
          background: transparent;
          color: #fff;
          border: 1px solid rgba(255,255,255,0.3);
        }
        .btn-outline:hover { background: rgba(255,255,255,0.05); }
        .section-title {
          text-align: center;
          margin-bottom: 2.5rem;
        }
        .section-title h2 {
          font-size: 2rem;
          color: #1E3A5F;
          margin: 0 0 0.5rem;
        }
        .section-title p {
          color: #6B6255;
          font-size: 1.05rem;
          max-width: 600px;
          margin: 0 auto;
        }
        .card-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 1.5rem;
        }
        .feature-card {
          background: #fff;
          border-radius: 14px;
          padding: 1.8rem 1.2rem;
          border: 1px solid #E8E0D5;
          text-align: center;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .feature-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 24px rgba(30,58,95,0.08);
        }
        .feature-card .icon {
          font-size: 2.2rem;
          margin-bottom: 0.8rem;
          display: block;
        }
        .feature-card h3 {
          color: #1E3A5F;
          font-size: 1.1rem;
          margin: 0 0 0.5rem;
        }
        .feature-card p {
          color: #6B6255;
          font-size: 0.9rem;
          margin: 0;
          line-height: 1.5;
        }
        .industry-card {
          background: #fff;
          border-radius: 14px;
          padding: 1.8rem 1.2rem;
          border: 1px solid #E8E0D5;
          text-align: center;
          transition: border-color 0.2s ease;
        }
        .industry-card .icon {
          font-size: 2.8rem;
          display: block;
          margin-bottom: 0.6rem;
        }
        .industry-card h3 {
          color: #1E3A5F;
          font-size: 1.1rem;
          margin: 0 0 0.3rem;
        }
        .industry-card p {
          color: #6B6255;
          font-size: 0.85rem;
          margin: 0;
        }
        .industry-card .tag {
          display: inline-block;
          background: #F6E9C8;
          color: #1E3A5F;
          font-size: 0.6rem;
          font-weight: 700;
          padding: 0.15rem 0.6rem;
          border-radius: 12px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-top: 0.5rem;
        }
        .step-item {
          display: flex;
          align-items: flex-start;
          gap: 1rem;
          background: #fff;
          padding: 1.2rem;
          border-radius: 12px;
          border: 1px solid #E8E0D5;
        }
        .step-item .number {
          background: #1E3A5F;
          color: #fff;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 0.9rem;
          flex-shrink: 0;
        }
        .step-item h4 {
          margin: 0 0 0.2rem;
          color: #1E3A5F;
        }
        .step-item p {
          margin: 0;
          color: #6B6255;
          font-size: 0.9rem;
        }
        .pricing-card {
          background: #fff;
          border-radius: 16px;
          padding: 2rem 1.5rem;
          border: 2px solid #E8E0D5;
          text-align: center;
          max-width: 380px;
          margin: 0 auto;
          transition: border-color 0.2s ease;
        }
        .pricing-card:hover { border-color: #C79A2B; }
        .pricing-card .price {
          font-size: 2.8rem;
          font-weight: 700;
          color: #1E3A5F;
          margin: 0.5rem 0;
        }
        .pricing-card .price span {
          font-size: 1rem;
          font-weight: 400;
          color: #6B6255;
        }
        .pricing-card ul {
          list-style: none;
          padding: 0;
          margin: 1.5rem 0;
          text-align: left;
        }
        .pricing-card ul li {
          padding: 0.4rem 0;
          border-bottom: 1px solid #F0EDE8;
          font-size: 0.9rem;
          color: #2B2620;
        }
        .pricing-card ul li:last-child { border-bottom: none; }
        .footer {
          border-top: 1px solid #E8E0D5;
          padding: 2rem 0;
          margin-top: 3rem;
          text-align: center;
          color: #6B6255;
          font-size: 0.8rem;
        }
        .footer a {
          color: #1E3A5F;
          text-decoration: none;
        }
        .footer a:hover { text-decoration: underline; }
        @media (max-width: 480px) {
          .section-title h2 { font-size: 1.5rem; }
          .hero h1 { font-size: 1.8rem; }
          .pricing-card .price { font-size: 2rem; }
          .card-grid { grid-template-columns: 1fr; }
          .step-item { flex-direction: column; align-items: center; text-align: center; }
        }
      `}</style>

      {/* ===== HERO ===== */}
      <section style={{
        background: 'linear-gradient(150deg, #1E3A5F 0%, #0A1628 100%)',
        padding: '4rem 1.5rem 5rem',
        borderRadius: '0 0 40px 40px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute',
          top: '-20%',
          right: '-15%',
          width: '400px',
          height: '400px',
          background: 'radial-gradient(circle, rgba(199,154,43,0.06) 0%, transparent 70%)',
          borderRadius: '50%',
        }} />
        <div className="container" style={{ position: 'relative', zIndex: 1 }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '3rem' }}>
            <svg width="40" height="40" viewBox="0 0 64 64" fill="none">
              <rect width="64" height="64" rx="16" fill="#1E3A5F" />
              <line x1="44" y1="18" x2="20" y2="42" stroke="#C79A2B" strokeWidth="3" strokeLinecap="round" />
              <circle cx="44" cy="18" r="4.5" fill="none" stroke="#C79A2B" strokeWidth="2.5" />
              <path d="M20 42 C 13 38, 11 29, 18 24" stroke="#C79A2B" strokeWidth="2.5" strokeLinecap="round" fill="none" />
            </svg>
            <span style={{ color: '#fff', fontSize: '1.4rem', fontWeight: '700', fontFamily: "'Fraunces', serif" }}>Cresoa</span>
          </div>

          <div style={{ maxWidth: '600px' }}>
            <h1 style={{
              color: '#fff',
              fontSize: '2.8rem',
              lineHeight: '1.1',
              margin: '0 0 0.8rem',
              fontWeight: '700',
              letterSpacing: '-0.5px',
            }}>
              The simple operating system <br />
              <span style={{ color: '#C79A2B' }}>for Nigerian businesses</span>
            </h1>
            <p style={{
              color: '#C8D4E3',
              fontSize: '1.1rem',
              lineHeight: '1.6',
              margin: '0 0 2rem',
              maxWidth: '520px',
            }}>
              Stop juggling notebooks and WhatsApp. Manage customers, orders, payments, and production — all in one place.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.8rem' }}>
              <Link href="/signup" className="btn btn-primary">
                Start free — no credit card
              </Link>
              <Link href="/login" className="btn btn-outline">
                Log in
              </Link>
            </div>
            <p style={{
              color: '#A0B4C9',
              fontSize: '0.75rem',
              marginTop: '2rem',
              borderTop: '1px solid rgba(255,255,255,0.06)',
              paddingTop: '1.2rem',
            }}>
              ✦ Built in Nigeria, for Nigerian businesses
            </p>
          </div>
        </div>
      </section>

      {/* ===== FEATURES ===== */}
      <section className="container" style={{ padding: '3rem 1.5rem' }}>
        <div className="section-title">
          <h2>Everything you need to run smoothly</h2>
          <p>One platform for your customers, orders, payments, and communication.</p>
        </div>
        <div className="card-grid">
          {[
            { icon: '👤', title: 'Customer Management', desc: 'Save customer details and measurements. Reuse them for every order.' },
            { icon: '📋', title: 'Order Tracking', desc: 'Track orders through production stages: Cutting → Sewing → Ready → Delivered.' },
            { icon: '💰', title: 'Payments & Balances', desc: 'Record deposits, track balances, and see who owes what instantly.' },
            { icon: '🔗', title: 'Customer Tracking Links', desc: 'Give each customer a private link to check their order status 24/7.' },
            { icon: '👥', title: 'Group / Aso-Ebi Orders', desc: 'Manage group orders with one coordinator, many members, and one deadline.' },
            { icon: '💬', title: 'WhatsApp Integration', desc: 'Share tracking links and updates directly to your customers\' WhatsApp.' },
          ].map((f) => (
            <div key={f.title} className="feature-card">
              <span className="icon">{f.icon}</span>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== INDUSTRIES ===== */}
      <section className="container" style={{ padding: '1.5rem 1.5rem 3rem' }}>
        <div className="section-title">
          <h2>Built for the way you work</h2>
          <p>Cresoa adapts to different types of businesses — starting with these.</p>
        </div>
        <div className="card-grid">
          <div className="industry-card">
            <span className="icon">👗</span>
            <h3>Fashion & Custom Wear</h3>
            <p>Tailors, fashion designers, uniform makers. Manage customers, measurements, orders, and production.</p>
            <span className="tag">Live Now</span>
          </div>
          <div className="industry-card">
            <span className="icon">🔧</span>
            <h3>Repairs & Technical Services</h3>
            <p>Phone, laptop, and electronics repair. Track devices, jobs, parts, and payments.</p>
            <span className="tag">Live Now</span>
          </div>
          <div className="industry-card">
            <span className="icon">🛠️</span>
            <h3>Custom Manufacturing</h3>
            <p>Furniture makers, metal fabricators, custom product creators. Manage projects and production.</p>
            <span className="tag">Coming Soon</span>
          </div>
        </div>
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section className="container" style={{ padding: '2rem 1.5rem' }}>
        <div className="section-title">
          <h2>Get started in 3 steps</h2>
          <p>From signup to running your business in minutes.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
          <div className="step-item">
            <span className="number">1</span>
            <div>
              <h4>Create your account</h4>
              <p>Sign up free and choose your business type.</p>
            </div>
          </div>
          <div className="step-item">
            <span className="number">2</span>
            <div>
              <h4>Add customers & orders</h4>
              <p>Import your customers and create your first order.</p>
            </div>
          </div>
          <div className="step-item">
            <span className="number">3</span>
            <div>
              <h4>Run your business</h4>
              <p>Track orders, send tracking links, and collect payments.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== PRICING ===== */}
      <section className="container" style={{ padding: '3rem 1.5rem' }}>
        <div className="section-title">
          <h2>Simple, transparent pricing</h2>
          <p>Start free, pay only when you're ready to grow.</p>
        </div>
        <div className="pricing-card">
          <h3 style={{ color: '#1E3A5F', margin: 0, fontSize: '1.2rem' }}>Starter</h3>
          <div className="price">₦5,000 <span>/month</span></div>
          <ul>
            <li>✓ Unlimited customers & orders</li>
            <li>✓ Order tracking & production stages</li>
            <li>✓ Payments & balances</li>
            <li>✓ Customer tracking links</li>
            <li>✓ WhatsApp integration</li>
            <li>✓ Aso-Ebi & group orders</li>
          </ul>
          <Link href="/signup" className="btn btn-primary" style={{ width: '100%' }}>
            Start free trial
          </Link>
          <p style={{ fontSize: '0.7rem', color: '#6B6255', marginTop: '0.5rem' }}>
            No credit card required · 14-day free trial
          </p>
        </div>
      </section>

      {/* ===== FINAL CTA ===== */}
      <section style={{
        background: '#1E3A5F',
        borderRadius: '24px',
        maxWidth: '700px',
        margin: '2rem auto 3rem',
        padding: '2.5rem 1.5rem',
        textAlign: 'center',
        boxShadow: '0 8px 32px rgba(30,58,95,0.2)',
      }}>
        <h2 style={{ color: '#fff', fontSize: '1.8rem', margin: '0 0 0.8rem' }}>
          Ready to take control of your business?
        </h2>
        <p style={{ color: '#C8D4E3', fontSize: '1rem', margin: '0 0 1.8rem' }}>
          Join Nigerian businesses that have ditched the notebooks.
        </p>
        <Link href="/signup" className="btn btn-primary" style={{ fontSize: '1rem', padding: '0.9rem 2.5rem' }}>
          Create your free account
        </Link>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="footer">
        <div className="container">
          <p>
            <strong>Cresoa</strong> · Built in Nigeria for Nigerian businesses.
          </p>
          <p style={{ marginTop: '0.5rem' }}>
            <Link href="/login">Log in</Link> · <Link href="/signup">Sign up</Link> · <Link href="/dashboard">Dashboard</Link>
          </p>
          <p style={{ marginTop: '0.5rem', opacity: 0.6 }}>
            © {new Date().getFullYear()} Cresoa · All rights reserved.
          </p>
        </div>
      </footer>
    </main>
  )
            }
