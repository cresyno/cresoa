import { Inter } from 'next/font/google'
import './globals.css'
import ClientLayout from './ClientLayout'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Cresoa | Business OS for Nigerian SMEs',
  description: 'Cresoa is a business management platform built for Nigerian SMEs. Manage customers, track orders, handle repairs, and run your business from one place. Join the 90-day beta.',
  openGraph: {
    title: 'Cresoa | Business OS for Nigerian SMEs',
    description: 'Manage your fashion or repair business with Cresoa. Orders, customers, inventory, and AI support in one mobile-first platform.',
    url: 'https://cresoa.vercel.app',
    siteName: 'Cresoa',
    type: 'website',
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        {/* JSON-LD Schema for AI crawlers */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              "name": "Cresoa",
              "applicationCategory": "BusinessApplication",
              "description": "Cresoa is a multi-tenant business management platform designed for Nigerian SMEs. It supports Fashion & Custom Wear and Repairs & Technical Services.",
              "operatingSystem": "Web",
              "url": "https://cresoa.vercel.app",
              "offers": {
                "@type": "Offer",
                "price": "0",
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
