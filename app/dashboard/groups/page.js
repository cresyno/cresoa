'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../../lib/supabaseClient'
import { getCurrentBusinessId } from '../../../lib/getBusinessId'
import { isFeatureAvailable, getPlanLimits } from '../../../lib/planLimits'
import { Icon } from '../../../components/Icon'
import { Card } from '../../../components/Card'
import { SectionHeader } from '../../../components/SectionHeader'
import { StatusPill } from '../../../components/StatusPill'
import { Navigation } from '../../../components/Navigation'
import '../../../globals.css'

export default function GroupsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [business, setBusiness] = useState(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [deletingId, setDeletingId] = useState(null)

  const businessId = getCurrentBusinessId()

  const loadGroups = async () => {
    setLoading(true)
    setError('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const bizId = getCurrentBusinessId()
      if (!bizId) {
        router.push('/dashboard')
        return
      }

      const { data: businessData, error: businessError } = await supabase
        .from('businesses')
        .select('id, name, sector, plan')
        .eq('id', bizId)
        .single()

      if (businessError || !businessData) {
        console.error('Business loading error:', businessError)
        router.push('/onboarding')
        return
      }

      setBusiness(businessData)

      const isFashion = businessData.sector === 'Fashion & Custom Wear'
      const groupsAllowed = isFeatureAvailable(businessData.plan || 'free', 'groups')

      if (!isFashion || !groupsAllowed) {
        setGroups([])
        setLoading(false)
        return
      }

      const { data: groupData, error: groupError } = await supabase
        .from('group_orders')
        .select(`
          id,
          business_id,
          group_name,
          coordinator_customer_id,
          due_date,
          status,
          created_at,
          updated_at,
          coordinator:coordinator_customer_id (
            id,
            name,
            first_name,
            last_name,
            phone
          )
        `)
        .eq('business_id', bizId)
        .order('created_at', { ascending: false })

      if (groupError) throw groupError

      const enrichedGroups = await Promise.all(
        (groupData || []).map(async (group) => {
          const { data: orders, error: ordersError } = await supabase
            .from('orders')
            .select('id, price, amount_paid, current_status')
            .eq('group_order_id', group.id)

          if (ordersError) {
            console.error(`Orders loading error for group ${group.id}:`, ordersError)
            return {
              ...group,
              memberCount: 0,
              totalBalance: 0,
              deliveredCount: 0,
            }
          }

          const orderRows = orders || []
          const memberCount = orderRows.length
          const totalBalance = orderRows.reduce(
            (total, order) => total + Math.max(0, Number(order.price || 0) - Number(order.amount_paid || 0)),
            0
          )
          const deliveredCount = orderRows.filter(
            (order) => String(order.current_status || '').toLowerCase() === 'delivered'
          ).length

          return {
            ...group,
            memberCount,
            totalBalance,
            deliveredCount,
          }
        })
      )

      setGroups(enrichedGroups)
    } catch (loadError) {
      console.error('Error loading groups:', loadError)
      setError('We could not load your groups right now.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadGroups()
  }, [router, searchParams])

  const planLimits = getPlanLimits(business?.plan || 'free')
  const memberLimit = planLimits?.maxGroupMembers || 0

  const canUseGroups =
    business &&
    business.sector === 'Fashion & Custom Wear' &&
    isFeatureAvailable(business.plan || 'free', 'groups')

  const stats = useMemo(() => {
    const totalGroups = groups.length
    const totalMembers = groups.reduce((sum, group) => sum + Number(group.memberCount || 0), 0)
    const totalBalance = groups.reduce((sum, group) => sum + Number(group.totalBalance || 0), 0)
    const totalOrders = groups.reduce((sum, group) => sum + Number(group.memberCount || 0), 0)
    const totalDelivered = groups.reduce((sum, group) => sum + Number(group.deliveredCount || 0), 0)
    const progress = totalOrders > 0 ? Math.round((totalDelivered / totalOrders) * 100) : 0

    return { totalGroups, totalMembers, totalBalance, totalOrders, totalDelivered, progress }
  }, [groups])

  const filteredGroups = useMemo(() => {
    const query = search.trim().toLowerCase()
    return groups.filter((group) => {
      const groupStatus = String(group.status || 'pending').toLowerCase()
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && groupStatus !== 'completed') ||
        groupStatus === statusFilter

      const coordinatorName = [
        group.coordinator?.name,
        group.coordinator?.first_name,
        group.coordinator?.last_name,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      const groupName = String(group.group_name || '').toLowerCase()
      const matchesSearch = !query || groupName.includes(query) || coordinatorName.includes(query)

      return matchesStatus && matchesSearch
    })
  }, [groups, search, statusFilter])

  const formatMoney = (value) => `₦${Number(value || 0).toLocaleString('en-NG')}`

  const formatDate = (value) => {
    if (!value) return 'No due date'
    const date = new Date(`${value}T00:00:00`)
    if (Number.isNaN(date.getTime())) return 'No due date'
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  const getStatusLabel = (status) => {
    const normalized = String(status || 'pending').toLowerCase()
    if (normalized === 'completed') return 'Completed'
    if (normalized === 'active') return 'Active'
    if (normalized === 'cancelled') return 'Cancelled'
    if (normalized === 'pending') return 'Pending'
    return normalized.charAt(0).toUpperCase() + normalized.slice(1)
  }

  const getStatusColor = (status) => {
    const normalized = String(status || 'pending').toLowerCase()
    if (normalized === 'completed') return 'success'
    if (normalized === 'active') return 'info'
    if (normalized === 'cancelled') return 'danger'
    return 'warning'
  }

  const handleDelete = async (group) => {
    const confirmed = window.confirm(
      `Delete "${group.group_name}"?\n\nLinked orders will be unassigned from this group, but the orders themselves will not be deleted.`
    )
    if (!confirmed) return

    setDeletingId(group.id)
    try {
      const { error: unlinkError } = await supabase
        .from('orders')
        .update({ group_order_id: null })
        .eq('group_order_id', group.id)
      if (unlinkError) throw unlinkError

      const { error: deleteError } = await supabase
        .from('group_orders')
        .delete()
        .eq('id', group.id)
        .eq('business_id', businessId)
      if (deleteError) throw deleteError

      setGroups((current) => current.filter((item) => item.id !== group.id))
    } catch (deleteError) {
      console.error('Error deleting group:', deleteError)
      window.alert('We could not delete this group. Please try again.')
    } finally {
      setDeletingId(null)
    }
  }

  // ─── LOADING ───
  if (loading) {
    return (
      <div style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto', paddingBottom: '80px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div style={{ width: '140px', height: '24px', background: 'var(--cresoa-border)', borderRadius: '6px' }} />
          <div style={{ width: '100px', height: '32px', background: 'var(--cresoa-border)', borderRadius: '6px' }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px,1fr))', gap: '0.8rem', marginBottom: '1rem' }}>
          {[1,2,3,4].map(i => (
            <div key={i} style={{ background: 'var(--cresoa-surface)', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', animation: 'pulse 1.5s infinite' }}>
              <div style={{ width: '40%', height: '12px', background: 'var(--cresoa-border)', borderRadius: '6px' }} />
              <div style={{ width: '60%', height: '20px', background: 'var(--cresoa-border)', borderRadius: '6px', marginTop: '0.3rem' }} />
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          <div style={{ flex: '1', height: '48px', background: 'var(--cresoa-border)', borderRadius: '14px' }} />
          <div style={{ width: '140px', height: '48px', background: 'var(--cresoa-border)', borderRadius: '14px' }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {[1,2,3].map(i => (
            <div key={i} style={{ background: 'var(--cresoa-surface)', padding: '0.8rem 1rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', animation: 'pulse 1.5s infinite' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div><div style={{ width: '60%', height: '16px', background: 'var(--cresoa-border)', borderRadius: '6px' }} /><div style={{ width: '40%', height: '12px', background: 'var(--cresoa-border)', borderRadius: '6px', marginTop: '0.3rem' }} /></div>
                <div style={{ width: '60px', height: '20px', background: 'var(--cresoa-border)', borderRadius: '6px' }} />
              </div>
            </div>
          ))}
        </div>
        <style>{`@keyframes pulse { 0% { opacity: 0.6; } 50% { opacity: 1; } 100% { opacity: 0.6; } }`}</style>
        <Navigation businessId={businessId} />
      </div>
    )
  }

  // ─── RESTRICTED ───
  if (!canUseGroups) {
    const isFashion = business?.sector === 'Fashion & Custom Wear'
    return (
      <div style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto', paddingBottom: '80px' }}>
        <Navigation businessId={businessId} />
        <Card style={{ display: 'flex', alignItems: 'center', gap: '24px', padding: '2rem', flexWrap: 'wrap' }}>
          <div style={{ width: '64px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '16px', background: 'rgba(212,165,42,0.12)', color: 'var(--cresoa-accent)' }}>
            <Icon name="users" size={28} stroke="currentColor" />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', margin: 0 }}>Orders management</p>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0.2rem 0' }}>Group Orders</h1>
            <p style={{ color: 'var(--cresoa-text-muted)', margin: '0 0 0.8rem' }}>
              {isFashion
                ? 'Group orders are not included in your current plan.'
                : 'Group orders are currently available only for Fashion & Custom Wear businesses.'}
            </p>
            {isFashion && (
              <Link href={`/dashboard/subscription?business_id=${businessId}`} className="cresoa-primary-button" style={{ display: 'inline-block', textDecoration: 'none' }}>
                Upgrade plan
              </Link>
            )}
          </div>
        </Card>
        <div style={{ marginTop: '2rem' }}>
          <Navigation businessId={businessId} />
        </div>
      </div>
    )
  }

  // ─── MAIN RENDER ───
  return (
    <div style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto', paddingBottom: '80px' }}>
      <Navigation businessId={businessId} />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
        <div>
          <p style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', margin: 0 }}>Orders management</p>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0.2rem 0', color: 'var(--cresoa-text)' }}>Group Orders</h1>
          <p style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.85rem', margin: 0 }}>Manage group orders, members, payments and delivery progress in one place.</p>
        </div>
        <Link href={`/dashboard/groups/new?business_id=${businessId || ''}`} className="cresoa-primary-button" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', textDecoration: 'none' }}>
          <Icon name="plus" size={14} stroke="#fff" /> New group
        </Link>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px,1fr))', gap: '0.5rem', marginBottom: '1rem' }}>
        <Card style={{ padding: '0.6rem 0.8rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Groups</span>
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-bg)', color: 'var(--cresoa-accent)' }}>
              <Icon name="users" size={14} stroke="currentColor" />
            </span>
          </div>
          <div style={{ fontWeight: 700, fontSize: '1.3rem', marginTop: '0.2rem' }}>{stats.totalGroups}</div>
          <div style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.65rem' }}>{filteredGroups.length} currently shown</div>
        </Card>
        <Card style={{ padding: '0.6rem 0.8rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Members</span>
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-bg)', color: 'var(--cresoa-accent)' }}>
              <Icon name="user" size={14} stroke="currentColor" />
            </span>
          </div>
          <div style={{ fontWeight: 700, fontSize: '1.3rem', marginTop: '0.2rem' }}>{stats.totalMembers}</div>
          <div style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.65rem' }}>
            {memberLimit > 0
              ? `${Math.max(0, memberLimit - stats.totalMembers)} member slots available`
              : 'Across all groups'}
          </div>
        </Card>
        <Card style={{ padding: '0.6rem 0.8rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Outstanding</span>
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-bg)', color: 'var(--cresoa-danger)', fontWeight: 700 }}>₦</span>
          </div>
          <div style={{ fontWeight: 700, fontSize: '1.1rem', marginTop: '0.2rem', color: 'var(--cresoa-danger)' }}>{formatMoney(stats.totalBalance)}</div>
          <div style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.65rem' }}>Balance still owed</div>
        </Card>
        <Card style={{ padding: '0.6rem 0.8rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Delivery</span>
            <span style={{ color: 'var(--cresoa-success)', fontSize: '0.85rem', fontWeight: 700 }}>{stats.progress}%</span>
          </div>
          <div style={{ height: '6px', borderRadius: '99px', background: 'var(--cresoa-bg)', overflow: 'hidden', marginTop: '0.2rem' }}>
            <div style={{ height: '100%', borderRadius: 'inherit', background: 'var(--cresoa-success)', width: `${stats.progress}%`, transition: 'width 0.3s' }} />
          </div>
          <div style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.65rem', marginTop: '0.2rem' }}>
            {stats.totalDelivered} of {stats.totalOrders} orders delivered
          </div>
        </Card>
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
        <div style={{ flex: '1 1 200px', display: 'flex', alignItems: 'center', gap: '8px', height: '40px', padding: '0 12px', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-bg)' }}>
          <Icon name="search" size={16} stroke="var(--cresoa-text-muted)" />
          <input
            type="text"
            placeholder="Search groups or coordinator..."
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
        <div style={{ display: 'flex', gap: '0.2rem', padding: '0.2rem', background: 'var(--cresoa-bg)', borderRadius: '8px' }}>
          {[
            ['all', 'All'],
            ['pending', 'Pending'],
            ['active', 'Active'],
            ['completed', 'Completed'],
          ].map(([value, label]) => (
            <button
              key={value}
              onClick={() => setStatusFilter(value)}
              style={{
                padding: '0.2rem 0.8rem',
                borderRadius: '6px',
                border: 0,
                background: statusFilter === value ? 'var(--cresoa-surface)' : 'transparent',
                color: statusFilter === value ? 'var(--cresoa-text)' : 'var(--cresoa-text-muted)',
                fontWeight: statusFilter === value ? 700 : 400,
                fontSize: '0.75rem',
                cursor: 'pointer',
                boxShadow: statusFilter === value ? '0 2px 6px rgba(0,0,0,0.04)' : 'none',
                transition: 'background 0.15s, color 0.15s'
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

          {/* Results */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
        <span style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.75rem' }}>
          <strong style={{ color: 'var(--cresoa-text)' }}>{filteredGroups.length}</strong> {filteredGroups.length === 1 ? 'group' : 'groups'}
        </span>
        {(search || statusFilter !== 'all') && (
          <button onClick={() => { setSearch(''); setStatusFilter('all') }} style={{ background: 'none', border: 0, color: 'var(--cresoa-accent)', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 600 }}>
            Clear filters
          </button>
        )}
      </div>

      {/* Group List */}
      {filteredGroups.length === 0 ? (
        <Card style={{ padding: '3rem 2rem', textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '56px', height: '56px', margin: '0 auto 0.8rem', borderRadius: '16px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-bg)', color: 'var(--cresoa-accent)' }}>
            <Icon name="users" size={28} stroke="currentColor" />
          </div>
          <h3 style={{ margin: '0 0 0.3rem', fontSize: '1.1rem' }}>{groups.length === 0 ? 'No groups yet' : 'No matching groups'}</h3>
          <p style={{ color: 'var(--cresoa-text-muted)', margin: '0 0 1rem', fontSize: '0.85rem' }}>
            {groups.length === 0
              ? 'Create your first group to manage Aso-Ebi, bulk orders and coordinated deliveries.'
              : 'Try a different search term or remove the current filter.'}
          </p>
          {groups.length === 0 ? (
            <Link href={`/dashboard/groups/new?business_id=${businessId || ''}`} className="cresoa-primary-button" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', textDecoration: 'none' }}>
              <Icon name="plus" size={14} stroke="#fff" /> Create your first group
            </Link>
          ) : (
            <button onClick={() => { setSearch(''); setStatusFilter('all') }} className="cresoa-primary-button" style={{ background: 'var(--cresoa-primary)' }}>
              Show all groups
            </button>
          )}
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {filteredGroups.map((group) => {
            const memberCount = Number(group.memberCount || 0)
            const deliveredCount = Number(group.deliveredCount || 0)
            const groupProgress = memberCount > 0 ? Math.round((deliveredCount / memberCount) * 100) : 0
            const status = String(group.status || 'pending').toLowerCase()
            const isOverdue = group.due_date && new Date(`${group.due_date}T23:59:59`) < new Date() && status !== 'completed'
            const coordinator = group.coordinator?.name ||
              [group.coordinator?.first_name, group.coordinator?.last_name].filter(Boolean).join(' ') ||
              'No coordinator'

            return (
              <Card key={group.id} style={{ padding: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--cresoa-text)' }}>{group.group_name}</h3>
                      <StatusPill status={getStatusLabel(status)} />
                    </div>
                    <p style={{ margin: '0.2rem 0 0', color: 'var(--cresoa-text-muted)', fontSize: '0.8rem' }}>
                      Coordinator: <strong style={{ color: 'var(--cresoa-text)' }}>{coordinator}</strong>
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <Link href={`/dashboard/groups/${group.id}?business_id=${businessId || ''}`} className="cresoa-primary-button" style={{ textDecoration: 'none', fontSize: '0.75rem', padding: '0.2rem 0.8rem' }}>
                      View
                    </Link>
                    <Link href={`/dashboard/groups/${group.id}/edit?business_id=${businessId || ''}`} style={{ padding: '0.2rem 0.8rem', borderRadius: '6px', border: '1px solid var(--cresoa-border)', background: 'transparent', color: 'var(--cresoa-text)', fontSize: '0.75rem', fontWeight: 600, textDecoration: 'none' }}>
                      Edit
                    </Link>
                    <button onClick={() => handleDelete(group)} disabled={deletingId === group.id} style={{ padding: '0.2rem 0.8rem', borderRadius: '6px', border: '1px solid var(--cresoa-danger)', background: 'transparent', color: 'var(--cresoa-danger)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', opacity: deletingId === group.id ? 0.5 : 1 }}>
                      {deletingId === group.id ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px,1fr))', gap: '0.5rem', marginTop: '0.8rem' }}>
                  <div>
                    <div style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em' }}>Members</div>
                    <div style={{ fontWeight: 600 }}>{memberCount}{memberLimit > 0 && ` / ${memberLimit}`}</div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em' }}>Outstanding</div>
                    <div style={{ fontWeight: 600, color: Number(group.totalBalance) > 0 ? 'var(--cresoa-danger)' : 'var(--cresoa-success)' }}>
                      {formatMoney(group.totalBalance)}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em' }}>Due date</div>
                    <div style={{ fontWeight: 600, color: isOverdue ? 'var(--cresoa-danger)' : 'var(--cresoa-text)' }}>
                      {isOverdue && '⚠ '}{formatDate(group.due_date)}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em' }}>Delivery</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <div style={{ flex: 1, height: '6px', borderRadius: '99px', background: 'var(--cresoa-bg)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', borderRadius: 'inherit', background: 'var(--cresoa-success)', width: `${groupProgress}%`, transition: 'width 0.3s' }} />
                      </div>
                      <span style={{ fontWeight: 600, fontSize: '0.8rem' }}>{groupProgress}%</span>
                    </div>
                    <div style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.65rem' }}>{deliveredCount} of {memberCount} delivered</div>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <div style={{ marginTop: '2rem' }}>
        <Navigation businessId={businessId} />
      </div>
    </div>
  )
}
