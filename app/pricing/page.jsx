import PricingContent from './PricingContent'

export const metadata = {
  title: 'Pricing | Cresoa — Simple, transparent pricing for Nigerian businesses',
  description: 'Free plan forever. Starter at ₦3,500/month. Pro at ₦9,500/month. Waitlist members get Beta access free for 90 days. No credit card required.',
  keywords: ['Cresoa pricing', 'business management software Nigeria pricing', 'tailor app pricing Nigeria', 'affordable SME software Nigeria'],
  openGraph: {
    title: 'Pricing | Cresoa',
    description: 'Free plan forever. Starter ₦3,500/mo. Pro ₦9,500/mo. Waitlist members get Beta access free for 90 days.',
    type: 'website',
    url: 'https://cresoa.com.ng/pricing',
    siteName: 'Cresoa',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Pricing | Cresoa',
    description: 'Free plan forever. Starter ₦3,500/mo. Pro ₦9,500/mo. Beta access free for waitlist members.',
  },
  alternates: { canonical: '/pricing' },
  robots: { index: true, follow: true },
}

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    { '@type': 'Question', name: 'When will I be charged?', acceptedAnswer: { '@type': 'Answer', text: 'Only after Cresoa launches. Joining the waitlist is free, and there is no charge until you choose a paid plan.' } },
    { '@type': 'Question', name: 'What is the Beta plan?', acceptedAnswer: { '@type': 'Answer', text: 'Beta is a temporary plan available to waitlist members for 90 days after launch. It gives access to higher limits while Cresoa is still being improved. Beta is not a permanent plan.' } },
    { '@type': 'Question', name: 'What happens after the 90-day Beta ends?', acceptedAnswer: { '@type': 'Answer', text: 'You choose a permanent plan — Free, Starter, or Pro. There is no automatic charge.' } },
    { '@type': 'Question', name: 'Do I need a credit card to join the waitlist?', acceptedAnswer: { '@type': 'Answer', text: 'No. Not to join the waitlist, and not to claim Beta access.' } },
    { '@type': 'Question', name: 'Can I switch plans later?', acceptedAnswer: { '@type': 'Answer', text: 'Yes. You can upgrade or downgrade at any time from your dashboard.' } },
  ],
}

const breadcrumbSchema = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://cresoa.com.ng' },
    { '@type': 'ListItem', position: 2, name: 'Pricing', item: 'https://cresoa.com.ng/pricing' },
  ],
}

const webPageSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: 'Pricing | Cresoa',
  description: 'Pricing for Cresoa — business management software built for Nigerian SMEs.',
  url: 'https://cresoa.com.ng/pricing',
  isPartOf: { '@type': 'WebSite', name: 'Cresoa', url: 'https://cresoa.com.ng' },
}

export default function PricingPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageSchema) }} />
      <PricingContent />
    </>
  )
}
