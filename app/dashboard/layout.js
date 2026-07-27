'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'
import LetterLogo from '../../components/LetterLogo'

export default function DashboardLayout({ children }) {
  const router = useRouter()
  const pathname = usePathname()
  const [business, setBusiness] = useState(null)
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Navigation items (shared across all industries)
  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: '📊' },
    { name: 'Orders', path: '/dashboard/orders', icon: '📋' },
    { name: 'Customers', path: '/dashboard/customers', icon: '👤' },
    { name: 'Groups', path: '/dashboard/groups/new', icon: '👥' },
    { name: 'Reminders', path: '/dashboard/reminders', icon: '🔔' },
  ]

  // Repair-specific nav items (only shown when on repairs path)
  const repairNavItems = [
    { name: 'Dashboard', path: '/dashboard/repairs', icon: '📊' },
    { name: 'Jobs', path: '/dashboard/repairs/jobs', icon: '🔧' },
    { name: 'Customers', path: '/dashboard/customers', icon: '👤' },
    { name: 'Parts', path: '/dashboard/repairs/parts', icon: '📦' },
    { name: 'Reminders', path: '/dashboard/reminders', icon: '🔔' },
  ]

  // Determine which nav items to show
  const isRepairs = pathname?.startsWith('/dashboard/repairs')
  const currentNavItems = isRepairs ? repairNavItems : navItems

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data: businessData } = await supabase
        .from('businesses')
        .select('name, sector')
        .eq('owner_id', user.id)
        .single()

      setBusiness(businessData)
      setLoading(false)
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

  // Close sidebar on mobile when navigating
  const handleNavClick = () => {
    setSidebarOpen(false)
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#F5EFE2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
        <div className="spinner"></div>
      </div>
    )
  }

  // Get industry badge
  const getIndustryBadge = () => {
    if (isRepairs) return '🔧 Repairs'
    if (business?.sector === 'Fashion & Custom Wear') return '👗 Fashion'
    if (business?.sector === 'Custom Products & Services') return '🛠️ Manufacturing'
    return ''
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F5EFE2' }}>
      <style>{`
        /* ===== HAMBURGER ===== */
        .hamburger {
          position: fixed;
          top: 1rem;
          left: 1rem;
          z-index: 1001;
          background: #1E3A5F;
          border: none;
          color: #fff;
          font-size: 1.5rem;
          padding: 0.3rem 0.6rem;
          border-radius: 8px;
          cursor: pointer;
          display: none;
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        }
        .hamburger:hover { background: #0F1E30; }

        /* ===== OVERLAY ===== */
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

        /* ===== SIDEBAR ===== */
        .sidebar {
          width: 220px;
          min-height: 100vh;
          background: linear-gradient(180deg, #1E3A5F 0%, #0F1E30 100%);
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
          background: rgba(199,154,43,0.15);
          color: #C79A2B;
          padding: 0.05rem 0.4rem;
          border-radius: 8px;
          font-size: 0.5rem;
          font-weight: 600;
          margin-left: 0.3rem;
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
          background: rgba(199,154,43,0.15);
          color: #C79A2B;
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
        .sidebar .bottom .logout-btn {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          padding: 0.5rem 0.7rem;
          border-radius: 6px;
          background: none;
          border: none;
          color: #AE4A34;
          font-size: 0.8rem;
          font-weight: 500;
          cursor: pointer;
          width: 100%;
          transition: background 0.15s ease;
        }
        .sidebar .bottom .logout-btn:hover {
          background: rgba(174,74,52,0.15);
        }
        .sidebar .bottom a {
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
        .sidebar .bottom a:hover {
          background: rgba(255,255,255,0.06);
          color: #fff;
        }
        .main-content {
          flex: 1;
          min-width: 0;
          padding: 0;
        }

        /* ===== DESKTOP ===== */
        @media (min-width: 769px) {
          .hamburger { display: none !important; }
          .sidebar { transform: translateX(0) !important; }
          .overlay { display: none !important; }
        }

        /* ===== MOBILE ===== */
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
        }
      `}</style>

      {/* ===== HAMBURGER ===== */}
      <button className="hamburger" onClick={() => setSidebarOpen(!sidebarOpen)}>
        {sidebarOpen ? '✕' : '☰'}
      </button>

      {/* ===== OVERLAY ===== */}
      <div className={`overlay ${sidebarOpen ? 'open' : ''}`} onClick={() => setSidebarOpen(false)} />

      {/* ===== SIDEBAR ===== */}
      <div className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="brand">
          <LetterLogo name={business?.name} size={32} />
          <div>
            <div className="name">Cresoa</div>
            <div className="sub">
              {business?.name || 'Your business'}
              <span className="badge">{getIndustryBadge()}</span>
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
          <a href="/dashboard/profile" onClick={handleNavClick}>⚙️ Profile</a>
          <button className="logout-btn" onClick={handleLogout}>🚪 Logout</button>
        </div>
      </div>

      {/* ===== MAIN CONTENT ===== */}
      <div className="main-content">
        {children}
      </div>
    </div>
  )
  }
