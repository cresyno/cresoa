'use client'

import Link from 'next/link'

export default function UpgradeBanner({ resource, currentCount, limit, plan }) {
  if (plan === 'starter' || plan === 'pro' || plan === 'beta') return null

  const remaining = limit - currentCount

  if (remaining <= 0) {
    return (
      <div style={{
        background: '#F1DBD3',
        border: '1px solid #AE4A34',
        borderRadius: '10px',
        padding: '0.8rem 1rem',
        marginBottom: '1.2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '0.5rem',
      }}>
        <div>
          <p style={{ margin: 0, fontSize: '0.85rem', color: '#AE4A34', fontWeight: '600' }}>
            ⚠️ You've reached the limit of {limit} {resource} on your Free plan.
          </p>
        </div>
        <Link
          href="/dashboard/subscription"
          style={{
            background: '#AE4A34',
            color: '#fff',
            padding: '0.3rem 1rem',
            borderRadius: '6px',
            textDecoration: 'none',
            fontWeight: '600',
            fontSize: '0.8rem',
          }}
        >
          Upgrade now →
        </Link>
      </div>
    )
  }

  if (remaining > 3) return null

  const isWarning = remaining <= 2
  const bgColor = isWarning ? '#F1DBD3' : '#FFF3E0'
  const borderColor = isWarning ? '#AE4A34' : '#E67E22'
  const textColor = isWarning ? '#AE4A34' : '#E67E22'
  const buttonColor = isWarning ? '#AE4A34' : '#E67E22'

  return (
    <div
      style={{
        background: bgColor,
        border: `1px solid ${borderColor}`,
        borderRadius: '10px',
        padding: '0.8rem 1rem',
        marginBottom: '1.2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '0.5rem',
      }}
    >
      <div>
        <p style={{ margin: 0, fontSize: '0.85rem', color: textColor, fontWeight: '600' }}>
          {isWarning ? '⚠️' : '⚡'} You have {remaining} {resource} remaining on your Free plan.
        </p>
      </div>
      <Link
        href="/dashboard/subscription"
        style={{
          background: buttonColor,
          color: '#fff',
          padding: '0.3rem 1rem',
          borderRadius: '6px',
          textDecoration: 'none',
          fontWeight: '600',
          fontSize: '0.8rem',
        }}
      >
        Upgrade now →
      </Link>
    </div>
  )
}
