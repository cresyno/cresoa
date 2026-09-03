import Link from 'next/link'
import { Metadata } from 'next'

export const metadata = {
  title: 'From Notebook to Digital: How to Scale a Tailoring Business in Nigeria | Cresoa',
  description: 'Struggling to remember customer measurements or missing orders? Learn how transitioning from a notebook to digital tools can help you scale your tailoring business in Nigeria.',
  keywords: [
    'tailoring business Nigeria',
    'tailor order management app',
    'fashion designer software Nigeria',
    'digital record keeping for tailors',
    'how to scale a tailoring business',
    'Cresoa',
  ],
  openGraph: {
    title: 'From Notebook to Digital: How to Scale a Tailoring Business in Nigeria',
    description: 'A practical guide for Nigerian tailors to move from paper records to a digital Business OS, manage measurements, orders, and invoices efficiently.',
    type: 'article',
    url: 'https://cresoa.com.ng/blog/from-notebook-to-digital-scaling-tailoring-business-nigeria',
    siteName: 'Cresoa',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'From Notebook to Digital: How to Scale a Tailoring Business in Nigeria',
    description: 'A practical guide for Nigerian tailors to move from paper records to a digital Business OS.',
  },
  alternates: {
    canonical: '/blog/from-notebook-to-digital-scaling-tailoring-business-nigeria',
  },
  robots: { index: true, follow: true },
}

export default function BlogPostPage() {
  return (
    <article style={articleStyle}>
      {/* BlogPosting Schema for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BlogPosting',
            headline: 'From Notebook to Digital: How to Scale a Tailoring Business in Nigeria',
            description: 'Struggling to remember customer measurements or missing orders? Learn how transitioning from a notebook to digital tools can help you scale your tailoring business in Nigeria.',
            author: {
              '@type': 'Organization',
              name: 'Cresoa',
              url: 'https://cresoa.com.ng'
            },
            publisher: {
              '@type': 'Organization',
              name: 'Cresoa',
              url: 'https://cresoa.com.ng'
            },
            datePublished: '2026-09-03',
            dateModified: '2026-09-03',
            mainEntityOfPage: 'https://cresoa.com.ng/blog/from-notebook-to-digital-scaling-tailoring-business-nigeria',
            image: 'https://cresoa.com.ng/og-image.jpg',
          })
        }}
      />

      {/* Header */}
      <header style={headerStyle}>
        <p style={categoryStyle}>Business Tips</p>
        <h1 style={titleStyle}>From Notebook to Digital: How to Scale a Tailoring Business in Nigeria</h1>
        <p style={metaStyle}>Published on September 3, 2026</p>
      </header>

      {/* Content */}
      <div style={contentStyle}>
        <p>For many tailors in Nigeria, the business starts with a simple notebook.</p>
        <p>You carry it everywhere. You open it, flip through the pages, and write down a customer's name, their measurement for a new senator wear, the exact amount they paid as a deposit, and the date they want to pick it up.</p>
        <p>It works for a while. But as your business grows, that notebook becomes a problem. Pages get torn. You forget where you wrote something. A customer calls asking for their measurements, and you have to spend 10 minutes flipping through papers to find them. Sometimes, you simply lose a client's record forever.</p>
        <p>If you want to scale <Link href="/fashion" style={linkStyle}>your tailoring business in Nigeria</Link>, the first thing you need to do is close the notebook and move to digital.</p>

        <h2 style={h2Style}>The hidden cost of keeping a notebook</h2>
        <p>The notebook isn't just a tool; it is a bottleneck. Here is what it costs you in reality:</p>
        <ul style={listStyle}>
          <li><strong>Missed deadlines:</strong> Forgetting a pickup date means unhappy customers and lost referrals.</li>
          <li><strong>Messy calculations:</strong> Manually calculating fabric costs, labor, and profit margin on paper leaves too much room for error.</li>
          <li><strong>No backup:</strong> If the book is lost, stolen, or soaked in water, you lose your entire customer history.</li>
          <li><strong>Lack of professionalism:</strong> When a customer asks for an invoice, you have to draw it from scratch.</li>
        </ul>

        <h2 style={h2Style}>Why going digital is the only way to scale</h2>
        <p>A digital business OS doesn't just store data; it automates your workflow. You don't need to be a tech expert to use it. It simply makes your business smarter.</p>
        <p>When you switch to a digital management tool, you gain:</p>
        <ol style={listStyle}>
          <li><strong>Unlimited Storage:</strong> Save every customer's measurement permanently.</li>
          <li><strong>Instant Retrieval:</strong> Search for a customer's name and pull up their order history and measurements in under a second.</li>
          <li><strong>Accurate Tracking:</strong> Know exactly which orders are "Pending," "In Production," or "Ready for Pickup."</li>
          <li><strong>Professional Invoicing:</strong> Send a clean, clear invoice directly from your phone.</li>
        </ol>

        <h2 style={h2Style}>What to look for in a tailor order management app</h2>
        <p>Not all software is built for the fashion industry. You need an app that understands the unique way Nigerian tailors work. Here are the features you must prioritize:</p>

        <h3 style={h3Style}>1. Dedicated Customer Measurements</h3>
        <p>This is non-negotiable. You need a digital place to store chest, waist, shoulder, neck, sleeve length, and trouser length for every customer. It should be attached to their name so you can access it during their next appointment.</p>

        <h3 style={h3Style}>2. Multi-Item Orders</h3>
        <p>A customer rarely orders just one thing. They will usually ask for a complete outfit (native wear, shirt, and trousers). Your system should allow you to put all these items on one single order without creating a messy list of separate transactions. This keeps your Orders page clean.</p>

        <h3 style={h3Style}>3. Managing Deposits and Balances</h3>
        <p>Often, customers pay a deposit to confirm an order. The system must calculate the balance clearly. For example, if the total is ₦80,000 and they paid ₦30,000, the app should immediately show a balance of ₦50,000.</p>

        <h3 style={h3Style}>4. WhatsApp Sharing</h3>
        <p>Since 90% of your customer communication happens on WhatsApp, you must be able to download your invoice or order summary as a PDF and share it directly to their WhatsApp chat.</p>

        <h2 style={h2Style}>How Cresoa helps you scale</h2>
        <p>This is exactly why we built <Link href="https://cresoa.com.ng" style={linkStyle}>Cresoa</Link>. It is not just a notebook replacement; it is a Business OS designed specifically for Nigerian SMEs.</p>
        <p>When you use <Link href="https://cresoa.com.ng" style={linkStyle}>Cresoa</Link> for your fashion business:</p>
        <ul style={listStyle}>
          <li>You can capture a customer's full measurement profile just once. The next time they walk into your shop, you don't have to measure them all over again. You simply pull up their profile.</li>
          <li>You can create a single order containing multiple items (e.g., 2 native outfits + 1 shirt). Your inventory and order lists remain perfectly clean.</li>
          <li>You can record the payment from the invoice and keep it connected to the customer's record.</li>
          <li>You can generate a professional invoice and instantly send it to the customer via WhatsApp, without needing a laptop.</li>
        </ul>

        <h2 style={h2Style}>From Local Tailor to Fashion Brand</h2>
        <p>Scaling your business isn't just about making more clothes. It's about building a brand that can be trusted.</p>
        <p>A digital system helps you leave the chaotic "paper and pen" era behind. You will stop worrying about losing data and start focusing on what matters most: designing beautiful clothes, satisfying your customers, and growing your revenue.</p>
        <p>You don't need to be a big company to use professional tools. You just need the willingness to grow.</p>

        <h2 style={h2Style}>Ready to try it?</h2>
        <p>👉 <Link href="/signup" style={ctaStyle}>Start your free Cresoa account</Link> today and see how easy it is to manage your customers, measurements, orders, and invoices right from your phone.</p>
        <p>Or explore our <Link href="/pricing" style={linkStyle}>plans</Link> to find the right fit for your business.</p>
      </div>
    </article>
  )
}

// ─── Styles ───
const articleStyle = {
  maxWidth: '760px',
  margin: '0 auto',
  padding: '2rem 1rem',
  background: 'var(--cresoa-bg)',
  color: 'var(--cresoa-text)',
  fontFamily: 'Inter, sans-serif',
  lineHeight: '1.75',
}

const headerStyle = {
  marginBottom: '2rem',
  borderBottom: '1px solid var(--cresoa-border)',
  paddingBottom: '1rem',
}

const categoryStyle = {
  color: 'var(--cresoa-accent)',
  fontWeight: 700,
  fontSize: '0.85rem',
  textTransform: 'uppercase',
  letterSpacing: '1px',
  marginBottom: '0.5rem',
}

const titleStyle = {
  fontSize: '2rem',
  fontWeight: 800,
  color: 'var(--cresoa-primary)',
  lineHeight: 1.2,
  margin: '0 0 0.5rem',
}

const metaStyle = {
  color: 'var(--cresoa-text-muted)',
  fontSize: '0.85rem',
}

const contentStyle = {
  fontSize: '1.05rem',
}

const h2Style = {
  fontSize: '1.5rem',
  fontWeight: 700,
  marginTop: '2.5rem',
  marginBottom: '1rem',
  color: 'var(--cresoa-primary)',
}

const h3Style = {
  fontSize: '1.2rem',
  fontWeight: 600,
  marginTop: '1.5rem',
  marginBottom: '0.5rem',
  color: 'var(--cresoa-primary)',
}

const listStyle = {
  paddingLeft: '1.5rem',
  marginBottom: '1rem',
}

const quoteStyle = {
  fontStyle: 'italic',
  borderLeft: '4px solid var(--cresoa-accent)',
  paddingLeft: '1rem',
  margin: '1rem 0',
  color: 'var(--cresoa-text-muted)',
}

const tableStyle = {
  width: '100%',
  borderCollapse: 'collapse',
  margin: '1rem 0',
  fontSize: '0.95rem',
}

const thStyle = {
  borderBottom: '2px solid var(--cresoa-border)',
  padding: '0.5rem',
  textAlign: 'left',
  fontWeight: 700,
}

const tdStyle = {
  borderBottom: '1px solid var(--cresoa-border)',
  padding: '0.5rem',
  textAlign: 'left',
}

const linkStyle = {
  color: 'var(--cresoa-accent)',
  fontWeight: 600,
  textDecoration: 'underline',
}

const ctaSectionStyle = {
  marginTop: '2rem',
  padding: '1rem',
  background: 'var(--cresoa-surface-soft)',
  borderRadius: '8px',
  border: '1px solid var(--cresoa-border)',
}

const ctaStyle = {
  display: 'inline-block',
  background: 'var(--cresoa-accent)',
  color: '#fff',
  padding: '0.75rem 1.5rem',
  borderRadius: '8px',
  fontWeight: 700,
  textDecoration: 'none',
  marginTop: '0.5rem',
          }
