'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Logo from './Logo'
import ThemeToggle from './ThemeToggle'
import WaitlistForm from './WaitlistForm'

const ICONS = {
  menu: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>,
  x: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  arrowRight: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>,
  whatsapp: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>,
  twitter: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>,
  link: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>,
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
  return new Date(dateString).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })
}

function ShareRow({ title }) {
  const [copied, setCopied] = useState(false)
  const [url, setUrl] = useState('')

  useEffect(() => {
    if (typeof window !== 'undefined') setUrl(window.location.href)
  }, [])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  const waHref = `https://wa.me/?text=${encodeURIComponent(`${title} — ${url}`)}`
  const twHref = `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`

  return (
    <div className="share-row">
      <span className="share-label">Share this guide</span>
      <div className="share-buttons">
        <a href={waHref} target="_blank" rel="noopener noreferrer" className="share-btn" aria-label="Share on WhatsApp">
          {ICONS.whatsapp} <span>WhatsApp</span>
        </a>
        <a href={twHref} target="_blank" rel="noopener noreferrer" className="share-btn" aria-label="Share on X">
          {ICONS.twitter} <span>Post</span>
        </a>
        <button onClick={handleCopy} className="share-btn" aria-label="Copy link">
          {ICONS.link} <span>{copied ? 'Copied' : 'Copy link'}</span>
        </button>
      </div>
    </div>
  )
}

function PostCover({ post }) {
  const [errored, setErrored] = useState(false)
  const color = getCategoryColor(post.category)
  const showImage = post.image && !errored

  if (showImage) {
    return (
      <div className="post-cover">
        <img src={post.image} alt={post.title} loading="eager" onError={() => setErrored(true)} />
      </div>
    )
  }

  return (
    <div className="post-cover post-cover--fallback" style={{ background: `linear-gradient(135deg, ${color}, ${color}dd)` }}>
      <span className="post-cover-category">{post.category}</span>
    </div>
  )
}

export default function PostLayout({ post, faqs, relatedPosts, children }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const closeMobileMenu = () => setMobileMenuOpen(false)

  const scrollToForm = (e) => {
    if (e) e.preventDefault()
    const el = document.getElementById('post-waitlist-form')
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

  const categoryColor = getCategoryColor(post.category)

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
        .breadcrumb-inner { max-width: 1180px; margin: 0 auto; display: flex; align-items: center; gap: 0.5rem; font-size: 0.82rem; color: var(--text-muted); flex-wrap: wrap; }
        .breadcrumb-inner a { color: var(--text-muted); text-decoration: none; transition: color 0.2s; }
        .breadcrumb-inner a:hover { color: var(--gold); }
        .breadcrumb-inner .sep { opacity: 0.5; }
        .breadcrumb-inner .current { color: var(--text); font-weight: 500; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

        /* Post hero */
        .post-hero { background: var(--bg); padding: 2rem 1.5rem 0; }
        .post-hero-inner { max-width: 760px; margin: 0 auto; }
        .post-category { display: inline-block; font-size: 0.72rem; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; margin-bottom: 1.2rem; }
        .post-title { font-size: 2.6rem; line-height: 1.15; letter-spacing: -0.03em; margin: 0 0 1.4rem; }
        .post-meta { display: flex; align-items: center; gap: 0.6rem; color: var(--text-muted); font-size: 0.88rem; flex-wrap: wrap; margin-bottom: 2rem; }
        .post-meta .byline { color: var(--text); font-weight: 600; }
        .post-meta .dot { opacity: 0.4; }

        /* Cover */
        .post-cover-wrap { max-width: 960px; margin: 0 auto; padding: 0 1.5rem; }
        .post-cover { aspect-ratio: 16 / 9; border-radius: 20px; overflow: hidden; background: #EFEAE1; margin-bottom: 3rem; }
        [data-theme="dark"] .post-cover { background: #1B1B24; }
        .post-cover img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .post-cover--fallback { display: flex; align-items: center; justify-content: center; padding: 2rem; }
        .post-cover-category { font-family: 'Fraunces', serif; font-size: 2rem; font-weight: 700; color: #fff; letter-spacing: -0.02em; text-align: center; }

        /* Article */
        .article { background: var(--bg); padding: 0 1.5rem 4rem; }
        .article-inner { max-width: 720px; margin: 0 auto; font-size: 1.08rem; line-height: 1.8; color: var(--text); }
        .article-inner p { margin: 0 0 1.4rem; }
        .article-inner h2 { font-size: 1.85rem; line-height: 1.2; margin: 3rem 0 1.2rem; letter-spacing: -0.025em; }
        .article-inner h3 { font-size: 1.35rem; line-height: 1.25; margin: 2.4rem 0 0.9rem; letter-spacing: -0.02em; }
        .article-inner strong { color: var(--text); font-weight: 700; }
        .article-inner em { font-style: italic; }
        .article-inner a { color: var(--gold); font-weight: 600; text-decoration: underline; text-decoration-thickness: 1px; text-underline-offset: 2px; transition: color 0.2s; }
        .article-inner a:hover { color: var(--gold-bright); }
        .article-inner ul, .article-inner ol { padding-left: 1.6rem; margin: 0 0 1.6rem; }
        .article-inner li { margin-bottom: 0.6rem; line-height: 1.75; }
        .article-inner blockquote {
          border-left: 3px solid var(--gold);
          padding: 0.6rem 0 0.6rem 1.4rem;
          margin: 1.8rem 0;
          font-style: italic;
          color: var(--text-muted);
          font-size: 1.15rem;
          line-height: 1.6;
        }
        .article-inner table {
          width: 100%; border-collapse: collapse; margin: 1.8rem 0;
          font-size: 0.94rem; line-height: 1.6;
          display: block; overflow-x: auto;
        }
        .article-inner th {
          border-bottom: 2px solid var(--border-strong);
          padding: 0.75rem 0.6rem; text-align: left; font-weight: 700;
          color: var(--text); white-space: nowrap; background: var(--bg-alt);
        }
        .article-inner td {
          border-bottom: 1px solid var(--border);
          padding: 0.75rem 0.6rem; text-align: left; vertical-align: top;
        }
        .article-inner img { max-width: 100%; height: auto; border-radius: 12px; margin: 1.5rem 0; }

        /* Share row */
        .share-row { max-width: 720px; margin: 3rem auto 0; padding: 2rem 0 0; border-top: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; gap: 1.5rem; flex-wrap: wrap; }
        .share-label { font-size: 0.82rem; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: var(--text-muted); }
        .share-buttons { display: flex; gap: 0.6rem; flex-wrap: wrap; }
        .share-btn { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.55rem 1rem; border-radius: 100px; background: var(--card); border: 1px solid var(--border); color: var(--text); font-family: inherit; font-size: 0.85rem; font-weight: 500; text-decoration: none; cursor: pointer; transition: border-color 0.2s, color 0.2s, background 0.2s; }
        .share-btn:hover { border-color: var(--gold); color: var(--gold); }

        /* Author */
        .author { background: var(--bg-alt); padding: 5rem 1.5rem; border-top: 1px solid var(--border); }
        .author-inner { max-width: 720px; margin: 0 auto; display: grid; grid-template-columns: auto 1fr; gap: 1.8rem; align-items: center; }
        .author-photo { width: 88px; height: 88px; border-radius: 50%; object-fit: cover; box-shadow: 0 8px 24px rgba(15,43,74,0.10); }
        .author-label { display: inline-block; font-size: 0.68rem; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: var(--gold); margin-bottom: 0.6rem; }
        .author h3 { font-size: 1.25rem; margin: 0 0 0.4rem; line-height: 1.3; }
        .author p { color: var(--text-muted); font-size: 0.94rem; line-height: 1.65; margin: 0; }
        .author a { color: var(--gold); font-weight: 600; text-decoration: underline; }

        /* Related */
        .related { background: var(--bg-alt); padding: 0 1.5rem 6rem; border-bottom: 1px solid var(--border); }
        .related-inner { max-width: 1180px; margin: 0 auto; padding-top: 4rem; border-top: 1px solid var(--border); }
        .related-head { margin-bottom: 2.5rem; }
        .related-head .eyebrow { display: inline-block; font-size: 0.68rem; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: var(--gold); margin-bottom: 0.9rem; }
        .related-head h2 { font-size: 1.75rem; margin: 0; line-height: 1.2; }
        .related-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem; }
        .rel-card { display: flex; flex-direction: column; background: var(--card); border: 1px solid var(--border); border-radius: 16px; overflow: hidden; text-decoration: none; color: inherit; transition: border-color 0.3s, transform 0.4s cubic-bezier(0.16,1,0.3,1), box-shadow 0.4s; }
        .rel-card:hover { border-color: var(--border-strong); transform: translateY(-4px); box-shadow: 0 20px 40px rgba(15,43,74,0.08); }
        .rel-cover { aspect-ratio: 16 / 10; overflow: hidden; background: #EFEAE1; }
        [data-theme="dark"] .rel-cover { background: #1B1B24; }
        .rel-cover img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .rel-cover--fallback { display: flex; align-items: flex-end; padding: 1rem; }
        .rel-cover--fallback span { font-family: 'Fraunces', serif; font-size: 1.1rem; font-weight: 700; color: #fff; letter-spacing: -0.02em; }
        .rel-body { padding: 1.3rem 1.3rem 1.4rem; flex: 1; display: flex; flex-direction: column; }
        .rel-cat { display: inline-block; font-size: 0.65rem; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: var(--gold); margin-bottom: 0.7rem; }
        .rel-body h3 { font-size: 1rem; line-height: 1.35; margin: 0 0 0.7rem; letter-spacing: -0.015em; color: var(--text); flex: 1; }
        .rel-meta { color: var(--text-muted); font-size: 0.76rem; display: flex; gap: 0.4rem; flex-wrap: wrap; padding-top: 0.9rem; border-top: 1px solid var(--border); }
        .rel-meta .dot { opacity: 0.4; }

        /* Waitlist strip */
        .waitlist-strip { background: linear-gradient(170deg, #0F2B4A 0%, #061A2E 100%); padding: 6rem 1.5rem; text-align: center; position: relative; overflow: hidden; }
        .waitlist-strip::before { content: ''; position: absolute; top: -40%; left: 50%; transform: translateX(-50%); width: 700px; height: 700px; background: radial-gradient(circle, rgba(201,155,43,0.10), transparent 60%); border-radius: 50%; pointer-events: none; }
        .waitlist-inner { position: relative; max-width: 620px; margin: 0 auto; }
        .waitlist-strip .eyebrow { display: inline-block; font-size: 0.7rem; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; color: var(--gold-bright); margin-bottom: 1.1rem; }
        .waitlist-strip h2 { color: #fff; font-size: 2rem; margin: 0 0 1rem; line-height: 1.2; letter-spacing: -0.025em; }
        .waitlist-strip > .waitlist-inner > p { color: #A8B8CE; font-size: 1rem; margin: 0 0 2.2rem; line-height: 1.7; }

        /* Footer */
        .footer { background: var(--bg); border-top: 1px solid var(--border); padding: 3.5rem 1.5rem 2rem; text-align: center; color: var(--text-muted); font-size: 0.82rem; }
        .footer-links { display: flex; justify-content: center; gap: 0.4rem 1.2rem; flex-wrap: wrap; margin: 1.4rem 0; }
        .footer-links a, .footer-links button { color: var(--text); text-decoration: none; transition: color 0.2s; background: none; border: none; cursor: pointer; font-size: 0.85rem; padding: 0.2rem 0.3rem; font-family: inherit; }
        .footer-links a:hover, .footer-links button:hover { color: var(--gold); }

        /* Responsive */
        @media (max-width: 960px) {
          .post-title { font-size: 2rem; }
          .post-cover { aspect-ratio: 16 / 10; margin-bottom: 2.5rem; }
          .article-inner { font-size: 1.02rem; }
          .article-inner h2 { font-size: 1.55rem; margin: 2.5rem 0 1rem; }
          .article-inner h3 { font-size: 1.2rem; }
          .author-inner { grid-template-columns: 1fr; text-align: left; gap: 1.2rem; }
          .author-photo { width: 72px; height: 72px; }
          .related-grid { grid-template-columns: 1fr; }
          .waitlist-strip { padding: 5rem 1.25rem; }
          .waitlist-strip h2 { font-size: 1.7rem; }
        }
        @media (max-width: 720px) {
          .navbar .nav-links { display: none; }
          .navbar .nav-actions .login-link { display: none; }
          .hamburger { display: inline-flex; align-items: center; }
          .post-hero { padding: 1.5rem 1.25rem 0; }
          .post-title { font-size: 1.7rem; }
          .article { padding: 0 1.25rem 3rem; }
          .share-row { flex-direction: column; align-items: flex-start; gap: 1rem; }
          .author { padding: 4rem 1.25rem; }
          .related { padding: 0 1.25rem 5rem; }
          .related-inner { padding-top: 3rem; }
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
          <Link href="/blog">Blog</Link>
          <span className="sep">/</span>
          <span className="current">{post.title}</span>
        </div>
      </nav>

      {/* POST HERO */}
      <section className="post-hero">
        <div className="post-hero-inner">
          <span className="post-category" style={{ color: categoryColor }} data-reveal>{post.category}</span>
          <h1 className="post-title" data-reveal data-delay="1">{post.title}</h1>
          <div className="post-meta" data-reveal data-delay="2">
            <span className="byline">By Taiwo A. Feranmi</span>
            <span className="dot">·</span>
            <span>{formatDate(post.date)}</span>
            <span className="dot">·</span>
            <span>{post.readTime}</span>
          </div>
        </div>
      </section>

      {/* COVER */}
      <div className="post-cover-wrap" data-reveal>
        <PostCover post={post} />
      </div>

      {/* ARTICLE */}
      <section className="article">
        <div className="article-inner">
          {children}
        </div>

        <div data-reveal>
          <ShareRow title={post.title} />
        </div>
      </section>

      {/* AUTHOR */}
      <section className="author">
        <div className="author-inner" data-reveal>
          <img src="/mockups/founder.webp" alt="Taiwo A. Feranmi" className="author-photo" loading="lazy" />
          <div>
            <span className="author-label">Written by</span>
            <h3>Taiwo A. Feranmi</h3>
            <p>
              Building Cresoa solo for Nigerian businesses. I write about the daily reality of running a small business in Nigeria — and how better tools can make it easier. <Link href="/">Read more about Cresoa</Link>.
            </p>
          </div>
        </div>
      </section>

      {/* RELATED */}
      {relatedPosts && relatedPosts.length > 0 && (
        <section className="related">
          <div className="related-inner">
            <div className="related-head" data-reveal>
              <span className="eyebrow">Keep Reading</span>
              <h2>More guides like this</h2>
            </div>
            <div className="related-grid">
              {relatedPosts.map((rp, i) => {
                const rc = getCategoryColor(rp.category)
                return (
                  <Link
                    key={rp.slug}
                    href={`/blog/${rp.slug}`}
                    className="rel-card"
                    data-reveal
                    data-delay={i === 1 ? '1' : i === 2 ? '2' : undefined}
                  >
                    <div className="rel-cover" style={{ background: rp.image ? '#EFEAE1' : `linear-gradient(135deg, ${rc}, ${rc}dd)` }}>
                      {rp.image ? (
                        <img src={rp.image} alt={rp.title} loading="lazy" />
                      ) : (
                        <div className="rel-cover--fallback" style={{ width: '100%', height: '100%' }}>
                          <span>{rp.category}</span>
                        </div>
                      )}
                    </div>
                    <div className="rel-body">
                      <span className="rel-cat" style={{ color: rc }}>{rp.category}</span>
                      <h3>{rp.title}</h3>
                      <div className="rel-meta">
                        <span>{formatDate(rp.date)}</span>
                        <span className="dot">·</span>
                        <span>{rp.readTime}</span>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {/* WAITLIST */}
      <section className="waitlist-strip" aria-labelledby="post-waitlist-heading">
        <div className="waitlist-inner">
          <span className="eyebrow" data-reveal>Join the Waitlist</span>
          <h2 id="post-waitlist-heading" data-reveal data-delay="1">We&apos;re building Cresoa for Nigerian businesses.</h2>
          <p data-reveal data-delay="2">Join the waitlist for early access and Beta access free for 30 days at launch.</p>
          <div id="post-waitlist-form" data-reveal data-delay="3">
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
