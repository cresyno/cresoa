'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'
import { supabaseAdmin } from '../../lib/supabaseAdmin'
import { getCurrentBusinessId } from '../../lib/getBusinessId'

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

        // Fetch logs using admin client to bypass RLS
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

  // ─── Loading Skeleton ───
  if (loading) {
    return (
      <div style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ width: '180px', height: '24px', background: '#E5E0D8', borderRadius: '6px', marginBottom: '1rem' }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {[1,2,3,4,5].map(i => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', background: '#fff', padding: '0.8rem 1rem', borderRadius: '8px', boxShadow: '0 2px 8px rgba(15,43,74,0.04)', animation: 'pulse 1.5s infinite' }}>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#E5E0D8' }} />
                <div><div style={{ width: '120px', height: '10px', background: '#E5E0D8', borderRadius: '6px', marginBottom: '4px' }} /><div style={{ width: '80px', height: '8px', background: '#E5E0D8', borderRadius: '6px' }} /></div>
              </div>
              <div style={{ width: '80px', height: '8px', background: '#E5E0D8', borderRadius: '6px' }} />
            </div>
          ))}
        </div>
        <style>{`@keyframes pulse { 0% { opacity: 0.6; } 50% { opacity: 1; } 100% { opacity: 0.6; } }`}</style>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto', textAlign: 'center', color: '#D9534F' }}>
        <p>{error}</p>
        <button onClick={() => window.location.reload()} style={{ marginTop: '0.5rem', padding: '0.5rem 1.5rem', background: '#D4A52A', color: '#0F2B4A', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Retry</button>
      </div>
    )
  }

  // ─── Main Render ───
  return (
    <div style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto', color: 'var(--color-text)' }}>
      <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '0.5rem' }}>📜 Activity Logs</h2>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>
        Monitor all actions taken in your business.
      </p>

      <div style={{
        background: 'var(--color-card)',
        border: '1px solid var(--color-border)',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-sm)'
      }}>
        {logs.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            <span style={{ fontSize: '3rem', display: 'block', marginBottom: '0.5rem' }}>📭</span>
            <p>No activity logs yet.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
              <thead style={{ background: 'var(--color-bg)', borderBottom: '1px solid var(--color-border)' }}>
                <tr>
                  <th style={{ padding: '0.8rem 1rem', textAlign: 'left', fontWeight: '600', color: 'var(--color-text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Action</th>
                  <th style={{ padding: '0.8rem 1rem', textAlign: 'left', fontWeight: '600', color: 'var(--color-text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Details</th>
                  <th style={{ padding: '0.8rem 1rem', textAlign: 'left', fontWeight: '600', color: 'var(--color-text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>User</th>
                  <th style={{ padding: '0.8rem 1rem', textAlign: 'right', fontWeight: '600', color: 'var(--color-text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Time</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const actionLabel = log.action?.replace(/_/g, ' ') || 'Unknown'
                  const details = log.details ? JSON.stringify(log.details) : '—'
                  return (
                    <tr key={log.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '0.8rem 1rem', fontWeight: '500', fontSize: '0.85rem' }}>
                        <span style={{
                          background: log.action?.includes('invite') ? '#F6E9C8' :
                            log.action?.includes('role') ? '#D6E0EB' :
                            log.action?.includes('remove') ? '#F1DBD3' :
                            '#E8E0D5',
                          color: '#0F2B4A',
                          padding: '0.15rem 0.6rem',
                          borderRadius: '12px',
                          fontSize: '0.7rem',
                          fontWeight: '600'
                        }}>
                          {actionLabel}
                        </span>
                      </td>
                      <td style={{ padding: '0.8rem 1rem', fontSize: '0.8rem', color: 'var(--color-text-muted)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {details}
                      </td>
                      <td style={{ padding: '0.8rem 1rem', fontSize: '0.8rem' }}>
                        {log.performed_by ? 'User ID: ' + log.performed_by.slice(0,8) : 'system'}
                      </td>
                      <td style={{ padding: '0.8rem 1rem', textAlign: 'right', fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                        {log.created_at ? new Date(log.created_at).toLocaleString() : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
      }
