'use client';
import { useState, useEffect } from 'react'
import Link from 'next/link'
import Logo from '../../components/Logo'
import ThemeToggle from '../../components/ThemeToggle'
import { supabase } from '../../lib/supabaseClient'

const ICONS = {
  menu: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>,
  x: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  arrowRight: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>,
  check: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  alert: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
  book: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>,
  clock: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
}

export default function PublicSupportPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    subject: '',
    category: '',
    description: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  const closeMobileMenu = () => setMobileMenuOpen(false)

  // Pre-fill email if user is already logged in
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.email) {
        setFormData(prev => ({ ...prev, email: user.email }))
      }
    }
    getUser()
  }, [])

  useEffect(() => { document.documentElement.classList.add('js-ready') }, [])

  useEffect(() => {
    const els = document.querySelectorAll('[data-reveal]')
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) entry.target.classList.add('reveal-in')
        else entry.target.classList.remove('reveal-in')
      })
    }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' })
    els.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.email || !formData.subject || !formData.category || !formData.description) return

    setIsSubmitting(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const res = await fetch('/api/support/ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (res.ok) {
        setSuccessMessage('Ticket submitted. We\u2019ll get back to you via email within 24 hours.')
        setFormData({ email: formData.email, subject: '', category: '', description: '' })
      } else {
        const err = await res.json()
        setErrorMessage(err.error || 'Something went wrong. Please try again.')
      }
    } catch (error) {
      setErrorMessage('Network error. Please check your connection.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="page">
      <style jsx global>{`
        :root {
          --bg: #F8F6F2;
          --bg-alt: #FFFFFF;
          --bg-dark: #0F2B4A;
          --bg-darkest: #061A2E;
          --card: #FFFFFF;
          --text: #0E1116;
          --text-muted: #6B6F76;
          --border: #E7E2D9;
          --border-strong: #D6CFC1;
          --gold: #C99B2B;
          --gold-bright: #E5B84B;
        }
        [data-theme="dark"] {
          --bg: #0A0A0F;
          --bg-alt: #0F0F16;
          --card: #16161E;
          --text: #ECECEC;
          --text-muted: #9A9AA8;
          --border: #26262F;
          --border-strong: #34343F;
        }
        html { scroll-behavior: smooth; }
        html.js-ready [data-reveal] {
          opacity: 0;
          transform: translateY(22px);
          transition: opacity 0.75s cubic-bezier(0.16, 1, 0.3, 1), transform 0.75s cubic-bezier(0.16, 1, 0.3, 1);
        }
        html.js-ready [data-reveal].reveal-in { opacity: 1; transform: translateY(0); }
        html.js-ready [data-reveal][data-delay="1"] { transition-delay: 0.09s; }
        html.js-ready [data-reveal][data-delay="2"] { transition-delay: 0.18s; }
        html.js-ready [data-reveal][data-delay="3"] { transition-delay: 0.27s; }
        @media (prefers-reduced-motion: reduce) {
          html.js-ready [data-reveal], html.js-ready [data-reveal].reveal-in { opacity: 1 !important; transform: none !important; transition: none !important; }
        }

        .page { min-height: 100vh; background: var(--bg); color: var(--text); font-family: 'Inter', system-ui, -apple-system, sans-serif; -webkit-font-smoothing: antialiased; overflow-x: hidden; }
        .page h1, .page h2, .page h3, .page h4 { font-family: 'Fraunces', 'Georgia', serif; font-weight: 700; letter-spacing: -0.025em; color: inherit; }
        .shell { max-width: 1180px; margin: 0 auto; padding: 0 1.5rem; }

        /* Navbar */
        .navbar { background: rgba(255,255,255,0.9); border-bottom: 1px solid var(--border); padding: 0.85rem 1.5rem; display: flex; justify-content: space-between; align-items: center; position: sticky; top: 0; z-index: 1000; backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); }
        [data-theme="dark"] .navbar { background: rgba(15,15,22,0.9); }
        .navbar .nav-links { display: flex; gap: 0.1rem; align-items: center; }
        .navbar .nav-actions { display: flex; align-items: center; gap: 0.7rem; }
        .hamburger { display: none; background: none; border: none; color: var(--text); cursor: pointer; padding: 0.4rem; }
        .login-link { color: var(--text-muted); background: none; border: none; font-size: 0.88rem; font-weight: 500; cursor: pointer; font-family: inherit; text-decoration: none; transition: color 0.2s; }
        .login-link:hover { color: var(--gold); }
        .nav-link { padding: 0.55rem 0.95rem; border-radius: 8px; font-size: 0.9rem; font-weight: 500; color: var(--text); text-decoration: none; transition: color 0.2s; background: none; border: none; cursor: pointer; font-family: inherit; }
        .nav-link:hover { color: var(--gold); }
        .nav-link.active { color: var(--gold); }
        .nav-cta { background: var(--bg-dark); color: #fff; padding: 0.6rem 1.25rem; border-radius: 9px; font-size: 0.87rem; font-weight: 600; border: none; cursor: pointer; font-family: inherit; transition: transform 0.2s, background 0.2s; }
        .nav-cta:hover { background: #1A3F66; transform: translateY(-1px); }

        /* Mobile drawer */
        .mobile-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 998; opacity: 0; transition: opacity 0.3s; }
        .mobile-overlay.open { display: block; opacity: 1; }
        .mobile-drawer { position: fixed; top: 0; right: 0; bottom: 0; width: 290px; background: var(--card); padding: 1.5rem; transform: translateX(100%); transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1); z-index: 999; display: flex; flex-direction: column; gap: 0.2rem; border-left: 1px solid var(--border); overflow-y: auto; }
        .mobile-drawer.open { transform: translateX(0); }
        .mobile-drawer .close-btn { align-self: flex-end; background: none; border: none; color: var(--text); cursor: pointer; padding: 0.5rem; margin-bottom: 0.5rem; }
        .mobile-drawer .nav-link { padding: 0.9rem 1rem; font-size: 1rem; width: 100%; text-align: left; }

        /* Breadcrumb */
        .breadcrumb { background: var(--bg); padding: 1rem 1.5rem 0; }
        .breadcrumb-inner { max-width: 1180px; margin: 0 auto; display: flex; align-items: center; gap: 0.5rem; font-size: 0.82rem; color: var(--text-muted); }
        .breadcrumb-inner a { color: var(--text-muted); text-decoration: none; transition: color 0.2s; }
        .breadcrumb-inner a:hover { color: var(--gold); }
        .breadcrumb-inner .sep { opacity: 0.5; }
        .breadcrumb-inner .current { color: var(--text); font-weight: 500; }

        /* Hero */
        .hero { background: linear-gradient(170deg, #0F2B4A 0%, #061A2E 100%); padding: 5rem 1.5rem; position: relative; overflow: hidden; }
        .hero::before { content: ''; position: absolute; top: -35%; right: -15%; width: 900px; height: 900px; background: radial-gradient(circle, rgba(201,155,43,0.14) 0%, transparent 55%); border-radius: 50%; pointer-events: none; }
        .hero-inner { position: relative; z-index: 1; max-width: 720px; margin: 0 auto; text-align: center; }
        .hero-eyebrow { display: inline-block; font-size: 0.72rem; font-weight: 600; letter-spacing: 0.18em; text-transform: uppercase; color: var(--gold-bright); margin-bottom: 1.6rem; }
        .hero h1 { color: #fff; font-size: 3rem; line-height: 1.08; margin: 0 0 1.2rem; letter-spacing: -0.035em; }
        .hero h1 em { color: var(--gold-bright); font-style: normal; }
        .hero p { color: #A8B8CE; font-size: 1.08rem; line-height: 1.7; margin: 0 auto; max-width: 560px; }
        .hero a { color: var(--gold-bright); font-weight: 600; text-decoration: underline; text-decoration-thickness: 1px; text-underline-offset: 2px; }

        /* Main split */
        .main-section { background: var(--bg); padding: 5rem 1.5rem; }
        .main-grid { max-width: 1080px; margin: 0 auto; display: grid; grid-template-columns: 1.5fr 1fr; gap: 3rem; align-items: start; }

        /* Form card */
        .form-card { background: var(--card); border: 1px solid var(--border); border-radius: 20px; padding: 2.5rem 2.2rem; box-shadow: 0 20px 50px rgba(15,43,74,0.06); }
        .form-card h2 { font-size: 1.5rem; margin: 0 0 0.5rem; line-height: 1.2; }
        .form-card > p { color: var(--text-muted); font-size: 0.95rem; margin: 0 0 2rem; line-height: 1.6; }

        .support-form { display: flex; flex-direction: column; gap: 1.25rem; }
        .field { display: flex; flex-direction: column; gap: 0.4rem; }
        .field label { font-size: 0.85rem; font-weight: 600; color: var(--text); letter-spacing: 0.01em; }

        .field input,
        .field select,
        .field textarea {
          width: 100%;
          padding: 0.85rem 1rem;
          border-radius: 10px;
          font-family: inherit;
          font-size: 0.95rem;
          color: var(--text);
          background: var(--bg);
          border: 1px solid var(--border);
          transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
          -webkit-appearance: none;
          appearance: none;
        }
        .field input::placeholder,
        .field textarea::placeholder { color: var(--text-muted); opacity: 0.7; }
        .field input:focus,
        .field select:focus,
        .field textarea:focus {
          outline: none;
          border-color: var(--gold);
          background: var(--card);
          box-shadow: 0 0 0 3px rgba(201,155,43,0.15);
        }
        .field textarea { resize: vertical; min-height: 120px; line-height: 1.6; }

        .select-wrap { position: relative; }
        .select-wrap::after {
          content: '';
          position: absolute; top: 50%; right: 1rem;
          width: 8px; height: 8px;
          border-right: 2px solid var(--text-muted);
          border-bottom: 2px solid var(--text-muted);
          transform: translateY(-70%) rotate(45deg);
          pointer-events: none; opacity: 0.6;
        }
        .field select { padding-right: 2.4rem; cursor: pointer; }
        .field select option { color: #1A1A1A; background: #fff; }

        .submit-btn {
          width: 100%;
          padding: 1rem 1.5rem;
          border-radius: 10px;
          background: var(--gold);
          color: var(--bg-dark);
          font-weight: 700;
          font-size: 0.95rem;
          font-family: inherit;
          border: none;
          cursor: pointer;
          margin-top: 0.5rem;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          transition: background 0.2s, transform 0.25s, box-shadow 0.25s;
        }
        .submit-btn:hover:not(:disabled) {
          background: var(--gold-bright);
          transform: translateY(-1px);
          box-shadow: 0 14px 30px rgba(201,155,43,0.35);
        }
        .submit-btn:disabled { opacity: 0.7; cursor: wait; }

        /* Alerts */
        .alert { display: flex; align-items: flex-start; gap: 0.7rem; padding: 0.9rem 1rem; border-radius: 10px; font-size: 0.9rem; line-height: 1.5; margin-bottom: 1.5rem; }
        .alert svg { flex-shrink: 0; margin-top: 0.1rem; }
        .alert--success { background: rgba(46,125,94,0.10); color: #2E7D5E; border: 1px solid rgba(46,125,94,0.25); }
        [data-theme="dark"] .alert--success { color: #5FD1A0; }
        .alert--error { background: rgba(217,83,79,0.08); color: #C0392B; border: 1px solid rgba(217,83,79,0.25); }
        [data-theme="dark"] .alert--error { color: #FF8B6F; }

        /* Sidebar */
        .sidebar { display: flex; flex-direction: column; gap: 1.25rem; position: sticky; top: 100px; }
        .sidebar-card { background: var(--card); border: 1px solid var(--border); border-radius: 18px; padding: 1.8rem 1.7rem; transition: border-color 0.3s, transform 0.3s; }
        .sidebar-card:hover { border-color: var(--border-strong); }
        .sidebar-icon { width: 44px; height: 44px; border-radius: 12px; background: rgba(201,155,43,0.10); color: var(--gold); display: flex; align-items: center; justify-content: center; margin-bottom: 1.1rem; }
        .sidebar-card h3 { font-size: 1.05rem; margin: 0 0 0.5rem; line-height: 1.3; letter-spacing: -0.015em; }
        .sidebar-card p { color: var(--text-muted); font-size: 0.9rem; line-height: 1.6; margin: 0 0 1.1rem; }
        .sidebar-link { display: inline-flex; align-items: center; gap: 0.5rem; color: var(--gold); font-weight: 600; font-size: 0.9rem; text-decoration: none; transition: gap 0.2s; }
        .sidebar-link:hover { gap: 0.75rem; }

        /* FAQ CTA under form */
        .faq-cta { margin-top: 2.5rem; padding: 1.6rem 1.8rem; border-radius: 14px; background: var(--bg-alt); border: 1px solid var(--border); }
        [data-theme="dark"] .faq-cta { background: var(--bg-alt); }
        .faq-cta p { color: var(--text-muted); font-size: 0.94rem; line-height: 1.6; margin: 0 0 1rem; }
        .faq-cta p strong { color: var(--text); font-weight: 600; }
        .faq-cta a { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.75rem 1.5rem; border-radius: 10px; background: transparent; color: var(--gold); border: 1px solid var(--border-strong); font-weight: 600; font-size: 0.88rem; text-decoration: none; transition: border-color 0.25s, background 0.2s, transform 0.25s; font-family: inherit; }
        .faq-cta a:hover { border-color: var(--gold); background: rgba(201,155,43,0.05); transform: translateY(-1px); }

        /* Footer */
        .footer { background: var(--bg); border-top: 1px solid var(--border); padding: 3.5rem 1.5rem 2rem; text-align: center; color: var(--text-muted); font-size: 0.82rem; }
        .footer-links { display: flex; justify-content: center; gap: 0.4rem 1.2rem; flex-wrap: wrap; margin: 1.4rem 0; }
        .footer-links a, .footer-links button { color: var(--text); text-decoration: none; transition: color 0.2s; background: none; border: none; cursor: pointer; font-size: 0.85rem; padding: 0.2rem 0.3rem; font-family: inherit; }
        .footer-links a:hover, .footer-links button:hover { color: var(--gold); }

        /* Responsive */
        @media (max-width: 960px) {
          .hero { padding: 4rem 1.25rem; }
          .hero h1 { font-size: 2.4rem; }
          .main-section { padding: 4rem 1.25rem; }
          .main-grid { grid-template-columns: 1fr; gap: 2.5rem; }
          .sidebar { position: static; }
          .form-card { padding: 2rem 1.6rem; }
        }
        @media (max-width: 720px) {
          .navbar .nav-links { display: none; }
          .navbar .nav-actions .login-link { display: none; }
          .hamburger { display: inline-flex; align-items: center; }
          .hero { padding: 3rem 1.25rem; }
          .hero h1 { font-size: 2rem; }
          .hero p { font-size: 1rem; }
          .main-section { padding: 3rem 1.25rem; }
          .form-card { padding: 1.75rem 1.4rem; border-radius: 16px; }
          .form-card h2 { font-size: 1.3rem; }
          .sidebar-card { padding: 1.5rem 1.4rem; }
        }
      `}</style>

      {/* HEADER */}
      <header className="navbar">
        <Link href="/" style={{ display: 'flex', alignItems: 'center' }} aria-label="Cresoa home">
          <Logo variant="primary" size="large" />
        </Link>
        <nav className="nav-links" aria-label="Primary">
          <Link href="/" className="nav-link">Home</Link>
          <Link href="/fashion" className="nav-link">Fashion</Link>
          <Link href="/repairs" className="nav-link">Repairs</Link>
          <Link href="/printing" className="nav-link">Printing</Link>
          <Link href="/pricing" className="nav-link">Pricing</Link>
          <Link href="/blog" className="nav-link">Blog</Link>
          <Link href="/support" className="nav-link active">Support</Link>
          <Link href="/faq" className="nav-link">FAQ</Link>
        </nav>
        <div className="nav-actions">
          <ThemeToggle />
          <Link href="/login" className="login-link">Log in</Link>
          <Link href="/#waitlist-form" className="nav-cta">Join Waitlist</Link>
          <button className="hamburger" onClick={() => setMobileMenuOpen(true)} aria-label="Open menu">{ICONS.menu}</button>
        </div>
      </header>

      {/* MOBILE DRAWER */}
      <div className={`mobile-overlay ${mobileMenuOpen ? 'open' : ''}`} onClick={closeMobileMenu} />
      <div className={`mobile-drawer ${mobileMenuOpen ? 'open' : ''}`}>
        <button className="close-btn" onClick={closeMobileMenu} aria-label="Close menu">{ICONS.x}</button>
        <Link href="/" className="nav-link" onClick={closeMobileMenu}>Home</Link>
        <Link href="/fashion" className="nav-link" onClick={closeMobileMenu}>Fashion</Link>
        <Link href="/repairs" className="nav-link" onClick={closeMobileMenu}>Repairs</Link>
        <Link href="/printing" className="nav-link" onClick={closeMobileMenu}>Printing</Link>
        <Link href="/pricing" className="nav-link" onClick={closeMobileMenu}>Pricing</Link>
        <Link href="/blog" className="nav-link" onClick={closeMobileMenu}>Blog</Link>
        <Link href="/support" className="nav-link" onClick={closeMobileMenu}>Support</Link>
        <Link href="/faq" className="nav-link" onClick={closeMobileMenu}>FAQ</Link>
        <Link href="/login" className="nav-link" onClick={closeMobileMenu}>Log in</Link>
        <Link href="/#waitlist-form" className="nav-cta" onClick={closeMobileMenu} style={{ marginTop: '0.8rem', padding: '0.85rem 1rem', width: '100%', textAlign: 'center' }}>Join Waitlist</Link>
      </div>

      {/* BREADCRUMB */}
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <div className="breadcrumb-inner">
          <Link href="/">Home</Link>
          <span className="sep">/</span>
          <span className="current">Support</span>
        </div>
      </nav>

      {/* HERO */}
      <section className="hero">
        <div className="hero-inner">
          <span className="hero-eyebrow" data-reveal>Cresoa Support</span>
          <h1 data-reveal data-delay="1">We&apos;re here to help.</h1>
          <p data-reveal data-delay="2">
            Submit a ticket and we&apos;ll reply within 24 hours. Or check the <Link href="/faq">FAQ</Link> for instant answers to the most common questions.
          </p>
        </div>
      </section>

      {/* MAIN */}
      <section className="main-section">
        <div className="main-grid">
          {/* FORM */}
          <div className="form-card" data-reveal>
            <h2>Send us a ticket</h2>
            <p>Describe what you need and we&apos;ll get back to you via email.</p>

            {successMessage && (
              <div className="alert alert--success" role="status">
                {ICONS.check}
                <span>{successMessage}</span>
              </div>
            )}
            {errorMessage && (
              <div className="alert alert--error" role="alert">
                {ICONS.alert}
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="support-form" noValidate>
              <div className="field">
                <label htmlFor="support-email">Email address</label>
                <input
                  id="support-email"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              </div>

              <div className="field">
                <label htmlFor="support-subject">Subject</label>
                <input
                  id="support-subject"
                  type="text"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  required
                  placeholder="Briefly describe the issue"
                />
              </div>

              <div className="field">
                <label htmlFor="support-category">Category</label>
                <div className="select-wrap">
                  <select
                    id="support-category"
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Select a category</option>
                    <option value="billing">Billing / Subscription</option>
                    <option value="staff">Staff / Team</option>
                    <option value="orders">Orders / Production</option>
                    <option value="technical">Technical Issue (Bug)</option>
                    <option value="account">Account / Login</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div className="field">
                <label htmlFor="support-description">Description</label>
                <textarea
                  id="support-description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  required
                  rows="5"
                  placeholder="Provide detailed information so we can help you faster..."
                />
              </div>

              <button type="submit" className="submit-btn" disabled={isSubmitting}>
                {isSubmitting ? 'Submitting…' : <>Send Message {ICONS.arrowRight}</>}
              </button>
            </form>

            <div className="faq-cta">
              <p><strong>Looking for an instant answer?</strong> The FAQ covers waitlist, pricing, industries, features, and product questions.</p>
              <Link href="/faq">
                Browse the full FAQ {ICONS.arrowRight}
              </Link>
            </div>
          </div>

          {/* SIDEBAR */}
          <aside className="sidebar" data-reveal data-delay="1">
            <div className="sidebar-card">
              <div className="sidebar-icon">{ICONS.book}</div>
              <h3>Check the FAQ first</h3>
              <p>Most questions about the waitlist, pricing, and product features are already answered there.</p>
              <Link href="/faq" className="sidebar-link">
                Browse the FAQ {ICONS.arrowRight}
              </Link>
            </div>

            <div className="sidebar-card">
              <div className="sidebar-icon">{ICONS.clock}</div>
              <h3>Response time</h3>
              <p>We reply to tickets within 24 hours, Monday to Saturday. Every message is read by a real person — usually Taiwo himself.</p>
            </div>
          </aside>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="footer">
        <div className="shell">
          <div>
            <strong style={{ color: 'var(--text)' }}>Cresoa</strong>
            <span style={{ marginLeft: '0.5rem' }}>· Built in Nigeria for Nigerian businesses</span>
          </div>
          <nav className="footer-links" aria-label="Footer">
            <Link href="/login">Log in</Link>
            <Link href="/fashion">Fashion</Link>
            <Link href="/repairs">Repairs</Link>
            <Link href="/printing">Printing</Link>
            <Link href="/blog">Blog</Link>
            <Link href="/pricing">Pricing</Link>
            <Link href="/support">Support</Link>
            <Link href="/faq">FAQ</Link>
            <Link href="/#waitlist-form">Join Waitlist</Link>
          </nav>
          <p style={{ opacity: 0.6, fontSize: '0.72rem', marginTop: '0.8rem' }}>© {new Date().getFullYear()} Cresoa · All rights reserved.</p>
        </div>
      </footer>
    </main>
  )
        }
