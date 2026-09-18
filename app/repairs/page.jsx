import RepairsContent from './RepairsContent'

export const metadata = {
  title: 'Repair Shop Management Software | Cresoa',
  description: 'Manage repair jobs, customers, parts inventory, invoices and payments from your phone. Built for Nigerian repair businesses – phone, electronics, generator, auto repair and more.',
  keywords: ['repair shop software Nigeria', 'repair business management Nigeria', 'phone repair software', 'electronics repair app Nigeria', 'Cresoa repairs'],
  openGraph: {
    title: 'Repair Shop Management Software | Cresoa',
    description: 'Run your repair business with less stress. Track jobs, manage parts, send invoices – all in one place.',
    type: 'website',
    url: 'https://cresoa.com.ng/repairs',
    siteName: 'Cresoa',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Repair Shop Management Software | Cresoa',
    description: 'Track jobs, manage parts, send invoices – all in one place.',
  },
  alternates: { canonical: '/repairs' },
  robots: { index: true, follow: true },
}

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    { '@type': 'Question', name: 'Can I track a repair job through every stage?', acceptedAnswer: { '@type': 'Answer', text: 'Yes. Create a job and move it through your workflow — Received, Diagnosing, In Repair, Waiting for Parts, Ready for Pickup, Delivered. One glance tells you where every device stands.' } },
    { '@type': 'Question', name: 'Can I store customer details and past repairs?', acceptedAnswer: { '@type': 'Answer', text: 'Yes. Every customer gets their own record with contact details and a full history of every repair they have brought you — so you never lose track of who brought what.' } },
    { '@type': 'Question', name: 'Can I track spare parts and inventory?', acceptedAnswer: { '@type': 'Answer', text: 'Yes. Cresoa tracks spare parts, tools, and materials. Know what you have, what you have used, and which items are running low before they become a problem.' } },
    { '@type': 'Question', name: 'Can I create invoices for repairs?', acceptedAnswer: { '@type': 'Answer', text: 'Yes. Create professional invoices with parts, quantities, labour, and total cost. Include your business details and share the invoice directly through WhatsApp.' } },
    { '@type': 'Question', name: 'Can I record deposits and balance payments?', acceptedAnswer: { '@type': 'Answer', text: 'Yes. Record what a customer has paid and see exactly what is still outstanding. No more relying on memory or scrolling through bank alerts.' } },
    { '@type': 'Question', name: 'Do I need a laptop, or can I use my phone?', acceptedAnswer: { '@type': 'Answer', text: 'Your phone is enough. Cresoa is mobile-first — designed for the way Nigerian repair businesses actually work.' } },
  ],
}

const breadcrumbSchema = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://cresoa.com.ng' },
    { '@type': 'ListItem', position: 2, name: 'Repairs', item: 'https://cresoa.com.ng/repairs' },
  ],
}

const webPageSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: 'Repair Shop Management Software | Cresoa',
  description: 'Repair shop management software built for Nigerian repair businesses.',
  url: 'https://cresoa.com.ng/repairs',
  isPartOf: { '@type': 'WebSite', name: 'Cresoa', url: 'https://cresoa.com.ng' },
}

export default function RepairsLandingPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageSchema) }} />
      <RepairsContent />
    </>
  )
}
