'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Logo from '../../components/Logo'
import ThemeToggle from '../../components/ThemeToggle'
import WaitlistForm from '../../components/WaitlistForm'

const ICONS = {
  menu: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>,
  x: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  check: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  arrowRight: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>,
  printer: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>,
  user: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  users: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  box: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>,
  invoice: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
  cash: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>,
  track: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  sparkles: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.9 5.8a2 2 0 0 0 1.3 1.3L21 12l-5.8 1.9a2 2 0 0 0-1.3 1.3L12 21l-1.9-5.8a2 2 0 0 0-1.3-1.3L3 12l5.8-1.9a2 2 0 0 0 1.3-1.3z"/></svg>,
  scissors: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/><line x1="8.12" y1="8.12" x2="12" y2="12"/></svg>,
  wrench: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>,
}

const FAQS = [
  { q: 'Can I track a print job through every stage?', a: 'Yes. Create a job and move it through your workflow — Queued, Printing, Finishing, Ready for Pickup, Delivered. One glance tells you where every job stands.' },
  { q: 'Can I track paper, ink, and other materials?', a: 'Yes. Cresoa tracks paper stock, ink, vinyl, and other materials. Know what you have, what you have used, and which items are running low before a job stops because you ran out.' },
  { q: 'Can I create invoices for print jobs?', a: 'Yes. Create professional invoices with line items, quantities, and total cost. Include your business details and share the invoice directly through WhatsApp.' },
  { q: 'Can I share job updates via WhatsApp?', a: 'Yes. Send job updates, tracking links, and invoices through WhatsApp without leaving Cresoa. Your customer replies to the same thread.' },
  { q: 'Do I need a laptop, or can I use my phone?', a: 'Your phone is enough. Cresoa is mobile-first — designed for the way Nigerian print shops actually work.' },
  { q: 'Can I record deposits and balance payments?', a: 'Yes. Record what a customer has paid and see exactly what is still outstanding. No more relying on memory or scrolling through bank alerts.' },
]

export default function PrintingContent() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [openFaqIndex, setOpenFaqIndex] = useState(null)

  const closeMobileMenu = () => setMobileMenuOpen(false)

  const scrollToForm = (e) => {
    if (e) e.preventDefault()
    const el = document.getElementById('printing-waitlist-form')
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

  const toggleFaq = useCallback((i) => {
    setOpenFaqIndex((prev) => (prev === i ? null : i))
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
        .hero { background: linear-gradient(170deg, #0F2B4A 0%, #061A2E 100%); padding: 5rem 1.5rem 6rem; position: relative; overflow: hidden; }
        .hero::before { content: ''; position: absolute; top: -35%; right: -15%; width: 900px; height: 900px; background: radial-gradient(circle, rgba(201,155,43,0.14) 0%, transparent 55%); border-radius: 50%; pointer-events: none; }
        .hero-grid { position: relative; z-index: 1; max-width: 1180px; margin: 0 auto; display: grid; grid-template-columns: 1fr 1fr; gap: 5rem; align-items: center; }
        .hero-left { max-width: 560px; }
        .hero-eyebrow { display: inline-block; font-size: 0.72rem; font-weight: 600; letter-spacing: 0.18em; text-transform: uppercase; color: var(--gold-bright); margin-bottom: 1.8rem; }
        .hero h1 { color: #fff; font-size: 3.4rem; line-height: 1.05; margin: 0 0 1.4rem; letter-spacing: -0.035em; }
        .hero h1 em { color: var(--gold-bright); font-style: normal; }
        .hero .subhead { color: #A8B8CE; font-size: 1.08rem; line-height: 1.75; margin: 0 0 1.2rem; max-width: 520px; }
        .hero .subhead:last-of-type { margin-bottom: 2.4rem; }
        .hero .subhead a { color: var(--gold-bright); font-weight: 600; text-decoration: underline; text-decoration-thickness: 1px; text-underline-offset: 2px; }
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

        /* Quote block */
        .quote-block { background: linear-gradient(170deg, #0F2B4A 0%, #061A2E 100%); padding: 7rem 1.5rem; text-align: center; position: relative; overflow: hidden; }
        .quote-block::before { content: ''; position: absolute; top: -40%; left: 50%; transform: translateX(-50%); width: 700px; height: 700px; background: radial-gradient(circle, rgba(201,155,43,0.10), transparent 60%); border-radius: 50%; pointer-events: none; }
        .quote-inner { position: relative; max-width: 780px; margin: 0 auto; }
        .quote-inner h2 { color: #fff; font-size: 2.4rem; margin: 0 0 1.4rem; line-height: 1.2; letter-spacing: -0.025em; }
        .quote-inner > p { color: #A8B8CE; font-size: 1.05rem; line-height: 1.75; margin: 0 0 2rem; }
        .quote-inner > p:last-child { margin-bottom: 0; }
        .quote-inner > p a { color: var(--gold-bright); font-weight: 600; text-decoration: underline; }
        .quote-mark { font-family: 'Fraunces', serif; font-style: italic; font-weight: 500; font-size: 2rem; line-height: 1.4; color: var(--gold-bright); max-width: 560px; margin: 0 auto 1.5rem; position: relative; padding: 0 1.5rem; }
        .quote-mark::before { content: '"'; position: absolute; left: 0; top: -0.4rem; font-size: 3.5rem; opacity: 0.35; font-style: normal; line-height: 1; }
        .quote-mark::after { content: '"'; position: absolute; right: 0; bottom: -1rem; font-size: 3.5rem; opacity: 0.35; font-style: normal; line-height: 1; }

        /* Everything list */
           .everything { background: var(--bg); padding: 7rem 1.5rem; }
        .everything-inner { max-width: 1080px; margin: 0 auto; }
        .everything-head { max-width: 640px; margin: 0 auto 3.5rem; text-align: center; }
        .everything-head .eyebrow { display: inline-block; font-size: 0.7rem; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; color: var(--gold); margin-bottom: 1.1rem; }
        .everything-head h2 { font-size: 2.4rem; margin: 0; line-height: 1.15; }
        .everything-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; }
        .everything-item { display: flex; align-items: flex-start; gap: 1rem; padding: 1.2rem 1.3rem; background: var(--card); border: 1px solid var(--border); border-radius: 14px; transition: border-color 0.3s, transform 0.3s; }
        .everything-item:hover { border-color: var(--gold); transform: translateY(-2px); }
        .everything-icon { width: 40px; height: 40px; border-radius: 10px; background: rgba(201,155,43,0.1); color: var(--gold); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .everything-item .text { color: var(--text); font-size: 0.95rem; line-height: 1.55; }
        .everything-item .text strong { font-weight: 700; color: var(--text); }

        /* Mobile-first section */
        .mobile-section { background: var(--bg-alt); padding: 7rem 1.5rem; border-top: 1px solid var(--border); }
        .mobile-grid { max-width: 1080px; margin: 0 auto; display: grid; grid-template-columns: 1.15fr 0.85fr; gap: 5rem; align-items: center; }
        .mobile-text .eyebrow { display: inline-block; font-size: 0.7rem; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; color: var(--gold); margin-bottom: 1.2rem; }
        .mobile-text h2 { font-size: 2.2rem; margin: 0 0 1.4rem; line-height: 1.18; letter-spacing: -0.025em; }
        .mobile-text p { color: var(--text-muted); font-size: 1.02rem; line-height: 1.75; margin: 0; max-width: 520px; }
        .mobile-text a { color: var(--gold); font-weight: 600; text-decoration: underline; }
        .mobile-image-wrap { display: flex; justify-content: center; }
        .mobile-image { width: 100%; max-width: 280px; border-radius: 26px; box-shadow: 0 30px 70px rgba(15,43,74,0.15), 0 0 0 1px var(--border); display: block; }

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

        .faq-more { text-align: center; margin-top: 2.8rem; }
        .faq-more-btn { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.85rem 1.6rem; border-radius: 10px; background: transparent; color: var(--gold); border: 1px solid var(--border-strong); font-weight: 600; font-size: 0.9rem; text-decoration: none; transition: border-color 0.25s, color 0.25s, background 0.2s, transform 0.25s; font-family: inherit; }
        .faq-more-btn:hover { border-color: var(--gold); background: rgba(201,155,43,0.05); transform: translateY(-1px); }

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
          .quote-block { padding: 5rem 1.25rem; }
          .quote-inner h2 { font-size: 1.85rem; }
          .quote-mark { font-size: 1.6rem; }
          .everything { padding: 5rem 1.25rem; }
          .everything-head h2 { font-size: 1.85rem; }
          .everything-grid { grid-template-columns: 1fr; }
          .mobile-section { padding: 5rem 1.25rem; }
          .mobile-grid { grid-template-columns: 1fr; gap: 3rem; }
          .mobile-text h2 { font-size: 1.75rem; }
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
          .quote-inner h2 { font-size: 1.5rem; }
          .quote-mark { font-size: 1.35rem; padding: 0 1rem; }
          .everything-head h2 { font-size: 1.55rem; }
          .mobile-text h2 { font-size: 1.5rem; }
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
          <Link href="/" className="nav-link">Home</Link>
          <Link href="/fashion" className="nav-link">Fashion</Link>
          <Link href="/repairs" className="nav-link">Repairs</Link>
          <Link href="/printing" className="nav-link active">Printing</Link>
          <Link href="/pricing" className="nav-link">Pricing</Link>
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
          <span className="current">Printing</span>
        </div>
      </nav>

      {/* HERO */}
      <section className="hero">
        <div className="hero-grid">
          <div className="hero-left">
            <span className="hero-eyebrow" data-reveal>Cresoa for Printing</span>
            <h1 data-reveal data-delay="1">Run Your Print Shop <em>Without the Chaos.</em></h1>
            <p className="subhead" data-reveal data-delay="2">Stop keeping print jobs, customer details, paper stock and payments scattered across notebooks, WhatsApp and memory.</p>
            <p className="subhead" data-reveal data-delay="2"><Link href="/">Cresoa</Link> puts your print shop in one place — so you know what&apos;s queued, what&apos;s printing, what&apos;s ready, and what each customer owes.</p>
            <div id="printing-waitlist-form" data-reveal data-delay="3">
              <WaitlistForm defaultBusinessType="23510467" />
            </div>
          </div>
          <div className="hero-right" data-reveal data-delay="2">
            <div className="hero-mockup-wrap">
              <img src="/mockups/printing-hero.webp" alt="Cresoa printing dashboard" className="hero-mockup" loading="eager" />
            </div>
          </div>
        </div>
      </section>

      {/* TRUST STRIP */}
      <section className="trust" aria-label="Cresoa for printing at a glance">
        <div className="trust-inner">
          <div className="trust-item">
            <div className="big">{ICONS.printer} Built for print shops</div>
            <div className="lbl">Nigerian print &amp; signage businesses</div>
          </div>
          <div className="trust-item">
            <div className="big">{ICONS.user} Works on any phone</div>
            <div className="lbl">Mobile-first design</div>
          </div>
          <div className="trust-item">
            <div className="big">{ICONS.check} WhatsApp ready</div>
            <div className="lbl">Send updates &amp; invoices</div>
          </div>
          <div className="trust-item">
            <div className="big">{ICONS.check} Free to join</div>
            <div className="lbl">Founding Member access</div>
          </div>
        </div>
      </section>

      {/* STATEMENT */}
      <section className="statement">
        <div className="statement-inner">
          <h2 data-reveal>Built for the Way Print Shops Actually Work</h2>
          <p data-reveal data-delay="1">Whether you run a digital print shop, a signage business, a screen printing setup or a small photocopy kiosk, <Link href="/">Cresoa</Link> helps you stay on top of every job.</p>
        </div>
      </section>

      {/* SHOWCASE ROW 1 — JOB QUEUE */}
      <section className="showcase" aria-labelledby="queue-heading">
        <div className="row">
          <div className="row-text" data-reveal>
            <span className="row-eyebrow">Job Queue</span>
            <h3 id="queue-heading">Every Job, Every Stage.</h3>
            <p>Know exactly where every print job stands — Queued, Printing, Finishing, Ready for Pickup. No more asking your staff what&apos;s left or what&apos;s done.</p>
          </div>
          <div className="row-image" data-reveal data-delay="1">
            <img src="/mockups/printing-queue.webp" alt="Print job queue in Cresoa" loading="lazy" />
          </div>
        </div>
      </section>

      {/* SHOWCASE ROW 2 — PAPER STOCK */}
      <section className="showcase" aria-labelledby="stock-heading" style={{ paddingTop: 0 }}>
        <div className="row alt">
          <div className="row-text" data-reveal>
            <span className="row-eyebrow">Paper &amp; Materials</span>
            <h3 id="stock-heading">Know Your Paper Stock.</h3>
            <p>Track paper, ink, vinyl, and other materials. Know what&apos;s running low before a job stops because you ran out in the middle of a run.</p>
          </div>
          <div className="row-image" data-reveal data-delay="1">
            <img src="/mockups/printing-paper-stock.webp" alt="Paper and materials inventory in Cresoa" loading="lazy" />
          </div>
        </div>
      </section>

      {/* SHOWCASE ROW 3 — INVOICES */}
      <section className="showcase" aria-labelledby="invoice-heading" style={{ paddingTop: 0 }}>
        <div className="row">
          <div className="row-text" data-reveal>
            <span className="row-eyebrow">Invoices</span>
            <h3 id="invoice-heading">Invoices That Get Paid.</h3>
            <p>Create professional invoices with line items, quantities and total cost. Share them via WhatsApp and record payments in the same place.</p>
          </div>
          <div className="row-image" data-reveal data-delay="1">
            <img src="/mockups/printing-invoice.webp" alt="Professional print invoice in Cresoa" loading="lazy" />
          </div>
        </div>
      </section>

      {/* SECONDARY — CUSTOMERS + PAYMENTS */}
      <section className="secondary" aria-labelledby="secondary-heading">
        <div className="secondary-head" data-reveal>
          <span className="eyebrow">And Everything Around It</span>
          <h2 id="secondary-heading">Every Tool Your Print Shop Needs</h2>
        </div>
        <div className="secondary-grid">
          <article className="secondary-card" data-reveal>
            <div className="secondary-img">
              <img src="/mockups/printing-customer.webp" alt="Customer records in Cresoa" loading="lazy" />
            </div>
            <div className="secondary-body">
              <span className="row-eyebrow">Customers</span>
              <h3>Keep Customer Records</h3>
              <p>Store every customer&apos;s details and order history in one place. No more digging through old WhatsApp chats to remember who ordered what.</p>
            </div>
          </article>

          <article className="secondary-card" data-reveal data-delay="1">
            <div className="secondary-img">
              <img src="/mockups/printing-payments.webp" alt="Payment tracking in Cresoa" loading="lazy" />
            </div>
            <div className="secondary-body">
              <span className="row-eyebrow">Payments</span>
              <h3>Track Every Payment</h3>
              <p>Record deposits and track outstanding balances. Know exactly who has paid and who still owes — without scrolling through bank alerts.</p>
            </div>
          </article>
        </div>
      </section>

      {/* QUOTE BLOCK */}
      <section className="quote-block" aria-labelledby="quote-heading">
        <div className="quote-inner">
          <h2 id="quote-heading" data-reveal>Stop Asking &ldquo;Has My Banner Printed?&rdquo;</h2>
          <p data-reveal data-delay="1">With multiple jobs running at once, it&apos;s easy to lose track. <Link href="/">Cresoa</Link> keeps every job, customer and payment connected — so you always have an answer.</p>
          <p className="quote-mark" data-reveal data-delay="2">Oga, the banner don ready?</p>
          <p data-reveal data-delay="3">You can check the queue and know exactly what&apos;s happening.</p>
        </div>
      </section>

      {/* EVERYTHING LIST */}
      <section className="everything" aria-labelledby="everything-heading">
        <div className="everything-inner">
          <div className="everything-head" data-reveal>
            <span className="eyebrow">The Full Picture</span>
            <h2 id="everything-heading">Every Tool Your Print Shop Needs</h2>
          </div>
          <div className="everything-grid">
            <div className="everything-item" data-reveal>
              <div className="everything-icon">{ICONS.user}</div>
              <div className="text"><strong>Customers</strong> — Keep your customer records organized.</div>
            </div>
            <div className="everything-item" data-reveal data-delay="1">
              <div className="everything-icon">{ICONS.printer}</div>
              <div className="text"><strong>Print Jobs</strong> — Create and manage jobs from intake to pickup.</div>
            </div>
            <div className="everything-item" data-reveal data-delay="2">
              <div className="everything-icon">{ICONS.track}</div>
              <div className="text"><strong>Job Status</strong> — Know which jobs are queued, printing, finishing or ready.</div>
            </div>
            <div className="everything-item" data-reveal>
              <div className="everything-icon">{ICONS.box}</div>
              <div className="text"><strong>Inventory</strong> — Track paper, ink, vinyl, and other materials.</div>
            </div>
            <div className="everything-item" data-reveal data-delay="1">
              <div className="everything-icon">{ICONS.invoice}</div>
              <div className="text"><strong>Invoices</strong> — Create professional invoices with your business details and line items.</div>
            </div>
            <div className="everything-item" data-reveal data-delay="2">
              <div className="everything-icon">{ICONS.cash}</div>
              <div className="text"><strong>Payments</strong> — Record customer payments and keep track of outstanding balances.</div>
            </div>
            <div className="everything-item" data-reveal>
              <div className="everything-icon">{ICONS.track}</div>
              <div className="text"><strong>Customer Tracking</strong> — Give customers a way to check the status of their job where available on your plan.</div>
            </div>
            <div className="everything-item" data-reveal data-delay="1">
              <div className="everything-icon">{ICONS.sparkles}</div>
              <div className="text"><strong>Tessa AI</strong> — Ask Tessa how to use Cresoa whenever you need help.</div>
            </div>
          </div>
        </div>
      </section>

      {/* MOBILE-FIRST */}
      <section className="mobile-section" aria-labelledby="mobile-heading">
        <div className="mobile-grid">
          <div className="mobile-text" data-reveal>
            <span className="eyebrow">Mobile-First</span>
            <h2 id="mobile-heading">Built for the Way Nigerian Print Businesses Work</h2>
            <p>You don&apos;t need a complicated system or an expensive computer setup. <Link href="/">Cresoa</Link> is mobile-first. Use your phone to manage your shop while you&apos;re at the counter, in the market, or collecting materials.</p>
          </div>
          <div className="mobile-image-wrap" data-reveal data-delay="1">
            <img src="/mockups/printing-mobile.webp" alt="Cresoa on a phone" className="mobile-image" loading="lazy" />
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

          <div className="faq-more" data-reveal data-delay="2">
            <Link href="/faq" className="faq-more-btn">
              See all frequently asked questions {ICONS.arrowRight}
            </Link>
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
          <Link href="/fashion" className="cross-card" data-reveal>
            <div className="cross-icon">{ICONS.scissors}</div>
            <h3>Fashion &amp; Tailoring</h3>
            <p>Manage measurements, Aso-Ebi group orders, and production deadlines in one workspace.</p>
            <span className="cross-arrow">Explore fashion {ICONS.arrowRight}</span>
          </Link>
          <Link href="/repairs" className="cross-card" data-reveal data-delay="1">
            <div className="cross-icon">{ICONS.wrench}</div>
            <h3>Repairs &amp; Technical Services</h3>
            <p>Track devices, parts inventory, pickup dates, and payment balances without losing a single job.</p>
            <span className="cross-arrow">Explore repairs {ICONS.arrowRight}</span>
          </Link>
        </div>
        <p className="cross-note" data-reveal>
          <strong>Coming next:</strong> Logistics &amp; Delivery, Custom Manufacturing, Salons &amp; Spa.
        </p>
      </section>

      {/* FINAL CTA */}
      <section className="cta" aria-labelledby="cta-heading">
        <div className="cta-inner">
          <h2 id="cta-heading" data-reveal>Give Your Print Shop a Better System</h2>
          <p data-reveal data-delay="1">You&apos;re already doing the hard work of running the shop. Let <Link href="/">Cresoa</Link> handle the organization. Track your jobs. Control your materials. Send professional invoices. Keep your business moving.</p>
          <div data-reveal data-delay="2">
            <WaitlistForm defaultBusinessType="23510467" />
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
