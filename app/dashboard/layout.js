'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'
import Logo from '../../components/Logo'
import { FREE_TRIAL_DAYS } from '../../lib/planLimits'
import BusinessSwitcher from '../components/BusinessSwitcher'
import { Icon } from '../../components/Icon'
import Banner from '../../components/Banner'
import SectorMismatch from '../../components/SectorMismatch'

function DashboardLayoutContent({ children }) {
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
  const [mismatchInfo, setMismatchInfo] = useState({ sector: '', businessId: '' })

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

  // ─── SAFE AUTH + BUSINESS LOADING ───
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
        if (!authUser) {
          router.push('/login')
          return
        }
        setUser(authUser)

        const businessIdFromUrl = searchParams.get('business_id')
        let businessData = null

        if (businessIdFromUrl) {
          const { data: business, error } = await supabase
            .from('businesses')
            .select('*')
            .eq('id', businessIdFromUrl)
            .maybeSingle()
          if (business && !error) businessData = business
        }

        if (!businessData) {
          const { data: ownedBusiness } = await supabase
            .from('businesses')
            .select('*')
            .eq('owner_id', authUser.id)
            .maybeSingle()
          if (ownedBusiness) businessData = ownedBusiness
          else {
            const { data: membershipData } = await supabase
              .from('business_memberships')
              .select('business_id, role')
              .eq('user_id', authUser.id)
              .maybeSingle()
            if (membershipData) {
              const { data: memberBusiness } = await supabase
                .from('businesses')
                .select('*')
                .eq('id', membershipData.business_id)
                .maybeSingle()
              if (memberBusiness) {
                businessData = memberBusiness
                setUserRole(membershipData.role)
              }
            }
          }
        }

        if (!businessData) {
          router.push('/onboarding')
          return
        }

        if (businessData && !userRole) {
          const { data: roleData } = await supabase
            .from('business_memberships')
            .select('role')
            .eq('business_id', businessData.id)
            .eq('user_id', authUser.id)
            .maybeSingle()
          if (roleData) setUserRole(roleData.role)
          else if (businessData.owner_id === authUser.id) setUserRole('Owner')
          else setUserRole('Staff')
        }

        // Beta/trial logic
        if (businessData) {
          if (businessData.plan === 'beta' && businessData.beta_expires_at) {
            const betaExpiry = new Date(businessData.beta_expires_at)
            const now = new Date()
            if (betaExpiry < now) {
              await supabase.from('businesses').update({ plan: 'free', plan_status: 'expired' }).eq('id', businessData.id)
              businessData.plan = 'free'
              businessData.plan_status = 'expired'
            }
          }
          if (!businessData.trial_ends_at) {
            const trialEndsAt = new Date()
            trialEndsAt.setDate(trialEndsAt.getDate() + FREE_TRIAL_DAYS)
            await supabase.from('businesses').update({ trial_ends_at: trialEndsAt.toISOString(), trial_starts_at: new Date().toISOString() }).eq('id', businessData.id)
            businessData.trial_ends_at = trialEndsAt.toISOString()
          }
          const now = new Date()
          if (businessData.plan !== 'free' && businessData.plan !== 'beta' && businessData.subscription_expires_at) {
            const expiresAt = new Date(businessData.subscription_expires_at)
            if (expiresAt < now) {
              await supabase.from('businesses').update({ plan: 'free', plan_status: 'expired' }).eq('id', businessData.id)
              businessData.plan = 'free'
              businessData.plan_status = 'expired'
            }
          }
        }

        setBusiness(businessData)
        localStorage.setItem('cresoa-sector', businessData?.sector || 'fashion')
      } catch (error) {
        console.error('Dashboard layout error:', error)
        router.push('/login')
      } finally {
        setLoading(false)
        setAuthChecked(true)
      }
    }

    load()
  }, [router, searchParams])

  // ─── SECURITY GUARDS (Now sets mismatch instead of redirect) ───
  useEffect(() => {
    if (!loading && business) {
      const urlBusinessId = searchParams.get('business_id')
      if (urlBusinessId && urlBusinessId !== business.id) {
        window.location.reload()
        return
      }

      const currentSector = business.sector || 'fashion'
      const sectorPath = pathname?.split('/')[2] // e.g., 'fashion', 'repairs', 'printing'

      // If path is a sector-specific path but doesn't match the business sector
      if (sectorPath && ['fashion', 'repairs', 'printing'].includes(sectorPath) && sectorPath !== currentSector) {
        setMismatchInfo({ sector: currentSector, businessId: business.id })
        return
      }

      // Repairs/fashion cross-guards (keep existing)
      if (currentSector === 'repairs' && (
        pathname?.startsWith('/dashboard/orders') ||
        pathname?.startsWith('/dashboard/customers') ||
        pathname?.startsWith('/dashboard/inventory') ||
        pathname?.startsWith('/dashboard/groups') ||
        pathname?.startsWith('/dashboard/fashion')
      )) {
        router.push('/dashboard/repairs?business_id=' + business.id)
        return
      }

      if (currentSector === 'fashion' && pathname?.startsWith('/dashboard/repairs')) {
        router.push('/dashboard?business_id=' + business.id)
        return
      }
    }
  }, [loading, business, pathname, router, searchParams])

  // ─── NAVIGATION ITEMS ───
  const getNavItems = (sector) => {
    const defaultItems = [
      { name: 'Dashboard', path: '/dashboard', icon: 'bar-chart-2' },
      { name: 'Orders', path: '/dashboard/orders', icon: 'file-text' },
      { name: 'Customers', path: '/dashboard/customers', icon: 'users' },
      { name: 'Inventory', path: '/dashboard/inventory', icon: 'package' },
      { name: 'Invoices', path: '/dashboard/invoices', icon: 'file-text' },
      { name: 'Reminders', path: '/dashboard/reminders', icon: 'bell' },
    ]

    if (sector === 'repairs') {
      return [
        { name: 'Dashboard', path: '/dashboard/repairs', icon: 'bar-chart-2' },
        { name: 'Jobs', path: '/dashboard/repairs/jobs', icon: 'tool' },
        { name: 'Customers', path: '/dashboard/repairs/customers', icon: 'users' },
        { name: 'Parts', path: '/dashboard/repairs/parts', icon: 'package' },
        { name: 'Invoices', path: '/dashboard/repairs/invoices', icon: 'file-text' },
        { name: 'Reminders', path: '/dashboard/repairs/reminders', icon: 'bell' },
      ]
    }

    return defaultItems
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const isActive = (path) => {
    if (path === '/dashboard' || path === '/dashboard/repairs' || path === '/dashboard/fashion') {
      return pathname === path
    }
    return pathname?.startsWith(path)
  }

  const handleNavClick = () => setSidebarOpen(false)

  const getIndustryBadge = () => {
    const sector = business?.sector || 'fashion'
    if (sector === 'repairs') return '🔧 Repairs'
    if (sector === 'fashion') return '👗 Fashion'
    return ''
  }

  const currentSector = business?.sector || 'fashion'
  const currentNavItems = getNavItems(currentSector)

  if (loading && !authChecked) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
          .spinner { width: 40px; height: 40px; border: 4px solid var(--color-border); border-top: 4px solid var(--color-accent); border-radius: 50%; animation: spin 0.8s linear infinite; }
        `}</style>
        <div className="spinner" style={{ margin: 'auto', marginTop: '40vh' }} />
      </div>
    )
  }

  // ─── Show SectorMismatch if needed ───
  if (mismatchInfo.sector) {
    return <SectorMismatch sector={mismatchInfo.sector} businessId={mismatchInfo.businessId} />
  }

  const isStaff = userRole === 'Staff'
  const isManager = userRole === 'Manager'
  const isOwner = userRole === 'Owner'

  const showTeamActivity = !isStaff
  const showSettingsSection = isOwner || isManager
  const showBusinessSettings = isOwner
  const showBilling = isOwner
  const showProfile = isOwner || isManager

  const baseUrl = (path) => business?.id ? `${path}?business_id=${business.id}` : path

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--color-bg)' }}>
      <style>{`
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
        .hamburger { position: fixed; top: 0.8rem; left: 0.8rem; z-index: 1001; background: var(--color-primary); border: none; color: #fff; font-size: 1.3rem; padding: 0.2rem 0.5rem; border-radius: 6px; cursor: pointer; display: none; box-shadow: 0 2px 8px rgba(0,0,0,0.15); }
        .hamburger:hover { opacity: 0.8; }
        .overlay { display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.3); z-index: 999; }
        .overlay.open { display: block; }
        .sidebar { width: 260px; min-height: 100vh; background: #0A1628; padding: 0.8rem 0.8rem; flex-shrink: 0; position: sticky; top: 0; height: 100vh; overflow-y: auto; transition: transform 0.3s ease; display: flex; flex-direction: column; border-right: 1px solid rgba(255,255,255,0.04); z-index: 1000; }
        .sidebar::-webkit-scrollbar { width: 3px; }
        .sidebar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }
        .sidebar .brand { display: flex; align-items: center; gap: 0.6rem; padding-bottom: 0.6rem; border-bottom: 1px solid rgba(255,255,255,0.06); margin-bottom: 0.6rem; }
        .sidebar .brand .logo-text { color: #fff; font-size: 1rem; font-weight: 700; font-family: 'Fraunces', serif; }
        .sidebar .brand .sub { color: #8899AA; font-size: 0.45rem; line-height: 1.4; }
        .sidebar .brand .sub .badge { display: inline-block; background: rgba(212,165,42,0.15); color: #D4A52A; padding: 0.05rem 0.4rem; border-radius: 4px; font-size: 0.45rem; font-weight: 600; margin-left: 0.2rem; }
        .sidebar .brand .sub .plan { display: inline-block; background: #4C7A5E; color: #fff; padding: 0.05rem 0.4rem; border-radius: 4px; font-size: 0.45rem; font-weight: 600; text-transform: uppercase; }
        .sidebar .nav-section { margin-bottom: 0.2rem; }
        .sidebar .nav-section .section-label { color: rgba(255,255,255,0.25); font-size: 0.45rem; text-transform: uppercase; letter-spacing: 0.5px; padding: 0.2rem 0.7rem; margin-bottom: 0.1rem; font-weight: 600; }
        .sidebar .nav-section a { display: flex; align-items: center; gap: 0.6rem; padding: 0.2rem 0.7rem; border-radius: 6px; color: #8899AA; text-decoration: none; font-size: 0.75rem; font-weight: 500; transition: all 0.15s ease; }
        .sidebar .nav-section a:hover { background: rgba(255,255,255,0.04); color: #fff; }
        .sidebar .nav-section a.active { background: rgba(212,165,42,0.08); color: #D4A52A; font-weight: 600; }
        .sidebar .nav-section a .icon { font-size: 0.9rem; width: 18px; text-align: center; flex-shrink: 0; }
        .sidebar .bottom { margin-top: auto; border-top: 1px solid rgba(255,255,255,0.06); padding-top: 0.4rem; display: flex; flex-direction: column; gap: 0.1rem; }
        .sidebar .bottom a, .sidebar .bottom button { display: flex; align-items: center; gap: 0.6rem; padding: 0.2rem 0.7rem; border-radius: 6px; color: #8899AA; text-decoration: none; font-size: 0.75rem; font-weight: 500; transition: all 0.15s ease; background: none; border: none; width: 100%; cursor: pointer; text-align: left; }
        .sidebar .bottom a:hover, .sidebar .bottom button:hover { background: rgba(255,255,255,0.04); color: #fff; }
        .sidebar .bottom .logout { color: #D9534F; }
        .sidebar .bottom .logout:hover { background: rgba(217,83,79,0.08); color: #D9534F; }
        .sidebar .bottom .theme-btn { color: #D4A52A; }
        .sidebar .bottom .theme-btn:hover { background: rgba(212,165,42,0.06); color: #D4A52A; }
        .sidebar .bottom .support-link { color: #D4A52A; }
        .sidebar .bottom .support-link:hover { background: rgba(212,165,42,0.06); color: #D4A52A; }
        .main-content { flex: 1; min-width: 0; padding: 0; }
        .dashboard-header { display: flex; justify-content: flex-end; align-items: center; padding: 0.4rem 1.2rem; background: var(--color-card); border-bottom: 1px solid var(--color-border); }
        .dashboard-header .date { font-size: 0.7rem; color: var(--color-text-muted); }
        .beta-btn { display: inline-flex; align-items: center; gap: 0.3rem; padding: 0.2rem 0.7rem; border-radius: 16px; background: linear-gradient(135deg, #D4A52A, #C79A2B); color: #0F2B4A; font-weight: 700; font-size: 0.65rem; text-decoration: none; box-shadow: 0 2px 8px rgba(212,165,42,0.2); transition: transform 0.1s ease; }
        .beta-btn:hover { transform: scale(1.02); }
        @media (min-width: 769px) { .hamburger { display: none !important; } .sidebar { transform: translateX(0) !important; } .overlay { display: none !important; } }
        @media (max-width: 768px) { .hamburger { display: block; } .sidebar { position: fixed; top: 0; left: 0; bottom: 0; transform: translateX(-100%); width: 260px; z-index: 1000; height: 100vh; } .sidebar.open { transform: translateX(0); } .overlay.open { display: block; } .main-content { padding-top: 3rem; } }
      `}</style>

      <button className="hamburger" onClick={() => setSidebarOpen(!sidebarOpen)}>{sidebarOpen ? '✕' : '☰'}</button>
      <div className={`overlay ${sidebarOpen ? 'open' : ''}`} onClick={() => setSidebarOpen(false)} />
      <div className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="brand">
          <Logo variant="dark-bg" size="small" />
          <div>
            <div className="logo-text">Cresoa</div>
            <div className="sub">
              {business?.name || 'Your business'}
              <span className="badge">{getIndustryBadge()}</span>
              <br />
              <span className={`plan ${business?.plan === 'beta' ? 'beta' : ''}`}>{business?.plan || 'Free'}</span>
            </div>
          </div>
        </div>

        {/* ✅ UPDATED: Pass currentSector to BusinessSwitcher */}
        <div style={{ marginBottom: '0.4rem' }}>
          <BusinessSwitcher key={business?.id} currentBusinessId={business?.id} currentSector={business?.sector} />
        </div>

        <div className="nav-section">
          <div className="section-label">Business</div>
          {currentNavItems.map((item) => (
            <a key={item.path} href={baseUrl(item.path)} className={isActive(item.path) ? 'active' : ''} onClick={handleNavClick}>
              <span className="icon"><Icon name={item.icon} size={16} stroke="currentColor" /></span>
              {item.name}
            </a>
          ))}
        </div>

        {showTeamActivity && (
          <div className="nav-section">
            <div className="section-label">Team & Activity</div>
            <a href={baseUrl('/dashboard/staff')} className={isActive('/dashboard/staff') ? 'active' : ''} onClick={handleNavClick}><span className="icon"><Icon name="user-plus" size={16} stroke="currentColor" /></span> Team & Staff</a>
            <a href={baseUrl('/dashboard/activity')} className={isActive('/dashboard/activity') ? 'active' : ''} onClick={handleNavClick}><span className="icon"><Icon name="activity" size={16} stroke="currentColor" /></span> Activity Logs</a>
          </div>
        )}

        {showSettingsSection && (
          <div className="nav-section">
            <div className="section-label">Settings</div>
            {showBusinessSettings && <a href={baseUrl('/dashboard/settings')} className={isActive('/dashboard/settings') ? 'active' : ''} onClick={handleNavClick}><span className="icon"><Icon name="settings" size={16} stroke="currentColor" /></span> Business Settings</a>}
            {showBilling && <a href={baseUrl('/dashboard/subscription')} className={isActive('/dashboard/subscription') ? 'active' : ''} onClick={handleNavClick}><span className="icon"><Icon name="credit-card" size={16} stroke="currentColor" /></span> Billing & Plan</a>}
            {showProfile && <a href={baseUrl('/dashboard/profile')} className={isActive('/dashboard/profile') ? 'active' : ''} onClick={handleNavClick}><span className="icon"><Icon name="user" size={16} stroke="currentColor" /></span> Profile & Settings</a>}
          </div>
        )}

        {user?.email === 'taiwoabraham640@gmail.com' && (
          <div className="nav-section">
            <div className="section-label">Admin</div>
            <a href={baseUrl('/admin/support')} className={isActive('/admin') ? 'active' : ''} onClick={handleNavClick}><span className="icon"><Icon name="inbox" size={16} stroke="currentColor" /></span> Support Tickets</a>
          </div>
        )}

        <div className="bottom">
          <button className="theme-btn" onClick={toggleTheme}><span className="icon"><Icon name={theme === 'light' ? 'moon' : 'sun'} size={16} stroke="currentColor" /></span>{theme === 'light' ? 'Dark Mode' : 'Light Mode'}</button>
          <a href={baseUrl('/dashboard/support')} className="support-link" onClick={handleNavClick}><span className="icon"><Icon name="message-circle" size={16} stroke="currentColor" /></span> Support Hub</a>
          <button className="logout" onClick={handleLogout}><span className="icon"><Icon name="log-out" size={16} stroke="currentColor" /></span> Logout</button>
        </div>
      </div>

      <div className="main-content">
        <div className="dashboard-header">
          <div></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {business && !business.has_applied_for_beta && isOwner && <a href={baseUrl('/dashboard/beta-apply')} className="beta-btn">🧪 Join Beta</a>}
            <span className="date">{new Date().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
          </div>
        </div>
        <Banner />
        {children}
      </div>
    </div>
  )
}

export default function DashboardLayout({ children }) {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: 'var(--color-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'var(--color-text-muted)' }}>Loading...</div>
      </div>
    }>
      <div className="cresoa-dashboard-page">
        <DashboardLayoutContent>{children}</DashboardLayoutContent>
      </div>
    </Suspense>
  )
              }
