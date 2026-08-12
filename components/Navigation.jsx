'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Icon } from './Icon'  // adjust path if needed

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
    { icon: 'orders', label: 'Orders', path: '/dashboard/orders' },
    { icon: 'production', label: 'Production', path: '/dashboard/production' },
    { icon: 'customers', label: 'Customers', path: '/dashboard/customers' },
  ]

  const navigate = (path) => {
    const separator = path.includes('?') ? '&' : '?'
    router.push(`${path}${separator}business_id=${businessId}`)
  }

  if (isDesktop) {
    return (
      <nav className="cresoa-nav-desktop" style={{ display: 'flex', gap: 16, padding: '8px 0', borderBottom: '1px solid var(--cresoa-border)' }}>
        {navItems.map(item => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className={`cresoa-nav-link ${pathname.startsWith(item.path) ? 'active' : ''}`}
            style={{
              background: 'transparent',
              border: 0,
              padding: '6px 12px',
              cursor: 'pointer',
              color: pathname.startsWith(item.path) ? 'var(--cresoa-accent)' : 'var(--cresoa-text-muted)',
              fontWeight: pathname.startsWith(item.path) ? 700 : 400,
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <Icon name={item.icon} size={20} />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
    )
  }

  return (
    <nav className="cresoa-nav-bottom" style={{ display: 'flex', justifyContent: 'space-around', padding: '8px 0', borderTop: '1px solid var(--cresoa-border)', background: 'var(--cresoa-surface)' }}>
      {navItems.map(item => (
        <button
          key={item.path}
          onClick={() => navigate(item.path)}
          className={`cresoa-nav-link ${pathname.startsWith(item.path) ? 'active' : ''}`}
          style={{
            background: 'transparent',
            border: 0,
            padding: '8px 4px',
            cursor: 'pointer',
            color: pathname.startsWith(item.path) ? 'var(--cresoa-accent)' : 'var(--cresoa-text-muted)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            fontSize: 10,
            fontWeight: pathname.startsWith(item.path) ? 700 : 400
          }}
        >
          <Icon name={item.icon} size={24} />
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  )
}
