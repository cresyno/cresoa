'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabaseClient'
import { getCurrentBusinessId } from '../../../lib/getBusinessId'

export default function ActivityPage() {
  const router = useRouter()
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [businessId, setBusinessId] = useState(null)
  const [userRole, setUserRole] = useState(null)

  useEffect(() => {
    const load = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/login')
          return
        }

        const bizId = getCurrentBusinessId()
        if (!bizId) {
          setError('No business selected.')
          setLoading(false)
          return
        }
        setBusinessId(bizId)

        // Check role
        const { data: membership } = await supabase
          .from('business_memberships')
          .select('role')
          .eq('business_id', bizId)
          .eq('user_id', user.id)
          .maybeSingle()

        if (!membership || (membership.role !== 'Owner' && membership.role !== 'Manager')) {
          setError('You do not have permission to view activity logs.')
          setLoading(false)
          return
        }
        setUserRole(membership.role)

        // Fetch logs using admin client (bypasses RLS)
        const { data, error: fetchError } = await supabaseAdmin
          .from('business_activity_logs')
          .select('*')
          .eq('business_id', bizId)
          .order('created_at', { ascending: false })
          .limit(100)

        if (fetchError) throw fetchError
        setLogs(data || [])
      } catch (err) {
        console.error('Error loading activity logs:', err)
        setError('Failed to load activity logs.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [router])

  // ─── Format date ───
  const formatDate = (isoString) => {
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

  // ─── Get action label and color ───
  const getActionStyle = (action) => {
    const map = {
      'invite_created': { label: 'Invite Sent', bg: '#F6E9C8', color: '#B4881E', icon: '📨' },
      'invite_accepted': { label: 'Invite Accepted', bg: '#DCEBE2', color: '#2E7D5E', icon: '✅' },
      'role_changed': { label: 'Role Changed', bg: '#D6E0EB', color: '#1E3A5F', icon: '🔄' },
      'member_removed': { label: 'Member Removed', bg: '#F1DBD3', color: '#D9534F', icon: '🚫' },
      'business_created': { label: 'Business Created', bg: '#E8E0D5', color: '#6B6255', icon: '🏢' },
      'invite_accepted_from_onboarding': { label: 'Joined via Onboarding', bg: '#DCEBE2', color: '#2E7D5E', icon: '🤝' },
      'business_auto_created': { label: 'Auto Created', bg: '#E8E0D5', color: '#6B6255', icon: '⚙️' },
    }
    return map[action] || { label: action?.replace(/_/g, ' ') || 'Action', bg: '#F0EDE8', color: '#6B6255', icon: '📌' }
  }

  // ─── Loading Skeleton ───
  if (loading) {
    return (
      <div style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ width: '180px', height: '28px', background: '#E5E0D8', borderRadius: '6px', marginBottom: '0.5rem' }} />
        <div style={{ width: '300px', height: '16px', background: '#E5E0D8', borderRadius: '6px', marginBottom: '1.5rem' }} />
        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #E5E0D8', overflow: 'hidden' }}>
          <div style={{ padding: '0.8rem 1rem', background: '#F8F6F2', borderBottom: '1px solid #E5E0D8', display: 'flex', gap: '2rem' }}>
            {[1,2,3,4].map(i => <div key={i} style={{ width: '80px', height: '12px', background: '#E5E0D8', borderRadius: '6px' }} />)}
          </div>
          {[1,2,3,4,5].map(i => (
            <div key={i} style={{ padding: '0.8rem 1rem', borderBottom: '1px solid #F0EDE8', display: 'flex', gap: '2rem', animation: 'pulse 1.5s infinite' }}>
              <div style={{ width: '100px', height: '14px', background: '#E5E0D8', borderRadius: '6px' }} />
              <div style={{ width: '200px', height: '14px', background: '#E5E0D8', borderRadius: '6px' }} />
              <div style={{ width: '120px', height: '14px', background: '#E5E0D8', borderRadius: '6px' }} />
              <div style={{ width: '80px', height: '14px', background: '#E5E0D8', borderRadius: '6px' }} />
            </div>
          ))}
        </div>
        <style>{`@keyframes pulse { 0% { opacity: 0.6; } 50% { opacity: 1; } 100% { opacity: 0.6; } }`}</style>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto', textAlign: 'center' }}>
        <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '12px', padding: '2rem', color: '#991B1B' }}>
          <span style={{ fontSize: '2rem', display: 'block', marginBottom: '0.5rem' }}>⚠️</span>
          <p style={{ fontSize: '1rem' }}>{error}</p>
          <button onClick={() => window.location.reload()} style={{ marginTop: '1rem', padding: '0.5rem 1.5rem', background: '#D4A52A', color: '#0F2B4A', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>Retry</button>
        </div>
      </div>
    )
  }

  // ─── Main Render ───
  return (
    <div style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto', color: 'var(--color-text)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '0.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '700', margin: 0, color: 'var(--color-text)' }}>
            📜 Activity Logs
          </h1>
          <p style={{ color: 'var(--color-text-muted)', margin: '0.2rem 0 0', fontSize: '0.9rem' }}>
            Monitor all actions taken in your business
          </p>
        </div>
        <div style={{ background: 'var(--color-card)', padding: '0.3rem 1rem', borderRadius: '20px', border: '1px solid var(--color-border)', fontSize: '0.8rem' }}>
          {userRole === 'Owner' ? '👑 Owner' : '🛠️ Manager'}
        </div>
      </div>

      <div style={{
        background: 'var(--color-card)',
        border: '1px solid var(--color-border)',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(15,43,74,0.04)'
      }}>
        {logs.length === 0 ? (
          <div style={{ padding: '3rem 2rem', textAlign: 'center' }}>
            <span style={{ fontSize: '3rem', display: 'block', marginBottom: '0.5rem' }}>📭</span>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: 'var(--color-text)', margin: '0 0 0.3rem' }}>No activity yet</h3>
            <p style={{ color: 'var(--color-text-muted)', margin: 0, fontSize: '0.9rem' }}>
              Actions like invites, role changes, and member removals will appear here.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
              <thead style={{ background: 'var(--color-bg)', borderBottom: '2px solid var(--color-border)' }}>
                <tr>
                  <th style={{ padding: '0.8rem 1rem', textAlign: 'left', fontWeight: '600', color: 'var(--color-text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Action</th>
                  <th style={{ padding: '0.8rem 1rem', textAlign: 'left', fontWeight: '600', color: 'var(--color-text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Details</th>
                  <th style={{ padding: '0.8rem 1rem', textAlign: 'left', fontWeight: '600', color: 'var(--color-text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.3px' }}>User</th>
                  <th style={{ padding: '0.8rem 1rem', textAlign: 'right', fontWeight: '600', color: 'var(--color-text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Time</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const style = getActionStyle(log.action)
                  let details = '—'
                  try {
                    if (log.details) {
                      const parsed = typeof log.details === 'object' ? log.details : JSON.parse(log.details)
                      details = Object.entries(parsed).map(([k, v]) => `${k}: ${v}`).join(', ')
                    }
                  } catch (e) {
                    details = String(log.details || '—')
                  }
                  return (
                    <tr key={log.id} style={{ borderBottom: '1px solid var(--color-border)', transition: 'background 0.15s' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-bg)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '0.8rem 1rem' }}>
                        <span style={{
                          background: style.bg,
                          color: style.color,
                          padding: '0.2rem 0.8rem',
                          borderRadius: '20px',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          whiteSpace: 'nowrap'
                        }}>
                          <span>{style.icon}</span> {style.label}
                        </span>
                      </td>
                      <td style={{ padding: '0.8rem 1rem', fontSize: '0.85rem', color: 'var(--color-text-muted)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {details}
                      </td>
                      <td style={{ padding: '0.8rem 1rem', fontSize: '0.8rem' }}>
                        {log.performed_by ? (
                          <span style={{ fontFamily: 'monospace', fontSize: '0.7rem', background: 'var(--color-bg)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                            {log.performed_by.slice(0, 8)}
                          </span>
                        ) : 'system'}
                      </td>
                      <td style={{ padding: '0.8rem 1rem', textAlign: 'right', fontSize: '0.7rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                        {formatDate(log.created_at)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <style>{`
        @media (max-width: 640px) {
          .activity-table th, .activity-table td {
            padding: 0.5rem 0.6rem;
            font-size: 0.7rem;
          }
        }
      `}</style>
    </div>
  )
                           }
