import FAQContent from './FAQContent'

export const metadata = {
  title: 'FAQ | Cresoa — Frequently asked questions',
  description: 'Answers about the Cresoa waitlist, pricing, Founding Member access, supported industries, and how the product works. Built for Nigerian SMEs.',
  keywords: ['Cresoa FAQ', 'Cresoa waitlist questions', 'Nigerian business software FAQ', 'business management software Nigeria'],
  openGraph: {
    title: 'FAQ | Cresoa',
    description: 'Answers about the Cresoa waitlist, pricing, Founding Member access, and how Cresoa works.',
    type: 'website',
    url: 'https://cresoa.com.ng/faq',
    siteName: 'Cresoa',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FAQ | Cresoa',
    description: 'Answers about the Cresoa waitlist, pricing, and how the product works.',
  },
  alternates: { canonical: '/faq' },
  robots: { index: true, follow: true },
}

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    // Getting Started
    { '@type': 'Question', name: 'What is Cresoa?', acceptedAnswer: { '@type': 'Answer', text: 'Cresoa is a business management platform built for Nigerian SMEs. It brings customers, orders, payments, production, inventory, and customer communication into one workspace, designed for mobile.' } },
    { '@type': 'Question', name: 'Who is Cresoa for?', acceptedAnswer: { '@type': 'Answer', text: 'Cresoa is built for Nigerian small and medium businesses. Fashion and tailoring, repairs and technical services, and printing and signage are live today. More industries follow.' } },
    { '@type': 'Question', name: 'When is Cresoa launching?', acceptedAnswer: { '@type': 'Answer', text: 'Cresoa launches in 6 months. Waitlist members hear first and get Beta access free for 30 days at launch.' } },
    { '@type': 'Question', name: 'Do I need a laptop to use Cresoa?', acceptedAnswer: { '@type': 'Answer', text: 'No. Cresoa is designed mobile-first. You can manage customers, orders, invoices, and payments entirely from your phone.' } },
    { '@type': 'Question', name: 'Do I need to be tech-savvy to use Cresoa?', acceptedAnswer: { '@type': 'Answer', text: 'No. Cresoa is designed to be simple enough that you and your workers can learn it quickly. If you can use WhatsApp, you can use Cresoa.' } },

    // Waitlist
    { '@type': 'Question', name: 'How does the waitlist work?', acceptedAnswer: { '@type': 'Answer', text: 'Join the waitlist with your name, email, and business type. You become a Founding Member. At launch, you hear first and get Beta access free for 30 days.' } },
    { '@type': 'Question', name: 'What does a Founding Member get?', acceptedAnswer: { '@type': 'Answer', text: 'Founding Members get early access at launch, Beta access free for 30 days, and email updates only when there is something worth sharing.' } },
    { '@type': 'Question', name: 'Will you spam my inbox?', acceptedAnswer: { '@type': 'Answer', text: 'No. We only email when there is something worth sharing. No weekly fluff, no marketing spam. You can leave the waitlist at any time.' } },
    { '@type': 'Question', name: 'Can I leave the waitlist?', acceptedAnswer: { '@type': 'Answer', text: 'Yes. Every email we send includes an unsubscribe link. You can leave whenever you want.' } },
    { '@type': 'Question', name: 'Do I need a credit card to join?', acceptedAnswer: { '@type': 'Answer', text: 'No. Joining the waitlist is free, and there is no charge until you choose a paid plan after launch.' } },

    // Industries
    { '@type': 'Question', name: 'Which industries does Cresoa support today?', acceptedAnswer: { '@type': 'Answer', text: 'Fashion and tailoring, repairs and technical services, and printing and signage are live. Each has its own tailored workspace.' } },
    { '@type': 'Question', name: 'Which industries are coming next?', acceptedAnswer: { '@type': 'Answer', text: 'Logistics and delivery, custom manufacturing, and salons and spa are next. More industries follow after launch.' } },
    { '@type': 'Question', name: 'Can I use Cresoa for more than one business?', acceptedAnswer: { '@type': 'Answer', text: 'Cresoa is designed for one business per account. This keeps your customer data, orders, and records clean and separate.' } },
    { '@type': 'Question', name: 'What if my industry is not listed yet?', acceptedAnswer: { '@type': 'Answer', text: 'Join the waitlist and pick Other. Tell us what you do when you sign up. We are building Cresoa for more industries after launch.' } },

    // Pricing & Beta
    { '@type': 'Question', name: 'Is there a free plan?', acceptedAnswer: { '@type': 'Answer', text: 'Yes. Cresoa has a Free plan that includes up to 20 customers, 50 orders, and 20 inventory items. Free forever, no card required.' } },
    { '@type': 'Question', name: 'How much do paid plans cost?', acceptedAnswer: { '@type': 'Answer', text: 'Starter is ₦3,500/month. Pro is ₦9,500/month. Both are billed monthly after launch.' } },
    { '@type': 'Question', name: 'What is the Beta plan?', acceptedAnswer: { '@type': 'Answer', text: 'Beta is a temporary plan available to waitlist members for 30 days after launch. It gives access to higher limits while Cresoa is still being improved. Beta is not a permanent plan.' } },
    { '@type': 'Question', name: 'What happens after the 30 days of Beta?', acceptedAnswer: { '@type': 'Answer', text: 'You choose a permanent plan — Free, Starter, or Pro. There is no automatic charge.' } },
    { '@type': 'Question', name: 'Can I switch plans later?', acceptedAnswer: { '@type': 'Answer', text: 'Yes. You can upgrade or downgrade at any time from your dashboard.' } },

    // Features
    { '@type': 'Question', name: 'Can my customers track their own orders?', acceptedAnswer: { '@type': 'Answer', text: 'Yes. Each order gets a private tracking link you can share via WhatsApp. Your customer sees the current stage without calling or messaging you.' } },
    { '@type': 'Question', name: 'Does Cresoa work with WhatsApp?', acceptedAnswer: { '@type': 'Answer', text: 'Yes. You can share invoices, order updates, and tracking links through WhatsApp without leaving Cresoa.' } },
    { '@type': 'Question', name: 'Can I create invoices for my customers?', acceptedAnswer: { '@type': 'Answer', text: 'Yes. Cresoa creates professional invoices with your business details, bank information, and a live balance. You can include your CAC and TIN numbers and share the invoice via WhatsApp or PDF.' } },
    { '@type': 'Question', name: 'Can I manage staff accounts?', acceptedAnswer: { '@type': 'Answer', text: 'Yes. Starter includes 2 staff accounts. Pro includes 10. Staff can be added from your dashboard and see only the work that concerns them.' } },
    { '@type': 'Question', name: 'What is Tessa AI?', acceptedAnswer: { '@type': 'Answer', text: 'Tessa is Cresoa\'s AI assistant. She answers questions about your business — orders, customers, revenue, outstanding payments — directly inside the app.' } },
    { '@type': 'Question', name: 'Can I track inventory?', acceptedAnswer: { '@type': 'Answer', text: 'Yes. Cresoa tracks fabric, accessories, parts, paper stock, and other inventory. The Free plan includes 20 items, Starter 100, and Pro is unlimited. Pro includes low-stock alerts.' } },
    { '@type': 'Question', name: 'Can I manage Aso-Ebi group orders?', acceptedAnswer: { '@type': 'Answer', text: 'Yes. Cresoa supports group orders with one coordinator and multiple members, all on one order with one deadline. Available on Starter, Beta, and Pro.' } },
  ],
}

const breadcrumbSchema = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://cresoa.com.ng' },
    { '@type': 'ListItem', position: 2, name: 'FAQ', item: 'https://cresoa.com.ng/faq' },
  ],
}

const webPageSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: 'FAQ | Cresoa',
  description: 'Frequently asked questions about Cresoa — the business management platform for Nigerian SMEs.',
  url: 'https://cresoa.com.ng/faq',
  isPartOf: { '@type': 'WebSite', name: 'Cresoa', url: 'https://cresoa.com.ng' },
}

export default function FAQPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageSchema) }} />
      <FAQContent />
    </>
  )
     }
