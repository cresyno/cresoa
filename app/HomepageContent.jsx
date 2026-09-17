'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Logo from '../components/Logo'
import ThemeToggle from '../components/ThemeToggle'

// ─── Icons ────────────────────────────────────────
const ICONS = {
  menu: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>,
  x: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  check: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  dash: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  arrowRight: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>,
  users: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  layers: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>,
  clock: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  mapPin: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>,
}

// ─── Waitlist Form ────────────────────────────────
function WaitlistForm({ theme = 'dark' }) {
  const [status, setStatus] = useState('idle')

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault()
    const form = e.target
    const data = new FormData(form)
    setStatus('sending')

    try {
      const res = await fetch('/api/waitlist', { method: 'POST', body: data })
      const json = await res.json()
      if (json.ok) {
        setStatus('success')
        form.reset()
      } else {
        setStatus('error')
      }
    } catch {
      setStatus('error')
    }
  }, [])

  if (status === 'success') {
    return (
      <div className={`wl-form wl-form--${theme}`}>
        <div className="wl-success">
          <div className="wl-success-icon">{ICONS.check}</div>
          <p className="wl-success-title">You're on the list.</p>
          <p className="wl-success-sub">
            Check your inbox to confirm. If it's not in Primary, check Promotions and drag it there.
          </p>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className={`wl-form wl-form--${theme}`} noValidate>
      <div className="wl-fields">
        <input type="email" name="email_address" placeholder="Email address" aria-label="Email address" required autoComplete="email" className="wl-input" />
        <input type="text" name="fields[first_name]" placeholder="First name" aria-label="First name" required autoComplete="given-name" className="wl-input" />
        <div className="wl-select-wrap">
          <select name="tags[]" required aria-label="Business type" className="wl-select" defaultValue="">
            <option value="" disabled>What do you do?</option>
            <option value="23510464">Fashion & Tailoring</option>
            <option value="23510466">Repairs & Technical</option>
            <option value="23510467">Printing & Signage</option>
          </select>
        </div>
        <button type="submit" className="wl-submit" disabled={status === 'sending'}>
          {status === 'sending' ? 'Joining…' : <>Join the Waitlist {ICONS.arrowRight}</>}
        </button>
      </div>
      <p className="wl-note">
        Founding Members get 30 days of Pro features free at launch.
      </p>
      {status === 'error' && (
        <p className="wl-error">Something went wrong. Please try again.</p>
      )}
    </form>
  )
}

// ─── Homepage ─────────────────────────────────────
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

  // Add JS-ready class so animations only hide content when JS is running (SEO-safe)
  useEffect(() => {
    document.documentElement.classList.add('js-ready')
  }, [])

  // Count-up
  useEffect(() => {
    if (!statsRef.current) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting) return
        const targets = { members: 47, industries: 3, months: 6 }
        const steps = 90
        let step = 0
        const interval = setInterval(() => {
          step++
          const p = step / steps
          setCounts({
            members: Math.floor(p * targets.members),
            industries: Math.floor(p * targets.industries),
            months: Math.floor(p * targets.months),
          })
          if (step >= steps) { setCounts(targets); clearInterval(interval) }
        }, 16)
      },
      { threshold: 0.4 }
    )
    observer.observe(statsRef.current)
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
      { threshold: 0.08, rootMargin: '0px 0px -40px 0px' }
    )
    els.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  const toggleFaq = (i) => setOpenFaqIndex(openFaqIndex === i ? null : i)

  const faqs = [
    { q: 'What is Cresoa?', a: 'Cresoa is a business management platform built for Nigerian SMEs. It brings customers, orders, payments, and production into one workspace.' },
    { q: 'When is Cresoa launching?', a: 'In 6 months. Waitlist members hear first and get 30 days of Pro features completely free at launch.' },
    { q: 'What happens when I join the waitlist?', a: 'You become a Founding Member. You get early access at launch, 30 days of Pro features free, and email updates only when there is something worth sharing.' },
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
      <style jsx global>{`
        :root {
          --bg: #F8F6F2;
          --card: #FFFFFF;
          --text: #0E1116;
          --text-muted: #6B6F76;
          --border: #E7E2D9;
          --border-strong: #D6CFC1;
          --navy: #0F2B4A;
          --navy-deep: #061A2E;
          --gold: #C99B2B;
          --gold-soft: #D4A52A;
          --shadow-sm: 0 1px 2px rgba(15,43,74,0.04);
          --shadow-md: 0 4px 16px rgba(15,43,74,0.05);
          --shadow-lg: 0 20px 48px rgba(15,43,74,0.10);
        }
        [data-theme="dark"] {
          --bg: #0E0E14;
          --card: #16161E;
          --text: #ECECEC;
          --text-muted: #9A9AA8;
          --border: #26262F;
          --border-strong: #34343F;
        }

        html.js-ready [data-animate] {
          opacity: 0;
          transform: translateY(20px);
          transition: opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1),
                      transform 0.7s cubic-bezier(0.16, 1, 0.3, 1);
        }
        html.js-ready [data-animate].animate-in {
          opacity: 1;
          transform: translateY(0);
        }
        @media (prefers-reduced-motion: reduce) {
          html.js-ready [data-animate],
          html.js-ready [data-animate].animate-in {
            opacity: 1 !important;
            transform: none !important;
            transition: none !important;
          }
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .page {
          min-height: 100vh;
          background: var(--bg);
          color: var(--text);
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
          -webkit-font-smoothing: antialiased;
          overflow-x: hidden;
        }

        .page h1, .page h2, .page h3, .page h4 {
          font-family: 'Fraunces', 'Georgia', serif;
          font-weight: 700;
          letter-spacing: -0.022em;
          color: var(--text);
        }

        .container { max-width: 1080px; margin: 0 auto; padding: 0 1.5rem; }

        /* ── Navbar ── */
        .navbar {
          background: rgba(255,255,255,0.85);
          border-bottom: 1px solid var(--border);
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
        [data-theme="dark"] .navbar { background: rgba(22,22,30,0.85); }
        .navbar .nav-links { display: flex; gap: 0.1rem; align-items: center; }
        .navbar .nav-actions { display: flex; align-items: center; gap: 0.7rem; }
        .hamburger { display: none; background: none; border: none; color: var(--text); cursor: pointer; padding: 0.4rem; }
        .login-link { color: var(--text-muted); background: none; border: none; font-size: 0.88rem; font-weight: 500; cursor: pointer; font-family: inherit; text-decoration: none; transition: color 0.2s; }
        .login-link:hover { color: var(--gold); }
        .nav-link {
          padding: 0.55rem 0.95rem; border-radius: 8px; font-size: 0.9rem; font-weight: 500;
          color: var(--text); text-decoration: none; transition: background 0.2s, color 0.2s;
          font-family: inherit; background: none; border: none; cursor: pointer;
        }
        .nav-link:hover { color: var(--gold); }
        .nav-cta {
          background: var(--navy); color: #fff; padding: 0.6rem 1.25rem; border-radius: 9px;
          font-size: 0.87rem; font-weight: 600; border: none; cursor: pointer; font-family: inherit;
          transition: transform 0.2s, background 0.2s, box-shadow 0.2s;
        }
        .nav-cta:hover { background: #1A3F66; transform: translateY(-1px); box-shadow: 0 8px 20px rgba(15,43,74,0.2); }

        /* ── Mobile drawer ── */
        .mobile-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 998; opacity: 0; transition: opacity 0.3s; }
        .mobile-overlay.open { display: block; opacity: 1; }
        .mobile-drawer {
          position: fixed; top: 0; right: 0; bottom: 0; width: 290px; background: var(--card);
          padding: 1.5rem 1.5rem 2rem; transform: translateX(100%);
          transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1);
          z-index: 999; display: flex; flex-direction: column; gap: 0.2rem;
          border-left: 1px solid var(--border); overflow-y: auto;
        }
        .mobile-drawer.open { transform: translateX(0); }
        .mobile-drawer .close-btn { align-self: flex-end; background: none; border: none; color: var(--text); cursor: pointer; padding: 0.5rem; margin-bottom: 0.5rem; }
        .mobile-drawer .nav-link { padding: 0.9rem 1rem; font-size: 1rem; width: 100%; text-align: left; }

        /* ── Hero ── */
        .hero { background: linear-gradient(160deg, #0F2B4A 0%, #061A2E 100%); padding: 5.5rem 1.5rem 5.5rem; position: relative; overflow: hidden; }
        .hero::before {
          content: ''; position: absolute; top: -30%; right: -15%;
          width: 750px; height: 750px;
          background: radial-gradient(circle, rgba(201,155,43,0.10) 0%, transparent 60%);
          border-radius: 50%; pointer-events: none;
        }
        .hero-inner {
          position: relative; z-index: 1; max-width: 1080px; margin: 0 auto;
          display: grid; grid-template-columns: 1.1fr 0.9fr; gap: 4rem; align-items: center;
        }
        .hero-left { max-width: 540px; }
        .hero h1 {
          color: #fff; font-size: 3.6rem; line-height: 1.02;
          margin: 0 0 1.4rem; letter-spacing: -0.035em;
        }
        .hero h1 span { color: var(--gold-soft); }
        .hero .subhead {
          color: #B8C4D4; font-size: 1.08rem; line-height: 1.7;
          margin: 0 0 2.4rem; max-width: 500px;
        }
        .hero-right { display: flex; align-items: center; justify-content: center; }
        .hero-mockup {
          width: 100%; max-width: 380px; border-radius: 20px;
          box-shadow: 0 40px 80px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.06);
          display: block;
        }

        /* ── Trust bar ── */
        .trust-bar { background: var(--navy-deep); padding: 2rem 1.5rem; border-top: 1px solid rgba(255,255,255,0.04); }
        .trust-bar-inner {
          max-width: 1080px; margin: 0 auto;
          display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; text-align: center;
        }
        .trust-item .num {
          display: flex; align-items: center; justify-content: center; gap: 0.5rem;
          color: #fff; font-size: 1.5rem; font-weight: 700;
          font-family: 'Fraunces', serif; letter-spacing: -0.02em;
        }
        .trust-item .num svg { color: var(--gold-soft); }
        .trust-item .lbl {
          color: #7C8CA5; font-size: 0.7rem; margin-top: 0.35rem;
          letter-spacing: 0.1em; text-transform: uppercase; font-weight: 500;
        }

        /* ── Section shell ── */
        .section { padding: 6rem 1.5rem; }
        .section-head { max-width: 640px; margin: 0 auto 3.5rem; text-align: center; }
        .section-head .eyebrow {
          display: inline-block; font-size: 0.7rem; font-weight: 700;
          letter-spacing: 0.15em; text-transform: uppercase;
          color: var(--gold); margin-bottom: 1rem;
        }
        .section-head h2 { font-size: 2.4rem; margin: 0 0 0.85rem; line-height: 1.12; }
        .section-head p { color: var(--text-muted); font-size: 1.03rem; margin: 0; line-height: 1.65; }

        /* ── Bento grid ── */
        .bento { display: grid; grid-template-columns: repeat(12, 1fr); gap: 1.25rem; }
        .bento-card {
          background: var(--card); border-radius: 16px; overflow: hidden;
          border: 1px solid var(--border);
          display: flex; flex-direction: column;
          transition: border-color 0.3s ease, transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .bento-card:hover { border-color: var(--border-strong); }
        .bento-feature { grid-column: span 7; }
        .bento-tall { grid-column: span 5; }
        .bento-third { grid-column: span 4; }
        .bento-img-wrap { overflow: hidden; background: #EFEAE1; }
        .bento-feature .bento-img-wrap,
        .bento-tall .bento-img-wrap { aspect-ratio: 16 / 10; }
        .bento-third .bento-img-wrap { aspect-ratio: 4 / 3; }
        [data-theme="dark"] .bento-img-wrap { background: #1B1B24; }
        .bento-img {
          width: 100%; height: 100%; object-fit: cover; object-position: top center;
          display: block; transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .bento-card:hover .bento-img { transform: scale(1.02); }
        .bento-body { padding: 1.5rem 1.6rem 1.7rem; }
        .bento-tag {
          display: inline-block; font-size: 0.66rem; font-weight: 700;
          letter-spacing: 0.14em; text-transform: uppercase;
          color: var(--gold); margin-bottom: 0.6rem;
        }
        .bento-body h3 { font-size: 1.15rem; margin: 0 0 0.5rem; line-height: 1.3; }
        .bento-body p { color: var(--text-muted); font-size: 0.92rem; margin: 0; line-height: 1.6; }

        /* ── Toggle ── */
        .toggle-wrap {
          background: var(--card); border-radius: 20px; border: 1px solid var(--border);
          overflow: hidden; box-shadow: var(--shadow-md);
        }
        .toggle-tabs { display: flex; border-bottom: 1px solid var(--border); overflow-x: auto; scrollbar-width: none; }
        .toggle-tabs::-webkit-scrollbar { display: none; }
        .toggle-tab {
          flex: 1; min-width: 160px; padding: 1.2rem 1.4rem;
          background: transparent; border: none; cursor: pointer;
          font-family: inherit; font-size: 0.9rem; font-weight: 600;
          color: var(--text-muted); border-bottom: 2px solid transparent;
          transition: color 0.2s, border-color 0.2s;
          white-space: nowrap; text-align: left;
        }
            .toggle-tab:hover { color: var(--text); }
        .toggle-tab.active { color: var(--text); border-bottom-color: var(--gold); }
        .toggle-content { display: grid; grid-template-columns: 1fr 1fr; align-items: center; }
        .toggle-text { padding: 3rem 2rem 3rem 3rem; animation: fadeIn 0.45s cubic-bezier(0.16, 1, 0.3, 1); }
        .toggle-text h3 { font-size: 1.5rem; margin: 0 0 0.7rem; line-height: 1.22; }
        .toggle-text p { color: var(--text-muted); font-size: 0.98rem; line-height: 1.7; margin: 0 0 1.8rem; max-width: 420px; }
        .toggle-image-wrap {
          background: #EFEAE1; padding: 2.2rem;
          display: flex; align-items: center; justify-content: center;
          min-height: 380px;
        }
        [data-theme="dark"] .toggle-image-wrap { background: #1B1B24; }
        .toggle-image {
          width: 100%; max-width: 320px; border-radius: 12px;
          box-shadow: 0 24px 60px rgba(15,43,74,0.14);
          animation: fadeIn 0.5s cubic-bezier(0.16, 1, 0.3, 1); display: block;
        }

        /* ── Founder ── */
        .founder {
          display: grid; grid-template-columns: 0.8fr 1.2fr; gap: 3.5rem;
          align-items: center; background: var(--card); border-radius: 20px;
          border: 1px solid var(--border); padding: 3rem;
        }
        .founder-photo {
          width: 100%; border-radius: 14px; aspect-ratio: 4 / 5;
          object-fit: cover; box-shadow: var(--shadow-lg);
        }
        .founder-copy h2 { font-size: 1.9rem; margin: 0 0 1.2rem; line-height: 1.2; }
        .founder-copy p { color: var(--text-muted); font-size: 1rem; line-height: 1.8; margin: 0 0 1rem; }
        .founder-sign { color: var(--text); font-weight: 700; font-size: 1rem; margin-top: 1.4rem; font-family: 'Fraunces', serif; }
        .founder-title { color: var(--text-muted); font-size: 0.85rem; margin-top: 0.2rem; }

        /* ── Pricing ── */
        .pricing-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1.25rem; max-width: 980px; margin: 0 auto; }
        .pricing-card {
          background: var(--card); border-radius: 16px; padding: 2.2rem 1.7rem;
          border: 1px solid var(--border); text-align: center;
          transition: border-color 0.3s, transform 0.35s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .pricing-card:hover { border-color: var(--border-strong); }
        .pricing-card.popular { border-color: var(--navy); position: relative; }
        [data-theme="dark"] .pricing-card.popular { border-color: var(--gold); }
        .popular-badge {
          background: var(--navy); color: #fff; font-size: 0.6rem; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.1em;
          padding: 0.25rem 0.85rem; border-radius: 20px;
          display: inline-block; margin-bottom: 1rem;
        }
        .plan-name { font-size: 1rem; font-weight: 600; color: var(--text); margin: 0; letter-spacing: -0.01em; }
        .price { font-size: 2.6rem; font-weight: 700; color: var(--text); margin: 0.5rem 0; font-family: 'Fraunces', serif; letter-spacing: -0.035em; }
        .price span { font-size: 0.9rem; font-weight: 400; color: var(--text-muted); font-family: 'Inter', sans-serif; letter-spacing: 0; }
        .description { color: var(--text-muted); font-size: 0.85rem; margin: 0 0 1.5rem; }
        .pricing-card ul { list-style: none; padding: 0; margin: 1.5rem 0; text-align: left; }
        .pricing-card ul li {
          padding: 0.6rem 0; border-bottom: 1px solid var(--border);
          font-size: 0.87rem; color: var(--text);
          display: flex; align-items: center; gap: 0.6rem;
        }
        .pricing-card ul li:last-child { border-bottom: none; }
        .pricing-card ul li svg { flex-shrink: 0; color: var(--text-muted); }
        .pricing-card ul li.muted { color: var(--text-muted); opacity: 0.55; }

        .btn {
          display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem;
          padding: 0.85rem 1.7rem; border-radius: 10px;
          font-weight: 600; font-size: 0.92rem; text-decoration: none;
          border: none; cursor: pointer; font-family: inherit;
          transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), background 0.2s, box-shadow 0.25s;
          background: var(--navy); color: #fff;
        }
        .btn:hover { background: #1A3F66; transform: translateY(-1px); box-shadow: 0 10px 24px rgba(15,43,74,0.2); }
        .btn-ghost { background: transparent; color: var(--text); border: 1px solid var(--border-strong); box-shadow: none; }
        .btn-ghost:hover { background: var(--card); border-color: var(--text); box-shadow: none; }
        .btn-gold { background: var(--gold-soft); color: var(--navy); }
        .btn-gold:hover { background: var(--gold); color: var(--navy); box-shadow: 0 10px 24px rgba(201,155,43,0.3); }

        /* ── FAQ ── */
        .faq-item {
          background: var(--card); border-radius: 12px; border: 1px solid var(--border);
          margin-bottom: 0.7rem; overflow: hidden; transition: border-color 0.25s;
        }
        .faq-item:hover { border-color: var(--border-strong); }
        .faq-header {
          padding: 1.2rem 1.4rem; font-weight: 600; color: var(--text);
          cursor: pointer; display: flex; justify-content: space-between;
          align-items: center; font-size: 0.98rem; user-select: none;
        }
        .faq-header .arrow {
          color: var(--text-muted); transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1);
          font-size: 1.4rem; font-weight: 300; line-height: 1;
        }
        .faq-header .arrow.open { transform: rotate(45deg); }
        .faq-answer {
          max-height: 0; overflow: hidden; opacity: 0;
          transition: max-height 0.4s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s, padding 0.3s;
          padding: 0 1.4rem; color: var(--text-muted); font-size: 0.93rem; line-height: 1.75;
        }
        .faq-answer.open { max-height: 400px; opacity: 1; padding: 0 1.4rem 1.4rem; }

        /* ── Final CTA ── */
        .final-cta {
          background: var(--navy); border-radius: 24px; max-width: 780px; margin: 0 auto;
          padding: 3.5rem 2rem; text-align: center; position: relative; overflow: hidden;
        }
        .final-cta::before {
          content: ''; position: absolute; top: -50%; right: -20%;
          width: 500px; height: 500px;
          background: radial-gradient(circle, rgba(201,155,43,0.10), transparent 65%);
          border-radius: 50%; pointer-events: none;
        }
        .final-cta h2 { color: #fff; font-size: 2.1rem; margin: 0 0 0.9rem; line-height: 1.18; position: relative; letter-spacing: -0.025em; }
        .final-cta > p { color: #B8C4D4; font-size: 1rem; margin: 0 0 2.2rem; max-width: 500px; margin-left: auto; margin-right: auto; line-height: 1.65; position: relative; }

        /* ── Waitlist form ── */
        .wl-form { width: 100%; max-width: 440px; margin: 0 auto; position: relative; }
        .wl-fields { display: grid; gap: 0.6rem; }
        .wl-input, .wl-select {
          width: 100%; padding: 0.9rem 1rem; border-radius: 9px;
          font-family: inherit; font-size: 0.95rem; color: var(--text);
          background: var(--card); border: 1px solid var(--border);
          transition: border-color 0.2s, background 0.2s, box-shadow 0.2s;
          -webkit-appearance: none; appearance: none;
        }
        .wl-form--dark .wl-input, .wl-form--dark .wl-select {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.14);
          color: #fff;
        }
        .wl-form--dark .wl-input::placeholder { color: rgba(184,196,212,0.6); }
        .wl-form--dark .wl-input:focus, .wl-form--dark .wl-select:focus {
          border-color: var(--gold-soft);
          background: rgba(255,255,255,0.08);
          box-shadow: 0 0 0 3px rgba(201,155,43,0.18);
        }
        .wl-input:focus, .wl-select:focus {
          outline: none; border-color: var(--gold-soft);
          box-shadow: 0 0 0 3px rgba(201,155,43,0.15);
        }
        .wl-select-wrap { position: relative; }
        .wl-select-wrap::after {
          content: ''; position: absolute; top: 50%; right: 1rem;
          width: 7px; height: 7px; border-right: 2px solid currentColor; border-bottom: 2px solid currentColor;
          transform: translateY(-70%) rotate(45deg); pointer-events: none; opacity: 0.45;
        }
        .wl-select { padding-right: 2.4rem; cursor: pointer; }
        .wl-select option { color: #1A1A1A; background: #fff; }
        .wl-submit {
          width: 100%; padding: 0.95rem 1.5rem; border-radius: 9px;
          background: var(--gold-soft); color: var(--navy);
          font-weight: 700; font-size: 0.95rem; font-family: inherit;
          border: none; cursor: pointer; margin-top: 0.3rem;
          display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem;
          transition: background 0.2s, transform 0.25s, box-shadow 0.25s;
        }
        .wl-submit:hover:not(:disabled) {
          background: var(--gold); transform: translateY(-1px);
          box-shadow: 0 10px 24px rgba(201,155,43,0.35);
        }
        .wl-submit:disabled { opacity: 0.7; cursor: wait; }
        .wl-note { color: rgba(184,196,212,0.6); font-size: 0.78rem; line-height: 1.5; margin-top: 0.9rem; text-align: center; }
        .wl-error { color: #FF8B6F; font-size: 0.82rem; margin-top: 0.6rem; text-align: center; }

        .wl-success {
          background: rgba(201,155,43,0.08); border: 1px solid rgba(201,155,43,0.25);
          border-radius: 14px; padding: 1.7rem 1.4rem; text-align: center;
          animation: fadeIn 0.5s ease;
        }
        .wl-success-icon {
          width: 40px; height: 40px; border-radius: 50%;
          background: var(--gold-soft); color: var(--navy);
          display: inline-flex; align-items: center; justify-content: center;
          margin-bottom: 0.8rem;
        }
        .wl-success-title { color: #fff; font-size: 1.05rem; font-weight: 700; margin: 0 0 0.4rem; font-family: 'Fraunces', serif; }
        .wl-success-sub { color: rgba(184,196,212,0.85); font-size: 0.88rem; margin: 0; line-height: 1.55; }

        /* ── Footer ── */
        .footer { border-top: 1px solid var(--border); padding: 3rem 1.5rem 2rem; margin-top: 6rem; text-align: center; color: var(--text-muted); font-size: 0.82rem; }
        .footer-links { display: flex; justify-content: center; gap: 0.4rem 1.2rem; flex-wrap: wrap; margin: 1.3rem 0; }
        .footer-links a, .footer-links button {
          color: var(--text); text-decoration: none; transition: color 0.2s;
          background: none; border: none; cursor: pointer; font-size: 0.84rem;
          padding: 0.2rem 0.3rem; font-family: inherit;
        }
        .footer-links a:hover, .footer-links button:hover { color: var(--gold); }

        /* ── Responsive ── */
        @media (max-width: 960px) {
          .hero { padding: 4rem 1.25rem; }
          .hero-inner { grid-template-columns: 1fr; gap: 3rem; }
          .hero h1 { font-size: 2.6rem; }
          .hero-left { max-width: 100%; }
          .hero-mockup { max-width: 340px; }
          .section { padding: 4.5rem 1.25rem; }
          .section-head h2 { font-size: 1.95rem; }
          .bento-feature, .bento-tall, .bento-third { grid-column: span 12; }
          .bento-feature .bento-img-wrap, .bento-tall .bento-img-wrap, .bento-third .bento-img-wrap { aspect-ratio: 16 / 10; }
          .toggle-content { grid-template-columns: 1fr; }
          .toggle-text { padding: 2rem 1.5rem 1rem; }
          .toggle-image-wrap { padding: 1.6rem; min-height: auto; }
          .founder { grid-template-columns: 1fr; padding: 2rem; gap: 2rem; }
          .founder-photo { max-width: 260px; margin: 0 auto; aspect-ratio: 1 / 1; }
          .final-cta { padding: 2.8rem 1.5rem; border-radius: 20px; }
          .final-cta h2 { font-size: 1.7rem; }
        }
        @media (max-width: 720px) {
          .navbar .nav-links { display: none; }
          .navbar .nav-actions .login-link { display: none; }
          .hamburger { display: inline-flex; align-items: center; }
          .hero h1 { font-size: 2.15rem; }
          .section-head h2 { font-size: 1.65rem; }
          .trust-bar-inner { grid-template-columns: repeat(2, 1fr); gap: 1.4rem; }
          .trust-item .num { font-size: 1.3rem; }
        }
        @media (max-width: 420px) {
          .hero h1 { font-size: 1.95rem; }
          .trust-item .num { font-size: 1.15rem; }
          .founder-copy h2 { font-size: 1.5rem; }
        }
      `}</style>


            {/* ─── HEADER ─── */}
      <header className="navbar">
        <button
          onClick={() => navigateTo('/')}
          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          aria-label="Cresoa home"
        >
          <Logo variant="primary" size="large" />
        </button>

        <nav className="nav-links" aria-label="Primary">
          <Link href="/fashion" className="nav-link">Fashion</Link>
          <Link href="/repairs" className="nav-link">Repairs</Link>
          <Link href="/printing" className="nav-link">Printing</Link>
          <Link href="/blog" className="nav-link">Blog</Link>
          <Link href="/support" className="nav-link">Support</Link>
          <button onClick={(e) => scrollToSection(e, 'faq')} className="nav-link">FAQ</button>
        </nav>

        <div className="nav-actions">
          <ThemeToggle />
          <Link href="/login" className="login-link">Log in</Link>
          <button onClick={scrollToForm} className="nav-cta">Join Waitlist</button>
          <button className="hamburger" onClick={() => setMobileMenuOpen(true)} aria-label="Open menu">
            {ICONS.menu}
          </button>
        </div>
      </header>

      {/* ─── MOBILE DRAWER ─── */}
      <div className={`mobile-overlay ${mobileMenuOpen ? 'open' : ''}`} onClick={closeMobileMenu} />
      <div className={`mobile-drawer ${mobileMenuOpen ? 'open' : ''}`}>
        <button className="close-btn" onClick={closeMobileMenu} aria-label="Close menu">{ICONS.x}</button>
        <Link href="/fashion" className="nav-link" onClick={closeMobileMenu}>Fashion</Link>
        <Link href="/repairs" className="nav-link" onClick={closeMobileMenu}>Repairs</Link>
        <Link href="/printing" className="nav-link" onClick={closeMobileMenu}>Printing</Link>
        <Link href="/blog" className="nav-link" onClick={closeMobileMenu}>Blog</Link>
        <Link href="/support" className="nav-link" onClick={closeMobileMenu}>Support</Link>
        <button onClick={(e) => scrollToSection(e, 'faq')} className="nav-link">FAQ</button>
        <Link href="/login" className="nav-link" onClick={closeMobileMenu}>Log in</Link>
        <button onClick={scrollToForm} className="nav-cta" style={{ marginTop: '0.8rem', padding: '0.85rem 1rem', width: '100%' }}>
          Join Waitlist
        </button>
      </div>

      {/* ─── HERO ─── */}
      <section className="hero">
        <div className="hero-inner">
          <div className="hero-left">
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
          <div className="hero-right">
            <img
              src="/mockups/dashboard.webp"
              alt="Cresoa dashboard showing revenue, orders, and production pipeline"
              className="hero-mockup"
              loading="eager"
              width="380"
              height="760"
            />
          </div>
        </div>
      </section>

      {/* ─── TRUST BAR ─── */}
      <section className="trust-bar" aria-label="Cresoa at a glance">
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

      {/* ─── BENTO ─── */}
      <section className="section" aria-labelledby="features-heading">
        <div className="container">
          <div className="section-head" data-animate>
            <span className="eyebrow">What Cresoa Does</span>
            <h2 id="features-heading">Everything you need to run smoothly</h2>
            <p>One workspace for customers, orders, payments, and production.</p>
          </div>

          <div className="bento">
            <article className="bento-card bento-feature" data-animate>
              <div className="bento-img-wrap">
                <img src="/mockups/order-detail.webp" alt="Order detail with production stages" className="bento-img" loading="lazy" />
              </div>
              <div className="bento-body">
                <span className="bento-tag">Order Tracking</span>
                <h3>Every order, every stage.</h3>
                <p>Placed → Cutting → Sewing → Ready → Delivered. One glance tells you where every job stands.</p>
              </div>
            </article>

            <article className="bento-card bento-tall" data-animate>
              <div className="bento-img-wrap">
                <img src="/mockups/invoice.webp" alt="Branded invoice with bank details" className="bento-img" loading="lazy" />
              </div>
              <div className="bento-body">
                <span className="bento-tag">Payments</span>
                <h3>Invoices that get paid.</h3>
                <p>Send branded invoices via WhatsApp with bank details, CAC number, and a live balance.</p>
              </div>
            </article>

            <article className="bento-card bento-third" data-animate>
              <div className="bento-img-wrap">
                <img src="/mockups/production.webp" alt="Production pipeline" className="bento-img" loading="lazy" />
              </div>
              <div className="bento-body">
                <span className="bento-tag">Production</span>
                <h3>See your workshop moving.</h3>
                <p>Know how many orders are cutting, sewing, and ready — in real time.</p>
              </div>
            </article>

            <article className="bento-card bento-third" data-animate>
              <div className="bento-img-wrap">
                <img src="/mockups/whatsapp.webp" alt="One-tap WhatsApp customer update" className="bento-img" loading="lazy" />
              </div>
              <div className="bento-body">
                <span className="bento-tag">Customer Comms</span>
                <h3>One-tap WhatsApp updates.</h3>
                <p>Send tracking links and receipts without leaving Cresoa.</p>
              </div>
            </article>

            <article className="bento-card bento-third" data-animate>
              <div className="bento-img-wrap">
                <img src="/mockups/support.webp" alt="Tessa AI and human support" className="bento-img" loading="lazy" />
              </div>
              <div className="bento-body">
                <span className="bento-tag">Support</span>
                <h3>Tessa AI + real humans.</h3>
                <p>Get answers in seconds, or talk to a person when it matters.</p>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* ─── TOGGLE ─── */}
      <section className="section" aria-labelledby="industries-heading">
        <div className="container">
          <div className="section-head" data-animate>
            <span className="eyebrow">Built for Your Industry</span>
            <h2 id="industries-heading">Cresoa adapts to how you work</h2>
            <p>Different industries, one system. Not the other way around.</p>
          </div>

          <div className="toggle-wrap" data-animate>
            <div className="toggle-tabs" role="tablist" aria-label="Industries">
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
                <button onClick={scrollToForm} className="btn btn-gold" style={{ padding: '0.8rem 1.6rem', fontSize: '0.9rem' }}>
                  Join the Waitlist {ICONS.arrowRight}
                </button>
              </div>
              <div className="toggle-image-wrap">
                <img src={activeIndustry.image} alt={activeIndustry.alt} className="toggle-image" loading="lazy" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FOUNDER ─── */}
      <section className="section" aria-labelledby="founder-heading">
        <div className="container">
          <div className="founder" data-animate>
            <img
              src="/mockups/founder.webp"
              alt="Taiwo A. Feranmi, founder of Cresoa"
              className="founder-photo"
              loading="lazy"
            />
            <div className="founder-copy">
              <span className="eyebrow" style={{ color: 'var(--gold)' }}>A Note from the Founder</span>
              <h2 id="founder-heading">Built solo, for Nigerian businesses.</h2>
              <p>
                Hi, I'm Taiwo. I'm building Cresoa solo because I watched too many great Nigerian businesses run on WhatsApp screenshots and paper notebooks — and I know we deserve better software.
              </p>
              <p>
                I've been building in the open for 3 months. Fashion, Repairs, and Printing modules are live. More industries follow. But I'm not launching until the product is right.
              </p>
              <div className="founder-sign">— Taiwo A. Feranmi</div>
              <div className="founder-title">Founder, Cresoa</div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── PRICING ─── */}
      <section className="section" id="pricing" aria-labelledby="pricing-heading">
        <div className="container">
          <div className="section-head" data-animate>
            <span className="eyebrow">Pricing</span>
            <h2 id="pricing-heading">Simple, transparent pricing</h2>
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
                <li className="muted">{ICONS.dash} Staff accounts</li>
                <li className="muted">{ICONS.dash} WhatsApp integration</li>
              </ul>
              <button onClick={scrollToForm} className="btn btn-ghost" style={{ width: '100%' }}>Join Waitlist</button>
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
              <button onClick={scrollToForm} className="btn" style={{ width: '100%' }}>Reserve Starter Access</button>
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
              <button onClick={scrollToForm} className="btn" style={{ width: '100%' }}>Reserve Pro Access</button>
            </div>
          </div>

          <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '2rem' }}>
            Founding Members get 30 days of Pro features completely free at launch. No credit card needed.
          </p>
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section className="section" id="faq" aria-labelledby="faq-heading" style={{ maxWidth: '780px', margin: '0 auto' }}>
        <div className="section-head" data-animate>
          <span className="eyebrow">Questions</span>
          <h2 id="faq-heading">Frequently asked questions</h2>
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
                <span className={`arrow ${openFaqIndex === i ? 'open' : ''}`} aria-hidden="true">+</span>
              </div>
              <div className={`faq-answer ${openFaqIndex === i ? 'open' : ''}`}>{item.a}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── FINAL CTA ─── */}
      <section className="section" aria-labelledby="cta-heading" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="final-cta" data-animate>
            <h2 id="cta-heading">Ready to bring order to your business?</h2>
            <p>Join 47 Nigerian founders already on the waitlist.</p>
            <WaitlistForm theme="dark" />
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="footer">
        <div className="container">
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
            <button onClick={(e) => scrollToSection(e, 'faq')}>FAQ</button>
            <button onClick={scrollToForm}>Join Waitlist</button>
          </nav>
          <p style={{ opacity: 0.6, fontSize: '0.72rem', marginTop: '0.8rem' }}>
            © {new Date().getFullYear()} Cresoa · All rights reserved.
          </p>
        </div>
      </footer>
    </main>
  )
      }
