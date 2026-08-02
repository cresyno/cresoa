'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'
import LetterLogo from '../../components/LetterLogo'
import { getPlan, FREE_TRIAL_DAYS } from '../../lib/planLimits'
import OnboardingTour from '../../components/OnboardingTour' // 👈 NEW

export default function DashboardLayout({ children }) {
  const router = useRouter()
  const pathname = usePathname()
  const [business, setBusiness] = useState(null)
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showTour, setShowTour] = useState(false) // 👈 NEW
  const [theme, setTheme] = useState('light') // 👈 NEW

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

        // 👇 NEW: Check if user hasn't completed the tour
        if (!businessData.has_completed_onboarding) {
          setShowTour(true)
        }

        // 🔥 BETA EXPIRY CHECK
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

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--color-bg)' }}>
      <style>{`
        :root {
          --color-bg: #F8F6F2;
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
          --color-bg: #1A1A2E;
          --color-card: #2A2A3E;
          --color-text: #E8E8E8;
          --color-text-muted: #AAAAAA;
          --color-border: #3A3A4E;
          --color-primary: #D4A52A;
          --color-accent: #D4A52A;
          --color-success: #2E7D5E;
          --color-danger: #D9534F;
          --shadow: 0 4px 16px rgba(0,0,0,0.3);
        }

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
        .sidebar {
          width: 220px;
          min-height: 100vh;
          background: linear-gradient(180deg, #0F2B4A 0%, #1A3F66 100%);
          padding: 1.2rem 0.8rem;
          flex-shrink: 0;
          position: sticky;
          top: 0;
          height: 100vh;
          overflow-y: auto;
          transition: transform 0.3s ease;
        }
        .sidebar .brand {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          padding-bottom: 1.2rem;
          border-bottom: 1px solid rgba(255,255,255,0.08);
          margin-bottom: 1.2rem;
        }
        .sidebar .brand .name {
          color: #fff;
          font-size: 1rem;
          font-weight: 700;
          font-family: 'Fraunces', serif;
        }
        .sidebar .brand .sub {
          color: #A0B4C9;
          font-size: 0.55rem;
          opacity: 0.7;
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
        .sidebar .plan-badge {
          display: inline-block;
          background: #4C7A5E;
          color: #fff;
          padding: 0.05rem 0.4rem;
          border-radius: 8px;
          font-size: 0.5rem;
          font-weight: 600;
          margin-left: 0.3rem;
          text-transform: uppercase;
        }
        .sidebar .plan-badge.beta {
          background: #1E3A5F;
          color: #C79A2B;
        }
        .sidebar .nav {
          display: flex;
          flex-direction: column;
          gap: 0.15rem;
        }
        .sidebar .nav a {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          padding: 0.5rem 0.7rem;
          border-radius: 6px;
          color: #C8D4E3;
          text-decoration: none;
          font-size: 0.8rem;
          font-weight: 500;
          transition: background 0.15s ease;
        }
        .sidebar .nav a:hover {
          background: rgba(255,255,255,0.06);
          color: #fff;
        }
        .sidebar .nav a.active {
          background: rgba(212,165,42,0.15);
          color: #D4A52A;
          font-weight: 600;
        }
        .sidebar .nav a .icon {
          font-size: 1rem;
          width: 22px;
          text-align: center;
        }
        .sidebar .bottom {
          border-top: 1px solid rgba(255,255,255,0.08);
          padding-top: 0.8rem;
          margin-top: 0.5rem;
        }
        .sidebar .bottom a,
        .sidebar .bottom button {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          padding: 0.5rem 0.7rem;
          border-radius: 6px;
          color: #C8D4E3;
          text-decoration: none;
          font-size: 0.8rem;
          font-weight: 500;
          transition: background 0.15s ease;
          background: none;
          border: none;
          width: 100%;
          cursor: pointer;
          text-align: left;
        }
        .sidebar .bottom a:hover,
        .sidebar .bottom button:hover {
          background: rgba(255,255,255,0.06);
          color: #fff;
        }
        .sidebar .bottom .logout-btn {
          color: #D9534F;
        }
        .sidebar .bottom .logout-btn:hover {
          background: rgba(217,83,79,0.15);
        }
        .sidebar .bottom .theme-btn {
          color: #D4A52A;
        }
        .sidebar .bottom .theme-btn:hover {
          background: rgba(212,165,42,0.1);
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
        .dashboard-header .left {
          display: flex;
          align-items: center;
          gap: 0.8rem;
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

      <div className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="brand">
          <LetterLogo name={business?.name} size={32} />
          <div>
            <div className="name">Cresoa</div>
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

        <div className="nav" data-tour="sidebar-nav">
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
            <a href="/dashboard/beta-apply" onClick={handleNavClick} style={{ color: '#D4A52A' }} data-tour="beta-button">
              🧪 Apply for Beta
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
        {/* 👇 Dashboard Header with Beta Button */}
        <div className="dashboard-header" data-tour="dashboard-header">
          <div className="left">
            <h2 style={{ margin: 0, color: 'var(--color-text)' }}>📊 Dashboard</h2>
          </div>
          <div className="right">
            {business && !business.has_applied_for_beta && (
              <a href="/dashboard/beta-apply" className="beta-btn" data-tour="beta-button">
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

      {/* 👇 Onboarding Tour */}
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
