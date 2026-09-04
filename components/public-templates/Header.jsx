'use client'

import { useState } from 'react'

export default function Header({ business, page, navItems, sidebar }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // If not sidebar, just render regular header
  if (!sidebar) {
    return (
      <nav style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(250,250,249,0.95)', backdropFilter: 'blur(10px)', borderBottom: '1px solid #E5E7EB', padding: '0.8rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          {business.logo_url ? <img src={business.logo_url} alt={business.name} style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'contain' }} /> : <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#D4A52A', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800 }}>{business.name.charAt(0)}</div>}
          <span style={{ fontWeight: 600, fontSize: '1.1rem', color: '#0F2B4A' }}>{business.name}</span>
        </div>
        <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem', fontWeight: 500, color: '#6B7280' }}>
          {navItems}
        </div>
      </nav>
    )
  }

  // Sidebar mode
  return (
    <>
      {/* Hamburger button (fixed top-left) */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        style={{
          position: 'fixed', top: '15px', left: '15px', zIndex: 300,
          background: '#0F2B4A', color: '#fff', border: 'none', borderRadius: '8px',
          padding: '0.5rem 0.8rem', cursor: 'pointer', fontSize: '1.2rem'
        }}
      >
        ☰
      </button>

      {/* Sidebar overlay */}
      {sidebarOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200 }} onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <div style={{
        position: 'fixed', left: 0, top: 0, height: '100vh', width: '250px',
        background: '#0F2B4A', color: '#fff', padding: '2rem 1rem',
        transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.3s ease', zIndex: 250,
        display: 'flex', flexDirection: 'column'
      }}>
        <div style={{ marginBottom: '2rem' }}>
          <span style={{ fontWeight: 800, fontSize: '1.2rem' }}>{business.name}</span>
        </div>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {navItems}
        </nav>
      </div>
    </>
  )
          }
