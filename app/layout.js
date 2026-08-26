import { Inter } from 'next/font/google'
import './globals.css'
import ClientLayout from './ClientLayout'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  metadataBase: new URL('https://cresoa.com.ng'),
  title: {
    default: 'Cresoa | Business OS for Nigerian SMEs',
    template: '%s | Cresoa'
  },
  description: 'Cresoa is the all-in-one business management platform built for Nigerian SMEs. Manage customers, orders, inventory, invoices, workflows, and payments in one place. Join the Cresoa Beta today.',
  keywords: [
    'Business management software Nigeria',
    'Fashion designer software Nigeria',
    'Tailor order management app',
    'Inventory management for Nigerian SMEs',
    'Invoice generator Nigeria',
    'Cresoa',
    'Nigerian Business OS',
    'Cresoa Beta',
    'Manage orders and customers'
  ],
  // ✅ FAVICON ADDED HERE
  icons: {
    icon: '/favicon.png',
    // Optional: Apple touch icon for iOS devices
    apple: '/favicon.png',
  },
  openGraph: {
    title: 'Cresoa | Business OS for Nigerian SMEs',
    description: 'Manage customers, orders, inventory, workflows and your business from one place with Cresoa. Built for Fashion, Repairs, Traders, and Logistics.',
    url: 'https://cresoa.com.ng',
    siteName: 'Cresoa',
    type: 'website',
    locale: 'en_NG',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Cresoa | Business OS for Nigerian SMEs',
    description: 'Manage customers, orders, inventory, workflows and your business from one place with Cresoa.',
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
        {/* JSON-LD Schema for Search Engines - Accurate pricing */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              "name": "Cresoa",
              "applicationCategory": "BusinessApplication",
              "description": "Cresoa is a multi-tenant business management platform designed for Nigerian SMEs. It supports Fashion & Custom Wear, Repairs & Technical Services, and Custom Manufacturing.",
              "operatingSystem": "Web",
              "url": "https://cresoa.com.ng",
              "offers": {
                "@type": "AggregateOffer",
                "lowPrice": "0",
                "highPrice": "9500",
                "priceCurrency": "NGN"
              },
              "author": {
                "@type": "Person",
                "name": "Taiwo Abraham Feranmi"
              },
              "publisher": {
                "@type": "Organization",
                "name": "Cresoa",
                "url": "https://cresoa.com.ng"
              }
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
