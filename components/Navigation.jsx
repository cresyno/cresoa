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
      <nav className="cresoa-nav-desktop">
        {navItems.map(item => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className={`cresoa-nav-link ${pathname.startsWith(item.path) ? 'active' : ''}`}
          >
            <Icon name={item.icon} size={20} />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
    )
  }

  return (
    <nav className="cresoa-nav-bottom">
      {navItems.map(item => (
        <button
          key={item.path}
          onClick={() => navigate(item.path)}
          className={`cresoa-nav-link ${pathname.startsWith(item.path) ? 'active' : ''}`}
        >
          <Icon name={item.icon} size={24} />
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  )
}
