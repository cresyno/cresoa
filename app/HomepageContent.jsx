'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Script from 'next/script'
import Logo from '../components/Logo'
import ThemeToggle from '../components/ThemeToggle'

// ─── Icons ────────────────────────────────────────
const ICONS = {
  menu: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>,
  x: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  check: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  arrowRight: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>,
  arrowDown: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>,
  users: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  layers: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>,
  clock: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  mapPin: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>,
}

// ─── Waitlist Form ────────────────────────────────
function WaitlistForm({ theme = 'dark' }) {
  const [status, setStatus] = useState('idle') // idle | sending | success | error

  const handleSubmit = useCallback((e) => {
    e.preventDefault()
    const form = e.target
    const data = new FormData(form)

    setStatus('sending')

    fetch('https://app.kit.com/forms/9928723/subscriptions', {
      method: 'POST',
      body: data,
      mode: 'no-cors',
    })
      .then(() => {
        setStatus('success')
        form.reset()
      })
      .catch(() => {
        setStatus('error')
      })
  }, [])

  if (status === 'success') {
    return (
      <div className={`wl-form wl-form--${theme}`}>
        <div className="wl-success">
          <div className="wl-success-icon">{ICONS.check}</div>
          <p className="wl-success-title">You're on the list.</p>
          <p className="wl-success-sub">Check your inbox to confirm your spot.</p>
        </div>
      </div>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={`wl-form wl-form--${theme}`}
      noValidate
    >
      <div className="wl-fields">
        <input
          type="email"
          name="email_address"
          placeholder="Email address"
          aria-label="Email address"
          required
          autoComplete="email"
          className="wl-input"
        />
        <input
          type="text"
          name="fields[first_name]"
          placeholder="First name"
          aria-label="First name"
          required
          autoComplete="given-name"
          className="wl-input"
        />
        <div className="wl-select-wrap">
          <select
            name="tags[]"
            required
            aria-label="Business type"
            className="wl-select"
            defaultValue=""
          >
            <option value="" disabled>What do you do?</option>
            <option value="23510464">Fashion & Tailoring</option>
            <option value="23510466">Repairs & Technical</option>
            <option value="23510467">Printing & Signage</option>
          </select>
        </div>
        <button
          type="submit"
          className="wl-submit"
          disabled={status === 'sending'}
        >
          {status === 'sending' ? 'Joining…' : <>Join the Waitlist {ICONS.arrowRight}</>}
        </button>
      </div>
      <p className="wl-note">
        Founding Members get 30 days of Pro features free at launch. No spam — only real updates.
      </p>
      {status === 'error' && (
        <p className="wl-error">Something went wrong. Try again in a moment.</p>
      )}
    </form>
  )
}

// ─── Main Homepage ────────────────────────────────
export default function HomepageContent() {
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [counts, setCounts] = useState({ members: 0, industries: 0, months: 0 })
  const [activeTab, setActiveTab] = useState('fashion')
  const [openFaqIndex, setOpenFaqIndex] = useState(null)
  const statsRef = useRef(null)

  const closeMobileMenu = () => setMobileMenuOpen(false)
  const navigateTo = (path) => { router.push(path); closeMobileMenu() }

  const scrollToSection = (e, id) => {
    e.preventDefault()
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    closeMobileMenu()
  }

  const scrollToForm = (e) => {
    if (e) e.preventDefault()
    const el = document.getElementById('waitlist-form')
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY - 80
      window.scrollTo({ top, behavior: 'smooth' })
    }
    closeMobileMenu()
  }

  // Count-up
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting) return
        const targets = { members: 47, industries: 3, months: 6 }
        const duration = 1400
        const steps = Math.round(duration / 16)
        let step = 0
        const interval = setInterval(() => {
          step++
          const p = step / steps
          setCounts({
            members: Math.floor(p * targets.members),
            industries: Math.floor(p * targets.industries),
            months: Math.floor(p * targets.months),
          })
          if (step >= steps) {
            setCounts(targets)
            clearInterval(interval)
          }
        }, 16)
      },
      { threshold: 0.4 }
    )
    if (statsRef.current) observer.observe(statsRef.current)
    return () => observer.disconnect()
  }, [])

  // Fade-in on scroll
  useEffect(() => {
    const els = document.querySelectorAll('[data-animate]')
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate-in')
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    )
    els.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  const toggleFaq = (i) => setOpenFaqIndex(openFaqIndex === i ? null : i)

  const faqs = [
    { q: 'What is Cresoa?', a: 'Cresoa is a business management platform built for Nigerian SMEs. It brings customers, orders, payments, and production into one workspace.' },
    { q: 'When is Cresoa launching?', a: 'In 6 months. Waitlist members hear first and get 30 days of Pro features completely free at launch.' },
    { q: 'What happens when I join the waitlist?', a: 'You become a Founding Member. You get early access at launch, 30 days of Pro features free, and email updates only when there is something worth sharing. No spam, no weekly fluff.' },
    { q: 'How much does it cost?', a: 'Free plan forever. Starter at ₦3,500/month. Pro at ₦9,500/month. Founding Members do not pay for the first 30 days.' },
    { q: 'What industries does Cresoa support?', a: 'Fashion & Custom Wear, Repairs & Technical Services, and Printing & Signage are ready. More industries follow after launch.' },
    { q: 'Can I use Cresoa on my phone?', a: 'Yes. Cresoa is designed mobile-first — because that is where Nigerian businesses actually work.' },
  ]

  const industryData = {
    fashion: {
      label: 'Fashion & Tailoring',
      title: 'For tailors and fashion designers.',
      desc: 'Manage measurements, fabric choices, Aso-Ebi group orders, and production deadlines — all in one workspace.',
      image: '/mockups/fashion.webp',
      alt: 'Cresoa fashion workspace',
    },
    repairs: {
      label: 'Repairs & Technical',
      title: 'For phone, laptop, and electronics repair.',
      desc: 'Track devices, parts inventory, pickup dates, and payment balances without losing a single job.',
      image: '/mockups/repairs.webp',
      alt: 'Cresoa repairs workspace',
    },
    printing: {
      label: 'Printing & Signage',
      title: 'For print shops and signage businesses.',
      desc: 'Queue print jobs, track paper stock, and notify customers the moment their order is ready.',
      image: '/mockups/printing.webp',
      alt: 'Cresoa printing workspace',
    },
  }

  const activeIndustry = industryData[activeTab]

  return (
    <main className="page">
      {/* Kit's legacy form handler — loaded once, page-wide */}
      <Script
        id="kit-ckjs"
        src="https://f.convertkit.com/ckjs/ck.5.js"
        strategy="afterInteractive"
      />

      <style jsx global>{`
        :root {
          --color-bg: #F8F6F2;
          --color-card: #FFFFFF;
          --color-text: #1A1A1A;
          --color-text-muted: #6B6B6B;
          --color-border: #E5E0D8;
          --color-primary: #0F2B4A;
          --color-primary-deep: #061A2E;
          --color-accent: #D4A52A;
          --color-accent-hover: #C79A2B;
          --shadow-sm: 0 2px 8px rgba(15,43,74,0.04);
          --shadow-md: 0 6px 20px rgba(15,43,74,0.06);
          --shadow-lg: 0 12px 36px rgba(15,43,74,0.08);
          --shadow-xl: 0 28px 60px rgba(15,43,74,0.14);
        }
        [data-theme="dark"] {
          --color-bg: #12121A;
          --color-card: #1E1E2A;
          --color-text: #E8E8E8;
          --color-text-muted: #A0A0B0;
          --color-border: #2A2A3A;
        }

        .page {
          min-height: 100vh;
          background: var(--color-bg);
          color: var(--color-text);
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
          -webkit-font-smoothing: antialiased;
          overflow-x: hidden;
        }

        .page h1, .page h2, .page h3, .page h4 {
          font-family: 'Fraunces', 'Georgia', serif;
          font-weight: 700;
          letter-spacing: -0.02em;
        }

        .container { max-width: 1120px; margin: 0 auto; padding: 0 1.5rem; }

        /* ── Motion ── */
        [data-animate] {
          opacity: 0;
          transform: translateY(22px);
          transition: opacity 0.9s cubic-bezier(0.16, 1, 0.3, 1),
                      transform 0.9s cubic-bezier(0.16, 1, 0.3, 1);
          will-change: opacity, transform;
        }
        [data-animate].animate-in { opacity: 1; transform: translateY(0); }

        @keyframes floatY {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes drawLine {
          from { transform: scaleX(0); }
          to { transform: scaleX(1); }
        }

        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
          [data-animate] { opacity: 1 !important; transform: none !important; }
        }

        /* ── Navbar ── */
        .navbar {
          background: rgba(255, 255, 255, 0.85);
          border-bottom: 1px solid var(--color-border);
          padding: 0.85rem 1.5rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          position: sticky;
          top: 0;
          z-index: 1000;
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
        }
        [data-theme="dark"] .navbar { background: rgba(30, 30, 42, 0.85); }

        .navbar .logo-container { display: flex; align-items: center; }
        .navbar .nav-links { display: flex; gap: 0.15rem; align-items: center; }
        .navbar .nav-actions { display: flex; align-items: center; gap: 0.7rem; }
        .hamburger {
          display: none;
          background: none;
          border: none;
          color: var(--color-text);
          cursor: pointer;
          padding: 0.4rem;
        }
        .login-link {
          color: var(--color-text-muted);
          background: none;
          border: none;
          font-size: 0.88rem;
          font-weight: 500;
          cursor: pointer;
          font-family: inherit;
          text-decoration: none;
          transition: color 0.2s;
        }
        .login-link:hover { color: var(--color-accent); }

        .nav-link {
          padding: 0.55rem 0.95rem;
          border-radius: 8px;
          font-size: 0.9rem;
          font-weight: 500;
          color: var(--color-text);
          text-decoration: none;
          transition: background 0.2s, color 0.2s;
          font-family: inherit;
          background: none;
          border: none;
          cursor: pointer;
        }
        .nav-link:hover { background: rgba(212, 165, 42, 0.09); color: var(--color-accent); }

        .nav-cta {
          background: var(--color-accent);
          color: var(--color-primary);
          padding: 0.62rem 1.3rem;
          border-radius: 10px;
          font-size: 0.88rem;
          font-weight: 600;
          border: none;
          cursor: pointer;
          font-family: inherit;
          box-shadow: 0 4px 14px rgba(212, 165, 42, 0.28);
          transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1),
                      box-shadow 0.25s,
                      background 0.2s;
        }
        .nav-cta:hover {
          background: var(--color-accent-hover);
          transform: translateY(-2px);
          box-shadow: 0 10px 24px rgba(212, 165, 42, 0.38);
        }

        /* ── Mobile drawer ── */
        .mobile-overlay {
          display: none;
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          z-index: 998;
          backdrop-filter: blur(4px);
          opacity: 0;
          transition: opacity 0.3s ease;
        }
        .mobile-overlay.open { display: block; opacity: 1; }
        .mobile-drawer {
          position: fixed;
          top: 0;
          right: 0;
          bottom: 0;
          width: 290px;
          background: var(--color-card);
          padding: 1.5rem 1.5rem 2rem;
          transform: translateX(100%);
          transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
          z-index: 999;
          display: flex;
          flex-direction: column;
          gap: 0.3rem;
          border-left: 1px solid var(--color-border);
          overflow-y: auto;
        }
        .mobile-drawer.open { transform: translateX(0); }
        .mobile-drawer .close-btn {
          align-self: flex-end;
          background: none;
          border: none;
          color: var(--color-text);
          cursor: pointer;
          padding: 0.5rem;
          margin-bottom: 0.5rem;
        }
        .mobile-drawer .nav-link {
          padding: 0.9rem 1rem;
          font-size: 1rem;
          border-radius: 10px;
          width: 100%;
          text-align: left;
        }

        /* ── Hero ── */
        .hero {
          background: linear-gradient(155deg, #0F2B4A 0%, #061A2E 100%);
          padding: 4.5rem 1.5rem 5rem;
          position: relative;
          overflow: hidden;
        }
        .hero::before {
          content: '';
          position: absolute;
          top: -25%;
          right: -15%;
          width: 700px;
          height: 700px;
          background: radial-gradient(circle, rgba(212, 165, 42, 0.12) 0%, transparent 65%);
          border-radius: 50%;
          pointer-events: none;
        }
        .hero::after {
          content: '';
          position: absolute;
          bottom: -40%;
          left: -10%;
          width: 500px;
          height: 500px;
          background: radial-gradient(circle, rgba(212, 165, 42, 0.06) 0%, transparent 70%);
          border-radius: 50%;
          pointer-events: none;
        }
        .hero-inner {
          position: relative;
          z-index: 1;
          max-width: 1120px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 1.05fr 0.95fr;
          gap: 3.5rem;
          align-items: center;
        }
        .hero-left { max-width: 560px; }

        .founder-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.55rem;
          padding: 0.4rem 0.95rem;
          border-radius: 100px;
          background: rgba(212, 165, 42, 0.10);
          border: 1px solid rgba(212, 165, 42, 0.22);
          color: #E5C368;
          font-size: 0.76rem;
          font-weight: 500;
          letter-spacing: 0.01em;
          margin-bottom: 1.6rem;
        }
        .founder-badge .dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #D4A52A;
          box-shadow: 0 0 0 3px rgba(212, 165, 42, 0.22);
          animation: pulse 2s ease-in-out infinite;
        }
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 0 3px rgba(212, 165, 42, 0.22); }
          50% { box-shadow: 0 0 0 5px rgba(212, 165, 42, 0.10); }
        }

        .hero h1 {
          color: #fff;
          font-size: 3.4rem;
          line-height: 1.02;
          margin: 0 0 1.2rem;
          letter-spacing: -0.03em;
        }
        .hero h1 span {
          color: #D4A52A;
          position: relative;
          display: inline-block;
        }
        .hero .subhead {
          color: #C8D4E3;
          font-size: 1.08rem;
          line-height: 1.7;
          margin: 0 0 2.2rem;
          max-width: 520px;
        }

        .hero-right {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .hero-mockup {
          width: 100%;
          max-width: 380px;
          border-radius: 22px;
          box-shadow: 0 30px 80px rgba(0, 0, 0, 0.45),
                      0 0 0 1px rgba(255, 255, 255, 0.06);
          animation: floatY 7s ease-in-out infinite;
          display: block;
        }

        /* ── Trust bar ── */
        .trust-bar {
          background: #061A2E;
          padding: 1.8rem 1.5rem;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
        }
        .trust-bar-inner {
          max-width: 1120px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1rem;
          text-align: center;
        }
              .trust-item .num {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          color: #fff;
          font-size: 1.55rem;
          font-weight: 700;
          font-family: 'Fraunces', serif;
          letter-spacing: -0.02em;
        }
        .trust-item .num svg { color: #D4A52A; }
        .trust-item .lbl {
          color: #93A8C0;
          font-size: 0.72rem;
          margin-top: 0.3rem;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          font-weight: 500;
        }

        /* ── Section title ── */
        .section-title {
          text-align: center;
          margin-bottom: 3.5rem;
          max-width: 640px;
          margin-left: auto;
          margin-right: auto;
        }
        .section-title h2 {
          font-size: 2.3rem;
          color: var(--color-text);
          margin: 0 0 0.75rem;
          line-height: 1.14;
        }
        .section-title h2::after {
          content: '';
          display: block;
          width: 44px;
          height: 3px;
          background: var(--color-accent);
          margin: 1rem auto 0;
          border-radius: 2px;
          transform-origin: left;
          animation: drawLine 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .section-title p {
          color: var(--color-text-muted);
          font-size: 1.03rem;
          margin: 0;
          line-height: 1.65;
        }

        /* ── Bento grid ── */
        .bento {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          grid-auto-rows: minmax(160px, auto);
          gap: 1rem;
        }
        .bento-card {
          background: var(--color-card);
          border-radius: 18px;
          overflow: hidden;
          border: 1px solid var(--color-border);
          display: flex;
          flex-direction: column;
          transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1),
                      box-shadow 0.4s ease,
                      border-color 0.3s ease;
          box-shadow: var(--shadow-sm);
        }
        .bento-card:hover {
          transform: translateY(-6px);
          box-shadow: var(--shadow-xl);
          border-color: var(--color-accent);
        }
        .bento-large { grid-column: span 2; grid-row: span 2; }
        .bento-medium { grid-column: span 2; }
        .bento-small { grid-column: span 1; }
        .bento-img-wrap {
          flex: 1;
          min-height: 150px;
          overflow: hidden;
          background: #F0EBE1;
          position: relative;
        }
        .bento-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: top center;
          display: block;
          transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .bento-card:hover .bento-img { transform: scale(1.03); }
        .bento-body { padding: 1.15rem 1.25rem 1.35rem; }
        .bento-tag {
          display: inline-block;
          font-size: 0.63rem;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--color-accent);
          margin-bottom: 0.4rem;
        }
        .bento-body h3 {
          color: var(--color-text);
          font-size: 1.02rem;
          margin: 0 0 0.3rem;
          line-height: 1.28;
        }
        .bento-body p {
          color: var(--color-text-muted);
          font-size: 0.85rem;
          margin: 0;
          line-height: 1.55;
        }

        /* ── Toggle ── */
        .toggle-wrap {
          background: var(--color-card);
          border-radius: 22px;
          border: 1px solid var(--color-border);
          overflow: hidden;
          box-shadow: var(--shadow-md);
        }
        .toggle-tabs {
          display: flex;
          border-bottom: 1px solid var(--color-border);
          overflow-x: auto;
          scrollbar-width: none;
        }
        .toggle-tabs::-webkit-scrollbar { display: none; }
        .toggle-tab {
          flex: 1;
          min-width: 150px;
          padding: 1.1rem 1.2rem;
          background: transparent;
          border: none;
          cursor: pointer;
          font-family: inherit;
          font-size: 0.9rem;
          font-weight: 600;
          color: var(--color-text-muted);
          border-bottom: 2px solid transparent;
          transition: color 0.25s, border-color 0.25s, background 0.25s;
          white-space: nowrap;
        }
        .toggle-tab:hover { color: var(--color-text); }
        .toggle-tab.active {
          color: var(--color-accent);
          border-bottom-color: var(--color-accent);
          background: rgba(212, 165, 42, 0.04);
        }
        .toggle-content {
          display: grid;
          grid-template-columns: 1fr 1fr;
          align-items: center;
        }
        .toggle-text {
          padding: 2.6rem 2rem 2.6rem 2.6rem;
          animation: fadeIn 0.5s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .toggle-text h3 {
          color: var(--color-text);
          font-size: 1.45rem;
          margin: 0 0 0.7rem;
          line-height: 1.24;
        }
        .toggle-text p {
          color: var(--color-text-muted);
          font-size: 0.95rem;
          line-height: 1.7;
          margin: 0 0 1.6rem;
        }
        .toggle-image-wrap {
          background: #F0EBE1;
          padding: 1.8rem;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 360px;
        }
        [data-theme="dark"] .toggle-image-wrap { background: #16161E; }
        .toggle-image {
          width: 100%;
          max-width: 320px;
          border-radius: 14px;
          box-shadow: 0 20px 50px rgba(15, 43, 74, 0.16);
          animation: fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1);
          display: block;
        }

        /* ── Founder ── */
        .founder {
          display: grid;
          grid-template-columns: 0.85fr 1.15fr;
          gap: 3rem;
          align-items: center;
          background: var(--color-card);
          border-radius: 22px;
          border: 1px solid var(--color-border);
          padding: 2.5rem;
          box-shadow: var(--shadow-md);
        }
        .founder-photo {
          width: 100%;
          border-radius: 16px;
          aspect-ratio: 4 / 5;
          object-fit: cover;
          box-shadow: 0 20px 50px rgba(15, 43, 74, 0.14);
        }
        .founder-copy h2 {
          color: var(--color-text);
          font-size: 1.85rem;
          margin: 0 0 1.1rem;
          line-height: 1.2;
        }
        .founder-copy p {
          color: var(--color-text-muted);
          font-size: 1rem;
          line-height: 1.75;
          margin: 0 0 1rem;
        }
        .founder-sign {
          color: var(--color-text);
          font-weight: 700;
          font-size: 1rem;
          margin-top: 1.2rem;
          font-family: 'Fraunces', serif;
        }
        .founder-title {
          color: var(--color-text-muted);
          font-size: 0.85rem;
          margin-top: 0.2rem;
        }

        /* ── Pricing ── */
        .pricing-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 1.25rem;
          max-width: 980px;
          margin: 0 auto;
        }
        .pricing-card {
          background: var(--color-card);
          border-radius: 18px;
          padding: 2rem 1.6rem;
          border: 2px solid var(--color-border);
          text-align: center;
          transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1),
                      box-shadow 0.35s ease,
                      border-color 0.3s ease;
          box-shadow: var(--shadow-sm);
        }
        .pricing-card:hover {
          border-color: var(--color-accent);
          box-shadow: var(--shadow-lg);
          transform: translateY(-4px);
        }
        .pricing-card.popular { border-color: var(--color-accent); position: relative; }
        .popular-badge {
          background: var(--color-accent);
          color: #0F2B4A;
          font-size: 0.62rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.09em;
          padding: 0.22rem 0.9rem;
          border-radius: 20px;
          display: inline-block;
          margin-bottom: 0.9rem;
        }
        .plan-name {
          font-size: 1.05rem;
          font-weight: 600;
          color: var(--color-text);
          margin: 0;
        }
        .price {
          font-size: 2.6rem;
          font-weight: 700;
          color: var(--color-text);
          margin: 0.4rem 0;
          font-family: 'Fraunces', serif;
          letter-spacing: -0.03em;
        }
        .price span {
          font-size: 0.95rem;
          font-weight: 400;
          color: var(--color-text-muted);
          font-family: 'Inter', sans-serif;
        }
        .description {
          color: var(--color-text-muted);
          font-size: 0.85rem;
          margin: 0 0 1.3rem;
        }
        .pricing-card ul {
          list-style: none;
          padding: 0;
          margin: 1.5rem 0;
          text-align: left;
        }
        .pricing-card ul li {
          padding: 0.55rem 0;
          border-bottom: 1px solid var(--color-border);
          font-size: 0.86rem;
          color: var(--color-text);
          display: flex;
          align-items: center;
          gap: 0.6rem;
        }
        .pricing-card ul li:last-child { border-bottom: none; }
        .pricing-card ul li svg { flex-shrink: 0; color: var(--color-accent); }
        .pricing-card ul li.muted { color: var(--color-text-muted); opacity: 0.55; }
        .pricing-card ul li.muted svg { color: var(--color-text-muted); }

        .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.85rem 1.7rem;
          border-radius: 10px;
          font-weight: 600;
          font-size: 0.92rem;
          text-decoration: none;
          border: none;
          cursor: pointer;
          font-family: inherit;
          transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1),
                      box-shadow 0.25s, background 0.2s;
          background: var(--color-accent);
          color: #0F2B4A;
          box-shadow: 0 6px 20px rgba(212, 165, 42, 0.3);
        }
        .btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 28px rgba(212, 165, 42, 0.4);
          background: var(--color-accent-hover);
        }
        .btn-ghost {
          background: transparent;
          color: var(--color-text);
          border: 1px solid var(--color-border);
          box-shadow: none;
        }
        .btn-ghost:hover {
          background: rgba(212, 165, 42, 0.06);
          border-color: var(--color-accent);
          color: var(--color-text);
          box-shadow: none;
        }
        .btn-navy {
          background: var(--color-primary);
          color: #fff;
          box-shadow: 0 6px 20px rgba(15, 43, 74, 0.3);
        }
        .btn-navy:hover {
          background: #1A3F66;
          box-shadow: 0 12px 28px rgba(15, 43, 74, 0.4);
        }

        /* ── FAQ ── */
        .faq-item {
          background: var(--color-card);
          border-radius: 14px;
          border: 1px solid var(--color-border);
          margin-bottom: 0.7rem;
          overflow: hidden;
          transition: border-color 0.25s;
        }
        .faq-item:hover { border-color: var(--color-accent); }
        .faq-header {
          padding: 1.15rem 1.3rem;
          font-weight: 600;
          color: var(--color-text);
          cursor: pointer;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.96rem;
          user-select: none;
        }
        .faq-header .arrow {
          color: var(--color-accent);
          transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1);
          font-size: 1.4rem;
          font-weight: 300;
          line-height: 1;
        }
        .faq-header .arrow.open { transform: rotate(45deg); }
        .faq-answer {
          max-height: 0;
          overflow: hidden;
          transition: max-height 0.4s cubic-bezier(0.16, 1, 0.3, 1),
                      opacity 0.3s ease,
                      padding 0.3s ease;
          opacity: 0;
          padding: 0 1.3rem;
          color: var(--color-text-muted);
          font-size: 0.92rem;
          line-height: 1.75;
        }
        .faq-answer.open {
          max-height: 400px;
          opacity: 1;
          padding: 0 1.3rem 1.3rem;
        }

        /* ── Final CTA ── */
        .final-cta {
          background: linear-gradient(135deg, #0F2B4A 0%, #1A3F66 100%);
          border-radius: 26px;
          max-width: 800px;
          margin: 0 auto;
          padding: 3.2rem 2rem;
          text-align: center;
          box-shadow: 0 28px 70px rgba(15, 43, 74, 0.28);
          position: relative;
          overflow: hidden;
        }
        .final-cta::before {
          content: '';
          position: absolute;
          top: -50%;
          right: -20%;
          width: 500px;
          height: 500px;
          background: radial-gradient(circle, rgba(212, 165, 42, 0.10), transparent 70%);
          border-radius: 50%;
          pointer-events: none;
        }
        .final-cta h2 {
          color: #fff;
          font-size: 2.05rem;
          margin: 0 0 0.9rem;
          line-height: 1.18;
          position: relative;
        }
        .final-cta > p {
          color: #C8D4E3;
          font-size: 1rem;
          margin: 0 0 2rem;
          max-width: 500px;
          margin-left: auto;
          margin-right: auto;
          line-height: 1.65;
          position: relative;
        }

        /* ── Waitlist form ── */
        .wl-form { width: 100%; max-width: 460px; margin: 0 auto; position: relative; }
        .wl-form--dark .wl-input,
        .wl-form--dark .wl-select {
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.16);
          color: #fff;
        }
        .wl-form--dark .wl-input::placeholder { color: rgba(200, 212, 227, 0.55); }
        .wl-form--dark .wl-input:focus,
        .wl-form--dark .wl-select:focus {
          border-color: #D4A52A;
          background: rgba(255, 255, 255, 0.09);
          box-shadow: 0 0 0 3px rgba(212, 165, 42, 0.18);
        }

        .wl-fields { display: grid; gap: 0.6rem; }
        .wl-input,
        .wl-select {
          width: 100%;
          padding: 0.9rem 1rem;
          border-radius: 10px;
          font-family: inherit;
          font-size: 0.95rem;
          color: var(--color-text);
          background: var(--color-card);
          border: 1px solid var(--color-border);
          transition: border-color 0.2s, background 0.2s, box-shadow 0.2s;
          -webkit-appearance: none;
          appearance: none;
        }
        .wl-input:focus,
        .wl-select:focus {
          outline: none;
          border-color: var(--color-accent);
          box-shadow: 0 0 0 3px rgba(212, 165, 42, 0.15);
        }
        .wl-select-wrap { position: relative; }
        .wl-select-wrap::after {
          content: '';
          position: absolute;
          top: 50%;
          right: 1rem;
          width: 8px;
          height: 8px;
          border-right: 2px solid currentColor;
          border-bottom: 2px solid currentColor;
          transform: translateY(-70%) rotate(45deg);
          pointer-events: none;
          opacity: 0.5;
        }
        .wl-select { padding-right: 2.4rem; cursor: pointer; }
        .wl-select option { color: #1A1A1A; background: #fff; }

        .wl-submit {
          width: 100%;
          padding: 0.95rem 1.5rem;
          border-radius: 10px;
          background: #D4A52A;
          color: #0F2B4A;
          font-weight: 700;
          font-size: 0.95rem;
          font-family: inherit;
          border: none;
          cursor: pointer;
          transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1),
                      box-shadow 0.25s, background 0.2s;
          box-shadow: 0 8px 24px rgba(212, 165, 42, 0.32);
          margin-top: 0.2rem;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
        }
        .wl-submit:hover:not(:disabled) {
          background: #C79A2B;
          transform: translateY(-2px);
          box-shadow: 0 14px 32px rgba(212, 165, 42, 0.42);
        }
        .wl-submit:disabled { opacity: 0.7; cursor: wait; }

        .wl-note {
          color: rgba(200, 212, 227, 0.62);
          font-size: 0.78rem;
          line-height: 1.5;
          margin-top: 0.9rem;
          text-align: left;
        }
        .wl-error {
          color: #FF8B6F;
          font-size: 0.82rem;
          margin-top: 0.6rem;
        }

        .wl-success {
          background: rgba(212, 165, 42, 0.08);
          border: 1px solid rgba(212, 165, 42, 0.28);
          border-radius: 14px;
          padding: 1.6rem 1.3rem;
          text-align: center;
          animation: fadeIn 0.5s ease;
        }
        .wl-success-icon {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: #D4A52A;
          color: #0F2B4A;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 0.7rem;
        }
        .wl-success-title {
          color: #fff;
          font-size: 1.05rem;
          font-weight: 700;
          margin: 0 0 0.2rem;
          font-family: 'Fraunces', serif;
        }
        .wl-success-sub {
          color: rgba(200, 212, 227, 0.75);
          font-size: 0.87rem;
          margin: 0;
        }

        /* ── Footer ── */
        .footer {
          border-top: 1px solid var(--color-border);
          padding: 2.5rem 1.5rem;
          margin-top: 5rem;
          text-align: center;
          color: var(--color-text-muted);
          font-size: 0.82rem;
        }
        .footer-links {
          display: flex;
          justify-content: center;
          gap: 0.4rem 1.1rem;
          flex-wrap: wrap;
          margin: 1.2rem 0;
        }
        .footer-links a, .footer-links button {
          color: var(--color-text);
          text-decoration: none;
          transition: color 0.2s;
          background: none;
          border: none;
          cursor: pointer;
          font-size: 0.84rem;
          padding: 0.2rem 0.3rem;
          font-family: inherit;
        }
        .footer-links a:hover, .footer-links button:hover { color: var(--color-accent); }

        /* ── Responsive ── */
        @media (max-width: 960px) {
          .hero-inner { grid-template-columns: 1fr; gap: 2.8rem; text-align: left; }
          .hero-left { max-width: 100%; }
          .hero-mockup { margin: 0 auto; max-width: 320px; }
          .hero h1 { font-size: 2.6rem; }
          .hero-right { order: 2; }
          .hero-left { order: 1; }
          .bento { grid-template-columns: repeat(2, 1fr); }
          .bento-large { grid-column: span 2; grid-row: auto; }
          .bento-medium { grid-column: span 1; }
          .bento-small { grid-column: span 1; }
          .toggle-content { grid-template-columns: 1fr; }
          .toggle-text { padding: 1.8rem 1.4rem 0.6rem; }
          .toggle-image-wrap { padding: 1.4rem; min-height: auto; }
          .founder { grid-template-columns: 1fr; padding: 1.8rem; gap: 1.8rem; }
          .founder-photo { max-width: 280px; margin: 0 auto; aspect-ratio: 1 / 1; }
        }
        @media (max-width: 720px) {
          .navbar .nav-links { display: none; }
          .navbar .nav-actions .login-link { display: none; }
          .navbar .nav-actions .nav-cta { display: inline-flex; }
          .hamburger { display: inline-flex; align-items: center; }
          .hero { padding: 3rem 1.2rem 3.5rem; }
          .hero h1 { font-size: 2.15rem; }
          .hero .subhead { font-size: 1rem; }
          .section-title h2 { font-size: 1.7rem; }
          .trust-bar-inner { grid-template-columns: repeat(2, 1fr); gap: 1.2rem; }
          .trust-item .num { font-size: 1.3rem; }
          .bento { grid-template-columns: 1fr; }
          .bento-large, .bento-medium, .bento-small { grid-column: span 1; }
          .pricing-grid { grid-template-columns: 1fr; }
          .final-cta { padding: 2.4rem 1.4rem; border-radius: 20px; }
          .final-cta h2 { font-size: 1.6rem; }
          .founder-copy h2 { font-size: 1.5rem; }
        }
        @media (max-width: 420px) {
          .hero h1 { font-size: 1.95rem; }
          .trust-bar-inner { grid-template-columns: 1fr 1fr; }
        }
      `}</style>

      {/* ─── NAVBAR ─── */}
      <nav className="navbar">
        <div className="logo-container">
          <button
            onClick={() => navigateTo('/')}
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            aria-label="Cresoa home"
          >
            <Logo variant="primary" size="large" />
          </button>
        </div>

        <div className="nav-links">
          <Link href="/fashion" className="nav-link">Fashion</Link>
          <Link href="/repairs" className="nav-link">Repairs</Link>
          <Link href="/printing" className="nav-link">Printing</Link>
          <Link href="/blog" className="nav-link">Blog</Link>
          <Link href="/support" className="nav-link">Support</Link>
          <button onClick={(e) => scrollToSection(e, 'faq')} className="nav-link">FAQ</button>
        </div>

        <div className="nav-actions">
          <ThemeToggle />
          <Link href="/login" className="login-link">Log in</Link>
          <button onClick={scrollToForm} className="nav-cta">Join Waitlist</button>
          <button className="hamburger" onClick={() => setMobileMenuOpen(true)} aria-label="Open menu">
            {ICONS.menu}
          </button>
        </div>
      </nav>

      {/* ─── MOBILE DRAWER ─── */}
      <div
        className={`mobile-overlay ${mobileMenuOpen ? 'open' : ''}`}
        onClick={closeMobileMenu}
      />
      <div className={`mobile-drawer ${mobileMenuOpen ? 'open' : ''}`}>
        <button className="close-btn" onClick={closeMobileMenu} aria-label="Close menu">
          {ICONS.x}
        </button>
        <Link href="/fashion" className="nav-link" onClick={closeMobileMenu}>Fashion</Link>
        <Link href="/repairs" className="nav-link" onClick={closeMobileMenu}>Repairs</Link>
        <Link href="/printing" className="nav-link" onClick={closeMobileMenu}>Printing</Link>
        <Link href="/blog" className="nav-link" onClick={closeMobileMenu}>Blog</Link>
        <Link href="/support" className="nav-link" onClick={closeMobileMenu}>Support</Link>
        <button onClick={(e) => scrollToSection(e, 'faq')} className="nav-link">FAQ</button>
        <Link href="/login" className="nav-link" onClick={closeMobileMenu}>Log in</Link>
        <button
          onClick={scrollToForm}
          className="nav-cta"
          style={{ marginTop: '0.8rem', padding: '0.85rem 1rem', width: '100%' }}
        >
          Join Waitlist
        </button>
      </div>

      {/* ─── HERO ─── */}
      <section className="hero">
        <div className="hero-inner">
          <div className="hero-left" data-animate>
            <div className="founder-badge">
              <span className="dot" />
              Taiwo A. Feranmi — Building in Public
            </div>
            <h1>
              Run your Nigerian business <span>from one place.</span>
            </h1>
            <p className="subhead">
              Track orders, collect payments, update customers on WhatsApp — without spreadsheets, notebooks, or lost DMs. Launching for Fashion, Repairs, and Printing businesses across Nigeria.
            </p>

            <div id="waitlist-form">
              <WaitlistForm theme="dark" />
            </div>
          </div>

          <div className="hero-right" data-animate>
            <img
              src="/mockups/dashboard.webp"
              alt="Cresoa dashboard — revenue, orders, and production pipeline"
              className="hero-mockup"
              loading="eager"
            />
          </div>
        </div>
      </section>

      {/* ─── TRUST BAR ─── */}
      <section className="trust-bar">
        <div className="trust-bar-inner" ref={statsRef}>
          <div className="trust-item">
            <div className="num">{ICONS.users} {counts.members}</div>
            <div className="lbl">Founding Members</div>
          </div>
          <div className="trust-item">
            <div className="num">{ICONS.layers} {counts.industries}</div>
            <div className="lbl">Industries Ready</div>
          </div>
          <div className="trust-item">
            <div className="num">{ICONS.clock} {counts.months}</div>
            <div className="lbl">Months to Launch</div>
          </div>
          <div className="trust-item">
            <div className="num">{ICONS.mapPin} 100%</div>
            <div className="lbl">Built in Nigeria</div>
          </div>
        </div>
      </section>

      {/* ─── BENTO GRID ─── */}
      <section className="container" style={{ padding: '5rem 1.5rem 3.5rem' }}>
        <div className="section-title" data-animate>
          <h2>Everything you need to run smoothly</h2>
          <p>One workspace for customers, orders, payments, and production.</p>
        </div>

        <div className="bento">
          <div className="bento-card bento-large" data-animate>
            <div className="bento-img-wrap">
              <img src="/mockups/order-detail.webp" alt="Order detail with production stages" className="bento-img" loading="lazy" />
            </div>
            <div className="bento-body">
              <span className="bento-tag">Order Tracking</span>
              <h3>Every order, every stage.</h3>
              <p>Placed → Cutting → Sewing → Ready → Delivered. One glance tells you where every job stands.</p>
            </div>
          </div>

          <div className="bento-card bento-medium" data-animate>
            <div className="bento-img-wrap">
              <img src="/mockups/invoice.webp" alt="Branded invoice with bank details" className="bento-img" loading="lazy" />
            </div>
            <div className="bento-body">
              <span className="bento-tag">Payments</span>
              <h3>Invoices that get paid.</h3>
              <p>Send branded invoices via WhatsApp with bank details, CAC number, and a live balance.</p>
            </div>
          </div>

          <div className="bento-card bento-medium" data-animate>
            <div className="bento-img-wrap">
              <img src="/mockups/production.webp" alt="Production pipeline" className="bento-img" loading="lazy" />
            </div>
            <div className="bento-body">
              <span className="bento-tag">Production</span>
              <h3>See your workshop moving.</h3>
              <p>Know how many orders are cutting, sewing, and ready — in real time.</p>
            </div>
          </div>

          <div className="bento-card bento-small" data-animate>
            <div className="bento-img-wrap">
              <img src="/mockups/whatsapp.webp" alt="One-tap WhatsApp update" className="bento-img" loading="lazy" />
            </div>
            <div className="bento-body">
              <span className="bento-tag">Customer Comms</span>
              <h3>One-tap WhatsApp.</h3>
            </div>
          </div>

          <div className="bento-card bento-small" data-animate>
            <div className="bento-img-wrap">
              <img src="/mockups/support.webp" alt="Tessa AI + human support" className="bento-img" loading="lazy" />
            </div>
            <div className="bento-body">
              <span className="bento-tag">Support</span>
              <h3>Tessa AI + humans.</h3>
            </div>
          </div>
        </div>
      </section>

      {/* ─── INTERACTIVE TOGGLE ─── */}
      <section className="container" style={{ padding: '0 1.5rem 5rem' }}>
        <div className="section-title" data-animate>
          <h2>Built for the way you work</h2>
          <p>Cresoa adapts to your industry — not the other way around.</p>
        </div>

        <div className="toggle-wrap" data-animate>
          <div className="toggle-tabs" role="tablist">
            {Object.keys(industryData).map((key) => (
              <button
                key={key}
                role="tab"
                aria-selected={activeTab === key}
                onClick={() => setActiveTab(key)}
                className={`toggle-tab ${activeTab === key ? 'active' : ''}`}
              >
                {industryData[key].label}
              </button>
            ))}
          </div>

          <div className="toggle-content" key={activeTab}>
            <div className="toggle-text">
              <h3>{activeIndustry.title}</h3>
              <p>{activeIndustry.desc}</p>
              <button onClick={scrollToForm} className="btn" style={{ padding: '0.75rem 1.6rem', fontSize: '0.9rem' }}>
                Join the Waitlist {ICONS.arrowRight}
              </button>
            </div>
            <div className="toggle-image-wrap">
              <img src={activeIndustry.image} alt={activeIndustry.alt} className="toggle-image" loading="lazy" />
            </div>
          </div>
        </div>
      </section>

      {/* ─── FOUNDER'S NOTE ─── */}
      <section className="container" style={{ padding: '0 1.5rem 5rem' }}>
        <div className="founder" data-animate>
          <img
            src="/mockups/founder.webp"
            alt="Taiwo A. Feranmi, founder of Cresoa"
            className="founder-photo"
            loading="lazy"
          />
          <div className="founder-copy">
            <h2>A note from the founder.</h2>
            <p>
              Hi, I'm Taiwo. I'm building Cresoa solo — because I watched too many great Nigerian businesses run on WhatsApp screenshots and paper notebooks, and I know we deserve better software.
            </p>
            <p>
              I've been building in the open for 3 months. Fashion, Repairs, and Printing modules are live. More industries follow. But I'm not launching until the product is right.
            </p>
            <p>
              Join the waitlist. Follow the journey. Get 30 days of Pro features free when we launch.
            </p>
            <div className="founder-sign">— Taiwo A. Feranmi</div>
            <div className="founder-title">Founder, Cresoa</div>
          </div>
        </div>
      </section>

      {/* ─── PRICING ─── */}
      <section id="pricing" className="container" style={{ padding: '0 1.5rem 5rem' }}>
        <div className="section-title" data-animate>
          <h2>Simple, transparent pricing</h2>
          <p>Coming at launch. Reserved for waitlist members first.</p>
        </div>

        <div className="pricing-grid">
          <div className="pricing-card" data-animate>
            <p className="plan-name">Free</p>
            <div className="price">₦0</div>
            <p className="description">Perfect for getting started</p>
            <ul>
              <li>{ICONS.check} 20 customers</li>
              <li>{ICONS.check} 50 orders</li>
              <li>{ICONS.check} Basic order tracking</li>
              <li className="muted">{ICONS.x} Staff accounts</li>
              <li className="muted">{ICONS.x} WhatsApp integration</li>
            </ul>
            <button onClick={scrollToForm} className="btn btn-ghost" style={{ width: '100%' }}>
              Join Waitlist
            </button>
          </div>

          <div className="pricing-card popular" data-animate>
            <div className="popular-badge">Most Popular</div>
            <p className="plan-name">Starter</p>
            <div className="price">₦3,500 <span>/month</span></div>
            <p className="description">For growing businesses</p>
            <ul>
              <li>{ICONS.check} Unlimited customers</li>
              <li>{ICONS.check} Unlimited orders</li>
              <li>{ICONS.check} 2 staff accounts</li>
              <li>{ICONS.check} WhatsApp integration</li>
              <li>{ICONS.check} Customer tracking links</li>
            </ul>
            <button onClick={scrollToForm} className="btn" style={{ width: '100%' }}>
              Reserve Starter Access
            </button>
          </div>

          <div className="pricing-card" data-animate>
            <p className="plan-name">Pro</p>
            <div className="price">₦9,500 <span>/month</span></div>
            <p className="description">For established businesses</p>
            <ul>
              <li>{ICONS.check} Everything in Starter</li>
              <li>{ICONS.check} 10 staff accounts</li>
              <li>{ICONS.check} Advanced analytics</li>
              <li>{ICONS.check} Data export (Excel/PDF)</li>
              <li>{ICONS.check} Priority support</li>
            </ul>
            <button onClick={scrollToForm} className="btn btn-navy" style={{ width: '100%' }}>
              Reserve Pro Access
            </button>
          </div>
        </div>

        <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.85rem', marginTop: '1.8rem' }}>
          Founding Members get 30 days of Pro features completely free at launch. No credit card needed.
        </p>
      </section>

      {/* ─── FAQ ─── */}
      <section id="faq" className="container" style={{ padding: '0 1.5rem 5rem', maxWidth: '760px' }}>
        <div className="section-title" data-animate>
          <h2>Frequently asked questions</h2>
          <p>Everything you need to know about Cresoa.</p>
        </div>
        <div data-animate>
          {faqs.map((item, i) => (
            <div key={i} className="faq-item">
              <div
                className="faq-header"
                onClick={() => toggleFaq(i)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') toggleFaq(i) }}
                aria-expanded={openFaqIndex === i}
              >
                {item.q}
                <span className={`arrow ${openFaqIndex === i ? 'open' : ''}`}>+</span>
              </div>
              <div className={`faq-answer ${openFaqIndex === i ? 'open' : ''}`}>{item.a}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── FINAL CTA ─── */}
      <section className="container" style={{ padding: '0 1.5rem' }}>
        <div className="final-cta" data-animate>
          <h2>Ready to bring order to your business?</h2>
          <p>Join 47 Nigerian founders already on the waitlist.</p>
          <WaitlistForm theme="dark" />
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="footer">
        <div className="container">
          <div>
            <strong style={{ color: 'var(--color-text)' }}>Cresoa</strong>
            <span style={{ marginLeft: '0.5rem' }}>· Built in Nigeria for Nigerian businesses</span>
          </div>
          <div className="footer-links">
            <Link href="/login">Log in</Link>
            <Link href="/fashion">Fashion</Link>
            <Link href="/repairs">Repairs</Link>
            <Link href="/printing">Printing</Link>
            <Link href="/blog">Blog</Link>
            <Link href="/pricing">Pricing</Link>
            <Link href="/support">Support</Link>
            <button onClick={(e) => scrollToSection(e, 'faq')}>FAQ</button>
            <button onClick={scrollToForm}>Join Waitlist</button>
          </div>
          <p style={{ opacity: 0.6, fontSize: '0.7rem', marginTop: '0.5rem' }}>
            © {new Date().getFullYear()} Cresoa · All rights reserved.
          </p>
        </div>
      </footer>
    </main>
  )
                }
