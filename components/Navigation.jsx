'use client'

// components/BottomNav.js
// Replaces Navigation.js, RepairsNavigation.js, PrintingNavigation.js.
// Items come from lib/sector-config.js — there is nothing sector-specific
// written in this file, so it can never drift from the sidebar again.

import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { getBottomNavItemsFor, isNavPathActive } from '../lib/sector-config'
import { BottomNavIcon } from './BottomNavIcons'

export function BottomNav({ businessId, sector }) {
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

  // Desktop already has the full sidebar (see app/dashboard/layout.js) —
  // a second nav bar there would just be a duplicate. Mobile-only by design.
  if (isDesktop) return null

  const currentSector = sector || 'fashion'
  const navItems = getBottomNavItemsFor(currentSector)

  const navigate = (path, idx) => {
    if (!businessId) {
      console.warn('No businessId for navigation')
      return
    }
    const separator = path.includes('?') ? '&' : '?'
    router.push(`${path}${separator}business_id=${businessId}`)
    setTapBounce(idx)
    setTimeout(() => setTapBounce(null), 300)
  }

  const activeIndex = navItems.findIndex((item) => isNavPathActive(pathname, item.path))

  return (
    <>
      <style>{`
        @keyframes cresoaNavBounce {
          0% { transform: scale(1); }
          30% { transform: scale(1.3); }
          60% { transform: scale(0.9); }
          100% { transform: scale(1); }
        }
        .cresoa-nav-bounce { animation: cresoaNavBounce 0.3s ease; }
      `}</style>
      <nav style={navContainer}>
        {navItems.length > 0 && (
          <div
            style={{
              position: 'absolute',
              bottom: 2,
              left: 0,
              width: `${100 / navItems.length}%`,
              height: 3,
              background: 'var(--cresoa-accent)',
              borderRadius: '999px',
              transition: 'transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
              transform: `translateX(${Math.max(activeIndex, 0) * 100}%)`,
              pointerEvents: 'none',
            }}
          />
        )}
        {navItems.map((item, idx) => {
          const isActive = idx === activeIndex
          const isTapped = tapBounce === idx
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path, idx)}
              style={{ ...navButton, color: isActive ? 'var(--cresoa-accent)' : 'var(--cresoa-text-muted)' }}
            >
              <div
                className={isTapped ? 'cresoa-nav-bounce' : ''}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, transform: isActive ? 'scale(1.1)' : 'scale(1)', transition: 'transform 0.2s ease' }}
              >
                <BottomNavIcon name={item.icon} size={24} stroke={isActive ? 'var(--cresoa-accent)' : 'var(--cresoa-text-muted)'} />
                <span style={{ fontSize: 10, fontWeight: isActive ? 700 : 400 }}>{item.name}</span>
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
