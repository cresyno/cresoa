'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import BusinessSwitcher from './BusinessSwitcher';

export default function Sidebar({ currentBusinessId, onSwitch }) {
  const pathname = usePathname();

  const navItems = [
    { name: 'Dashboard', href: '/dashboard/fashion' }, // Adjust if your main dashboard is different
    { name: 'Orders', href: '/dashboard/orders' },
    { name: 'Customers', href: '/dashboard/customers' },
    { name: 'Profile', href: '/dashboard/profile' },
  ];

  return (
    <aside style={{
      width: '260px',
      height: '100vh',
      background: 'var(--color-card)',
      borderRight: '1px solid var(--color-border)',
      display: 'flex',
      flexDirection: 'column',
      padding: '24px 16px',
      position: 'sticky',
      top: 0,
      boxShadow: 'var(--shadow)',
      zIndex: 50
    }}>
      {/* Brand / Logo Area */}
      <div style={{ marginBottom: '24px', fontSize: '20px', fontWeight: 'bold', color: 'var(--color-primary)' }}>
        Cresoa
      </div>

      {/* Business Switcher Component */}
      <BusinessSwitcher 
        currentBusinessId={currentBusinessId} 
        onSwitch={onSwitch} 
      />

      {/* Navigation Links */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                padding: '12px 16px',
                borderRadius: '8px',
                textDecoration: 'none',
                fontSize: '14px',
                fontWeight: isActive ? '600' : '500',
                background: isActive ? 'var(--color-primary)' : 'transparent',
                color: isActive ? '#FFFFFF' : 'var(--color-text)',
                transition: 'background 0.2s ease'
              }}
            >
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Footer / Sign out or Version info if needed */}
      <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', textAlign: 'center', paddingTop: '16px', borderTop: '1px solid var(--color-border)' }}>
        Cresoa v1.0
      </div>
    </aside>
  );
      }
