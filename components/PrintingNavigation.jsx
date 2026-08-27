'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

const Svg = ({ name, size = 20, stroke = 'currentColor', style }) => {
  const icons = {
    'bar-chart-2': <><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></>,
    'file-text': <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></>,
    'layers': <><polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" /></>,
    'users': <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>,
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>{icons[name]}</svg>
}

export function PrintingNavigation({ businessId }) {
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
    { icon: 'bar-chart-2', label: 'Dashboard', path: '/dashboard/printing' },
    { icon: 'file-text', label: 'Jobs', path: '/dashboard/printing/jobs' },
    { icon: 'file-text', label: 'Quotes', path: '/dashboard/printing/quotations' },
    { icon: 'layers', label: 'Production', path: '/dashboard/printing/production' },
    { icon: 'users', label: 'Customers', path: '/dashboard/printing/customers' },
    { icon: 'file-text', label: 'Invoices', path: '/dashboard/printing/invoices' },
  ]

  const navigate = (path) => {
    if (!businessId) return
    const separator = path.includes('?') ? '&' : '?'
    router.push(`${path}${separator}business_id=${businessId}`)
  }

  // Find active index
  const activeIndex = (() => {
    if (!pathname) return -1
    if (pathname === '/dashboard/printing') return 0
    if (pathname.startsWith('/dashboard/printing/jobs')) return 1
    if (pathname.startsWith('/dashboard/printing/quotations')) return 2
    if (pathname.startsWith('/dashboard/printing/production')) return 3
    if (pathname.startsWith('/dashboard/printing/customers')) return 4
    if (pathname.startsWith('/dashboard/printing/invoices')) return 5
    return -1
  })()

  if (isDesktop) return null

  return (
    <nav style={navContainer}>
      <div style={{ position: 'absolute', bottom: 4, left: 0, width: `${100 / navItems.length}%`, height: 3, background: 'var(--cresoa-accent)', borderRadius: '999px', transition: 'transform 0.3s ease', transform: `translateX(${Math.max(activeIndex, 0) * 100}%)`, pointerEvents: 'none' }} />
      {navItems.map((item, idx) => {
        const isActive = idx === activeIndex
        return (
          <button key={item.path} onClick={() => navigate(item.path)} style={{ ...navButton, color: isActive ? 'var(--cresoa-accent)' : 'var(--cresoa-text-muted)', transform: isActive ? 'scale(1.1)' : 'scale(1)' }}>
            <Svg name={item.icon} size={24} stroke={isActive ? 'var(--cresoa-accent)' : 'var(--cresoa-text-muted)'} />
            <span style={{ fontSize: 10, fontWeight: isActive ? 700 : 400 }}>{item.label}</span>
          </button>
        )
      })}
    </nav>
  )
}

const navContainer = {
  position: 'fixed', bottom: 0, left: 0, right: 0, display: 'flex', justifyContent: 'space-around', padding: '8px 0', background: 'var(--cresoa-surface)', borderTop: '1px solid var(--cresoa-border)', zIndex: 1000, height: '64px', boxShadow: '0 -2px 10px rgba(0,0,0,0.05)',
}

const navButton = {
  background: 'transparent', border: 0, padding: '8px 4px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, justifyContent: 'center', transition: 'transform 0.2s ease, color 0.2s ease', minWidth: 0, flex: 1,
      }
