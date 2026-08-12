'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Icon } from './Icon'   // adjust path if needed

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
              <Icon name={item.icon} size={20} />
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
            <Icon name={item.icon} size={24} />
            <span>{item.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
