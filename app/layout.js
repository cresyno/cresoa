import { Inter } from 'next/font/google'
import './globals.css'
import ClientLayout from './ClientLayout'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  metadataBase: new URL('https://cresoa.vercel.app'),
  title: 'Cresoa | Business OS for Nigerian SMEs',
  description: 'Cresoa is a business management platform built for Nigerian SMEs. Manage customers, orders, inventory, workflows and your business from one place. Join the Cresoa Beta.',
  openGraph: {
    title: 'Cresoa | Business OS for Nigerian SMEs',
    description: 'Manage customers, orders, inventory, workflows and your business from one place with Cresoa.',
    url: 'https://cresoa.vercel.app',
    siteName: 'Cresoa',
    type: 'website',
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
              "url": "https://cresoa.vercel.app",
              "offers": {
                "@type": "AggregateOffer",
                "lowPrice": "0",
                "highPrice": "9500",
                "priceCurrency": "NGN"
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
