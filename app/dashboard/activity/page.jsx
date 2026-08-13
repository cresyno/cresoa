'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../../lib/supabaseClient'
import { getCurrentBusinessId } from '../../../lib/getBusinessId'
import { Icon } from '../../../components/Icon'
import { Card } from '../../../components/Card'
import { SectionHeader } from '../../../components/SectionHeader'
import { Navigation } from '../../../components/Navigation'
import '../../globals.css'

// ─── Helper: format date ──────────────────────────────────
function formatDate(isoString) {
  if (!isoString) return '—'
  const date = new Date(isoString)
  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// ─── Helper: action style mapping ────────────────────────
function getActionInfo(action) {
  const map = {
    'invite_created': { label: 'Invite Sent', bg: 'var(--cresoa-warning-soft)', color: 'var(--cresoa-warning)', icon: 'mail' },
    'invite_accepted': { label: 'Invite Accepted', bg: 'var(--cresoa-success-soft)', color: 'var(--cresoa-success)', icon: 'check-circle' },
    'role_changed': { label: 'Role Changed', bg: 'var(--cresoa-info-soft)', color: 'var(--cresoa-info)', icon: 'user' },
    'member_removed': { label: 'Member Removed', bg: 'var(--cresoa-danger-soft)', color: 'var(--cresoa-danger)', icon: 'trash-2' },
    'business_created': { label: 'Business Created', bg: 'var(--cresoa-surface-soft)', color: 'var(--cresoa-text-muted)', icon: 'building' },
    'invite_accepted_from_onboarding': { label: 'Joined via Onboarding', bg: 'var(--cresoa-success-soft)', color: 'var(--cresoa-success)', icon: 'user-plus' },
    'business_auto_created': { label: 'Auto Created', bg: 'var(--cresoa-surface-soft)', color: 'var(--cresoa-text-muted)', icon: 'settings' },
    'order_created': { label: 'Order Created', bg: 'var(--cresoa-info-soft)', color: 'var(--cresoa-info)', icon: 'plus' },
    'order_updated': { label: 'Order Updated', bg: 'var(--cresoa-info-soft)', color: 'var(--cresoa-info)', icon: 'edit-2' },
    'order_status_updated': { label: 'Status Updated', bg: 'var(--cresoa-warning-soft)', color: 'var(--cresoa-warning)', icon: 'refresh-cw' },
  }
  return map[action] || { label: action?.replace(/_/g, ' ') || 'Action', bg: 'var(--cresoa-surface-soft)', color: 'var(--cresoa-text-muted)', icon: 'activity' }
}

export default function ActivityPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const businessId = getCurrentBusinessId() || searchParams.get('business_id')

  const [logs, setLogs] = useState([])
  const [userMap, setUserMap] = useState({}) // id -> email
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [userRole, setUserRole] = useState(null)
  const [currentUserId, setCurrentUserId] = useState(null)

  // ─── Navigation helper ────────────────────────────────────
  const navigateWithBusiness = (path) => {
    const separator = path.includes('?') ? '&' : '?'
    router.push(`${path}${separator}business_id=${businessId}`)
  }

  // ─── Load data ─────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      if (!businessId) {
        setError('No business selected.')
        setLoading(false)
        return
      }

      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/login')
          return
        }
        setCurrentUserId(user.id)

        // Check role
        const { data: membership } = await supabase
          .from('business_memberships')
          .select('role')
          .eq('business_id', businessId)
          .eq('user_id', user.id)
          .maybeSingle()

        if (!membership || (membership.role !== 'Owner' && membership.role !== 'Manager')) {
          setError('You do not have permission to view activity logs.')
          setLoading(false)
          return
        }
        setUserRole(membership.role)

        // ─── Fetch logs ────────────────────────────────────────
        const { data, error: fetchError } = await supabase
          .from('business_activity_logs')
          .select('*')
          .eq('business_id', businessId)
          .order('created_at', { ascending: false })
          .limit(100)

        if (fetchError) throw fetchError
        setLogs(data || [])

        // ─── Fetch user emails for distinct performed_by ──────
        if (data && data.length > 0) {
          const userIds = [...new Set(data.map(log => log.performed_by).filter(Boolean))];
          if (userIds.length > 0) {
            const { data: { session } } = await supabase.auth.getSession()
            if (session) {
              const response = await fetch('/api/users', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({ ids: userIds })
              })
              const result = await response.json()
              if (response.ok && result.users) {
                const map = {}
                result.users.forEach(u => { map[u.id] = u.email || 'Unknown' })
                setUserMap(map)
              }
            }
          }
        }

      } catch (err) {
        console.error('Error loading activity logs:', err)
        setError('Failed to load activity logs.')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [businessId, router])

  // ─── Loading skeleton ────────────────────────────────────
  if (loading) {
    return (
      <div style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto', paddingBottom: '80px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div style={{ width: '140px', height: '24px', background: 'var(--cresoa-border)', borderRadius: '6px' }} />
          <div style={{ width: '100px', height: '32px', background: 'var(--cresoa-border)', borderRadius: '6px' }} />
        </div>
        <div style={{ background: 'var(--cresoa-surface)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--cresoa-border)', animation: 'pulse 1.5s infinite', height: '300px' }} />
        <style>{`@keyframes pulse { 0% { opacity: 0.6; } 50% { opacity: 1; } 100% { opacity: 0.6; } }`}</style>
        <Navigation businessId={businessId} />
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto', paddingBottom: '80px' }}>
        <Card style={{ padding: '2rem', textAlign: 'center' }}>
          <Icon name="alert-circle" size={32} stroke="var(--cresoa-danger)" />
          <h2 style={{ margin: '0.5rem 0' }}>Couldn't load activity logs</h2>
          <p style={{ color: 'var(--cresoa-text-muted)' }}>{error}</p>
          {error.includes('permission') ? (
            <button onClick={() => navigateWithBusiness('/dashboard')} className="cresoa-primary-button" style={{ marginTop: '1rem' }}>
              Go to Dashboard
            </button>
          ) : (
            <button onClick={() => window.location.reload()} className="cresoa-primary-button" style={{ marginTop: '1rem' }}>
              Retry
            </button>
          )}
        </Card>
        <Navigation businessId={businessId} />
      </div>
    )
  }

  // ─── Main render ──────────────────────────────────────────
  return (
    <div style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto', paddingBottom: '80px' }}>
      <Navigation businessId={businessId} />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <div>
          <p style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', margin: 0 }}>Audit</p>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0.2rem 0', color: 'var(--cresoa-text)' }}>Activity Logs</h1>
          <p style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.85rem', margin: 0 }}>
            Monitor all actions taken in your business
          </p>
        </div>
        <div style={{ background: 'var(--cresoa-surface)', padding: '0.2rem 0.8rem', borderRadius: '20px', border: '1px solid var(--cresoa-border)', fontSize: '0.75rem', fontWeight: 600 }}>
          {userRole === 'Owner' ? '👑 Owner' : '🛠️ Manager'}
        </div>
      </div>

      {/* Logs Table / Card */}
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        {logs.length === 0 ? (
          <div style={{ padding: '3rem 2rem', textAlign: 'center' }}>
            <Icon name="inbox" size={40} stroke="var(--cresoa-text-muted)" />
            <h3 style={{ margin: '0.5rem 0 0.2rem' }}>No activity yet</h3>
            <p style={{ color: 'var(--cresoa-text-muted)' }}>
              Actions like invites, role changes, and member removals will appear here.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px', fontSize: '0.85rem' }}>
              <thead style={{ background: 'var(--cresoa-bg)', borderBottom: '2px solid var(--cresoa-border)' }}>
                <tr>
                  <th style={{ padding: '0.6rem 1rem', textAlign: 'left', fontWeight: 600, color: 'var(--cresoa-text-muted)', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Action</th>
                  <th style={{ padding: '0.6rem 1rem', textAlign: 'left', fontWeight: 600, color: 'var(--cresoa-text-muted)', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Details</th>
                  <th style={{ padding: '0.6rem 1rem', textAlign: 'left', fontWeight: 600, color: 'var(--cresoa-text-muted)', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.3px' }}>User</th>
                  <th style={{ padding: '0.6rem 1rem', textAlign: 'right', fontWeight: 600, color: 'var(--cresoa-text-muted)', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Time</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const info = getActionInfo(log.action)
                  let details = '—'
                  try {
                    if (log.details) {
                      const parsed = typeof log.details === 'object' ? log.details : JSON.parse(log.details)
                      details = Object.entries(parsed).map(([k, v]) => `${k}: ${v}`).join(', ')
                    }
                  } catch (_) {
                    details = String(log.details || '—')
                  }
                  const userName = userMap[log.performed_by] || log.performed_by?.slice(0, 8) || 'system'
                  return (
                    <tr key={log.id} style={{ borderBottom: '1px solid var(--cresoa-border)', transition: 'background 0.15s' }}>
                      <td style={{ padding: '0.6rem 1rem' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          padding: '0.2rem 0.8rem',
                          borderRadius: '20px',
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          background: info.bg,
                          color: info.color,
                          whiteSpace: 'nowrap'
                        }}>
                          <Icon name={info.icon} size={14} stroke="currentColor" />
                          {info.label}
                        </span>
                      </td>
                      <td style={{ padding: '0.6rem 1rem', fontSize: '0.8rem', color: 'var(--cresoa-text-muted)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {details}
                      </td>
                      <td style={{ padding: '0.6rem 1rem', fontSize: '0.8rem' }}>
                        {userName}
                      </td>
                      <td style={{ padding: '0.6rem 1rem', textAlign: 'right', fontSize: '0.7rem', color: 'var(--cresoa-text-muted)', whiteSpace: 'nowrap' }}>
                        {formatDate(log.created_at)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div style={{ marginTop: '2rem' }}>
        <Navigation businessId={businessId} />
      </div>
    </div>
  )
            }
