'use client'

import { Inter } from 'next/font/google'
import { usePathname } from 'next/navigation'

const inter = Inter({ subsets: ['latin'] })

export default function RootLayout({ children }) {
  const pathname = usePathname()
  const isTrackingPage = pathname?.startsWith('/track/')

  return (
    <html lang="en">
      <head>
        <title>Cresoa — Business OS for Nigerian SMEs</title>
        <meta name="description" content="Manage customers, orders, payments, and production in one place." />
      </head>
      <body className={inter.className}>
        {children}
        {/* Floating Support Button – hidden on tracking pages */}
        {!isTrackingPage && (
          <a
            href="https://wa.me/2349049209780?text=Hi%20Cresoa%20Support%2C%20I%20need%20help%20with..."
            target="_blank"
            rel="noopener noreferrer"
            className="support-float"
            aria-label="Contact Support on WhatsApp"
          >
            <span className="support-icon">💬</span>
            <span className="support-text">Support</span>
          </a>
        )}

        <style>{`
          .support-float {
            position: fixed;
            bottom: 24px;
            right: 24px;
            display: flex;
            align-items: center;
            gap: 8px;
            background: #25D366;
            color: #fff;
            padding: 12px 18px;
            border-radius: 50px;
            box-shadow: 0 4px 16px rgba(37, 211, 102, 0.4);
            text-decoration: none;
            font-weight: 600;
            font-size: 0.9rem;
            z-index: 9999;
            transition: transform 0.2s ease, box-shadow 0.2s ease;
            animation: pulseGlow 2s ease-in-out infinite;
            border: none;
            cursor: pointer;
          }
          .support-float:hover {
            transform: scale(1.05);
            box-shadow: 0 8px 24px rgba(37, 211, 102, 0.5);
          }
          .support-float:active {
            transform: scale(0.95);
          }
          .support-icon {
            font-size: 1.4rem;
            line-height: 1;
          }
          .support-text {
            display: inline-block;
          }
          @keyframes pulseGlow {
            0%, 100% { transform: scale(1); box-shadow: 0 4px 16px rgba(37, 211, 102, 0.4); }
            50% { transform: scale(1.05); box-shadow: 0 8px 32px rgba(37, 211, 102, 0.6); }
          }
          @media (max-width: 480px) {
            .support-float {
              bottom: 16px;
              right: 16px;
              padding: 10px 14px;
              font-size: 0.8rem;
            }
            .support-icon {
              font-size: 1.2rem;
            }
            .support-text {
              display: none;
            }
          }
        `}</style>
      </body>
    </html>
  )
              }
