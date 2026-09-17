'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Script from 'next/script'
import Logo from '../components/Logo'
import ThemeToggle from '../components/ThemeToggle'

// ─── Self-contained Icons ─────────────────
const ICONS = {
  menu: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>,
  x: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  check: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  arrowRight: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>,
  arrowDown: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>,
  users: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  layers: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>,
  globe: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>,
  clock: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  smartphone: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>,
  messageCircle: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>,
  tool: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>,
  printer: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>,
  spark: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v6m0 8v6M2 12h6m8 0h6M4.93 4.93l4.24 4.24m5.66 5.66l4.24 4.24M4.93 19.07l4.24-4.24m5.66-5.66l4.24-4.24"/></svg>,
  mapPin: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>,
}

export default function HomepageContent() {
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [counts, setCounts] = useState({ users: 0, industries: 0, months: 0 })
  const [activeTab, setActiveTab] = useState('fashion')
  const [openFaqIndex, setOpenFaqIndex] = useState(null)
  const statsRef = useRef(null)

  const toggleMobileMenu = () => setMobileMenuOpen(!mobileMenuOpen)
  const closeMobileMenu = () => setMobileMenuOpen(false)
  const navigateTo = (path) => { router.push(path); closeMobileMenu() }

  const scrollToSection = (e, id) => {
    e.preventDefault()
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    closeMobileMenu()
  }

  const scrollToForm = (e, id = 'waitlist-form') => {
    e.preventDefault()
    const el = document.getElementById(id)
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY - 90
      window.scrollTo({ top, behavior: 'smooth' })
    }
    closeMobileMenu()
  }

  // ─── Count-up ──────────────────────────────
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          const endUsers = 47, endIndustries = 3, endMonths = 6
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
              months: Math.floor(progress * endMonths),
            })
            if (step >= steps) {
              setCounts({ users: endUsers, industries: endIndustries, months: endMonths })
              clearInterval(interval)
            }
          }, stepTime)
        }
      },
      { threshold: 0.4 }
    )
    if (statsRef.current) observer.observe(statsRef.current)
    return () => observer.disconnect()
  }, [])

  // ─── Fade-in on scroll ─────────────────────
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
      { threshold: 0.12, rootMargin: '0px 0px -60px 0px' }
    )
    els.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  const toggleFaq = (i) => setOpenFaqIndex(openFaqIndex === i ? null : i)

  const faqs = [
    { q: 'What is Cresoa?', a: 'Cresoa is a business management platform built for Nigerian SMEs. It helps you manage customers, orders, payments, and production in one place.' },
    { q: 'When is Cresoa launching?', a: 'In 6 months. Waitlist members hear first and get 30 days of Pro features completely free at launch.' },
    { q: 'What happens when I join the waitlist?', a: 'You become a Founding Member. You get early access at launch, 30 days of Pro features free, and email updates only when there is something worth sharing. No spam, no weekly fluff.' },
    { q: 'How much does it cost?', a: 'Free plan forever. Starter at ₦3,500/month. Pro at ₦9,500/month. Founding Members do not pay for the first 30 days.' },
    { q: 'What industries does Cresoa support?', a: 'Fashion & Custom Wear, Repairs & Technical Services, and Printing & Signage are ready. More industries will follow after launch.' },
    { q: 'Can I use Cresoa on my phone?', a: 'Yes. Cresoa is fully responsive and designed mobile-first — because that is where Nigerian businesses actually work.' },
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
        :root {
          --color-bg: #F8F6F2;
          --color-card: #FFFFFF;
          --color-text: #1A1A1A;
          --color-text-muted: #8A8A8A;
          --color-border: #E5E0D8;
          --color-primary: #0F2B4A;
          --color-primary-deep: #061A2E;
          --color-accent: #D4A52A;
          --color-accent-hover: #C79A2B;
          --color-success: #2E7D5E;
          --shadow-sm: 0 2px 8px rgba(15,43,74,0.04);
          --shadow-md: 0 4px 16px rgba(15,43,74,0.06);
          --shadow-lg: 0 8px 32px rgba(15,43,74,0.08);
          --shadow-xl: 0 24px 48px rgba(15,43,74,0.12);
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
          --shadow-xl: 0 24px 48px rgba(0,0,0,0.6);
        }

        h1, h2, h3, h4 { font-family: 'Fraunces', serif; font-weight: 700; letter-spacing: -0.02em; }
        .container { max-width: 1100px; margin: 0 auto; padding: 0 1.5rem; }

        /* ── Motion ── */
        [data-animate] { opacity: 0; transform: translateY(24px); transition: opacity 0.8s ease, transform 0.8s cubic-bezier(0.16, 1, 0.3, 1); }
        [data-animate].animate-in { opacity: 1; transform: translateY(0); }
        @media (prefers-reduced-motion: reduce) {
          [data-animate], [data-animate].animate-in { opacity: 1; transform: none; transition: none; }
          .hero-mockup { animation: none !important; }
        }
        @keyframes floatY {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        @keyframes tabFade {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* ── Buttons ── */
        .btn {
          display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem;
          padding: 0.85rem 2rem; border-radius: 10px; font-weight: 600; font-size: 0.95rem;
          text-decoration: none; border: none; cursor: pointer;
          transition: transform 0.25s ease, box-shadow 0.25s ease, background 0.25s ease;
          background: var(--color-accent); color: #0F2B4A;
          box-shadow: 0 6px 20px rgba(212,165,42,0.3); font-family: inherit;
        }
        .btn:hover { transform: translateY(-2px); box-shadow: 0 12px 32px rgba(212,165,42,0.4); background: var(--color-accent-hover); }
        .btn:active { transform: translateY(0); }
        .btn-outline { background: transparent; color: #fff; border: 1px solid rgba(255,255,255,0.25); box-shadow: none; }
        .btn-outline:hover { background: rgba(255,255,255,0.06); border-color: rgba(255,255,255,0.5); }

        .nav-btn {
          display: inline-flex; align-items: center; justify-content: flex-start; gap: 0.4rem;
          padding: 0.55rem 1rem; border-radius: 8px; font-size: 0.9rem; font-weight: 500;
          border: 1px solid transparent; background: transparent; color: var(--color-text);
          transition: all 0.2s ease; cursor: pointer; font-family: inherit; text-decoration: none;
          width: 100%; text-align: left;
        }
        .nav-btn:hover { color: var(--color-accent); background: rgba(212,165,42,0.06); }
        .nav-btn-primary { background: var(--color-accent); color: #0F2B4A; border: 1px solid var(--color-accent); box-shadow: 0 4px 12px rgba(212,165,42,0.25); width: auto; padding: 0.6rem 1.4rem; }
        .nav-btn-primary:hover { background: var(--color-accent-hover); border-color: var(--color-accent-hover); color: #0F2B4A; }

        /* ── Navbar ── */
        .navbar { background: var(--color-card); border-bottom: 1px solid var(--color-border); padding: 0.8rem 1.5rem; display: flex; justify-content: space-between; align-items: center; position: sticky; top: 0; z-index: 1000; backdrop-filter: blur(12px); flex-wrap: wrap; gap: 0.5rem; }
        .navbar .logo-container { display: flex; align-items: center; gap: 0.6rem; }
        .navbar .nav-links { display: flex; gap: 0.3rem; align-items: center; flex-wrap: wrap; }
        .navbar .nav-actions { display: flex; align-items: center; gap: 0.8rem; flex-wrap: wrap; }
        .hamburger { display: none; background: none; border: none; color: var(--color-text); cursor: pointer; padding: 0.2rem 0.5rem; }
        .login-link { color: var(--color-text-muted); background: none; border: none; font-size: 0.85rem; cursor: pointer; font-family: inherit; text-decoration: none; }
        .login-link:hover { color: var(--color-accent); }

        /* ── Mobile drawer ── */
        .mobile-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 999; backdrop-filter: blur(4px); }
        .mobile-overlay.open { display: block; }
        .mobile-drawer { position: fixed; top: 0; left: 0; bottom: 0; width: 280px; background: var(--color-card); padding: 2rem 1.5rem; transform: translateX(-100%); transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1); z-index: 1000; display: flex; flex-direction: column; gap: 0.6rem; border-right: 1px solid var(--color-border); }
        .mobile-drawer.open { transform: translateX(0); }
        .mobile-drawer .close-btn { align-self: flex-end; background: none; border: none; color: var(--color-text); font-size: 1.5rem; cursor: pointer; margin-bottom: 1rem; }

        /* ── Hero ── */
        .hero { background: linear-gradient(150deg, #0F2B4A 0%, #061A2E 100%); padding: 4rem 1.5rem 3rem; position: relative; overflow: hidden; }
        .hero::before { content: ''; position: absolute; top: -30%; right: -10%; width: 600px; height: 600px; background: radial-gradient(circle, rgba(212,165,42,0.10) 0%, transparent 70%); border-radius: 50%; pointer-events: none; }
        .hero-inner { position: relative; z-index: 1; max-width: 1100px; margin: 0 auto; display: grid; grid-template-columns: 1.1fr 1fr; gap: 3rem; align-items: center; }
        .hero-left { max-width: 560px; }
        .founder-badge { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.35rem 0.9rem; border-radius: 100px; background: rgba(212,165,42,0.12); border: 1px solid rgba(212,165,42,0.25); color: #D4A52A; font-size: 0.75rem; font-weight: 500; letter-spacing: 0.01em; margin-bottom: 1.5rem; }
        .founder-badge .dot { width: 6px; height: 6px; border-radius: 50%; background: #D4A52A; box-shadow: 0 0 0 4px rgba(212,165,42,0.2); }
        .hero h1 { color: #fff; font-size: 3.2rem; line-height: 1.05; margin: 0 0 1rem; }
        .hero h1 span { color: #D4A52A; }
        .hero .subhead { color: #C8D4E3; font-size: 1.05rem; line-height: 1.7; margin: 0 0 2rem; max-width: 520px; }
        .hero .microcopy { color: #93A8C0; font-size: 0.8rem; margin-top: 1rem; line-height: 1.5; max-width: 460px; }

        .kit-form-slot { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; padding: 1.25rem; min-height: 120px; scroll-margin-top: 100px; }
        .kit-form-slot :global(form) { display: flex; flex-direction: column; gap: 0.6rem; }
        .kit-form-slot :global(input),
        .kit-form-slot :global(select) {
          width: 100%; padding: 0.85rem 1rem; border-radius: 10px;
          border: 1px solid rgba(255,255,255,0.15); background: rgba(255,255,255,0.06);
          color: #fff; font-family: inherit; font-size: 0.95rem;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .kit-form-slot :global(input)::placeholder { color: #7C8FA7; }
        .kit-form-slot :global(input:focus),
        .kit-form-slot :global(select:focus) {
          outline: none; border-color: #D4A52A;
          box-shadow: 0 0 0 3px rgba(212,165,42,0.18);
        }
        .kit-form-slot :global(button[type="submit"]) {
          margin-top: 0.4rem; padding: 0.9rem 1.5rem; border-radius: 10px;
          background: #D4A52A; color: #0F2B4A; font-weight: 700; font-size: 0.95rem;
          border: none; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s, background 0.2s;
          font-family: inherit;
        }
        .kit-form-slot :global(button[type="submit"]:hover) {
          background: #C79A2B; transform: translateY(-2px);
          box-shadow: 0 12px 32px rgba(212,165,42,0.4);
        }

        .hero-right { position: relative; }
        .hero-mockup { width: 100%; max-width: 420px; margin-left: auto; border-radius: 20px; box-shadow: 0 30px 80px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.06); animation: floatY 6s ease-in-out infinite; display: block; }

        /* ── Trust bar ── */
        .trust-bar { background: #061A2E; padding: 1.6rem 1.5rem; border-top: 1px solid rgba(255,255,255,0.05); }
        .trust-bar-inner { max-width: 1100px; margin: 0 auto; display: grid; grid-template-columns: repeat(4, 1fr); gap: 1.5rem; text-align: center; }
        .trust-item .num { display: flex; align-items: center; justify-content: center; gap: 0.5rem; color: #fff; font-size: 1.6rem; font-weight: 700; font-family: 'Fraunces', serif; letter-spacing: -0.02em; }
        .trust-item .num svg { color: #D4A52A; }
        .trust-item .lbl { color: #93A8C0; font-size: 0.78rem; margin-top: 0.25rem; letter-spacing: 0.02em; text-transform: uppercase; }

        /* ── Section titles ── */
        .section-title { text-align: center; margin-bottom: 3rem; }
        .section-title h2 { font-size: 2.2rem; color: var(--color-text); margin: 0 0 0.6rem; line-height: 1.15; }
        .section-title p { color: var(--color-text-muted); font-size: 1.02rem; max-width: 560px; margin: 0 auto; line-height: 1.6; }

        /* ── Bento grid ── */
          .bento { display: grid; grid-template-columns: repeat(4, 1fr); grid-auto-rows: minmax(180px, auto); gap: 1rem; }
        .bento-card {
          background: var(--color-card); border-radius: 18px; overflow: hidden;
          border: 1px solid var(--color-border); position: relative;
          transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.4s ease, border-color 0.3s ease;
          box-shadow: var(--shadow-sm); display: flex; flex-direction: column;
        }
        .bento-card:hover { transform: translateY(-6px); box-shadow: var(--shadow-xl); border-color: var(--color-accent); }
        .bento-large { grid-column: span 2; grid-row: span 2; }
        .bento-medium { grid-column: span 2; }
        .bento-small { grid-column: span 1; }
        .bento-img { width: 100%; height: 100%; object-fit: cover; object-position: top; display: block; }
        .bento-img-wrap { flex: 1; min-height: 180px; overflow: hidden; background: #F0EBE1; }
        .bento-body { padding: 1.2rem 1.3rem 1.4rem; }
        .bento-tag { display: inline-block; font-size: 0.65rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--color-accent); margin-bottom: 0.4rem; }
        .bento-body h3 { color: var(--color-text); font-size: 1.05rem; margin: 0 0 0.3rem; line-height: 1.3; }
        .bento-body p { color: var(--color-text-muted); font-size: 0.87rem; margin: 0; line-height: 1.55; }

        /* ── Interactive toggle ── */
        .toggle-wrap { background: var(--color-card); border-radius: 22px; border: 1px solid var(--color-border); overflow: hidden; box-shadow: var(--shadow-md); }
        .toggle-tabs { display: flex; border-bottom: 1px solid var(--color-border); overflow-x: auto; scrollbar-width: none; }
        .toggle-tabs::-webkit-scrollbar { display: none; }
        .toggle-tab { flex: 1; min-width: 140px; padding: 1rem 1.2rem; background: transparent; border: none; cursor: pointer; font-family: inherit; font-size: 0.92rem; font-weight: 600; color: var(--color-text-muted); border-bottom: 2px solid transparent; transition: all 0.25s ease; white-space: nowrap; }
        .toggle-tab:hover { color: var(--color-text); }
        .toggle-tab.active { color: var(--color-accent); border-bottom-color: var(--color-accent); background: rgba(212,165,42,0.04); }
        .toggle-content { display: grid; grid-template-columns: 1fr 1fr; gap: 0; align-items: center; }
        .toggle-text { padding: 2.4rem 2rem 2.4rem 2.4rem; animation: tabFade 0.4s ease; }
        .toggle-text h3 { color: var(--color-text); font-size: 1.4rem; margin: 0 0 0.6rem; line-height: 1.25; }
        .toggle-text p { color: var(--color-text-muted); font-size: 0.95rem; line-height: 1.65; margin: 0 0 1.5rem; }
        .toggle-image-wrap { background: #F0EBE1; padding: 1.5rem; display: flex; align-items: center; justify-content: center; min-height: 340px; }
        .toggle-image { width: 100%; max-width: 340px; border-radius: 14px; box-shadow: 0 16px 48px rgba(15,43,74,0.14); animation: tabFade 0.5s ease; display: block; }

        /* ── Founder note ── */
        .founder { display: grid; grid-template-columns: 1fr 1.3fr; gap: 3rem; align-items: center; background: var(--color-card); border-radius: 22px; border: 1px solid var(--color-border); padding: 2.5rem; box-shadow: var(--shadow-md); }
        .founder-photo { width: 100%; border-radius: 16px; aspect-ratio: 4/5; object-fit: cover; box-shadow: 0 16px 48px rgba(15,43,74,0.12); }
        .founder-copy h2 { color: var(--color-text); font-size: 1.8rem; margin: 0 0 1rem; line-height: 1.2; }
        .founder-copy p { color: var(--color-text-muted); font-size: 1rem; line-height: 1.75; margin: 0 0 1rem; }
        .founder-sign { color: var(--color-text); font-weight: 700; font-size: 1rem; margin-top: 1rem; }
        .founder-title { color: var(--color-text-muted); font-size: 0.85rem; margin-top: 0.2rem; }

        /* ── Pricing ── */
        .pricing-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(270px, 1fr)); gap: 1.5rem; max-width: 960px; margin: 0 auto; }
        .pricing-card { background: var(--color-card); border-radius: 18px; padding: 2rem 1.5rem; border: 2px solid var(--color-border); text-align: center; transition: all 0.3s ease; box-shadow: var(--shadow-sm); }
        .pricing-card:hover { border-color: var(--color-accent); box-shadow: var(--shadow-lg); transform: translateY(-4px); }
        .pricing-card.popular { border-color: var(--color-accent); position: relative; }
        .popular-badge { background: var(--color-accent); color: #0F2B4A; font-size: 0.62rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; padding: 0.2rem 0.85rem; border-radius: 20px; display: inline-block; margin-bottom: 0.9rem; }
        .plan-name { font-size: 1.1rem; font-weight: 600; color: var(--color-text); margin: 0; }
        .price { font-size: 2.6rem; font-weight: 700; color: var(--color-text); margin: 0.4rem 0; font-family: 'Fraunces', serif; letter-spacing: -0.02em; }
        .price span { font-size: 0.95rem; font-weight: 400; color: var(--color-text-muted); font-family: 'Inter', sans-serif; }
        .description { color: var(--color-text-muted); font-size: 0.85rem; margin: 0 0 1.2rem; }
        .pricing-card ul { list-style: none; padding: 0; margin: 1.5rem 0; text-align: left; }
        .pricing-card ul li { padding: 0.55rem 0; border-bottom: 1px solid var(--color-border); font-size: 0.87rem; color: var(--color-text); display: flex; align-items: center; gap: 0.6rem; }
        .pricing-card ul li:last-child { border-bottom: none; }
        .pricing-card ul li svg { flex-shrink: 0; color: var(--color-accent); }
        .pricing-card ul li.muted { color: var(--color-text-muted); opacity: 0.55; }
        .pricing-card ul li.muted svg { color: var(--color-text-muted); }

        /* ── FAQ ── */
        .faq-item { background: var(--color-card); border-radius: 14px; border: 1px solid var(--color-border); margin-bottom: 0.8rem; overflow: hidden; transition: border-color 0.2s ease; }
        .faq-item:hover { border-color: var(--color-accent); }
        .faq-header { padding: 1.1rem 1.3rem; font-weight: 600; color: var(--color-text); cursor: pointer; display: flex; justify-content: space-between; align-items: center; font-size: 0.96rem; }
        .faq-header .arrow { color: var(--color-accent); transition: transform 0.3s ease; font-size: 1.3rem; font-weight: 300; line-height: 1; }
        .faq-header .arrow.open { transform: rotate(45deg); }
        .faq-answer { max-height: 0; overflow: hidden; transition: max-height 0.35s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease; opacity: 0; padding: 0 1.3rem; color: var(--color-text-muted); font-size: 0.92rem; line-height: 1.75; }
        .faq-answer.open { max-height: 400px; opacity: 1; padding: 0 1.3rem 1.3rem; }

        /* ── Final CTA ── */
        .final-cta { background: linear-gradient(135deg, #0F2B4A, #1A3F66); border-radius: 24px; max-width: 780px; margin: 0 auto 3rem; padding: 3rem 2rem; text-align: center; box-shadow: 0 20px 60px rgba(15,43,74,0.25); }
        .final-cta h2 { color: #fff; font-size: 2rem; margin: 0 0 0.8rem; line-height: 1.2; }
        .final-cta p { color: #C8D4E3; font-size: 1rem; margin: 0 0 1.8rem; max-width: 520px; margin-inline: auto; line-height: 1.65; }
        .final-cta .kit-form-slot { max-width: 480px; margin: 0 auto; }

        /* ── Footer ── */
        .footer { border-top: 1px solid var(--color-border); padding: 2.5rem 1.5rem; margin-top: 1rem; text-align: center; color: var(--color-text-muted); font-size: 0.8rem; }
        .footer .links { display: flex; justify-content: center; gap: 1rem; flex-wrap: wrap; margin: 1.2rem 0; }
        .footer .links a, .footer .links button { color: var(--color-text); text-decoration: none; transition: color 0.2s; background: none; border: none; cursor: pointer; font-size: 0.85rem; padding: 0.2rem 0.5rem; font-family: inherit; }
        .footer .links a:hover, .footer .links button:hover { color: var(--color-accent); }

        /* ── Responsive ── */
        @media (max-width: 900px) {
          .hero-inner { grid-template-columns: 1fr; gap: 2.5rem; }
          .hero-mockup { margin: 0 auto; }
          .hero h1 { font-size: 2.4rem; }
          .toggle-content { grid-template-columns: 1fr; }
          .toggle-text { padding: 1.8rem 1.5rem 1rem; }
          .toggle-image-wrap { padding: 1.5rem; min-height: auto; }
          .founder { grid-template-columns: 1fr; padding: 1.8rem; }
          .founder-photo { aspect-ratio: 1/1; max-width: 260px; margin: 0 auto; }
        }
        @media (max-width: 768px) {
          .navbar .nav-links { display: none; }
          .navbar .nav-actions .login-link,
          .navbar .nav-actions .nav-btn-primary { display: none; }
          .hamburger { display: flex; align-items: center; }
          .hero { padding: 3rem 1.2rem 2.5rem; }
          .hero h1 { font-size: 2rem; }
          .hero .subhead { font-size: 0.98rem; }
          .section-title h2 { font-size: 1.7rem; }
          .trust-bar-inner { grid-template-columns: repeat(2, 1fr); gap: 1.2rem; }
          .bento { grid-template-columns: 1fr; grid-auto-rows: auto; }
          .bento-large, .bento-medium, .bento-small { grid-column: span 1; grid-row: auto; }
          .pricing-grid { grid-template-columns: 1fr; }
          .final-cta { padding: 2.2rem 1.4rem; border-radius: 18px; }
          .final-cta h2 { font-size: 1.6rem; }
          .founder-copy h2 { font-size: 1.5rem; }
        }
        @media (max-width: 480px) {
          .hero h1 { font-size: 1.75rem; }
          .trust-bar-inner { grid-template-columns: 1fr 1fr; }
          .trust-item .num { font-size: 1.35rem; }
        }
      `}</style>

      {/* ─── NAVBAR ─── */}
      <nav className="navbar">
        <div className="logo-container">
          <button onClick={() => navigateTo('/')} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <Logo variant="primary" size="large" />
          </button>
        </div>
        <div className="nav-links">
          <Link href="/fashion" className="nav-btn">Fashion</Link>
          <Link href="/repairs" className="nav-btn">Repairs</Link>
          <Link href="/printing" className="nav-btn">Printing</Link>
          <Link href="/pricing" className="nav-btn">Pricing</Link>
          <Link href="/blog" className="nav-btn">Blog</Link>
          <Link href="/support" className="nav-btn">Support</Link>
          <button onClick={(e) => scrollToSection(e, 'faq')} className="nav-btn">FAQ</button>
        </div>
        <div className="nav-actions">
          <ThemeToggle />
          <Link href="/login" className="login-link">Log in</Link>
          <button onClick={scrollToForm} className="nav-btn nav-btn-primary">Join Waitlist</button>
          <button className="hamburger" onClick={toggleMobileMenu} aria-label="Open menu">{ICONS.menu}</button>
        </div>
      </nav>

      {/* ─── MOBILE DRAWER ─── */}
      <div className={`mobile-overlay ${mobileMenuOpen ? 'open' : ''}`} onClick={closeMobileMenu} />
      <div className={`mobile-drawer ${mobileMenuOpen ? 'open' : ''}`}>
        <button className="close-btn" onClick={closeMobileMenu} aria-label="Close menu">{ICONS.x}</button>
        <Link href="/fashion" className="nav-btn" onClick={closeMobileMenu}>Fashion</Link>
        <Link href="/repairs" className="nav-btn" onClick={closeMobileMenu}>Repairs</Link>
        <Link href="/printing" className="nav-btn" onClick={closeMobileMenu}>Printing</Link>
        <Link href="/pricing" className="nav-btn" onClick={closeMobileMenu}>Pricing</Link>
        <Link href="/blog" className="nav-btn" onClick={closeMobileMenu}>Blog</Link>
        <Link href="/support" className="nav-btn" onClick={closeMobileMenu}>Support</Link>
        <button onClick={(e) => scrollToSection(e, 'faq')} className="nav-btn">FAQ</button>
        <Link href="/login" className="nav-btn" onClick={closeMobileMenu}>Log in</Link>
        <button onClick={scrollToForm} className="nav-btn nav-btn-primary" style={{ width: '100%', textAlign: 'center', marginTop: '0.5rem' }}>Join Waitlist</button>
        <div style={{ paddingTop: '0.8rem' }}><ThemeToggle /></div>
      </div>

      {/* ─── HERO ─── */}
      <section className="hero">
        <div className="hero-inner">
          <div className="hero-left" data-animate>
            <div className="founder-badge">
              <span className="dot" />
              Taiwo A. Feranmi — Building in Public
            </div>
            <h1>Run your Nigerian business <span>from one place.</span></h1>
            <p className="subhead">
              Track orders, collect payments, update customers on WhatsApp — without spreadsheets, notebooks, or lost DMs. Launching soon for Fashion, Repairs, and Printing businesses across Nigeria.
            </p>

            <div className="kit-form-slot" id="waitlist-form">
              <Script
                id="kit-form-hero"
                async
                data-uid="4b0964dc7c"
                src="https://cresoa.kit.com/4b0964dc7c/index.js"
                strategy="afterInteractive"
              />
            </div>

            <p className="microcopy">
              Founding Members get 30 days of Pro features free at launch. No spam — only real updates.
            </p>
          </div>

          <div className="hero-right" data-animate>
            <img
              src="/mockups/dashboard.webp"
              alt="Cresoa dashboard showing revenue, orders, and production pipeline"
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
            <div className="num">{ICONS.users} {counts.users}</div>
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
      <section className="container" style={{ padding: '4rem 1.5rem 3rem' }}>
        <div className="section-title" data-animate>
          <h2>Everything you need to run smoothly</h2>
          <p>One workspace for customers, orders, payments, and production.</p>
        </div>

        <div className="bento">
          <div className="bento-card bento-large" data-animate>
            <div className="bento-img-wrap">
              <img src="/mockups/order-detail.webp" alt="Order detail view with production stages" className="bento-img" loading="lazy" />
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
              <img src="/mockups/production.webp" alt="Production pipeline showing work in progress" className="bento-img" loading="lazy" />
            </div>
            <div className="bento-body">
              <span className="bento-tag">Production</span>
              <h3>See your workshop moving.</h3>
              <p>Know how many orders are cutting, sewing, and ready — in real time.</p>
            </div>
          </div>

          <div className="bento-card bento-small" data-animate>
            <div className="bento-img-wrap">
              <img src="/mockups/whatsapp.webp" alt="One-tap WhatsApp customer update" className="bento-img" loading="lazy" />
            </div>
            <div className="bento-body">
              <span className="bento-tag">Customer Comms</span>
              <h3>One-tap WhatsApp.</h3>
            </div>
          </div>

          <div className="bento-card bento-small" data-animate>
            <div className="bento-img-wrap">
              <img src="/mockups/support.webp" alt="Tessa AI and human support" className="bento-img" loading="lazy" />
            </div>
            <div className="bento-body">
              <span className="bento-tag">Support</span>
              <h3>Tessa AI + humans.</h3>
            </div>
          </div>
        </div>
      </section>

      {/* ─── INTERACTIVE TOGGLE ─── */}
      <section className="container" style={{ padding: '2rem 1.5rem 4rem' }}>
        <div className="section-title" data-animate>
          <h2>Built for the way you work</h2>
          <p>Cresoa adapts to your industry — not the other way around.</p>
        </div>

        <div className="toggle-wrap" data-animate>
          <div className="toggle-tabs">
            {Object.keys(industryData).map((key) => (
              <button
                key={key}
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
      <section className="container" style={{ padding: '0 1.5rem 4rem' }}>
        <div className="founder" data-animate>
          <img src="/mockups/founder.webp" alt="Taiwo A. Feranmi, founder of Cresoa" className="founder-photo" loading="lazy" />
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
      <section id="pricing" className="container" style={{ padding: '0 1.5rem 4rem' }}>
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
            <button onClick={scrollToForm} className="btn" style={{ width: '100%', background: 'transparent', color: 'var(--color-text)', border: '1px solid var(--color-border)', boxShadow: 'none' }}>
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
            <button onClick={scrollToForm} className="btn" style={{ width: '100%', background: 'var(--color-primary)', color: '#fff', boxShadow: '0 4px 16px rgba(15,43,74,0.3)' }}>
              Reserve Pro Access
            </button>
          </div>
        </div>

        <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.85rem', marginTop: '1.5rem' }}>
          Founding Members get 30 days of Pro features completely free at launch. No credit card needed.
        </p>
      </section>

      {/* ─── FAQ ─── */}
      <section id="faq" className="container" style={{ padding: '0 1.5rem 4rem', maxWidth: '760px' }}>
        <div className="section-title" data-animate>
          <h2>Frequently asked questions</h2>
          <p>Everything you need to know about Cresoa.</p>
        </div>
        <div data-animate>
          {faqs.map((item, i) => (
            <div key={i} className="faq-item">
              <div className="faq-header" onClick={() => toggleFaq(i)}>
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
          <p>
            Join 47 Nigerian founders already on the waitlist. Founding Members get 30 days of Pro features free at launch.
          </p>

          <div className="kit-form-slot" id="waitlist-form-final">
            <Script
              id="kit-form-final"
              async
              data-uid="4b0964dc7c"
              src="https://cresoa.kit.com/4b0964dc7c/index.js"
              strategy="afterInteractive"
            />
          </div>

          <p style={{ marginTop: '1rem', color: '#93A8C0', fontSize: '0.78rem' }}>
            No credit card. No spam. Cancel anytime.
          </p>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="footer">
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
            <span><strong style={{ color: 'var(--color-text)' }}>Cresoa</strong> · Built in Nigeria for Nigerian businesses</span>
          </div>
          <div className="links">
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
