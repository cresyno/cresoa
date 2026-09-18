'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Logo from '../../components/Logo'
import ThemeToggle from '../../components/ThemeToggle'
import WaitlistForm from '../../components/WaitlistForm'
import { SITE_CONFIG } from '../../lib/siteConfig'

const ICONS = {
  menu: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>,
  x: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  arrowRight: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>,
  scissors: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/><line x1="8.12" y1="8.12" x2="12" y2="12"/></svg>,
  tool: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>,
  printer: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>,
}

const CATEGORY_COLORS = {
  'Business Tips': '#C99B2B',
  'Customer Retention': '#1A3F66',
  'Fashion Business': '#B85C6E',
  'Marketing Tips': '#2E7D7A',
}

function getCategoryColor(category) {
  return CATEGORY_COLORS[category] || '#C99B2B'
}

function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
}

function PostCover({ post, size = 'default' }) {
  const [errored, setErrored] = useState(false)
  const color = getCategoryColor(post.category)
  const showImage = post.image && !errored

  if (showImage) {
    return (
      <div className={`cover cover--${size}`}>
        <img
          src={post.image}
          alt={post.title}
          loading="lazy"
          onError={() => setErrored(true)}
        />
      </div>
    )
  }

  return (
    <div className={`cover cover--${size} cover--fallback`} style={{ background: `linear-gradient(135deg, ${color}, ${color}dd)` }}>
      <span className="cover-category" style={{ color: '#fff' }}>{post.category}</span>
    </div>
  )
}

export default function BlogContent({ posts }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [activeCategory, setActiveCategory] = useState('All')

  const closeMobileMenu = () => setMobileMenuOpen(false)

  const scrollToForm = (e) => {
    if (e) e.preventDefault()
    const el = document.getElementById('blog-waitlist-form')
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
  }, [activeCategory])

  // Sort newest first, keep stable order for ties
  const sortedPosts = [...posts].sort((a, b) => new Date(b.date) - new Date(a.date))
  const categories = ['All', ...Array.from(new Set(posts.map((p) => p.category)))]

  const filtered = activeCategory === 'All'
    ? sortedPosts
    : sortedPosts.filter((p) => p.category === activeCategory)

  const featured = activeCategory === 'All' ? filtered[0] : null
  const remaining = activeCategory === 'All' ? filtered.slice(1) : filtered

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
        .hero { background: var(--bg); padding: 3.5rem 1.5rem 3rem; border-bottom: 1px solid var(--border); }
        .hero-inner { max-width: 900px; margin: 0 auto; text-align: left; }
        .hero-eyebrow { display: inline-block; font-size: 0.72rem; font-weight: 600; letter-spacing: 0.18em; text-transform: uppercase; color: var(--gold); margin-bottom: 1.4rem; }
        .hero h1 { font-size: 3rem; line-height: 1.08; letter-spacing: -0.035em; margin: 0 0 1.2rem; }
        .hero p { color: var(--text-muted); font-size: 1.1rem; line-height: 1.7; margin: 0; max-width: 680px; }

        /* Filter */
        .filter { background: var(--bg); padding: 1.75rem 1.5rem 0.5rem; position: sticky; top: 60px; z-index: 100; backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); }
        [data-theme="dark"] .filter { background: rgba(10,10,15,0.9); }
        .filter-inner {
          max-width: 1180px; margin: 0 auto; display: flex; gap: 0.5rem;
          overflow-x: auto; scrollbar-width: none;
          scroll-snap-type: x proximity;
          padding-bottom: 1.5rem; border-bottom: 1px solid var(--border);
        }
        .filter-inner::-webkit-scrollbar { display: none; }
        .filter-pill {
          flex-shrink: 0; scroll-snap-align: start;
          padding: 0.55rem 1.1rem; border-radius: 100px;
          background: transparent; border: 1px solid var(--border-strong);
          color: var(--text-muted); font-family: inherit; font-size: 0.85rem; font-weight: 600;
          cursor: pointer;
          transition: background 0.2s, color 0.2s, border-color 0.2s, transform 0.2s;
        }
        .filter-pill:hover { color: var(--text); border-color: var(--text); transform: translateY(-1px); }
        .filter-pill.active { background: var(--bg-dark); color: #fff; border-color: var(--bg-dark); }
        [data-theme="dark"] .filter-pill.active { background: var(--gold); color: var(--bg-darkest); border-color: var(--gold); }

        /* Featured */
        .featured { background: var(--bg); padding: 3rem 1.5rem 1rem; }
        .featured-inner { max-width: 1180px; margin: 0 auto; }
        .featured-card {
          display: grid; grid-template-columns: 1.05fr 0.95fr; gap: 0;
          background: var(--card); border: 1px solid var(--border); border-radius: 22px;
          overflow: hidden; text-decoration: none; color: inherit;
          transition: border-color 0.3s, transform 0.4s cubic-bezier(0.16,1,0.3,1), box-shadow 0.4s;
        }
        .featured-card:hover { border-color: var(--border-strong); transform: translateY(-3px); box-shadow: 0 30px 60px rgba(15,43,74,0.10); }
        .featured-content { padding: 3rem 2.5rem; display: flex; flex-direction: column; justify-content: center; }
        .featured-badge { display: inline-flex; align-items: center; gap: 0.5rem; font-size: 0.68rem; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: var(--gold); margin-bottom: 1.2rem; }
        .featured-badge::before { content: ''; width: 6px; height: 6px; border-radius: 50%; background: var(--gold); }
        .featured-card h2 { font-size: 1.85rem; line-height: 1.2; margin: 0 0 1rem; letter-spacing: -0.025em; color: var(--text); }
        .featured-card .excerpt { color: var(--text-muted); font-size: 1rem; line-height: 1.7; margin: 0 0 1.6rem; }
        .featured-meta { display: flex; align-items: center; gap: 0.5rem; color: var(--text-muted); font-size: 0.83rem; flex-wrap: wrap; }
        .featured-meta strong { color: var(--text); font-weight: 600; }
        .featured-meta .dot { opacity: 0.4; }

        /* Cover */
        .cover { position: relative; overflow: hidden; background: #EFEAE1; }
        [data-theme="dark"] .cover { background: #1B1B24; }
        .cover--default { aspect-ratio: 4 / 3; }
        .cover--tall { aspect-ratio: 3 / 4; }
        .cover--featured { aspect-ratio: auto; min-height: 100%; height: 100%; }
        .cover img { width: 100%; height: 100%; object-fit: cover; object-position: center; display: block; }
        .cover--fallback { display: flex; align-items: flex-end; padding: 1.5rem; }
        .cover-category { font-family: 'Fraunces', serif; font-size: 1.5rem; font-weight: 700; letter-spacing: -0.02em; line-height: 1.1; max-width: 200px; }

        /* Grid */
        .grid-section { background: var(--bg); padding: 3rem 1.5rem 5rem; }
        .grid-inner { max-width: 1180px; margin: 0 auto; }
        .grid-head { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 2rem; gap: 1rem; flex-wrap: wrap; }
        .grid-head h2 { font-size: 1.5rem; margin: 0; color: var(--text); }
        .grid-head .count { color: var(--text-muted); font-size: 0.85rem; }
        .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem; }
        .card {
          display: flex; flex-direction: column;
          background: var(--card); border: 1px solid var(--border); border-radius: 18px;
          overflow: hidden; text-decoration: none; color: inherit;
          transition: border-color 0.3s, transform 0.4s cubic-bezier(0.16,1,0.3,1), box-shadow 0.4s;
        }
        .card:hover { border-color: var(--border-strong); transform: translateY(-4px); box-shadow: 0 24px 50px rgba(15,43,74,0.10); }
        .card:hover h3 { color: var(--gold); }
        .card-body { padding: 1.6rem 1.6rem 1.7rem; display: flex; flex-direction: column; flex: 1; }
        .card-category { display: inline-block; font-size: 0.68rem; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: var(--gold); margin-bottom: 0.85rem; }
        .card h3 { font-size: 1.15rem; line-height: 1.3; margin: 0 0 0.75rem; letter-spacing: -0.02em; color: var(--text); transition: color 0.2s; }
        .card .excerpt { color: var(--text-muted); font-size: 0.92rem; line-height: 1.6; margin: 0 0 1.4rem; flex: 1; }
        .card-meta { display: flex; align-items: center; gap: 0.45rem; color: var(--text-muted); font-size: 0.78rem; flex-wrap: wrap; padding-top: 1rem; border-top: 1px solid var(--border); }
        .card-meta .dot { opacity: 0.4; }

        .empty { padding: 4rem 1.5rem; text-align: center; color: var(--text-muted); font-size: 0.95rem; }
        .empty strong { color: var(--text); display: block; font-size: 1.1rem; margin-bottom: 0.5rem; font-family: 'Fraunces', serif; }

        /* Waitlist strip */
        .waitlist-strip { background: linear-gradient(170deg, #0F2B4A 0%, #061A2E 100%); padding: 6rem 1.5rem; text-align: center; position: relative; overflow: hidden; }
        .waitlist-strip::before { content: ''; position: absolute; top: -40%; left: 50%; transform: translateX(-50%); width: 700px; height: 700px; background: radial-gradient(circle, rgba(201,155,43,0.10), transparent 60%); border-radius: 50%; pointer-events: none; }
        .waitlist-inner { position: relative; max-width: 620px; margin: 0 auto; }
        .waitlist-strip .eyebrow { display: inline-block; font-size: 0.7rem; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; color: var(--gold-bright); margin-bottom: 1.1rem; }
        .waitlist-strip h2 { color: #fff; font-size: 2rem; margin: 0 0 1rem; line-height: 1.2; letter-spacing: -0.025em; }
        .waitlist-strip > .waitlist-inner > p { color: #A8B8CE; font-size: 1rem; margin: 0 0 2.2rem; line-height: 1.7; }

        /* Cross-sell */
        .cross { background: var(--bg-alt); padding: 6rem 1.5rem; border-top: 1px solid var(--border); }
        .cross-head { max-width: 640px; margin: 0 auto 3rem; text-align: center; }
        .cross-head .eyebrow { display: inline-block; font-size: 0.7rem; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; color: var(--gold); margin-bottom: 1.1rem; }
        .cross-head h2 { font-size: 2rem; margin: 0 0 0.9rem; line-height: 1.2; }
        .cross-head p { color: var(--text-muted); font-size: 1rem; margin: 0; line-height: 1.65; }
        .cross-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem; max-width: 1080px; margin: 0 auto; }
        .cross-card { display: block; text-decoration: none; background: var(--card); border: 1px solid var(--border); border-radius: 16px; padding: 1.8rem 1.6rem; transition: border-color 0.3s, transform 0.3s, box-shadow 0.3s; }
        .cross-card:hover { border-color: var(--gold); transform: translateY(-3px); box-shadow: 0 20px 40px rgba(15,43,74,0.08); }
        .cross-icon { width: 44px; height: 44px; border-radius: 12px; background: rgba(201,155,43,0.1); color: var(--gold); display: flex; align-items: center; justify-content: center; margin-bottom: 1.2rem; }
        .cross-card h3 { font-size: 1.1rem; margin: 0 0 0.5rem; color: var(--text); line-height: 1.3; }
        .cross-card p { color: var(--text-muted); font-size: 0.9rem; line-height: 1.6; margin: 0 0 1rem; }
        .cross-arrow { display: inline-flex; align-items: center; gap: 0.5rem; color: var(--gold); font-weight: 600; font-size: 0.85rem; }

        /* Final CTA */
        .cta { background: linear-gradient(170deg, #0F2B4A 0%, #061A2E 100%); padding: 7rem 1.5rem; text-align: center; position: relative; overflow: hidden; }
        .cta::before { content: ''; position: absolute; top: -40%; left: 50%; transform: translateX(-50%); width: 800px; height: 800px; background: radial-gradient(circle, rgba(201,155,43,0.12), transparent 60%); border-radius: 50%; pointer-events: none; }
        .cta-inner { position: relative; max-width: 620px; margin: 0 auto; }
        .cta h2 { color: #fff; font-size: 2.2rem; margin: 0 0 1rem; line-height: 1.15; letter-spacing: -0.03em; }
        .cta p { color: #A8B8CE; font-size: 1.05rem; margin: 0 0 2.4rem; line-height: 1.7; }

        /* Footer */
        .footer { background: var(--bg); border-top: 1px solid var(--border); padding: 3.5rem 1.5rem 2rem; text-align: center; color: var(--text-muted); font-size: 0.82rem; }
        .footer-links { display: flex; justify-content: center; gap: 0.4rem 1.2rem; flex-wrap: wrap; margin: 1.4rem 0; }
        .footer-links a, .footer-links button { color: var(--text); text-decoration: none; transition: color 0.2s; background: none; border: none; cursor: pointer; font-size: 0.85rem; padding: 0.2rem 0.3rem; font-family: inherit; }
        .footer-links a:hover, .footer-links button:hover { color: var(--gold); }

        /* Responsive */
           @media (max-width: 960px) {
          .hero h1 { font-size: 2.4rem; }
          .featured-card { grid-template-columns: 1fr; }
          .cover--featured { aspect-ratio: 16 / 10; min-height: auto; }
          .featured-content { padding: 2rem 1.6rem; }
          .featured-card h2 { font-size: 1.5rem; }
          .grid { grid-template-columns: repeat(2, 1fr); }
          .cross-grid { grid-template-columns: 1fr; }
          .waitlist-strip { padding: 5rem 1.25rem; }
          .waitlist-strip h2 { font-size: 1.7rem; }
          .cross { padding: 5rem 1.25rem; }
          .cross-head h2 { font-size: 1.7rem; }
          .cta { padding: 5rem 1.25rem; }
          .cta h2 { font-size: 1.75rem; }
        }
        @media (max-width: 720px) {
          .navbar .nav-links { display: none; }
          .navbar .nav-actions .login-link { display: none; }
          .hamburger { display: inline-flex; align-items: center; }
          .hero { padding: 2.5rem 1.25rem 2rem; }
          .hero h1 { font-size: 1.9rem; }
          .hero p { font-size: 1rem; }
          .filter { top: 58px; padding: 1.25rem 1.25rem 0; }
          .grid { grid-template-columns: 1fr; }
          .grid-section { padding: 2rem 1.25rem 4rem; }
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
          <Link href="/blog" className="nav-link active">Blog</Link>
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
          <span className="current">Blog</span>
        </div>
      </nav>

      {/* HERO */}
      <section className="hero">
        <div className="hero-inner">
          <span className="hero-eyebrow" data-reveal>Cresoa Blog</span>
          <h1 data-reveal data-delay="1">Business guides for Nigerian SMEs</h1>
          <p data-reveal data-delay="2">Practical, no-fluff guides on running a business in Nigeria — from invoices to customer retention to scaling your shop.</p>
        </div>
      </section>

      {/* FILTER */}
      <div className="filter">
        <div className="filter-inner" role="tablist" aria-label="Filter posts by category">
          {categories.map((cat) => (
            <button
              key={cat}
              role="tab"
              aria-selected={activeCategory === cat}
              onClick={() => setActiveCategory(cat)}
              className={`filter-pill ${activeCategory === cat ? 'active' : ''}`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* FEATURED */}
      {featured && (
        <section className="featured" aria-label="Featured post">
          <div className="featured-inner">
            <Link href={`/blog/${featured.slug}`} className="featured-card" data-reveal>
              <div className="featured-content">
                <span className="featured-badge">Latest</span>
                <h2>{featured.title}</h2>
                <p className="excerpt">{featured.excerpt}</p>
                <div className="featured-meta">
                  <strong>By Taiwo A. Feranmi</strong>
                  <span className="dot">·</span>
                  <span>{formatDate(featured.date)}</span>
                  <span className="dot">·</span>
                  <span>{featured.readTime}</span>
                </div>
              </div>
              <PostCover post={featured} size="featured" />
            </Link>
          </div>
        </section>
      )}

      {/* GRID */}
      <section className="grid-section" aria-label="All posts">
        <div className="grid-inner">
          <div className="grid-head">
            <h2>{activeCategory === 'All' ? 'All guides' : activeCategory}</h2>
            <span className="count">{filtered.length} {filtered.length === 1 ? 'article' : 'articles'}</span>
          </div>

          {remaining.length > 0 ? (
            <div className="grid">
              {remaining.map((post, i) => (
                <Link
                  key={post.slug}
                  href={`/blog/${post.slug}`}
                  className="card"
                  data-reveal
                  data-delay={i % 3 === 1 ? '1' : i % 3 === 2 ? '2' : undefined}
                >
                  <PostCover post={post} size="default" />
                  <div className="card-body">
                    <span className="card-category" style={{ color: getCategoryColor(post.category) }}>
                      {post.category}
                    </span>
                    <h3>{post.title}</h3>
                    <p className="excerpt">{post.excerpt}</p>
                    <div className="card-meta">
                      <span>By Taiwo A. Feranmi</span>
                      <span className="dot">·</span>
                      <span>{formatDate(post.date)}</span>
                      <span className="dot">·</span>
                      <span>{post.readTime}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : !featured && filtered.length === 0 ? (
            <div className="empty">
              <strong>No guides in this category yet.</strong>
              <p>Try another category or check back soon.</p>
            </div>
          ) : null}
        </div>
      </section>

      {/* WAITLIST STRIP */}
      <section className="waitlist-strip" aria-labelledby="waitlist-heading">
        <div className="waitlist-inner">
          <span className="eyebrow" data-reveal>Join the Waitlist</span>
          <h2 id="waitlist-heading" data-reveal data-delay="1">We&apos;re building Cresoa for Nigerian businesses.</h2>
          <p data-reveal data-delay="2">Join the waitlist for early access and Beta access free for 30 days at launch. No spam — only real updates.</p>
          <div id="blog-waitlist-form" data-reveal data-delay="3">
            <WaitlistForm />
          </div>
        </div>
      </section>

      {/* CROSS-SELL */}
      <section className="cross" aria-labelledby="cross-heading">
        <div className="cross-head" data-reveal>
          <span className="eyebrow">More from Cresoa</span>
          <h2 id="cross-heading">See what we&apos;re building.</h2>
          <p>Different industries, one workspace.</p>
        </div>
        <div className="cross-grid">
          <Link href="/fashion" className="cross-card" data-reveal>
            <div className="cross-icon">{ICONS.scissors}</div>
            <h3>Fashion &amp; Tailoring</h3>
            <p>Manage measurements, Aso-Ebi orders, and production in one workspace.</p>
            <span className="cross-arrow">Explore fashion {ICONS.arrowRight}</span>
          </Link>
          <Link href="/repairs" className="cross-card" data-reveal data-delay="1">
            <div className="cross-icon">{ICONS.tool}</div>
            <h3>Repairs &amp; Technical</h3>
            <p>Track devices, parts, pickup dates, and payment balances.</p>
            <span className="cross-arrow">Explore repairs {ICONS.arrowRight}</span>
          </Link>
          <Link href="/printing" className="cross-card" data-reveal data-delay="2">
            <div className="cross-icon">{ICONS.printer}</div>
            <h3>Printing &amp; Signage</h3>
            <p>Queue print jobs and notify customers when orders are ready.</p>
            <span className="cross-arrow">Explore printing {ICONS.arrowRight}</span>
          </Link>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="cta" aria-labelledby="cta-heading">
        <div className="cta-inner">
          <h2 id="cta-heading" data-reveal>Ready to bring order to your business?</h2>
          <p data-reveal data-delay="1">Join {SITE_CONFIG.foundingMembers} Nigerian founders already on the waitlist. Beta access is free for 30 days at launch.</p>
          <div data-reveal data-delay="2">
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
