import Link from 'next/link'

export const metadata = {
  title: 'Repair Shop Management Software | Cresoa',
  description: 'Manage repair jobs, customers, parts inventory, invoices and payments from your phone. Built for Nigerian repair businesses – phone, electronics, generator, auto repair and more.',
  openGraph: {
    title: 'Repair Shop Management Software | Cresoa',
    description: 'Run your repair business with less stress. Track jobs, manage parts, send invoices – all in one place.',
    type: 'website',
    url: 'https://cresoa.com.ng/repairs',
    siteName: 'Cresoa',
  },
  alternates: { canonical: '/repairs' },
  robots: { index: true, follow: true },
}

const Icon = ({ name, size = 24, stroke = 'currentColor' }) => {
  const icons = {
    wrench: <><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" /></>,
    user: <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></>,
    box: <><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" /></>,
    invoice: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></>,
    cash: <><rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><line x1="1" y1="10" x2="23" y2="10" /></>,
    track: <><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></>,
    sparkles: <><path d="M12 3l1.9 5.8a2 2 0 0 0 1.3 1.3L21 12l-5.8 1.9a2 2 0 0 0-1.3 1.3L12 21l-1.9-5.8a2 2 0 0 0-1.3-1.3L3 12l5.8-1.9a2 2 0 0 0 1.3-1.3z" /></>,
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{icons[name]}</svg>
}

export default function RepairsLandingPage() {
  return (
    <div style={pageStyle}>
      {/* HERO */}
      <section style={heroSection}>
        <div style={heroContent}>
          <h1 style={heroTitle}>Run Your Repair Business With Less Stress</h1>
          <p style={heroSubtitle}>Stop keeping customer details, repair jobs, parts and payments scattered across notebooks and WhatsApp chats.</p>
          <p style={heroSubtitle}><Link href="https://cresoa.com.ng" style={linkStyle}>Cresoa</Link> puts your repair business in one place — so you can know what came in, what you're working on, what's ready, and what each customer owes.</p>
          <Link href="/signup" style={ctaPrimary}>Start Free</Link>
        </div>
      </section>

      {/* PROBLEM */}
      <section style={sectionStyle}>
        <h2 style={sectionTitle}>Built for People Who Fix Things</h2>
        <p style={paragraphStyle}>Whether you repair phones, electronics, generators, appliances or other equipment, <Link href="https://cresoa.com.ng" style={linkStyle}>Cresoa</Link> helps you stay on top of every job.</p>
        <div style={featuresGrid}>
          <FeatureCard icon="wrench" title="Track Every Repair Job" description="Know exactly where every device or equipment is in your workflow — from Received and Diagnosing to In Repair and Ready for Pickup." />
          <FeatureCard icon="user" title="Keep Customer Records" description="Store customer information and connect each repair job to the right customer. No more searching through old chats to remember who brought what." />
          <FeatureCard icon="box" title="Keep an Eye on Spare Parts" description="Track the parts and materials you use in your repairs. Know what's available and identify items that are running low before they become a problem." />
          <FeatureCard icon="invoice" title="Create Professional Invoices" description="Create a proper invoice for your customer with parts, quantities, labour and total cost. Download it or share it directly through WhatsApp." />
          <FeatureCard icon="cash" title="Keep Track of Payments" description="Record what your customer has paid and what is still outstanding, so you don't have to rely on memory." />
          <FeatureCard icon="track" title="Customer Tracking" description="Give customers a way to check the status of their repair where available on your plan." />
          <FeatureCard icon="sparkles" title="Tessa AI" description="Ask Tessa how to use Cresoa whenever you need help." />
        </div>
      </section>

      {/* CUSTOMER QUOTE */}
      <section style={quoteSection}>
        <h2 style={sectionTitle}>Stop Asking “Where Is That Customer's Phone?”</h2>
        <p style={paragraphStyle}>With multiple jobs coming in every day, it's easy for things to get mixed up. <Link href="https://cresoa.com.ng" style={linkStyle}>Cresoa</Link> helps you keep each customer, device, job, parts and payment connected in one place.</p>
        <blockquote style={blockquoteStyle}>“Oga, my phone nko?”</blockquote>
        <p style={paragraphStyle}>You can check the job and know exactly what's happening.</p>
      </section>

      {/* WHAT YOU GET */}
      <section style={sectionStyle}>
        <h2 style={sectionTitle}>Everything Your Workshop Needs, In One Place</h2>
        <div style={featureList}>
          <FeatureListItem icon="user" text="Customers – Keep your customer records organized." />
          <FeatureListItem icon="wrench" text="Repair Jobs – Create and manage jobs from when they arrive until they're ready." />
          <FeatureListItem icon="box" text="Job Status – Know which repairs are being diagnosed, worked on, waiting for parts or ready for pickup." />
          <FeatureListItem icon="box" text="Inventory – Keep track of spare parts and other stock." />
          <FeatureListItem icon="invoice" text="Invoices – Create professional invoices with your business details, items, labour and payment information." />
          <FeatureListItem icon="cash" text="Payments – Record customer payments and keep track of outstanding balances." />
          <FeatureListItem icon="track" text="Customer Tracking – Give customers a way to check the status of their repair where available on your plan." />
          <FeatureListItem icon="sparkles" text="Tessa AI – Ask Tessa how to use Cresoa whenever you need help." />
        </div>
      </section>

      {/* MOBILE-FIRST */}
      <section style={sectionStyle}>
        <h2 style={sectionTitle}>Built for the Way Nigerian Repair Businesses Work</h2>
        <p style={paragraphStyle}>You don't need a complicated system or an expensive computer setup. <Link href="https://cresoa.com.ng" style={linkStyle}>Cresoa</Link> is mobile-first. Use your phone to manage your workshop while you're at the counter, in the market, or checking a repair.</p>
      </section>

      {/* FINAL CTA */}
      <section style={ctaSection}>
        <h2 style={sectionTitle}>Give Your Business a Better System</h2>
        <p style={paragraphStyle}>You're already doing the hard work of running the workshop. Let <Link href="https://cresoa.com.ng" style={linkStyle}>Cresoa</Link> handle the organization. Manage your customers. Track your repairs. Control your stock. Send professional invoices. Keep your business moving.</p>
        <Link href="/signup" style={ctaPrimary}>Start Free</Link>
        <div style={secondaryCtaWrap}>
          <Link href="/learn" style={secondaryCta}>See How Cresoa Works</Link>
        </div>
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

function FeatureListItem({ icon, text }) {
  return (
    <div style={featureListItemStyle}>
      <div style={iconWrapperSmallStyle}><Icon name={icon} size={18} stroke="var(--cresoa-accent)" /></div>
      <span>{text}</span>
    </div>
  )
}

// Styles
const pageStyle = { maxWidth: '1200px', margin: '0 auto', padding: '0 1rem', background: 'var(--cresoa-bg)', color: 'var(--cresoa-text)', fontFamily: 'Inter, sans-serif', lineHeight: 1.7 }
const heroSection = { padding: '4rem 0', background: 'var(--gradient-primary)', color: '#fff', borderRadius: '0 0 30px 30px', marginBottom: '3rem', textAlign: 'center' }
const heroContent = { maxWidth: '700px', margin: '0 auto', padding: '0 1rem' }
const heroTitle = { fontSize: '2.5rem', fontWeight: 800, marginBottom: '1rem' }
const heroSubtitle = { fontSize: '1.2rem', marginBottom: '1.5rem', opacity: 0.9 }
const linkStyle = { color: 'var(--cresoa-accent)', fontWeight: 600, textDecoration: 'underline' }
const ctaPrimary = { display: 'inline-block', background: 'var(--cresoa-accent)', color: '#fff', padding: '0.9rem 2rem', borderRadius: '10px', fontWeight: 700, textDecoration: 'none', boxShadow: '0 4px 14px rgba(212,165,42,0.3)' }
const secondaryCtaWrap = { marginTop: '1rem' }
const secondaryCta = { display: 'inline-block', padding: '0.75rem 1.5rem', borderRadius: '10px', border: '2px solid var(--cresoa-accent)', color: 'var(--cresoa-accent)', fontWeight: 700, textDecoration: 'none' }
const sectionStyle = { padding: '2rem 0', marginBottom: '2rem' }
const sectionTitle = { fontSize: '2rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--cresoa-primary)' }
const paragraphStyle = { fontSize: '1.1rem', marginBottom: '1rem' }
const featuresGrid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }
const featureCardStyle = { background: 'var(--cresoa-surface)', border: '1px solid var(--cresoa-border)', borderRadius: '12px', padding: '1.5rem', boxShadow: 'var(--shadow-sm)' }
const iconWrapperStyle = { width: '50px', height: '50px', borderRadius: '12px', background: 'var(--cresoa-accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }
const featureTitle = { fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem' }
const featureDesc = { color: 'var(--cresoa-text-muted)', fontSize: '0.95rem' }
const quoteSection = { padding: '2rem', background: 'var(--cresoa-surface-soft)', borderRadius: '16px', marginBottom: '2rem', textAlign: 'center' }
const blockquoteStyle = { fontStyle: 'italic', fontSize: '1.3rem', color: 'var(--cresoa-text)', borderLeft: '4px solid var(--cresoa-accent)', paddingLeft: '1rem', margin: '1rem 0' }
const featureList = { display: 'flex', flexDirection: 'column', gap: '0.75rem' }
const featureListItemStyle = { display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'var(--cresoa-surface)', border: '1px solid var(--cresoa-border)', borderRadius: '8px', padding: '0.75rem' }
const iconWrapperSmallStyle = { width: '36px', height: '36px', borderRadius: '8px', background: 'var(--cresoa-accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }
const ctaSection = { padding: '3rem 0', textAlign: 'center', background: 'var(--cresoa-surface-soft)', borderRadius: '20px', border: '1px solid var(--cresoa-border)' }
