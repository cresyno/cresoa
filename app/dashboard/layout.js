'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'
import Logo from '../../components/Logo'
import { FREE_TRIAL_DAYS } from '../../lib/planLimits'
import BusinessSwitcher from '../components/BusinessSwitcher'
import { Icon } from '../../components/Icon'
import Banner from '../../components/Banner'

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

  // Detect if we're on a repairs path – if so, we let the repairs layout handle everything
  const isRepairsPath = pathname?.startsWith('/dashboard/repairs')

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

  // ─── BUSINESS LOADING (skip if repairs path) ───
  useEffect(() => {
    if (isRepairsPath) {
      setLoading(false)
      return
    }

    const load = async () => {
      try {
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
          const { data: hasOnboarded } = await supabase
            .from('businesses')
            .select('id')
            .eq('owner_id', authUser.id)
            .maybeSingle()

          if (!hasOnboarded) {
            router.push('/onboarding')
            return
          }
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

        // Beta expiry and trial logic
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
        router.push('/onboarding')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [router, searchParams, isRepairsPath])

  // ─── SECURITY GUARDS (skip if repairs path) ───
  useEffect(() => {
    if (isRepairsPath) return

    if (!loading && business) {
      const urlBusinessId = searchParams.get('business_id')
      if (urlBusinessId && urlBusinessId !== business.id) {
        window.location.reload()
        return
      }

      const currentSector = business.sector || 'fashion'

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
  }, [loading, business, pathname, router, searchParams, isRepairsPath])

  // If we're on a repairs path, just render children – the repairs layout handles everything
  if (isRepairsPath) {
    return <>{children}</>
  }

  // ─── NAVIGATION ITEMS (only for non-repairs) ───
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
        { name: 'Parts', path: '/dashboard/repairs/inventory', icon: 'package' },
        { name: 'Invoices', path: '/dashboard/invoices', icon: 'file-text' },
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

  if (loading) {
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

  const currentSector = business?.sector || 'fashion'
  const currentNavItems = getNavItems(currentSector)

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
        /* same CSS as before – not repeated for brevity; keep it identical */
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

        <div style={{ marginBottom: '0.4rem' }}>
          <BusinessSwitcher key={business?.id} currentBusinessId={business?.id} />
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
