'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../../lib/supabaseClient'
import { getCurrentBusinessId } from '../../../lib/getBusinessId'
import { Icon } from '../../../components/Icon'
import { Card } from '../../../components/Card'
import { SectionHeader } from '../../../components/SectionHeader'
import { StatusPill } from '../../../components/StatusPill'
import { Navigation } from '../../../components/Navigation'
import '../../globals.css'

function getInitials(name) {
  if (!name) return '?'
  const parts = name.trim().split(' ')
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
  return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase()
}

function formatDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function StaffPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const businessId = getCurrentBusinessId() || searchParams.get('business_id')

  const [members, setMembers] = useState([])
  const [invites, setInvites] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [userRole, setUserRole] = useState('')
  const [currentUserId, setCurrentUserId] = useState(null)

  // ─── Filters ──────────────────────────────────────────────
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  // ─── Modals ──────────────────────────────────────────────
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [showPendingModal, setShowPendingModal] = useState(false)
  const [showSuspendedModal, setShowSuspendedModal] = useState(false)

  // ─── Invite form ─────────────────────────────────────────
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('Staff')
  const [sendEmail, setSendEmail] = useState(true)
  const [inviting, setInviting] = useState(false)
  const [inviteMessage, setInviteMessage] = useState('')
  const [generatedCode, setGeneratedCode] = useState('')
  const [lastGeneratedEmail, setLastGeneratedEmail] = useState('')

  // ─── Load data ────────────────────────────────────────────
  const loadData = async () => {
    if (!businessId) return
    setLoading(true)
    setError('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setCurrentUserId(user.id)

      // Get user's role
      const { data: myMembership } = await supabase
        .from('business_memberships')
        .select('role')
        .eq('business_id', businessId)
        .eq('user_id', user.id)
        .single()
      setUserRole(myMembership?.role || '')

      // ─── Fetch members via API ──────────────────────────
      const response = await fetch(`/api/team/members?business_id=${businessId}`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      })
      const result = await response.json()
      if (response.ok) {
        // Add status from direct query
        const membersWithStatus = await Promise.all((result.members || []).map(async (m) => {
          const { data: membership } = await supabase
            .from('business_memberships')
            .select('status, permissions')
            .eq('id', m.id)
            .single()
          return { ...m, status: membership?.status || 'active', permissions: membership?.permissions || {} }
        }))
        setMembers(membersWithStatus)
      } else {
        setError(result.error || 'Failed to load members')
      }

      // ─── Fetch pending invites directly ──────────────────
      const { data: invitesData, error: invitesError } = await supabase
        .from('business_invites')
        .select('*')
        .eq('business_id', businessId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
      if (!invitesError) setInvites(invitesData || [])
    } catch (err) {
      console.error('Load staff error:', err)
      setError('Could not load team data.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [businessId])

  // ─── Computed stats ──────────────────────────────────────
  const activeMembers = useMemo(() => members.filter(m => m.status === 'active'), [members])
  const suspendedMembers = useMemo(() => members.filter(m => m.status === 'suspended'), [members])
  const pendingInvites = useMemo(() => invites.filter(i => i.status === 'pending'), [invites])

  const filteredMembers = useMemo(() => {
    let result = activeMembers
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(m =>
        (m.user?.email || '').toLowerCase().includes(q) ||
        (m.user?.full_name || '').toLowerCase().includes(q)
      )
    }
    if (roleFilter !== 'all') {
      result = result.filter(m => m.role === roleFilter)
    }
    return result
  }, [activeMembers, search, roleFilter])

  // ─── Invite handlers ──────────────────────────────────────
  const handleInvite = async (e) => {
    e.preventDefault()
    setInviting(true)
    setInviteMessage('')
    setGeneratedCode('')
    setLastGeneratedEmail('')

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      const response = await fetch('/api/team/invites/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          business_id: businessId,
          email: inviteEmail,
          role: inviteRole,
          send_email: sendEmail
        })
      })

      const result = await response.json()
      if (response.ok) {
        const code = result.invite?.invite_code || ''
        setGeneratedCode(code)
        setLastGeneratedEmail(inviteEmail)
        setInviteMessage('✅ Invite code generated successfully!')
        setInviteEmail('')
        // Refresh invites
        await loadData()
      } else {
        setInviteMessage('❌ ' + (result.error || 'Failed to generate invite'))
      }
    } catch (err) {
      setInviteMessage('❌ An unexpected error occurred')
      console.error(err)
    } finally {
      setInviting(false)
    }
  }

  const handleCancelInvite = async (inviteId) => {
    if (!confirm('Cancel this invitation? The code will no longer work.')) return
    try {
      const { error } = await supabase
        .from('business_invites')
        .delete()
        .eq('id', inviteId)
      if (error) throw error
      await loadData()
    } catch (err) {
      alert('Could not cancel invite.')
    }
  }

  const handleResendInvite = async (invite) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch('/api/team/invites/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          business_id: businessId,
          email: invite.email,
          role: invite.role,
          send_email: sendEmail
        })
      })
      if (response.ok) {
        await loadData()
        alert('New invitation sent!')
      } else {
        alert('Failed to resend invite.')
      }
    } catch (err) {
      alert('Could not resend invite.')
    }
  }

  const handleDeletePermanent = async (memberId) => {
    if (!confirm('Permanently delete this member? This action cannot be undone.')) return
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch(`/api/team/members/${memberId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      })
      if (response.ok) {
        await loadData()
      } else {
        alert('Failed to delete member.')
      }
    } catch (err) {
      alert('Could not delete member.')
    }
  }

  const handleManage = (memberId) => {
    router.push(`/dashboard/staff/${memberId}?business_id=${businessId}`)
  }

  const shareOnWhatsApp = () => {
    if (!generatedCode) return
    const url = `https://wa.me/?text=🎉%20You%20have%20been%20invited%20to%20join%20our%20business%20on%20Cresoa!%0A%0AUse%20this%20code%20to%20join:%20*${generatedCode}*%0A%0A👉%20Go%20to%20${window.location.origin}/accept-invite%20to%20accept%20the%20invite.`
    window.open(url, '_blank')
  }

  const copyCode = () => {
    navigator.clipboard?.writeText(generatedCode)
    alert('Code copied!')
  }

  // ─── Loading skeleton ────────────────────────────────────
  if (loading) {
    return (
      <div style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto', paddingBottom: '80px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div style={{ width: '140px', height: '24px', background: 'var(--cresoa-border)', borderRadius: '6px' }} />
          <div style={{ width: '100px', height: '32px', background: 'var(--cresoa-border)', borderRadius: '6px' }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px,1fr))', gap: '0.8rem', marginBottom: '1rem' }}>
          {[1,2].map(i => (
            <div key={i} style={{ background: 'var(--cresoa-surface)', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', animation: 'pulse 1.5s infinite' }}>
              <div style={{ width: '40%', height: '12px', background: 'var(--cresoa-border)', borderRadius: '6px' }} />
              <div style={{ width: '60%', height: '20px', background: 'var(--cresoa-border)', borderRadius: '6px', marginTop: '0.3rem' }} />
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {[1,2,3].map(i => (
            <div key={i} style={{ background: 'var(--cresoa-surface)', padding: '0.8rem 1rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', animation: 'pulse 1.5s infinite' }}>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--cresoa-border)' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ width: '60%', height: '16px', background: 'var(--cresoa-border)', borderRadius: '6px' }} />
                  <div style={{ width: '40%', height: '12px', background: 'var(--cresoa-border)', borderRadius: '6px', marginTop: '0.3rem' }} />
                </div>
              </div>
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
          <h2 style={{ margin: '0.5rem 0' }}>Couldn't load team</h2>
          <p style={{ color: 'var(--cresoa-text-muted)' }}>{error}</p>
          <button onClick={loadData} className="cresoa-primary-button" style={{ marginTop: '1rem' }}>Try again</button>
        </Card>
        <Navigation businessId={businessId} />
      </div>
    )
  }

  const canManage = userRole === 'Owner' || userRole === 'Manager'

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto', paddingBottom: '80px' }}>
      <Navigation businessId={businessId} />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <div>
          <p style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', margin: 0 }}>Team</p>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0.2rem 0', color: 'var(--cresoa-text)' }}>Team & Staff</h1>
          <p style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.85rem', margin: 0 }}>Manage your team members</p>
        </div>
        {canManage && (
          <button onClick={() => setShowInviteModal(true)} className="cresoa-primary-button">
            <Icon name="plus" size={14} stroke="#fff" style={{ marginRight: '0.3rem' }} /> Invite member
          </button>
        )}
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px,1fr))', gap: '0.5rem', marginBottom: '1rem' }}>
        <Card style={{ padding: '0.6rem 0.8rem', textAlign: 'center' }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--cresoa-text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Members</div>
          <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{activeMembers.length}</div>
        </Card>
        <Card style={{ padding: '0.6rem 0.8rem', textAlign: 'center', borderColor: userRole === 'Owner' ? 'var(--cresoa-accent)' : 'var(--cresoa-border)' }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--cresoa-text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Your Role</div>
          <div style={{ fontWeight: 700, fontSize: '1.1rem', color: userRole === 'Owner' ? 'var(--cresoa-accent)' : 'var(--cresoa-text)' }}>{userRole || '—'}</div>
        </Card>
      </div>

      {/* Search & Filters */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        <div style={{ flex: '1 1 200px', display: 'flex', alignItems: 'center', gap: '8px', height: '40px', padding: '0 12px', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-bg)' }}>
          <Icon name="search" size={16} stroke="var(--cresoa-text-muted)" />
          <input
            type="text"
            placeholder="Search team members..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ flex: 1, border: 0, outline: 'none', background: 'transparent', color: 'var(--cresoa-text)', fontSize: '0.85rem' }}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer', color: 'var(--cresoa-text-muted)' }}>
              <Icon name="x" size={16} stroke="currentColor" />
            </button>
          )}
        </div>
        <select
          value={roleFilter}
          onChange={e => setRoleFilter(e.target.value)}
          style={{ padding: '0.4rem 0.8rem', borderRadius: '6px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-bg)', color: 'var(--cresoa-text)', fontSize: '0.85rem' }}
        >
          <option value="all">All roles</option>
          <option value="Owner">Owner</option>
          <option value="Manager">Manager</option>
          <option value="Staff">Staff</option>
        </select>
      </div>

      {/* Active Members */}
      <SectionHeader title={`Team Members (${filteredMembers.length})`} />

      {filteredMembers.length === 0 ? (
  <Card style={{ padding: '2rem', textAlign: 'center' }}>
    <Icon name="users" size={32} stroke="var(--cresoa-text-muted)" />
    <h3 style={{ margin: '0.5rem 0 0.2rem' }}>No members found</h3>
    <p style={{ color: 'var(--cresoa-text-muted)' }}>
      {search ? 'Try a different search term.' : 'Invite your first team member to get started.'}
    </p>
    {!search && (
      <button onClick={() => setShowInviteModal(true)} className="cresoa-primary-button" style={{ marginTop: '0.5rem' }}>
        <Icon name="plus" size={14} stroke="#fff" style={{ marginRight: '0.3rem' }} /> Invite member
      </button>
  </Card>
) : ( ... )}
    
        <div style={{ display: 'grid', gap: '0.5rem' }}>
          {filteredMembers.map((member) => {
            const name = member.user?.full_name || member.user?.email || 'Unknown'
            const email = member.user?.email || 'No email'
            const isOwner = member.role === 'Owner'
            const isCurrentUser = member.user_id === currentUserId

            return (
              <Card key={member.id} style={{ padding: '0.8rem 1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                    <span className="cresoa-avatar" style={{ width: '40px', height: '40px', fontSize: '14px' }}>{getInitials(name)}</span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--cresoa-text)' }}>{name}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--cresoa-text-muted)' }}>
                        {email} · {member.role}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--cresoa-text-muted)', marginTop: '0.1rem' }}>
                        Joined {formatDate(member.joined_at)}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {isOwner && <StatusPill status="Owner" />}
                    {isCurrentUser && <span style={{ fontSize: '0.6rem', color: 'var(--cresoa-text-muted)', fontWeight: 600 }}>(You)</span>}
                    <button
                      onClick={() => handleManage(member.id)}
                      style={{ padding: '0.2rem 0.8rem', borderRadius: '6px', border: '1px solid var(--cresoa-border)', background: 'transparent', cursor: 'pointer', fontSize: '0.75rem' }}
                    >
                      Manage →
                    </button>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Pending Invitations */}
      {pendingInvites.length > 0 && (
        <>
          <SectionHeader title="Pending Invitations" action={pendingInvites.length > 5 ? `View all (${pendingInvites.length})` : ''} onAction={pendingInvites.length > 5 ? () => setShowPendingModal(true) : null} />
          <div style={{ display: 'grid', gap: '0.5rem' }}>
            {pendingInvites.slice(0, 5).map((invite) => (
              <Card key={invite.id} style={{ padding: '0.6rem 1rem', background: 'var(--cresoa-accent-soft)', borderColor: 'var(--cresoa-accent)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{invite.email}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--cresoa-text-muted)' }}>
                      {invite.role} · Sent {formatDate(invite.created_at)}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.3rem' }}>
                    <StatusPill status="Pending" />
                    <button onClick={() => handleResendInvite(invite)} style={{ padding: '0.1rem 0.5rem', borderRadius: '4px', border: '1px solid var(--cresoa-border)', background: 'transparent', cursor: 'pointer', fontSize: '0.65rem' }}>Resend</button>
                    <button onClick={() => handleCancelInvite(invite.id)} style={{ padding: '0.1rem 0.5rem', borderRadius: '4px', border: '1px solid var(--cresoa-danger)', background: 'transparent', cursor: 'pointer', fontSize: '0.65rem', color: 'var(--cresoa-danger)' }}>Cancel</button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Suspended Members */}
      {suspendedMembers.length > 0 && (
        <>
          <SectionHeader title="Suspended Members" action={suspendedMembers.length > 5 ? `View all (${suspendedMembers.length})` : ''} onAction={suspendedMembers.length > 5 ? () => setShowSuspendedModal(true) : null} />
          <div style={{ display: 'grid', gap: '0.5rem' }}>
            {suspendedMembers.slice(0, 5).map((member) => {
              const name = member.user?.full_name || member.user?.email || 'Unknown'
              return (
                <Card key={member.id} style={{ padding: '0.6rem 1rem', borderColor: 'var(--cresoa-danger)', background: 'var(--cresoa-danger-soft)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--cresoa-text-muted)' }}>{member.role} · Suspended</div>
                    </div>
                    <button
                      onClick={() => handleDeletePermanent(member.id)}
                      style={{ padding: '0.2rem 0.8rem', borderRadius: '4px', border: '1px solid var(--cresoa-danger)', background: 'transparent', cursor: 'pointer', fontSize: '0.7rem', color: 'var(--cresoa-danger)' }}
                    >
                      Delete permanently
                    </button>
                  </div>
                </Card>
              )
            })}
          </div>
        </>
      )}

      {/* ─── Invite Modal ───────────────────────────────────── */}
      {showInviteModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', background: 'rgba(10,22,40,0.5)' }} onMouseDown={() => { if (!inviting) setShowInviteModal(false) }}>
          <div style={{ width: '100%', maxWidth: '500px', maxHeight: 'calc(100vh - 32px)', overflowY: 'auto', padding: '20px', background: 'var(--cresoa-surface)', borderRadius: '16px', boxShadow: 'var(--shadow-lg)' }} onMouseDown={e => e.stopPropagation()}>

            {generatedCode ? (
              // ─── Success state ────────────────────────────
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                  <h2 style={{ fontSize: '1.2rem', margin: 0, color: 'var(--cresoa-success)' }}>✅ Invitation created</h2>
                  <button onClick={() => { setShowInviteModal(false); setGeneratedCode(''); setInviteMessage('') }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cresoa-text-muted)' }}>
                    <Icon name="x" size={20} stroke="currentColor" />
                  </button>
                </div>
                <p style={{ color: 'var(--cresoa-text-muted)', marginBottom: '0.5rem' }}>Invite code for <strong>{lastGeneratedEmail}</strong></p>
                <div style={{ textAlign: 'center', padding: '0.8rem', background: 'var(--cresoa-bg)', borderRadius: '8px', border: '2px dashed var(--cresoa-accent)', marginBottom: '0.8rem' }}>
                  <span style={{ fontSize: '2rem', fontWeight: 700, letterSpacing: '0.3rem', fontFamily: 'monospace' }}>{generatedCode}</span>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '0.8rem' }}>
                  <button onClick={copyCode} style={{ padding: '0.4rem 1rem', borderRadius: '6px', border: '1px solid var(--cresoa-border)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <Icon name="copy" size={14} stroke="currentColor" /> Copy Code
                  </button>
                  <button onClick={shareOnWhatsApp} style={{ padding: '0.4rem 1rem', borderRadius: '6px', border: '1px solid #25D366', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#25D366' }}>
                    <Icon name="send" size={14} stroke="currentColor" /> Share on WhatsApp
                  </button>
                </div>
                <p style={{ fontSize: '0.7rem', color: 'var(--cresoa-text-muted)', textAlign: 'center' }}>Expires in 3 days · {window.location.origin}/accept-invite</p>
                <button onClick={() => { setShowInviteModal(false); setGeneratedCode(''); setInviteMessage('') }} className="cresoa-primary-button" style={{ width: '100%', justifyContent: 'center', marginTop: '0.5rem' }}>Done</button>
              </div>
            ) : (
              // ─── Form state ────────────────────────────────
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                  <div>
                    <h2 style={{ fontSize: '1.2rem', margin: 0 }}>Invite team member</h2>
                    <p style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.85rem', margin: '0.2rem 0 0' }}>Add someone to your business</p>
                  </div>
                  <button onClick={() => setShowInviteModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cresoa-text-muted)' }}>
                    <Icon name="x" size={20} stroke="currentColor" />
                  </button>
                </div>

                <form onSubmit={handleInvite}>
                  <div style={{ marginBottom: '0.8rem' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, marginBottom: '0.2rem' }}>Email address</label>
                    <input
                      type="email"
                      required
                      value={inviteEmail}
                      onChange={e => setInviteEmail(e.target.value)}
                      placeholder="name@example.com"
                      style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-surface)', color: 'var(--cresoa-text)' }}
                    />
                  </div>
                  <div style={{ marginBottom: '0.8rem' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, marginBottom: '0.2rem' }}>Role</label>
                    <select
                      value={inviteRole}
                      onChange={e => setInviteRole(e.target.value)}
                      style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-surface)', color: 'var(--cresoa-text)' }}
                    >
                      <option value="Staff">Staff</option>
                      <option value="Manager">Manager</option>
                    </select>
                  </div>
                  <div style={{ marginBottom: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input
                      type="checkbox"
                      checked={sendEmail}
                      onChange={e => setSendEmail(e.target.checked)}
                      id="sendEmail"
                      style={{ width: '18px', height: '18px' }}
                    />
                    <label htmlFor="sendEmail" style={{ fontSize: '0.8rem', fontWeight: 500 }}>Send invitation email</label>
                  </div>

                  {inviteMessage && (
                    <div style={{ fontSize: '0.85rem', marginBottom: '0.8rem', color: inviteMessage.includes('✅') ? 'var(--cresoa-success)' : 'var(--cresoa-danger)' }}>
                      {inviteMessage}
                    </div>
                  )}

                  <button type="submit" disabled={inviting} className="cresoa-primary-button" style={{ width: '100%', justifyContent: 'center' }}>
                    {inviting ? 'Generating...' : 'Generate Code'}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Pending Invitations Modal ────────────────────── */}
      {showPendingModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', background: 'rgba(10,22,40,0.5)' }} onMouseDown={() => setShowPendingModal(false)}>
          <div style={{ width: '100%', maxWidth: '500px', maxHeight: 'calc(100vh - 32px)', overflowY: 'auto', padding: '20px', background: 'var(--cresoa-surface)', borderRadius: '16px', boxShadow: 'var(--shadow-lg)' }} onMouseDown={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
              <h2 style={{ fontSize: '1.2rem', margin: 0 }}>Pending Invitations</h2>
              <button onClick={() => setShowPendingModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cresoa-text-muted)' }}>
                <Icon name="x" size={20} stroke="currentColor" />
              </button>
            </div>
            {pendingInvites.length === 0 ? (
              <p style={{ color: 'var(--cresoa-text-muted)' }}>No pending invitations.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {pendingInvites.map(invite => (
                  <Card key={invite.id} style={{ padding: '0.6rem 1rem', background: 'var(--cresoa-accent-soft)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.3rem' }}>
                      <div>
                        <div style={{ fontWeight: 600 }}>{invite.email}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--cresoa-text-muted)' }}>{invite.role} · Sent {formatDate(invite.created_at)}</div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.3rem' }}>
                        <StatusPill status="Pending" />
                        <button onClick={() => handleResendInvite(invite)} style={{ padding: '0.1rem 0.5rem', borderRadius: '4px', border: '1px solid var(--cresoa-border)', background: 'transparent', cursor: 'pointer', fontSize: '0.65rem' }}>Resend</button>
                        <button onClick={() => handleCancelInvite(invite.id)} style={{ padding: '0.1rem 0.5rem', borderRadius: '4px', border: '1px solid var(--cresoa-danger)', background: 'transparent', cursor: 'pointer', fontSize: '0.65rem', color: 'var(--cresoa-danger)' }}>Cancel</button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Suspended Members Modal ──────────────────────── */}
      {showSuspendedModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', background: 'rgba(10,22,40,0.5)' }} onMouseDown={() => setShowSuspendedModal(false)}>
          <div style={{ width: '100%', maxWidth: '500px', maxHeight: 'calc(100vh - 32px)', overflowY: 'auto', padding: '20px', background: 'var(--cresoa-surface)', borderRadius: '16px', boxShadow: 'var(--shadow-lg)' }} onMouseDown={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
              <h2 style={{ fontSize: '1.2rem', margin: 0 }}>Suspended Members</h2>
              <button onClick={() => setShowSuspendedModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cresoa-text-muted)' }}>
                <Icon name="x" size={20} stroke="currentColor" />
              </button>
            </div>
            {suspendedMembers.length === 0 ? (
              <p style={{ color: 'var(--cresoa-text-muted)' }}>No suspended members.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {suspendedMembers.map(member => {
                  const name = member.user?.full_name || member.user?.email || 'Unknown'
                  return (
                    <Card key={member.id} style={{ padding: '0.6rem 1rem', borderColor: 'var(--cresoa-danger)', background: 'var(--cresoa-danger-soft)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.3rem' }}>
                        <div>
                          <div style={{ fontWeight: 600 }}>{name}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--cresoa-text-muted)' }}>{member.role} · Suspended</div>
                        </div>
                        <button
                          onClick={() => handleDeletePermanent(member.id)}
                          style={{ padding: '0.2rem 0.8rem', borderRadius: '4px', border: '1px solid var(--cresoa-danger)', background: 'transparent', cursor: 'pointer', fontSize: '0.7rem', color: 'var(--cresoa-danger)' }}
                        >
                          Delete permanently
                        </button>
                      </div>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      <div style={{ marginTop: '2rem' }}>
        <Navigation businessId={businessId} />
      </div>
    </div>
  )
                     }
