import PrintingContent from './PrintingContent'

export const metadata = {
  title: 'Printing Business Management Software | Cresoa',
  description: 'Manage print jobs, customers, paper stock, invoices and payments from your phone. Built for Nigerian print shops, signage businesses, and screen printers.',
  keywords: ['printing business software Nigeria', 'print shop management Nigeria', 'signage business software', 'print job tracking', 'Cresoa printing'],
  openGraph: {
    title: 'Printing Business Management Software | Cresoa',
    description: 'Run your print shop with less stress. Track jobs, manage paper stock, send invoices – all in one place.',
    type: 'website',
    url: 'https://cresoa.com.ng/printing',
    siteName: 'Cresoa',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Printing Business Management Software | Cresoa',
    description: 'Track print jobs, manage paper stock, send invoices – all in one place.',
  },
  alternates: { canonical: '/printing' },
  robots: { index: true, follow: true },
}

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    { '@type': 'Question', name: 'Can I track a print job through every stage?', acceptedAnswer: { '@type': 'Answer', text: 'Yes. Create a job and move it through your workflow — Queued, Printing, Finishing, Ready for Pickup, Delivered. One glance tells you where every job stands.' } },
    { '@type': 'Question', name: 'Can I track paper, ink, and other materials?', acceptedAnswer: { '@type': 'Answer', text: 'Yes. Cresoa tracks paper stock, ink, vinyl, and other materials. Know what you have, what you have used, and which items are running low before a job stops because you ran out.' } },
    { '@type': 'Question', name: 'Can I create invoices for print jobs?', acceptedAnswer: { '@type': 'Answer', text: 'Yes. Create professional invoices with line items, quantities, and total cost. Include your business details and share the invoice directly through WhatsApp.' } },
    { '@type': 'Question', name: 'Can I share job updates via WhatsApp?', acceptedAnswer: { '@type': 'Answer', text: 'Yes. Send job updates, tracking links, and invoices through WhatsApp without leaving Cresoa. Your customer replies to the same thread.' } },
    { '@type': 'Question', name: 'Do I need a laptop, or can I use my phone?', acceptedAnswer: { '@type': 'Answer', text: 'Your phone is enough. Cresoa is mobile-first — designed for the way Nigerian print shops actually work.' } },
    { '@type': 'Question', name: 'Can I record deposits and balance payments?', acceptedAnswer: { '@type': 'Answer', text: 'Yes. Record what a customer has paid and see exactly what is still outstanding. No more relying on memory or scrolling through bank alerts.' } },
  ],
}

const breadcrumbSchema = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://cresoa.com.ng' },
    { '@type': 'ListItem', position: 2, name: 'Printing', item: 'https://cresoa.com.ng/printing' },
  ],
}

const webPageSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: 'Printing Business Management Software | Cresoa',
  description: 'Print shop management software built for Nigerian print businesses.',
  url: 'https://cresoa.com.ng/printing',
  isPartOf: { '@type': 'WebSite', name: 'Cresoa', url: 'https://cresoa.com.ng' },
}

export default function PrintingLandingPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageSchema) }} />
      <PrintingContent />
    </>
  )
  }
