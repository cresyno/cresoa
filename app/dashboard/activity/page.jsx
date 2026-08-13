'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../../lib/supabaseClient'
import { getCurrentBusinessId } from '../../../lib/getBusinessId'
import { Icon } from '../../../components/Icon'
import { Card } from '../../../components/Card'
import { SectionHeader } from '../../../components/SectionHeader'
import { StatusPill } from '../../../components/StatusPill'
import { Navigation } from '../../../components/Navigation'
import '../../globals.css'

// ─── Helpers ────────────────────────────────────────────────

function formatRelativeTime(date) {
  const now = new Date()
  const diff = (now - date) / 1000 // seconds
  if (diff < 60) return `${Math.floor(diff)}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function getDateGroup(date) {
  const now = new Date()
  const d = new Date(date)
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const startOfWeek = new Date(today)
  startOfWeek.setDate(startOfWeek.getDate() - now.getDay())
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  if (d >= today) return 'Today'
  if (d >= yesterday) return 'Yesterday'
  if (d >= startOfWeek) return 'This Week'
  if (d >= startOfMonth) return 'This Month'
  return 'Older'
}

function getActionInfo(action) {
  const map = {
    'invite_created': { label: 'Invite Sent', icon: 'mail', color: 'var(--cresoa-warning)' },
    'invite_accepted': { label: 'Invite Accepted', icon: 'check-circle', color: 'var(--cresoa-success)' },
    'role_changed': { label: 'Role Changed', icon: 'user', color: 'var(--cresoa-info)' },
    'member_removed': { label: 'Member Removed', icon: 'trash-2', color: 'var(--cresoa-danger)' },
    'business_created': { label: 'Business Created', icon: 'building', color: 'var(--cresoa-text-muted)' },
    'invite_accepted_from_onboarding': { label: 'Joined via Onboarding', icon: 'user-plus', color: 'var(--cresoa-success)' },
    'business_auto_created': { label: 'Auto Created', icon: 'settings', color: 'var(--cresoa-text-muted)' },
    'order_created': { label: 'Order Created', icon: 'plus', color: 'var(--cresoa-info)' },
    'order_updated': { label: 'Order Updated', icon: 'edit-2', color: 'var(--cresoa-info)' },
    'order_status_updated': { label: 'Status Updated', icon: 'refresh-cw', color: 'var(--cresoa-warning)' },
  }
  return map[action] || { label: action?.replace(/_/g, ' ') || 'Action', icon: 'activity', color: 'var(--cresoa-text-muted)' }
}

function getLogDescription(log, userMap) {
  const performer = userMap[log.performed_by] || 'Someone'
  const action = log.action
  let details = ''
  try {
    if (log.details) {
      const parsed = typeof log.details === 'object' ? log.details : JSON.parse(log.details)
      details = Object.entries(parsed).map(([k, v]) => `${v}`).join(', ')
    }
  } catch (_) { details = '' }

  const templates = {
    'invite_created': `${performer} invited ${details || 'a new member'} as ${log.details?.role || 'Staff'}`,
    'invite_accepted': `${performer} accepted an invite`,
    'role_changed': `${performer} changed role to ${log.details?.new_role || 'Manager'}`,
    'member_removed': `${performer} removed a member`,
    'order_created': `${performer} created an order: ${log.details?.title || 'Untitled'}`,
    'order_updated': `${performer} updated an order`,
    'order_status_updated': `${performer} updated order status to ${log.details?.new_status || 'Ready'}`,
  }
  return templates[action] || `${performer} ${action.replace(/_/g, ' ')}${details ? ': ' + details : ''}`
}

export default function ActivityPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const businessId = getCurrentBusinessId() || searchParams.get('business_id')

  const [logs, setLogs] = useState([])
  const [userMap, setUserMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [userRole, setUserRole] = useState(null)

  const navigateWithBusiness = (path) => {
    const separator = path.includes('?') ? '&' : '?'
    router.push(`${path}${separator}business_id=${businessId}`)
  }

  useEffect(() => {
    const load = async () => {
      if (!businessId) {
        setError('No business selected.')
        setLoading(false)
        return
      }

      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { router.push('/login'); return }

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

        const { data, error: fetchError } = await supabase
          .from('business_activity_logs')
          .select('*')
          .eq('business_id', businessId)
          .order('created_at', { ascending: false })
          .limit(100)

        if (fetchError) throw fetchError
        setLogs(data || [])

        // Fetch user emails
        if (data && data.length > 0) {
          const userIds = [...new Set(data.map(log => log.performed_by).filter(Boolean))]
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

  // ─── Group logs by date ──────────────────────────────────
  const groupedLogs = {}
  logs.forEach(log => {
    const group = getDateGroup(log.created_at)
    if (!groupedLogs[group]) groupedLogs[group] = []
    groupedLogs[group].push(log)
  })
  const groupOrder = ['Today', 'Yesterday', 'This Week', 'This Month', 'Older']
  const sortedGroups = groupOrder.filter(g => groupedLogs[g])

  if (loading) {
    return (
      <div style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto', paddingBottom: '80px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div style={{ width: '140px', height: '24px', background: 'var(--cresoa-border)', borderRadius: '6px' }} />
          <div style={{ width: '100px', height: '32px', background: 'var(--cresoa-border)', borderRadius: '6px' }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
          {[1,2,3,4,5].map(i => (
            <div key={i} style={{ background: 'var(--cresoa-surface)', padding: '0.8rem 1rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', animation: 'pulse 1.5s infinite' }}>
              <div style={{ width: '60%', height: '16px', background: 'var(--cresoa-border)', borderRadius: '6px' }} />
              <div style={{ width: '30%', height: '12px', background: 'var(--cresoa-border)', borderRadius: '6px', marginTop: '0.3rem' }} />
            </div>
          ))}
        </div>
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
          <h2 style={{ margin: '0.5rem 0' }}>Couldn't load activity</h2>
          <p style={{ color: 'var(--cresoa-text-muted)' }}>{error}</p>
          <button onClick={() => window.location.reload()} className="cresoa-primary-button" style={{ marginTop: '1rem' }}>Retry</button>
        </Card>
        <Navigation businessId={businessId} />
      </div>
    )
  }

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto', paddingBottom: '80px' }}>
      <Navigation businessId={businessId} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <div>
          <p style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', margin: 0 }}>Audit</p>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0.2rem 0', color: 'var(--cresoa-text)' }}>Activity Logs</h1>
          <p style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.85rem', margin: 0 }}>
            {logs.length} activities recorded
          </p>
        </div>
        <div style={{ background: 'var(--cresoa-surface)', padding: '0.2rem 0.8rem', borderRadius: '20px', border: '1px solid var(--cresoa-border)', fontSize: '0.75rem', fontWeight: 600 }}>
          {userRole === 'Owner' ? '👑 Owner' : '🛠️ Manager'}
        </div>
      </div>

      {logs.length === 0 ? (
        <Card style={{ padding: '3rem 2rem', textAlign: 'center' }}>
          <Icon name="inbox" size={40} stroke="var(--cresoa-text-muted)" />
          <h3 style={{ margin: '0.5rem 0 0.2rem' }}>No activity yet</h3>
          <p style={{ color: 'var(--cresoa-text-muted)' }}>
            Actions like invites, role changes, and member removals will appear here.
          </p>
        </Card>
      ) : (
        sortedGroups.map(group => (
          <div key={group} style={{ marginBottom: '1.5rem' }}>
            <SectionHeader title={group} subtitle={`${groupedLogs[group].length} activities`} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {groupedLogs[group].map(log => {
                const info = getActionInfo(log.action)
                const description = getLogDescription(log, userMap)
                const relativeTime = formatRelativeTime(new Date(log.created_at))
                return (
                  <Card key={log.id} style={{ padding: '0.8rem 1rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: info.color + '20',
                      color: info.color,
                      flexShrink: 0
                    }}>
                      <Icon name={info.icon} size={18} stroke="currentColor" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 500, fontSize: '0.95rem', color: 'var(--cresoa-text)' }}>
                        {description}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--cresoa-text-muted)', display: 'flex', gap: '0.8rem', flexWrap: 'wrap' }}>
                        <span>{relativeTime}</span>
                        <span>·</span>
                        <span style={{ background: info.color + '20', color: info.color, padding: '0.1rem 0.5rem', borderRadius: '12px', fontSize: '0.65rem', fontWeight: 600 }}>
                          {info.label}
                        </span>
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          </div>
        ))
      )}

      <div style={{ marginTop: '2rem' }}>
        <Navigation businessId={businessId} />
      </div>
    </div>
  )
                      }
