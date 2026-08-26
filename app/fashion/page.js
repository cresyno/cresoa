import Link from 'next/link'

export const metadata = {
  title: 'Fashion Business Management Software | Cresoa',
  description: 'Manage orders, customers, measurements, production, invoices, and inventory for your fashion business from your phone. Built for Nigerian tailors, designers, and boutiques.',
  openGraph: {
    title: 'Fashion Business Management Software | Cresoa',
    description: 'Run your fashion business without the stress. Orders, measurements, invoices and more in one place.',
    type: 'website',
    url: 'https://cresoa.com.ng/fashion',
    siteName: 'Cresoa',
  },
  alternates: { canonical: '/fashion' },
  robots: { index: true, follow: true },
}

// SVG Icon component (self-contained)
const Icon = ({ name, size = 24, stroke = 'currentColor' }) => {
  const icons = {
    user: <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></>,
    clipboard: <><rect x="8" y="2" width="8" height="4" rx="1" ry="1" /><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /></>,
    invoice: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></>,
    fabric: <><path d="M20.38 3.46L16 2l-4 4-4-4-4.38 1.46a2 2 0 0 0-1.28 2.25L3.6 9.6a2 2 0 0 0 1.46 1.34l2.34.52V20a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-8.54l2.34-.52a2 2 0 0 0 1.46-1.34l1.26-3.89a2 2 0 0 0-1.28-2.25z" /></>,
    group: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>,
    phone: <><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></>,
    arrow: <><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></>,
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{icons[name]}</svg>
}

export default function FashionLandingPage() {
  return (
    <div style={pageStyle}>
      {/* HERO */}
      <section style={heroSection}>
        <div style={heroContent}>
          <h1 style={heroTitle}>Run Your Fashion Business Without the Stress.</h1>
          <p style={heroSubtitle}>Orders, customers, measurements, production, invoices, and inventory — all organised in one place.</p>
          <Link href="/signup" style={ctaPrimary}>Start Free</Link>
          <p style={heroNote}>Built for Nigerian fashion businesses.</p>
        </div>
      </section>

      {/* PROBLEM */}
      <section style={sectionStyle}>
        <h2 style={sectionTitle}>Your Business Has Grown. Your Notebook Shouldn't Be Running It.</h2>
        <p style={paragraphStyle}>You started with a few customers and a notebook. Then the orders increased. Now you're searching through WhatsApp for measurements, checking different notebooks for payments, trying to remember which outfit is ready, and wondering what happened to that fabric you bought last week.</p>
        <p style={paragraphStyle}><Link href="https://cresoa.com.ng" style={linkStyle}>Cresoa</Link> brings everything together.</p>
      </section>

      {/* FEATURES */}
      <section style={sectionStyle}>
        <h2 style={sectionTitle}>Everything You Need to Run Your Fashion Business</h2>
        <div style={featuresGrid}>
          <FeatureCard icon="user" title="Customer Profiles & Measurements" description="Keep your customers' information and measurements organised in one place. No more searching through old chats to find a customer's waist, bust, shoulder or other measurements." />
          <FeatureCard icon="clipboard" title="Order & Production Tracking" description="Know exactly where every order stands. Move orders through your production stages and quickly see what has been ordered, what is being worked on, what is ready for pickup, and what has been delivered." />
          <FeatureCard icon="invoice" title="Professional Invoices" description="Create professional invoices in minutes. Add multiple items, quantities, prices, customer information and payment details. Your invoice can include your business logo and details, then be shared with your customer through WhatsApp." />
          <FeatureCard icon="fabric" title="Inventory Management" description="Keep track of the materials your business depends on. Manage fabrics, accessories and other inventory, monitor quantities and know when stock is getting low." />
          <FeatureCard icon="group" title="Group Orders" description="Handling Aso-Ebi or other bulk clothing orders? Create a group, add the coordinator and keep individual members and their orders organised in one place." />
        </div>
      </section>

      {/* WHO IT'S FOR */}
      <section style={sectionStyle}>
        <h2 style={sectionTitle}>Made for the Way Fashion Businesses Actually Work</h2>
        <p style={paragraphStyle}>Whether you're working from your home, a small shop or a growing fashion studio, <Link href="https://cresoa.com.ng" style={linkStyle}>Cresoa</Link> helps you bring structure to the everyday work behind your creativity.</p>
        <div style={audienceList}>
          <AudienceItem title="Tailors" description="Keep customers, measurements and orders organised." />
          <AudienceItem title="Fashion Designers" description="Manage your growing list of clients and production work." />
          <AudienceItem title="Aso-Ebi Coordinators" description="Keep large group orders from becoming confusing." />
          <AudienceItem title="Boutiques & Custom Wear Businesses" description="Manage customers, orders and inventory from one place." />
        </div>
      </section>

      {/* MOBILE-FIRST */}
      <section style={sectionStyle}>
        <h2 style={sectionTitle}>Your Phone. Your Business. One Place.</h2>
        <p style={paragraphStyle}>You don't need to sit behind a computer to manage your business. <Link href="https://cresoa.com.ng" style={linkStyle}>Cresoa</Link> is built mobile-first, so you can check an order, look up a customer's measurements, create an invoice or manage your business while you're on the move.</p>
      </section>

      {/* FINAL CTA */}
      <section style={ctaSection}>
        <h2 style={sectionTitle}>Ready to Put Your Fashion Business in Order?</h2>
        <p style={paragraphStyle}>Stop relying on scattered notebooks, chats and memory. Bring your customers, orders, production, inventory and invoices together with <Link href="https://cresoa.com.ng" style={linkStyle}>Cresoa</Link>.</p>
        <Link href="/signup" style={ctaPrimary}>Start Free</Link>
      </section>
    </div>
  )
}

// ─── Components & Styles ───
function FeatureCard({ icon, title, description }) {
  return (
    <div style={featureCardStyle}>
      <div style={iconWrapperStyle}><Icon name={icon} size={24} stroke="var(--cresoa-accent)" /></div>
      <h3 style={featureTitle}>{title}</h3>
      <p style={featureDesc}>{description}</p>
    </div>
  )
}

function AudienceItem({ title, description }) {
  return (
    <div style={audienceItemStyle}>
      <h4 style={audienceTitle}>{title}</h4>
      <p style={audienceDesc}>{description}</p>
    </div>
  )
}

// Styles (using CSS variables)
const pageStyle = { maxWidth: '1200px', margin: '0 auto', padding: '0 1rem', background: 'var(--cresoa-bg)', color: 'var(--cresoa-text)', fontFamily: 'Inter, sans-serif', lineHeight: 1.7 }
const heroSection = { padding: '4rem 0', background: 'var(--gradient-primary)', color: '#fff', borderRadius: '0 0 30px 30px', marginBottom: '3rem', textAlign: 'center' }
const heroContent = { maxWidth: '700px', margin: '0 auto', padding: '0 1rem' }
const heroTitle = { fontSize: '2.5rem', fontWeight: 800, marginBottom: '1rem' }
const heroSubtitle = { fontSize: '1.2rem', marginBottom: '2rem', opacity: 0.9 }
const heroNote = { fontSize: '0.9rem', marginTop: '1rem', opacity: 0.7 }
const ctaPrimary = { display: 'inline-block', background: 'var(--cresoa-accent)', color: '#fff', padding: '0.9rem 2rem', borderRadius: '10px', fontWeight: 700, textDecoration: 'none', boxShadow: '0 4px 14px rgba(212,165,42,0.3)' }
const sectionStyle = { padding: '2rem 0', marginBottom: '2rem' }
const sectionTitle = { fontSize: '2rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--cresoa-primary)' }
const paragraphStyle = { fontSize: '1.1rem', marginBottom: '1rem' }
const linkStyle = { color: 'var(--cresoa-accent)', fontWeight: 600, textDecoration: 'underline' }
const featuresGrid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }
const featureCardStyle = { background: 'var(--cresoa-surface)', border: '1px solid var(--cresoa-border)', borderRadius: '12px', padding: '1.5rem', boxShadow: 'var(--shadow-sm)' }
const iconWrapperStyle = { width: '50px', height: '50px', borderRadius: '12px', background: 'var(--cresoa-accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }
const featureTitle = { fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem' }
const featureDesc = { color: 'var(--cresoa-text-muted)', fontSize: '0.95rem' }
const audienceList = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginTop: '1.5rem' }
const audienceItemStyle = { background: 'var(--cresoa-surface-soft)', borderRadius: '8px', padding: '1rem', border: '1px solid var(--cresoa-border)' }
const audienceTitle = { fontWeight: 700, marginBottom: '0.3rem' }
const audienceDesc = { color: 'var(--cresoa-text-muted)', fontSize: '0.9rem' }
const ctaSection = { padding: '3rem 0', textAlign: 'center', background: 'var(--cresoa-surface-soft)', borderRadius: '20px', border: '1px solid var(--cresoa-border)' }
