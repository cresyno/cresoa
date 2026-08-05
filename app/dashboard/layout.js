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
      <div style={{ minHeight: '100vh', background: '#F7F5F0' }}>
        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
          .spinner {
            width: 40px; height: 40px;
            border: 4px solid #E5E0D8;
            border-top: 4px solid #0F2B4A;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
          }
        `}</style>
        <div className="spinner" style={{ margin: 'auto', marginTop: '40vh' }} />
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F7F5F0' }}>
      <style>{`
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

        .hamburger {
          position: fixed;
          top: 0.8rem;
          left: 0.8rem;
          z-index: 1001;
          background: #0F2B4A;
          border: none;
          color: #fff;
          font-size: 1.3rem;
          padding: 0.2rem 0.5rem;
          border-radius: 6px;
          cursor: pointer;
          display: none;
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        }
        .hamburger:hover { background: #1A3F66; }
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

        .main-content {
          flex: 1;
          min-width: 0;
          padding: 0;
        }
        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.4rem 1.2rem;
          background: #fff;
          border-bottom: 1px solid #E5E0D8;
          box-shadow: 0 1px 4px rgba(0,0,0,0.02);
        }
        .dashboard-header .date {
          font-size: 0.7rem;
          color: #8A8A8A;
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

        {/* ─── BUSINESS ─── */}
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

        {/* ─── TEAM & SETTINGS ─── */}
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
          <button className="theme-btn" onClick={toggleTheme}>
            <span className="icon">{theme === 'light' ? '🌙' : '☀️'}</span>
            {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
          </button>
        </div>

        {/* ─── BOTTOM ─── */}
        <div className="bottom">
          <button className="logout" onClick={handleLogout}>
            <span className="icon">🚪</span> Logout
          </button>
        </div>
      </div>

      <div className="main-content">
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
