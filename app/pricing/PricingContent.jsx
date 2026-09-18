'use client'

import { useState, useEffect, useCallback, Fragment } from 'react'
import Link from 'next/link'
import Logo from '../../components/Logo'
import ThemeToggle from '../../components/ThemeToggle'
import { SITE_CONFIG } from '../lib/siteConfig'

const ICONS = {
  menu: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>,
  x: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  check: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  dash: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  arrowRight: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>,
  sparkle: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v3m0 12v3M3 12h3m12 0h3M5.6 5.6l2.1 2.1m8.6 8.6l2.1 2.1M5.6 18.4l2.1-2.1m8.6-8.6l2.1-2.1"/></svg>,
}

function WaitlistForm() {
  const [status, setStatus] = useState('idle')
  const handleSubmit = useCallback(async (e) => {
    e.preventDefault()
    const form = e.target
    const data = new FormData(form)
    setStatus('sending')
    try {
      const res = await fetch('/api/waitlist', { method: 'POST', body: data })
      const json = await res.json()
      if (json.ok) { setStatus('success'); form.reset() } else setStatus('error')
    } catch { setStatus('error') }
  }, [])

  if (status === 'success') {
    return (
      <div className="wl-form">
        <div className="wl-success">
          <div className="wl-success-icon">{ICONS.check}</div>
          <p className="wl-success-title">You&apos;re on the list.</p>
          <p className="wl-success-sub">Check your inbox to confirm. If it&apos;s not in Primary, check Promotions and drag it there.</p>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="wl-form" noValidate>
      <div className="wl-fields">
        <input type="email" name="email_address" placeholder="Email address" aria-label="Email address" required autoComplete="email" className="wl-input" />
        <input type="text" name="fields[first_name]" placeholder="First name" aria-label="First name" required autoComplete="given-name" className="wl-input" />
        <div className="wl-select-wrap">
          <select name="tags[]" required aria-label="Business type" className="wl-select" defaultValue="">
            <option value="" disabled>What do you do?</option>
            <option value="23510464">Fashion & Tailoring</option>
            <option value="23510466">Repairs & Technical</option>
            <option value="23510467">Printing & Signage</option>
            <option value="other">Other</option>
          </select>
        </div>
        <button type="submit" className="wl-submit" disabled={status === 'sending'}>
          {status === 'sending' ? 'Joining…' : <>Join the Waitlist {ICONS.arrowRight}</>}
        </button>
      </div>
      <p className="wl-note">Founding Members get Beta access free for 30 days at launch.</p>
      {status === 'error' && <p className="wl-error">Something went wrong. Please try again.</p>}
    </form>
  )
}

// ─── Comparison Data ────────────────────────────────
const COMPARISON = [
  {
    category: 'Customers & Orders',
    rows: [
      { feature: 'Customers', free: '20', starter: '200', beta: '500', pro: 'Unlimited' },
      { feature: 'Orders / jobs', free: '50', starter: '500', beta: '1,000', pro: 'Unlimited' },
      { feature: 'Basic order tracking', free: true, starter: true, beta: true, pro: true },
      { feature: 'Production stage tracking', free: true, starter: true, beta: true, pro: true },
      { feature: 'Customer tracking links', free: false, starter: true, beta: true, pro: true },
      { feature: 'Group / Aso-Ebi orders', free: false, starter: true, beta: true, pro: true },
    ],
  },
  {
    category: 'Inventory',
    rows: [
      { feature: 'Inventory items', free: '20', starter: '100', beta: '500', pro: 'Unlimited' },
      { feature: 'Inventory management', free: true, starter: true, beta: true, pro: true },
      { feature: 'Low-stock alerts', free: false, starter: false, beta: true, pro: true },
    ],
  },
  {
    category: 'Team',
    rows: [
      { feature: 'Staff accounts', free: '0', starter: '2', beta: '10', pro: '10' },
    ],
  },
  {
    category: 'Tessa AI',
    rows: [
      { feature: 'Tessa AI assistant', free: false, starter: true, beta: '200 actions', pro: 'Unlimited' },
    ],
  },
  {
    category: 'Payments & Invoices',
    rows: [
      { feature: 'Professional invoices', free: true, starter: true, beta: true, pro: true },
      { feature: 'Deposit & balance tracking', free: true, starter: true, beta: true, pro: true },
      { feature: 'Bank details on invoice', free: true, starter: true, beta: true, pro: true },
      { feature: 'Multi-item invoices', free: false, starter: true, beta: true, pro: true },
      { feature: 'CAC / TIN on invoice', free: false, starter: true, beta: true, pro: true },
    ],
  },
  {
    category: 'Communication',
    rows: [
      { feature: 'WhatsApp invoice sharing', free: false, starter: true, beta: true, pro: true },
      { feature: 'WhatsApp customer updates', free: false, starter: true, beta: true, pro: true },
    ],
  },
  {
    category: 'Analytics & Support',
    rows: [
      { feature: 'Business dashboard', free: true, starter: true, beta: true, pro: true },
      { feature: 'Business health score', free: true, starter: true, beta: true, pro: true },
      { feature: 'Revenue trends', free: false, starter: true, beta: true, pro: true },
      { feature: 'Advanced analytics', free: false, starter: false, beta: false, pro: true },
      { feature: 'Data export (Excel / PDF)', free: false, starter: false, beta: false, pro: true },
      { feature: 'Priority support', free: false, starter: false, beta: false, pro: true },
    ],
  },
]

const FAQS = [
  { q: 'When will I be charged?', a: 'Only after Cresoa launches. Joining the waitlist is free, and there is no charge until you choose a paid plan.' },
  { q: 'What is the Beta plan?', a: 'Beta is a temporary plan available to waitlist members for 30 days after launch. It gives access to higher limits while Cresoa is still being improved. Beta is not a permanent plan.' },
  { q: 'What happens after the 30-day Beta ends?', a: 'You choose a permanent plan — Free, Starter, or Pro. There is no automatic charge.' },
  { q: 'Do I need a credit card to join the waitlist?', a: 'No. Not to join the waitlist, and not to claim Beta access.' },
  { q: 'Can I switch plans later?', a: 'Yes. You can upgrade or downgrade at any time from your dashboard.' },
]

function CellValue({ value, highlight }) {
  if (value === true) return <span className={`tick ${highlight ? 'tick--gold' : ''}`}>{ICONS.check}</span>
  if (value === false) return <span className="dash">{ICONS.dash}</span>
  return <span className="text-val">{value}</span>
}

export default function PricingContent() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [openFaqIndex, setOpenFaqIndex] = useState(null)

  const closeMobileMenu = () => setMobileMenuOpen(false)

  const scrollToForm = (e) => {
    if (e) e.preventDefault()
    const el = document.getElementById('pricing-waitlist-form')
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY - 80
      window.scrollTo({ top, behavior: 'smooth' })
    }
    closeMobileMenu()
  }

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

  const toggleFaq = (i) => setOpenFaqIndex(openFaqIndex === i ? null : i)

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
          opacity: 0; transform: translateY(20px);
          transition: opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1), transform 0.7s cubic-bezier(0.16, 1, 0.3, 1);
        }
        html.js-ready [data-reveal].reveal-in { opacity: 1; transform: translateY(0); }
        html.js-ready [data-reveal][data-delay="1"] { transition-delay: 0.08s; }
        html.js-ready [data-reveal][data-delay="2"] { transition-delay: 0.16s; }
        @media (prefers-reduced-motion: reduce) {
          html.js-ready [data-reveal], html.js-ready [data-reveal].reveal-in { opacity: 1 !important; transform: none !important; transition: none !important; }
        }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

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
        .hero { background: linear-gradient(170deg, #0F2B4A 0%, #061A2E 100%); padding: 5.5rem 1.5rem 6rem; position: relative; overflow: hidden; }
        .hero::before { content: ''; position: absolute; top: -35%; right: -15%; width: 900px; height: 900px; background: radial-gradient(circle, rgba(201,155,43,0.14) 0%, transparent 55%); border-radius: 50%; pointer-events: none; }
        .hero-inner { position: relative; z-index: 1; max-width: 720px; margin: 0 auto; text-align: center; }
        .hero-eyebrow { display: inline-block; font-size: 0.72rem; font-weight: 600; letter-spacing: 0.18em; text-transform: uppercase; color: var(--gold-bright); margin-bottom: 1.8rem; }
        .hero h1 { color: #fff; font-size: 3.2rem; line-height: 1.08; margin: 0 0 1.4rem; letter-spacing: -0.035em; }
        .hero h1 em { color: var(--gold-bright); font-style: normal; }
        .hero .subhead { color: #A8B8CE; font-size: 1.1rem; line-height: 1.7; margin: 0 auto 2.6rem; max-width: 560px; }

        /* Section head */
        .section-head { max-width: 640px; margin: 0 auto 3.5rem; text-align: center; }
        .section-head .eyebrow { display: inline-block; font-size: 0.7rem; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; color: var(--gold); margin-bottom: 1.1rem; }
        .section-head h2 { font-size: 2.4rem; margin: 0 0 0.9rem; line-height: 1.15; }
        .section-head p { color: var(--text-muted); font-size: 1.03rem; margin: 0; line-height: 1.65; }

        /* Plans */
        .plans { background: var(--bg); padding: 6rem 1.5rem; }
        .plans-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem; max-width: 1080px; margin: 0 auto; }
        .plan { background: var(--card); border: 1px solid var(--border); border-radius: 20px; padding: 2.4rem 1.9rem 2rem; display: flex; flex-direction: column; transition: border-color 0.3s, transform 0.4s cubic-bezier(0.16,1,0.3,1), box-shadow 0.3s; position: relative; }
        .plan:hover { border-color: var(--border-strong); transform: translateY(-4px); box-shadow: 0 24px 50px rgba(15,43,74,0.08); }
        .plan.popular { border-color: var(--gold); background: rgba(201,155,43,0.03); }
        [data-theme="dark"] .plan.popular { background: rgba(201,155,43,0.05); }
        .plan-badge { position: absolute; top: -12px; left: 50%; transform: translateX(-50%); background: var(--gold); color: var(--bg-dark); font-size: 0.62rem; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; padding: 0.3rem 0.9rem; border-radius: 20px; white-space: nowrap; }
        .plan-name { font-size: 1.05rem; font-weight: 600; color: var(--text); margin: 0; letter-spacing: -0.01em; }
        .plan-desc { color: var(--text-muted); font-size: 0.88rem; margin: 0.4rem 0 1.6rem; min-height: 2.6rem; }
        .plan-price { font-size: 3rem; font-weight: 700; color: var(--text); margin: 0 0 0.4rem; font-family: 'Fraunces', serif; letter-spacing: -0.04em; line-height: 1; }
        .plan-price span { font-size: 0.95rem; font-weight: 400; color: var(--text-muted); font-family: 'Inter', sans-serif; letter-spacing: 0; margin-left: 0.2rem; }
        .plan-price-note { color: var(--text-muted); font-size: 0.78rem; margin: 0 0 1.8rem; }
        .plan-cta { display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem; padding: 0.9rem 1.5rem; border-radius: 10px; font-weight: 700; font-size: 0.92rem; font-family: inherit; border: none; cursor: pointer; transition: background 0.2s, transform 0.25s, box-shadow 0.25s; margin-bottom: 2rem; }
        .plan-cta.primary { background: var(--gold); color: var(--bg-dark); }
        .plan-cta.primary:hover { background: var(--gold-bright); transform: translateY(-1px); box-shadow: 0 14px 30px rgba(201,155,43,0.35); }
        .plan-cta.secondary { background: var(--bg-dark); color: #fff; }
        .plan-cta.secondary:hover { background: #1A3F66; transform: translateY(-1px); }
        .plan-cta.ghost { background: transparent; color: var(--text); border: 1px solid var(--border-strong); }
        .plan-cta.ghost:hover { background: var(--bg-alt); border-color: var(--text); }
        .plan-features { list-style: none; padding: 0; margin: 0; border-top: 1px solid var(--border); padding-top: 1.8rem; }
        .plan-features li { padding: 0.55rem 0; font-size: 0.9rem; color: var(--text); display: flex; align-items: flex-start; gap: 0.65rem; line-height: 1.5; }
        .plan-features li svg { flex-shrink: 0; color: var(--gold); margin-top: 0.2rem; }
        .plan-features li.muted { color: var(--text-muted); opacity: 0.65; }
        .plan-features li.muted svg { color: var(--text-muted); }

        /* Beta callout */
          .beta-callout { background: var(--bg-alt); padding: 0 1.5rem 6rem; }
        .beta-card { max-width: 1080px; margin: 0 auto; background: linear-gradient(170deg, #0F2B4A 0%, #061A2E 100%); border-radius: 20px; padding: 2.5rem 2rem; display: grid; grid-template-columns: 1fr auto; gap: 2rem; align-items: center; position: relative; overflow: hidden; }
        .beta-card::before { content: ''; position: absolute; top: -50%; right: -10%; width: 500px; height: 500px; background: radial-gradient(circle, rgba(201,155,43,0.12), transparent 60%); border-radius: 50%; pointer-events: none; }
        .beta-copy { position: relative; }
        .beta-tag { display: inline-flex; align-items: center; gap: 0.4rem; font-size: 0.65rem; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: var(--gold-bright); padding: 0.3rem 0.8rem; border-radius: 100px; border: 1px solid rgba(229,184,75,0.35); margin-bottom: 1rem; }
        .beta-copy h3 { color: #fff; font-size: 1.5rem; margin: 0 0 0.7rem; line-height: 1.25; letter-spacing: -0.02em; }
        .beta-copy p { color: #A8B8CE; font-size: 0.98rem; line-height: 1.65; margin: 0; max-width: 620px; }
        .beta-stats { position: relative; display: flex; gap: 1.5rem; flex-wrap: wrap; }
        .beta-stat { text-align: center; }
        .beta-stat .num { color: var(--gold-bright); font-family: 'Fraunces', serif; font-size: 1.4rem; font-weight: 700; letter-spacing: -0.02em; line-height: 1; }
        .beta-stat .lbl { color: #7C8CA5; font-size: 0.68rem; letter-spacing: 0.08em; text-transform: uppercase; margin-top: 0.4rem; }

        /* Comparison table */
        .comparison { background: var(--bg-alt); padding: 6rem 1.5rem; border-top: 1px solid var(--border); }
        .table-wrap { max-width: 1080px; margin: 0 auto; overflow-x: auto; border-radius: 16px; border: 1px solid var(--border); background: var(--card); }
        .comparison table { width: 100%; border-collapse: collapse; min-width: 720px; }
        .comparison thead { background: var(--bg); }
        .comparison th { padding: 1.2rem 1.4rem; text-align: left; font-size: 0.78rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--text-muted); border-bottom: 1px solid var(--border); }
        .comparison th:first-child { color: var(--text); }
        .comparison th.col-plan { text-align: center; color: var(--text); font-size: 0.92rem; letter-spacing: 0; text-transform: none; font-weight: 700; }
        .comparison th.col-plan.pop { color: var(--gold); }
        .comparison th.col-plan.beta { color: var(--gold); position: relative; }
        .comparison th.col-plan.beta::after { content: 'Waitlist only'; display: block; font-size: 0.62rem; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: var(--text-muted); margin-top: 0.35rem; }
        .comparison td { padding: 0.95rem 1.4rem; border-bottom: 1px solid var(--border); font-size: 0.9rem; color: var(--text); vertical-align: middle; }
        .comparison td:first-child { font-weight: 500; }
        .comparison td.cell { text-align: center; }
        .comparison td.beta-cell { background: rgba(201,155,43,0.03); }
        [data-theme="dark"] .comparison td.beta-cell { background: rgba(201,155,43,0.05); }
        .comparison tr:last-child td { border-bottom: none; }
        .comparison tr.category-row td { background: var(--bg); font-weight: 700; font-size: 0.72rem; letter-spacing: 0.12em; text-transform: uppercase; color: var(--text-muted); padding: 0.75rem 1.4rem; border-bottom: 1px solid var(--border); }
        .tick { display: inline-flex; align-items: center; justify-content: center; width: 22px; height: 22px; border-radius: 50%; background: rgba(201,155,43,0.12); color: var(--gold); }
        .tick--gold { background: rgba(201,155,43,0.18); }
        .dash { display: inline-flex; align-items: center; justify-content: center; width: 22px; height: 22px; color: var(--text-muted); opacity: 0.4; }
        .text-val { font-weight: 600; color: var(--text); font-size: 0.88rem; }

        /* Why */
        .why { background: var(--bg); padding: 6rem 1.5rem; }
        .why-inner { max-width: 800px; margin: 0 auto; text-align: center; }
        .why h2 { font-size: 2.2rem; margin: 0 0 1.4rem; line-height: 1.15; letter-spacing: -0.025em; }
        .why p { color: var(--text-muted); font-size: 1.05rem; line-height: 1.8; margin: 0 0 1.2rem; }
        .why-points { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem; margin-top: 3rem; text-align: left; }
        .why-point { background: var(--card); border: 1px solid var(--border); border-radius: 14px; padding: 1.6rem 1.4rem; }
        .why-point h3 { font-size: 1rem; margin: 0 0 0.6rem; line-height: 1.35; }
        .why-point p { color: var(--text-muted); font-size: 0.88rem; line-height: 1.6; margin: 0; }

        /* FAQ */
        .faq { background: var(--bg-alt); padding: 6rem 1.5rem; border-top: 1px solid var(--border); }
        .faq-inner { max-width: 760px; margin: 0 auto; }
        .faq-head { text-align: center; margin-bottom: 3.5rem; }
        .faq-head .eyebrow { display: inline-block; font-size: 0.7rem; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; color: var(--gold); margin-bottom: 1.1rem; }
        .faq-head h2 { font-size: 2.2rem; margin: 0; line-height: 1.15; }
        .faq-item { border-bottom: 1px solid var(--border); }
        .faq-item:first-of-type { border-top: 1px solid var(--border); }
        .faq-header { padding: 1.4rem 0; font-weight: 600; color: var(--text); cursor: pointer; display: flex; justify-content: space-between; align-items: center; font-size: 1rem; user-select: none; gap: 1rem; }
        .faq-header .arrow { color: var(--text-muted); transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1); font-size: 1.4rem; font-weight: 300; line-height: 1; flex-shrink: 0; }
        .faq-header .arrow.open { transform: rotate(45deg); color: var(--gold); }
        .faq-answer { max-height: 0; overflow: hidden; opacity: 0; transition: max-height 0.4s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s, padding 0.3s; color: var(--text-muted); font-size: 0.95rem; line-height: 1.8; }
        .faq-answer.open { max-height: 400px; opacity: 1; padding: 0 0 1.5rem; }

        /* Final CTA */
        .cta { background: linear-gradient(170deg, #0F2B4A 0%, #061A2E 100%); padding: 7rem 1.5rem; text-align: center; position: relative; overflow: hidden; }
        .cta::before { content: ''; position: absolute; top: -40%; left: 50%; transform: translateX(-50%); width: 800px; height: 800px; background: radial-gradient(circle, rgba(201,155,43,0.12), transparent 60%); border-radius: 50%; pointer-events: none; }
        .cta-inner { position: relative; max-width: 620px; margin: 0 auto; }
        .cta h2 { color: #fff; font-size: 2.4rem; margin: 0 0 1.1rem; line-height: 1.15; letter-spacing: -0.03em; }
        .cta p { color: #A8B8CE; font-size: 1.05rem; margin: 0 0 2.4rem; line-height: 1.7; }

        /* Waitlist form */
        .wl-form { width: 100%; max-width: 440px; margin: 0 auto; }
        .wl-fields { display: grid; gap: 0.65rem; }
        .wl-input, .wl-select { width: 100%; padding: 0.95rem 1rem; border-radius: 10px; font-family: inherit; font-size: 0.95rem; color: #fff; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.14); transition: border-color 0.2s, box-shadow 0.2s; -webkit-appearance: none; appearance: none; }
        .wl-input::placeholder { color: rgba(168,184,206,0.6); }
        .wl-input:focus, .wl-select:focus { outline: none; border-color: var(--gold-bright); background: rgba(255,255,255,0.08); box-shadow: 0 0 0 3px rgba(201,155,43,0.18); }
        .wl-select-wrap { position: relative; }
        .wl-select-wrap::after { content: ''; position: absolute; top: 50%; right: 1rem; width: 7px; height: 7px; border-right: 2px solid currentColor; border-bottom: 2px solid currentColor; transform: translateY(-70%) rotate(45deg); pointer-events: none; opacity: 0.5; color: #fff; }
        .wl-select { padding-right: 2.4rem; cursor: pointer; }
        .wl-select option { color: #1A1A1A; background: #fff; }
        .wl-submit { width: 100%; padding: 1rem 1.5rem; border-radius: 10px; background: var(--gold); color: var(--bg-dark); font-weight: 700; font-size: 0.95rem; font-family: inherit; border: none; cursor: pointer; margin-top: 0.3rem; display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem; transition: background 0.2s, transform 0.25s, box-shadow 0.25s; }
        .wl-submit:hover:not(:disabled) { background: var(--gold-bright); transform: translateY(-1px); box-shadow: 0 14px 30px rgba(201,155,43,0.35); }
        .wl-submit:disabled { opacity: 0.7; cursor: wait; }
        .wl-note { color: rgba(168,184,206,0.65); font-size: 0.78rem; line-height: 1.5; margin-top: 1rem; text-align: center; }
        .wl-error { color: #FF8B6F; font-size: 0.82rem; margin-top: 0.6rem; text-align: center; }
        .wl-success { background: rgba(201,155,43,0.08); border: 1px solid rgba(201,155,43,0.25); border-radius: 14px; padding: 1.8rem 1.4rem; text-align: center; animation: fadeUp 0.5s ease; }
        .wl-success-icon { width: 40px; height: 40px; border-radius: 50%; background: var(--gold); color: var(--bg-dark); display: inline-flex; align-items: center; justify-content: center; margin-bottom: 0.8rem; }
        .wl-success-title { color: #fff; font-size: 1.1rem; font-weight: 700; margin: 0 0 0.4rem; font-family: 'Fraunces', serif; }
        .wl-success-sub { color: rgba(168,184,206,0.9); font-size: 0.88rem; margin: 0; line-height: 1.6; }

        /* Footer */
        .footer { background: var(--bg); border-top: 1px solid var(--border); padding: 3.5rem 1.5rem 2rem; text-align: center; color: var(--text-muted); font-size: 0.82rem; }
        .footer-links { display: flex; justify-content: center; gap: 0.4rem 1.2rem; flex-wrap: wrap; margin: 1.4rem 0; }
        .footer-links a, .footer-links button { color: var(--text); text-decoration: none; transition: color 0.2s; background: none; border: none; cursor: pointer; font-size: 0.85rem; padding: 0.2rem 0.3rem; font-family: inherit; }
        .footer-links a:hover, .footer-links button:hover { color: var(--gold); }

        /* Responsive */
        @media (max-width: 960px) {
          .hero { padding: 4.5rem 1.25rem; }
          .hero h1 { font-size: 2.4rem; }
          .plans { padding: 4.5rem 1.25rem; }
          .plans-grid { grid-template-columns: 1fr; gap: 1.5rem; max-width: 480px; }
          .plan.popular { order: -1; }
          .beta-callout { padding: 0 1.25rem 4.5rem; }
          .beta-card { grid-template-columns: 1fr; padding: 2rem 1.5rem; gap: 1.5rem; }
          .beta-copy h3 { font-size: 1.3rem; }
          .comparison { padding: 4.5rem 1.25rem; }
          .why { padding: 4.5rem 1.25rem; }
          .why h2 { font-size: 1.75rem; }
          .why-points { grid-template-columns: 1fr; }
          .faq { padding: 4.5rem 1.25rem; }
          .faq-head h2 { font-size: 1.75rem; }
          .cta { padding: 5rem 1.25rem; }
          .cta h2 { font-size: 1.75rem; }
          .section-head h2 { font-size: 1.9rem; }
        }
        @media (max-width: 720px) {
          .navbar .nav-links { display: none; }
          .navbar .nav-actions .login-link { display: none; }
          .hamburger { display: inline-flex; align-items: center; }
          .hero h1 { font-size: 2rem; }
          .plan { padding: 2rem 1.5rem 1.7rem; }
          .plan-price { font-size: 2.4rem; }
          .comparison table { font-size: 0.82rem; min-width: 640px; }
          .comparison th, .comparison td { padding: 0.8rem 0.8rem; }
          .comparison tr.category-row td { padding: 0.6rem 0.8rem; }
          .why h2 { font-size: 1.5rem; }
          .section-head h2 { font-size: 1.6rem; }
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
          <Link href="/pricing" className="nav-link active">Pricing</Link>
          <Link href="/blog" className="nav-link">Blog</Link>
          <Link href="/support" className="nav-link">Support</Link>
          <Link href="/faq" className="nav-link">FAQ</Link>
        </nav>
        <div className="nav-actions">
          <ThemeToggle />
          <Link href="/login" className="login-link">Log in</Link>
          <button onClick={scrollToForm} className="nav-cta">Join Waitlist</button>
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
        <button onClick={scrollToForm} className="nav-cta" style={{ marginTop: '0.8rem', padding: '0.85rem 1rem', width: '100%' }}>Join Waitlist</button>
      </div>

      {/* BREADCRUMB */}
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <div className="breadcrumb-inner">
          <Link href="/">Home</Link>
          <span className="sep">/</span>
          <span className="current">Pricing</span>
        </div>
      </nav>

      {/* HERO */}
      <section className="hero">
        <div className="hero-inner" data-reveal>
          <span className="hero-eyebrow">Pricing</span>
          <h1>Simple, transparent pricing. <em>Built for Nigerian businesses.</em></h1>
          <p className="subhead">Coming at launch. Reserved for waitlist members first. Waitlist members get Beta access free for 30 days — no credit card required.</p>
          <div id="pricing-waitlist-form">
            <WaitlistForm />
          </div>
        </div>
      </section>

      {/* PLANS */}
      <section className="plans" aria-labelledby="plans-heading">
        <div className="section-head" data-reveal>
          <span className="eyebrow">Three Tiers</span>
          <h2 id="plans-heading">Pick the plan that fits.</h2>
          <p>Start free. Upgrade when your business grows.</p>
        </div>

        <div className="plans-grid">
          {/* Free */}
          <div className="plan" data-reveal>
            <p className="plan-name">Free</p>
            <p className="plan-desc">For new businesses getting a feel for Cresoa.</p>
            <div className="plan-price">₦0</div>
            <p className="plan-price-note">Free forever</p>
            <button onClick={scrollToForm} className="plan-cta ghost">
              Join Waitlist
            </button>
            <ul className="plan-features">
              <li>{ICONS.check} 20 customers</li>
              <li>{ICONS.check} 50 orders / jobs</li>
              <li>{ICONS.check} 20 inventory items</li>
              <li>{ICONS.check} Basic order tracking</li>
              <li>{ICONS.check} Production stage tracking</li>
              <li>{ICONS.check} Professional invoices</li>
              <li>{ICONS.check} Deposit &amp; balance tracking</li>
              <li className="muted">{ICONS.dash} No staff accounts</li>
              <li className="muted">{ICONS.dash} No WhatsApp integration</li>
              <li className="muted">{ICONS.dash} No customer tracking links</li>
            </ul>
          </div>

          {/* Starter */}
            <div className="plan popular" data-reveal data-delay="1">
            <span className="plan-badge">Most Popular</span>
            <p className="plan-name">Starter</p>
            <p className="plan-desc">For growing businesses ready to move faster.</p>
            <div className="plan-price">₦3,500 <span>/month</span></div>
            <p className="plan-price-note">Billed monthly after launch</p>
            <button onClick={scrollToForm} className="plan-cta primary">
              Reserve Starter Access
            </button>
            <ul className="plan-features">
              <li>{ICONS.check} 200 customers</li>
              <li>{ICONS.check} 500 orders / jobs</li>
              <li>{ICONS.check} 100 inventory items</li>
              <li>{ICONS.check} Customer tracking links</li>
              <li>{ICONS.check} Group / Aso-Ebi orders</li>
              <li>{ICONS.check} Multi-item invoices</li>
              <li>{ICONS.check} CAC / TIN on invoice</li>
              <li>{ICONS.check} WhatsApp integration</li>
              <li>{ICONS.check} 2 staff accounts</li>
              <li>{ICONS.check} Tessa AI assistant</li>
            </ul>
          </div>

          {/* Pro */}
          <div className="plan" data-reveal data-delay="2">
            <p className="plan-name">Pro</p>
            <p className="plan-desc">For established businesses scaling with a team.</p>
            <div className="plan-price">₦9,500 <span>/month</span></div>
            <p className="plan-price-note">Billed monthly after launch</p>
            <button onClick={scrollToForm} className="plan-cta secondary">
              Reserve Pro Access
            </button>
            <ul className="plan-features">
              <li>{ICONS.check} Unlimited customers</li>
              <li>{ICONS.check} Unlimited orders / jobs</li>
              <li>{ICONS.check} Unlimited inventory</li>
              <li>{ICONS.check} 10 staff accounts</li>
              <li>{ICONS.check} Tessa AI assistant</li>
              <li>{ICONS.check} Low-stock alerts</li>
              <li>{ICONS.check} Advanced analytics</li>
              <li>{ICONS.check} Data export (Excel / PDF)</li>
              <li>{ICONS.check} Priority support</li>
              <li>{ICONS.check} All future Pro features</li>
            </ul>
          </div>
        </div>
      </section>

      {/* BETA CALLOUT */}
      <section className="beta-callout">
        <div className="beta-card" data-reveal>
          <div className="beta-copy">
            <span className="beta-tag">{ICONS.sparkle} Waitlist Exclusive</span>
            <h3>Beta access — free for 30 days.</h3>
            <p>Join the waitlist and get access to the Beta plan the moment we launch. Higher limits than Starter. Free for 30 days while we keep improving Cresoa. After that, choose any permanent plan.</p>
          </div>
          <div className="beta-stats">
            <div className="beta-stat">
              <div className="num">500</div>
              <div className="lbl">Customers</div>
            </div>
            <div className="beta-stat">
              <div className="num">1,000</div>
              <div className="lbl">Orders</div>
            </div>
            <div className="beta-stat">
              <div className="num">10</div>
              <div className="lbl">Staff</div>
            </div>
            <div className="beta-stat">
              <div className="num">200</div>
              <div className="lbl">Tessa actions</div>
            </div>
          </div>
        </div>
      </section>

      {/* COMPARISON TABLE */}
      <section className="comparison" aria-labelledby="compare-heading">
        <div className="section-head" data-reveal>
          <span className="eyebrow">Full Comparison</span>
          <h2 id="compare-heading">Every feature, side by side.</h2>
          <p>See exactly what you get on each plan.</p>
        </div>

        <div className="table-wrap" data-reveal data-delay="1">
          <table>
            <thead>
              <tr>
                <th>Feature</th>
                <th className="col-plan">Free</th>
                <th className="col-plan pop">Starter</th>
                <th className="col-plan beta">Beta</th>
                <th className="col-plan">Pro</th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON.map((group) => (
                <Fragment key={group.category}>
                  <tr className="category-row">
                    <td colSpan={5}>{group.category}</td>
                  </tr>
                  {group.rows.map((row, i) => (
                    <tr key={`${group.category}-${i}`}>
                      <td>{row.feature}</td>
                      <td className="cell"><CellValue value={row.free} /></td>
                      <td className="cell"><CellValue value={row.starter} highlight /></td>
                      <td className="cell beta-cell"><CellValue value={row.beta} highlight /></td>
                      <td className="cell"><CellValue value={row.pro} /></td>
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* WHY THESE PRICES */}
      <section className="why" aria-labelledby="why-heading">
        <div className="why-inner" data-reveal>
          <span className="eyebrow" style={{ display: 'inline-block', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: '1.1rem' }}>Why These Prices</span>
          <h2 id="why-heading">Built for Nigerian small businesses. Priced the same way.</h2>
          <p>Every plan is in Naira. No dollar conversion tricks, no surprise charges, no premium features hidden behind an enterprise tier.</p>
          <p>Whether you are running a tailoring shop from your home or managing a growing studio with staff, there is a plan that fits the way you work today — and grows with you tomorrow.</p>

          <div className="why-points">
            <div className="why-point" data-reveal data-delay="1">
              <h3>Free forever</h3>
              <p>No trial period that expires. If the Free plan fits your business, keep using it as long as you want.</p>
            </div>
            <div className="why-point" data-reveal data-delay="2">
              <h3>Naira pricing</h3>
              <p>Every price is in Naira. No dollar conversion, no exchange-rate surprises, no hidden international fees.</p>
            </div>
            <div className="why-point" data-reveal data-delay="2">
              <h3>Beta for the waitlist</h3>
              <p>Founding Members get Beta access free for 30 days. Higher limits while Cresoa keeps improving.</p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="faq" aria-labelledby="faq-heading">
        <div className="faq-inner">
          <div className="faq-head" data-reveal>
            <span className="eyebrow">Pricing Questions</span>
            <h2 id="faq-heading">Everything you need to know about pricing.</h2>
          </div>
          <div data-reveal data-delay="1">
            {FAQS.map((item, i) => (
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
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="cta" aria-labelledby="cta-heading">
        <div className="cta-inner" data-reveal>
          <h2 id="cta-heading">Ready to claim your 30 days of Beta?</h2>
          <p>Join {SITE_CONFIG.foundingMembers} Nigerian founders already on the waitlist. Beta access is free for 30 days at launch.</p>
          <WaitlistForm />
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
            <button onClick={scrollToForm}>Join Waitlist</button>
          </nav>
          <p style={{ opacity: 0.6, fontSize: '0.72rem', marginTop: '0.8rem' }}>© {new Date().getFullYear()} Cresoa · All rights reserved.</p>
        </div>
      </footer>
    </main>
  )
                  }
