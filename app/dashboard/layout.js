'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'
import LetterLogo from '../../components/LetterLogo'

export default function DashboardLayout({ children }) {
  const router = useRouter()
  const pathname = usePathname()
  const [business, setBusiness] = useState(null)
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  // Navigation items
  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: '📊' },
    { name: 'Orders', path: '/dashboard/orders', icon: '📋' },
    { name: 'Customers', path: '/dashboard/customers', icon: '👤' },
    { name: 'Groups', path: '/dashboard/groups/new', icon: '👥' },
    { name: 'Reminders', path: '/dashboard/reminders', icon: '🔔' },
  ]

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data: businessData } = await supabase
        .from('businesses')
        .select('name')
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

  // Close sidebar on mobile when navigating
  const handleNavClick = () => {
    setIsOpen(false)
  }

  // Check if path matches nav item
  const isActive = (path) => {
    if (path === '/dashboard') {
      return pathname === '/dashboard'
    }
    return pathname.startsWith(path)
  }

  if (loading) {
    return (
      <main style={{ minHeight: '100vh', background: '#F5EFE2', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
          .cresoa-spinner {
            width: 40px; height: 40px;
            border: 4px solid #e4d8c2;
            border-top: 4px solid #1E3A5F;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
          }
        `}</style>
        <div className="cresoa-spinner"></div>
        <p style={{ color: '#6B6255', fontSize: '0.85rem', marginTop: '1rem' }}>Loading...</p>
      </main>
    )
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F5EFE2' }}>
      <style>{`
        /* Hamburger button */
        .hamburger {
          display: none;
          background: none;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
          padding: 0.5rem;
          color: #1E3A5F;
          position: fixed;
          top: 1rem;
          left: 1rem;
          z-index: 1001;
        }

        /* Overlay */
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
        .overlay.open {
          display: block;
        }

        /* Sidebar */
        .sidebar {
          width: 240px;
          min-height: 100vh;
          background: linear-gradient(180deg, #1E3A5F 0%, #0F1E30 100%);
          padding: 1.5rem 1rem;
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
          position: sticky;
          top: 0;
          height: 100vh;
          overflow-y: auto;
          transition: transform 0.3s ease;
        }

        .sidebar .brand {
          display: flex;
          align-items: center;
          gap: 0.7rem;
          padding-bottom: 1.5rem;
          border-bottom: 1px solid rgba(255,255,255,0.08);
          margin-bottom: 1.5rem;
        }

        .sidebar .brand .name {
          color: #fff;
          font-size: 1.1rem;
          font-weight: 700;
          font-family: 'Fraunces', serif;
          letter-spacing: -0.5px;
        }

        .sidebar .brand .sub {
          color: #A0B4C9;
          font-size: 0.6rem;
          font-weight: 400;
          opacity: 0.7;
          margin-top: -0.1rem;
        }

        .sidebar .nav {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 0.2rem;
        }

        .sidebar .nav a {
          display: flex;
          align-items: center;
          gap: 0.7rem;
          padding: 0.6rem 0.8rem;
          border-radius: 8px;
          color: #C8D4E3;
          text-decoration: none;
          font-size: 0.85rem;
          font-weight: 500;
          transition: background 0.15s ease, color 0.15s ease;
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
          font-size: 1.1rem;
          width: 24px;
          text-align: center;
        }

        .sidebar .bottom {
          border-top: 1px solid rgba(255,255,255,0.08);
          padding-top: 1rem;
          margin-top: 0.5rem;
        }

        .sidebar .bottom .profile-link {
          display: flex;
          align-items: center;
          gap: 0.7rem;
          padding: 0.6rem 0.8rem;
          border-radius: 8px;
          color: #C8D4E3;
          text-decoration: none;
          font-size: 0.85rem;
          font-weight: 500;
          transition: background 0.15s ease;
          margin-bottom: 0.2rem;
        }

        .sidebar .bottom .profile-link:hover {
          background: rgba(255,255,255,0.06);
          color: #fff;
        }

        .sidebar .bottom .profile-link.active {
          background: rgba(199,154,43,0.15);
          color: #C79A2B;
          font-weight: 600;
        }

        .sidebar .bottom .logout-btn {
          display: flex;
          align-items: center;
          gap: 0.7rem;
          padding: 0.6rem 0.8rem;
          border-radius: 8px;
          background: none;
          border: none;
          color: #AE4A34;
          font-size: 0.85rem;
          font-weight: 500;
          cursor: pointer;
          width: 100%;
          transition: background 0.15s ease;
        }

        .sidebar .bottom .logout-btn:hover {
          background: rgba(174,74,52,0.15);
        }

        /* Main content */
        .main-content {
          flex: 1;
          min-width: 0;
          padding: 0;
        }

        /* Desktop styles */
        @media (min-width: 769px) {
          .hamburger {
            display: none !important;
          }
          .sidebar {
            transform: translateX(0) !important;
          }
          .overlay {
            display: none !important;
          }
        }

        /* Mobile styles */
        @media (max-width: 768px) {
          .hamburger {
            display: block;
          }
          .sidebar {
            position: fixed;
            top: 0;
            left: 0;
            bottom: 0;
            transform: translateX(-100%);
            width: 280px;
            z-index: 1000;
            height: 100vh;
          }
          .sidebar.open {
            transform: translateX(0);
          }
          .overlay.open {
            display: block;
          }
          .main-content {
            padding-top: 3.5rem;
          }
        }
      `}</style>

      {/* ===== HAMBURGER BUTTON ===== */}
      <button className="hamburger" onClick={() => setIsOpen(!isOpen)}>
        {isOpen ? '✕' : '☰'}
      </button>

      {/* ===== OVERLAY ===== */}
      <div className={`overlay ${isOpen ? 'open' : ''}`} onClick={() => setIsOpen(false)} />

      {/* ===== SIDEBAR ===== */}
      <div className={`sidebar ${isOpen ? 'open' : ''}`}>
        {/* Brand */}
        <div className="brand">
          <LetterLogo name={business?.name} size={40} />
          <div>
            <div className="name">Cresoa</div>
            <div className="sub">{business?.name || 'Your business'}</div>
          </div>
        </div>

        {/* Navigation */}
        <div className="nav">
          {navItems.map((item) => (
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

        {/* Bottom */}
        <div className="bottom">
          <a
            href="/dashboard/profile"
            className={`profile-link ${isActive('/dashboard/profile') ? 'active' : ''}`}
            onClick={handleNavClick}
          >
            <span className="icon">⚙️</span>
            Profile & Settings
          </a>
          <button className="logout-btn" onClick={handleLogout}>
            <span className="icon">🚪</span>
            Logout
          </button>
        </div>
      </div>

      {/* ===== MAIN CONTENT ===== */}
      <div className="main-content">
        {children}
      </div>
    </div>
  )
      }
