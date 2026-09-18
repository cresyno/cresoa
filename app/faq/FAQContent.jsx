'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Logo from '../../components/Logo'
import ThemeToggle from '../../components/ThemeToggle'
import { SITE_CONFIG } from '../../lib/siteConfig'

const ICONS = {
  menu: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>,
  x: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  check: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  arrowRight: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>,
  rocket: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/></svg>,
  envelope: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
  layers: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>,
  tag: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>,
  grid: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
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

// ─── FAQ Categories ────────────────────────────────
const CATEGORIES = [
  {
    id: 'getting-started',
    label: 'Getting Started',
    icon: 'rocket',
    desc: 'The basics — what Cresoa is, who it is for, and when it launches.',
    questions: [
      { q: 'What is Cresoa?', a: 'Cresoa is a business management platform built for Nigerian SMEs. It brings customers, orders, payments, production, inventory, and customer communication into one workspace, designed for mobile.' },
      { q: 'Who is Cresoa for?', a: 'Cresoa is built for Nigerian small and medium businesses. Fashion and tailoring, repairs and technical services, and printing and signage are live today. More industries follow.' },
      { q: 'When is Cresoa launching?', a: 'Cresoa launches in 6 months. Waitlist members hear first and get Beta access free for 30 days at launch.' },
      { q: 'Do I need a laptop to use Cresoa?', a: 'No. Cresoa is designed mobile-first. You can manage customers, orders, invoices, and payments entirely from your phone.' },
      { q: 'Do I need to be tech-savvy to use Cresoa?', a: 'No. Cresoa is designed to be simple enough that you and your workers can learn it quickly. If you can use WhatsApp, you can use Cresoa.' },
    ],
  },
  {
    id: 'waitlist',
    label: 'The Waitlist',
    icon: 'envelope',
    desc: 'How the waitlist works, what Founding Members get, and what to expect.',
    questions: [
      { q: 'How does the waitlist work?', a: 'Join the waitlist with your name, email, and business type. You become a Founding Member. At launch, you hear first and get Beta access free for 30 days.' },
      { q: 'What does a Founding Member get?', a: 'Founding Members get early access at launch, Beta access free for 30 days, and email updates only when there is something worth sharing.' },
      { q: 'Will you spam my inbox?', a: 'No. We only email when there is something worth sharing. No weekly fluff, no marketing spam. You can leave the waitlist at any time.' },
      { q: 'Can I leave the waitlist?', a: 'Yes. Every email we send includes an unsubscribe link. You can leave whenever you want.' },
      { q: 'Do I need a credit card to join?', a: 'No. Joining the waitlist is free, and there is no charge until you choose a paid plan after launch.' },
    ],
  },
  {
    id: 'industries',
    label: 'Industries',
    icon: 'layers',
    desc: 'Which industries Cresoa is built for, and which ones are coming next.',
    questions: [
      { q: 'Which industries does Cresoa support today?', a: 'Fashion and tailoring, repairs and technical services, and printing and signage are live. Each has its own tailored workspace.' },
      { q: 'Which industries are coming next?', a: 'Logistics and delivery, custom manufacturing, and salons and spa are next. More industries follow after launch.' },
      { q: 'Can I use Cresoa for more than one business?', a: 'Cresoa is designed for one business per account. This keeps your customer data, orders, and records clean and separate.' },
      { q: 'What if my industry is not listed yet?', a: 'Join the waitlist and pick Other. Tell us what you do when you sign up. We are building Cresoa for more industries after launch.' },
    ],
  },
  {
    id: 'pricing',
    label: 'Pricing & Beta',
    icon: 'tag',
    desc: 'Free plan, paid plans, Beta access, and how billing works after launch.',
    questions: [
      { q: 'Is there a free plan?', a: 'Yes. Cresoa has a Free plan that includes up to 20 customers, 50 orders, and 20 inventory items. Free forever, no card required.' },
      { q: 'How much do paid plans cost?', a: 'Starter is ₦3,500/month. Pro is ₦9,500/month. Both are billed monthly after launch.' },
      { q: 'What is the Beta plan?', a: 'Beta is a temporary plan available to waitlist members for 30 days after launch. It gives access to higher limits while Cresoa is still being improved. Beta is not a permanent plan.' },
      { q: 'What happens after the 30 days of Beta?', a: 'You choose a permanent plan — Free, Starter, or Pro. There is no automatic charge.' },
      { q: 'Can I switch plans later?', a: 'Yes. You can upgrade or downgrade at any time from your dashboard.' },
    ],
  },
  {
    id: 'features',
    label: 'Features',
    icon: 'grid',
    desc: 'What Cresoa actually does — order tracking, WhatsApp, invoicing, inventory, and Tessa AI.',
    questions: [
      { q: 'Can my customers track their own orders?', a: 'Yes. Each order gets a private tracking link you can share via WhatsApp. Your customer sees the current stage without calling or messaging you.' },
      { q: 'Does Cresoa work with WhatsApp?', a: 'Yes. You can share invoices, order updates, and tracking links through WhatsApp without leaving Cresoa.' },
      { q: 'Can I create invoices for my customers?', a: 'Yes. Cresoa creates professional invoices with your business details, bank information, and a live balance. You can include your CAC and TIN numbers and share the invoice via WhatsApp or PDF.' },
      { q: 'Can I manage staff accounts?', a: 'Yes. Starter includes 2 staff accounts. Pro includes 10. Staff can be added from your dashboard and see only the work that concerns them.' },
      { q: 'What is Tessa AI?', a: 'Tessa is Cresoa\'s AI assistant. She answers questions about your business — orders, customers, revenue, outstanding payments — directly inside the app.' },
      { q: 'Can I track inventory?', a: 'Yes. Cresoa tracks fabric, accessories, parts, paper stock, and other inventory. The Free plan includes 20 items, Starter 100, and Pro is unlimited. Pro includes low-stock alerts.' },
      { q: 'Can I manage Aso-Ebi group orders?', a: 'Yes. Cresoa supports group orders with one coordinator and multiple members, all on one order with one deadline. Available on Starter, Beta, and Pro.' },
    ],
  },
]

function FAQItem({ item, isOpen, onToggle }) {
  return (
    <div className="faq-item">
      <div
        className="faq-header"
        onClick={onToggle}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle() } }}
        aria-expanded={isOpen}
      >
        <span className="faq-q">{item.q}</span>
        <span className={`arrow ${isOpen ? 'open' : ''}`}>+</span>
      </div>
      <div className={`faq-answer ${isOpen ? 'open' : ''}`}>{item.a}</div>
    </div>
  )
}

export default function FAQContent() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [openItem, setOpenItem] = useState(null) // `${catId}-${index}`

  const closeMobileMenu = () => setMobileMenuOpen(false)

  const scrollToForm = (e) => {
    if (e) e.preventDefault()
    const el = document.getElementById('faq-waitlist-form')
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY - 80
      window.scrollTo({ top, behavior: 'smooth' })
    }
    closeMobileMenu()
  }

  const scrollToCategory = (e, id) => {
    e.preventDefault()
    const el = document.getElementById(id)
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY - 140
      window.scrollTo({ top, behavior: 'smooth' })
    }
    closeMobileMenu()
  }

  const toggleItem = (key) => setOpenItem(openItem === key ? null : key)

  useEffect(() => { document.documentElement.classList.add('js-ready') }, [])

  useEffect(() => {
    const els = document.querySelectorAll('[data-reveal]')
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) entry.target.classList.add('reveal-in')
        else entry.target.classList.remove('reveal-in')
      })
    }, { threshold: 0.1, rootMargin: '0px 0px -60px 0px' })
    els.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])

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
        .hero-inner { position: relative; z-index: 1; max-width: 760px; margin: 0 auto; text-align: center; }
        .hero-eyebrow { display: inline-block; font-size: 0.72rem; font-weight: 600; letter-spacing: 0.18em; text-transform: uppercase; color: var(--gold-bright); margin-bottom: 1.8rem; }
        .hero h1 { color: #fff; font-size: 3.2rem; line-height: 1.08; margin: 0 0 1.4rem; letter-spacing: -0.035em; }
        .hero h1 em { color: var(--gold-bright); font-style: normal; }
        .hero .subhead { color: #A8B8CE; font-size: 1.1rem; line-height: 1.7; margin: 0 auto; max-width: 560px; }

        /* Category nav */
        .cat-nav { background: var(--bg); padding: 1.75rem 1.5rem 0.5rem; position: sticky; top: 60px; z-index: 100; backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); }
        [data-theme="dark"] .cat-nav { background: rgba(10,10,15,0.9); }
        .cat-nav-inner { max-width: 1180px; margin: 0 auto; display: flex; gap: 0.5rem; overflow-x: auto; scrollbar-width: none; padding-bottom: 1.5rem; border-bottom: 1px solid var(--border); }
        .cat-nav-inner::-webkit-scrollbar { display: none; }
        .cat-pill { flex-shrink: 0; padding: 0.55rem 1.1rem; border-radius: 100px; background: transparent; border: 1px solid var(--border-strong); color: var(--text-muted); font-family: inherit; font-size: 0.85rem; font-weight: 600; cursor: pointer; text-decoration: none; transition: background 0.2s, color 0.2s, border-color 0.2s; white-space: nowrap; }
        .cat-pill:hover { color: var(--text); border-color: var(--text); }
        .cat-pill.active { background: var(--bg-dark); color: #fff; border-color: var(--bg-dark); }
        [data-theme="dark"] .cat-pill.active { background: var(--gold); color: var(--bg-darkest); border-color: var(--gold); }

        /* Category section */
            .cat-section { background: var(--bg); padding: 5rem 1.5rem 3rem; }
        .cat-section.alt { background: var(--bg-alt); }
        .cat-head { max-width: 760px; margin: 0 auto 3rem; }
        .cat-head-top { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1.2rem; }
        .cat-icon { width: 40px; height: 40px; border-radius: 10px; background: rgba(201,155,43,0.10); color: var(--gold); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .cat-label { font-size: 0.72rem; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; color: var(--gold); }
        .cat-head h2 { font-size: 2.2rem; margin: 0 0 0.8rem; line-height: 1.15; letter-spacing: -0.025em; }
        .cat-head p { color: var(--text-muted); font-size: 1rem; margin: 0; line-height: 1.65; }
        .faq-list { max-width: 760px; margin: 0 auto; }

        .faq-item { border-bottom: 1px solid var(--border); }
        .faq-item:first-child { border-top: 1px solid var(--border); }
        .faq-header { padding: 1.4rem 0; font-weight: 600; color: var(--text); cursor: pointer; display: flex; justify-content: space-between; align-items: flex-start; font-size: 1rem; user-select: none; gap: 1rem; }
        .faq-q { font-family: 'Fraunces', serif; font-weight: 600; letter-spacing: -0.01em; line-height: 1.4; font-size: 1.05rem; }
        .faq-header .arrow { color: var(--text-muted); transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), color 0.25s; font-size: 1.4rem; font-weight: 300; line-height: 1; flex-shrink: 0; padding-top: 0.1rem; }
        .faq-header .arrow.open { transform: rotate(45deg); color: var(--gold); }
        .faq-answer { max-height: 0; overflow: hidden; opacity: 0; transition: max-height 0.4s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s, padding 0.3s; color: var(--text-muted); font-size: 0.95rem; line-height: 1.8; }
        .faq-answer.open { max-height: 400px; opacity: 1; padding: 0 0 1.5rem; }

        /* Still have questions */
        .still { background: var(--bg); padding: 4rem 1.5rem 6rem; text-align: center; border-top: 1px solid var(--border); }
        .still-inner { max-width: 640px; margin: 0 auto; }
        .still h2 { font-size: 1.75rem; margin: 0 0 0.9rem; line-height: 1.2; }
        .still p { color: var(--text-muted); font-size: 1rem; line-height: 1.7; margin: 0 0 2rem; }
        .still-links { display: flex; gap: 0.75rem; justify-content: center; flex-wrap: wrap; }
        .still-btn { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.85rem 1.6rem; border-radius: 10px; font-weight: 600; font-size: 0.92rem; text-decoration: none; font-family: inherit; transition: transform 0.25s, background 0.2s, box-shadow 0.25s; border: none; cursor: pointer; }
        .still-btn.primary { background: var(--bg-dark); color: #fff; }
        .still-btn.primary:hover { background: #1A3F66; transform: translateY(-1px); box-shadow: 0 10px 24px rgba(15,43,74,0.2); }
        .still-btn.ghost { background: transparent; color: var(--text); border: 1px solid var(--border-strong); }
        .still-btn.ghost:hover { background: var(--bg-alt); border-color: var(--text); }

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
          .cat-section { padding: 4rem 1.25rem 2.5rem; }
          .cat-head h2 { font-size: 1.75rem; }
          .still h2 { font-size: 1.5rem; }
          .cta { padding: 5rem 1.25rem; }
          .cta h2 { font-size: 1.75rem; }
        }
        @media (max-width: 720px) {
          .navbar .nav-links { display: none; }
          .navbar .nav-actions .login-link { display: none; }
          .hamburger { display: inline-flex; align-items: center; }
          .hero h1 { font-size: 2rem; }
          .cat-nav { top: 58px; padding: 1.25rem 1.25rem 0; }
          .cat-section { padding: 3rem 1.25rem 2rem; }
          .cat-head h2 { font-size: 1.55rem; }
          .faq-header { padding: 1.2rem 0; }
          .faq-q { font-size: 1rem; }
          .still-links { flex-direction: column; }
          .still-btn { width: 100%; justify-content: center; }
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
          <Link href="/support" className="nav-link">Support</Link>
          <Link href="/faq" className="nav-link active">FAQ</Link>
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
          <span className="current">FAQ</span>
        </div>
      </nav>

      {/* HERO */}
      <section className="hero">
        <div className="hero-inner" data-reveal>
          <span className="hero-eyebrow">Frequently Asked</span>
          <h1>Questions about Cresoa, <em>answered.</em></h1>
          <p className="subhead">Everything you want to know about the waitlist, pricing, supported industries, and how Cresoa works — before you sign up.</p>
        </div>
      </section>

      {/* CATEGORY NAV */}
      <nav className="cat-nav" aria-label="FAQ categories">
        <div className="cat-nav-inner">
          {CATEGORIES.map((cat) => (
            <a
              key={cat.id}
              href={`#${cat.id}`}
              onClick={(e) => scrollToCategory(e, cat.id)}
              className="cat-pill"
            >
              {cat.label}
            </a>
          ))}
        </div>
      </nav>

      {/* CATEGORIES */}
      {CATEGORIES.map((cat, catIndex) => (
        <section
          key={cat.id}
          id={cat.id}
          className={`cat-section ${catIndex % 2 === 1 ? 'alt' : ''}`}
          aria-labelledby={`${cat.id}-heading`}
        >
          <div className="cat-head" data-reveal>
            <div className="cat-head-top">
              <div className="cat-icon">{ICONS[cat.icon]}</div>
              <span className="cat-label">{cat.label}</span>
            </div>
            <h2 id={`${cat.id}-heading`}>{cat.label}</h2>
            <p>{cat.desc}</p>
          </div>

          <div className="faq-list" data-reveal data-delay="1">
            {cat.questions.map((item, i) => {
              const key = `${cat.id}-${i}`
              return (
                <FAQItem
                  key={key}
                  item={item}
                  isOpen={openItem === key}
                  onToggle={() => toggleItem(key)}
                />
              )
            })}
          </div>
        </section>
      ))}

      {/* STILL HAVE QUESTIONS */}
      <section className="still" aria-labelledby="still-heading">
        <div className="still-inner" data-reveal>
          <h2 id="still-heading">Still have a question?</h2>
          <p>Reach out and we will answer. Or join the waitlist to be the first to know when Cresoa launches.</p>
          <div className="still-links">
            <Link href="/support" className="still-btn primary">
              Contact Support {ICONS.arrowRight}
            </Link>
            <button onClick={scrollToForm} className="still-btn ghost">
              Join the Waitlist
            </button>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="cta" aria-labelledby="cta-heading">
        <div className="cta-inner" data-reveal>
          <h2 id="cta-heading">Ready to claim your 30 days of Beta?</h2>
          <p>Join {SITE_CONFIG.foundingMembers} Nigerian founders already on the waitlist. Beta access is free for 30 days at launch.</p>
          <div id="faq-waitlist-form">
            <WaitlistForm />
          </div>
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
