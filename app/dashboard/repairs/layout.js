'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { supabase } from '../../../lib/supabaseClient'
import Logo from '../../../components/Logo'
import { FREE_TRIAL_DAYS } from '../../../lib/planLimits'
import BusinessSwitcher from '../../components/BusinessSwitcher'
import { Icon } from '../../../components/Icon'
import Banner from '../../../components/Banner'
import { RepairsNavigation } from '../../../components/RepairsNavigation'

function RepairsLayoutContent({ children }) {
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

  // ─── SAFE AUTH + BUSINESS LOADING ───
  useEffect(() => {
    const load = async () => {
      try {
        // Wait for session
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

        // Ensure sector is repairs (normalized)
        const normalizedSector = (businessData.sector || '').toLowerCase()
        if (!normalizedSector.includes('repair') && normalizedSector !== 'repairs') {
          router.push(`/dashboard?business_id=${businessData.id}`)
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
      } catch (error) {
        console.error('Repairs layout error:', error)
        router.push('/login')
      } finally {
        setLoading(false)
        setAuthChecked(true)
      }
    }

    load()
  }, [router, searchParams])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const isActive = (path) => {
    if (path === '/dashboard/repairs') return pathname === path
    return pathname?.startsWith(path)
  }

  const handleNavClick = () => setSidebarOpen(false)
  const baseUrl = (path) => business?.id ? `${path}?business_id=${business.id}` : path

  if (loading && !authChecked) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--cresoa-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="cresoa-loading-spinner" />
        <style>{`
          .cresoa-loading-spinner {
            width: 36px;
            height: 36px;
            border: 3px solid var(--cresoa-border);
            border-top-color: var(--cresoa-accent);
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
          }
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    )
  }

  const isStaff = userRole === 'Staff'
  const isManager = userRole === 'Manager'
  const isOwner = userRole === 'Owner'

  const showTeamActivity = !isStaff
  const showSettingsSection = isOwner || isManager
  const showBusinessSettings = isOwner
  const showBilling = isOwner
  const showProfile = isOwner || isManager

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--cresoa-bg)' }}>
      <style>{`
        /* Same global CSS variables as before */
        :root {
          --cresoa-bg: #F8F6F2;
          --cresoa-surface: #FFFFFF;
          --cresoa-text: #1A1A1A;
          --cresoa-text-muted: #8A8A8A;
          --cresoa-border: #E5E0D8;
          --cresoa-accent: #D4A52A;
        }
        [data-theme="dark"] {
          --cresoa-bg: #12121A;
          --cresoa-surface: #1E1E2A;
          --cresoa-text: #E8E8E8;
          --cresoa-text-muted: #AAAAAA;
          --cresoa-border: #2A2A3A;
          --cresoa-accent: #D4A52A;
        }
        .sidebar { width: 260px; min-height: 100vh; background: #0A1628; padding: 0.8rem; flex-shrink: 0; position: sticky; top: 0; height: 100vh; overflow-y: auto; display: flex; flex-direction: column; border-right: 1px solid rgba(255,255,255,0.04); z-index: 1000; }
        .sidebar .brand { display: flex; align-items: center; gap: 0.6rem; padding-bottom: 0.6rem; border-bottom: 1px solid rgba(255,255,255,0.06); margin-bottom: 0.6rem; }
        .sidebar .nav-section { margin-bottom: 0.2rem; }
        .sidebar .nav-section a { display: flex; align-items: center; gap: 0.6rem; padding: 0.2rem 0.7rem; border-radius: 6px; color: #8899AA; text-decoration: none; font-size: 0.75rem; font-weight: 500; transition: all 0.15s ease; }
        .sidebar .nav-section a:hover { background: rgba(255,255,255,0.04); color: #fff; }
        .sidebar .nav-section a.active { background: rgba(212,165,42,0.08); color: #D4A52A; font-weight: 600; }
        .sidebar .bottom { margin-top: auto; border-top: 1px solid rgba(255,255,255,0.06); padding-top: 0.4rem; display: flex; flex-direction: column; gap: 0.1rem; }
        .sidebar .bottom a, .sidebar .bottom button { display: flex; align-items: center; gap: 0.6rem; padding: 0.2rem 0.7rem; border-radius: 6px; color: #8899AA; text-decoration: none; font-size: 0.75rem; font-weight: 500; transition: all 0.15s ease; background: none; border: none; width: 100%; cursor: pointer; text-align: left; }
        .main-content { flex: 1; min-width: 0; padding: 0; padding-bottom: 80px; }
        .dashboard-header { display: flex; justify-content: flex-end; align-items: center; padding: 0.4rem 1.2rem; background: var(--cresoa-surface); border-bottom: 1px solid var(--cresoa-border); }
        @media (max-width: 768px) {
          .sidebar { position: fixed; top: 0; left: 0; bottom: 0; transform: translateX(-100%); width: 260px; z-index: 1000; height: 100vh; }
          .sidebar.open { transform: translateX(0); }
          .hamburger { display: block; }
        }
        @media (min-width: 769px) {
          .hamburger { display: none !important; }
          .sidebar { transform: translateX(0) !important; }
        }
      `}</style>

      {/* Hamburger for mobile */}
      <button className="hamburger" onClick={() => setSidebarOpen(!sidebarOpen)} style={{ position: 'fixed', top: '0.8rem', left: '0.8rem', zIndex: 1001, background: 'var(--cresoa-accent)', color: '#fff', fontSize: '1.3rem', padding: '0.2rem 0.5rem', borderRadius: '6px', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
        {sidebarOpen ? '✕' : '☰'}
      </button>
      <div className={`overlay ${sidebarOpen ? 'open' : ''}`} onClick={() => setSidebarOpen(false)} style={{ display: sidebarOpen ? 'block' : 'none', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.3)', zIndex: 999 }} />

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
          {[
            { name: 'Dashboard', path: '/dashboard/repairs', icon: 'bar-chart-2' },
            { name: 'Jobs', path: '/dashboard/repairs/jobs', icon: 'tool' },
            { name: 'Customers', path: '/dashboard/repairs/customers', icon: 'users' },
            { name: 'Parts', path: '/dashboard/repairs/parts', icon: 'package' },
            { name: 'Invoices', path: '/dashboard/repairs/invoices', icon: 'file-text' },
          ].map((item) => (
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
            <span className="date">{new Date().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
          </div>
        </div>
        <Banner />
        {children}
      </div>

      {/* Bottom nav for mobile */}
      <RepairsNavigation businessId={business?.id} />
    </div>
  )
}

export default function RepairsLayout({ children }) {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: 'var(--cresoa-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'var(--cresoa-text-muted)' }}>Loading...</div>
      </div>
    }>
      <div className="cresoa-dashboard-page">
        <RepairsLayoutContent>{children}</RepairsLayoutContent>
      </div>
    </Suspense>
  )
      }
