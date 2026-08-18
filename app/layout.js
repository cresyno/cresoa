'use client'

import { Inter } from 'next/font/google'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import './globals.css'
import TessaFloatingWidget from '@/components/support/TessaFloatingWidget'

const inter = Inter({ subsets: ['latin'] })

export default function RootLayout({ children }) {
  const pathname = usePathname()
  const isTrackingPage = pathname?.startsWith('/track/')
  const isTessaPage = pathname?.startsWith('/dashboard/tessa') // ✅ New check for Tessa's own page
  const [theme, setTheme] = useState('light')

  // Load theme from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('cresoa-theme')
    if (savedTheme) {
      setTheme(savedTheme)
      document.documentElement.setAttribute('data-theme', savedTheme)
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setTheme('dark')
      document.documentElement.setAttribute('data-theme', 'dark')
    }
  }, [])

  return (
    <html lang="en" data-theme={theme}>
      <head>
        <title>Cresoa — Business OS for Nigerian SMEs</title>
        <meta name="description" content="Manage customers, orders, payments, and production in one place." />
      </head>
      <body className={inter.className}>
        {children}

        {/* Tessa AI Floating Assistant - Hidden on tracking pages AND the Tessa chat page */}
        {!isTrackingPage && !isTessaPage && <TessaFloatingWidget />}

        <style>{`
          /* ─── GLOBAL CSS VARIABLES ─── */
          :root {
            --color-bg: #F7F5F0;
            --color-card: #FFFFFF;
            --color-text: #1A1A1A;
            --color-text-muted: #8A8A8A;
            --color-border: #E5E0D8;
            --color-primary: #0F2B4A;
            --color-accent: #D4A52A;
            --color-success: #2E7D5E;
            --color-danger: #D9534F;
            --shadow: 0 4px 16px rgba(15,43,74,0.06);
          }

          [data-theme="dark"] {
            --color-bg: #12121A;
            --color-card: #1E1E2A;
            --color-text: #E8E8E8;
            --color-text-muted: #AAAAAA;
            --color-border: #2A2A3A;
            --color-primary: #D4A52A;
            --color-accent: #D4A52A;
            --color-success: #2E7D5E;
            --color-danger: #D9534F;
            --shadow: 0 4px 16px rgba(0,0,0,0.3);
          }

          body {
            background: var(--color-bg);
            color: var(--color-text);
            transition: background 0.3s ease, color 0.3s ease;
            margin: 0;
            font-family: 'Inter', -apple-system, sans-serif;
          }
        `}</style>
      </body>
    </html>
  )
}
