'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Logo from '../components/Logo'
import ThemeToggle from '../components/ThemeToggle'

const ICONS = {
  menu: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>,
  x: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  check: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  dash: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  arrowRight: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>,
  users: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  layers: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>,
  clock: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  pin: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>,
}

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
      if (json.ok) { setStatus('success'); form.reset() } else setStatus('error')
    } catch { setStatus('error') }
  }, [])

  if (status === 'success') {
    return (
      <div className={`wl-form wl-form--${theme}`}>
        <div className="wl-success">
          <div className="wl-success-icon">{ICONS.check}</div>
          <p className="wl-success-title">You're on the list.</p>
          <p className="wl-success-sub">Check your inbox to confirm. If it's not in Primary, check Promotions and drag it there.</p>
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
            <option value="other">Other</option>
          </select>
        </div>
        <button type="submit" className="wl-submit" disabled={status === 'sending'}>
          {status === 'sending' ? 'Joining…' : <>Join the Waitlist {ICONS.arrowRight}</>}
        </button>
      </div>
      <p className="wl-note">Founding Members get 30 days of Pro features free at launch.</p>
      {status === 'error' && <p className="wl-error">Something went wrong. Please try again.</p>}
    </form>
  )
}

const INDUSTRIES = [
  {
    id: 'fashion',
    label: 'Fashion & Tailoring',
    status: 'live',
    title: 'For tailors and fashion designers.',
    desc: 'Manage measurements, fabric choices, Aso-Ebi group orders, and production deadlines — all in one workspace.',
    image: '/mockups/fashion.webp',
    alt: 'Cresoa fashion workspace',
  },
  {
    id: 'repairs',
    label: 'Repairs & Technical',
    status: 'live',
    title: 'For phone, laptop, and electronics repair.',
    desc: 'Track devices, parts inventory, pickup dates, and payment balances without losing a single job.',
    image: '/mockups/repairs.webp',
    alt: 'Cresoa repairs workspace',
  },
  {
    id: 'printing',
    label: 'Printing & Signage',
    status: 'live',
    title: 'For print shops and signage businesses.',
    desc: 'Queue print jobs, track paper stock, and notify customers the moment their order is ready.',
    image: '/mockups/printing.webp',
    alt: 'Cresoa printing workspace',
  },
  {
    id: 'logistics',
    label: 'Logistics & Delivery',
    status: 'soon',
    title: 'For logistics and delivery businesses.',
    desc: 'Manage pickups, dispatch riders, tracking numbers, and cash-on-delivery payments — all from one dashboard.',
    image: null,
    alt: '',
  },
  {
    id: 'manufacturing',
    label: 'Custom Manufacturing',
    status: 'soon',
    title: 'For furniture, metal, and custom product makers.',
    desc: 'Track projects, materials, workshop stages, and delivery timelines without spreadsheets.',
    image: null,
    alt: '',
  },
  {
    id: 'salons',
    label: 'Salons & Spa',
    status: 'soon',
    title: 'For salons, spas, and beauty studios.',
    desc: 'Manage appointments, client preferences, product stock, and recurring bookings in one place.',
    image: null,
    alt: '',
  },
]

export default function HomepageContent() {
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [counts, setCounts] = useState({ members: 0, industries: 0, months: 0 })
  const [activeIndustry, setActiveIndustry] = useState(0)
  const [industriesPaused, setIndustriesPaused] = useState(false)
  const [openFaqIndex, setOpenFaqIndex] = useState(null)
  const statsRef = useRef(null)
  const industriesIntervalRef = useRef(null)

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

  useEffect(() => { document.documentElement.classList.add('js-ready') }, [])

  // Count-up
  useEffect(() => {
    if (!statsRef.current) return
    const observer = new IntersectionObserver((entries) => {
      if (!entries[0].isIntersecting) return
      const targets = { members: 47, industries: 6, months: 6 }
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
    }, { threshold: 0.4 })
    observer.observe(statsRef.current)
    return () => observer.disconnect()
  }, [])

  // Reveal animations — re-trigger on every scroll into view
  useEffect(() => {
    const els = document.querySelectorAll('[data-reveal]')
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) entry.target.classList.add('reveal-in')
        else entry.target.classList.remove('reveal-in')
      })
    }, { threshold: 0.15, rootMargin: '0px 0px -80px 0px' })
    els.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  // Auto-advance industries
  useEffect(() => {
    if (industriesPaused) return
    industriesIntervalRef.current = setInterval(() => {
      setActiveIndustry((prev) => (prev + 1) % INDUSTRIES.length)
    }, 5000)
    return () => clearInterval(industriesIntervalRef.current)
  }, [industriesPaused])

  const toggleFaq = (i) => setOpenFaqIndex(openFaqIndex === i ? null : i)

  const faqs = [
    { q: 'What is Cresoa?', a: 'Cresoa is a business management platform built for Nigerian SMEs. It brings customers, orders, payments, and production into one workspace.' },
    { q: 'When is Cresoa launching?', a: 'In 6 months. Waitlist members hear first and get 30 days of Pro features completely free at launch.' },
    { q: 'What happens when I join the waitlist?', a: 'You become a Founding Member. You get early access at launch, 30 days of Pro features free, and email updates only when there is something worth sharing. No spam, no weekly fluff.' },
    { q: 'How much does it cost?', a: 'Free plan forever. Starter at ₦3,500/month. Pro at ₦9,500/month. Founding Members do not pay for the first 30 days.' },
    { q: 'What industries does Cresoa support?', a: 'Fashion & Custom Wear, Repairs & Technical Services, and Printing & Signage are live. Logistics & Delivery, Custom Manufacturing, and Salons & Spa are coming next. More industries follow after launch.' },
    { q: 'Can I use Cresoa on my phone?', a: 'Yes. Cresoa is designed mobile-first — because that is where Nigerian businesses actually work.' },
  ]

  const currentIndustry = INDUSTRIES[activeIndustry]

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
          --border-dark: rgba(255,255,255,0.08);
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
          opacity: 0; transform: translateY(24px);
          transition: opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1), transform 0.8s cubic-bezier(0.16, 1, 0.3, 1);
        }
        html.js-ready [data-reveal].reveal-in { opacity: 1; transform: translateY(0); }
        html.js-ready [data-reveal][data-delay="1"] { transition-delay: 0.1s; }
        html.js-ready [data-reveal][data-delay="2"] { transition-delay: 0.2s; }
        @media (prefers-reduced-motion: reduce) {
          html.js-ready [data-reveal], html.js-ready [data-reveal].reveal-in { opacity: 1 !important; transform: none !important; transition: none !important; }
          .ind-tab, .ind-content { animation: none !important; transition: none !important; }
        }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes indFade { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }

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
        .nav-cta { background: var(--bg-dark); color: #fff; padding: 0.6rem 1.25rem; border-radius: 9px; font-size: 0.87rem; font-weight: 600; border: none; cursor: pointer; font-family: inherit; transition: transform 0.2s, background 0.2s; }
        .nav-cta:hover { background: #1A3F66; transform: translateY(-1px); }

        /* Mobile drawer */
        .mobile-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 998; opacity: 0; transition: opacity 0.3s; }
        .mobile-overlay.open { display: block; opacity: 1; }
        .mobile-drawer { position: fixed; top: 0; right: 0; bottom: 0; width: 290px; background: var(--card); padding: 1.5rem; transform: translateX(100%); transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1); z-index: 999; display: flex; flex-direction: column; gap: 0.2rem; border-left: 1px solid var(--border); overflow-y: auto; }
        .mobile-drawer.open { transform: translateX(0); }
        .mobile-drawer .close-btn { align-self: flex-end; background: none; border: none; color: var(--text); cursor: pointer; padding: 0.5rem; margin-bottom: 0.5rem; }
        .mobile-drawer .nav-link { padding: 0.9rem 1rem; font-size: 1rem; width: 100%; text-align: left; }

        /* Hero */
        .hero { background: linear-gradient(170deg, #0F2B4A 0%, #061A2E 100%); padding: 7rem 1.5rem; position: relative; overflow: hidden; }
        .hero::before { content: ''; position: absolute; top: -35%; right: -15%; width: 900px; height: 900px; background: radial-gradient(circle, rgba(201,155,43,0.14) 0%, transparent 55%); border-radius: 50%; pointer-events: none; }
        .hero-grid { position: relative; z-index: 1; max-width: 1180px; margin: 0 auto; display: grid; grid-template-columns: 1fr 1fr; gap: 5rem; align-items: center; }
        .hero-left { max-width: 560px; }
        .hero-eyebrow { display: inline-block; font-size: 0.72rem; font-weight: 600; letter-spacing: 0.18em; text-transform: uppercase; color: var(--gold-bright); margin-bottom: 1.8rem; }
        .hero h1 { color: #fff; font-size: 4rem; line-height: 1.0; margin: 0 0 1.6rem; letter-spacing: -0.04em; }
        .hero h1 em { color: var(--gold-bright); font-style: normal; }
        .hero .subhead { color: #A8B8CE; font-size: 1.1rem; line-height: 1.75; margin: 0 0 2.6rem; max-width: 520px; }
        .hero-right { display: flex; align-items: center; justify-content: flex-end; }
        .hero-mockup-wrap { position: relative; width: 100%; max-width: 420px; }
        .hero-mockup { width: 100%; border-radius: 22px; box-shadow: 0 50px 100px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06); display: block; }

        /* Trust strip */
        .trust { background: var(--bg-darkest); padding: 2.4rem 1.5rem; border-bottom: 1px solid rgba(255,255,255,0.04); }
        .trust-inner { max-width: 1180px; margin: 0 auto; display: grid; grid-template-columns: repeat(4, 1fr); gap: 1.5rem; }
        .trust-item { padding-left: 1rem; border-left: 1px solid rgba(255,255,255,0.08); }
        .trust-item .num { color: #fff; font-size: 1.7rem; font-weight: 700; font-family: 'Fraunces', serif; letter-spacing: -0.03em; display: flex; align-items: center; gap: 0.5rem; }
        .trust-item .num svg { color: var(--gold-bright); }
        .trust-item .lbl { color: #7C8CA5; font-size: 0.72rem; margin-top: 0.35rem; letter-spacing: 0.1em; text-transform: uppercase; font-weight: 500; }

        /* Statement */
        .statement { background: var(--bg); padding: 8rem 1.5rem; text-align: center; }
        .statement-inner { max-width: 800px; margin: 0 auto; }
        .statement p { font-family: 'Fraunces', serif; font-weight: 500; font-size: 2.2rem; line-height: 1.35; letter-spacing: -0.02em; color: var(--text); margin: 0; }
        .statement p em { color: var(--gold); font-style: italic; font-weight: 400; }

        /* Showcase */
        .showcase { background: var(--bg-alt); }
        .row { display: grid; grid-template-columns: 1fr 1fr; align-items: center; gap: 5rem; padding: 7rem 1.5rem; max-width: 1180px; margin: 0 auto; border-bottom: 1px solid var(--border); }
        .row:last-child { border-bottom: none; }
        .row-text { max-width: 460px; }
        .row.alt .row-text { order: 2; margin-left: auto; }
        .row.alt .row-image { order: 1; }
        .row-eyebrow { display: inline-block; font-size: 0.7rem; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; color: var(--gold); margin-bottom: 1.2rem; }
        .row-text h3 { font-size: 2.2rem; margin: 0 0 1rem; line-height: 1.15; letter-spacing: -0.025em; }
        .row-text p { color: var(--text-muted); font-size: 1.02rem; line-height: 1.75; margin: 0; }
        .row-image { display: flex; justify-content: center; }
        .row-image img { width: 100%; max-width: 460px; border-radius: 20px; box-shadow: 0 30px 70px rgba(15,43,74,0.15), 0 0 0 1px var(--border); display: block; }

        /* Secondary features */
         .secondary { background: var(--bg-alt); padding: 6rem 1.5rem; border-top: 1px solid var(--border); }
        .secondary-head { max-width: 640px; margin: 0 auto 3.5rem; text-align: center; }
        .secondary-head .eyebrow { display: inline-block; font-size: 0.7rem; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; color: var(--gold); margin-bottom: 1.1rem; }
        .secondary-head h2 { font-size: 2.2rem; margin: 0; line-height: 1.15; }
        .secondary-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; max-width: 1080px; margin: 0 auto; }
        .secondary-card { background: var(--card); border-radius: 20px; overflow: hidden; border: 1px solid var(--border); transition: border-color 0.3s, transform 0.4s cubic-bezier(0.16,1,0.3,1); }
        .secondary-card:hover { border-color: var(--border-strong); transform: translateY(-3px); }
        
      .secondary-img {
  background: #EFEAE1;
  padding: 2rem 1.5rem 0;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  overflow: hidden;
  max-height: 340px;
}
[data-theme="dark"] .secondary-img { background: #1B1B24; }
.secondary-img img {
  width: 100%;
  max-width: 220px;
  height: auto;
  display: block;
  border-radius: 14px 14px 0 0;
  box-shadow: 0 -8px 40px rgba(15,43,74,0.12);
  transition: transform 0.5s cubic-bezier(0.16,1,0.3,1);
}
.secondary-card:hover .secondary-img img { transform: translateY(-6px); }
        
        .secondary-body { padding: 1.6rem 1.7rem 1.8rem; }
        .secondary-body h3 { font-size: 1.2rem; margin: 0.5rem 0 0.6rem; line-height: 1.3; }
        .secondary-body p { color: var(--text-muted); font-size: 0.94rem; margin: 0; line-height: 1.65; }

        /* Steps */
        .steps { background: var(--bg); padding: 8rem 1.5rem; }
        .steps-head { max-width: 640px; margin: 0 auto 4rem; text-align: center; }
        .steps-head .eyebrow { display: inline-block; font-size: 0.7rem; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; color: var(--gold); margin-bottom: 1.1rem; }
        .steps-head h2 { font-size: 2.4rem; margin: 0 0 0.9rem; line-height: 1.15; }
        .steps-head p { color: var(--text-muted); font-size: 1.03rem; margin: 0; line-height: 1.65; }
        .steps-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 2rem; max-width: 1080px; margin: 0 auto; }
        .step { padding-top: 1.5rem; border-top: 2px solid var(--border); }
        .step-num { font-family: 'Fraunces', serif; font-size: 2.2rem; font-weight: 700; color: var(--gold); letter-spacing: -0.03em; line-height: 1; margin-bottom: 1rem; }
        .step h4 { font-size: 1.15rem; margin: 0 0 0.6rem; line-height: 1.3; }
        .step p { color: var(--text-muted); font-size: 0.95rem; line-height: 1.7; margin: 0; }

        /* Industries */
        .industries { background: linear-gradient(180deg, #0F2B4A 0%, #061A2E 100%); padding: 7rem 1.5rem; }
        .industries-head { max-width: 720px; margin: 0 auto 4rem; text-align: center; }
        .industries-head .eyebrow { display: inline-block; font-size: 0.7rem; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; color: var(--gold-bright); margin-bottom: 1.1rem; }
        .industries-head h2 { color: #fff; font-size: 2.6rem; margin: 0 0 1rem; line-height: 1.15; }
        .industries-head p { color: #A8B8CE; font-size: 1.02rem; margin: 0; line-height: 1.65; }

        .ind-wrap { max-width: 1080px; margin: 0 auto; border-radius: 22px; overflow: hidden; border: 1px solid var(--border-dark); background: rgba(255,255,255,0.02); backdrop-filter: blur(20px); }
        .ind-tabs { display: flex; gap: 0.5rem; padding: 1.2rem 1.4rem; border-bottom: 1px solid var(--border-dark); overflow-x: auto; scrollbar-width: none; }
        .ind-tabs::-webkit-scrollbar { display: none; }
        .ind-tab { flex-shrink: 0; padding: 0.65rem 1.15rem; border-radius: 100px; background: transparent; border: 1px solid rgba(255,255,255,0.12); color: #A8B8CE; font-family: inherit; font-size: 0.85rem; font-weight: 600; cursor: pointer; white-space: nowrap; display: inline-flex; align-items: center; gap: 0.5rem; transition: background 0.25s, color 0.25s, border-color 0.25s; }
        .ind-tab:hover { color: #fff; border-color: rgba(255,255,255,0.25); }
        .ind-tab.active { background: var(--gold-bright); color: var(--bg-darkest); border-color: var(--gold-bright); }
        .ind-tab .pill { font-size: 0.58rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; padding: 0.15rem 0.5rem; border-radius: 100px; background: rgba(255,255,255,0.12); color: inherit; }
        .ind-tab.active .pill { background: rgba(15,43,74,0.18); }
        .ind-tab.soon .pill { background: rgba(201,155,43,0.18); color: var(--gold-bright); }
        .ind-tab.active.soon .pill { background: rgba(15,43,74,0.18); color: var(--bg-darkest); }

        .ind-content { display: grid; grid-template-columns: 1fr 1fr; align-items: center; min-height: 440px; }
        .ind-text { padding: 3.5rem 2rem 3.5rem 3.5rem; animation: indFade 0.55s cubic-bezier(0.16, 1, 0.3, 1); }
        .ind-text h3 { color: #fff; font-size: 1.75rem; margin: 0 0 0.9rem; line-height: 1.2; letter-spacing: -0.02em; }
        .ind-text p { color: #A8B8CE; font-size: 1rem; line-height: 1.75; margin: 0 0 2rem; max-width: 420px; }
        .ind-image-wrap { padding: 2.5rem; display: flex; align-items: center; justify-content: center; min-height: 440px; }
        .ind-image { width: 100%; max-width: 340px; border-radius: 14px; box-shadow: 0 30px 60px rgba(0,0,0,0.4); display: block; animation: indFade 0.6s cubic-bezier(0.16, 1, 0.3, 1); }
        .ind-placeholder { width: 100%; max-width: 340px; aspect-ratio: 3 / 4; border-radius: 14px; border: 1px dashed rgba(255,255,255,0.15); background: rgba(255,255,255,0.02); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.9rem; text-align: center; padding: 2rem; animation: indFade 0.6s cubic-bezier(0.16, 1, 0.3, 1); }
        .ind-placeholder-badge { font-size: 0.62rem; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: var(--gold-bright); padding: 0.3rem 0.9rem; border-radius: 100px; border: 1px solid rgba(229,184,75,0.35); }
        .ind-placeholder-name { font-family: 'Fraunces', serif; font-size: 1.6rem; font-weight: 700; color: #fff; line-height: 1.2; letter-spacing: -0.02em; max-width: 200px; }
        .ind-placeholder-note { color: #7C8CA5; font-size: 0.82rem; margin: 0; line-height: 1.55; max-width: 220px; }

        /* Founder */
        .founder { background: var(--bg); padding: 8rem 1.5rem; }
        .founder-grid { max-width: 1080px; margin: 0 auto; display: grid; grid-template-columns: 0.85fr 1.15fr; gap: 5rem; align-items: center; }
        .founder-photo { width: 100%; border-radius: 20px; aspect-ratio: 4 / 5; object-fit: cover; box-shadow: 0 40px 80px rgba(15,43,74,0.15); }
        .founder-copy .eyebrow { display: inline-block; font-size: 0.7rem; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; color: var(--gold); margin-bottom: 1.3rem; }
        .founder-copy h2 { font-size: 2.3rem; margin: 0 0 1.4rem; line-height: 1.15; letter-spacing: -0.025em; }
        .founder-copy p { color: var(--text-muted); font-size: 1.05rem; line-height: 1.85; margin: 0 0 1.1rem; }
        .founder-sign { color: var(--text); font-weight: 700; font-size: 1.05rem; margin-top: 1.6rem; font-family: 'Fraunces', serif; }
        .founder-title { color: var(--text-muted); font-size: 0.88rem; margin-top: 0.25rem; }

        /* Pricing */
        .pricing { background: var(--bg-alt); padding: 8rem 1.5rem; }
        .pricing-head { max-width: 640px; margin: 0 auto 4rem; text-align: center; }
        .pricing-head .eyebrow { display: inline-block; font-size: 0.7rem; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; color: var(--gold); margin-bottom: 1.1rem; }
        .pricing-head h2 { font-size: 2.6rem; margin: 0 0 0.9rem; line-height: 1.15; }
        .pricing-head p { color: var(--text-muted); font-size: 1.03rem; margin: 0; line-height: 1.65; }
        .pricing-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 2rem; max-width: 1020px; margin: 0 auto; }
        .price-col { padding: 2.5rem 1.8rem 2rem; border-left: 1px solid var(--border); }
        .price-col:first-child { border-left: none; }
        .price-col.popular { background: rgba(201,155,43,0.05); border-radius: 18px; }
        .price-badge { background: var(--bg-dark); color: #fff; font-size: 0.6rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; padding: 0.28rem 0.85rem; border-radius: 20px; display: inline-block; margin-bottom: 1.2rem; }
        .plan-name { font-size: 1rem; font-weight: 600; color: var(--text); margin: 0; letter-spacing: -0.01em; }
        .price { font-size: 3rem; font-weight: 700; color: var(--text); margin: 0.6rem 0; font-family: 'Fraunces', serif; letter-spacing: -0.04em; }
        .price span { font-size: 0.9rem; font-weight: 400; color: var(--text-muted); font-family: 'Inter', sans-serif; letter-spacing: 0; }
        .description { color: var(--text-muted); font-size: 0.88rem; margin: 0 0 1.8rem; }
        .price-col ul { list-style: none; padding: 0; margin: 1.8rem 0; text-align: left; }
        .price-col ul li { padding: 0.7rem 0; font-size: 0.9rem; color: var(--text); display: flex; align-items: center; gap: 0.65rem; }
        .price-col ul li svg { flex-shrink: 0; color: var(--gold); }
        .price-col ul li.muted { color: var(--text-muted); opacity: 0.55; }
        .price-col ul li.muted svg { color: var(--text-muted); }
        .pricing-note { text-align: center; color: var(--text-muted); font-size: 0.88rem; margin-top: 3rem; line-height: 1.6; }

        .btn { display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem; padding: 0.85rem 1.7rem; border-radius: 10px; font-weight: 600; font-size: 0.92rem; text-decoration: none; border: none; cursor: pointer; font-family: inherit; transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), background 0.2s, box-shadow 0.25s; }
        .btn-navy { background: var(--bg-dark); color: #fff; }
        .btn-navy:hover { background: #1A3F66; transform: translateY(-1px); box-shadow: 0 10px 24px rgba(15,43,74,0.2); }
        .btn-gold { background: var(--gold); color: var(--bg-dark); }
        .btn-gold:hover { background: var(--gold-bright); transform: translateY(-1px); box-shadow: 0 10px 24px rgba(201,155,43,0.35); }
        .btn-ghost { background: transparent; color: var(--text); border: 1px solid var(--border); box-shadow: none; }
        .btn-ghost:hover { background: var(--card); border-color: var(--text); }

        /* FAQ */
        .faq { background: var(--bg); padding: 8rem 1.5rem; }
        .faq-inner { max-width: 760px; margin: 0 auto; }
        .faq-head { text-align: center; margin-bottom: 3.5rem; }
        .faq-head .eyebrow { display: inline-block; font-size: 0.7rem; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; color: var(--gold); margin-bottom: 1.1rem; }
        .faq-head h2 { font-size: 2.4rem; margin: 0; line-height: 1.15; }
        .faq-item { border-bottom: 1px solid var(--border); }
        .faq-item:first-of-type { border-top: 1px solid var(--border); }
        .faq-header { padding: 1.4rem 0; font-weight: 600; color: var(--text); cursor: pointer; display: flex; justify-content: space-between; align-items: center; font-size: 1.02rem; user-select: none; }
        .faq-header .arrow { color: var(--text-muted); transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1); font-size: 1.4rem; font-weight: 300; line-height: 1; }
        .faq-header .arrow.open { transform: rotate(45deg); color: var(--gold); }
        .faq-answer { max-height: 0; overflow: hidden; opacity: 0; transition: max-height 0.4s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s, padding 0.3s; color: var(--text-muted); font-size: 0.95rem; line-height: 1.8; }
        .faq-answer.open { max-height: 400px; opacity: 1; padding: 0 0 1.5rem; }

        /* Final CTA */
        .cta { background: linear-gradient(170deg, #0F2B4A 0%, #061A2E 100%); padding: 8rem 1.5rem; text-align: center; position: relative; overflow: hidden; }
        .cta::before { content: ''; position: absolute; top: -40%; left: 50%; transform: translateX(-50%); width: 800px; height: 800px; background: radial-gradient(circle, rgba(201,155,43,0.12), transparent 60%); border-radius: 50%; pointer-events: none; }
        .cta-inner { position: relative; max-width: 620px; margin: 0 auto; }
        .cta h2 { color: #fff; font-size: 2.8rem; margin: 0 0 1.1rem; line-height: 1.12; letter-spacing: -0.03em; }
        .cta p { color: #A8B8CE; font-size: 1.05rem; margin: 0 0 2.4rem; line-height: 1.65; }

        /* Waitlist form */
        .wl-form { width: 100%; max-width: 440px; margin: 0 auto; }
        .wl-fields { display: grid; gap: 0.65rem; }
        .wl-input, .wl-select { width: 100%; padding: 0.95rem 1rem; border-radius: 10px; font-family: inherit; font-size: 0.95rem; color: var(--text); background: var(--card); border: 1px solid var(--border); transition: border-color 0.2s, box-shadow 0.2s; -webkit-appearance: none; appearance: none; }
        .wl-form--dark .wl-input, .wl-form--dark .wl-select { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.14); color: #fff; }
        .wl-form--dark .wl-input::placeholder { color: rgba(168,184,206,0.6); }
        .wl-form--dark .wl-input:focus, .wl-form--dark .wl-select:focus { border-color: var(--gold-bright); background: rgba(255,255,255,0.08); box-shadow: 0 0 0 3px rgba(201,155,43,0.18); }
        .wl-input:focus, .wl-select:focus { outline: none; border-color: var(--gold); box-shadow: 0 0 0 3px rgba(201,155,43,0.15); }
        .wl-select-wrap { position: relative; }
        .wl-select-wrap::after { content: ''; position: absolute; top: 50%; right: 1rem; width: 7px; height: 7px; border-right: 2px solid currentColor; border-bottom: 2px solid currentColor; transform: translateY(-70%) rotate(45deg); pointer-events: none; opacity: 0.5; }
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
          .hero { padding: 5rem 1.25rem; }
          .hero-grid { grid-template-columns: 1fr; gap: 3.5rem; }
          .hero h1 { font-size: 2.8rem; }
          .hero-right { justify-content: center; }
          .hero-mockup-wrap { max-width: 340px; }
          .trust-inner { grid-template-columns: repeat(2, 1fr); gap: 1.5rem; }
          .statement { padding: 5.5rem 1.25rem; }
          .statement p { font-size: 1.65rem; }
          .row { grid-template-columns: 1fr; gap: 3rem; padding: 5rem 1.25rem; }
          .row.alt .row-text { order: 1; margin-left: 0; }
          .row.alt .row-image { order: 2; }
          .row-text { max-width: 100%; }
          .row-text h3 { font-size: 1.75rem; }
          .secondary { padding: 4.5rem 1.25rem; }
          .secondary-grid { grid-template-columns: 1fr; gap: 1.5rem; }
          .secondary-head h2 { font-size: 1.75rem; }
          .steps { padding: 5.5rem 1.25rem; }
          .steps-head h2 { font-size: 1.9rem; }
          .steps-grid { grid-template-columns: 1fr; gap: 2rem; }
          .industries { padding: 5.5rem 1.25rem; }
          .industries-head h2 { font-size: 2rem; }
          .ind-content { grid-template-columns: 1fr; }
          .ind-text { padding: 2rem 1.5rem 1rem; }
          .ind-image-wrap { padding: 1.5rem 1.5rem 2.5rem; min-height: auto; }
          .founder { padding: 5.5rem 1.25rem; }
          .founder-grid { grid-template-columns: 1fr; gap: 2.5rem; }
          .founder-photo { max-width: 260px; margin: 0 auto; aspect-ratio: 1 / 1; }
          .founder-copy h2 { font-size: 1.75rem; }
          .pricing { padding: 5.5rem 1.25rem; }
          .pricing-head h2 { font-size: 2rem; }
          .pricing-grid { grid-template-columns: 1fr; gap: 1.5rem; }
          .price-col { border-left: none; border-top: 1px solid var(--border); padding: 2rem 1.5rem 1.5rem; }
          .price-col:first-child { border-top: none; }
          .price-col.popular { border-radius: 16px; }
          .price { font-size: 2.4rem; }
          .faq { padding: 5.5rem 1.25rem; }
          .faq-head h2 { font-size: 2rem; }
          .cta { padding: 5.5rem 1.25rem; }
          .cta h2 { font-size: 2rem; }
        }
        @media (max-width: 720px) {
          .navbar .nav-links { display: none; }
          .navbar .nav-actions .login-link { display: none; }
          .hamburger { display: inline-flex; align-items: center; }
          .hero h1 { font-size: 2.25rem; }
          .hero .subhead { font-size: 1rem; }
          .trust-item .num { font-size: 1.35rem; }
          .statement p { font-size: 1.4rem; }
          .row-text h3 { font-size: 1.5rem; }
          .ind-text h3 { font-size: 1.4rem; }
          .industries-head h2, .pricing-head h2, .faq-head h2, .cta h2, .steps-head h2, .secondary-head h2 { font-size: 1.75rem; }
          .founder-copy h2 { font-size: 1.5rem; }
        }
        @media (max-width: 420px) {
          .hero h1 { font-size: 2rem; }
          .statement p { font-size: 1.25rem; }
        }
      `}</style>

      {/* HEADER */}
      <header className="navbar">
        <button onClick={() => navigateTo('/')} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center' }} aria-label="Cresoa home">
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
          <button className="hamburger" onClick={() => setMobileMenuOpen(true)} aria-label="Open menu">{ICONS.menu}</button>
        </div>
      </header>

      {/* MOBILE DRAWER */}
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
        <button onClick={scrollToForm} className="nav-cta" style={{ marginTop: '0.8rem', padding: '0.85rem 1rem', width: '100%' }}>Join Waitlist</button>
      </div>

      {/* HERO */}
      <section className="hero">
        <div className="hero-grid">
          <div className="hero-left">
            <span className="hero-eyebrow">Cresoa — Launching in 6 months</span>
            <h1>Run your Nigerian business <em>from one place.</em></h1>
            <p className="subhead">Track orders, collect payments, update customers on WhatsApp — without spreadsheets, notebooks, or lost DMs. Launching soon for Fashion, Repairs, and Printing businesses across Nigeria, with more industries to follow.</p>
            <div id="waitlist-form">
              <WaitlistForm theme="dark" />
            </div>
          </div>
          <div className="hero-right">
            <div className="hero-mockup-wrap">
              <img src="/mockups/dashboard.webp" alt="Cresoa dashboard" className="hero-mockup" loading="eager" />
            </div>
          </div>
        </div>
      </section>

      {/* TRUST STRIP */}
      <section className="trust" aria-label="Cresoa at a glance">
        <div className="trust-inner" ref={statsRef}>
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
            <div className="num">{ICONS.pin} 100%</div>
            <div className="lbl">Built in Nigeria</div>
          </div>
        </div>
      </section>

      {/* STATEMENT */}
      <section className="statement">
        <div className="statement-inner" data-reveal>
          <p>Running a Nigerian business shouldn't feel like <em>juggling notebooks, WhatsApp, and hope.</em></p>
        </div>
      </section>

      {/* SHOWCASE */}
      <section className="showcase" aria-labelledby="showcase-heading">
        <div className="row">
          <div className="row-text" data-reveal>
            <span className="row-eyebrow">Order Tracking</span>
            <h3 id="showcase-heading">Every order, every stage.</h3>
            <p>Placed → Cutting → Sewing → Ready → Delivered. One glance tells you where every job stands — and what's stuck.</p>
          </div>
          <div className="row-image" data-reveal data-delay="1">
            <img src="/mockups/order-detail.webp" alt="Order detail with production stages" loading="lazy" />
          </div>
        </div>

        <div className="row alt">
          <div className="row-text" data-reveal>
            <span className="row-eyebrow">Payments</span>
            <h3>Invoices that get paid.</h3>
            <p>Send branded invoices via WhatsApp with your bank details, CAC number, and a live balance. Customers pay faster when they see a real business.</p>
          </div>
          <div className="row-image" data-reveal data-delay="1">
            <img src="/mockups/invoice.webp" alt="Branded invoice with bank details" loading="lazy" />
          </div>
        </div>

        <div className="row">
          <div className="row-text" data-reveal>
            <span className="row-eyebrow">Production</span>
            <h3>See your workshop moving.</h3>
            <p>Know how many orders are cutting, sewing, and ready — in real time. No more walking around asking who is doing what.</p>
          </div>
          <div className="row-image" data-reveal data-delay="1">
            <img src="/mockups/production.webp" alt="Production pipeline" loading="lazy" />
          </div>
        </div>
      </section>

      {/* SECONDARY */}
      <section className="secondary" aria-labelledby="secondary-heading">
        <div className="secondary-head" data-reveal>
          <span className="eyebrow">And Everything Around It</span>
          <h2 id="secondary-heading">The details that make it work.</h2>
        </div>
        <div className="secondary-grid">
          <article className="secondary-card" data-reveal>
            <div className="secondary-img">
              <img src="/mockups/whatsapp.webp" alt="One-tap WhatsApp customer update" loading="lazy" />
            </div>
            <div className="secondary-body">
              <span className="row-eyebrow">Customer Comms</span>
              <h3>One-tap WhatsApp updates.</h3>
              <p>Send tracking links and receipts without leaving Cresoa. Your customers reply to the same thread — nothing gets lost.</p>
            </div>
          </article>

          <article className="secondary-card" data-reveal data-delay="1">
            <div className="secondary-img">
              <img src="/mockups/support.webp" alt="Tessa AI and human support" loading="lazy" />
            </div>
            <div className="secondary-body">
              <span className="row-eyebrow">Support</span>
              <h3>Tessa AI + real humans.</h3>
              <p>Get answers in seconds from Tessa, or talk to a person when it matters. Support that actually responds.</p>
            </div>
          </article>
        </div>
      </section>

      {/* STEPS */}
      <section className="steps" aria-labelledby="steps-heading">
        <div className="steps-head" data-reveal>
          <span className="eyebrow">How It Works</span>
          <h2 id="steps-heading">Get started in 3 simple steps</h2>
          <p>From signup to running your business in minutes.</p>
        </div>
        <div className="steps-grid">
          <div className="step" data-reveal>
            <div className="step-num">1</div>
            <h4>Join the waitlist</h4>
            <p>Join free and choose your business type — Fashion, Repairs, Printing, or Other.</p>
          </div>
          <div className="step" data-reveal data-delay="1">
            <div className="step-num">2</div>
            <h4>We build while you wait</h4>
            <p>I'm building Cresoa solo. Fashion, Repairs, and Printing are live. More industries follow.</p>
          </div>
          <div className="step" data-reveal data-delay="2">
            <div className="step-num">3</div>
            <h4>You launch with Pro — free</h4>
            <p>When Cresoa launches, you become a Founding Member with 30 days of Pro features free.</p>
          </div>
        </div>
      </section>

      {/* INDUSTRIES */}
      <section
        className="industries"
        aria-labelledby="industries-heading"
        onMouseEnter={() => setIndustriesPaused(true)}
        onMouseLeave={() => setIndustriesPaused(false)}
        onTouchStart={() => setIndustriesPaused(true)}
        onTouchEnd={() => setIndustriesPaused(false)}
      >
        <div className="industries-head" data-reveal>
          <span className="eyebrow">Built for Your Industry</span>
          <h2 id="industries-heading">Cresoa adapts to your industry — not the other way around.</h2>
          <p>Live today: Fashion, Repairs, and Printing. Coming next: Logistics, Manufacturing, and Salons & Spa.</p>
        </div>
        <div className="ind-wrap" data-reveal data-delay="1">
          <div className="ind-tabs" role="tablist">
            {INDUSTRIES.map((ind, i) => (
              <button
                key={ind.id}
                role="tab"
                aria-selected={activeIndustry === i}
                onClick={() => setActiveIndustry(i)}
                className={`ind-tab ${activeIndustry === i ? 'active' : ''} ${ind.status === 'soon' ? 'soon' : ''}`}
              >
                {ind.label}
                <span className="pill">{ind.status === 'live' ? 'Live' : 'Soon'}</span>
              </button>
            ))}
          </div>
          <div className="ind-content" key={currentIndustry.id}>
            <div className="ind-text">
              <h3>{currentIndustry.title}</h3>
              <p>{currentIndustry.desc}</p>
              <button onClick={scrollToForm} className="btn btn-gold" style={{ padding: '0.8rem 1.6rem', fontSize: '0.9rem' }}>
                Join the Waitlist {ICONS.arrowRight}
              </button>
            </div>
            <div className="ind-image-wrap">
              {currentIndustry.image ? (
                <img src={currentIndustry.image} alt={currentIndustry.alt} className="ind-image" loading="lazy" />
              ) : (
                <div className="ind-placeholder">
                  <span className="ind-placeholder-badge">Coming soon</span>
                  <span className="ind-placeholder-name">{currentIndustry.label}</span>
                  <p className="ind-placeholder-note">Join the waitlist to be the first to know when this launches.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* FOUNDER */}
      <section className="founder" aria-labelledby="founder-heading">
        <div className="founder-grid">
          <img src="/mockups/founder.webp" alt="Taiwo A. Feranmi, founder of Cresoa" className="founder-photo" loading="lazy" data-reveal />
          <div className="founder-copy" data-reveal data-delay="1">
            <span className="eyebrow">A Note from the Founder</span>
            <h2 id="founder-heading">Built solo, for Nigerian businesses.</h2>
            <p>Hi, I'm Taiwo. I'm building Cresoa solo because I watched too many great Nigerian businesses run on WhatsApp screenshots and paper notebooks — and I know we deserve better software.</p>
            <p>I've been building in the open for 3 months. Fashion, Repairs, and Printing modules are live. More industries follow. But I'm not launching until the product is right.</p>
            <p>Join the waitlist. Follow the journey. Get 30 days of Pro features free when we launch.</p>
            <div className="founder-sign">— Taiwo A. Feranmi</div>
            <div className="founder-title">Founder, Cresoa</div>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="pricing" id="pricing" aria-labelledby="pricing-heading">
        <div className="pricing-head" data-reveal>
          <span className="eyebrow">Pricing</span>
          <h2 id="pricing-heading">Simple, transparent pricing.</h2>
          <p>Coming at launch. Reserved for waitlist members first.</p>
        </div>
        <div className="pricing-grid">
          <div className="price-col" data-reveal>
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
          <div className="price-col popular" data-reveal data-delay="1">
            <div className="price-badge">Most Popular</div>
            <p className="plan-name">Starter</p>
            <div className="price">₦3,500 <span>/mo</span></div>
            <p className="description">For growing businesses</p>
            <ul>
              <li>{ICONS.check} Unlimited customers</li>
              <li>{ICONS.check} Unlimited orders</li>
              <li>{ICONS.check} 2 staff accounts</li>
              <li>{ICONS.check} WhatsApp integration</li>
              <li>{ICONS.check} Customer tracking links</li>
            </ul>
            <button onClick={scrollToForm} className="btn btn-navy" style={{ width: '100%' }}>Reserve Starter Access</button>
          </div>
          <div className="price-col" data-reveal data-delay="2">
            <p className="plan-name">Pro</p>
            <div className="price">₦9,500 <span>/mo</span></div>
            <p className="description">For established businesses</p>
            <ul>
              <li>{ICONS.check} Everything in Starter</li>
              <li>{ICONS.check} 10 staff accounts</li>
              <li>{ICONS.check} Advanced analytics</li>
              <li>{ICONS.check} Data export (Excel/PDF)</li>
              <li>{ICONS.check} Priority support</li>
            </ul>
            <button onClick={scrollToForm} className="btn btn-navy" style={{ width: '100%' }}>Reserve Pro Access</button>
          </div>
        </div>
        <p className="pricing-note" data-reveal>
          Founding Members get 30 days of Pro features completely free at launch. No credit card needed.
        </p>
      </section>

      {/* FAQ */}
      <section className="faq" id="faq" aria-labelledby="faq-heading">
        <div className="faq-inner">
          <div className="faq-head" data-reveal>
            <span className="eyebrow">Questions</span>
            <h2 id="faq-heading">Frequently asked questions</h2>
          </div>
          <div data-reveal data-delay="1">
            {faqs.map((item, i) => (
              <div key={i} className="faq-item">
                <div className="faq-header" onClick={() => toggleFaq(i)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') toggleFaq(i) }} aria-expanded={openFaqIndex === i}>
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
        <div className="cta-inner">
          <h2 id="cta-heading">Ready to bring order to your business?</h2>
          <p>Join 47 Nigerian founders already on the waitlist.</p>
          <WaitlistForm theme="dark" />
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
            <button onClick={(e) => scrollToSection(e, 'faq')}>FAQ</button>
            <button onClick={scrollToForm}>Join Waitlist</button>
          </nav>
          <p style={{ opacity: 0.6, fontSize: '0.72rem', marginTop: '0.8rem' }}>© {new Date().getFullYear()} Cresoa · All rights reserved.</p>
        </div>
      </footer>
    </main>
  )
            }
