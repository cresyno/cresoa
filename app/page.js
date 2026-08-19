'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Logo from '../components/Logo'
import ThemeToggle from '../components/ThemeToggle'

// ─── Self-contained Icons (hardcoded SVGs) ─────────────────
const ICONS = {
  menu: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>,
  x: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  check: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  arrowRight: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>,
  users: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  layers: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>,
  globe: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>,
  clock: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  smartphone: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>,
  messageCircle: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>,
  tool: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>,
  building: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18"/><path d="M9 8h1"/><path d="M9 12h1"/><path d="M9 16h1"/><path d="M14 8h1"/><path d="M14 12h1"/><path d="M14 16h1"/><path d="M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16"/></svg>,
  fileText: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>,
  dollarSign: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="2" x2="12" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
  link: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>,
  barChart2: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  package: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16.5 9.4l-9-5.19M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>,
  calendar: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
}

export default function HomePage() {
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [counts, setCounts] = useState({ users: 0, industries: 0, days: 0 })
  const statsRef = useRef(null)

  const toggleMobileMenu = () => setMobileMenuOpen(!mobileMenuOpen)
  const closeMobileMenu = () => setMobileMenuOpen(false)

  const navigateTo = (path) => {
    router.push(path)
    closeMobileMenu()
  }

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

        .container { max-width: 1100px; margin: 0 auto; padding: 0 1.5rem; }

        /* ─── Buttons (pill-shaped, button elements) ─── */
        .btn {
          display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem;
          padding: 0.7rem 1.8rem; border-radius: 8px;
          font-weight: 600; font-size: 0.95rem;
          text-decoration: none; border: none; cursor: pointer;
          transition: all 0.25s ease;
          background: var(--color-accent); color: #0F2B4A;
          box-shadow: 0 4px 16px rgba(212,165,42,0.3);
          font-family: inherit;
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

        .nav-btn {
          display: inline-flex; align-items: center; justify-content: center;
          padding: 0.4rem 1rem; border-radius: 8px;
          font-size: 0.85rem; font-weight: 500; border: 1px solid var(--color-border);
          background: transparent; color: var(--color-text-muted);
          transition: all 0.2s ease; cursor: pointer; font-family: inherit;
        }
        .nav-btn:hover { border-color: var(--color-accent); color: var(--color-text); background: rgba(212,165,42,0.03); }
        .nav-btn-primary {
          background: var(--color-accent); color: #0F2B4A;
          border: 1px solid var(--color-accent); box-shadow: 0 4px 12px rgba(212,165,42,0.2);
        }
        .nav-btn-primary:hover { background: #C79A2B; border-color: #C79A2B; color: #0F2B4A; }

        /* ─── Navbar ─── */
        .navbar {
          background: var(--color-card);
          border-bottom: 1px solid var(--color-border);
          padding: 0.8rem 1.5rem;
          display: flex; justify-content: space-between; align-items: center;
          position: sticky; top: 0; z-index: 1000;
          backdrop-filter: blur(12px); flex-wrap: wrap; gap: 0.5rem;
        }
        .navbar .logo-container { display: flex; align-items: center; gap: 0.6rem; }
        .navbar .nav-links { display: flex; gap: 0.6rem; align-items: center; flex-wrap: wrap; }
        .navbar .nav-actions { display: flex; align-items: center; gap: 0.8rem; flex-wrap: wrap; }
        .hamburger {
          display: none; background: none; border: none;
          color: var(--color-text); cursor: pointer; padding: 0.2rem 0.5rem;
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
        .footer .links button { color: var(--color-text); text-decoration: none; transition: color 0.2s; background: none; border: none; cursor: pointer; font-family: inherit; font-size: 0.8rem; }
        .footer .links button:hover { color: var(--color-accent); }

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
          NAVIGATION
          ========================================================= */}
      <nav className="navbar">
        <div className="logo-container">
          <button onClick={() => navigateTo('/')} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <Logo variant="primary" size="large" />
          </button>
        </div>

        {/* Desktop Nav Buttons */}
        <div className="nav-links">
          <button onClick={(e) => scrollToSection(e, 'why')} className="nav-btn">Why Cresoa</button>
          <button onClick={(e) => scrollToSection(e, 'features')} className="nav-btn">Features</button>
          <button onClick={() => navigateTo('/pricing')} className="nav-btn">Pricing</button>
          <button onClick={(e) => scrollToSection(e, 'faq')} className="nav-btn">FAQ</button>
        </div>

        <div className="nav-actions">
          <ThemeToggle />
          <button onClick={() => navigateTo('/login')} style={{ color: 'var(--color-text-muted)', background: 'none', border: 'none', fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'inherit' }}>Log in</button>
          <button onClick={() => navigateTo('/signup')} className="nav-btn nav-btn-primary">Start Beta</button>
          <button className="hamburger" onClick={toggleMobileMenu}>
            {ICONS.menu}
          </button>
        </div>
      </nav>

      {/* Mobile Drawer */}
      <div className={`mobile-overlay ${mobileMenuOpen ? 'open' : ''}`} onClick={closeMobileMenu} />
      <div className={`mobile-drawer ${mobileMenuOpen ? 'open' : ''}`}>
        <button className="close-btn" onClick={closeMobileMenu}>
          {ICONS.x}
        </button>
        <button onClick={(e) => scrollToSection(e, 'why')} className="nav-btn">Why Cresoa</button>
        <button onClick={(e) => scrollToSection(e, 'features')} className="nav-btn">Features</button>
        <button onClick={() => navigateTo('/pricing')} className="nav-btn">Pricing</button>
        <button onClick={(e) => scrollToSection(e, 'faq')} className="nav-btn">FAQ</button>
        <button onClick={() => navigateTo('/login')} className="nav-btn">Log in</button>
        <button onClick={() => navigateTo('/signup')} className="nav-btn nav-btn-primary">Start Beta</button>
        <div style={{ paddingTop: '0.5rem' }}>
          <ThemeToggle />
        </div>
      </div>

      {/* =========================================================
          HERO
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
              <button onClick={() => navigateTo('/signup')} className="btn" style={{ fontSize: '1rem', padding: '0.9rem 2.5rem' }}>
                Start Beta {ICONS.arrowRight}
              </button>
              <button onClick={(e) => scrollToSection(e, 'features')} className="btn btn-outline" style={{ fontSize: '1rem', padding: '0.9rem 2rem' }}>
                Learn more
              </button>
            </div>
            <div className="trust-badges">
              <span>{ICONS.check} No credit card required</span>
              <span>{ICONS.check} 90-day beta</span>
              <span>{ICONS.check} Cancel anytime</span>
            </div>
            <div className="trust-bar">
              <span className="item">{ICONS.users} <strong>47</strong> beta users</span>
              <span className="item">{ICONS.layers} <strong>2</strong> industries live</span>
              <span className="item">{ICONS.smartphone} Mobile-first design</span>
              <span className="item">{ICONS.messageCircle} WhatsApp integration</span>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          WHY CRESOA
          ========================================================= */}
      <section id="why" className="container" style={{ padding: '3.5rem 1.5rem' }}>
        <div className="section-title">
          <h2>Why Nigerian businesses choose Cresoa</h2>
          <p>Real tools for real businesses. Built for your workflow.</p>
        </div>
        <div className="why-grid" ref={statsRef}>
          <div className="why-item">
            <div className="number">{ICONS.users} {counts.users}</div>
            <div className="label">Beta users</div>
          </div>
          <div className="why-item">
            <div className="number">{ICONS.layers} {counts.industries}</div>
            <div className="label">Industries live</div>
          </div>
          <div className="why-item">
            <div className="number">{ICONS.globe} 🇳🇬</div>
            <div className="label">Built in Nigeria</div>
          </div>
          <div className="why-item">
            <div className="number">{ICONS.clock} {counts.days}</div>
            <div className="label">Days of free access</div>
          </div>
          <div className="why-item">
            <div className="number">{ICONS.smartphone} 📱</div>
            <div className="label">Mobile-first</div>
          </div>
        </div>
      </section>

      {/* =========================================================
          FEATURES
          ========================================================= */}
      <section id="features" className="container" style={{ padding: '2rem 1.5rem 3.5rem' }}>
        <div className="section-title">
          <h2>Everything you need to run smoothly</h2>
          <p>One platform for your customers, orders, payments, and production.</p>
        </div>
        <div className="card-grid">
          {[
            { icon: 'users', title: 'Customer Management', desc: 'Store customer details, measurements, and history. Reuse them for every order. Never lose a customer again.' },
            { icon: 'fileText', title: 'Order & Job Tracking', desc: 'Track orders through every stage: Cutting, Sewing, Ready. For repairs: Diagnosing, Repairing, Ready.' },
            { icon: 'dollarSign', title: 'Payments & Balances', desc: 'Record deposits, track balances, and see who owes what instantly. Know your cash flow at a glance.' },
            { icon: 'link', title: 'Customer Tracking Links', desc: 'Give each customer a private link to check their order status 24/7. No more "is it ready?" calls.' },
            { icon: 'layers', title: 'Group / Aso-Ebi Orders', desc: 'Manage group orders with one coordinator, many members, and one deadline. Perfect for fashion businesses.' },
            { icon: 'messageCircle', title: 'WhatsApp Integration', desc: 'Share tracking links and updates directly to your customers WhatsApp. They will love it.' },
            { icon: 'barChart2', title: 'Analytics & Reports', desc: 'See your business performance at a glance. Revenue, orders, customer growth—all in one dashboard.' },
            { icon: 'package', title: 'Inventory Management', desc: 'Track parts and components for repair jobs. Get low-stock alerts and manage your inventory.' },
            { icon: 'calendar', title: 'Reminders & Notifications', desc: 'Automatically remind customers about pending payments or ready-for-pickup jobs.' },
          ].map((f, i) => (
            <div key={f.title} className="feature-card">
              <div className="icon-wrapper">
                {ICONS[f.icon] || ICONS.fileText}
              </div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* =========================================================
          INDUSTRIES
          ========================================================= */}
      <section className="container" style={{ padding: '1.5rem 1.5rem 3.5rem' }}>
        <div className="section-title">
          <h2>Built for the way you work</h2>
          <p>Cresoa adapts to different types of businesses—starting with these.</p>
        </div>
        <div className="card-grid">
          <div className="industry-card">
            <div className="icon-wrapper">{ICONS.layers}</div>
            <h3>Fashion & Custom Wear</h3>
            <p>Tailors, fashion designers, uniform makers. Manage customers, measurements, orders, and production.</p>
            <span className="tag tag-live">Live Now</span>
          </div>
          <div className="industry-card" style={{ borderColor: 'var(--color-accent)' }}>
            <div className="icon-wrapper">{ICONS.tool}</div>
            <h3>Repairs & Technical Services</h3>
            <p>Phone, laptop, and electronics repair. Track devices, jobs, parts, and payments.</p>
            <span className="tag tag-live">Live Now</span>
          </div>
          <div className="industry-card">
            <div className="icon-wrapper">{ICONS.building}</div>
            <h3>Custom Manufacturing</h3>
            <p>Furniture makers, metal fabricators, custom product creators. Manage projects and production.</p>
            <span className="tag tag-soon">Coming Soon</span>
          </div>
        </div>
      </section>

      {/* =========================================================
          HOW IT WORKS
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
              <span className="time">{ICONS.clock} 2 minutes</span>
            </div>
          </div>
          <div className="step-item">
            <span className="number">2</span>
            <div>
              <h4>Add customers & orders</h4>
              <p>Import your customers, add their details, and create your first order or repair job.</p>
              <span className="time">{ICONS.clock} 5 minutes</span>
            </div>
          </div>
          <div className="step-item">
            <span className="number">3</span>
            <div>
              <h4>Run your business</h4>
              <p>Track orders, send tracking links, record payments, and grow with confidence.</p>
              <span className="time">{ICONS.check} Start now</span>
            </div>
          </div>
        </div>
        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          <button onClick={() => navigateTo('/signup')} className="btn" style={{ fontSize: '1rem', padding: '0.9rem 2.5rem' }}>
            Start Beta {ICONS.arrowRight}
          </button>
        </div>
      </section>

      {/* =========================================================
          PRICING
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
              <li><span className="check">{ICONS.check}</span> 20 customers</li>
              <li><span className="check">{ICONS.check}</span> 50 orders</li>
              <li><span className="check">{ICONS.check}</span> Basic order tracking</li>
              <li><span className="cross">{ICONS.x}</span> Staff accounts</li>
              <li><span className="cross">{ICONS.x}</span> WhatsApp integration</li>
            </ul>
            <button onClick={() => navigateTo('/signup')} className="btn btn-outline" style={{ width: '100%', justifyContent: 'center' }}>
              Start Free
            </button>
          </div>

          <div className="pricing-card popular">
            <div className="popular-badge">Most Popular</div>
            <p className="plan-name">Starter</p>
            <div className="price">₦3,500 <span>/month</span></div>
            <p className="description">For growing businesses</p>
            <ul>
              <li><span className="check">{ICONS.check}</span> Unlimited customers</li>
              <li><span className="check">{ICONS.check}</span> Unlimited orders</li>
              <li><span className="check">{ICONS.check}</span> 2 staff accounts</li>
              <li><span className="check">{ICONS.check}</span> WhatsApp integration</li>
              <li><span className="check">{ICONS.check}</span> Customer tracking links</li>
            </ul>
            <button onClick={() => navigateTo('/signup')} className="btn" style={{ width: '100%', justifyContent: 'center' }}>
              Start Beta
            </button>
          </div>

          <div className="pricing-card">
            <p className="plan-name">Pro</p>
            <div className="price">₦9,500 <span>/month</span></div>
            <p className="description">For established businesses</p>
            <ul>
              <li><span className="check">{ICONS.check}</span> Everything in Starter</li>
              <li><span className="check">{ICONS.check}</span> 10 staff accounts</li>
              <li><span className="check">{ICONS.check}</span> Advanced analytics</li>
              <li><span className="check">{ICONS.check}</span> Data export (Excel/PDF)</li>
              <li><span className="check">{ICONS.check}</span> Priority support</li>
            </ul>
            <button onClick={() => navigateTo('/signup')} className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center' }}>
              Start Beta
            </button>
          </div>
        </div>
      </section>

      {/* =========================================================
          FAQ
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
          FINAL CTA
          ========================================================= */}
      <section className="final-cta">
        <h2>Ready to take control of your business?</h2>
        <p>Join 47 Nigerian SMEs already using Cresoa.</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.8rem', justifyContent: 'center' }}>
          <button onClick={() => navigateTo('/signup')} className="btn" style={{ fontSize: '1.05rem', padding: '0.9rem 2.5rem' }}>
            Start Beta {ICONS.arrowRight}
          </button>
          <button onClick={() => navigateTo('/login')} className="btn btn-outline" style={{ fontSize: '1.05rem', padding: '0.9rem 2rem', background: 'transparent', color: '#fff', borderColor: 'rgba(255,255,255,0.3)' }}>
            Log in
          </button>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', flexWrap: 'wrap', marginTop: '1.2rem', color: '#A0B4C9', fontSize: '0.75rem' }}>
          <span>{ICONS.check} 90-day beta</span>
          <span>{ICONS.check} No credit card</span>
          <span>{ICONS.check} Cancel anytime</span>
        </div>
      </section>

      {/* =========================================================
          FOOTER
          ========================================================= */}
      <footer className="footer">
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', flexWrap: 'wrap', marginBottom: '1.2rem' }}>
            <span><strong style={{ color: 'var(--color-text)' }}>Cresoa</strong> · Built in Nigeria for Nigerian businesses</span>
          </div>
          <div className="links">
            <button onClick={() => navigateTo('/login')}>Log in</button>
            <button onClick={() => navigateTo('/signup')}>Sign up</button>
            <button onClick={(e) => scrollToSection(e, 'why')}>Why Cresoa</button>
            <button onClick={(e) => scrollToSection(e, 'features')}>Features</button>
            <button onClick={() => navigateTo('/pricing')}>Pricing</button>
            <button onClick={(e) => scrollToSection(e, 'faq')}>FAQ</button>
          </div>
          <p style={{ opacity: 0.6, fontSize: '0.7rem', marginTop: '0.5rem' }}>
            © {new Date().getFullYear()} Cresoa · All rights reserved.
          </p>
        </div>
      </footer>
    </main>
  )
        }
