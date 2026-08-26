'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

const Svg = ({ name, size = 20, stroke = 'currentColor', style }) => {
  const icons = {
    'bar-chart-2': <><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></>,
    tool: <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />,
    users: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>,
    package: <><path d="M20.91 8.84L12 13 3.09 8.84" /><line x1="12" y1="22" x2="12" y2="13" /><line x1="2" y1="4" x2="12" y2="9" /><line x1="22" y1="4" x2="12" y2="9" /></>,
    invoice: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><line x1="10" y1="9" x2="8" y2="9" /></>,
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
      {icons[name]}
    </svg>
  )
}

export function RepairsNavigation({ businessId }) {
  const pathname = usePathname()
  const router = useRouter()
  const [isDesktop, setIsDesktop] = useState(false)
  const [tapBounce, setTapBounce] = useState(null)

  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const navItems = [
    { icon: 'bar-chart-2', label: 'Dashboard', path: '/dashboard/repairs' },
    { icon: 'tool', label: 'Jobs', path: '/dashboard/repairs/jobs' },
    { icon: 'users', label: 'Customers', path: '/dashboard/repairs/customers' },
    { icon: 'package', label: 'Parts', path: '/dashboard/repairs/parts' },
    { icon: 'invoice', label: 'Invoices', path: '/dashboard/invoices' },
  ]

  const navigate = (path, idx) => {
    if (!businessId) return
    const separator = path.includes('?') ? '&' : '?'
    router.push(`${path}${separator}business_id=${businessId}`)
    // Trigger bounce animation
    setTapBounce(idx)
    setTimeout(() => setTapBounce(null), 300)
  }

  // Find active index with better matching:
  const activeIndex = (() => {
    if (!pathname) return -1
    if (pathname === '/dashboard/repairs') return 0
    if (pathname.startsWith('/dashboard/repairs/jobs')) return 1
    if (pathname.startsWith('/dashboard/repairs/customers')) return 2
    if (pathname.startsWith('/dashboard/repairs/inventory')) return 3
    if (pathname.startsWith('/dashboard/invoices')) return 4
    return -1
  })()

  if (isDesktop) return null

  return (
    <>
      <style>{`
        @keyframes navBounce {
          0% { transform: scale(1); }
          30% { transform: scale(1.3); }
          60% { transform: scale(0.9); }
          100% { transform: scale(1); }
        }
        .nav-bounce {
          animation: navBounce 0.3s ease;
        }
      `}</style>
      <nav style={navContainer}>
        {/* Sliding indicator */}
        <div
          style={{
            position: 'absolute',
            bottom: 2,
            left: 0,
            width: `${100 / navItems.length}%`,
            height: 3,
            background: 'linear-gradient(90deg, var(--cresoa-accent), var(--cresoa-accent-dark))',
            borderRadius: '999px',
            boxShadow: '0 -2px 6px rgba(212,165,42,0.4)',
            transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            transform: `translateX(${Math.max(activeIndex, 0) * 100}%)`,
            pointerEvents: 'none',
          }}
        />
        {navItems.map((item, idx) => {
          const isActive = idx === activeIndex
          const isTapped = tapBounce === idx
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path, idx)}
              style={{
                ...navButton,
                color: isActive ? 'var(--cresoa-accent)' : 'var(--cresoa-text-muted)',
              }}
            >
              <div
                className={isTapped ? 'nav-bounce' : ''}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 2,
                  transform: isActive ? 'scale(1.1)' : 'scale(1)',
                  transition: 'transform 0.2s ease',
                }}
              >
                <Svg name={item.icon} size={24} stroke={isActive ? 'var(--cresoa-accent)' : 'var(--cresoa-text-muted)'} />
                <span style={{ fontSize: 10, fontWeight: isActive ? 700 : 400 }}>{item.label}</span>
              </div>
            </button>
          )
        })}
      </nav>
    </>
  )
}

const navContainer = {
  position: 'fixed',
  bottom: 0,
  left: 0,
  right: 0,
  display: 'flex',
  justifyContent: 'space-around',
  padding: '8px 0',
  background: 'var(--cresoa-surface)',
  borderTop: '1px solid var(--cresoa-border)',
  zIndex: 1000,
  height: '64px',
  boxShadow: '0 -2px 10px rgba(0,0,0,0.05)',
}

const navButton = {
  background: 'transparent',
  border: 0,
  padding: '8px 4px',
  cursor: 'pointer',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 2,
  justifyContent: 'center',
  transition: 'color 0.2s ease',
  minWidth: 0,
  flex: 1,
                }
