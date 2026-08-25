'use client'

import { Suspense, useState, useEffect } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useBusinessData } from '../../../lib/hooks/useBusinessData'
import Logo from '../../../components/Logo'
import BusinessSwitcher from '../../components/BusinessSwitcher'
import { Icon } from '../../../components/Icon'
import Banner from '../../../components/Banner'

function RepairsLayoutContent({ children }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { user, business, userRole, loading } = useBusinessData(router, searchParams)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [theme, setTheme] = useState('light')

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light'
    setTheme(newTheme)
    document.documentElement.setAttribute('data-theme', newTheme)
    localStorage.setItem('cresoa-theme', newTheme)
  }

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

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
        <div className="spinner" style={{ margin: 'auto', marginTop: '40vh' }} />
      </div>
    )
  }

  if (!business) {
    router.push('/onboarding')
    return null
  }

  // ███ HARD SECURITY: MUST BE REPAIRS SECTOR ███
  if (business.sector !== 'repairs') {
    router.push('/dashboard?business_id=' + business.id)
    return null
  }

  const baseUrl = (path) => business?.id ? `${path}?business_id=${business.id}` : path
  const handleNavClick = () => setSidebarOpen(false)

  const isActive = (path) => {
    if (path === '/dashboard/repairs') return pathname === path
    return pathname?.startsWith(path)
  }

  // ─── REPAIRS SPECIFIC NAVIGATION ───
  const navItems = [
    { name: 'Dashboard', path: '/dashboard/repairs', icon: 'bar-chart-2' },
    { name: 'Jobs', path: '/dashboard/repairs/jobs', icon: 'tool' },
    { name: 'Customers', path: '/dashboard/repairs/customers', icon: 'users' },
    { name: 'Parts', path: '/dashboard/repairs/inventory', icon: 'package' },
    { name: 'Invoices', path: '/dashboard/invoices', icon: 'file-text' },
    { name: 'Reminders', path: '/dashboard/repairs/reminders', icon: 'bell' },
  ]

  const isStaff = userRole === 'Staff'
  const isManager = userRole === 'Manager'
  const isOwner = userRole === 'Owner'

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--color-bg)' }}>
      <style>{`
        /* CSS Rules copied from global layout for consistency */
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
        .hamburger { display: none; }
        .sidebar { width: 260px; min-height: 100vh; background: #0A1628; padding: 0.8rem; flex-shrink: 0; position: sticky; top: 0; height: 100vh; overflow-y: auto; display: flex; flex-direction: column; border-right: 1px solid rgba(255,255,255,0.04); z-index: 1000; }
        /* ... rest of the CSS from global layout ... */
      `}</style>

      {/* Header Top Bar */}
      <div className="main-content" style={{ flex: 1, minWidth: 0, padding: 0 }}>
        <div className="dashboard-header" style={{ display: 'flex', justifyContent: 'flex-end', padding: '0.4rem 1.2rem', background: 'var(--color-card)', borderBottom: '1px solid var(--color-border)' }}>
          <div></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span className="date">{new Date().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
          </div>
        </div>

        <Banner />
        {children}
      </div>

      {/* Sidebar for Repairs */}
      <div className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="brand">
          <Logo variant="dark-bg" size="small" />
          <div>
            <div className="logo-text">Cresoa</div>
            <div className="sub">
              {business?.name || 'Your business'}
              <span className="badge">🔧 Repairs</span>
              <br />
              <span className="plan">{business?.plan || 'Free'}</span>
            </div>
          </div>
        </div>

        <div style={{ marginBottom: '0.4rem' }}>
          <BusinessSwitcher key={business?.id} currentBusinessId={business?.id} />
        </div>

        <div className="nav-section">
          <div className="section-label">Business</div>
          {navItems.map((item) => (
            <a key={item.path} href={baseUrl(item.path)} className={isActive(item.path) ? 'active' : ''} onClick={handleNavClick}>
              <span className="icon"><Icon name={item.icon} size={16} stroke="currentColor" /></span>
              {item.name}
            </a>
          ))}
        </div>

        <div className="bottom">
          <button className="theme-btn" onClick={toggleTheme}>
            <span className="icon"><Icon name={theme === 'light' ? 'moon' : 'sun'} size={16} stroke="currentColor" /></span>
            {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
          </button>
          <a href={baseUrl('/dashboard/support')} className="support-link" onClick={handleNavClick}>
            <span className="icon"><Icon name="message-circle" size={16} stroke="currentColor" /></span> Support Hub
          </a>
          <button className="logout" onClick={async () => { await supabase.auth.signOut(); router.push('/login') }}>
            <span className="icon"><Icon name="log-out" size={16} stroke="currentColor" /></span> Logout
          </button>
        </div>
      </div>
    </div>
  )
}

export default function RepairsLayout({ children }) {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>Loading...</div>}>
      <div className="cresoa-dashboard-page">
        <RepairsLayoutContent>{children}</RepairsLayoutContent>
      </div>
    </Suspense>
  )
     }
