'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '../../../lib/supabaseClient'
import LetterLogo from '../../../components/LetterLogo'

export default function RepairsLayout({ children }) {
  const router = useRouter()
  const pathname = usePathname()
  const [business, setBusiness] = useState(null)
  const [loading, setLoading] = useState(true)

  const navItems = [
    { name: 'Dashboard', path: '/dashboard/repairs', icon: '📊' },
    { name: 'Jobs', path: '/dashboard/repairs/jobs', icon: '🔧' },
    { name: 'Customers', path: '/dashboard/repairs/customers', icon: '👤' },
    { name: 'Parts', path: '/dashboard/repairs/parts', icon: '📦' },
    { name: 'Reminders', path: '/dashboard/repairs/reminders', icon: '🔔' },
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
    if (path === '/dashboard/repairs') {
      return pathname === '/dashboard/repairs'
    }
    return pathname.startsWith(path)
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

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F5EFE2' }}>
      <style>{`
        .sidebar {
          width: 240px;
          min-height: 100vh;
          background: linear-gradient(180deg, #1E3A5F 0%, #0F1E30 100%);
          padding: 1.5rem 1rem;
          flex-shrink: 0;
          position: sticky;
          top: 0;
          height: 100vh;
          overflow-y: auto;
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
        }
        .sidebar .brand .sub {
          color: #A0B4C9;
          font-size: 0.6rem;
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
          font-size: 1.1rem;
          width: 24px;
          text-align: center;
        }
        .sidebar .bottom {
          border-top: 1px solid rgba(255,255,255,0.08);
          padding-top: 1rem;
          margin-top: 0.5rem;
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
        .main-content {
          flex: 1;
          min-width: 0;
          padding: 0;
        }
        .repairs-badge {
          display: inline-block;
          background: rgba(199,154,43,0.15);
          color: #C79A2B;
          padding: 0.05rem 0.5rem;
          border-radius: 10px;
          font-size: 0.55rem;
          font-weight: 600;
          margin-left: 0.3rem;
        }
        @media (max-width: 768px) {
          .sidebar {
            width: 200px;
            padding: 1rem 0.8rem;
          }
          .sidebar .brand .sub {
            font-size: 0.5rem;
          }
        }
      `}</style>

      <div className="sidebar">
        <div className="brand">
          <LetterLogo name={business?.name} size={36} />
          <div>
            <div className="name">Cresoa</div>
            <div className="sub">
              {business?.name || 'Your business'}
              <span className="repairs-badge">Repairs</span>
            </div>
          </div>
        </div>

        <div className="nav">
          {navItems.map((item) => (
            <a
              key={item.path}
              href={item.path}
              className={isActive(item.path) ? 'active' : ''}
            >
              <span className="icon">{item.icon}</span>
              {item.name}
            </a>
          ))}
        </div>

        <div className="bottom">
          <a
            href="/dashboard/profile"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.7rem',
              padding: '0.6rem 0.8rem',
              borderRadius: '8px',
              color: '#C8D4E3',
              textDecoration: 'none',
              fontSize: '0.85rem',
              fontWeight: '500',
            }}
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

      <div className="main-content">
        {children}
      </div>
    </div>
  )
            }
