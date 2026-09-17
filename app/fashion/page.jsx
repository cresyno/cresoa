import FashionContent from './FashionContent'

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

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    { '@type': 'Question', name: 'Can I track Aso-Ebi group orders in Cresoa?', acceptedAnswer: { '@type': 'Answer', text: 'Yes. Create a group, add the coordinator, and keep every member and their individual order organised in one place. Perfect for bulk clothing orders.' } },
    { '@type': 'Question', name: 'Can I store customer measurements?', acceptedAnswer: { '@type': 'Answer', text: 'Yes. Every customer profile has space for waist, bust, shoulder, arm length, and any custom measurements you need. Reuse them for every future order — no more searching through WhatsApp.' } },
    { '@type': 'Question', name: 'Can my customers track their own order status?', acceptedAnswer: { '@type': 'Answer', text: 'Yes. Each order gets a private tracking link you can share via WhatsApp. Your customer sees the current stage without calling or messaging you.' } },
    { '@type': 'Question', name: 'Do I need a laptop, or can I use my phone?', acceptedAnswer: { '@type': 'Answer', text: 'Your phone is enough. Cresoa is built mobile-first — because that is where Nigerian fashion businesses actually work.' } },
    { '@type': 'Question', name: 'Can I send invoices via WhatsApp?', acceptedAnswer: { '@type': 'Answer', text: 'Yes. Create a professional invoice with your logo, bank details, and payment breakdown. Share it directly through WhatsApp in one tap.' } },
    { '@type': 'Question', name: 'When does Cresoa launch for fashion businesses?', acceptedAnswer: { '@type': 'Answer', text: 'In 6 months. Join the waitlist to become a Founding Member and get 30 days of Pro features free at launch.' } },
  ],
}

const breadcrumbSchema = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://cresoa.com.ng' },
    { '@type': 'ListItem', position: 2, name: 'Fashion', item: 'https://cresoa.com.ng/fashion' },
  ],
}

export default function FashionLandingPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <FashionContent />
    </>
  )
}
