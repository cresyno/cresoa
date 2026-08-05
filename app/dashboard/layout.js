'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'
import LetterLogo from '../../components/LetterLogo'
import Logo from '../../components/Logo'
import { getPlan, FREE_TRIAL_DAYS } from '../../lib/planLimits'
import OnboardingTour from '../../components/OnboardingTour'

export default function DashboardLayout({ children }) {
  const router = useRouter()
  const pathname = usePathname()
  const [business, setBusiness] = useState(null)
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showTour, setShowTour] = useState(false)
  const [theme, setTheme] = useState('light')

  // Toggle theme
  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light'
    setTheme(newTheme)
    document.documentElement.setAttribute('data-theme', newTheme)
    localStorage.setItem('cresoa-theme', newTheme)
  }

  // Load theme from localStorage on mount
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

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: '📊' },
    { name: 'Orders', path: '/dashboard/orders', icon: '📋' },
    { name: 'Customers', path: '/dashboard/customers', icon: '👤' },
    { name: 'Groups', path: '/dashboard/groups/new', icon: '👥' },
    { name: 'Reminders', path: '/dashboard/reminders', icon: '🔔' },
  ]

  const repairNavItems = [
    { name: 'Dashboard', path: '/dashboard/repairs', icon: '📊' },
    { name: 'Jobs', path: '/dashboard/repairs/jobs', icon: '🔧' },
    { name: 'Customers', path: '/dashboard/customers', icon: '👤' },
    { name: 'Parts', path: '/dashboard/repairs/parts', icon: '📦' },
    { name: 'Reminders', path: '/dashboard/reminders', icon: '🔔' },
  ]

  const isRepairs = pathname?.startsWith('/dashboard/repairs')
  const currentNavItems = isRepairs ? repairNavItems : navItems

  useEffect(() => {
    const load = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/login')
          return
        }

        let { data: businessData } = await supabase
          .from('businesses')
          .select('*')
          .eq('owner_id', user.id)
          .single()

        if (!businessData) {
          const { data: staffData } = await supabase
            .from('staff')
            .select('business_id')
            .eq('user_id', user.id)
            .eq('status', 'active')
            .maybeSingle()

          if (staffData) {
            const { data: staffBusiness } = await supabase
              .from('businesses')
              .select('*')
              .eq('id', staffData.business_id)
              .single()

            if (staffBusiness) {
              businessData = staffBusiness
            }
          }
        }

        if (!businessData) {
          router.push('/onboarding')
          return
        }

        // Check if user hasn't completed the tour
        if (!businessData.has_completed_onboarding) {
          setShowTour(true)
        }

        // BETA EXPIRY CHECK
        if (businessData.plan === 'beta' && businessData.beta_expires_at) {
          const betaExpiry = new Date(businessData.beta_expires_at)
          const now = new Date()
          if (betaExpiry < now) {
            await supabase
              .from('businesses')
              .update({ plan: 'free', plan_status: 'expired' })
              .eq('id', businessData.id)
            businessData.plan = 'free'
            businessData.plan_status = 'expired'
          }
        }

        if (!businessData.trial_ends_at) {
          const trialEndsAt = new Date()
          trialEndsAt.setDate(trialEndsAt.getDate() + FREE_TRIAL_DAYS)
          await supabase
            .from('businesses')
            .update({
              trial_ends_at: trialEndsAt.toISOString(),
              trial_starts_at: new Date().toISOString(),
            })
            .eq('id', businessData.id)
          businessData.trial_ends_at = trialEndsAt.toISOString()
        }

        const now = new Date()
        const trialEnd = new Date(businessData.trial_ends_at)
        if (trialEnd < now && businessData.plan === 'free') {
          // trial expired, keep free
        }

        if (businessData.plan !== 'free' && businessData.plan !== 'beta') {
          const expiresAt = new Date(businessData.subscription_expires_at)
          if (expiresAt < now) {
            await supabase
              .from('businesses')
              .update({ plan: 'free', plan_status: 'expired' })
              .eq('id', businessData.id)
            businessData.plan = 'free'
            businessData.plan_status = 'expired'
          }
        }

        setBusiness(businessData)
      } catch (error) {
        console.error('Dashboard layout error:', error)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [router])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const isActive = (path) => {
    if (path === '/dashboard' || path === '/dashboard/repairs') {
      return pathname === path
    }
    return pathname?.startsWith(path)
  }

  const handleNavClick = () => setSidebarOpen(false)

  const getIndustryBadge = () => {
    if (isRepairs) return '🔧 Repairs'
    if (business?.sector === 'Fashion & Custom Wear') return '👗 Fashion'
    if (business?.sector === 'Custom Products & Services') return '🛠️ Manufacturing'
    return ''
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
          .spinner {
            width: 40px; height: 40px;
            border: 4px solid #e4d8c2;
            border-top: 4px solid #1E3A5F;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
          }
        `}</style>
        <div className="spinner" style={{ margin: 'auto', marginTop: '40vh' }} />
      </div>
    )
  }

  // ─── Premium Sidebar Styles ───
  // I'll keep the styles embedded in the JSX for clarity.
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--color-bg)' }}>
      <style>{`
        /* ─── Premium Sidebar Styles ─── */
        :root {
          --sidebar-width: 240px;
          --sidebar-bg: linear-gradient(180deg, #0F2B4A 0%, #1A3F66 100%);
          --sidebar-text: #C8D4E3;
          --sidebar-active: #D4A52A;
          --sidebar-hover: rgba(255,255,255,0.06);
          --sidebar-border: rgba(255,255,255,0.08);
        }
        [data-theme="dark"] {
          --sidebar-bg: linear-gradient(180deg, #0A0A1A 0%, #1A1A2E 100%);
          --sidebar-text: #B0B0C0;
          --sidebar-active: #D4A52A;
          --sidebar-hover: rgba(255,255,255,0.04);
          --sidebar-border: rgba(255,255,255,0.04);
        }

        /* Hamburger */
        .hamburger {
          position: fixed;
          top: 1rem;
          left: 1rem;
          z-index: 1001;
          background: var(--color-primary);
          border: none;
          color: #fff;
          font-size: 1.5rem;
          padding: 0.3rem 0.6rem;
          border-radius: 8px;
          cursor: pointer;
          display: none;
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        }
        .hamburger:hover { opacity: 0.8; }
        .overlay {
          display: none;
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.4);
          z-index: 999;
        }
        .overlay.open { display: block; }

        /* Sidebar */
        .sidebar {
          width: var(--sidebar-width);
          min-height: 100vh;
          background: var(--sidebar-bg);
          padding: 1.2rem 0.8rem;
          flex-shrink: 0;
          position: sticky;
          top: 0;
          height: 100vh;
          overflow-y: auto;
          transition: transform 0.3s ease;
          display: flex;
          flex-direction: column;
          border-right: 1px solid var(--sidebar-border);
        }
        .sidebar::-webkit-scrollbar { width: 4px; }
        .sidebar::-webkit-scrollbar-track { background: transparent; }
        .sidebar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 4px; }

        .sidebar .brand {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          padding-bottom: 1.2rem;
          border-bottom: 1px solid var(--sidebar-border);
          margin-bottom: 1.2rem;
        }
        .sidebar .brand .logo-text {
          color: #fff;
          font-size: 1rem;
          font-weight: 700;
          font-family: 'Fraunces', serif;
        }
        .sidebar .brand .sub {
          color: var(--sidebar-text);
          font-size: 0.55rem;
          opacity: 0.7;
          line-height: 1.4;
        }
        .sidebar .brand .badge {
          display: inline-block;
          background: rgba(212,165,42,0.15);
          color: #D4A52A;
          padding: 0.05rem 0.4rem;
          border-radius: 8px;
          font-size: 0.5rem;
          font-weight: 600;
          margin-left: 0.3rem;
        }
        .sidebar .brand .plan-badge {
          display: inline-block;
          background: #4C7A5E;
          color: #fff;
          padding: 0.05rem 0.4rem;
          border-radius: 8px;
          font-size: 0.5rem;
          font-weight: 600;
          text-transform: uppercase;
        }
        .sidebar .brand .plan-badge.beta {
          background: #1E3A5F;
          color: #C79A2B;
        }

        .sidebar .nav {
          display: flex;
          flex-direction: column;
          gap: 0.15rem;
          flex: 1;
        }
        .sidebar .nav a {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          padding: 0.5rem 0.7rem;
          border-radius: 8px;
          color: var(--sidebar-text);
          text-decoration: none;
          font-size: 0.8rem;
          font-weight: 500;
          transition: all 0.2s ease;
        }
        .sidebar .nav a:hover {
          background: var(--sidebar-hover);
          color: #fff;
          transform: translateX(4px);
        }
        .sidebar .nav a.active {
          background: rgba(212,165,42,0.12);
          color: #D4A52A;
          font-weight: 600;
          box-shadow: inset 3px 0 0 #D4A52A;
        }
        .sidebar .nav a .icon {
          font-size: 1rem;
          width: 22px;
          text-align: center;
          flex-shrink: 0;
        }

        .sidebar .bottom {
          border-top: 1px solid var(--sidebar-border);
          padding-top: 0.8rem;
          margin-top: 0.5rem;
        }
        .sidebar .bottom a,
        .sidebar .bottom button {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          padding: 0.5rem 0.7rem;
          border-radius: 8px;
          color: var(--sidebar-text);
          text-decoration: none;
          font-size: 0.8rem;
          font-weight: 500;
          transition: all 0.2s ease;
          background: none;
          border: none;
          width: 100%;
          cursor: pointer;
          text-align: left;
        }
        .sidebar .bottom a:hover,
        .sidebar .bottom button:hover {
          background: var(--sidebar-hover);
          color: #fff;
          transform: translateX(4px);
        }
        .sidebar .bottom .logout-btn {
          color: #D9534F;
        }
        .sidebar .bottom .logout-btn:hover {
          background: rgba(217,83,79,0.12);
          color: #D9534F;
        }
        .sidebar .bottom .theme-btn {
          color: #D4A52A;
        }
        .sidebar .bottom .theme-btn:hover {
          background: rgba(212,165,42,0.08);
          color: #D4A52A;
        }

        .main-content {
          flex: 1;
          min-width: 0;
          padding: 0;
        }
        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.8rem 1.2rem;
          background: var(--color-card);
          border-bottom: 1px solid var(--color-border);
          box-shadow: var(--shadow);
        }
        .dashboard-header .right {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        .beta-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.3rem 0.8rem;
          border-radius: 20px;
          background: linear-gradient(135deg, #D4A52A, #C79A2B);
          color: #0F2B4A;
          font-weight: 700;
          font-size: 0.7rem;
          text-decoration: none;
          box-shadow: 0 2px 12px rgba(212,165,42,0.3);
          border: none;
          cursor: pointer;
          transition: transform 0.1s ease;
        }
        .beta-btn:hover { transform: scale(1.02); }
        .beta-btn:active { transform: scale(0.98); }

        @media (min-width: 769px) {
          .hamburger { display: none !important; }
          .sidebar { transform: translateX(0) !important; }
          .overlay { display: none !important; }
        }
        @media (max-width: 768px) {
          .hamburger { display: block; }
          .sidebar {
            position: fixed;
            top: 0;
            left: 0;
            bottom: 0;
            transform: translateX(-100%);
            width: 260px;
            z-index: 1000;
            height: 100vh;
          }
          .sidebar.open { transform: translateX(0); }
          .overlay.open { display: block; }
          .main-content { padding-top: 3.5rem; }
          .dashboard-header { flex-wrap: wrap; gap: 0.5rem; }
        }
      `}</style>

      <button className="hamburger" onClick={() => setSidebarOpen(!sidebarOpen)}>
        {sidebarOpen ? '✕' : '☰'}
      </button>

      <div className={`overlay ${sidebarOpen ? 'open' : ''}`} onClick={() => setSidebarOpen(false)} />

      {/* ─── SIDEBAR ─── */}
      <div className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="brand">
          <Logo variant="primary" size="small" />
          <div>
            <div className="logo-text">Cresoa</div>
            <div className="sub">
              {business?.name || 'Your business'}
              <span className="badge">{getIndustryBadge()}</span>
              <br />
              <span className={`plan-badge ${business?.plan === 'beta' ? 'beta' : ''}`}>
                {business?.plan || 'Free'}
              </span>
            </div>
          </div>
        </div>

        <div className="nav">
          {currentNavItems.map((item) => (
            <a
              key={item.path}
              href={item.path}
              className={isActive(item.path) ? 'active' : ''}
              onClick={handleNavClick}
            >
              <span className="icon">{item.icon}</span>
              {item.name}
            </a>
          ))}
        </div>

        <div className="bottom">
          <a href="/dashboard/staff" onClick={handleNavClick}>👥 Staff</a>
          <a href="/dashboard/subscription" onClick={handleNavClick}>💳 Subscription</a>

          {business && !business.has_applied_for_beta && (
            <a href="/dashboard/beta-apply" onClick={handleNavClick} style={{ color: '#D4A52A' }}>
              🧪 Apply for Beta
            </a>
          )}

          {business && (business.plan === 'pro' || business.plan === 'beta') && (
            <a href="/dashboard/settings/tracking" onClick={handleNavClick} style={{ color: '#D4A52A' }}>
              🎨 Tracking Page
            </a>
          )}

          <a href="/dashboard/profile" onClick={handleNavClick}>⚙️ Profile</a>
          <button className="theme-btn" onClick={toggleTheme}>
            {theme === 'light' ? '🌙 Dark Mode' : '☀️ Light Mode'}
          </button>
          <button className="logout-btn" onClick={handleLogout}>🚪 Logout</button>
        </div>
      </div>

      <div className="main-content">
        {/* ─── DASHBOARD HEADER ─── */}
        <div className="dashboard-header" data-tour="dashboard-header">
          <div className="left">
            {/* No heading – removed for cleaner UX */}
          </div>
          <div className="right">
            {business && !business.has_applied_for_beta && (
              <a href="/dashboard/beta-apply" className="beta-btn">
                🧪 Apply for Beta
              </a>
            )}
            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
              {new Date().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
            </span>
          </div>
        </div>

        {children}
      </div>

      {/* Onboarding Tour */}
      {showTour && (
        <OnboardingTour
          onComplete={async () => {
            const { data: { session } } = await supabase.auth.getSession()
            if (session) {
              await fetch('/api/onboarding/complete', {
                method: 'POST',
                body: JSON.stringify({ accessToken: session.access_token }),
                headers: { 'Content-Type': 'application/json' },
              })
            }
            setShowTour(false)
          }}
        />
      )}
    </div>
  )
        }
