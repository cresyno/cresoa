'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../../lib/supabaseClient'
import { getCurrentBusinessId } from '../../../lib/getBusinessId'
import { isFeatureAvailable, getPlanLimits } from '../../../lib/planLimits'
import { Icon } from '../../../components/Icon'

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

  // ─── LOADING STATE ──────────────────────────────
  if (loading) {
    return (
      <div className="groups-page">
        <div className="groups-shell">
          <div className="page-header skeleton-header">
            <div>
              <div className="skeleton skeleton-eyebrow" />
              <div className="skeleton skeleton-title" />
              <div className="skeleton skeleton-subtitle" />
            </div>
            <div className="skeleton skeleton-button" />
          </div>
          <div className="stats-grid">
            {[1, 2, 3, 4].map((i) => (
              <div className="stat-card skeleton-card" key={i}>
                <div className="skeleton skeleton-small" />
                <div className="skeleton skeleton-number" />
                <div className="skeleton skeleton-note" />
              </div>
            ))}
          </div>
          <div className="skeleton skeleton-toolbar" />
          <div className="group-list">
            {[1, 2, 3].map((i) => (
              <div className="group-card skeleton-group" key={i}>
                <div className="skeleton skeleton-group-title" />
                <div className="skeleton skeleton-group-line" />
                <div className="skeleton skeleton-group-line short" />
                <div className="skeleton skeleton-group-progress" />
              </div>
            ))}
          </div>
        </div>
        <style jsx>{`
          .groups-page {
            min-height: 100vh;
            background: var(--color-bg);
            color: var(--color-text);
            padding: 30px 22px 70px;
          }
          .groups-shell {
            max-width: 1180px;
            margin: 0 auto;
          }
          .skeleton {
            background: linear-gradient(90deg, rgba(0,0,0,0.06), rgba(0,0,0,0.10), rgba(0,0,0,0.06));
            background-size: 200% 100%;
            animation: skeletonMove 1.4s infinite;
            border-radius: 8px;
          }
          .skeleton-eyebrow { width: 110px; height: 12px; margin-bottom: 10px; }
          .skeleton-title { width: 240px; height: 34px; margin-bottom: 10px; }
          .skeleton-subtitle { width: 330px; height: 14px; }
          .skeleton-button { width: 125px; height: 42px; border-radius: 10px; }
          .stats-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 14px; margin-bottom: 22px; }
          .skeleton-card { min-height: 125px; padding: 18px; }
          .skeleton-small { width: 65px; height: 10px; margin-bottom: 16px; }
          .skeleton-number { width: 90px; height: 25px; margin-bottom: 12px; }
          .skeleton-note { width: 125px; height: 10px; }
          .skeleton-toolbar { width: 100%; height: 48px; margin-bottom: 18px; }
          .group-list { display: grid; gap: 14px; }
          .skeleton-group { min-height: 190px; padding: 22px; }
          .skeleton-group-title { width: 210px; height: 22px; margin-bottom: 16px; }
          .skeleton-group-line { width: 55%; height: 12px; margin-bottom: 10px; }
          .skeleton-group-line.short { width: 35%; }
          .skeleton-group-progress { width: 100%; height: 7px; margin-top: 25px; }
          @keyframes skeletonMove { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
          @media (max-width: 760px) {
            .groups-page { padding: 20px 14px 60px; }
            .skeleton-header { flex-direction: column; align-items: flex-start; }
            .stats-grid { grid-template-columns: repeat(2,1fr); }
            .skeleton-button { width: 100%; }
          }
        `}</style>
      </div>
    )
  }

  // ─── RESTRICTED STATE ────────────────────────────
  if (!canUseGroups) {
    const isFashion = business?.sector === 'Fashion & Custom Wear'
    return (
      <div className="groups-page">
        <div className="groups-shell">
          <div className="restricted-card">
            <div className="restricted-icon">
              <Icon name="users" size={28} stroke="currentColor" />
            </div>
            <div className="restricted-content">
              <div className="section-eyebrow">Orders management</div>
              <h1>Group Orders</h1>
              <p>
                {isFashion
                  ? 'Group orders are not included in your current plan.'
                  : 'Group orders are currently available only for Fashion & Custom Wear businesses.'}
              </p>
              {isFashion && (
                <Link href={`/dashboard/subscription?business_id=${businessId}`} className="primary-button">
                  Upgrade plan
                </Link>
              )}
            </div>
          </div>
        </div>
        <style jsx>{`
          .groups-page { min-height: 100vh; background: var(--color-bg); color: var(--color-text); padding: 30px 22px 70px; }
          .groups-shell { max-width: 1180px; margin: 0 auto; }
          .restricted-card { display: flex; align-items: center; gap: 24px; padding: 45px; background: var(--color-card); border: 1px solid var(--color-border); border-radius: 18px; box-shadow: var(--shadow-sm); }
          .restricted-icon { width: 64px; height: 64px; display: grid; place-items: center; border-radius: 16px; background: rgba(212,165,42,0.12); color: var(--color-accent); }
          .restricted-content { max-width: 520px; }
          .section-eyebrow { margin-bottom: 8px; color: var(--color-text-muted); font-size: 10px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; }
          .restricted-content h1 { margin: 0 0 10px; font-size: 30px; }
          .restricted-content p { margin: 0 0 20px; color: var(--color-text-muted); font-size: 13px; line-height: 1.6; }
          .primary-button { display: inline-flex; align-items: center; gap: 7px; min-height: 40px; padding: 0 16px; border: 0; border-radius: 9px; background: var(--color-accent); color: #fff; text-decoration: none; font-size: 12px; font-weight: 700; }
          @media (max-width: 700px) {
            .restricted-card { flex-direction: column; text-align: center; padding: 30px 20px; }
          }
        `}</style>
      </div>
    )
  }

  // ─── MAIN RENDER ──────────────────────────────────
  return (
    <div className="groups-page">
      <div className="groups-shell">
        {/* Header */}
        <header className="page-header">
          <div className="page-heading">
            <div className="section-eyebrow">Orders management</div>
            <h1>Group Orders</h1>
            <p>Manage group orders, members, payments and delivery progress in one place.</p>
          </div>
          <Link href={`/dashboard/groups/new?business_id=${businessId || ''}`} className="new-group-button">
            <Icon name="plus" size={16} stroke="#fff" />
            <span>New group</span>
          </Link>
        </header>

        {/* Stats */}
        <section className="stats-grid">
          <div className="stat-card">
            <div className="stat-top">
              <span className="stat-label">Groups</span>
              <span className="stat-icon"><Icon name="users" size={15} stroke="currentColor" /></span>
            </div>
            <div className="stat-value">{stats.totalGroups}</div>
            <div className="stat-note">{filteredGroups.length} currently shown</div>
          </div>
          <div className="stat-card">
            <div className="stat-top">
              <span className="stat-label">Members</span>
              <span className="stat-icon"><Icon name="user" size={15} stroke="currentColor" /></span>
            </div>
            <div className="stat-value">{stats.totalMembers}</div>
            <div className="stat-note">
              {memberLimit > 0
                ? `${Math.max(0, memberLimit - stats.totalMembers)} member slots available`
                : 'Across all groups'}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-top">
              <span className="stat-label">Outstanding</span>
              <span className="stat-icon danger-icon">₦</span>
            </div>
            <div className="stat-value money">{formatMoney(stats.totalBalance)}</div>
            <div className="stat-note">Balance still owed</div>
          </div>
          <div className="stat-card progress-stat">
            <div className="stat-top">
              <span className="stat-label">Delivery progress</span>
              <span className="progress-percent">{stats.progress}%</span>
            </div>
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${stats.progress}%` }} />
            </div>
            <div className="stat-note">
              {stats.totalDelivered} of {stats.totalOrders} orders delivered
            </div>
          </div>
        </section>

        {/* Toolbar */}
        <section className="groups-toolbar">
          <div className="search-box">
            <Icon name="search" size={15} stroke="currentColor" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search groups or coordinator"
              aria-label="Search groups or coordinator"
            />
            {search && (
              <button type="button" className="clear-search" onClick={() => setSearch('')} aria-label="Clear search">
                ×
              </button>
            )}
          </div>
          <div className="filter-tabs" role="tablist">
            {[
              ['all', 'All'],
              ['pending', 'Pending'],
              ['active', 'Active'],
              ['completed', 'Completed'],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={statusFilter === value}
                className={`filter-tab ${statusFilter === value ? 'selected' : ''}`}
                onClick={() => setStatusFilter(value)}
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        {/* Results count */}
        <div className="results-row">
          <div>
            <strong>{filteredGroups.length}</strong> {filteredGroups.length === 1 ? 'group' : 'groups'}
          </div>
          {(search || statusFilter !== 'all') && (
            <button type="button" className="reset-filters" onClick={() => { setSearch(''); setStatusFilter('all'); }}>
              Clear filters
            </button>
          )}
        </div>

  {/* Group list or empty state */}
        {filteredGroups.length === 0 ? (
          <section className="empty-state">
            <div className="empty-icon">
              <Icon name="users" size={28} stroke="currentColor" />
            </div>
            <h2>{groups.length === 0 ? 'No groups yet' : 'No matching groups'}</h2>
            <p>
              {groups.length === 0
                ? 'Create your first group to manage Aso-Ebi, bulk orders and coordinated deliveries.'
                : 'Try a different search term or remove the current filter.'}
            </p>
            {groups.length === 0 ? (
              <Link href={`/dashboard/groups/new?business_id=${businessId || ''}`} className="empty-action">
                <Icon name="plus" size={15} stroke="#fff" /> Create your first group
              </Link>
            ) : (
              <button type="button" className="empty-action" onClick={() => { setSearch(''); setStatusFilter('all'); }}>
                Show all groups
              </button>
            )}
          </section>
        ) : (
          <section className="group-list">
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
                <article className="group-card" key={group.id}>
                  <div className="group-card-main">
                    <div className="group-card-heading">
                      <div>
                        <h2>{group.group_name}</h2>
                        <div className="coordinator">Coordinator: <strong>{coordinator}</strong></div>
                      </div>
                      <span className={`status-badge status-${status}`}>
                        <span className="status-dot" />
                        {getStatusLabel(status)}
                      </span>
                    </div>

                    <div className="group-details">
                      <div className="detail-item">
                        <span className="detail-label">Members</span>
                        <strong>
                          {memberCount}
                          {memberLimit > 0 && ` / ${memberLimit}`}
                        </strong>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Outstanding</span>
                        <strong className={Number(group.totalBalance) > 0 ? 'amount-due' : 'amount-paid'}>
                          {formatMoney(group.totalBalance)}
                        </strong>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Due date</span>
                        <strong className={isOverdue ? 'overdue' : ''}>
                          {isOverdue && '⚠ '}{formatDate(group.due_date)}
                        </strong>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Delivery</span>
                        <strong>{groupProgress}%</strong>
                      </div>
                    </div>

                    <div className="delivery-progress">
                      <div className="delivery-progress-head">
                        <span>Delivery progress</span>
                        <span>{deliveredCount} of {memberCount} delivered</span>
                      </div>
                      <div className="progress-track large">
                        <div className="progress-fill" style={{ width: `${groupProgress}%` }} />
                      </div>
                    </div>
                  </div>

                  <div className="group-card-actions">
                    <Link href={`/dashboard/groups/${group.id}?business_id=${businessId || ''}`} className="card-action primary-action">
                      View group
                    </Link>
                    <Link href={`/dashboard/groups/${group.id}/edit?business_id=${businessId || ''}`} className="card-action">
                      Edit
                    </Link>
                    <button
                      type="button"
                      className="card-action delete-action"
                      disabled={deletingId === group.id}
                      onClick={() => handleDelete(group)}
                    >
                      {deletingId === group.id ? 'Deleting…' : 'Delete'}
                    </button>
                  </div>
                </article>
              )
            })}
          </section>
        )}
      </div>

      <style jsx>{`
        .groups-page {
          min-height: 100%;
          padding: 28px 22px 48px;
          background: var(--color-bg);
          color: var(--color-text);
        }
        .groups-shell {
          max-width: 1180px;
          margin: 0 auto;
        }
        .page-header {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 24px;
          margin-bottom: 24px;
        }
        .page-heading {
          min-width: 0;
        }
        .section-eyebrow {
          margin-bottom: 7px;
          color: var(--color-accent);
          font-size: 10px;
          font-weight: 800;
          letter-spacing: .12em;
          text-transform: uppercase;
        }
        .page-heading h1 {
          margin: 0;
          font-size: 28px;
          font-weight: 750;
          letter-spacing: -0.025em;
          line-height: 1.15;
        }
        .page-heading p {
          max-width: 620px;
          margin: 8px 0 0;
          color: var(--color-text-muted);
          font-size: 13px;
          line-height: 1.55;
        }
        .new-group-button {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          min-height: 38px;
          padding: 0 15px;
          border: 1px solid var(--color-accent);
          border-radius: 8px;
          background: var(--color-accent);
          color: #fff;
          font-size: 12px;
          font-weight: 700;
          text-decoration: none;
          box-shadow: 0 2px 8px rgba(212,165,42,0.2);
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        .new-group-button:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 14px rgba(212,165,42,0.3);
              }

              /* Stats */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
          margin-bottom: 18px;
        }
        .stat-card {
          padding: 16px;
          border: 1px solid var(--color-border);
          border-radius: 12px;
          background: var(--color-card);
          box-shadow: 0 2px 8px rgba(0,0,0,0.04);
        }
        .stat-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .stat-label {
          color: var(--color-text-muted);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: .06em;
          text-transform: uppercase;
        }
        .stat-icon {
          display: grid;
          place-items: center;
          width: 28px;
          height: 28px;
          border: 1px solid var(--color-border);
          border-radius: 8px;
          background: var(--color-bg);
          color: var(--color-accent);
          font-weight: 700;
        }
        .danger-icon {
          color: var(--color-danger);
        }
        .stat-value {
          margin-top: 10px;
          font-size: 24px;
          font-weight: 750;
          line-height: 1.1;
        }
        .stat-value.money {
          font-size: 20px;
        }
        .stat-note {
          margin-top: 6px;
          color: var(--color-text-muted);
          font-size: 10px;
        }
        .progress-stat .stat-top {
          margin-bottom: 12px;
        }
        .progress-percent {
          color: var(--color-success);
          font-size: 13px;
          font-weight: 700;
        }
        .progress-track {
          height: 6px;
          border-radius: 999px;
          background: var(--color-bg);
          overflow: hidden;
        }
        .progress-fill {
          height: 100%;
          border-radius: inherit;
          background: var(--color-success);
          transition: width 0.3s ease;
        }

        /* Toolbar */
        .groups-toolbar {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 14px;
          border: 1px solid var(--color-border);
          border-radius: 10px;
          background: var(--color-card);
          margin-bottom: 10px;
        }
        .search-box {
          display: flex;
          align-items: center;
          gap: 8px;
          flex: 1;
          max-width: 420px;
          padding: 0 10px;
          border: 1px solid var(--color-border);
          border-radius: 8px;
          background: var(--color-bg);
          min-height: 36px;
          color: var(--color-text-muted);
        }
        .search-box:focus-within {
          border-color: var(--color-accent);
          box-shadow: 0 0 0 3px rgba(212,165,42,0.1);
        }
        .search-box input {
          width: 100%;
          border: 0;
          outline: 0;
          background: transparent;
          color: var(--color-text);
          font-size: 11px;
        }
        .clear-search {
          display: grid;
          place-items: center;
          width: 20px;
          height: 20px;
          border: 0;
          border-radius: 50%;
          background: var(--color-border);
          color: var(--color-text-muted);
          cursor: pointer;
          font-size: 14px;
          line-height: 1;
        }
        .filter-tabs {
          display: flex;
          gap: 3px;
          padding: 3px;
          background: var(--color-bg);
          border-radius: 8px;
        }
        .filter-tab {
          padding: 0 12px;
          min-height: 30px;
          border: 0;
          border-radius: 6px;
          background: transparent;
          color: var(--color-text-muted);
          font-size: 10px;
          font-weight: 700;
          cursor: pointer;
          transition: background 0.15s, color 0.15s;
        }
        .filter-tab:hover {
          color: var(--color-text);
        }
        .filter-tab.selected {
          background: var(--color-card);
          color: var(--color-text);
          box-shadow: 0 2px 6px rgba(0,0,0,0.04);
        }
        .results-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          min-height: 28px;
          margin-bottom: 10px;
          font-size: 10px;
          color: var(--color-text-muted);
        }
        .results-row strong {
          color: var(--color-text);
          font-weight: 700;
        }
        .reset-filters {
          border: 0;
          background: transparent;
          color: var(--color-accent);
          font-weight: 700;
          cursor: pointer;
          font-size: 10px;
        }

        /* Group Cards */
        .group-list {
          display: grid;
          gap: 12px;
        }
        .group-card {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 18px;
          padding: 18px 20px;
          border: 1px solid var(--color-border);
          border-radius: 14px;
          background: var(--color-card);
          box-shadow: 0 2px 8px rgba(0,0,0,0.04);
          transition: border-color 0.2s, box-shadow 0.2s, transform 0.15s;
        }
        .group-card:hover {
          border-color: rgba(212,165,42,0.4);
          box-shadow: 0 6px 20px rgba(0,0,0,0.06);
          transform: translateY(-2px);
        }
        .group-card-main {
          min-width: 0;
        }
        .group-card-heading {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
        }
        .group-card-heading h2 {
          margin: 0;
          font-size: 16px;
          font-weight: 750;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .coordinator {
          margin-top: 4px;
          color: var(--color-text-muted);
          font-size: 11px;
        }
        .coordinator strong {
          color: var(--color-text);
          font-weight: 600;
        }

        /* Status badge */
        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 0 10px;
          min-height: 24px;
          border-radius: 999px;
          border: 1px solid var(--color-border);
          background: var(--color-bg);
          color: var(--color-text-muted);
          font-size: 9px;
          font-weight: 700;
          text-transform: capitalize;
          white-space: nowrap;
          flex-shrink: 0;
        }
        .status-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: currentColor;
        }
        .status-active { color: var(--color-success); }
        .status-completed { color: var(--color-accent); }
        .status-pending { color: var(--color-text-muted); }

        /* Details */
        .group-details {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
          margin-top: 14px;
        }
        .detail-item {
          min-width: 0;
        }
        .detail-label {
          display: block;
          margin-bottom: 4px;
          color: var(--color-text-muted);
          font-size: 9px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: .04em;
        }
        .detail-item strong {
          display: block;
          font-size: 12px;
          font-weight: 700;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .amount-due { color: var(--color-danger); }
        .amount-paid { color: var(--color-success); }
        .overdue { color: var(--color-danger); }

        /* Progress inside card */
        .delivery-progress {
          margin-top: 14px;
        }
        .delivery-progress-head {
          display: flex;
          justify-content: space-between;
          font-size: 9px;
          color: var(--color-text-muted);
          margin-bottom: 4px;
        }
        .progress-track.large {
          height: 7px;
        }

        /* Actions */
        .group-card-actions {
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 6px;
          padding-left: 16px;
          border-left: 1px solid var(--color-border);
          min-width: 90px;
        }
        .card-action {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 30px;
          padding: 0 10px;
          border: 1px solid var(--color-border);
          border-radius: 8px;
          background: var(--color-bg);
          color: var(--color-text-muted);
          font-size: 10px;
          font-weight: 700;
          text-decoration: none;
          cursor: pointer;
          transition: border-color 0.15s, background 0.15s, color 0.15s;
        }
        .card-action:hover {
          border-color: var(--color-accent);
          color: var(--color-text);
        }
        .primary-action {
          border-color: var(--color-accent);
          background: var(--color-accent);
          color: #fff;
        }
        .primary-action:hover {
          background: #c49a2a;
          border-color: #c49a2a;
          color: #fff;
        }
        .delete-action {
          border-color: transparent;
          background: transparent;
          color: var(--color-danger);
        }
        .delete-action:hover {
          background: rgba(217,83,79,0.06);
          border-color: rgba(217,83,79,0.2);
        }
        .delete-action:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* Empty state */
        .empty-state {
          display: grid;
          justify-items: center;
          padding: 60px 24px;
          border: 1px dashed var(--color-border);
          border-radius: 14px;
          background: var(--color-card);
          text-align: center;
        }
        .empty-icon {
          display: grid;
          place-items: center;
          width: 56px;
          height: 56px;
          border-radius: 16px;
          border: 1px solid var(--color-border);
          background: var(--color-bg);
          color: var(--color-accent);
          margin-bottom: 16px;
        }
        .empty-state h2 {
          margin: 0;
          font-size: 18px;
          font-weight: 750;
        }
        .empty-state p {
          max-width: 420px;
          margin: 8px 0 20px;
          color: var(--color-text-muted);
          font-size: 12px;
          line-height: 1.6;
        }
         .empty-action {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          min-height: 36px;
          padding: 0 16px;
          border: 0;
          border-radius: 8px;
          background: var(--color-accent);
          color: #fff;
          font-size: 11px;
          font-weight: 700;
          text-decoration: none;
          cursor: pointer;
        }

        /* Responsive */
        @media (max-width: 860px) {
          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          .group-details {
            grid-template-columns: repeat(2, 1fr);
          }
          .group-card {
            grid-template-columns: 1fr;
            gap: 14px;
          }
          .group-card-actions {
            flex-direction: row;
            flex-wrap: wrap;
            border-left: 0;
            padding-left: 0;
            padding-top: 12px;
            border-top: 1px solid var(--color-border);
            justify-content: flex-start;
          }
          .card-action {
            flex: 1;
            min-width: 70px;
          }
          .groups-toolbar {
            flex-direction: column;
            align-items: stretch;
          }
          .search-box {
            max-width: 100%;
          }
          .filter-tabs {
            justify-content: center;
          }
        }
        @media (max-width: 480px) {
          .groups-page {
            padding: 16px 12px 40px;
          }
          .page-header {
            flex-direction: column;
            align-items: flex-start;
          }
          .page-heading h1 {
            font-size: 22px;
          }
          .stats-grid {
            grid-template-columns: 1fr 1fr;
            gap: 8px;
          }
          .stat-card {
            padding: 12px;
          }
          .stat-value {
            font-size: 18px;
          }
          .group-card {
            padding: 14px;
          }
          .group-card-heading h2 {
            font-size: 14px;
          }
          .group-details {
            grid-template-columns: 1fr 1fr;
            gap: 8px;
          }
          .detail-item strong {
            font-size: 11px;
          }
          .group-card-actions {
            flex-wrap: wrap;
          }
          .card-action {
            flex: 1 0 auto;
          }
        }
      `}</style>
    </div>
  )
}
