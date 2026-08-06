'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'
import Logo from '../../components/Logo'
import { FREE_TRIAL_DAYS } from '../../lib/planLimits'
import BusinessSwitcher from '../components/BusinessSwitcher'

// ─── Keep your existing getPageHeader function here ───
// (I'm omitting it for brevity – use your existing one)

export default function DashboardLayout({ children }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [business, setBusiness] = useState(null)
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [theme, setTheme] = useState('light')
  const [stats, setStats] = useState({})
  const [debugMessage, setDebugMessage] = useState('Loading...')

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
        setDebugMessage('🔍 Loading...')
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/login')
          return
        }

        // ─── Get business_id from URL ───
        const businessIdFromUrl = searchParams.get('business_id')
        setDebugMessage(`📌 URL param: ${businessIdFromUrl?.slice(0,8) || 'none'}`)

        let businessData = null

        // ─── If we have a business_id in URL, load it ───
        if (businessIdFromUrl) {
          const { data: session } = await supabase.auth.getSession()
          if (session) {
            const response = await fetch(`/api/user/businesses?business_id=${businessIdFromUrl}`, {
              headers: { 'Authorization': `Bearer ${session.access_token}` }
            })
            const result = await response.json()
            if (response.ok && result.business) {
              businessData = result.business
              setDebugMessage(`✅ Loaded: ${businessData.name} from URL`)
            } else {
              setDebugMessage(`❌ API failed: ${result.error || 'not found'}`)
            }
          }
        }

        // ─── If no URL param or failed, load owned business ───
        if (!businessData) {
          const { data: ownedBusiness } = await supabase
            .from('businesses')
            .select('*')
            .eq('owner_id', user.id)
            .maybeSingle()
          if (ownedBusiness) {
            businessData = ownedBusiness
            setDebugMessage(`📌 Fallback owned: ${businessData.name}`)
          }
        }

        // ─── If still nothing, check membership ───
        if (!businessData) {
          const { data: membershipData } = await supabase
            .from('business_memberships')
            .select('business_id, role')
            .eq('user_id', user.id)
            .maybeSingle()
          if (membershipData) {
            const { data: memberBusiness } = await supabase
              .from('businesses')
              .select('*')
              .eq('id', membershipData.business_id)
              .maybeSingle()
            if (memberBusiness) {
              businessData = memberBusiness
              setDebugMessage(`📌 From membership: ${businessData.name}`)
            }
          }
        }

        if (!businessData) {
          setDebugMessage('❌ No business found')
          router.push('/onboarding')
          return
        }

        // ─── Beta expiry and trial logic ───
        // (keep your existing code here)

        setBusiness(businessData)

        // ─── Stats ───
        // (keep your existing stats code here)

      } catch (error) {
        console.error('Dashboard layout error:', error)
        setDebugMessage(`❌ Error: ${error.message}`)
        router.push('/onboarding')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [router, searchParams])

  // ─── Rest of your component (logout, handlers, render) ───
  // (keep everything below this as is)

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
      {/* ─── CSS Styles ─── */}
      <style>{`
        /* (keep your existing styles) */
      `}</style>

      <button className="hamburger" onClick={() => setSidebarOpen(!sidebarOpen)}>
        {sidebarOpen ? '✕' : '☰'}
      </button>

      <div className={`overlay ${sidebarOpen ? 'open' : ''}`} onClick={() => setSidebarOpen(false)} />

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

        <div style={{ marginBottom: '1rem' }}>
          <BusinessSwitcher 
            currentBusinessId={business?.id} 
          />
        </div>

        {/* ─── Navigation ─── */}
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
          <div className="section-label">Team & Activity</div>
          <a href="/dashboard/staff" className={isActive('/dashboard/staff') ? 'active' : ''} onClick={handleNavClick}>
            <span className="icon">👥</span> Team & Staff
          </a>
          <a href="/dashboard/activity" className={isActive('/dashboard/activity') ? 'active' : ''} onClick={handleNavClick}>
            <span className="icon">📜</span> Activity Logs
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
        {/* ─── DEBUG BAR ─── */}
        <div style={{
          background: '#1e1e2a',
          color: '#fff',
          padding: '0.4rem 0.8rem',
          fontSize: '0.65rem',
          fontFamily: 'monospace',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '2px solid #D4A52A'
        }}>
          <span>🔍 {debugMessage}</span>
          <span>🏢 {business?.name || 'none'}</span>
        </div>

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

        <div className="page-header">
          <h1>{header.title}</h1>
          <p>{header.subtitle}</p>
        </div>

        {children}
      </div>
    </div>
  )
}
