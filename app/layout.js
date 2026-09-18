import { Inter } from 'next/font/google'
import './globals.css'
import ClientLayout from './ClientLayout'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  metadataBase: new URL('https://www.cresoa.com.ng'),
  title: {
    default: 'Business Management Software & Inventory Tool for Nigerian SMEs | Cresoa',
    template: '%s | Cresoa'
  },
  description: 'Manage customers, orders, inventory, invoices, workflows, and payments in one place. Cresoa is the all-in-one Business OS built specifically for Nigerian SMEs.',
  keywords: [
    'Business management software Nigeria',
    'Fashion designer software Nigeria',
    'Tailor order management app',
    'Repair shop software Nigeria',
    'Printing business software Nigeria',
    'Inventory management for Nigerian SMEs',
    'Invoice generator Nigeria',
    'Cresoa',
    'Nigerian Business OS',
  ],
  icons: {
    icon: [{ url: '/cresoa-icon.svg', type: 'image/svg+xml' }],
    apple: '/cresoa-icon.svg',
  },
  openGraph: {
    title: 'Cresoa | Business OS for Nigerian SMEs',
    description: 'Manage customers, orders, inventory, workflows and your business from one place with Cresoa. Built for Fashion, Repairs, and Printing businesses.',
    url: 'https://www.cresoa.com.ng',
    siteName: 'Cresoa',
    type: 'website',
    locale: 'en_NG',
    images: [
      { url: '/og-image.png', width: 1200, height: 630, alt: 'Cresoa — Run your Nigerian business from one place' },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Cresoa | Business OS for Nigerian SMEs',
    description: 'Manage customers, orders, inventory, workflows and your business from one place with Cresoa.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: '/',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              "name": "Cresoa",
              "alternateName": "Cresoa Business OS",
              "url": "https://www.cresoa.com.ng",
              "logo": "https://www.cresoa.com.ng/cresoa-icon.svg",
              "description": "Business management software built for Nigerian SMEs. Fashion, Repairs, and Printing.",
              "founder": { "@type": "Person", "name": "Taiwo Abraham Feranmi" },
              "foundingLocation": { "@type": "Place", "name": "Nigeria" },
              "areaServed": { "@type": "Country", "name": "Nigeria" },
              
            })
          }}
        />

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              "name": "Cresoa",
              "applicationCategory": "BusinessApplication",
              "description": "Cresoa is a business management platform built for Nigerian SMEs. Supports Fashion & Custom Wear, Repairs & Technical Services, and Printing & Signage.",
              "operatingSystem": "Web",
              "url": "https://www.cresoa.com.ng",
              "offers": {
                "@type": "AggregateOffer",
                "lowPrice": "0",
                "highPrice": "9500",
                "priceCurrency": "NGN"
              },
              "author": { "@type": "Person", "name": "Taiwo Abraham Feranmi" },
              "publisher": { "@type": "Organization", "name": "Cresoa", "url": "https://www.cresoa.com.ng" }
            })
          }}
        />
      </head>
      <body className={inter.className}>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  )
}
