'use client'

// components/BottomNav.js
// Mobile-only primary navigation. Items come from lib/sector-config.js
// (getBottomNavItemsFor) so the bar can never drift from the sidebar.

import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { getBottomNavItemsFor, isNavPathActive } from '../lib/sector-config'
import { BottomNavIcon } from './BottomNavIcons'

export function BottomNav({ businessId, sector }) {
  const pathname = usePathname()
  const router = useRouter()
  const [isDesktop, setIsDesktop] = useState(false)

  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  if (isDesktop) return null

  const currentSector = sector || 'fashion'
  const navItems = getBottomNavItemsFor(currentSector)

  const navigate = (path) => {
    if (!businessId) {
      console.warn('No businessId for navigation')
      return
    }
    const separator = path.includes('?') ? '&' : '?'
    router.push(`${path}${separator}business_id=${businessId}`)
  }

  const activeIndex = navItems.findIndex((item) => isNavPathActive(pathname, item.path))

  return (
    <nav style={navContainer} aria-label="Primary">
      {navItems.map((item, idx) => {
        const isActive = idx === activeIndex
        return (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            aria-label={item.name}
            aria-current={isActive ? 'page' : undefined}
            style={navButton}
          >
            <BottomNavIcon
              name={item.icon}
              size={21}
              stroke={isActive ? 'var(--cresoa-accent)' : 'var(--cresoa-text-muted)'}
            />
            <span
              style={{
                fontSize: 10.5,
                letterSpacing: '0.015em',
                fontWeight: isActive ? 600 : 500,
                color: isActive ? 'var(--cresoa-accent)' : 'var(--cresoa-text-muted)',
                lineHeight: 1,
                transition: 'color 180ms ease',
              }}
            >
              {item.name}
            </span>
          </button>
        )
      })}
    </nav>
  )
}

const navContainer = {
  position: 'fixed',
  bottom: 0,
  left: 0,
  right: 0,
  zIndex: 1000,
  display: 'flex',
  alignItems: 'stretch',
  background: 'var(--cresoa-surface)',
  borderTop: '1px solid var(--cresoa-border)',
  // iPhone home-indicator safe area
  paddingBottom: 'env(safe-area-inset-bottom, 0px)',
}

const navButton = {
  flex: 1,
  minWidth: 0,
  height: 58,
  background: 'transparent',
  border: 0,
  padding: 0,
  margin: 0,
  cursor: 'pointer',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 5,
  outline: 'none',
  WebkitTapHighlightColor: 'transparent',
}
