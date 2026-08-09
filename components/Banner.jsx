'use client';

import { useState, useEffect } from 'react';
import { Icon } from './Icon';

export default function Banner() {
  const [banner, setBanner] = useState(null);
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadBanner() {
      try {
        // ─── Fetch from public/banner.json ───
        const response = await fetch('/banner.json?t=' + Date.now());
        if (response.ok) {
          const data = await response.json();
          setBanner(data);
          // Check if this banner was dismissed
          const dismissedId = `banner_dismissed_${data.message}`;
          if (localStorage.getItem(dismissedId) === 'true') {
            setDismissed(true);
          }
        }
      } catch (err) {
        console.error('Error loading banner:', err);
      } finally {
        setLoading(false);
      }
    }
    loadBanner();
  }, []);

  const handleDismiss = () => {
    if (banner?.dismissible) {
      const dismissedId = `banner_dismissed_${banner.message}`;
      localStorage.setItem(dismissedId, 'true');
      setDismissed(true);
    }
  };

  if (loading || !banner || !banner.show || dismissed) {
    return null;
  }

  // ─── Banner styles by type ───
  const styles = {
    info: { bg: '#D6E0EB', color: '#1E3A5F', icon: 'info' },
    warning: { bg: '#F6E9C8', color: '#8A6D1B', icon: 'alert-triangle' },
    success: { bg: '#DCEBE2', color: '#2E7D5E', icon: 'check-circle' },
    promotion: { bg: '#0F2B4A', color: '#D4A52A', icon: 'crown' },
    danger: { bg: '#F1DBD3', color: '#D9534F', icon: 'alert-circle' },
  };

  const style = styles[banner.type] || styles.info;

  return (
    <div style={{
      background: style.bg,
      color: style.color,
      padding: '0.8rem 1.2rem',
      borderRadius: '8px',
      marginBottom: '1rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '0.8rem',
      flexWrap: 'wrap',
      border: '1px solid rgba(255,255,255,0.1)',
      boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flex: 1 }}>
        <Icon name={style.icon} size={20} stroke={style.color} />
        <span style={{ fontWeight: '500', fontSize: '0.9rem' }}>
          {banner.message}
          {banner.link && (
            <a
              href={banner.link}
              style={{
                color: style.color,
                fontWeight: '600',
                textDecoration: 'underline',
                marginLeft: '0.3rem'
              }}
            >
              {banner.linkText || 'Learn more →'}
            </a>
          )}
        </span>
      </div>
      {banner.dismissible && (
        <button
          onClick={handleDismiss}
          style={{
            background: 'none',
            border: 'none',
            color: style.color,
            cursor: 'pointer',
            padding: '0.2rem',
            opacity: 0.6,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Icon name="x" size={16} stroke={style.color} />
        </button>
      )}
    </div>
  );
          }
