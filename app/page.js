import HomepageContent from './HomepageContent'

export const metadata = {
  title: 'Cresoa | Business Management Software for Nigerian SMEs',
  description: 'Cresoa is a mobile-first business management platform built for Nigerian SMEs across multiple industries. Manage customers, orders, production, invoices, and payments from one place. Start free today.',
  keywords: [
    'Business management software Nigeria',
    'SME software Nigeria',
    'Cresoa',
    'mobile business app Nigeria',
    'order management Nigeria',
    'invoicing software Nigeria',
    'fashion business software',
    'repair shop software',
  ],
  openGraph: {
    title: 'Cresoa | Business Management Software for Nigerian SMEs',
    description: 'Manage customers, orders, inventory, workflows, and your business from one place. Built for multiple industries.',
    type: 'website',
    url: 'https://cresoa.com.ng',
    siteName: 'Cresoa',
    locale: 'en_NG',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Cresoa | Business Management Software for Nigerian SMEs',
    description: 'Manage customers, orders, inventory, workflows, and your business from one place.',
  },
  alternates: {
    canonical: '/',
  },
  robots: { index: true, follow: true },
}

export default function Page() {
  return (
    <>
      {/* WebSite Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            name: 'Cresoa',
            url: 'https://cresoa.com.ng',
            potentialAction: {
              '@type': 'SearchAction',
              target: 'https://cresoa.com.ng/?s={search_term_string}',
              'query-input': 'required name=search_term_string'
            }
          })
        }}
      />

      {/* Organization Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Organization',
            name: 'Cresoa',
            url: 'https://cresoa.com.ng',
            logo: 'https://cresoa.com.ng/logo.png',
            description: 'A mobile-first business management platform for Nigerian SMEs.',
            areaServed: 'NG',
            sameAs: []
          })
        }}
      />

      {/* FAQ Structured Data (Multi-Industry Focus) */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: [
              {
                '@type': 'Question',
                name: 'What is Cresoa?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'Cresoa is a business management platform built for Nigerian SMEs. It helps you manage customers, orders, payments, and production in one place, across multiple industries.'
                }
              },
              {
                '@type': 'Question',
                name: 'Is there a free plan?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'Yes! Cresoa has a Free plan that includes up to 20 customers and 50 orders. You can use it indefinitely without paying.'
                }
              },
              {
                '@type': 'Question',
                name: 'How much does it cost?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'The Starter plan is ₦3,500/month and the Pro plan is ₦9,500/month. Both include a 90-day beta with full Pro features, no credit card required.'
                }
              },
              {
                '@type': 'Question',
                name: 'What industries does Cresoa support?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'Cresoa currently supports Fashion & Custom Wear and Repairs & Technical Services, with plans to expand to 10+ industries including Logistics, Trading, Manufacturing, and more.'
                }
              },
              {
                '@type': 'Question',
                name: 'Can I use Cresoa on my phone?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'Yes! Cresoa is fully responsive and works on any device—phone, tablet, or desktop.'
                }
              },
              {
                '@type': 'Question',
                name: 'How do I get started?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'Simply click "Start Beta", create your account, choose your business type, and start adding customers.'
                }
              }
            ]
          })
        }}
      />

      <HomepageContent />
    </>
  )
      }
