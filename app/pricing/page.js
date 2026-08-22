'use client';

import { useState } from 'react';
import Link from 'next/link';
import ThemeToggle from '../../components/ThemeToggle';
import Logo from '../../components/Logo';

// ─── Self-contained SVG icons ───
const Svg = ({ name, size = 20, stroke = 'currentColor', style }) => {
  const icons = {
    check: <polyline points="20 6 9 17 4 12" />,
    x: <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>,
    menu: <><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" /></>,
    arrowRight: <><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
      {icons[name]}
    </svg>
  );
};

export default function PricingPage() {
  // FAQ accordion state
  const [openFaq, setOpenFaq] = useState(null);
  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  // ─── FAQ items (exact wording per spec) ───────────────────
  const faqs = [
    {
      q: 'What happens when my Beta period ends?',
      a: 'Your business data (customers, orders, inventory) remains safe. Staff accounts will be automatically disabled if your new plan does not support staff accounts. You will be able to choose a paid plan that fits your business.',
    },
    {
      q: 'Can I change my plan?',
      a: 'Yes, you can upgrade or downgrade at any time from your dashboard. Your data stays intact regardless of your plan.',
    },
    {
      q: 'What happens to my data if I change plans?',
      a: 'Your data is never deleted. You only gain or lose access to features based on your current plan.',
    },
    {
      q: 'What happens when I reach my Free plan limits?',
      a: 'You won\'t lose any data. You\'ll be prompted to upgrade to Starter or Pro to add more customers, orders, or inventory.',
    },
    {
      q: 'How does Tessa\'s AI action limit work?',
      a: 'Each request to Tessa counts as one action. The limit resets monthly. You can see your remaining actions on your dashboard.',
    },
    {
      q: 'Can I cancel my subscription?',
      a: 'Yes, you can cancel at any time from your subscription page.',
    },
    {
      q: 'Can I add staff later?',
      a: 'Yes, staff accounts become available when you upgrade to a plan that includes them (Starter: 2, Pro: 10). You can invite and remove staff at any time.',
    },
  ];

  // ─── Feature comparison data (aligned with docs) ──────────────
  const features = [
    { name: 'Customer limit', free: '20', beta: '500', starter: '200', pro: 'Unlimited' },
    { name: 'Order/Job limit', free: '50', beta: '1000', starter: '500', pro: 'Unlimited' },
    { name: 'Inventory limit', free: '20', beta: '500', starter: '100', pro: 'Unlimited' },
    { name: 'Staff accounts', free: '0', beta: '10', starter: '2', pro: '10' },
    { name: 'Staff management', free: '✗', beta: '✓', starter: '✓', pro: '✓' },
    { name: 'Tessa AI actions / month', free: '5', beta: '200', starter: '50', pro: '500' },
    { name: 'Customer tracking links', free: '✗', beta: '✓', starter: '✓', pro: '✓' },
    { name: 'Bulk actions', free: '✗', beta: '✓', starter: '✓', pro: '✓' },
    { name: 'Data export (CSV)', free: '✗', beta: '✓', starter: '✓', pro: '✓' },
    { name: 'Advanced analytics', free: '✗', beta: '✓', starter: '✗', pro: '✓' },
    { name: 'Production workflow (custom stages)', free: '✓', beta: '✓', starter: '✓', pro: '✓' },
    { name: 'Priority support', free: '✗', beta: '✗', starter: '✗', pro: '✓' },
  ];

  const renderFeatureValue = (val) => {
    if (val === '✓') return <Svg name="check" size={16} stroke="var(--color-success)" />;
    if (val === '✗') return <Svg name="x" size={16} stroke="var(--color-danger)" />;
    return <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{val}</span>;
  };

  // ─── Mobile menu state ──────────────────────────────────────
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const toggleMobileMenu = () => setMobileMenuOpen(!mobileMenuOpen);
  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <div
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
          --color-accent: #D4A52A;
          --color-success: #2E7D5E;
          --color-danger: #D9534F;
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

        .container {
          max-width: 1100px;
          margin: 0 auto;
          padding: 0 1.5rem;
        }

        .navbar {
          background: var(--color-card);
          border-bottom: 1px solid var(--color-border);
          padding: 0.6rem 1.5rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          position: sticky;
          top: 0;
          z-index: 100;
          backdrop-filter: blur(12px);
        }
        .navbar .logo-container { display: flex; align-items: center; gap: 0.6rem; }
        .navbar .nav-links { display: flex; gap: 1.5rem; align-items: center; }
        .navbar .nav-links a {
          color: var(--color-text-muted);
          text-decoration: none;
          font-size: 0.85rem;
          font-weight: 500;
          transition: color 0.2s;
        }
        .navbar .nav-links a:hover { color: var(--color-accent); }
        .navbar .nav-actions { display: flex; align-items: center; gap: 0.8rem; }

        .hamburger {
          display: none;
          background: none;
          border: none;
          color: var(--color-text);
          font-size: 1.2rem;
          cursor: pointer;
          padding: 0.2rem 0.5rem;
        }

        .mobile-overlay {
          display: none;
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.4);
          z-index: 999;
          backdrop-filter: blur(4px);
        }
        .mobile-overlay.open { display: block; }
        .mobile-drawer {
          position: fixed;
          top: 0;
          left: 0;
          bottom: 0;
          width: 280px;
          background: var(--color-card);
          padding: 2rem 1.5rem;
          transform: translateX(-100%);
          transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          z-index: 1000;
          display: flex;
          flex-direction: column;
          gap: 1rem;
          border-right: 1px solid var(--color-border);
        }
        .mobile-drawer.open { transform: translateX(0); }
        .mobile-drawer .close-btn {
          align-self: flex-end;
          background: none;
          border: none;
          color: var(--color-text);
          font-size: 1.5rem;
          cursor: pointer;
        }
        .mobile-drawer a { color: var(--color-text); text-decoration: none; font-size: 1rem; font-weight: 500; }
        .mobile-drawer a:hover { color: var(--color-accent); }

        @media (max-width: 768px) {
          .navbar .nav-links { display: none; }
          .navbar .nav-actions .btn { display: none; }
          .hamburger { display: flex; align-items: center; }
        }

        .hero {
          padding: 3rem 1.5rem 2.5rem;
          text-align: center;
          background: var(--color-card);
          border-bottom: 1px solid var(--color-border);
        }
        .hero h1 {
          font-size: 2.5rem;
          font-weight: 700;
          color: var(--color-text);
          margin: 0 0 0.5rem;
          font-family: 'Fraunces', serif;
          letter-spacing: -0.02em;
        }
        .hero p {
          font-size: 1.1rem;
          color: var(--color-text-muted);
          max-width: 600px;
          margin: 0 auto;
          line-height: 1.6;
        }

        @media (max-width: 768px) {
          .hero h1 { font-size: 1.8rem; }
          .hero p { font-size: 1rem; }
        }

        .pricing-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 1.5rem;
          margin: 2rem 0;
        }
        .pricing-card {
          background: var(--color-card);
          border-radius: 16px;
          padding: 1.8rem 1.5rem;
          border: 1px solid var(--color-border);
          box-shadow: var(--shadow-sm);
          transition: all 0.25s ease;
          display: flex;
          flex-direction: column;
        }
        .pricing-card:hover {
          border-color: var(--color-accent);
          box-shadow: var(--shadow-lg);
          transform: translateY(-3px);
        }
        .pricing-card .plan-name {
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--color-text);
          margin: 0 0 0.2rem;
        }
        .pricing-card .tagline {
          font-size: 0.85rem;
          color: var(--color-text-muted);
          margin: 0 0 0.5rem;
        }
        .pricing-card .price {
          font-size: 2.2rem;
          font-weight: 700;
          color: var(--color-text);
          margin: 0.3rem 0;
        }
        .pricing-card .price span {
          font-size: 1rem;
          font-weight: 400;
          color: var(--color-text-muted);
        }
        .pricing-card .limits {
          font-size: 0.85rem;
          color: var(--color-text-muted);
          margin: 0.5rem 0 1rem;
          line-height: 1.6;
        }
        .pricing-card .limits strong {
          color: var(--color-text);
        }
        .pricing-card .features {
          list-style: none;
          padding: 0;
          margin: 0 0 1.5rem;
          flex: 1;
        }
        .pricing-card .features li {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.3rem 0;
          font-size: 0.9rem;
          color: var(--color-text);
          border-bottom: 1px solid var(--color-border);
        }
        .pricing-card .features li:last-child { border-bottom: none; }
        .pricing-card .cta {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.4rem;
          padding: 0.6rem 1.5rem;
          border-radius: 8px;
          font-weight: 600;
          font-size: 0.95rem;
          text-decoration: none;
          border: none;
          cursor: pointer;
          transition: all 0.2s ease;
          width: 100%;
          margin-top: auto;
        }
        .pricing-card .cta.primary {
          background: var(--color-primary);
          color: #fff;
        }
        .pricing-card .cta.primary:hover { opacity: 0.9; transform: translateY(-1px); }
        .pricing-card .cta.outline {
          background: transparent;
          color: var(--color-text);
          border: 1px solid var(--color-border);
        }
        .pricing-card .cta.outline:hover {
          border-color: var(--color-accent);
          background: var(--color-card);
        }
        .pricing-card .badge {
          display: inline-block;
          background: var(--color-accent);
          color: #0F2B4A;
          font-size: 0.6rem;
          font-weight: 700;
          padding: 0.2rem 0.8rem;
          border-radius: 20px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 0.5rem;
          align-self: flex-start;
        }

        .beta-section {
          background: var(--color-card);
          border-radius: 16px;
          padding: 2rem 1.5rem;
          border: 1px solid var(--color-border);
          margin: 2rem 0;
          text-align: center;
          box-shadow: var(--shadow-sm);
        }
        .beta-section h2 {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--color-text);
          margin: 0 0 0.5rem;
        }
        .beta-section p {
          color: var(--color-text-muted);
          max-width: 600px;
          margin: 0 auto 1.2rem;
          line-height: 1.6;
        }
        .beta-section .cta {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.7rem 2rem;
          border-radius: 8px;
          font-weight: 600;
          font-size: 0.95rem;
          text-decoration: none;
          background: var(--color-accent);
          color: #0F2B4A;
          transition: all 0.2s ease;
        }
        .beta-section .cta:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-md);
        }

        .comparison {
          margin: 3rem 0;
        }
        .comparison h2 {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--color-text);
          margin: 0 0 1.5rem;
          text-align: center;
        }
        .comparison-table {
          width: 100%;
          overflow-x: auto;
          border-collapse: collapse;
          font-size: 0.85rem;
        }
        .comparison-table th,
        .comparison-table td {
          padding: 0.6rem 0.8rem;
          text-align: left;
          border-bottom: 1px solid var(--color-border);
        }
        .comparison-table th {
          background: var(--color-card);
          font-weight: 600;
          color: var(--color-text);
          position: sticky;
          top: 0;
        }
        .comparison-table td:first-child {
          font-weight: 500;
          color: var(--color-text);
        }
        .comparison-table td:not(:first-child) {
          text-align: center;
        }
        .comparison-table .highlight {
          background: rgba(212, 165, 42, 0.05);
        }
        .comparison-table .highlight th {
          background: rgba(212, 165, 42, 0.1);
        }
        @media (max-width: 768px) {
          .comparison-table { font-size: 0.75rem; }
          .comparison-table th, .comparison-table td { padding: 0.4rem 0.5rem; }
        }

        .faq-section {
          margin: 3rem 0;
          max-width: 720px;
          margin-left: auto;
          margin-right: auto;
        }
        .faq-section h2 {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--color-text);
          margin: 0 0 1.5rem;
          text-align: center;
        }
        .faq-item {
          background: var(--color-card);
          border-radius: 12px;
          border: 1px solid var(--color-border);
          margin-bottom: 0.8rem;
          overflow: hidden;
          transition: all 0.2s ease;
        }
        .faq-item:hover { border-color: var(--color-accent); }
        .faq-header {
          padding: 1rem 1.2rem;
          font-weight: 600;
          color: var(--color-text);
          cursor: pointer;
          display: flex;
          justify-content: space-between;
          align-items: center;
          list-style: none;
        }
        .faq-header .arrow {
          color: var(--color-accent);
          font-size: 1.2rem;
          font-weight: 300;
          transition: transform 0.3s ease;
        }
        .faq-header .arrow.open { transform: rotate(180deg); }
        .faq-answer {
          max-height: 0;
          overflow: hidden;
          transition: max-height 0.35s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease;
          opacity: 0;
          padding: 0 1.2rem;
          color: var(--color-text-muted);
          font-size: 0.9rem;
          line-height: 1.7;
        }
        .faq-answer.open {
          max-height: 300px;
          opacity: 1;
          padding: 0 1.2rem 1.2rem;
        }

        .final-cta {
          background: linear-gradient(135deg, #0F2B4A, #1A3F66);
          border-radius: 24px;
          padding: 2.5rem 2rem;
          text-align: center;
          margin: 3rem 0;
          box-shadow: 0 8px 40px rgba(15,43,74,0.2);
        }
        .final-cta h2 {
          color: #fff;
          font-size: 1.8rem;
          margin: 0 0 0.5rem;
        }
        .final-cta p {
          color: #C8D4E3;
          font-size: 1.05rem;
          margin: 0 0 1.5rem;
          max-width: 500px;
          margin-inline: auto;
        }
        .final-cta .cta {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.7rem 2rem;
          border-radius: 8px;
          font-weight: 600;
          font-size: 0.95rem;
          text-decoration: none;
          background: var(--color-accent);
          color: #0F2B4A;
          transition: all 0.2s ease;
        }
        .final-cta .cta:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 32px rgba(212,165,42,0.4);
        }

        .footer {
          border-top: 1px solid var(--color-border);
          padding: 2rem 1.5rem;
          text-align: center;
          color: var(--color-text-muted);
          font-size: 0.8rem;
        }
        .footer .links {
          display: flex;
          justify-content: center;
          gap: 1.2rem;
          flex-wrap: wrap;
          margin-bottom: 1rem;
        }
        .footer .links a {
          color: var(--color-text);
          text-decoration: none;
          transition: color 0.2s;
        }
        .footer .links a:hover { color: var(--color-accent); }
        .footer p { opacity: 0.6; font-size: 0.7rem; }

        @media (max-width: 768px) {
          .final-cta h2 { font-size: 1.4rem; }
          .final-cta p { font-size: 0.95rem; }
        }
      `}</style>

      {/* NAVIGATION */}
      <nav className="navbar">
        <div className="logo-container">
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', textDecoration: 'none' }}>
            <Logo variant="primary" size="large" />
          </Link>
        </div>
        <div className="nav-links">
          <Link href="/#why">Why Cresoa</Link>
          <Link href="/#features">Features</Link>
          <Link href="/pricing">Pricing</Link>
          <Link href="/#faq">FAQ</Link>
        </div>
        <div className="nav-actions">
          <ThemeToggle />
          <Link href="/login" style={{ color: 'var(--color-text-muted)', textDecoration: 'none', fontSize: '0.85rem' }}>Log in</Link>
          <Link
            href="/signup"
            style={{
              padding: '0.4rem 1.2rem',
              background: 'var(--color-accent)',
              color: '#0F2B4A',
              borderRadius: '8px',
              fontWeight: 600,
              textDecoration: 'none',
              fontSize: '0.85rem',
            }}
          >
            Start Beta
          </Link>
          <button className="hamburger" onClick={toggleMobileMenu}>
            <Svg name="menu" size={24} stroke="var(--color-text)" />
          </button>
        </div>
      </nav>

      <div className={`mobile-overlay ${mobileMenuOpen ? 'open' : ''}`} onClick={closeMobileMenu} />
      <div className={`mobile-drawer ${mobileMenuOpen ? 'open' : ''}`}>
        <button className="close-btn" onClick={closeMobileMenu}>
          <Svg name="x" size={24} stroke="var(--color-text)" />
        </button>
        <Link href="/#why" onClick={closeMobileMenu}>Why Cresoa</Link>
        <Link href="/#features" onClick={closeMobileMenu}>Features</Link>
        <Link href="/pricing" onClick={closeMobileMenu}>Pricing</Link>
        <Link href="/#faq" onClick={closeMobileMenu}>FAQ</Link>
        <Link href="/login" onClick={closeMobileMenu}>Log in</Link>
        <Link href="/signup" className="btn" style={{ textAlign: 'center', justifyContent: 'center' }} onClick={closeMobileMenu}>
          Start Beta
        </Link>
      </div>

      {/* HERO */}
      <section className="hero">
        <div className="container">
          <h1>Choose the plan that fits your business.</h1>
          <p>Start with the essentials. Upgrade as your business grows.</p>
        </div>
      </section>

      {/* PRICING CARDS */}
      <div className="container">
        <div className="pricing-grid">

          {/* FREE */}
          <div className="pricing-card">
            <div className="plan-name">Free</div>
            <div className="tagline">For businesses getting started</div>
            <div className="price">₦0</div>
            <div className="limits">
              <strong>20</strong> customers · <strong>50</strong> orders · <strong>20</strong> inventory items · <strong>0</strong> staff
            </div>
            <ul className="features">
              <li><Svg name="check" size={14} stroke="var(--color-success)" /> Customer &amp; order management</li>
              <li><Svg name="check" size={14} stroke="var(--color-success)" /> Basic dashboard &amp; analytics</li>
              <li><Svg name="check" size={14} stroke="var(--color-success)" /> Basic inventory management</li>
              <li><Svg name="check" size={14} stroke="var(--color-success)" /> Production workflow (custom stages)</li>
              <li><Svg name="check" size={14} stroke="var(--color-success)" /> Tessa AI – 5 actions/month</li>
              <li style={{ color: 'var(--color-text-muted)' }}><Svg name="x" size={14} stroke="var(--color-danger)" /> Staff accounts</li>
              <li style={{ color: 'var(--color-text-muted)' }}><Svg name="x" size={14} stroke="var(--color-danger)" /> Customer tracking links</li>
              <li style={{ color: 'var(--color-text-muted)' }}><Svg name="x" size={14} stroke="var(--color-danger)" /> Advanced analytics</li>
            </ul>
            <Link href="/signup" className="cta outline">Start Free</Link>
          </div>

          {/* STARTER */}
          <div className="pricing-card">
            <div className="badge">Most Popular</div>
            <div className="plan-name">Starter</div>
            <div className="tagline">For growing businesses</div>
            <div className="price">₦3,500 <span>/month</span></div>
            <div className="limits">
              <strong>200</strong> customers · <strong>500</strong> orders · <strong>100</strong> inventory items · <strong>2</strong> staff
            </div>
            <ul className="features">
              <li><Svg name="check" size={14} stroke="var(--color-success)" /> Everything in Free</li>
              <li><Svg name="check" size={14} stroke="var(--color-success)" /> Staff management (2 seats)</li>
              <li><Svg name="check" size={14} stroke="var(--color-success)" /> Customer tracking links</li>
              <li><Svg name="check" size={14} stroke="var(--color-success)" /> Bulk actions</li>
              <li><Svg name="check" size={14} stroke="var(--color-success)" /> Data export (CSV)</li>
              <li><Svg name="check" size={14} stroke="var(--color-success)" /> Tessa AI – 50 actions/month</li>
            </ul>
            <Link href="/signup" className="cta primary">Upgrade to Starter</Link>
          </div>

          {/* PRO */}
          <div className="pricing-card">
            <div className="plan-name">Pro</div>
            <div className="tagline">For established businesses</div>
            <div className="price">₦9,500 <span>/month</span></div>
            <div className="limits">
              <strong>Unlimited</strong> customers, orders, inventory · <strong>10</strong> staff
            </div>
            <ul className="features">
              <li><Svg name="check" size={14} stroke="var(--color-success)" /> Everything in Starter</li>
              <li><Svg name="check" size={14} stroke="var(--color-success)" /> Unlimited capacity</li>
              <li><Svg name="check" size={14} stroke="var(--color-success)" /> Advanced analytics</li>
              <li><Svg name="check" size={14} stroke="var(--color-success)" /> Tessa AI – 500 actions/month</li>
              <li><Svg name="check" size={14} stroke="var(--color-success)" /> Full data export</li>
              <li><Svg name="check" size={14} stroke="var(--color-success)" /> Priority support</li>
            </ul>
            <Link href="/signup" className="cta primary">Go Pro</Link>
          </div>
        </div>

        {/* BETA SECTION */}
        <div className="beta-section">
          <h2>Join the Cresoa Beta</h2>
          <p>
            Get 90 days of extended access to advanced Cresoa features while helping us improve the platform.
            Limited spots available.
          </p>
          <Link href="/beta-apply" className="cta">Apply for Beta</Link>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>
            90‑day access · No credit card required · Limited to early adopters
          </p>
        </div>

        {/* FEATURE COMPARISON */}
        <div className="comparison">
          <h2>Compare plans</h2>
          <div style={{ overflowX: 'auto' }}>
            <table className="comparison-table">
              <thead>
                <tr>
                  <th>Feature</th>
                  <th>Free</th>
                  <th>Beta</th>
                  <th className="highlight">Starter</th>
                  <th>Pro</th>
                </tr>
              </thead>
              <tbody>
                {features.map((f, i) => (
                  <tr key={i}>
                    <td>{f.name}</td>
                    <td>{renderFeatureValue(f.free)}</td>
                    <td>{renderFeatureValue(f.beta)}</td>
                    <td className="highlight">{renderFeatureValue(f.starter)}</td>
                    <td>{renderFeatureValue(f.pro)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQ */}
        <div className="faq-section">
          <h2>Frequently asked questions</h2>
          <div>
            {faqs.map((item, i) => (
              <div key={i} className="faq-item">
                <div className="faq-header" onClick={() => toggleFaq(i)}>
                  {item.q}
                  <span className={`arrow ${openFaq === i ? 'open' : ''}`}>+</span>
                </div>
                <div className={`faq-answer ${openFaq === i ? 'open' : ''}`}>
                  {item.a}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* FINAL CTA */}
        <div className="final-cta">
          <h2>Ready to grow your business?</h2>
          <p>Join hundreds of Nigerian SMEs already using Cresoa.</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.8rem', justifyContent: 'center' }}>
            <Link href="/signup" className="cta">
              Start Beta <Svg name="arrowRight" size={16} stroke="#0F2B4A" />
            </Link>
            <Link
              href="/login"
              style={{
                padding: '0.7rem 2rem',
                borderRadius: '8px',
                fontWeight: 600,
                textDecoration: 'none',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.3)',
                background: 'transparent',
              }}
            >
              Log in
            </Link>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', flexWrap: 'wrap', marginTop: '1.2rem', color: '#A0B4C9', fontSize: '0.75rem' }}>
            <span><Svg name="check" size={12} stroke="#A0B4C9" /> 90‑day beta</span>
            <span><Svg name="check" size={12} stroke="#A0B4C9" /> No credit card</span>
            <span><Svg name="check" size={12} stroke="#A0B4C9" /> Cancel anytime</span>
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <footer className="footer">
        <div className="container">
          <div className="links">
            <Link href="/">Home</Link>
            <Link href="/pricing">Pricing</Link>
            <Link href="/beta-apply">Beta</Link>
            <Link href="/login">Log in</Link>
            <Link href="/signup">Sign up</Link>
          </div>
          <p>© {new Date().getFullYear()} Cresoa · Built in Nigeria for Nigerian businesses</p>
        </div>
      </footer>
    </div>
  );
}
