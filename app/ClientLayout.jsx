'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import TessaFloatingWidget from '@/components/support/TessaFloatingWidget'

export default function ClientLayout({ children }) {
  const pathname = usePathname()
  const isTrackingPage = pathname?.startsWith('/track/')
  const isTessaPage = pathname?.startsWith('/dashboard/tessa')
  const [theme, setTheme] = useState('light')

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
    <>
      {children}
      {pathname?.startsWith('/dashboard') && !isTessaPage && <TessaFloatingWidget />}
      <style>{`
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
    </>
  )
}
