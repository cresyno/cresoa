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
    setTimeout(() => setTapBounce(null), 320)
  }

  const activeIndex = navItems.findIndex((item) => isNavPathActive(pathname, item.path))

  return (
    <>
      <style>{`
        @keyframes cresoaNavTap {
          0%   { transform: scale(1); }
          40%  { transform: scale(0.82); }
          70%  { transform: scale(1.06); }
          100% { transform: scale(1); }
        }
        .cresoa-nav-item { -webkit-tap-highlight-color: transparent; user-select: none; }
        .cresoa-nav-item:active .cresoa-nav-icon-wrap { transform: scale(0.92); }
        .cresoa-nav-tap { animation: cresoaNavTap 0.32s cubic-bezier(0.34, 1.56, 0.64, 1); }
        .cresoa-nav-label { letter-spacing: 0.01em; }
      `}</style>

      <nav style={navContainer} aria-label="Primary">
        {/* Glass highlight strip */}
        <div style={glassStrip} />

        <div style={itemsRow}>
          {navItems.map((item, idx) => {
            const isActive = idx === activeIndex
            const isTapped = tapBounce === idx
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path, idx)}
                className="cresoa-nav-item"
                aria-label={item.name}
                aria-current={isActive ? 'page' : undefined}
                style={navButton}
              >
                <div
                  className={isTapped ? 'cresoa-nav-tap' : ''}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 3,
                    width: '100%',
                  }}
                >
                  {/* Icon with active pill background */}
                  <div
                    className="cresoa-nav-icon-wrap"
                    style={{
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 44,
                      height: 28,
                      borderRadius: 999,
                      background: isActive ? 'rgba(212, 165, 42, 0.14)' : 'transparent',
                      transition: 'background 0.25s ease, transform 0.2s ease',
                    }}
                  >
                    <BottomNavIcon
                      name={item.icon}
                      size={20}
                      stroke={isActive ? 'var(--cresoa-accent)' : 'var(--cresoa-text-muted)'}
                    />
                  </div>

                  {/* Label */}
                  <span
                    className="cresoa-nav-label"
                    style={{
                      fontSize: 10.5,
                      fontWeight: isActive ? 700 : 500,
                      color: isActive ? 'var(--cresoa-accent)' : 'var(--cresoa-text-muted)',
                      transition: 'color 0.2s ease, font-weight 0.2s ease',
                      lineHeight: 1,
                    }}
                  >
                    {item.name}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      </nav>
    </>
  )
}

const navContainer = {
  position: 'fixed',
  bottom: 0,
  left: 0,
  right: 0,
  zIndex: 1000,
  // Frosted-glass surface like iOS / Linear / Revolut
  background: 'color-mix(in srgb, var(--cresoa-surface) 82%, transparent)',
  backdropFilter: 'blur(20px) saturate(180%)',
  WebkitBackdropFilter: 'blur(20px) saturate(180%)',
  borderTop: '1px solid color-mix(in srgb, var(--cresoa-border) 60%, transparent)',
  boxShadow: '0 -8px 24px rgba(0, 0, 0, 0.06), 0 -1px 0 rgba(255, 255, 255, 0.04)',
  // Respect iPhone home indicator
  paddingBottom: 'env(safe-area-inset-bottom, 0px)',
}

const glassStrip = {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  height: 1,
  background: 'linear-gradient(90deg, transparent, rgba(212,165,42,0.35), transparent)',
  pointerEvents: 'none',
}

const itemsRow = {
  display: 'flex',
  alignItems: 'stretch',
  justifyContent: 'space-around',
  height: 60,
  padding: '0 4px',
}

const navButton = {
  background: 'transparent',
  border: 0,
  padding: '6px 2px',
  cursor: 'pointer',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  flex: 1,
  minWidth: 0,
  outline: 'none',
                        }
