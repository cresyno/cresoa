'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

// ─── Self-contained SVG icons (no imports) ───
const Svg = ({ name, size = 20, stroke = 'currentColor', style }) => {
  const icons = {
    home: <><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></>,
    'file-text': <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></>,
    layers: <><polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" /></>,
    users: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>,
    invoice: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><line x1="10" y1="9" x2="8" y2="9" /></>,
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
      {icons[name]}
    </svg>
  )
}

export function Navigation({ businessId }) {
  const pathname = usePathname()
  const router = useRouter()
  const [isDesktop, setIsDesktop] = useState(false)

  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const navItems = [
    { icon: 'home', label: 'Home', path: '/dashboard/fashion' },
    { icon: 'file-text', label: 'Orders', path: '/dashboard/orders' },
    { icon: 'layers', label: 'Production', path: '/dashboard/production' },
    { icon: 'users', label: 'Customers', path: '/dashboard/customers' },
    { icon: 'invoice', label: 'Invoices', path: '/dashboard/invoices' },
  ]

  const navigate = (path) => {
    if (!businessId) {
      console.warn('No businessId for navigation')
      return
    }
    const separator = path.includes('?') ? '&' : '?'
    router.push(`${path}${separator}business_id=${businessId}`)
  }

  // Desktop: horizontal bar
  if (isDesktop) {
    return (
      <nav style={{ display: 'flex', gap: 16, padding: '8px 0', borderBottom: '1px solid var(--cresoa-border)', marginBottom: 16 }}>
        {navItems.map(item => {
          const isActive = pathname?.startsWith(item.path) || false
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              style={{
                background: 'transparent',
                border: 0,
                padding: '6px 12px',
                cursor: 'pointer',
                color: isActive ? 'var(--cresoa-accent)' : 'var(--cresoa-text-muted)',
                fontWeight: isActive ? 700 : 400,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 14,
              }}
            >
              <Svg name={item.icon} size={20} />
              <span>{item.label}</span>
            </button>
          )
        })}
      </nav>
    )
  }

  // Mobile: bottom navigation
  return (
    <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, display: 'flex', justifyContent: 'space-around', padding: '8px 0', borderTop: '1px solid var(--cresoa-border)', background: 'var(--cresoa-surface)', zIndex: 100 }}>
      {navItems.map(item => {
        const isActive = pathname?.startsWith(item.path) || false
        return (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            style={{
              background: 'transparent',
              border: 0,
              padding: '8px 4px',
              cursor: 'pointer',
              color: isActive ? 'var(--cresoa-accent)' : 'var(--cresoa-text-muted)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              fontSize: 10,
              fontWeight: isActive ? 700 : 400,
            }}
          >
            <Svg name={item.icon} size={24} />
            <span>{item.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
