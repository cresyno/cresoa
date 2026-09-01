'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { supabase } from '../../../lib/supabaseClient'
import Logo from '../../../components/Logo'
import BusinessSwitcher from '../../components/BusinessSwitcher'
import { Icon } from '../../../components/Icon'
import Banner from '../../../components/Banner'
import { PrintingNavigation } from '../../../components/PrintingNavigation'

const normalizeSector = (sector) => {
  if (!sector) return ''
  const s = sector.toLowerCase()
  if (s.includes('print')) return 'printing'
  if (s.includes('fashion')) return 'fashion'
  if (s.includes('repair')) return 'repairs'
  return s
}

function PrintingLayoutContent({ children }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [user, setUser] = useState(null)
  const [business, setBusiness] = useState(null)
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [theme, setTheme] = useState('light')
  const [userRole, setUserRole] = useState(null)
  const [authChecked, setAuthChecked] = useState(false)

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

  useEffect(() => {
    const load = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          await new Promise(resolve => setTimeout(resolve, 500))
          const { data: { session: session2 } } = await supabase.auth.getSession()
          if (!session2) {
            router.push('/login')
            return
          }
        }

        const { data: { user: authUser } } = await supabase.auth.getUser()
        if (!authUser) { router.push('/login'); return }
        setUser(authUser)

        const businessIdFromUrl = searchParams.get('business_id')
        let businessData = null

        if (businessIdFromUrl) {
          const { data: business, error } = await supabase
            .from('businesses').select('*').eq('id', businessIdFromUrl).maybeSingle()
          if (business && !error) businessData = business
        }

        if (!businessData) {
          const { data: ownedBusiness } = await supabase
            .from('businesses').select('*').eq('owner_id', authUser.id).maybeSingle()
          if (ownedBusiness) businessData = ownedBusiness
          else {
            const { data: membershipData } = await supabase
              .from('business_memberships').select('business_id, role').eq('user_id', authUser.id).maybeSingle()
            if (membershipData) {
              const { data: memberBusiness } = await supabase
                .from('businesses').select('*').eq('id', membershipData.business_id).maybeSingle()
              if (memberBusiness) {
                businessData = memberBusiness
                setUserRole(membershipData.role)
              }
            }
          }
        }

        if (!businessData) { router.push('/onboarding'); return }

        const normalized = normalizeSector(businessData.sector)
        if (normalized !== 'printing') {
          setMismatchInfo({ sector: normalized, businessId: businessData.id })
          return
        }

        if (!userRole) {
          const { data: roleData } = await supabase
            .from('business_memberships').select('role')
            .eq('business_id', businessData.id).eq('user_id', authUser.id).maybeSingle()
          if (roleData) setUserRole(roleData.role)
          else if (businessData.owner_id === authUser.id) setUserRole('Owner')
          else setUserRole('Staff')
        }

        setBusiness(businessData)
      } catch (error) {
        console.error('Printing layout error:', error)
        router.push('/login')
      } finally {
        setLoading(false)
        setAuthChecked(true)
      }
    }
    load()
  }, [router, searchParams])

  const [mismatchInfo, setMismatchInfo] = useState({ sector: '', businessId: '' })
  const [showSectorMismatch] = useState(false)

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const isActive = (path) => pathname?.startsWith(path)
  const handleNavClick = () => setSidebarOpen(false)
  const baseUrl = (path) => business?.id ? `${path}?business_id=${business.id}` : path

  if (loading && !authChecked) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--cresoa-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="cresoa-loading-spinner" />
      </div>
    )
  }

  if (mismatchInfo.sector) {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--cresoa-bg)' }}>Wrong sector</div>
  }

  const isStaff = userRole === 'Staff'
  const isManager = userRole === 'Manager'
  const isOwner = userRole === 'Owner'

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--cresoa-bg)' }}>
      <style>{`
        :root { --cresoa-bg: #F8F6F2; --cresoa-surface: #FFFFFF; --cresoa-text: #1A1A1A; --cresoa-text-muted: #8A8A8A; --cresoa-border: #E5E0D8; --cresoa-accent: #D4A52A; }
        [data-theme="dark"] { --cresoa-bg: #12121A; --cresoa-surface: #1E1E2A; --cresoa-text: #E8E8E8; --cresoa-text-muted: #AAAAAA; --cresoa-border: #2A2A3A; --cresoa-accent: #D4A52A; }
        .sidebar { width: 260px; min-height: 100vh; background: #0A1628; padding: 0.8rem; flex-shrink: 0; position: sticky; top: 0; height: 100vh; overflow-y: auto; display: flex; flex-direction: column; border-right: 1px solid rgba(255,255,255,0.04); z-index: 2000; }
        .sidebar .brand { display: flex; align-items: center; gap: 0.6rem; padding-bottom: 0.6rem; border-bottom: 1px solid rgba(255,255,255,0.06); margin-bottom: 0.6rem; }
        .sidebar .nav-section { margin-bottom: 0.2rem; }
        .sidebar .nav-section a { display: flex; align-items: center; gap: 0.6rem; padding: 0.2rem 0.7rem; border-radius: 6px; color: #8899AA; text-decoration: none; font-size: 0.75rem; font-weight: 500; transition: all 0.15s ease; }
        .sidebar .nav-section a:hover { background: rgba(255,255,255,0.04); color: #fff; }
        .sidebar .nav-section a.active { background: rgba(212,165,42,0.08); color: #D4A52A; font-weight: 600; }
        .sidebar .bottom { margin-top: auto; border-top: 1px solid rgba(255,255,255,0.06); padding-top: 0.4rem; display: flex; flex-direction: column; gap: 0.1rem; }
        .sidebar .bottom a, .sidebar .bottom button { display: flex; align-items: center; gap: 0.6rem; padding: 0.2rem 0.7rem; border-radius: 6px; color: #8899AA; text-decoration: none; font-size: 0.75rem; font-weight: 500; transition: all 0.15s ease; background: none; border: none; width: 100%; cursor: pointer; text-align: left; }
        .main-content { flex: 1; min-width: 0; padding: 0; padding-bottom: 80px; }
        .dashboard-header { display: flex; justify-content: flex-end; align-items: center; padding: 0.4rem 1.2rem; background: var(--cresoa-surface); border-bottom: 1px solid var(--cresoa-border); }
        .hamburger { display: none; position: fixed; top: 0.8rem; left: 0.8rem; z-index: 3000; background: var(--cresoa-accent); color: #fff; border: none; font-size: 1.3rem; padding: 0.2rem 0.5rem; border-radius: 6px; cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,0.15); }
        @media (max-width: 768px) { .sidebar { position: fixed; top: 0; left: 0; bottom: 0; transform: translateX(-100%); width: 260px; z-index: 2000; height: 100vh; } .sidebar.open { transform: translateX(0); } .hamburger { display: block; } }
        @media (min-width: 769px) { .hamburger { display: none !important; } .sidebar { transform: translateX(0) !important; } }
      `}</style>

      <button className="hamburger" onClick={() => setSidebarOpen(!sidebarOpen)}>{sidebarOpen ? '✕' : '☰'}</button>
      <div className={`overlay ${sidebarOpen ? 'open' : ''}`} onClick={() => setSidebarOpen(false)} style={{ display: sidebarOpen ? 'block' : 'none', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.3)', zIndex: 1500 }} />

      <div className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="brand">
          <Logo variant="dark-bg" size="small" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="logo-text">Cresoa</div>
            <div className="sub">{business?.name || 'Your business'}<span className="badge">🖨️ Printing</span><br/><span className="plan">{business?.plan || 'Free'}</span></div>
          </div>
          <button onClick={() => setSidebarOpen(false)} style={{ background: 'none', border: 'none', color: '#8899AA', cursor: 'pointer', fontSize: '1.2rem', padding: '0.2rem', flexShrink: 0 }}>✕</button>
        </div>

        <div style={{ marginBottom: '0.4rem' }}>
          <BusinessSwitcher key={business?.id} currentBusinessId={business?.id} currentSector={business?.sector} />
        </div>

        <div className="nav-section">
          <div className="section-label">Business</div>
          {[
            { name: 'Dashboard', path: '/dashboard/printing', icon: 'bar-chart-2' },
            { name: 'Jobs', path: '/dashboard/printing/jobs', icon: 'file-text' },
            { name: 'Quotations', path: '/dashboard/printing/quotations', icon: 'file-text' },
            { name: 'Customers', path: '/dashboard/printing/customers', icon: 'users' },
            { name: 'Materials', path: '/dashboard/printing/materials', icon: 'package' },
            { name: 'Invoices', path: '/dashboard/printing/invoices', icon: 'file-text' },
          ].map((item) => (
            <a key={item.path} href={baseUrl(item.path)} className={isActive(item.path) ? 'active' : ''} onClick={handleNavClick}>
              <span className="icon"><Icon name={item.icon} size={16} stroke="currentColor" /></span>{item.name}
            </a>
          ))}
        </div>

        <div className="nav-section">
          <div className="section-label">Website</div>
          <a href={baseUrl('/dashboard/public-orders')} className={isActive('/dashboard/public-orders') ? 'active' : ''} onClick={handleNavClick}><span className="icon"><Icon name="file-text" size={16} stroke="currentColor" /></span> Website Orders</a>
          <a href={baseUrl('/dashboard/public-quotes')} className={isActive('/dashboard/public-quotes') ? 'active' : ''} onClick={handleNavClick}><span className="icon"><Icon name="message-circle" size={16} stroke="currentColor" /></span> Website Quotes</a>
        </div>

        <div className="nav-section">
          <div className="section-label">Settings</div>
          <a href={baseUrl('/dashboard/website-editor')} className={isActive('/dashboard/public-page') ? 'active' : ''} onClick={handleNavClick}><span className="icon"><Icon name="settings" size={16} stroke="currentColor" /></span> Public Page</a>
          <a href={baseUrl('/dashboard/settings')} className={isActive('/dashboard/settings') ? 'active' : ''} onClick={handleNavClick}><span className="icon"><Icon name="settings" size={16} stroke="currentColor" /></span> Business Settings</a>
          <a href={baseUrl('/dashboard/subscription')} className={isActive('/dashboard/subscription') ? 'active' : ''} onClick={handleNavClick}><span className="icon"><Icon name="credit-card" size={16} stroke="currentColor" /></span> Billing & Plan</a>
        </div>

        <div className="bottom">
          <button className="theme-btn" onClick={toggleTheme}><span className="icon"><Icon name={theme === 'light' ? 'moon' : 'sun'} size={16} stroke="currentColor" /></span>{theme === 'light' ? 'Dark Mode' : 'Light Mode'}</button>
          <a href={baseUrl('/dashboard/support')} className="support-link" onClick={handleNavClick}><span className="icon"><Icon name="message-circle" size={16} stroke="currentColor" /></span> Support</a>
          <button className="logout" onClick={handleLogout}><span className="icon"><Icon name="log-out" size={16} stroke="currentColor" /></span> Logout</button>
        </div>
      </div>

      <div className="main-content">
        <div className="dashboard-header"><div></div><div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}><span className="date">{new Date().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}</span></div></div>
        {children}
      </div>

      <PrintingNavigation businessId={business?.id} />
    </div>
  )
}

export default function PrintingLayout({ children }) {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: 'var(--cresoa-bg)' }}>Loading...</div>}>
      <div className="cresoa-dashboard-page">
        <PrintingLayoutContent>{children}</PrintingLayoutContent>
      </div>
    </Suspense>
  )
    }
