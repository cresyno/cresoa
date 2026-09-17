'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Script from 'next/script'
import Logo from '../../components/Logo'
import ThemeToggle from '../../components/ThemeToggle'

const ICONS = {
  menu: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>,
  x: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  check: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  arrowRight: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>,
  user: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  clipboard: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/></svg>,
  invoice: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
  fabric: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.38 3.46L16 2l-4 4-4-4-4.38 1.46a2 2 0 0 0-1.28 2.25L3.6 9.6a2 2 0 0 0 1.46 1.34l2.34.52V20a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-8.54l2.34-.52a2 2 0 0 0 1.46-1.34l1.26-3.89a2 2 0 0 0-1.28-2.25z"/></svg>,
  group: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  scissors: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/><line x1="8.12" y1="8.12" x2="12" y2="12"/></svg>,
  palette: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="13.5" cy="6.5" r=".5"/><circle cx="17.5" cy="10.5" r=".5"/><circle cx="8.5" cy="7.5" r=".5"/><circle cx="6.5" cy="12.5" r=".5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg>,
  users: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  store: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l1.5-6h15L21 9"/><path d="M3 9v11a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9"/><path d="M3 9h18"/><path d="M9 22V12h6v10"/></svg>,
  tool: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>,
  printer: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>,
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
          <p className="wl-success-title">You're on the list.</p>
          <p className="wl-success-sub">Check your inbox to confirm. If it's not in Primary, check Promotions and drag it there.</p>
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
          <select name="tags[]" required aria-label="Business type" className="wl-select" defaultValue="23510464">
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

const FAQS = [
  { q: 'Can I track Aso-Ebi group orders in Cresoa?', a: 'Yes. Create a group, add the coordinator, and keep every member and their individual order organised in one place. Perfect for bulk clothing orders.' },
  { q: 'Can I store customer measurements?', a: 'Yes. Every customer profile has space for waist, bust, shoulder, arm length, and any custom measurements you need. Reuse them for every future order — no more searching through WhatsApp.' },
  { q: 'Can my customers track their own order status?', a: 'Yes. Each order gets a private tracking link you can share via WhatsApp. Your customer sees the current stage without calling or messaging you.' },
  { q: 'Do I need a laptop, or can I use my phone?', a: 'Your phone is enough. Cresoa is built mobile-first — because that is where Nigerian fashion businesses actually work.' },
  { q: 'Can I send invoices via WhatsApp?', a: 'Yes. Create a professional invoice with your logo, bank details, and payment breakdown. Share it directly through WhatsApp in one tap.' },
  { q: 'When does Cresoa launch for fashion businesses?', a: 'In 6 months. Join the waitlist to become a Founding Member and get 30 days of Pro features free at launch.' },
]

export default function FashionContent() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [openFaqIndex, setOpenFaqIndex] = useState(null)

  const closeMobileMenu = () => setMobileMenuOpen(false)

  const scrollToSection = (e, id) => {
    e.preventDefault()
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    closeMobileMenu()
  }

  const scrollToForm = (e) => {
    if (e) e.preventDefault()
    const el = document.getElementById('fashion-waitlist-form')
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
    }, { threshold: 0.15, rootMargin: '0px 0px -80px 0px' })
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
        .hero { background: linear-gradient(170deg, #0F2B4A 0%, #061A2E 100%); padding: 5rem 1.5rem 6rem; position: relative; overflow: hidden; }
        .hero::before { content: ''; position: absolute; top: -35%; right: -15%; width: 900px; height: 900px; background: radial-gradient(circle, rgba(201,155,43,0.14) 0%, transparent 55%); border-radius: 50%; pointer-events: none; }
        .hero-grid { position: relative; z-index: 1; max-width: 1180px; margin: 0 auto; display: grid; grid-template-columns: 1fr 1fr; gap: 5rem; align-items: center; }
        .hero-left { max-width: 560px; }
        .hero-eyebrow { display: inline-block; font-size: 0.72rem; font-weight: 600; letter-spacing: 0.18em; text-transform: uppercase; color: var(--gold-bright); margin-bottom: 1.8rem; }
        .hero h1 { color: #fff; font-size: 3.4rem; line-height: 1.05; margin: 0 0 1.4rem; letter-spacing: -0.035em; }
        .hero h1 em { color: var(--gold-bright); font-style: normal; }
        .hero .subhead { color: #A8B8CE; font-size: 1.08rem; line-height: 1.75; margin: 0 0 2.4rem; max-width: 520px; }
        .hero-right { display: flex; align-items: center; justify-content: flex-end; }
        .hero-mockup-wrap { position: relative; width: 100%; max-width: 420px; }
        .hero-mockup { width: 100%; border-radius: 22px; box-shadow: 0 50px 100px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06); display: block; }

        /* Trust strip */
        .trust { background: var(--bg-darkest); padding: 2.4rem 1.5rem; border-bottom: 1px solid rgba(255,255,255,0.04); }
        .trust-inner { max-width: 1180px; margin: 0 auto; display: grid; grid-template-columns: repeat(4, 1fr); gap: 1.5rem; }
        .trust-item { padding-left: 1rem; border-left: 1px solid rgba(255,255,255,0.08); }
        .trust-item .big { color: #fff; font-size: 1rem; font-weight: 600; display: flex; align-items: center; gap: 0.5rem; font-family: 'Fraunces', serif; letter-spacing: -0.01em; }
        .trust-item .big svg { color: var(--gold-bright); }
        .trust-item .lbl { color: #7C8CA5; font-size: 0.72rem; margin-top: 0.35rem; letter-spacing: 0.08em; text-transform: uppercase; font-weight: 500; }

        /* Statement */
        .statement { background: var(--bg); padding: 7rem 1.5rem; text-align: center; }
        .statement-inner { max-width: 900px; margin: 0 auto; }
        .statement h2 { font-size: 2.4rem; line-height: 1.25; letter-spacing: -0.025em; color: var(--text); margin: 0 0 1.5rem; }
        .statement p { color: var(--text-muted); font-size: 1.1rem; line-height: 1.8; margin: 0 auto 1rem; max-width: 760px; }
        .statement p:last-child { margin-bottom: 0; }
        .statement a { color: var(--gold); font-weight: 600; text-decoration: underline; }

        /* Showcase rows */
        .showcase { background: var(--bg-alt); }
        .row { display: grid; grid-template-columns: 1fr 1fr; align-items: center; gap: 5rem; padding: 6rem 1.5rem; max-width: 1180px; margin: 0 auto; border-bottom: 1px solid var(--border); }
        .row:last-child { border-bottom: none; }
        .row-text { max-width: 460px; }
        .row.alt .row-text { order: 2; margin-left: auto; }
        .row.alt .row-image { order: 1; }
        .row-eyebrow { display: inline-block; font-size: 0.7rem; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; color: var(--gold); margin-bottom: 1.2rem; }
        .row-text h3 { font-size: 1.9rem; margin: 0 0 1rem; line-height: 1.2; letter-spacing: -0.025em; }
        .row-text p { color: var(--text-muted); font-size: 1rem; line-height: 1.75; margin: 0; }
        .row-image { display: flex; justify-content: center; }
        .row-image img { width: 100%; max-width: 440px; border-radius: 20px; box-shadow: 0 30px 70px rgba(15,43,74,0.15), 0 0 0 1px var(--border); display: block; }

        /* Secondary */
        .secondary { background: var(--bg-alt); padding: 5rem 1.5rem 7rem; border-top: 1px solid var(--border); }
        .secondary-head { max-width: 640px; margin: 0 auto 3.5rem; text-align: center; }
        .secondary-head .eyebrow { display: inline-block; font-size: 0.7rem; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; color: var(--gold); margin-bottom: 1.1rem; }
        .secondary-head h2 { font-size: 2rem; margin: 0; line-height: 1.2; }
        .secondary-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; max-width: 1080px; margin: 0 auto; }
        .secondary-card { background: var(--card); border-radius: 20px; overflow: hidden; border: 1px solid var(--border); transition: border-color 0.3s, transform 0.4s cubic-bezier(0.16,1,0.3,1); }
        .secondary-card:hover { border-color: var(--border-strong); transform: translateY(-3px); }
        .secondary-img { background: #EFEAE1; padding: 2rem 1.5rem 0; display: flex; align-items: flex-end; justify-content: center; overflow: hidden; max-height: 340px; }
        [data-theme="dark"] .secondary-img { background: #1B1B24; }
        .secondary-img img { width: 100%; max-width: 220px; height: auto; display: block; border-radius: 14px 14px 0 0; box-shadow: 0 -8px 40px rgba(15,43,74,0.12); transition: transform 0.5s cubic-bezier(0.16,1,0.3,1); }
        .secondary-card:hover .secondary-img img { transform: translateY(-6px); }
        .secondary-body { padding: 1.6rem 1.7rem 1.8rem; }
           .secondary-body h3 { font-size: 1.2rem; margin: 0.5rem 0 0.6rem; line-height: 1.3; }
        .secondary-body p { color: var(--text-muted); font-size: 0.94rem; margin: 0; line-height: 1.65; }

        /* Audience */
        .audience { background: var(--bg); padding: 7rem 1.5rem; }
        .audience-head { max-width: 780px; margin: 0 auto 3.5rem; text-align: center; }
        .audience-head .eyebrow { display: inline-block; font-size: 0.7rem; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; color: var(--gold); margin-bottom: 1.1rem; }
        .audience-head h2 { font-size: 2.3rem; margin: 0 0 1.2rem; line-height: 1.2; }
        .audience-head p { color: var(--text-muted); font-size: 1.02rem; line-height: 1.75; margin: 0 auto; max-width: 720px; }
        .audience-head a { color: var(--gold); font-weight: 600; text-decoration: underline; }
        .audience-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1.5rem; max-width: 1080px; margin: 0 auto; }
        .audience-card { background: var(--card); border: 1px solid var(--border); border-radius: 16px; padding: 1.8rem 1.5rem; transition: border-color 0.3s, transform 0.3s; }
        .audience-card:hover { border-color: var(--gold); transform: translateY(-3px); }
        .audience-icon { width: 44px; height: 44px; border-radius: 12px; background: rgba(201,155,43,0.1); color: var(--gold); display: flex; align-items: center; justify-content: center; margin-bottom: 1.2rem; }
        .audience-card h4 { font-size: 1.05rem; margin: 0 0 0.5rem; line-height: 1.3; }
        .audience-card p { color: var(--text-muted); font-size: 0.9rem; line-height: 1.6; margin: 0; }

        /* Mobile-first section */
        .mobile-section { background: linear-gradient(170deg, #0F2B4A 0%, #061A2E 100%); padding: 7rem 1.5rem; position: relative; overflow: hidden; }
        .mobile-section::before { content: ''; position: absolute; top: -30%; right: -20%; width: 700px; height: 700px; background: radial-gradient(circle, rgba(201,155,43,0.10) 0%, transparent 60%); border-radius: 50%; pointer-events: none; }
        .mobile-grid { position: relative; z-index: 1; max-width: 1080px; margin: 0 auto; display: grid; grid-template-columns: 1.1fr 0.9fr; gap: 5rem; align-items: center; }
        .mobile-text .eyebrow { display: inline-block; font-size: 0.7rem; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; color: var(--gold-bright); margin-bottom: 1.2rem; }
        .mobile-text h2 { color: #fff; font-size: 2.4rem; margin: 0 0 1.4rem; line-height: 1.18; letter-spacing: -0.025em; }
        .mobile-text p { color: #A8B8CE; font-size: 1.05rem; line-height: 1.75; margin: 0 0 1.1rem; max-width: 520px; }
        .mobile-text a { color: var(--gold-bright); font-weight: 600; text-decoration: underline; }
        .mobile-image-wrap { display: flex; justify-content: center; }
        .mobile-image { width: 100%; max-width: 300px; border-radius: 26px; box-shadow: 0 40px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06); display: block; }

        /* FAQ */
        .faq { background: var(--bg); padding: 7rem 1.5rem; }
        .faq-inner { max-width: 760px; margin: 0 auto; }
        .faq-head { text-align: center; margin-bottom: 3.5rem; }
        .faq-head .eyebrow { display: inline-block; font-size: 0.7rem; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; color: var(--gold); margin-bottom: 1.1rem; }
        .faq-head h2 { font-size: 2.2rem; margin: 0; line-height: 1.2; }
        .faq-item { border-bottom: 1px solid var(--border); }
        .faq-item:first-of-type { border-top: 1px solid var(--border); }
        .faq-header { padding: 1.4rem 0; font-weight: 600; color: var(--text); cursor: pointer; display: flex; justify-content: space-between; align-items: center; font-size: 1rem; user-select: none; gap: 1rem; }
        .faq-header .arrow { color: var(--text-muted); transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1); font-size: 1.4rem; font-weight: 300; line-height: 1; flex-shrink: 0; }
        .faq-header .arrow.open { transform: rotate(45deg); color: var(--gold); }
        .faq-answer { max-height: 0; overflow: hidden; opacity: 0; transition: max-height 0.4s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s, padding 0.3s; color: var(--text-muted); font-size: 0.94rem; line-height: 1.8; }
        .faq-answer.open { max-height: 400px; opacity: 1; padding: 0 0 1.5rem; }

        /* Cross-sell */
        .cross-sell { background: var(--bg-alt); padding: 6rem 1.5rem; border-top: 1px solid var(--border); }
        .cross-head { max-width: 640px; margin: 0 auto 3rem; text-align: center; }
        .cross-head .eyebrow { display: inline-block; font-size: 0.7rem; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; color: var(--gold); margin-bottom: 1.1rem; }
        .cross-head h2 { font-size: 2rem; margin: 0 0 0.9rem; line-height: 1.2; }
        .cross-head p { color: var(--text-muted); font-size: 1rem; margin: 0; line-height: 1.65; }
        .cross-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; max-width: 900px; margin: 0 auto; }
        .cross-card { display: block; text-decoration: none; background: var(--card); border: 1px solid var(--border); border-radius: 16px; padding: 1.8rem 1.6rem; transition: border-color 0.3s, transform 0.3s, box-shadow 0.3s; }
        .cross-card:hover { border-color: var(--gold); transform: translateY(-3px); box-shadow: 0 20px 40px rgba(15,43,74,0.08); }
        .cross-icon { width: 44px; height: 44px; border-radius: 12px; background: rgba(201,155,43,0.1); color: var(--gold); display: flex; align-items: center; justify-content: center; margin-bottom: 1.2rem; }
        .cross-card h3 { font-size: 1.15rem; margin: 0 0 0.5rem; color: var(--text); line-height: 1.3; }
        .cross-card p { color: var(--text-muted); font-size: 0.92rem; line-height: 1.6; margin: 0 0 1rem; }
        .cross-arrow { display: inline-flex; align-items: center; gap: 0.5rem; color: var(--gold); font-weight: 600; font-size: 0.9rem; }
        .cross-note { text-align: center; color: var(--text-muted); font-size: 0.88rem; margin-top: 2.5rem; line-height: 1.6; }
        .cross-note strong { color: var(--text); font-weight: 600; }

        /* Final CTA */
        .cta { background: linear-gradient(170deg, #0F2B4A 0%, #061A2E 100%); padding: 7rem 1.5rem; text-align: center; position: relative; overflow: hidden; }
        .cta::before { content: ''; position: absolute; top: -40%; left: 50%; transform: translateX(-50%); width: 800px; height: 800px; background: radial-gradient(circle, rgba(201,155,43,0.12), transparent 60%); border-radius: 50%; pointer-events: none; }
        .cta-inner { position: relative; max-width: 660px; margin: 0 auto; }
        .cta h2 { color: #fff; font-size: 2.4rem; margin: 0 0 1.2rem; line-height: 1.15; letter-spacing: -0.025em; }
        .cta p { color: #A8B8CE; font-size: 1.05rem; margin: 0 0 2.4rem; line-height: 1.7; }
        .cta p a { color: var(--gold-bright); font-weight: 600; text-decoration: underline; }

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
          .hero { padding: 4rem 1.25rem; }
          .hero-grid { grid-template-columns: 1fr; gap: 3rem; }
          .hero h1 { font-size: 2.6rem; }
          .hero-right { justify-content: center; }
          .hero-mockup-wrap { max-width: 340px; }
          .trust-inner { grid-template-columns: repeat(2, 1fr); gap: 1.5rem; }
          .statement { padding: 5rem 1.25rem; }
          .statement h2 { font-size: 1.85rem; }
          .row { grid-template-columns: 1fr; gap: 3rem; padding: 5rem 1.25rem; }
          .row.alt .row-text { order: 1; margin-left: 0; }
          .row.alt .row-image { order: 2; }
          .row-text { max-width: 100%; }
          .row-text h3 { font-size: 1.65rem; }
          .secondary { padding: 4rem 1.25rem 5rem; }
          .secondary-grid { grid-template-columns: 1fr; gap: 1.5rem; }
          .secondary-head h2 { font-size: 1.7rem; }
          .audience { padding: 5rem 1.25rem; }
          .audience-head h2 { font-size: 1.85rem; }
          .audience-grid { grid-template-columns: repeat(2, 1fr); gap: 1.2rem; }
          .mobile-section { padding: 5rem 1.25rem; }
          .mobile-grid { grid-template-columns: 1fr; gap: 3rem; }
          .mobile-text h2 { font-size: 1.85rem; }
          .mobile-image-wrap { justify-content: center; }
          .faq { padding: 5rem 1.25rem; }
          .faq-head h2 { font-size: 1.85rem; }
          .cross-sell { padding: 5rem 1.25rem; }
          .cross-head h2 { font-size: 1.7rem; }
          .cross-grid { grid-template-columns: 1fr; }
          .cta { padding: 5rem 1.25rem; }
          .cta h2 { font-size: 1.85rem; }
        }
        @media (max-width: 720px) {
          .navbar .nav-links { display: none; }
          .navbar .nav-actions .login-link { display: none; }
          .hamburger { display: inline-flex; align-items: center; }
          .hero h1 { font-size: 2.1rem; }
          .hero .subhead { font-size: 1rem; }
          .statement h2 { font-size: 1.5rem; }
          .statement p { font-size: 1rem; }
          .row-text h3 { font-size: 1.4rem; }
          .audience-head h2 { font-size: 1.55rem; }
          .audience-grid { grid-template-columns: 1fr; }
          .mobile-text h2 { font-size: 1.55rem; }
        }
        @media (max-width: 420px) {
          .hero h1 { font-size: 1.9rem; }
          .statement h2 { font-size: 1.35rem; }
        }
      `}</style>

      {/* HEADER */}
      <header className="navbar">
        <Link href="/" style={{ display: 'flex', alignItems: 'center' }} aria-label="Cresoa home">
          <Logo variant="primary" size="large" />
        </Link>
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

      {/* BREADCRUMB */}
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <div className="breadcrumb-inner">
          <Link href="/">Home</Link>
          <span className="sep">/</span>
          <span className="current">Fashion</span>
        </div>
      </nav>

      {/* HERO */}
      <section className="hero">
        <div className="hero-grid">
          <div className="hero-left">
            <span className="hero-eyebrow">Cresoa for Fashion</span>
            <h1>Run Your Fashion Business <em>Without the Stress.</em></h1>
            <p className="subhead">Orders, customers, measurements, production, invoices, and inventory — all organised in one place.</p>
            <div id="fashion-waitlist-form">
              <WaitlistForm />
            </div>
          </div>
          <div className="hero-right">
            <div className="hero-mockup-wrap">
              <img src="/mockups/fashion-hero.webp" alt="Cresoa fashion dashboard" className="hero-mockup" loading="eager" />
            </div>
          </div>
        </div>
      </section>

      {/* TRUST STRIP */}
      <section className="trust" aria-label="Cresoa for fashion at a glance">
        <div className="trust-inner">
          <div className="trust-item">
            <div className="big">{ICONS.scissors} Built for tailors</div>
            <div className="lbl">Nigerian fashion businesses</div>
          </div>
          <div className="trust-item">
            <div className="big">{ICONS.user} Works on any phone</div>
            <div className="lbl">Mobile-first design</div>
          </div>
          <div className="trust-item">
            <div className="big">{ICONS.check} WhatsApp ready</div>
            <div className="lbl">Send updates & invoices</div>
          </div>
          <div className="trust-item">
            <div className="big">{ICONS.check} Free to join</div>
            <div className="lbl">Founding Member access</div>
          </div>
        </div>
      </section>

      {/* PROBLEM STATEMENT */}
      <section className="statement">
        <div className="statement-inner">
          <h2 data-reveal>Your Business Has Grown. Your Notebook Shouldn&apos;t Be Running It.</h2>
          <p data-reveal data-delay="1">You started with a few customers and a notebook. Then the orders increased. Now you&apos;re searching through WhatsApp for measurements, checking different notebooks for payments, trying to remember which outfit is ready, and wondering what happened to that fabric you bought last week.</p>
          <p data-reveal data-delay="2"><Link href="/">Cresoa</Link> brings everything together.</p>
        </div>
      </section>

      {/* SHOWCASE ROW 1 — MEASUREMENTS */}
      <section className="showcase" aria-labelledby="measurements-heading">
        <div className="row">
          <div className="row-text" data-reveal>
            <span className="row-eyebrow">Customer Profiles</span>
            <h3 id="measurements-heading">Customer Profiles &amp; Measurements</h3>
            <p>Keep your customers&apos; information and measurements organised in one place. No more searching through old chats to find a customer&apos;s waist, bust, shoulder or other measurements.</p>
          </div>
          <div className="row-image" data-reveal data-delay="1">
            <img src="/mockups/fashion-measurements.webp" alt="Customer profile with measurements in Cresoa" loading="lazy" />
          </div>
        </div>
      </section>

      {/* SHOWCASE ROW 2 — ORDER TRACKING */}
      <section className="showcase" aria-labelledby="tracking-heading" style={{ paddingTop: 0 }}>
        <div className="row alt">
          <div className="row-text" data-reveal>
            <span className="row-eyebrow">Order Tracking</span>
            <h3 id="tracking-heading">Order &amp; Production Tracking</h3>
            <p>Know exactly where every order stands. Move orders through your production stages and quickly see what has been ordered, what is being worked on, what is ready for pickup, and what has been delivered.</p>
          </div>
          <div className="row-image" data-reveal data-delay="1">
            <img src="/mockups/fashion-order-tracking.webp" alt="Order and production tracking in Cresoa" loading="lazy" />
          </div>
        </div>
      </section>

      
      {/* SHOWCASE ROW 3 — GROUP ORDERS */}
      <section className="showcase" aria-labelledby="group-heading" style={{ paddingTop: 0 }}>
        <div className="row">
          <div className="row-text" data-reveal>
            <span className="row-eyebrow">Group Orders</span>
            <h3 id="group-heading">Group Orders</h3>
            <p>Handling Aso-Ebi or other bulk clothing orders? Create a group, add the coordinator and keep individual members and their orders organised in one place.</p>
          </div>
          <div className="row-image" data-reveal data-delay="1">
            <img src="/mockups/fashion-group-order.webp" alt="Aso-Ebi group order management in Cresoa" loading="lazy" />
          </div>
        </div>
      </section>

      {/* SECONDARY — INVOICES + INVENTORY */}
      <section className="secondary" aria-labelledby="secondary-heading">
        <div className="secondary-head" data-reveal>
          <span className="eyebrow">And Everything Around It</span>
          <h2 id="secondary-heading">Everything You Need to Run Your Fashion Business</h2>
        </div>
        <div className="secondary-grid">
          <article className="secondary-card" data-reveal>
            <div className="secondary-img">
              <img src="/mockups/fashion-invoice.webp" alt="Professional fashion invoice in Cresoa" loading="lazy" />
            </div>
            <div className="secondary-body">
              <span className="row-eyebrow">Invoices</span>
              <h3>Professional Invoices</h3>
              <p>Create professional invoices in minutes. Add multiple items, quantities, prices, customer information and payment details. Your invoice can include your business logo and details, then be shared with your customer through WhatsApp.</p>
            </div>
          </article>

          <article className="secondary-card" data-reveal data-delay="1">
            <div className="secondary-img">
              <img src="/mockups/fashion-inventory.webp" alt="Fabric and accessory inventory in Cresoa" loading="lazy" />
            </div>
            <div className="secondary-body">
              <span className="row-eyebrow">Inventory</span>
              <h3>Inventory Management</h3>
              <p>Keep track of the materials your business depends on. Manage fabrics, accessories and other inventory, monitor quantities and know when stock is getting low.</p>
            </div>
          </article>
        </div>
      </section>

      {/* WHO IT'S FOR */}
      <section className="audience" aria-labelledby="audience-heading">
        <div className="audience-head" data-reveal>
          <span className="eyebrow">Who It&apos;s For</span>
          <h2 id="audience-heading">Made for the Way Fashion Businesses Actually Work</h2>
          <p>Whether you&apos;re working from your home, a small shop or a growing fashion studio, <Link href="/">Cresoa</Link> helps you bring structure to the everyday work behind your creativity.</p>
        </div>
        <div className="audience-grid">
          <div className="audience-card" data-reveal>
            <div className="audience-icon">{ICONS.scissors}</div>
            <h4>Tailors</h4>
            <p>Keep customers, measurements and orders organised.</p>
          </div>
          <div className="audience-card" data-reveal data-delay="1">
            <div className="audience-icon">{ICONS.palette}</div>
            <h4>Fashion Designers</h4>
            <p>Manage your growing list of clients and production work.</p>
          </div>
          <div className="audience-card" data-reveal data-delay="2">
            <div className="audience-icon">{ICONS.users}</div>
            <h4>Aso-Ebi Coordinators</h4>
            <p>Keep large group orders from becoming confusing.</p>
          </div>
          <div className="audience-card" data-reveal data-delay="2">
            <div className="audience-icon">{ICONS.store}</div>
            <h4>Boutiques &amp; Custom Wear Businesses</h4>
            <p>Manage customers, orders and inventory from one place.</p>
          </div>
        </div>
      </section>

      {/* MOBILE-FIRST */}
      <section className="mobile-section" aria-labelledby="mobile-heading">
        <div className="mobile-grid">
          <div className="mobile-text" data-reveal>
            <span className="eyebrow">Mobile-First</span>
            <h2 id="mobile-heading">Your Phone. Your Business. One Place.</h2>
            <p>You don&apos;t need to sit behind a computer to manage your business. <Link href="/">Cresoa</Link> is built mobile-first, so you can check an order, look up a customer&apos;s measurements, create an invoice or manage your business while you&apos;re on the move.</p>
          </div>
          <div className="mobile-image-wrap" data-reveal data-delay="1">
            <img src="/mockups/fashion-mobile.webp" alt="Cresoa on a phone" className="mobile-image" loading="lazy" />
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="faq" id="faq" aria-labelledby="faq-heading">
        <div className="faq-inner">
          <div className="faq-head" data-reveal>
            <span className="eyebrow">Questions</span>
            <h2 id="faq-heading">Frequently asked questions</h2>
          </div>
          <div data-reveal data-delay="1">
            {FAQS.map((item, i) => (
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

      {/* CROSS-SELL */}
      <section className="cross-sell" aria-labelledby="cross-heading">
        <div className="cross-head" data-reveal>
          <span className="eyebrow">Also on Cresoa</span>
          <h2 id="cross-heading">Cresoa is also built for:</h2>
          <p>Different industries, one workspace.</p>
        </div>
        <div className="cross-grid">
          <Link href="/repairs" className="cross-card" data-reveal>
            <div className="cross-icon">{ICONS.tool}</div>
            <h3>Repairs &amp; Technical Services</h3>
            <p>Track devices, parts inventory, pickup dates, and payment balances without losing a single job.</p>
            <span className="cross-arrow">Explore repairs {ICONS.arrowRight}</span>
          </Link>
          <Link href="/printing" className="cross-card" data-reveal data-delay="1">
            <div className="cross-icon">{ICONS.printer}</div>
            <h3>Printing &amp; Signage</h3>
            <p>Queue print jobs, track paper stock, and notify customers the moment their order is ready.</p>
            <span className="cross-arrow">Explore printing {ICONS.arrowRight}</span>
          </Link>
        </div>
        <p className="cross-note" data-reveal>
          <strong>Coming next:</strong> Logistics &amp; Delivery, Custom Manufacturing, Salons &amp; Spa.
        </p>
      </section>

      {/* FINAL CTA */}
      <section className="cta" aria-labelledby="cta-heading">
        <div className="cta-inner" data-reveal>
          <h2 id="cta-heading">Ready to Put Your Fashion Business in Order?</h2>
          <p>Stop relying on scattered notebooks, chats and memory. Bring your customers, orders, production, inventory and invoices together with <Link href="/">Cresoa</Link>.</p>
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
            <button onClick={(e) => scrollToSection(e, 'faq')}>FAQ</button>
            <button onClick={scrollToForm}>Join Waitlist</button>
          </nav>
          <p style={{ opacity: 0.6, fontSize: '0.72rem', marginTop: '0.8rem' }}>© {new Date().getFullYear()} Cresoa · All rights reserved.</p>
        </div>
      </footer>
    </main>
  )
      }
