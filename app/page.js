'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Logo from '../components/Logo'
import ThemeToggle from '../components/ThemeToggle'
import { Icon } from '../components/Icon'

export default function HomePage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [counts, setCounts] = useState({ users: 0, industries: 0, days: 0 })
  const statsRef = useRef(null)

  const toggleMobileMenu = () => setMobileMenuOpen(!mobileMenuOpen)
  const closeMobileMenu = () => setMobileMenuOpen(false)

  const scrollToSection = (e, id) => {
    e.preventDefault()
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    closeMobileMenu()
  }

  // ─── Animated Count-up for Stats ──────────────────────────
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          let start = 0
          const endUsers = 47, endIndustries = 2, endDays = 90
          const duration = 1500
          const stepTime = 16
          const steps = duration / stepTime

          let step = 0
          const interval = setInterval(() => {
            step++
            const progress = step / steps
            setCounts({
              users: Math.floor(progress * endUsers),
              industries: Math.floor(progress * endIndustries),
              days: Math.floor(progress * endDays),
            })
            if (step >= steps) {
              setCounts({ users: endUsers, industries: endIndustries, days: endDays })
              clearInterval(interval)
            }
          }, stepTime)
        }
      },
      { threshold: 0.5 }
    )
    if (statsRef.current) observer.observe(statsRef.current)
    return () => observer.disconnect()
  }, [])

  // ─── Custom FAQ Accordion Logic ───────────────────────────
  const [openFaqIndex, setOpenFaqIndex] = useState(null)
  const toggleFaq = (index) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index)
  }

  const faqs = [
    { q: 'What is Cresoa?', a: 'Cresoa is a business management platform built for Nigerian SMEs. It helps you manage customers, orders, payments, and production in one place.' },
    { q: 'Is there a free plan?', a: 'Yes! Cresoa has a Free plan that includes up to 20 customers and 50 orders. You can use it indefinitely without paying.' },
    { q: 'How much does it cost?', a: 'The Starter plan is ₦3,500/month and the Pro plan is ₦9,500/month. Both include a 90-day beta with full Pro features, no credit card required.' },
    { q: 'What industries does Cresoa support?', a: 'Currently, Cresoa supports Fashion & Custom Wear and Repairs & Technical Services. Manufacturing is coming soon.' },
    { q: 'Can I use Cresoa on my phone?', a: 'Yes! Cresoa is fully responsive and works on any device—phone, tablet, or desktop.' },
    { q: 'How do I get started?', a: 'Simply click "Start Beta", create your account, choose your business type, and start adding customers.' },
  ]

  return (
    <main
      style={{
        minHeight: '100vh',
        background: 'var(--color-bg)',
        color: 'var(--color-text)',
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
        transition: 'background 0.3s, color 0.3s',
      }}
    >
      <style jsx>{`
        /* ─── CSS Variables ─── */
        :root {
          --color-bg: #F8F6F2;
          --color-card: #FFFFFF;
          --color-text: #1A1A1A;
          --color-text-muted: #8A8A8A;
          --color-border: #E5E0D8;
          --color-primary: #0F2B4A;
          --color-accent: #D4A52A;
          --shadow-sm: 0 2px 8px rgba(15,43,74,0.04);
          --shadow-md: 0 4px 16px rgba(15,43,74,0.06);
          --shadow-lg: 0 8px 32px rgba(15,43,74,0.08);
        }
        [data-theme="dark"] {
          --color-bg: #12121A;
          --color-card: #1E1E2A;
          --color-text: #E8E8E8;
          --color-text-muted: #AAAAAA;
          --color-border: #2A2A3A;
          --shadow-sm: 0 2px 8px rgba(0,0,0,0.3);
          --shadow-md: 0 4px 16px rgba(0,0,0,0.4);
          --shadow-lg: 0 8px 32px rgba(0,0,0,0.5);
        }

        h1, h2, h3, h4 {
          font-family: 'Fraunces', serif;
          font-weight: 700;
          letter-spacing: -0.02em;
        }

        /* ─── Animation Utilities ─── */
        .slide-up {
          opacity: 0;
          transform: translateY(30px);
          animation: fadeUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .slide-up-delay-1 { animation-delay: 0.2s; }
        .slide-up-delay-2 { animation-delay: 0.4s; }
        .slide-up-delay-3 { animation-delay: 0.6s; }

        @keyframes fadeUp {
          to { opacity: 1; transform: translateY(0); }
        }

        .container { max-width: 1100px; margin: 0 auto; padding: 0 1.5rem; }

        /* ─── Buttons ─── */
        .btn {
          display: inline-flex; align-items: center; gap: 0.5rem;
          padding: 0.7rem 1.8rem; border-radius: 8px;
          font-weight: 600; font-size: 0.95rem;
          text-decoration: none; border: none; cursor: pointer;
          transition: all 0.25s ease;
          background: var(--color-accent); color: #0F2B4A;
          box-shadow: 0 4px 16px rgba(212,165,42,0.3);
        }
        .btn:hover { transform: translateY(-2px); box-shadow: 0 8px 32px rgba(212,165,42,0.4); }
        .btn-outline {
          background: transparent; color: var(--color-text);
          border: 1px solid var(--color-border); box-shadow: none;
        }
        .btn-outline:hover { background: var(--color-card); border-color: var(--color-accent); }
        .btn-secondary {
          background: var(--color-primary); color: #fff;
          box-shadow: 0 4px 16px rgba(15,43,74,0.3);
        }
        .btn-secondary:hover { background: #1A3F66; }

        /* ─── Navbar Buttons (The new button links) ─── */
        .nav-btn {
          display: inline-flex; align-items: center;
          padding: 0.4rem 1rem; border-radius: 8px;
          font-size: 0.85rem; font-weight: 500;
          text-decoration: none; border: 1px solid var(--color-border);
          background: transparent; color: var(--color-text-muted);
          transition: all 0.2s ease; cursor: pointer;
        }
        .nav-btn:hover {
          border-color: var(--color-accent); color: var(--color-text);
          background: rgba(212, 165, 42, 0.03);
        }
        .nav-btn-primary {
          background: var(--color-accent); color: #0F2B4A;
          border: 1px solid var(--color-accent); box-shadow: 0 4px 12px rgba(212,165,42,0.2);
        }
        .nav-btn-primary:hover {
          background: #C79A2B; border-color: #C79A2B; color: #0F2B4A;
        }

        /* ─── Navbar ─── */
        .navbar {
          background: var(--color-card);
          border-bottom: 1px solid var(--color-border);
          padding: 0.8rem 1.5rem;
          display: flex; justify-content: space-between; align-items: center;
          position: sticky; top: 0; z-index: 1000;
          backdrop-filter: blur(12px);
          flex-wrap: wrap; gap: 0.5rem;
        }
        .navbar .logo-container { display: flex; align-items: center; gap: 0.6rem; }
        .navbar .nav-links { display: flex; gap: 0.6rem; align-items: center; flex-wrap: wrap; }
        .navbar .nav-actions { display: flex; align-items: center; gap: 0.8rem; flex-wrap: wrap; }
        .hamburger {
          display: none; background: none; border: none;
          color: var(--color-text); font-size: 1.2rem; cursor: pointer;
          padding: 0.2rem 0.5rem;
        }

        /* ─── Mobile Drawer ─── */
        .mobile-overlay {
          display: none; position: fixed; inset: 0;
          background: rgba(0,0,0,0.4); z-index: 999;
          backdrop-filter: blur(4px);
        }
        .mobile-overlay.open { display: block; }
        .mobile-drawer {
          position: fixed; top: 0; left: 0; bottom: 0; width: 280px;
          background: var(--color-card); padding: 2rem 1.5rem;
          transform: translateX(-100%); transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          z-index: 1000; display: flex; flex-direction: column; gap: 1rem;
          border-right: 1px solid var(--color-border);
        }
        .mobile-drawer.open { transform: translateX(0); }
        .mobile-drawer .close-btn {
          align-self: flex-end; background: none; border: none;
          color: var(--color-text); font-size: 1.5rem; cursor: pointer;
        }
        .mobile-drawer .nav-btn, .mobile-drawer .nav-btn-primary {
          display: flex; justify-content: flex-start; width: 100%; padding: 0.6rem 1rem;
        }

        /* ─── Hero ─── */
        .hero {
          background: linear-gradient(150deg, #0F2B4A 0%, #061A2E 100%);
          padding: 5rem 1.5rem 4rem; position: relative; overflow: hidden;
        }
        .hero::before {
          content: ''; position: absolute; top: -30%; right: -10%;
          width: 500px; height: 500px;
          background: radial-gradient(circle, rgba(212,165,42,0.08) 0%, transparent 70%);
          border-radius: 50%;
        }
        .hero .content { position: relative; z-index: 1; max-width: 700px; }
        .hero h1 { color: #fff; font-size: 3rem; line-height: 1.08; margin: 0 0 0.8rem; }
        .hero h1 span { color: #D4A52A; }
        .hero .subhead {
          color: #C8D4E3; font-size: 1.1rem; line-height: 1.7; margin: 0 0 2rem; max-width: 540px;
        }
        .hero .cta-group { display: flex; flex-wrap: wrap; gap: 0.8rem; }
        .hero .trust-badges {
          display: flex; flex-wrap: wrap; gap: 0.5rem 1.5rem; margin-top: 1.5rem;
          color: #A0B4C9; font-size: 0.8rem;
        }
        .hero .trust-badges span { display: flex; align-items: center; gap: 0.3rem; }
        .trust-bar {
          display: flex; justify-content: center; gap: 2rem; flex-wrap: wrap;
          padding: 1.2rem 0; border-top: 1px solid rgba(255,255,255,0.08); margin-top: 2.5rem;
        }
        .trust-bar .item { color: #C8D4E3; font-size: 0.75rem; display: flex; align-items: center; gap: 0.4rem; }
        .trust-bar .item strong { color: #fff; font-size: 1rem; }

        /* ─── Sections ─── */
        .section-title { text-align: center; margin-bottom: 2.5rem; }
        .section-title h2 { font-size: 2rem; color: var(--color-text); margin: 0 0 0.5rem; }
        .section-title p { color: var(--color-text-muted); font-size: 1.05rem; max-width: 600px; margin: 0 auto; }

        /* ─── Cards ─── */
        .card-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1.5rem; }
        .feature-card {
          background: var(--color-card); border-radius: 16px; padding: 1.8rem 1.2rem;
          border: 1px solid var(--color-border); text-align: center;
          transition: all 0.3s ease; box-shadow: var(--shadow-sm);
        }
        .feature-card:hover { transform: translateY(-4px); box-shadow: var(--shadow-lg); border-color: var(--color-accent); }
        .feature-card .icon-wrapper { margin-bottom: 0.8rem; color: var(--color-accent); }
        .feature-card h3 { color: var(--color-text); font-size: 1.1rem; margin: 0 0 0.5rem; }
        .feature-card p { color: var(--color-text-muted); font-size: 0.9rem; margin: 0; line-height: 1.6; }

        /* ─── Why Cresoa ─── */
        .why-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1.5rem; text-align: center; }
        .why-item .number { font-size: 2.5rem; font-weight: 700; color: var(--color-accent); display: flex; align-items: center; justify-content: center; gap: 0.5rem; }
        .why-item .label { color: var(--color-text-muted); font-size: 0.85rem; margin-top: 0.2rem; }

        /* ─── Industry Cards ─── */
        .industry-card {
          background: var(--color-card); border-radius: 16px; padding: 1.8rem 1.2rem;
          border: 1px solid var(--color-border); text-align: center; transition: all 0.3s ease; box-shadow: var(--shadow-sm);
        }
        .industry-card:hover { transform: translateY(-4px); box-shadow: var(--shadow-lg); border-color: var(--color-accent); }
        .industry-card .icon-wrapper { font-size: 2.5rem; margin-bottom: 0.6rem; }
        .industry-card h3 { color: var(--color-text); font-size: 1.1rem; margin: 0 0 0.3rem; }
        .industry-card p { color: var(--color-text-muted); font-size: 0.85rem; margin: 0; }
        .industry-card .tag {
          display: inline-block; font-size: 0.55rem; font-weight: 700; padding: 0.15rem 0.6rem;
          border-radius: 12px; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 0.5rem;
        }
        .tag-live { background: #DCEBE2; color: #2E7D5E; }
        .tag-soon { background: #F6E9C8; color: #C79A2B; }

        /* ─── Steps ─── */
        .step-item {
          display: flex; align-items: flex-start; gap: 1rem;
          background: var(--color-card); padding: 1.2rem 1.5rem; border-radius: 14px;
          border: 1px solid var(--color-border); box-shadow: var(--shadow-sm); transition: all 0.3s ease;
        }
        .step-item:hover { border-color: var(--color-accent); box-shadow: var(--shadow-md); }
        .step-item .number {
          background: var(--color-primary); color: #fff; width: 40px; height: 40px;
          border-radius: 50%; display: flex; align-items: center; justify-content: center;
          font-weight: 700; font-size: 1rem; flex-shrink: 0;
        }
        .step-item h4 { margin: 0 0 0.2rem; color: var(--color-text); font-size: 1rem; }
        .step-item p { margin: 0; color: var(--color-text-muted); font-size: 0.9rem; line-height: 1.5; }
        .step-item .time { font-size: 0.65rem; color: var(--color-text-muted); }

        /* ─── Pricing ─── */
        .pricing-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.5rem; max-width: 900px; margin: 0 auto; }
        .pricing-card {
          background: var(--color-card); border-radius: 16px; padding: 2rem 1.5rem;
          border: 2px solid var(--color-border); text-align: center; transition: all 0.3s ease; box-shadow: var(--shadow-sm);
        }
        .pricing-card:hover { border-color: var(--color-accent); box-shadow: var(--shadow-lg); }
        .pricing-card.popular {
          border-color: var(--color-accent); background: var(--color-card); position: relative;
        }
        .pricing-card.popular .popular-badge {
          background: var(--color-accent); color: #0F2B4A; font-size: 0.6rem; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.5px; padding: 0.15rem 0.8rem; border-radius: 20px; display: inline-block; margin-bottom: 0.8rem;
        }
        .pricing-card .plan-name { font-size: 1.1rem; font-weight: 600; color: var(--color-text); margin: 0; }
        .pricing-card .price { font-size: 2.8rem; font-weight: 700; color: var(--color-text); margin: 0.3rem 0; }
        .pricing-card .price span { font-size: 1rem; font-weight: 400; color: var(--color-text-muted); }
        .pricing-card .description { color: var(--color-text-muted); font-size: 0.85rem; margin: 0 0 1.2rem; }
        .pricing-card ul { list-style: none; padding: 0; margin: 1.5rem 0; text-align: left; }
        .pricing-card ul li { padding: 0.5rem 0; border-bottom: 1px solid var(--color-border); font-size: 0.85rem; color: var(--color-text); display: flex; align-items: center; gap: 0.5rem; }
        .pricing-card ul li:last-child { border-bottom: none; }
        .pricing-card ul li .check { color: var(--color-success); font-weight: 700; }
        .pricing-card ul li .cross { color: var(--color-danger); font-weight: 700; }

        /* ─── Smooth FAQ Accordion ─── */
        .faq-item { background: var(--color-card); border-radius: 12px; border: 1px solid var(--color-border); margin-bottom: 0.8rem; overflow: hidden; transition: all 0.2s ease; }
        .faq-item:hover { border-color: var(--color-accent); }
        .faq-header {
          padding: 1rem 1.2rem; font-weight: 600; color: var(--color-text); cursor: pointer;
          display: flex; justify-content: space-between; align-items: center; list-style: none;
        }
        .faq-header .arrow {
          color: var(--color-accent); transition: transform 0.3s ease; font-size: 1.2rem; font-weight: 300;
        }
        .faq-header .arrow.open { transform: rotate(180deg); }
        .faq-answer {
          max-height: 0; overflow: hidden; transition: max-height 0.35s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease;
          opacity: 0; padding: 0 1.2rem; color: var(--color-text-muted); font-size: 0.9rem; line-height: 1.7;
        }
        .faq-answer.open { max-height: 300px; opacity: 1; padding: 0 1.2rem 1.2rem; }

        /* ─── Final CTA ─── */
        .final-cta {
          background: linear-gradient(135deg, #0F2B4A, #1A3F66); border-radius: 24px;
          max-width: 760px; margin: 0 auto 3rem; padding: 3rem 2rem; text-align: center;
          box-shadow: 0 8px 40px rgba(15,43,74,0.2);
        }
        .final-cta h2 { color: #fff; font-size: 2rem; margin: 0 0 0.8rem; }
        .final-cta p { color: #C8D4E3; font-size: 1.05rem; margin: 0 0 1.5rem; max-width: 500px; margin-inline: auto; }

        /* ─── Footer ─── */
        .footer { border-top: 1px solid var(--color-border); padding: 2.5rem 1.5rem; margin-top: 1rem; text-align: center; color: var(--color-text-muted); font-size: 0.8rem; }
        .footer .links { display: flex; justify-content: center; gap: 1.2rem; flex-wrap: wrap; margin-bottom: 1.2rem; }
        .footer .links a { color: var(--color-text); text-decoration: none; transition: color 0.2s; }
        .footer .links a:hover { color: var(--color-accent); }

        /* ─── Responsive ─── */
        @media (max-width: 768px) {
          .navbar .nav-links { display: none; }
          .navbar .nav-actions .btn { display: none; }
          .hamburger { display: flex; align-items: center; }
          .hero h1 { font-size: 1.8rem; }
          .hero .subhead { font-size: 1rem; }
          .section-title h2 { font-size: 1.5rem; }
          .pricing-card .price { font-size: 2rem; }
          .card-grid { grid-template-columns: 1fr; }
          .pricing-grid { grid-template-columns: 1fr; }
          .step-item { flex-direction: column; align-items: center; text-align: center; }
          .why-grid { grid-template-columns: 1fr 1fr; }
          .trust-bar { gap: 1rem; justify-content: center; flex-wrap: wrap; }
          .final-cta { padding: 2rem 1.5rem; }
          .final-cta h2 { font-size: 1.5rem; }
        }
        @media (max-width: 480px) {
          .why-grid { grid-template-columns: 1fr; }
          .hero h1 { font-size: 1.6rem; }
          .hero .cta-group .btn { flex: 1; text-align: center; }
          .pricing-card { padding: 1.5rem; }
        }
      `}</style>

      {/* =========================================================
          1. NAVIGATION (Refined with Buttons)
          ========================================================= */}
      <nav className="navbar">
        <div className="logo-container">
          <Logo variant="primary" size="large" />
        </div>

        {/* Nav Links as buttons */}
        <div className="nav-links">
          <a href="#why" onClick={(e) => scrollToSection(e, 'why')} className="nav-btn">Why Cresoa</a>
          <a href="#features" onClick={(e) => scrollToSection(e, 'features')} className="nav-btn">Features</a>
          <Link href="/pricing" className="nav-btn">Pricing</Link>
          <a href="#faq" onClick={(e) => scrollToSection(e, 'faq')} className="nav-btn">FAQ</a>
        </div>

        <div className="nav-actions">
          <ThemeToggle />
          <Link href="/login" style={{ color: 'var(--color-text-muted)', textDecoration: 'none', fontSize: '0.85rem' }}>Log in</Link>
          <Link href="/signup" className="nav-btn nav-btn-primary">Start Beta</Link>
          <button className="hamburger" onClick={toggleMobileMenu}>
            <Icon name="menu" size={24} stroke="var(--color-text)" />
          </button>
        </div>
      </nav>

      {/* Mobile Drawer (Also updated with buttons) */}
      <div className={`mobile-overlay ${mobileMenuOpen ? 'open' : ''}`} onClick={closeMobileMenu} />
      <div className={`mobile-drawer ${mobileMenuOpen ? 'open' : ''}`}>
        <button className="close-btn" onClick={closeMobileMenu}>
          <Icon name="x" size={24} stroke="var(--color-text)" />
        </button>
        <a href="#why" onClick={(e) => scrollToSection(e, 'why')} className="nav-btn">Why Cresoa</a>
        <a href="#features" onClick={(e) => scrollToSection(e, 'features')} className="nav-btn">Features</a>
        <Link href="/pricing" className="nav-btn">Pricing</Link>
        <a href="#faq" onClick={(e) => scrollToSection(e, 'faq')} className="nav-btn">FAQ</a>
        <Link href="/login" onClick={closeMobileMenu} className="nav-btn">Log in</Link>
        <Link href="/signup" className="nav-btn nav-btn-primary" onClick={closeMobileMenu}>
          Start Beta
        </Link>
        <div style={{ paddingTop: '0.5rem' }}>
          <ThemeToggle />
        </div>
      </div>

      {/* =========================================================
          2. HERO
          ========================================================= */}
      <section className="hero">
        <div className="container">
          <div className="content">
            <h1>
              Run your Nigerian business <br />
              <span>from one place.</span>
            </h1>
            <p className="subhead">
              Track orders, manage customers, and get paid—all in one platform. No more messy notebooks, WhatsApp chaos, or missed payments.
            </p>
            <div className="cta-group">
              <Link href="/signup" className="btn" style={{ fontSize: '1rem', padding: '0.9rem 2.5rem' }}>
                Start Beta <Icon name="arrow-right" size={16} stroke="#0F2B4A" />
              </Link>
              <a href="#features" className="btn btn-outline" style={{ fontSize: '1rem', padding: '0.9rem 2rem' }} onClick={(e) => scrollToSection(e, 'features')}>
                Learn more
              </a>
            </div>
            <div className="trust-badges">
              <span><Icon name="check" size={14} stroke="#A0B4C9" /> No credit card required</span>
              <span><Icon name="check" size={14} stroke="#A0B4C9" /> 90-day beta</span>
              <span><Icon name="check" size={14} stroke="#A0B4C9" /> Cancel anytime</span>
            </div>
            <div className="trust-bar">
              <span className="item"><Icon name="users" size={14} stroke="#C8D4E3" /> <strong>47</strong> beta users</span>
              <span className="item"><Icon name="layers" size={14} stroke="#C8D4E3" /> <strong>2</strong> industries live</span>
              <span className="item"><Icon name="smartphone" size={14} stroke="#C8D4E3" /> Mobile-first design</span>
              <span className="item"><Icon name="message-circle" size={14} stroke="#C8D4E3" /> WhatsApp integration</span>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          3. WHY CRESOA
          ========================================================= */}
      <section id="why" className="container" style={{ padding: '3.5rem 1.5rem' }}>
        <div className="section-title">
          <h2>Why Nigerian businesses choose Cresoa</h2>
          <p>Real tools for real businesses. Built for your workflow.</p>
        </div>
        <div className="why-grid" ref={statsRef}>
          <div className="why-item">
            <div className="number"><Icon name="users" size={28} stroke="var(--color-accent)" /> {counts.users}</div>
            <div className="label">Beta users</div>
          </div>
          <div className="why-item">
            <div className="number"><Icon name="layers" size={28} stroke="var(--color-accent)" /> {counts.industries}</div>
            <div className="label">Industries live</div>
          </div>
          <div className="why-item">
            <div className="number"><Icon name="globe" size={28} stroke="var(--color-accent)" /> 🇳🇬</div>
            <div className="label">Built in Nigeria</div>
          </div>
          <div className="why-item">
            <div className="number"><Icon name="clock" size={28} stroke="var(--color-accent)" /> {counts.days}</div>
            <div className="label">Days of free access</div>
          </div>
          <div className="why-item">
            <div className="number"><Icon name="smartphone" size={28} stroke="var(--color-accent)" /> 📱</div>
            <div className="label">Mobile-first</div>
          </div>
        </div>
      </section>

      {/* =========================================================
          4. FEATURES
          ========================================================= */}
      <section id="features" className="container" style={{ padding: '2rem 1.5rem 3.5rem' }}>
        <div className="section-title">
          <h2>Everything you need to run smoothly</h2>
          <p>One platform for your customers, orders, payments, and production.</p>
        </div>
        <div className="card-grid">
          {[
            { icon: 'users', title: 'Customer Management', desc: 'Store customer details, measurements, and history. Reuse them for every order. Never lose a customer again.' },
            { icon: 'file-text', title: 'Order & Job Tracking', desc: 'Track orders through every stage: Cutting, Sewing, Ready. For repairs: Diagnosing, Repairing, Ready.' },
            { icon: 'dollar-sign', title: 'Payments & Balances', desc: 'Record deposits, track balances, and see who owes what instantly. Know your cash flow at a glance.' },
            { icon: 'link', title: 'Customer Tracking Links', desc: 'Give each customer a private link to check their order status 24/7. No more "is it ready?" calls.' },
            { icon: 'layers', title: 'Group / Aso-Ebi Orders', desc: 'Manage group orders with one coordinator, many members, and one deadline. Perfect for fashion businesses.' },
            { icon: 'message-circle', title: 'WhatsApp Integration', desc: 'Share tracking links and updates directly to your customers WhatsApp. They will love it.' },
            { icon: 'bar-chart-2', title: 'Analytics & Reports', desc: 'See your business performance at a glance. Revenue, orders, customer growth—all in one dashboard.' },
            { icon: 'package', title: 'Inventory Management', desc: 'Track parts and components for repair jobs. Get low-stock alerts and manage your inventory.' },
            { icon: 'calendar', title: 'Reminders & Notifications', desc: 'Automatically remind customers about pending payments or ready-for-pickup jobs.' },
          ].map((f, i) => (
            <div key={f.title} className={`feature-card slide-up slide-up-delay-${(i % 3) + 1}`}>
              <div className="icon-wrapper">
                <Icon name={f.icon} size={32} stroke="var(--color-accent)" />
              </div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* =========================================================
          5. INDUSTRIES
          ========================================================= */}
      <section className="container" style={{ padding: '1.5rem 1.5rem 3.5rem' }}>
        <div className="section-title">
          <h2>Built for the way you work</h2>
          <p>Cresoa adapts to different types of businesses—starting with these.</p>
        </div>
        <div className="card-grid">
          <div className="industry-card">
            <div className="icon-wrapper"><Icon name="layers" size={28} stroke="var(--color-accent)" /></div>
            <h3>Fashion & Custom Wear</h3>
            <p>Tailors, fashion designers, uniform makers. Manage customers, measurements, orders, and production.</p>
            <span className="tag tag-live">Live Now</span>
          </div>
          <div className="industry-card" style={{ borderColor: 'var(--color-accent)' }}>
            <div className="icon-wrapper"><Icon name="tool" size={28} stroke="var(--color-accent)" /></div>
            <h3>Repairs & Technical Services</h3>
            <p>Phone, laptop, and electronics repair. Track devices, jobs, parts, and payments.</p>
            <span className="tag tag-live">Live Now</span>
          </div>
          <div className="industry-card">
            <div className="icon-wrapper"><Icon name="building" size={28} stroke="var(--color-accent)" /></div>
            <h3>Custom Manufacturing</h3>
            <p>Furniture makers, metal fabricators, custom product creators. Manage projects and production.</p>
            <span className="tag tag-soon">Coming Soon</span>
          </div>
        </div>
      </section>

      {/* =========================================================
          6. HOW IT WORKS
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
              <p>Sign up free and choose your business type—Fashion, Repairs, or Manufacturing.</p>
              <span className="time"><Icon name="clock" size={12} stroke="var(--color-text-muted)" /> 2 minutes</span>
            </div>
          </div>
          <div className="step-item">
            <span className="number">2</span>
            <div>
              <h4>Add customers & orders</h4>
              <p>Import your customers, add their details, and create your first order or repair job.</p>
              <span className="time"><Icon name="clock" size={12} stroke="var(--color-text-muted)" /> 5 minutes</span>
            </div>
          </div>
          <div className="step-item">
            <span className="number">3</span>
            <div>
              <h4>Run your business</h4>
              <p>Track orders, send tracking links, record payments, and grow with confidence.</p>
              <span className="time"><Icon name="check" size={12} stroke="var(--color-success)" /> Start now</span>
            </div>
          </div>
        </div>
        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          <Link href="/signup" className="btn" style={{ fontSize: '1rem', padding: '0.9rem 2.5rem' }}>
            Start Beta <Icon name="arrow-right" size={16} stroke="#0F2B4A" />
          </Link>
        </div>
      </section>

      {/* =========================================================
          7. PRICING
          ========================================================= */}
      <section id="pricing" className="container" style={{ padding: '3.5rem 1.5rem' }}>
        <div className="section-title">
          <h2>Simple, transparent pricing</h2>
          <p>Start free, pay only when you are ready to grow.</p>
        </div>
        <div className="pricing-grid">
          <div className="pricing-card">
            <p className="plan-name">Free</p>
            <div className="price">₦0</div>
            <p className="description">Perfect for getting started</p>
            <ul>
              <li><span className="check"><Icon name="check" size={14} stroke="#2E7D5E" /></span> 20 customers</li>
              <li><span className="check"><Icon name="check" size={14} stroke="#2E7D5E" /></span> 50 orders</li>
              <li><span className="check"><Icon name="check" size={14} stroke="#2E7D5E" /></span> Basic order tracking</li>
              <li><span className="cross"><Icon name="x" size={14} stroke="#D9534F" /></span> Staff accounts</li>
              <li><span className="cross"><Icon name="x" size={14} stroke="#D9534F" /></span> WhatsApp integration</li>
            </ul>
            <Link href="/signup" className="btn btn-outline" style={{ width: '100%', justifyContent: 'center' }}>
              Start Free
            </Link>
          </div>

          <div className="pricing-card popular">
            <div className="popular-badge">Most Popular</div>
            <p className="plan-name">Starter</p>
            <div className="price">₦3,500 <span>/month</span></div>
            <p className="description">For growing businesses</p>
            <ul>
              <li><span className="check"><Icon name="check" size={14} stroke="#2E7D5E" /></span> Unlimited customers</li>
              <li><span className="check"><Icon name="check" size={14} stroke="#2E7D5E" /></span> Unlimited orders</li>
              <li><span className="check"><Icon name="check" size={14} stroke="#2E7D5E" /></span> 2 staff accounts</li>
              <li><span className="check"><Icon name="check" size={14} stroke="#2E7D5E" /></span> WhatsApp integration</li>
              <li><span className="check"><Icon name="check" size={14} stroke="#2E7D5E" /></span> Customer tracking links</li>
            </ul>
            <Link href="/signup" className="btn" style={{ width: '100%', justifyContent: 'center' }}>
              Start Beta
            </Link>
          </div>

          <div className="pricing-card">
            <p className="plan-name">Pro</p>
            <div className="price">₦9,500 <span>/month</span></div>
            <p className="description">For established businesses</p>
            <ul>
              <li><span className="check"><Icon name="check" size={14} stroke="#2E7D5E" /></span> Everything in Starter</li>
              <li><span className="check"><Icon name="check" size={14} stroke="#2E7D5E" /></span> 10 staff accounts</li>
              <li><span className="check"><Icon name="check" size={14} stroke="#2E7D5E" /></span> Advanced analytics</li>
              <li><span className="check"><Icon name="check" size={14} stroke="#2E7D5E" /></span> Data export (Excel/PDF)</li>
              <li><span className="check"><Icon name="check" size={14} stroke="#2E7D5E" /></span> Priority support</li>
            </ul>
            <Link href="/signup" className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center' }}>
              Start Beta
            </Link>
          </div>
        </div>
      </section>

      {/* =========================================================
          8. FAQ (Smooth Accordion)
          ========================================================= */}
      <section id="faq" className="container" style={{ padding: '2rem 1.5rem 3.5rem', maxWidth: '720px' }}>
        <div className="section-title">
          <h2>Frequently asked questions</h2>
          <p>Everything you need to know about Cresoa.</p>
        </div>
        <div>
          {faqs.map((item, i) => (
            <div key={i} className="faq-item">
              <div className="faq-header" onClick={() => toggleFaq(i)}>
                {item.q}
                <span className={`arrow ${openFaqIndex === i ? 'open' : ''}`}>+</span>
              </div>
              <div className={`faq-answer ${openFaqIndex === i ? 'open' : ''}`}>
                {item.a}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* =========================================================
          9. FINAL CTA
          ========================================================= */}
      <section className="final-cta">
        <h2>Ready to take control of your business?</h2>
        <p>Join 47 Nigerian SMEs already using Cresoa.</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.8rem', justifyContent: 'center' }}>
          <Link href="/signup" className="btn" style={{ fontSize: '1.05rem', padding: '0.9rem 2.5rem' }}>
            Start Beta <Icon name="arrow-right" size={16} stroke="#0F2B4A" />
          </Link>
          <Link href="/login" className="btn btn-outline" style={{ fontSize: '1.05rem', padding: '0.9rem 2rem', background: 'transparent', color: '#fff', borderColor: 'rgba(255,255,255,0.3)' }}>
            Log in
          </Link>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', flexWrap: 'wrap', marginTop: '1.2rem', color: '#A0B4C9', fontSize: '0.75rem' }}>
          <span><Icon name="check" size={12} stroke="#A0B4C9" /> 90-day beta</span>
          <span><Icon name="check" size={12} stroke="#A0B4C9" /> No credit card</span>
          <span><Icon name="check" size={12} stroke="#A0B4C9" /> Cancel anytime</span>
        </div>
      </section>

      {/* =========================================================
          10. FOOTER
          ========================================================= */}
      <footer className="footer">
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', flexWrap: 'wrap', marginBottom: '1.2rem' }}>
            <span><strong style={{ color: 'var(--color-text)' }}>Cresoa</strong> · Built in Nigeria for Nigerian businesses</span>
          </div>
          <div className="links">
            <Link href="/login">Log in</Link>
            <Link href="/signup">Sign up</Link>
            <a href="#why" onClick={(e) => scrollToSection(e, 'why')}>Why Cresoa</a>
            <a href="#features" onClick={(e) => scrollToSection(e, 'features')}>Features</a>
            <Link href="/pricing">Pricing</Link>
            <a href="#faq" onClick={(e) => scrollToSection(e, 'faq')}>FAQ</a>
          </div>
          <p style={{ opacity: 0.6, fontSize: '0.7rem', marginTop: '0.5rem' }}>
            © {new Date().getFullYear()} Cresoa · All rights reserved.
          </p>
        </div>
      </footer>
    </main>
  )
}
