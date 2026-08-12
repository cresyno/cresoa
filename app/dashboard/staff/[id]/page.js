'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { supabase } from '../../../../lib/supabaseClient'
import { getCurrentBusinessId } from '../../../../lib/getBusinessId'
import { Icon } from '../../../../components/Icon'
import { Card } from '../../../../components/Card'
import { SectionHeader } from '../../../../components/SectionHeader'
import { StatusPill } from '../../../../components/StatusPill'
import { Navigation } from '../../../../components/Navigation'
import '../../../globals.css'

// Default permissions based on role
const DEFAULT_PERMISSIONS = {
  Staff: {
    orders_view: true,
    orders_edit: false,
    customers_view: true,
    customers_edit: false,
    production_update: true,
    payments_view: false,
    payments_record: false,
    team_invite: false,
    team_manage: false,
  },
  Manager: {
    orders_view: true,
    orders_edit: true,
    customers_view: true,
    customers_edit: true,
    production_update: true,
    payments_view: true,
    payments_record: true,
    team_invite: false,
    team_manage: false,
  },
  Owner: {
    orders_view: true,
    orders_edit: true,
    customers_view: true,
    customers_edit: true,
    production_update: true,
    payments_view: true,
    payments_record: true,
    team_invite: true,
    team_manage: true,
  },
}

const PERMISSION_LABELS = {
  orders_view: 'View Orders',
  orders_edit: 'Edit Orders',
  customers_view: 'View Customers',
  customers_edit: 'Edit Customers',
  production_update: 'Update Production',
  payments_view: 'View Payments',
  payments_record: 'Record Payments',
  team_invite: 'Invite Team Members',
  team_manage: 'Manage Team',
}

function formatDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function StaffDetailPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const memberId = params?.id
  const businessId = getCurrentBusinessId() || searchParams.get('business_id')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [member, setMember] = useState(null)
  const [currentUserRole, setCurrentUserRole] = useState('')
  const [currentUserId, setCurrentUserId] = useState(null)

  // ─── Form state ───
  const [role, setRole] = useState('Staff')
  const [permissions, setPermissions] = useState({})
  const [status, setStatus] = useState('active')
  const [originalRole, setOriginalRole] = useState('')
  const [originalPermissions, setOriginalPermissions] = useState({})
  const [originalStatus, setOriginalStatus] = useState('')

  // ─── Load member data ─────────────────────────────────────
  useEffect(() => {
    const loadMember = async () => {
      if (!memberId || !businessId) return
      setLoading(true)
      setError('')

      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) { router.push('/login'); return }

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { router.push('/login'); return }
        setCurrentUserId(user.id)

        // Get current user's role
        const { data: myMembership } = await supabase
          .from('business_memberships')
          .select('role')
          .eq('business_id', businessId)
          .eq('user_id', user.id)
          .single()
        setCurrentUserRole(myMembership?.role || '')

        // Fetch member details
        const response = await fetch(`/api/team/members?business_id=${businessId}`, {
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        })
        const result = await response.json()
        if (!response.ok) throw new Error(result.error || 'Failed to load member')

        const found = (result.members || []).find(m => m.id === memberId)
        if (!found) throw new Error('Member not found')

        // Fetch status and permissions from membership
        const { data: membershipData } = await supabase
          .from('business_memberships')
          .select('status, permissions')
          .eq('id', memberId)
          .single()

        const memberWithData = {
          ...found,
          status: membershipData?.status || 'active',
          permissions: membershipData?.permissions || {},
        }

        setMember(memberWithData)
        setRole(memberWithData.role)
        setStatus(memberWithData.status)
        setPermissions(memberWithData.permissions || {})
        setOriginalRole(memberWithData.role)
        setOriginalStatus(memberWithData.status)
        setOriginalPermissions(memberWithData.permissions || {})

      } catch (err) {
        console.error('Load member error:', err)
        setError(err.message || 'Could not load member details.')
      } finally {
        setLoading(false)
      }
    }

    loadMember()
  }, [memberId, businessId, router])

  // ─── Handlers ─────────────────────────────────────────────
  const handleRoleChange = (newRole) => {
    if (member?.role === 'Owner' && currentUserRole !== 'Owner') return
    setRole(newRole)
    // Reset permissions to default for the new role if not Owner
    if (newRole !== 'Owner' && DEFAULT_PERMISSIONS[newRole]) {
      setPermissions({ ...DEFAULT_PERMISSIONS[newRole] })
    }
  }

  const handlePermissionToggle = (key) => {
    // Owner can't be changed
    if (role === 'Owner') return
    setPermissions(prev => ({
      ...prev,
      [key]: !prev[key],
    }))
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      // Only allow role change if not Owner or user is Owner
      if (member?.role === 'Owner' && currentUserRole !== 'Owner') {
        setError('Only the Owner can change the Owner role.')
        setSaving(false)
        return
      }

      const response = await fetch(`/api/team/members/${memberId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          role,
          permissions,
        })
      })

      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.error || 'Failed to update member')
      }

      // Update status separately if changed
      if (status !== originalStatus) {
        const { error: statusError } = await supabase
          .from('business_memberships')
          .update({ status })
          .eq('id', memberId)
        if (statusError) throw statusError
      }

      setOriginalRole(role)
      setOriginalPermissions(permissions)
      setOriginalStatus(status)
      setMember(prev => ({ ...prev, role, permissions, status }))
      alert('Changes saved successfully!')

    } catch (err) {
      console.error('Save error:', err)
      setError(err.message || 'Failed to save changes.')
    } finally {
      setSaving(false)
    }
  }

  const handleRemove = async () => {
    if (!confirm('Suspend this member? They will be moved to suspended list.')) return
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch(`/api/team/members/${memberId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      })
      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || 'Failed to remove member')
      }
      router.push(`/dashboard/staff?business_id=${businessId}`)
    } catch (err) {
      alert('Error: ' + err.message)
    }
  }

  const handleDeletePermanent = async () => {
    if (!confirm('Permanently delete this member? This action cannot be undone.')) return
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch(`/api/team/members/${memberId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      })
      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || 'Failed to delete member')
      }
      router.push(`/dashboard/staff?business_id=${businessId}`)
    } catch (err) {
      alert('Error: ' + err.message)
    }
  }

  // ─── Loading / Error ──────────────────────────────────────
  if (loading) {
    return (
      <div style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto', paddingBottom: '80px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div style={{ width: '140px', height: '24px', background: 'var(--cresoa-border)', borderRadius: '6px' }} />
          <div style={{ width: '100px', height: '32px', background: 'var(--cresoa-border)', borderRadius: '6px' }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {[1,2,3].map(i => (
            <div key={i} style={{ background: 'var(--cresoa-surface)', padding: '0.8rem 1rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', animation: 'pulse 1.5s infinite' }}>
              <div style={{ width: '60%', height: '16px', background: 'var(--cresoa-border)', borderRadius: '6px' }} />
              <div style={{ width: '40%', height: '12px', background: 'var(--cresoa-border)', borderRadius: '6px', marginTop: '0.3rem' }} />
            </div>
          ))}
        </div>
        <style>{`@keyframes pulse { 0% { opacity: 0.6; } 50% { opacity: 1; } 100% { opacity: 0.6; } }`}</style>
        <Navigation businessId={businessId} />
      </div>
    )
  }

  if (error || !member) {
    return (
      <div style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto', paddingBottom: '80px' }}>
        <Card style={{ padding: '2rem', textAlign: 'center' }}>
          <Icon name="alert-circle" size={32} stroke="var(--cresoa-danger)" />
          <h2 style={{ margin: '0.5rem 0' }}>Couldn't load member</h2>
          <p style={{ color: 'var(--cresoa-text-muted)' }}>{error || 'Member not found'}</p>
          <button onClick={() => router.push(`/dashboard/staff?business_id=${businessId}`)} className="cresoa-primary-button" style={{ marginTop: '1rem' }}>Back to team</button>
        </Card>
        <Navigation businessId={businessId} />
      </div>
    )
  }

  const isOwner = member.role === 'Owner'
  const isCurrentUser = member.user_id === currentUserId
  const canManage = currentUserRole === 'Owner' || currentUserRole === 'Manager'
  const canChangeRole = canManage && !isOwner
  const canChangePermissions = canManage && !isOwner
  const canSuspend = canManage && !isOwner && !isCurrentUser
  const canDeletePermanent = canManage && member.status === 'suspended'

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto', paddingBottom: '80px' }}>
      <Navigation businessId={businessId} />

      <button
        onClick={() => router.push(`/dashboard/staff?business_id=${businessId}`)}
        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cresoa-text-muted)', fontSize: '0.85rem', marginBottom: '0.5rem' }}
      >
        <Icon name="arrow-left" size={16} stroke="currentColor" /> Team
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1rem' }}>
        <span className="cresoa-avatar" style={{ width: '56px', height: '56px', fontSize: '20px' }}>
          {member.user?.full_name?.charAt(0) || member.user?.email?.charAt(0) || '?'}
        </span>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0, color: 'var(--cresoa-text)' }}>
            {member.user?.full_name || member.user?.email || 'Unknown'}
          </h1>
          <p style={{ color: 'var(--cresoa-text-muted)', margin: '0.1rem 0 0' }}>{member.user?.email || 'No email'}</p>
          {isCurrentUser && <span style={{ fontSize: '0.7rem', color: 'var(--cresoa-text-muted)', fontWeight: 600 }}>(You)</span>}
        </div>
        {isOwner && <StatusPill status="Owner" />}
        {member.status === 'suspended' && <StatusPill status="Suspended" />}
      </div>

      {/* Role */}
      <Card style={{ padding: '1rem', marginBottom: '1rem' }}>
        <SectionHeader title="Role" />
        {isOwner ? (
          <div style={{ padding: '0.3rem 0', fontWeight: 600, color: 'var(--cresoa-text)' }}>Owner (full access)</div>
        ) : canChangeRole ? (
          <select
            value={role}
            onChange={e => handleRoleChange(e.target.value)}
            style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-surface)', color: 'var(--cresoa-text)', fontSize: '0.9rem' }}
          >
            <option value="Staff">Staff</option>
            <option value="Manager">Manager</option>
          </select>
        ) : (
          <div style={{ padding: '0.3rem 0', fontWeight: 600 }}>{role}</div>
        )}
      </Card>

      {/* Permissions */}
      {canChangePermissions && (
        <Card style={{ padding: '1rem', marginBottom: '1rem' }}>
          <SectionHeader title="Permissions" subtitle={`Based on ${role} role`} />
          <div style={{ display: 'grid', gap: '0.3rem' }}>
            {Object.entries(PERMISSION_LABELS).map(([key, label]) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.2rem 0' }}>
                <input
                  type="checkbox"
                  checked={permissions[key] === true}
                  onChange={() => handlePermissionToggle(key)}
                  style={{ width: '18px', height: '18px' }}
                />
                <label style={{ fontSize: '0.9rem', cursor: 'pointer' }}>{label}</label>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Account Info */}
      <Card style={{ padding: '1rem', marginBottom: '1rem' }}>
        <SectionHeader title="Account" />
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.3rem 0', borderBottom: '1px solid var(--cresoa-border)' }}>
          <span style={{ color: 'var(--cresoa-text-muted)' }}>Joined</span>
          <span>{formatDate(member.joined_at)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.3rem 0' }}>
          <span style={{ color: 'var(--cresoa-text-muted)' }}>Status</span>
          <span>{member.status === 'active' ? 'Active' : 'Suspended'}</span>
        </div>
        {canSuspend && (
          <button onClick={handleRemove} style={{ marginTop: '0.5rem', padding: '0.4rem 1rem', borderRadius: '6px', border: '1px solid var(--cresoa-danger)', background: 'transparent', cursor: 'pointer', color: 'var(--cresoa-danger)', fontSize: '0.85rem' }}>
            Suspend member
          </button>
        )}
        {canDeletePermanent && (
          <button onClick={handleDeletePermanent} style={{ marginTop: '0.5rem', padding: '0.4rem 1rem', borderRadius: '6px', border: '1px solid var(--cresoa-danger)', background: 'var(--cresoa-danger)', color: '#fff', cursor: 'pointer', fontSize: '0.85rem' }}>
            Delete permanently
          </button>
        )}
      </Card>

      {/* Save Button */}
      {(role !== originalRole || JSON.stringify(permissions) !== JSON.stringify(originalPermissions) || status !== originalStatus) && (
        <button
          onClick={handleSave}
          disabled={saving}
          className="cresoa-primary-button"
          style={{ width: '100%', justifyContent: 'center', padding: '0.8rem' }}
        >
          {saving ? 'Saving...' : 'Save changes'}
        </button>
      )}

      {error && (
        <p style={{ color: 'var(--cresoa-danger)', fontSize: '0.85rem', marginTop: '0.5rem' }}>{error}</p>
      )}

      <div style={{ marginTop: '2rem' }}>
        <Navigation businessId={businessId} />
      </div>
    </div>
  )
                                   }
