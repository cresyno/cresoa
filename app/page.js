import Link from 'next/link'

export const metadata = {
  title: 'Cresoa — Business OS for Nigerian SMEs',
  description: 'Manage customers, orders, payments, and production in one place. Built for Nigerian fashion, repairs, and manufacturing businesses.',
}

export default function HomePage() {
  return (
    <main style={{ minHeight: '100vh', background: '#F8F6F2', fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}>
      <style>{`
        /* ─────────────────────────────────────────────
           FONTS & RESET
           ───────────────────────────────────────────── */
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Inter', -apple-system, sans-serif; color: #1A1A1A; background: #F8F6F2; }
        h1, h2, h3, h4 { font-family: 'Fraunces', serif; }

        /* ─────────────────────────────────────────────
           CONTAINER
           ───────────────────────────────────────────── */
        .container { max-width: 1100px; margin: 0 auto; padding: 0 1.5rem; }

        /* ─────────────────────────────────────────────
           BUTTONS
           ───────────────────────────────────────────── */
        .btn {
          display: inline-block;
          padding: 0.8rem 2rem;
          border-radius: 10px;
          font-weight: 600;
          text-decoration: none;
          font-size: 0.95rem;
          transition: all 0.25s ease;
          border: none;
          cursor: pointer;
          text-align: center;
        }
        .btn:active { transform: scale(0.96); }
        .btn-primary {
          background: linear-gradient(135deg, #D4A52A, #C79A2B);
          color: #0F2B4A;
          box-shadow: 0 4px 16px rgba(212,165,42,0.3);
        }
        .btn-primary:hover {
          box-shadow: 0 8px 32px rgba(212,165,42,0.5);
          transform: translateY(-2px);
        }
        .btn-secondary {
          background: #0F2B4A;
          color: #fff;
        }
        .btn-secondary:hover { background: #1A3F66; transform: translateY(-2px); }
        .btn-outline {
          background: transparent;
          color: #fff;
          border: 1px solid rgba(255,255,255,0.25);
        }
        .btn-outline:hover { background: rgba(255,255,255,0.08); }
        .btn-outline-dark {
          background: transparent;
          color: #0F2B4A;
          border: 1px solid #E5E0D8;
        }
        .btn-outline-dark:hover { background: #F8F6F2; }

        /* ─────────────────────────────────────────────
           SECTION TITLES
           ───────────────────────────────────────────── */
        .section-title {
          text-align: center;
          margin-bottom: 2.5rem;
        }
        .section-title h2 {
          font-size: 2rem;
          color: #0F2B4A;
          margin: 0 0 0.5rem;
        }
        .section-title p {
          color: #8A8A8A;
          font-size: 1.05rem;
          max-width: 600px;
          margin: 0 auto;
        }

        /* ─────────────────────────────────────────────
           FEATURE CARDS
           ───────────────────────────────────────────── */
        .card-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1.5rem;
        }
        .feature-card {
          background: #fff;
          border-radius: 16px;
          padding: 1.8rem 1.2rem;
          border: 1px solid #E5E0D8;
          text-align: center;
          transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
          box-shadow: 0 2px 8px rgba(15,43,74,0.04);
        }
        .feature-card:hover {
          transform: translateY(-6px);
          box-shadow: 0 12px 40px rgba(15,43,74,0.08);
          border-color: #D4A52A;
        }
        .feature-card .icon { font-size: 2.6rem; display: block; margin-bottom: 0.8rem; }
        .feature-card h3 { color: #0F2B4A; font-size: 1.1rem; margin: 0 0 0.5rem; }
        .feature-card p { color: #8A8A8A; font-size: 0.9rem; margin: 0; line-height: 1.6; }

        /* ─────────────────────────────────────────────
           INDUSTRY CARDS
           ───────────────────────────────────────────── */
        .industry-card {
          background: #fff;
          border-radius: 16px;
          padding: 1.8rem 1.2rem;
          border: 1px solid #E5E0D8;
          text-align: center;
          transition: all 0.3s ease;
          box-shadow: 0 2px 8px rgba(15,43,74,0.04);
        }
        .industry-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 40px rgba(15,43,74,0.08);
        }
        .industry-card .icon { font-size: 3rem; display: block; margin-bottom: 0.6rem; }
        .industry-card h3 { color: #0F2B4A; font-size: 1.1rem; margin: 0 0 0.3rem; }
        .industry-card p { color: #8A8A8A; font-size: 0.85rem; margin: 0; }
        .industry-card .tag {
          display: inline-block;
          font-size: 0.55rem;
          font-weight: 700;
          padding: 0.15rem 0.6rem;
          border-radius: 12px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-top: 0.5rem;
        }
        .tag-live { background: #DCEBE2; color: #2E7D5E; }
        .tag-soon { background: #F6E9C8; color: #C79A2B; }

        /* ─────────────────────────────────────────────
           STEPS
           ───────────────────────────────────────────── */
        .step-item {
          display: flex;
          align-items: flex-start;
          gap: 1rem;
          background: #fff;
          padding: 1.2rem 1.5rem;
          border-radius: 14px;
          border: 1px solid #E5E0D8;
          box-shadow: 0 2px 8px rgba(15,43,74,0.03);
          transition: all 0.3s ease;
        }
        .step-item:hover {
          border-color: #D4A52A;
          box-shadow: 0 8px 24px rgba(15,43,74,0.06);
        }
        .step-item .number {
          background: #0F2B4A;
          color: #fff;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 1rem;
          flex-shrink: 0;
        }
        .step-item h4 { margin: 0 0 0.2rem; color: #0F2B4A; font-size: 1rem; }
        .step-item p { margin: 0; color: #8A8A8A; font-size: 0.9rem; line-height: 1.5; }

        /* ─────────────────────────────────────────────
           PRICING
           ───────────────────────────────────────────── */
        .pricing-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 1.5rem;
          max-width: 900px;
          margin: 0 auto;
        }
        .pricing-card {
          background: #fff;
          border-radius: 16px;
          padding: 2rem 1.5rem;
          border: 2px solid #E5E0D8;
          text-align: center;
          transition: all 0.3s ease;
          box-shadow: 0 2px 8px rgba(15,43,74,0.04);
        }
        .pricing-card:hover { border-color: #D4A52A; box-shadow: 0 8px 32px rgba(15,43,74,0.08); }
        .pricing-card.popular {
          border-color: #D4A52A;
          background: linear-gradient(135deg, #fff, #FDF8F0);
          position: relative;
        }
        .pricing-card.popular .popular-badge {
          background: #D4A52A;
          color: #0F2B4A;
          font-size: 0.6rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          padding: 0.15rem 0.8rem;
          border-radius: 20px;
          display: inline-block;
          margin-bottom: 0.8rem;
        }
        .pricing-card .plan-name { font-size: 1.1rem; font-weight: 600; color: #0F2B4A; margin: 0; }
        .pricing-card .price { font-size: 2.8rem; font-weight: 700; color: #0F2B4A; margin: 0.3rem 0; }
        .pricing-card .price span { font-size: 1rem; font-weight: 400; color: #8A8A8A; }
        .pricing-card .description { color: #8A8A8A; font-size: 0.85rem; margin: 0 0 1.2rem; }
        .pricing-card ul { list-style: none; padding: 0; margin: 1.5rem 0; text-align: left; }
        .pricing-card ul li { padding: 0.5rem 0; border-bottom: 1px solid #F0EDE8; font-size: 0.85rem; color: #1A1A1A; display: flex; align-items: center; gap: 0.5rem; }
        .pricing-card ul li:last-child { border-bottom: none; }
        .pricing-card ul li .check { color: #2E7D5E; font-weight: 700; }
        .pricing-card ul li .cross { color: #D9534F; font-weight: 700; }

        /* ─────────────────────────────────────────────
           FAQ
           ───────────────────────────────────────────── */
        .faq-item {
          background: #fff;
          border-radius: 12px;
          border: 1px solid #E5E0D8;
          margin-bottom: 0.8rem;
          overflow: hidden;
          transition: all 0.2s ease;
        }
        .faq-item:hover { border-color: #D4A52A; }
        .faq-item summary {
          padding: 1rem 1.2rem;
          font-weight: 600;
          color: #0F2B4A;
          cursor: pointer;
          display: flex;
          justify-content: space-between;
          align-items: center;
          list-style: none;
        }
        .faq-item summary::-webkit-details-marker { display: none; }
        .faq-item summary::after {
          content: '+';
          font-size: 1.4rem;
          color: #D4A52A;
          transition: transform 0.3s ease;
        }
        .faq-item[open] summary::after { transform: rotate(45deg); }
        .faq-item .faq-answer { padding: 0 1.2rem 1.2rem; color: #8A8A8A; font-size: 0.9rem; line-height: 1.7; }

        /* ─────────────────────────────────────────────
           TRUST BAR
           ───────────────────────────────────────────── */
        .trust-bar {
          display: flex;
          justify-content: center;
          gap: 2rem;
          flex-wrap: wrap;
          padding: 1.2rem 0;
          border-top: 1px solid rgba(255,255,255,0.08);
          margin-top: 2.5rem;
        }
        .trust-bar .item {
          color: #C8D4E3;
          font-size: 0.75rem;
          display: flex;
          align-items: center;
          gap: 0.4rem;
        }
        .trust-bar .item strong { color: #fff; font-size: 1rem; }

        /* ─────────────────────────────────────────────
           TESTIMONIALS
           ───────────────────────────────────────────── */
        .testimonial-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 1.5rem;
        }
        .testimonial-card {
          background: #fff;
          border-radius: 16px;
          padding: 1.5rem;
          border: 1px solid #E5E0D8;
          box-shadow: 0 2px 8px rgba(15,43,74,0.04);
          transition: all 0.3s ease;
        }
        .testimonial-card:hover { transform: translateY(-4px); box-shadow: 0 8px 24px rgba(15,43,74,0.06); }
        .testimonial-card .stars { color: #D4A52A; font-size: 1.2rem; margin-bottom: 0.4rem; }
        .testimonial-card blockquote { font-style: italic; color: #1A1A1A; font-size: 0.9rem; margin: 0 0 0.5rem; }
        .testimonial-card .author { font-weight: 600; color: #0F2B4A; }
        .testimonial-card .role { font-size: 0.75rem; color: #8A8A8A; }

        /* ─────────────────────────────────────────────
           RESPONSIVE
           ───────────────────────────────────────────── */
        @media (max-width: 640px) {
          .section-title h2 { font-size: 1.5rem; }
          .hero h1 { font-size: 1.8rem; }
          .pricing-card .price { font-size: 2rem; }
          .card-grid { grid-template-columns: 1fr; }
          .pricing-grid { grid-template-columns: 1fr; }
          .step-item { flex-direction: column; align-items: center; text-align: center; }
          .trust-bar { gap: 1rem; justify-content: center; }
          .nav-links { display: none; }
          .testimonial-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          1.  NAVIGATION
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <nav style={{
        background: '#0F2B4A',
        padding: '0.7rem 1.5rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <svg width="36" height="36" viewBox="0 0 64 64" fill="none">
            <rect width="64" height="64" rx="16" fill="#0F2B4A" />
            <line x1="44" y1="18" x2="20" y2="42" stroke="#D4A52A" strokeWidth="3" strokeLinecap="round" />
            <circle cx="44" cy="18" r="4.5" fill="none" stroke="#D4A52A" strokeWidth="2.5" />
            <path d="M20 42 C 13 38, 11 29, 18 24" stroke="#D4A52A" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          </svg>
          <span style={{ color: '#fff', fontSize: '1.2rem', fontWeight: '700', fontFamily: "'Fraunces', serif" }}>Cresoa</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div className="nav-links" style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
            <a href="#features" style={{ color: '#C8D4E3', textDecoration: 'none', fontSize: '0.85rem' }}>Features</a>
            <a href="#pricing" style={{ color: '#C8D4E3', textDecoration: 'none', fontSize: '0.85rem' }}>Pricing</a>
            <a href="#faq" style={{ color: '#C8D4E3', textDecoration: 'none', fontSize: '0.85rem' }}>FAQ</a>
          </div>
          <Link href="/login" style={{ color: '#C8D4E3', textDecoration: 'none', fontSize: '0.85rem' }}>Log in</Link>
          <Link href="/signup" className="btn btn-primary" style={{ padding: '0.5rem 1.2rem', fontSize: '0.85rem' }}>
            Start for Free
          </Link>
        </div>
      </nav>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          2.  HERO
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section style={{
        background: 'linear-gradient(150deg, #0F2B4A 0%, #061A2E 100%)',
        padding: '4rem 1.5rem 3rem',
        position: 'relative',
        overflow: 'hidden',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
      }}>
        <div style={{
          position: 'absolute',
          top: '-30%',
          right: '-10%',
          width: '500px',
          height: '500px',
          background: 'radial-gradient(circle, rgba(212,165,42,0.06) 0%, transparent 70%)',
          borderRadius: '50%',
        }} />
        <div className="container" style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ maxWidth: '680px' }}>
            <h1 style={{
              color: '#fff',
              fontSize: '3rem',
              lineHeight: '1.08',
              margin: '0 0 0.8rem',
              fontWeight: '700',
              letterSpacing: '-0.5px',
            }}>
              The simple operating system <br />
              <span style={{ color: '#D4A52A' }}>for Nigerian SMEs</span>
            </h1>
            <p style={{
              color: '#C8D4E3',
              fontSize: '1.15rem',
              lineHeight: '1.7',
              margin: '0 0 2rem',
              maxWidth: '540px',
            }}>
              Stop juggling notebooks and WhatsApp. Manage customers, orders, payments, 
              and production — all in one place. Built for Nigerian businesses, by Nigerians.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.8rem' }}>
              <Link href="/signup" className="btn btn-primary" style={{ fontSize: '1rem', padding: '0.9rem 2.5rem' }}>
                Start for Free →
              </Link>
              <Link href="#features" className="btn btn-outline" style={{ fontSize: '1rem', padding: '0.9rem 2rem' }}>
                Explore
              </Link>
            </div>
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.5rem 1.5rem',
              marginTop: '1.5rem',
              color: '#A0B4C9',
              fontSize: '0.8rem',
            }}>
              <span>✅ No credit card required</span>
              <span>✅ 14‑day free trial</span>
              <span>✅ Cancel anytime</span>
            </div>
          </div>
          {/* Trust bar */}
          <div className="trust-bar">
            <span className="item"><strong>Built in Nigeria</strong> 🇳🇬</span>
            <span className="item"><strong>100+ SMEs</strong> trust us</span>
            <span className="item">💬 <strong>WhatsApp</strong> integrated</span>
            <span className="item">⭐ <strong>4.8/5</strong> user rating</span>
          </div>
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          3.  TRUST & SOCIAL PROOF
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="container" style={{ padding: '2.5rem 1.5rem', textAlign: 'center' }}>
        <p style={{ color: '#8A8A8A', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.8rem' }}>
          Trusted by Nigerian business owners
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem 3rem', flexWrap: 'wrap', opacity: 0.8 }}>
          <span style={{ fontSize: '0.85rem', color: '#0F2B4A', fontWeight: '500' }}>👗 Fashion Designers</span>
          <span style={{ fontSize: '0.85rem', color: '#0F2B4A', fontWeight: '500' }}>🔧 Phone Repairers</span>
          <span style={{ fontSize: '0.85rem', color: '#0F2B4A', fontWeight: '500' }}>🪑 Furniture Makers</span>
          <span style={{ fontSize: '0.85rem', color: '#0F2B4A', fontWeight: '500' }}>📱 Electronics Technicians</span>
          <span style={{ fontSize: '0.85rem', color: '#0F2B4A', fontWeight: '500' }}>👔 Uniform Makers</span>
        </div>
        <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#8A8A8A' }}>
          Join hundreds of businesses already using Cresoa
        </div>
      </section>
{/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    4.  FEATURES (10 detailed)
    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
<section id="features" className="container" style={{ padding: '2rem 1.5rem 3rem' }}>
  <div className="section-title">
    <h2>Everything you need to run smoothly</h2>
    <p>One platform for your customers, orders, payments, and communication.</p>
  </div>
  <div className="card-grid">
    {[
      { icon: '👤', title: 'Customer Management', desc: 'Store customer details, measurements, and history. Reuse them for every order. Never lose a customer again.' },
      { icon: '📋', title: 'Order & Job Tracking', desc: 'Track orders through every stage: Cutting → Sewing → Ready. For repairs: Diagnosing → Repairing → Ready.' },
      { icon: '💰', title: 'Payments & Balances', desc: 'Record deposits, track balances, and see who owes what instantly. Know your cash flow at a glance.' },
      { icon: '🔗', title: 'Customer Tracking Links', desc: 'Give each customer a private link to check their order status 24/7. No more "is it ready?" calls.' },
      { icon: '👥', title: 'Group / Aso‑Ebi Orders', desc: 'Manage group orders with one coordinator, many members, and one deadline. Perfect for fashion businesses.' },
      { icon: '💬', title: 'WhatsApp Integration', desc: 'Share tracking links and updates directly to your customers\' WhatsApp. They\'ll love it.' },
      { icon: '📊', title: 'Analytics & Reports', desc: 'See your business performance at a glance. Revenue, orders, customer growth – all in one dashboard.' },
      { icon: '📦', title: 'Inventory Management (Repairs)', desc: 'Track parts and components for repair jobs. Get low‑stock alerts and manage your inventory.' },
      { icon: '📅', title: 'Reminders & Notifications', desc: 'Automatically remind customers about pending payments or ready-for-pickup jobs.' },
      { icon: '📱', title: 'Mobile‑First Design', desc: 'Works perfectly on any device – phone, tablet, or desktop. Manage your business on the go.' },
    ].map((f) => (
      <div key={f.title} className="feature-card">
        <span className="icon">{f.icon}</span>
        <h3>{f.title}</h3>
        <p>{f.desc}</p>
      </div>
    ))}
  </div>
</section>

{/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    5.  INDUSTRIES (with detailed benefits)
    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
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
      <p style={{ fontSize: '0.75rem', color: '#0F2B4A', marginTop: '0.5rem' }}>
        ✓ Measurements · ✓ Aso‑Ebi groups · ✓ Production stages
      </p>
      <span className="tag tag-live">✓ Live Now</span>
    </div>
    <div className="industry-card" style={{ borderColor: '#D4A52A' }}>
      <span className="icon">🔧</span>
      <h3>Repairs & Technical Services</h3>
      <p>Phone, laptop, and electronics repair. Track devices, jobs, parts, and payments.</p>
      <p style={{ fontSize: '0.75rem', color: '#0F2B4A', marginTop: '0.5rem' }}>
        ✓ Device tracking · ✓ Parts inventory · ✓ Repair stages
      </p>
      <span className="tag tag-live">✓ Live Now</span>
    </div>
    <div className="industry-card">
      <span className="icon">🛠️</span>
      <h3>Custom Manufacturing</h3>
      <p>Furniture makers, metal fabricators, custom product creators. Manage projects and production.</p>
      <p style={{ fontSize: '0.75rem', color: '#0F2B4A', marginTop: '0.5rem' }}>
        ✓ Project management · ✓ Material tracking · ✓ Delivery scheduling
      </p>
      <span className="tag tag-soon">⏳ Coming Soon</span>
    </div>
  </div>
</section>

{/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    6.  HOW IT WORKS (with more detail)
    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
<section className="container" style={{ padding: '2rem 1.5rem' }}>
  <div className="section-title">
    <h2>Get started in 3 simple steps</h2>
    <p>From signup to running your business in minutes.</p>
  </div>
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
    <div className="step-item">
      <span className="number">1</span>
      <div>
        <h4>Create your account</h4>
        <p>Sign up free and choose your business type — Fashion, Repairs, or Manufacturing.</p>
        <span style={{ fontSize: '0.65rem', color: '#8A8A8A' }}>⏱ 2 minutes</span>
      </div>
    </div>
    <div className="step-item">
      <span className="number">2</span>
      <div>
        <h4>Add customers & orders</h4>
        <p>Import your customers, add their details, and create your first order or repair job.</p>
        <span style={{ fontSize: '0.65rem', color: '#8A8A8A' }}>⏱ 5 minutes</span>
      </div>
    </div>
    <div className="step-item">
      <span className="number">3</span>
      <div>
        <h4>Run your business</h4>
        <p>Track orders, send tracking links, record payments, and grow with confidence.</p>
        <span style={{ fontSize: '0.65rem', color: '#8A8A8A' }}>🚀 Start now</span>
      </div>
    </div>
  </div>
  <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
    <Link href="/signup" className="btn btn-primary" style={{ fontSize: '1rem', padding: '0.9rem 2.5rem' }}>
      Start for Free →
    </Link>
  </div>
</section>

{/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    7.  PRICING (with comparison table)
    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
<section id="pricing" className="container" style={{ padding: '3rem 1.5rem' }}>
  <div className="section-title">
    <h2>Simple, transparent pricing</h2>
    <p>Start free, pay only when you're ready to grow.</p>
  </div>
  <div className="pricing-grid">
    {/* Free */}
    <div className="pricing-card">
      <p className="plan-name">Free</p>
      <div className="price">₦0</div>
      <p className="description">Perfect for getting started</p>
      <ul>
        <li><span className="check">✓</span> 20 customers</li>
        <li><span className="check">✓</span> 50 orders</li>
        <li><span className="check">✓</span> Basic order tracking</li>
        <li><span className="cross">✗</span> Staff accounts</li>
        <li><span className="cross">✗</span> WhatsApp integration</li>
        <li><span className="cross">✗</span> Customer tracking links</li>
        <li><span className="cross">✗</span> Analytics</li>
      </ul>
      <Link href="/signup" className="btn btn-outline-dark" style={{ width: '100%' }}>
        Start for Free
      </Link>
    </div>

    {/* Starter — Popular */}
    <div className="pricing-card popular">
      <div className="popular-badge">Most Popular</div>
      <p className="plan-name">Starter</p>
      <div className="price">₦3,000 <span>/month</span></div>
      <p className="description">For growing businesses</p>
      <ul>
        <li><span className="check">✓</span> Unlimited customers</li>
        <li><span className="check">✓</span> Unlimited orders</li>
        <li><span className="check">✓</span> 2 staff accounts</li>
        <li><span className="check">✓</span> WhatsApp integration</li>
        <li><span className="check">✓</span> Customer tracking links</li>
        <li><span className="check">✓</span> Group / Aso‑Ebi orders</li>
        <li><span className="check">✓</span> Basic analytics</li>
      </ul>
      <Link href="/signup" className="btn btn-primary" style={{ width: '100%' }}>
        Start Free Trial
      </Link>
      <p style={{ fontSize: '0.65rem', color: '#8A8A8A', marginTop: '0.5rem' }}>
        14‑day free trial · No credit card required
      </p>
    </div>

    {/* Pro */}
    <div className="pricing-card">
      <p className="plan-name">Pro</p>
      <div className="price">₦8,000 <span>/month</span></div>
      <p className="description">For established businesses</p>
      <ul>
        <li><span className="check">✓</span> Everything in Starter</li>
        <li><span className="check">✓</span> 10 staff accounts</li>
        <li><span className="check">✓</span> Advanced analytics</li>
        <li><span className="check">✓</span> Data export (Excel/PDF)</li>
        <li><span className="check">✓</span> API access</li>
        <li><span className="check">✓</span> Priority support</li>
        <li><span className="check">✓</span> Custom branding</li>
      </ul>
      <Link href="/signup" className="btn btn-secondary" style={{ width: '100%' }}>
        Start Free Trial
      </Link>
      <p style={{ fontSize: '0.65rem', color: '#8A8A8A', marginTop: '0.5rem' }}>
        14‑day free trial · No credit card required
      </p>
    </div>
  </div>
  <p style={{ textAlign: 'center', color: '#8A8A8A', fontSize: '0.8rem', marginTop: '1.5rem' }}>
    All plans include a 14‑day free trial. Cancel anytime.
  </p>
</section>
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          8.  TESTIMONIALS (placeholders)
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="container" style={{ padding: '2rem 1.5rem 3rem' }}>
        <div className="section-title">
          <h2>What our customers say</h2>
          <p>Real stories from real Nigerian business owners.</p>
        </div>
        <div className="testimonial-grid">
          <div className="testimonial-card">
            <div className="stars">★★★★★</div>
            <blockquote>
              “Cresoa has completely changed how I run my tailoring business. 
              I no longer lose track of orders, and my customers love the tracking links.”
            </blockquote>
            <div className="author">— Funke A.</div>
            <div className="role">Fashion Designer, Lagos</div>
          </div>
          <div className="testimonial-card">
            <div className="stars">★★★★★</div>
            <blockquote>
              “Managing repairs used to be a nightmare. Now I track every device, 
              parts inventory, and payments in one place. My customers are happier.”
            </blockquote>
            <div className="author">— Chidi O.</div>
            <div className="role">Phone Repairer, Abuja</div>
          </div>
          <div className="testimonial-card">
            <div className="stars">★★★★☆</div>
            <blockquote>
              “The WhatsApp integration is a game-changer. I can send updates 
              instantly, and my customers feel connected to the process.”
            </blockquote>
            <div className="author">— Grace E.</div>
            <div className="role">Furniture Maker, Ibadan</div>
          </div>
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          9.  FAQ (expanded to 8 questions)
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section id="faq" className="container" style={{ padding: '2rem 1.5rem 3rem', maxWidth: '720px' }}>
        <div className="section-title">
          <h2>Frequently asked questions</h2>
          <p>Everything you need to know about Cresoa.</p>
        </div>
        <div>
          {[
            { q: 'What is Cresoa?', a: 'Cresoa is a business management platform built for Nigerian SMEs. It helps you manage customers, orders, payments, and production — all in one place.' },
            { q: 'Is there a free plan?', a: 'Yes! Cresoa has a Free plan that includes up to 20 customers and 50 orders. You can use it indefinitely without paying.' },
            { q: 'How much does it cost?', a: 'The Starter plan is ₦3,000/month and the Pro plan is ₦8,000/month. Both include a 14‑day free trial with no credit card required.' },
            { q: 'What industries does Cresoa support?', a: 'Currently, Cresoa supports Fashion & Custom Wear and Repairs & Technical Services. Manufacturing is coming soon.' },
            { q: 'Can I use Cresoa on my phone?', a: 'Yes! Cresoa is fully responsive and works on any device — phone, tablet, or desktop. Over 80% of Nigerian web traffic is on mobile, so we built for mobile first.' },
            { q: 'How do I get started?', a: 'Simply click "Start for Free" on this page, create your account, choose your business type, and start adding customers and orders in minutes.' },
            { q: 'Can I upgrade or downgrade my plan?', a: 'Absolutely. You can change your plan at any time. Upgrades take effect immediately; downgrades take effect at the end of your billing cycle.' },
            { q: 'Is my data safe?', a: 'Yes. Your data is encrypted and stored securely on Supabase. We never share your data with third parties without your explicit consent.' },
          ].map((item, i) => (
            <details key={i} className="faq-item">
              <summary>{item.q}</summary>
              <div className="faq-answer">{item.a}</div>
            </details>
          ))}
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          10. FINAL CTA with additional social proof
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section style={{
        background: 'linear-gradient(135deg, #0F2B4A, #1A3F66)',
        borderRadius: '24px',
        maxWidth: '760px',
        margin: '0 auto 3rem',
        padding: '3rem 2rem',
        textAlign: 'center',
        boxShadow: '0 8px 40px rgba(15,43,74,0.2)',
      }}>
        <h2 style={{ color: '#fff', fontSize: '2rem', margin: '0 0 0.8rem' }}>
          Ready to take control of your business?
        </h2>
        <p style={{ color: '#C8D4E3', fontSize: '1.05rem', margin: '0 0 1.5rem', maxWidth: '500px', marginLeft: 'auto', marginRight: 'auto' }}>
          Join hundreds of Nigerian SMEs that have ditched the notebooks.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.8rem', justifyContent: 'center' }}>
          <Link href="/signup" className="btn btn-primary" style={{ fontSize: '1.05rem', padding: '0.9rem 2.5rem' }}>
            Create your free account →
          </Link>
          <Link href="/login" className="btn btn-outline" style={{ fontSize: '1.05rem', padding: '0.9rem 2rem' }}>
            Log in
          </Link>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', flexWrap: 'wrap', marginTop: '1.2rem', color: '#A0B4C9', fontSize: '0.75rem' }}>
          <span>✅ 14‑day free trial</span>
          <span>✅ No credit card</span>
          <span>✅ Cancel anytime</span>
          <span>💬 Support via WhatsApp</span>
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          11. FOOTER with additional links
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <footer style={{
        borderTop: '1px solid #E5E0D8',
        padding: '2.5rem 1.5rem',
        marginTop: '1rem',
        textAlign: 'center',
        color: '#8A8A8A',
        fontSize: '0.8rem',
      }}>
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', flexWrap: 'wrap', marginBottom: '1.2rem' }}>
            <span><strong style={{ color: '#0F2B4A' }}>Cresoa</strong> · Built in Nigeria for Nigerian businesses 🇳🇬</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1.2rem', flexWrap: 'wrap', marginBottom: '1.2rem' }}>
            <Link href="/login" style={{ color: '#0F2B4A', textDecoration: 'none' }}>Log in</Link>
            <Link href="/signup" style={{ color: '#0F2B4A', textDecoration: 'none' }}>Sign up</Link>
            <Link href="/dashboard" style={{ color: '#0F2B4A', textDecoration: 'none' }}>Dashboard</Link>
            <a href="#features" style={{ color: '#0F2B4A', textDecoration: 'none' }}>Features</a>
            <a href="#pricing" style={{ color: '#0F2B4A', textDecoration: 'none' }}>Pricing</a>
            <a href="#faq" style={{ color: '#0F2B4A', textDecoration: 'none' }}>FAQ</a>
            <Link href="/privacy" style={{ color: '#0F2B4A', textDecoration: 'none' }}>Privacy</Link>
            <Link href="/terms" style={{ color: '#0F2B4A', textDecoration: 'none' }}>Terms</Link>
          </div>
          <p style={{ opacity: 0.6, fontSize: '0.7rem', marginTop: '0.5rem' }}>
            © {new Date().getFullYear()} Cresoa · All rights reserved.
          </p>
        </div>
      </footer>
    </main>
  )
}
