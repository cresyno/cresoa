'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function HomePage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const toggleMobileMenu = () => setMobileMenuOpen(!mobileMenuOpen)
  const closeMobileMenu = () => setMobileMenuOpen(false)

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
           NAVIGATION
           ───────────────────────────────────────────── */
        .navbar {
          background: #0F2B4A;
          padding: 0.7rem 1.5rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          position: sticky;
          top: 0;
          z-index: 1000;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
        }
        .navbar .logo { display: flex; align-items: center; gap: 0.6rem; }
        .navbar .logo span { color: #fff; font-size: 1.2rem; font-weight: 700; font-family: 'Fraunces', serif; }
        .navbar .nav-links { display: flex; gap: 1.5rem; align-items: center; }
        .navbar .nav-links a { color: #C8D4E3; text-decoration: none; font-size: 0.85rem; transition: color 0.2s; }
        .navbar .nav-links a:hover { color: #D4A52A; }
        .navbar .nav-actions { display: flex; align-items: center; gap: 1rem; }
        .hamburger {
          display: none;
          background: none;
          border: none;
          color: #fff;
          font-size: 1.5rem;
          cursor: pointer;
          padding: 0.2rem 0.5rem;
        }
        .mobile-menu {
          display: none;
          background: #0F2B4A;
          padding: 1rem 1.5rem;
          flex-direction: column;
          gap: 0.8rem;
          border-top: 1px solid rgba(255,255,255,0.06);
        }
        .mobile-menu.open { display: flex; }
        .mobile-menu a { color: #C8D4E3; text-decoration: none; font-size: 0.95rem; }
        .mobile-menu a:hover { color: #D4A52A; }
        .mobile-menu .btn-primary { display: inline-block; text-align: center; }

        /* ─────────────────────────────────────────────
           HERO
           ───────────────────────────────────────────── */
        .hero {
          background: linear-gradient(150deg, #0F2B4A 0%, #061A2E 100%);
          padding: 5rem 1.5rem 3.5rem;
          position: relative;
          overflow: hidden;
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .hero::before {
          content: '';
          position: absolute;
          top: -30%;
          right: -10%;
          width: 500px;
          height: 500px;
          background: radial-gradient(circle, rgba(212,165,42,0.06) 0%, transparent 70%);
          border-radius: 50%;
        }
        .hero .content { position: relative; z-index: 1; max-width: 680px; }
        .hero h1 { color: #fff; font-size: 3.2rem; line-height: 1.08; margin: 0 0 0.8rem; font-weight: 700; letter-spacing: -0.5px; }
        .hero h1 span { color: #D4A52A; }
        .hero .subhead { color: #C8D4E3; font-size: 1.15rem; line-height: 1.7; margin: 0 0 2rem; max-width: 540px; }
        .hero .cta-group { display: flex; flex-wrap: wrap; gap: 0.8rem; }
        .hero .trust-badges {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem 1.5rem;
          margin-top: 1.5rem;
          color: #A0B4C9;
          font-size: 0.8rem;
        }
        .hero .trust-badges span { display: flex; align-items: center; gap: 0.3rem; }

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
        .trust-bar .item { color: #C8D4E3; font-size: 0.75rem; display: flex; align-items: center; gap: 0.4rem; }
        .trust-bar .item strong { color: #fff; font-size: 1rem; }

        /* ─────────────────────────────────────────────
           SECTION TITLES
           ───────────────────────────────────────────── */
        .section-title { text-align: center; margin-bottom: 2.5rem; }
        .section-title h2 { font-size: 2rem; color: #0F2B4A; margin: 0 0 0.5rem; }
        .section-title p { color: #8A8A8A; font-size: 1.05rem; max-width: 600px; margin: 0 auto; }

        /* ─────────────────────────────────────────────
           FEATURE CARDS
           ───────────────────────────────────────────── */
        .card-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1.5rem; }
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
        .industry-card:hover { transform: translateY(-4px); box-shadow: 0 12px 40px rgba(15,43,74,0.08); }
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
        .step-item:hover { border-color: #D4A52A; box-shadow: 0 8px 24px rgba(15,43,74,0.06); }
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
        .step-item .time { font-size: 0.65rem; color: #8A8A8A; }

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
           BETA FEEDBACK
           ───────────────────────────────────────────── */
        .feedback-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1.5rem; }
        .feedback-card {
          background: #fff;
          border-radius: 16px;
          padding: 1.5rem;
          border: 1px solid #E5E0D8;
          box-shadow: 0 2px 8px rgba(15,43,74,0.04);
          transition: all 0.3s ease;
        }
        .feedback-card:hover { transform: translateY(-4px); box-shadow: 0 8px 24px rgba(15,43,74,0.06); }
        .feedback-card blockquote { font-style: italic; color: #1A1A1A; font-size: 0.9rem; margin: 0 0 0.5rem; }
        .feedback-card .author { font-weight: 600; color: #0F2B4A; }
        .feedback-card .role { font-size: 0.75rem; color: #8A8A8A; }

        /* ─────────────────────────────────────────────
           STATS COUNTER
           ───────────────────────────────────────────── */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1.5rem;
          background: #fff;
          border-radius: 16px;
          padding: 2rem 1.5rem;
          border: 1px solid #E5E0D8;
          box-shadow: 0 2px 8px rgba(15,43,74,0.04);
        }
        .stats-grid .stat { text-align: center; }
        .stats-grid .stat .number { font-size: 2.2rem; font-weight: 700; color: #0F2B4A; }
        .stats-grid .stat .label { font-size: 0.75rem; color: #8A8A8A; margin-top: 0.2rem; }

        /* ─────────────────────────────────────────────
           FINAL CTA
           ───────────────────────────────────────────── */
        .final-cta {
          background: linear-gradient(135deg, #0F2B4A, #1A3F66);
          border-radius: 24px;
          max-width: 760px;
          margin: 0 auto 3rem;
          padding: 3rem 2rem;
          text-align: center;
          box-shadow: 0 8px 40px rgba(15,43,74,0.2);
        }
        .final-cta h2 { color: #fff; font-size: 2rem; margin: 0 0 0.8rem; }
        .final-cta p { color: #C8D4E3; font-size: 1.05rem; margin: 0 0 1.5rem; max-width: 500px; margin-left: auto; margin-right: auto; }

        /* ─────────────────────────────────────────────
           FOOTER
           ───────────────────────────────────────────── */
        .footer {
          border-top: 1px solid #E5E0D8;
          padding: 2.5rem 1.5rem;
          margin-top: 1rem;
          text-align: center;
          color: #8A8A8A;
          font-size: 0.8rem;
        }
        .footer .links { display: flex; justify-content: center; gap: 1.2rem; flex-wrap: wrap; margin-bottom: 1.2rem; }
        .footer .links a { color: #0F2B4A; text-decoration: none; }
        .footer .links a:hover { text-decoration: underline; }

        /* ─────────────────────────────────────────────
           RESPONSIVE
           ───────────────────────────────────────────── */
        @media (max-width: 768px) {
          .navbar .nav-links { display: none; }
          .navbar .nav-actions .btn { display: none; }
          .hamburger { display: block; }
          .mobile-menu.open { display: flex; }
          .hero h1 { font-size: 1.8rem; }
          .hero .subhead { font-size: 1rem; }
          .section-title h2 { font-size: 1.5rem; }
          .pricing-card .price { font-size: 2rem; }
          .card-grid { grid-template-columns: 1fr; }
          .pricing-grid { grid-template-columns: 1fr; }
          .step-item { flex-direction: column; align-items: center; text-align: center; }
          .stats-grid { grid-template-columns: 1fr 1fr; gap: 1rem; }
          .trust-bar { gap: 1rem; justify-content: center; }
          .feedback-grid { grid-template-columns: 1fr; }
          .final-cta { padding: 2rem 1.5rem; }
          .final-cta h2 { font-size: 1.5rem; }
        }
        @media (max-width: 480px) {
          .stats-grid { grid-template-columns: 1fr; }
          .hero h1 { font-size: 1.6rem; }
          .hero .cta-group .btn { flex: 1; text-align: center; }
          .pricing-card { padding: 1.5rem; }
        }
      `}</style>

      {/* =========================================================
          1. NAVIGATION (with client-side state)
          ========================================================= */}
      <nav className="navbar">
        <div className="logo">
          <svg width="36" height="36" viewBox="0 0 64 64" fill="none">
            <rect width="64" height="64" rx="16" fill="#0F2B4A" />
            <line x1="44" y1="18" x2="20" y2="42" stroke="#D4A52A" strokeWidth="3" strokeLinecap="round" />
            <circle cx="44" cy="18" r="4.5" fill="none" stroke="#D4A52A" strokeWidth="2.5" />
            <path d="M20 42 C 13 38, 11 29, 18 24" stroke="#D4A52A" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          </svg>
          <span>Cresoa</span>
        </div>
        <div className="nav-links">
          <a href="#features">Features</a>
          <a href="#pricing">Pricing</a>
          <a href="#faq">FAQ</a>
          <Link href="/beta-apply">Beta</Link>
        </div>
        <div className="nav-actions">
          <Link href="/login" style={{ color: '#C8D4E3', textDecoration: 'none', fontSize: '0.85rem' }}>Log in</Link>
          <Link href="/signup" className="btn btn-primary" style={{ padding: '0.5rem 1.2rem', fontSize: '0.85rem' }}>
            Start for Free
          </Link>
          <button className="hamburger" onClick={toggleMobileMenu}>
            ☰
          </button>
        </div>
      </nav>
      <div className={`mobile-menu ${mobileMenuOpen ? 'open' : ''}`}>
        <a href="#features" onClick={closeMobileMenu}>Features</a>
        <a href="#pricing" onClick={closeMobileMenu}>Pricing</a>
        <a href="#faq" onClick={closeMobileMenu}>FAQ</a>
        <Link href="/beta-apply" onClick={closeMobileMenu}>Beta</Link>
        <Link href="/login" onClick={closeMobileMenu}>Log in</Link>
        <Link href="/signup" className="btn btn-primary" style={{ textAlign: 'center' }} onClick={closeMobileMenu}>
          Start for Free
        </Link>
      </div>

      {/* The rest of the page is identical – I'll paste it here for completeness */}
      {/* =========================================================
          2. HERO
          ========================================================= */}
      <section className="hero">
        <div className="container">
          <div className="content">
            <h1>
              The simple operating system <br />
              <span>for Nigerian SMEs</span>
            </h1>
            <p className="subhead">
              Stop juggling notebooks and WhatsApp. Manage customers, orders, payments,
              and production — all in one place. Built for Nigerian businesses, by Nigerians.
            </p>
            <div className="cta-group">
              <Link href="/signup" className="btn btn-primary" style={{ fontSize: '1rem', padding: '0.9rem 2.5rem' }}>
                Start for Free →
              </Link>
              <a href="#features" className="btn btn-outline" style={{ fontSize: '1rem', padding: '0.9rem 2rem' }}>
                Explore
              </a>
            </div>
            <div className="trust-badges">
              <span>✅ No credit card required</span>
              <span>✅ 14‑day free trial</span>
              <span>✅ Cancel anytime</span>
            </div>
            <div className="trust-bar">
              <span className="item"><strong>47 beta users</strong> 🇳🇬</span>
              <span className="item"><strong>2 industries</strong> live</span>
              <span className="item">💬 <strong>WhatsApp</strong> integrated</span>
              <span className="item">⏳ <strong>90‑day</strong> beta access</span>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          3. BETA FEEDBACK
          ========================================================= */}
      <section className="container" style={{ padding: '2.5rem 1.5rem 2rem' }}>
        <div className="section-title">
          <h2>What Nigerian business owners are saying</h2>
          <p>Real feedback from real conversations — we're building in public.</p>
        </div>
        <div className="feedback-grid">
          <div className="feedback-card">
            <blockquote>
              “Finally someone built this for tailors in Lagos. I've been waiting for something that actually works.”
            </blockquote>
            <div className="author">— Tailor, Yaba</div>
            <div className="role">Fashion & Custom Wear</div>
          </div>
          <div className="feedback-card">
            <blockquote>
              “I need this for my phone repair shop. Tracking devices and parts is a headache — this solves it.”
            </blockquote>
            <div className="author">— Repairer, Abuja</div>
            <div className="role">Repairs & Technical Services</div>
          </div>
          <div className="feedback-card">
            <blockquote>
              “My customers love the tracking links. No more 'is it ready?' calls. They just check themselves.”
            </blockquote>
            <div className="author">— Furniture Maker, Ibadan</div>
            <div className="role">Custom Manufacturing</div>
          </div>
        </div>
      </section>

      {/* =========================================================
          4. STATS
          ========================================================= */}
      <section className="container" style={{ padding: '1rem 1.5rem 2.5rem' }}>
        <div className="stats-grid">
          <div className="stat">
            <div className="number">47</div>
            <div className="label">Beta Users</div>
          </div>
          <div className="stat">
            <div className="number">2</div>
            <div className="label">Industries Live</div>
          </div>
          <div className="stat">
            <div className="number">🇳🇬</div>
            <div className="label">Built in Nigeria</div>
          </div>
          <div className="stat">
            <div className="number">90</div>
            <div className="label">Days of Beta Access</div>
          </div>
        </div>
      </section>

      {/* =========================================================
          5. FEATURES (12 Cards)
          ========================================================= */}
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
            { icon: '📦', title: 'Inventory Management', desc: 'Track parts and components for repair jobs. Get low‑stock alerts and manage your inventory.' },
            { icon: '📅', title: 'Reminders & Notifications', desc: 'Automatically remind customers about pending payments or ready-for-pickup jobs.' },
            { icon: '📱', title: 'Mobile‑First Design', desc: 'Works perfectly on any device – phone, tablet, or desktop. Manage your business on the go.' },
            { icon: '🔐', title: 'Secure & Private', desc: 'Your data is encrypted and stored securely. We never share your data with third parties.' },
            { icon: '🤝', title: 'Made for Nigerian SMEs', desc: 'Built by Nigerians, for Nigerians. Designed for the way you actually work – offline, online, and everywhere in between.' },
          ].map((f) => (
            <div key={f.title} className="feature-card">
              <span className="icon">{f.icon}</span>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* =========================================================
          6. INDUSTRIES
          ========================================================= */}
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

      {/* =========================================================
          7. HOW IT WORKS
          ========================================================= */}
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
              <span className="time">⏱ 2 minutes</span>
            </div>
          </div>
          <div className="step-item">
            <span className="number">2</span>
            <div>
              <h4>Add customers & orders</h4>
              <p>Import your customers, add their details, and create your first order or repair job.</p>
              <span className="time">⏱ 5 minutes</span>
            </div>
          </div>
          <div className="step-item">
            <span className="number">3</span>
            <div>
              <h4>Run your business</h4>
              <p>Track orders, send tracking links, record payments, and grow with confidence.</p>
              <span className="time">🚀 Start now</span>
            </div>
          </div>
        </div>
        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          <Link href="/signup" className="btn btn-primary" style={{ fontSize: '1rem', padding: '0.9rem 2.5rem' }}>
            Join Early Access →
          </Link>
        </div>
      </section>

      {/* =========================================================
    8. PRICING
    ========================================================= */}
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
      {/* =========================================================
          9. EARLY ACCESS / BETA APPLY CTA
          ========================================================= */}
      <section style={{ background: '#F8F6F2', padding: '2rem 1.5rem' }}>
        <div style={{ maxWidth: '720px', margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ color: '#0F2B4A', fontSize: '1.5rem', marginBottom: '0.5rem' }}>
            🧪 Join the Cresoa Beta
          </h2>
          <p style={{ color: '#8A8A8A', marginBottom: '1.5rem' }}>
            Get early access to Cresoa — free during beta. We're building for Nigerian SMEs.
          </p>
          <Link href="/beta-apply" className="btn btn-primary" style={{ fontSize: '1rem', padding: '0.9rem 2.5rem' }}>
            Apply for Early Access →
          </Link>
          <p style={{ fontSize: '0.7rem', color: '#8A8A8A', marginTop: '0.8rem' }}>
            Free during beta · Launching Q4 2026
          </p>
        </div>
      </section>

      {/* =========================================================
          10. FAQ (10 Questions)
          ========================================================= */}
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
            { q: 'Can I use Cresoa on my phone?', a: 'Yes! Cresoa is fully responsive and works on any device — phone, tablet, or desktop.' },
            { q: 'How do I get started?', a: 'Simply click "Join Early Access" on this page, create your account, choose your business type, and start adding customers.' },
            { q: 'Can I upgrade or downgrade my plan?', a: 'Absolutely. You can change your plan at any time. Upgrades take effect immediately; downgrades take effect at the end of your billing cycle.' },
            { q: 'Is my data safe?', a: 'Yes. Your data is encrypted and stored securely on Supabase. We never share your data with third parties without your explicit consent.' },
            { q: 'Do you offer WhatsApp support?', a: 'Yes! Beta users get WhatsApp support directly from the Cresoa team.' },
            { q: 'When is the full launch?', a: 'We plan to launch Q4 2026. Beta users will get extended free access after launch.' },
          ].map((item, i) => (
            <details key={i} className="faq-item">
              <summary>{item.q}</summary>
              <div className="faq-answer">{item.a}</div>
            </details>
          ))}
        </div>
      </section>

      {/* =========================================================
          11. FINAL CTA
          ========================================================= */}
      <section className="final-cta">
        <h2>Ready to take control of your business?</h2>
        <p>Join 47 Nigerian SMEs already using Cresoa.</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.8rem', justifyContent: 'center' }}>
          <Link href="/signup" className="btn btn-primary" style={{ fontSize: '1.05rem', padding: '0.9rem 2.5rem' }}>
            Get Early Access →
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

      {/* =========================================================
          12. FOOTER
          ========================================================= */}
      <footer className="footer">
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', flexWrap: 'wrap', marginBottom: '1.2rem' }}>
            <span><strong style={{ color: '#0F2B4A' }}>Cresoa</strong> · Built in Nigeria for Nigerian businesses 🇳🇬</span>
          </div>
          <div className="links">
            <Link href="/login">Log in</Link>
            <Link href="/signup">Sign up</Link>
            <Link href="/dashboard">Dashboard</Link>
            <a href="#features">Features</a>
            <a href="#pricing">Pricing</a>
            <a href="#faq">FAQ</a>
            <Link href="/beta-apply">Beta</Link>
          </div>
          <p style={{ opacity: 0.6, fontSize: '0.7rem', marginTop: '0.5rem' }}>
            © {new Date().getFullYear()} Cresoa · All rights reserved.
          </p>
        </div>
      </footer>
    </main>
  )
          }
