'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'
import Logo from '../../components/Logo'
import { FREE_TRIAL_DAYS } from '../../lib/planLimits'
import OnboardingTour from '../../components/OnboardingTour'

// ─── Helper: page‑specific header content ───
function getPageHeader(pathname, business, stats) {
  if (pathname === '/dashboard' || pathname === '/dashboard/repairs') {
    const isRepairs = pathname?.startsWith('/dashboard/repairs')
    return {
      title: isRepairs ? '🔧 Repairs Dashboard' : '📊 Dashboard',
      subtitle: `Welcome back, ${business?.name || 'Your business'}`
    }
  }
  if (pathname.startsWith('/dashboard/orders')) {
    return {
      title: '📋 Orders',
      subtitle: `${stats?.totalOrders || 0} orders · ${stats?.overdue || 0} overdue`
    }
  }
  if (pathname.startsWith('/dashboard/customers')) {
    return {
      title: '👤 Customers',
      subtitle: `${stats?.customers || 0} customers`
    }
  }
  if (pathname.startsWith('/dashboard/groups')) {
    return {
      title: '👥 Group Orders',
      subtitle: `${stats?.groups || 0} groups`
    }
  }
  if (pathname.startsWith('/dashboard/reminders')) {
    return {
      title: '🔔 Reminders',
      subtitle: `${stats?.dueToday || 0} due today · ${stats?.overdue || 0} overdue`
    }
  }
  if (pathname.startsWith('/dashboard/staff')) {
    return {
      title: '👥 Team & Staff',
      subtitle: 'Manage your team members'
    }
  }
  if (pathname.startsWith('/dashboard/subscription')) {
    return {
      title: '💳 Billing & Plan',
      subtitle: `${business?.plan || 'Free'} plan`
    }
  }
  if (pathname.startsWith('/dashboard/beta-apply')) {
    return {
      title: '🧪 Join Beta Program',
      subtitle: 'Get 90 days free Pro access'
    }
  }
  if (pathname.startsWith('/dashboard/settings/tracking')) {
    return {
      title: '🎨 Order Tracking Page',
      subtitle: 'Customize your customer\'s tracking experience'
    }
  }
  if (pathname.startsWith('/dashboard/profile')) {
    return {
      title: '⚙️ Profile & Settings',
      subtitle: 'Manage your account'
    }
  }
  return {
    title: '📊 Dashboard',
    subtitle: 'Welcome back'
  }
}

export default function DashboardLayout({ children }) {
  const router = useRouter()
  const pathname = usePathname()
  const [business, setBusiness] = useState(null)
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showTour, setShowTour] = useState(false)
  const [theme, setTheme] = useState('light')
  const [stats, setStats] = useState({})

  // ─── Theme ───
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

  // ─── Nav items ───
  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: '📊' },
    { name: 'Orders', path: '/dashboard/orders', icon: '📋' },
    { name: 'Customers', path: '/dashboard/customers', icon: '👤' },
    { name: 'Group Orders', path: '/dashboard/groups/new', icon: '👥' },
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

  // ─── Load business data ───
  useEffect(() => {
    const load = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/login')
          return
        }

        // 1. Check if the user owns a business
        let { data: businessData } = await supabase
          .from('businesses')
          .select('*')
          .eq('owner_id', user.id)
          .single()

        // 2. If not owner, check if they are active staff
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

        // 3. If still no business, redirect to onboarding
        if (!businessData) {
          router.push('/onboarding')
          return
        }

        if (!businessData.has_completed_onboarding) {
          setShowTour(true)
        }

        // ─── BETA EXPIRY CHECK ───
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

        // ─── Compute stats for headers ───
        const { count: totalOrders } = await supabase
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .eq('business_id', businessData.id)

        const { count: totalCustomers } = await supabase
          .from('customers')
          .select('*', { count: 'exact', head: true })
          .eq('business_id', businessData.id)

        const { data: orders } = await supabase
          .from('orders')
          .select('due_date, current_status')
          .eq('business_id', businessData.id)

        const today = new Date().toISOString().split('T')[0]
        const overdue = orders?.filter(o => {
          if (!o.due_date || o.current_status === 'Delivered') return false
          const due = new Date(o.due_date)
          due.setHours(0,0,0,0)
          const now = new Date()
          now.setHours(0,0,0,0)
          return due < now
        }).length || 0

        const dueToday = orders?.filter(o => o.due_date === today && o.current_status !== 'Delivered').length || 0

        const { count: groups } = await supabase
          .from('group_orders')
          .select('*', { count: 'exact', head: true })
          .eq('business_id', businessData.id)

        setStats({
          totalOrders: totalOrders || 0,
          customers: totalCustomers || 0,
          overdue,
          dueToday,
          groups: groups || 0
        })

      } catch (error) {
        console.error('Dashboard layout error:', error)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [router])

  // ─── Logout ───
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

  // ─── Page header content ───
  const header = getPageHeader(pathname, business, stats)

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
          .spinner {
            width: 40px; height: 40px;
            border: 4px solid var(--color-border);
            border-top: 4px solid var(--color-accent);
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
          }
        `}</style>
        <div className="spinner" style={{ margin: 'auto', marginTop: '40vh' }} />
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--color-bg)' }}>
      <style>{`
        /* ─── CSS VARIABLES (dashboard only) ─── */
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

        /* ─── HAMBURGER ─── */
        .hamburger {
          position: fixed;
          top: 0.8rem;
          left: 0.8rem;
          z-index: 1001;
          background: var(--color-primary);
          border: none;
          color: #fff;
          font-size: 1.3rem;
          padding: 0.2rem 0.5rem;
          border-radius: 6px;
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
          background: rgba(0,0,0,0.3);
          z-index: 999;
        }
        .overlay.open { display: block; }

        /* ─── SIDEBAR ─── */
        .sidebar {
          width: 240px;
          min-height: 100vh;
          background: #0A1628;
          padding: 1.2rem 0.8rem;
          flex-shrink: 0;
          position: sticky;
          top: 0;
          height: 100vh;
          overflow-y: auto;
          transition: transform 0.3s ease;
          display: flex;
          flex-direction: column;
          border-right: 1px solid rgba(255,255,255,0.04);
          z-index: 1000;
        }
        .sidebar::-webkit-scrollbar { width: 3px; }
        .sidebar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }

        .sidebar .brand {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          margin-bottom: 1rem;
        }
        .sidebar .brand .logo-text {
          color: #fff;
          font-size: 1rem;
          font-weight: 700;
          font-family: 'Fraunces', serif;
        }
        .sidebar .brand .sub {
          color: #8899AA;
          font-size: 0.5rem;
          line-height: 1.4;
        }
        .sidebar .brand .sub .badge {
          display: inline-block;
          background: rgba(212,165,42,0.15);
          color: #D4A52A;
          padding: 0.05rem 0.4rem;
          border-radius: 4px;
          font-size: 0.45rem;
          font-weight: 600;
          margin-left: 0.2rem;
        }
        .sidebar .brand .sub .plan {
          display: inline-block;
          background: #4C7A5E;
          color: #fff;
          padding: 0.05rem 0.4rem;
          border-radius: 4px;
          font-size: 0.45rem;
          font-weight: 600;
          text-transform: uppercase;
        }
        .sidebar .brand .sub .plan.beta {
          background: #1E3A5F;
          color: #C79A2B;
        }

        .sidebar .nav-section {
          margin-bottom: 0.8rem;
        }
        .sidebar .nav-section .section-label {
          color: rgba(255,255,255,0.2);
          font-size: 0.55rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          padding: 0.2rem 0.7rem;
          margin-bottom: 0.2rem;
          font-weight: 600;
        }
        .sidebar .nav-section a {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          padding: 0.4rem 0.7rem;
          border-radius: 6px;
          color: #8899AA;
          text-decoration: none;
          font-size: 0.8rem;
          font-weight: 500;
          transition: all 0.15s ease;
        }
        .sidebar .nav-section a:hover {
          background: rgba(255,255,255,0.04);
          color: #fff;
        }
        .sidebar .nav-section a.active {
          background: rgba(212,165,42,0.08);
          color: #D4A52A;
          font-weight: 600;
        }
        .sidebar .nav-section a .icon {
          font-size: 0.9rem;
          width: 20px;
          text-align: center;
          flex-shrink: 0;
        }

        .sidebar .bottom {
          margin-top: auto;
          border-top: 1px solid rgba(255,255,255,0.06);
          padding-top: 0.6rem;
        }
        .sidebar .bottom a,
        .sidebar .bottom button {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          padding: 0.4rem 0.7rem;
          border-radius: 6px;
          color: #8899AA;
          text-decoration: none;
          font-size: 0.8rem;
          font-weight: 500;
          transition: all 0.15s ease;
          background: none;
          border: none;
          width: 100%;
          cursor: pointer;
          text-align: left;
        }
        .sidebar .bottom a:hover,
        .sidebar .bottom button:hover {
          background: rgba(255,255,255,0.04);
          color: #fff;
        }
        .sidebar .bottom .logout {
          color: #D9534F;
        }
        .sidebar .bottom .logout:hover {
          background: rgba(217,83,79,0.08);
          color: #D9534F;
        }
        .sidebar .bottom .theme-btn {
          color: #D4A52A;
        }
        .sidebar .bottom .theme-btn:hover {
          background: rgba(212,165,42,0.06);
          color: #D4A52A;
        }
        .sidebar .bottom .support-link {
          color: #25D366;
        }
        .sidebar .bottom .support-link:hover {
          background: rgba(37,211,102,0.06);
          color: #25D366;
        }

        /* ─── MAIN CONTENT ─── */
        .main-content {
          flex: 1;
          min-width: 0;
          padding: 0;
        }

        .page-header {
          padding: 0.8rem 1.2rem 0.4rem 1.2rem;
          background: var(--color-card);
          border-bottom: 1px solid var(--color-border);
        }
        .page-header h1 {
          font-size: 1.1rem;
          font-weight: 700;
          color: var(--color-text);
          margin: 0;
        }
        .page-header p {
          font-size: 0.75rem;
          color: var(--color-text-muted);
          margin: 0.1rem 0 0;
        }

        .dashboard-header {
          display: flex;
          justify-content: flex-end;
          align-items: center;
          padding: 0.4rem 1.2rem;
          background: var(--color-card);
          border-bottom: 1px solid var(--color-border);
        }
        .dashboard-header .date {
          font-size: 0.7rem;
          color: var(--color-text-muted);
        }
        .beta-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
          padding: 0.2rem 0.7rem;
          border-radius: 16px;
          background: linear-gradient(135deg, #D4A52A, #C79A2B);
          color: #0F2B4A;
          font-weight: 700;
          font-size: 0.65rem;
          text-decoration: none;
          box-shadow: 0 2px 8px rgba(212,165,42,0.2);
          transition: transform 0.1s ease;
        }
        .beta-btn:hover { transform: scale(1.02); }

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
          .main-content { padding-top: 3rem; }
          .page-header { padding: 0.6rem 1rem 0.2rem 1rem; }
          .page-header h1 { font-size: 1rem; }
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
              <span className={`plan ${business?.plan === 'beta' ? 'beta' : ''}`}>
                {business?.plan || 'Free'}
              </span>
            </div>
          </div>
        </div>

        <div className="nav-section">
          <div className="section-label">Business</div>
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

        <div className="nav-section">
          <div className="section-label">Team</div>
          <a href="/dashboard/staff" onClick={handleNavClick}>
            <span className="icon">👥</span> Team & Staff
          </a>
        </div>

        <div className="nav-section">
          <div className="section-label">Settings</div>
          <a href="/dashboard/subscription" onClick={handleNavClick}>
            <span className="icon">💳</span> Billing & Plan
          </a>
          {business && !business.has_applied_for_beta && (
            <a href="/dashboard/beta-apply" onClick={handleNavClick} style={{ color: '#D4A52A' }}>
              <span className="icon">🧪</span> Join Beta Program
            </a>
          )}
          {business && (business.plan === 'pro' || business.plan === 'beta') && (
            <a href="/dashboard/settings/tracking" onClick={handleNavClick} style={{ color: '#D4A52A' }}>
              <span className="icon">🎨</span> Order Tracking Page
            </a>
          )}
          <a href="/dashboard/profile" onClick={handleNavClick}>
            <span className="icon">⚙️</span> Profile & Settings
          </a>
        </div>

        <div className="bottom">
          <button className="theme-btn" onClick={toggleTheme}>
            <span className="icon">{theme === 'light' ? '🌙' : '☀️'}</span>
            {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
          </button>
          <a
            href="https://wa.me/2349049209780"
            target="_blank"
            rel="noopener noreferrer"
            className="support-link"
            onClick={handleNavClick}
          >
            <span className="icon">💬</span> Contact Support
          </a>
          <button className="logout" onClick={handleLogout}>
            <span className="icon">🚪</span> Logout
          </button>
        </div>
      </div>

      <div className="main-content">
        {/* ─── TOP HEADER WITH DATE AND BETA BUTTON ─── */}
        <div className="dashboard-header">
          <div></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {business && !business.has_applied_for_beta && (
              <a href="/dashboard/beta-apply" className="beta-btn">🧪 Join Beta</a>
            )}
            <span className="date">
              {new Date().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
            </span>
          </div>
        </div>

        {/* ─── PAGE HEADER ─── */}
        <div className="page-header">
          <h1>{header.title}</h1>
          <p>{header.subtitle}</p>
        </div>

        {children}
      </div>

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
