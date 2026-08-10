'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../../lib/supabaseClient'
import { getCurrentBusinessId } from '../../../lib/getBusinessId'
import { isFeatureAvailable, getPlanLimits } from '../../../lib/planLimits'
import { Icon } from '../../../components/Icon'

const formatMoney = (value) =>
  `₦${Number(value || 0).toLocaleString('en-NG', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`

const formatDate = (value) => {
  if (!value) return 'No due date'
  return new Date(`${value}T00:00:00`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

const getStatusLabel = (status) => {
  if (!status) return 'Active'
  return status.charAt(0).toUpperCase() + status.slice(1)
}

export default function GroupsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [sector, setSector] = useState('')
  const [plan, setPlan] = useState('free')
  const [canUseGroups, setCanUseGroups] = useState(false)
  const [memberLimit, setMemberLimit] = useState(0)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [deletingId, setDeletingId] = useState(null)

  const businessId = useMemo(
    () => getCurrentBusinessId() || searchParams.get('business_id') || '',
    [searchParams]
  )

  const loadGroups = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      if (!businessId) {
        router.push('/dashboard')
        return
      }

      const { data: business, error: businessError } = await supabase
        .from('businesses')
        .select('id, name, sector, plan')
        .eq('id', businessId)
        .single()

      if (businessError || !business) {
        router.push('/onboarding')
        return
      }

      const nextSector = business.sector || ''
      const nextPlan = business.plan || 'free'
      const allowed =
        nextSector === 'Fashion & Custom Wear' &&
        isFeatureAvailable(nextPlan, 'groups')

      setSector(nextSector)
      setPlan(nextPlan)
      setCanUseGroups(allowed)
      setMemberLimit(getPlanLimits(nextPlan).maxGroupMembers || 0)

      if (!allowed) {
        setGroups([])
        return
      }

      const { data: groupRows, error: groupError } = await supabase
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
          coordinator:coordinator_customer_id (name, phone)
        `)
        .eq('business_id', businessId)
        .order('created_at', { ascending: false })
            if (groupError) throw groupError

      const groupsWithStats = await Promise.all(
        (groupRows || []).map(async (group) => {
          const { data: orders, error: ordersError } = await supabase
            .from('orders')
            .select('id, price, amount_paid, current_status')
            .eq('group_order_id', group.id)

          if (ordersError) {
            console.error(
              `Failed to load orders for group ${group.id}:`,
              ordersError
            )

            return {
              ...group,
              memberCount: 0,
              totalBalance: 0,
              deliveredCount: 0,
              totalOrderValue: 0,
            }
          }

          const rows = orders || []

          const memberCount = rows.length

          const totalBalance = rows.reduce(
            (sum, order) =>
              sum +
              Math.max(
                0,
                Number(order.price || 0) -
                  Number(order.amount_paid || 0)
              ),
            0
          )

          const totalOrderValue = rows.reduce(
            (sum, order) => sum + Number(order.price || 0),
            0
          )

          const deliveredCount = rows.filter(
            (order) => order.current_status === 'Delivered'
          ).length

          return {
            ...group,
            memberCount,
            totalBalance,
            deliveredCount,
            totalOrderValue,
          }
        })
      )

      setGroups(groupsWithStats)
    } catch (loadError) {
      console.error('Error loading groups:', loadError)
      setError('We could not load your groups. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [businessId, router])

  useEffect(() => {
    loadGroups()
  }, [loadGroups])

  const handleDelete = async (group) => {
    const confirmed = window.confirm(
      `Delete "${group.group_name}"?\n\nLinked orders will remain in your system but will no longer belong to this group.`
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

      setGroups((current) =>
        current.filter((item) => item.id !== group.id)
      )
    } catch (deleteError) {
      console.error('Error deleting group:', deleteError)
      window.alert(
        'We could not delete this group. Please try again.'
      )
    } finally {
      setDeletingId(null)
    }
  }

  const filteredGroups = useMemo(() => {
    const query = search.trim().toLowerCase()

    return groups.filter((group) => {
      const matchesSearch =
        !query ||
        group.group_name?.toLowerCase().includes(query) ||
        group.coordinator?.name?.toLowerCase().includes(query) ||
        group.coordinator?.phone?.toLowerCase().includes(query)

      const matchesStatus =
        statusFilter === 'all' ||
        (group.status || 'pending').toLowerCase() === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [groups, search, statusFilter])

  const stats = useMemo(() => {
    const totalGroups = groups.length

    const totalMembers = groups.reduce(
      (sum, group) => sum + group.memberCount,
      0
    )

    const totalBalance = groups.reduce(
      (sum, group) => sum + group.totalBalance,
      0
    )

    const totalOrders = groups.reduce(
      (sum, group) => sum + group.memberCount,
      0
    )

    const totalDelivered = groups.reduce(
      (sum, group) => sum + group.deliveredCount,
      0
    )

    const progress =
      totalOrders > 0
        ? Math.round((totalDelivered / totalOrders) * 100)
        : 0

    return {
      totalGroups,
      totalMembers,
      totalBalance,
      totalOrders,
      totalDelivered,
      progress,
    }
  }, [groups])

  const isAtMemberLimit =
    memberLimit > 0 && stats.totalMembers >= memberLimit

  if (loading) {
    return (
      <div className="groups-page">
        <style>{`
          .groups-page {
            min-height: 100%;
            padding: 28px;
            background: var(--color-bg);
            color: var(--color-text);
          }

          .groups-shell {
            max-width: 1180px;
            margin: 0 auto;
          }

          .skeleton {
            background: var(--color-border);
            border-radius: 10px;
            animation: groupPulse 1.3s ease-in-out infinite;
          }

          .skeleton-header {
            height: 34px;
            width: 230px;
            margin-bottom: 10px;
          }

          .skeleton-subtitle {
            height: 14px;
            width: 330px;
            margin-bottom: 28px;
          }

          .skeleton-stats {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 12px;
            margin-bottom: 22px;
          }

          .skeleton-stat {
            height: 96px;
          }

          .skeleton-toolbar {
            height: 58px;
            margin-bottom: 18px;
          }

          .skeleton-card {
            height: 190px;
            margin-bottom: 14px;
          }

          @keyframes groupPulse {
            0%, 100% { opacity: .35; }
            50% { opacity: .7; }
          }

          @media (max-width: 760px) {
            .groups-page {
              padding: 18px 14px;
            }

            .skeleton-stats {
              grid-template-columns: repeat(2, 1fr);
            }
          }
        `}</style>

        <div className="groups-shell">
          <div className="skeleton skeleton-header" />
          <div className="skeleton skeleton-subtitle" />

          <div className="skeleton-stats">
            <div className="skeleton skeleton-stat" />
            <div className="skeleton skeleton-stat" />
            <div className="skeleton skeleton-stat" />
            <div className="skeleton skeleton-stat" />
          </div>

          <div className="skeleton skeleton-toolbar" />

          <div className="skeleton skeleton-card" />
          <div className="skeleton skeleton-card" />
          <div className="skeleton skeleton-card" />
        </div>
      </div>
    )
}
  if (!canUseGroups) {
    const isFashion = sector === 'Fashion & Custom Wear'

    return (
      <div className="groups-page">
        <style>{`
          .groups-page {
            min-height: 100%;
            padding: 28px;
            background: var(--color-bg);
            color: var(--color-text);
          }

          .groups-shell {
            max-width: 1180px;
            margin: 0 auto;
          }

          .access-card {
            max-width: 620px;
            margin: 70px auto;
            padding: 42px 30px;
            text-align: center;
            background: var(--color-card);
            border: 1px solid var(--color-border);
            border-radius: 18px;
            box-shadow: var(--shadow-sm);
          }

          .access-icon {
            width: 58px;
            height: 58px;
            margin: 0 auto 18px;
            display: grid;
            place-items: center;
            border-radius: 16px;
            background: rgba(216, 178, 76, .12);
            color: var(--color-accent);
            font-size: 28px;
          }

          .access-card h1 {
            margin: 0 0 8px;
            font-size: 22px;
            font-weight: 700;
          }

          .access-card p {
            margin: 0 auto 22px;
            max-width: 480px;
            color: var(--color-text-muted);
            line-height: 1.6;
            font-size: 13px;
          }

          .access-button {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-height: 42px;
            padding: 0 18px;
            border-radius: 9px;
            background: var(--color-accent);
            color: #fff;
            text-decoration: none;
            font-size: 13px;
            font-weight: 700;
          }

          .groups-topbar {
            display: flex;
            align-items: flex-end;
            justify-content: space-between;
            gap: 20px;
            margin-bottom: 24px;
          }

          .groups-heading {
            min-width: 0;
          }

          .eyebrow {
            margin: 0 0 7px;
            color: var(--color-accent);
            font-size: 11px;
            font-weight: 800;
            letter-spacing: .08em;
            text-transform: uppercase;
          }

          .groups-heading h1 {
            margin: 0;
            font-size: clamp(24px, 4vw, 32px);
            line-height: 1.1;
            font-weight: 750;
            letter-spacing: -.02em;
          }

          .groups-heading p {
            margin: 8px 0 0;
            color: var(--color-text-muted);
            font-size: 13px;
          }

          .primary-button {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 7px;
            min-height: 42px;
            padding: 0 16px;
            border: 0;
            border-radius: 9px;
            background: var(--color-accent);
            color: #fff;
            text-decoration: none;
            font: inherit;
            font-size: 13px;
            font-weight: 700;
            cursor: pointer;
            white-space: nowrap;
          }

          .primary-button:hover {
            filter: brightness(.96);
          }

          .primary-button.disabled {
            opacity: .55;
            pointer-events: none;
          }

          .stats-grid {
            display: grid;
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 12px;
            margin-bottom: 20px;
          }

          .stat-card {
            padding: 16px;
            background: var(--color-card);
            border: 1px solid var(--color-border);
            border-radius: 13px;
          }

          .stat-label {
            margin-bottom: 8px;
            color: var(--color-text-muted);
            font-size: 10px;
            font-weight: 800;
            letter-spacing: .06em;
            text-transform: uppercase;
          }

          .stat-value {
            font-size: 22px;
            line-height: 1;
            font-weight: 750;
          }

          .stat-note {
            margin-top: 7px;
            color: var(--color-text-muted);
            font-size: 11px;
          }

          .progress-track {
            width: 100%;
            height: 7px;
            overflow: hidden;
            border-radius: 99px;
            background: var(--color-bg);
          }

          .progress-fill {
            height: 100%;
            border-radius: inherit;
            background: var(--color-success);
            transition: width .25s ease;
          }

          .toolbar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            margin-bottom: 18px;
            padding: 10px;
            background: var(--color-card);
            border: 1px solid var(--color-border);
            border-radius: 12px;
          }

          .search-wrap {
            position: relative;
            flex: 1;
            min-width: 180px;
          }

          .search-wrap input {
            width: 100%;
            box-sizing: border-box;
            min-height: 38px;
            padding: 0 12px 0 36px;
            border: 1px solid var(--color-border);
            border-radius: 8px;
            background: var(--color-bg);
            color: var(--color-text);
            outline: none;
            font: inherit;
            font-size: 12px;
          }

          .search-wrap input:focus {
            border-color: var(--color-accent);
          }

          .search-icon {
            position: absolute;
            left: 12px;
            top: 50%;
            transform: translateY(-50%);
            color: var(--color-text-muted);
            pointer-events: none;
          }

          .filter-wrap {
            display: flex;
            gap: 5px;
            flex-wrap: wrap;
          }

          .filter-button {
            min-height: 36px;
            padding: 0 11px;
            border: 1px solid var(--color-border);
            border-radius: 8px;
            background: var(--color-bg);
            color: var(--color-text-muted);
            font: inherit;
            font-size: 11px;
            font-weight: 650;
            cursor: pointer;
          }

          .filter-button.active {
            border-color: var(--color-accent);
            background: rgba(216, 178, 76, .10);
            color: var(--color-text);
          }

          .results-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 10px;
            color: var(--color-text-muted);
            font-size: 11px;
          }

          .group-list {
            display: grid;
            gap: 12px;
          }

          .group-card {
            background: var(--color-card);
            border: 1px solid var(--color-border);
            border-radius: 15px;
            overflow: hidden;
            transition: border-color .18s ease, box-shadow .18s ease;
          }

          .group-card:hover {
            border-color: rgba(216, 178, 76, .45);
            box-shadow: var(--shadow-sm);
          }

          .group-card-main {
            padding: 17px;
          }

          .group-card-head {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 16px;
          }

          .group-title-wrap {
            min-width: 0;
          }

          .group-title {
            margin: 0;
            font-size: 16px;
            font-weight: 720;
            line-height: 1.25;
            overflow-wrap: anywhere;
          }

          .group-coordinator {
            margin-top: 5px;
            color: var(--color-text-muted);
            font-size: 11px;
          }

          .status-badge {
            flex: 0 0 auto;
            display: inline-flex;
            align-items: center;
            min-height: 25px;
            padding: 0 9px;
            border-radius: 99px;
            background: rgba(216, 178, 76, .13);
            color: var(--color-accent);
            font-size: 10px;
            font-weight: 800;
          }

          .status-badge.completed {
            background: rgba(52, 168, 83, .12);
            color: var(--color-success);
          }

          .group-meta {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 10px;
            margin-top: 16px;
          }

          .meta-item {
            min-width: 0;
          }

          .meta-label {
            margin-bottom: 3px;
            color: var(--color-text-muted);
            font-size: 9px;
            font-weight: 750;
            letter-spacing: .04em;
            text-transform: uppercase;
          }

          .meta-value {
            color: var(--color-text);
            font-size: 12px;
            font-weight: 650;
            overflow-wrap: anywhere;
          }

          .meta-value.owed {
            color: var(--color-danger);
          }

          .meta-value.paid {
            color: var(--color-success);
          }

          .group-progress {
            margin-top: 15px;
          }

          .group-progress-head {
            display: flex;
            justify-content: space-between;
            gap: 10px;
            margin-bottom: 6px;
            color: var(--color-text-muted);
            font-size: 10px;
          }

          .group-actions {
            display: flex;
            align-items: center;
            gap: 7px;
            margin-top: 16px;
            padding-top: 13px;
            border-top: 1px solid var(--color-border);
          }

          .action-button {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-height: 31px;
            padding: 0 10px;
            border: 1px solid var(--color-border);
            border-radius: 7px;
            background: var(--color-bg);
            color: var(--color-text);
            text-decoration: none;
            font: inherit;
            font-size: 10px;
            font-weight: 650;
            cursor: pointer;
          }

          .action-button:hover {
            border-color: var(--color-accent);
          }

          .action-button.danger {
            color: var(--color-danger);
          }

          .action-button:disabled {
            opacity: .5;
            cursor: not-allowed;
          }

          .empty-state {
            padding: 60px 25px;
            text-align: center;
            background: var(--color-card);
            border: 1px dashed var(--color-border);
            border-radius: 15px;
          }

          .empty-icon {
            width: 54px;
            height: 54px;
            margin: 0 auto 15px;
            display: grid;
            place-items: center;
            border-radius: 15px;
            background: var(--color-bg);
            color: var(--color-text-muted);
            font-size: 25px;
          }

          .empty-state h2 {
            margin: 0 0 7px;
            font-size: 17px;
          }

          .empty-state p {
            max-width: 430px;
            margin: 0 auto 19px;
            color: var(--color-text-muted);
            font-size: 12px;
            line-height: 1.6;
          }

          .error-state {
            padding: 35px 20px;
            text-align: center;
            background: var(--color-card);
            border: 1px solid var(--color-border);
            border-radius: 15px;
          }

          .error-state h2 {
            margin: 0 0 7px;
            font-size: 17px;
          }

          .error-state p {
            margin: 0 0 18px;
            color: var(--color-text-muted);
            font-size: 12px;
          }

          @media (max-width: 820px) {
            .stats-grid {
              grid-template-columns: repeat(2, minmax(0, 1fr));
            }

            .groups-topbar {
              align-items: stretch;
              flex-direction: column;
            }

            .primary-button {
              align-self: flex-start;
            }
          }

          @media (max-width: 620px) {
            .groups-page {
              padding: 18px 13px 30px;
            }

            .toolbar {
              align-items: stretch;
              flex-direction: column;
            }

            .search-wrap {
              width: 100%;
            }

            .filter-wrap {
              width: 100%;
            }

            .filter-button {
              flex: 1;
            }

            .group-meta {
              grid-template-columns: 1fr 1fr;
            }

            .group-meta .meta-item:last-child {
              grid-column: 1 / -1;
            }
          }
        `}</style>

        <div className="groups-shell">
          <div className="access-card">
            <div className="access-icon">👥</div>
            <h1>Group Orders</h1>
            <p>
              {!isFashion
                ? 'Group orders are currently available only to Fashion & Custom Wear businesses.'
                : `Your ${plan} plan does not include group orders. Upgrade your plan to manage groups and their members.`}
            </p>

            {isFashion && (
              <Link
                href={`/dashboard/subscription?business_id=${businessId}`}
                className="access-button"
              >
                Upgrade plan
              </Link>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="groups-page">
        <style>{`
          .groups-page {
            min-height: 100%;
            padding: 28px;
            background: var(--color-bg);
            color: var(--color-text);
          }

          .groups-shell {
            max-width: 1180px;
            margin: 0 auto;
          }

          .error-state {
            max-width: 560px;
            margin: 70px auto;
            padding: 40px 25px;
            text-align: center;
            background: var(--color-card);
            border: 1px solid var(--color-border);
            border-radius: 16px;
          }

          .error-state h1 {
            margin: 0 0 8px;
            font-size: 20px;
          }

          .error-state p {
            margin: 0 0 20px;
            color: var(--color-text-muted);
            font-size: 13px;
          }

          .retry-button {
            min-height: 40px;
            padding: 0 17px;
            border: 0;
            border-radius: 8px;
            background: var(--color-accent);
            color: #fff;
            font: inherit;
            font-size: 12px;
            font-weight: 700;
            cursor: pointer;
          }
        `}</style>

        <div className="groups-shell">
          <div className="error-state">
            <h1>Unable to load groups</h1>
            <p>{error}</p>
            <button
              type="button"
              className="retry-button"
              onClick={loadGroups}
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="groups-page">
      <div className="groups-shell">
        <header className="groups-topbar">
          <div className="groups-heading">
            <div className="eyebrow">Orders management</div>
            <h1>Group Orders</h1>
            <p>
              Manage group orders, members, payments and delivery progress.
            </p>
          </div>

          <Link
            href={`/dashboard/groups/new?business_id=${businessId}`}
            className={`primary-button${isAtMemberLimit ? ' disabled' : ''}`}
          >
            <Icon name="plus" size={15} stroke="#fff" />
            New group
          </Link>
        </header>
        <section className="stats-grid" aria-label="Group order summary">
          <div className="stat-card">
            <div className="stat-label">Groups</div>
            <div className="stat-value">{stats.totalGroups}</div>
            <div className="stat-note">
              {filteredGroups.length} currently shown
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-label">Members</div>
            <div className="stat-value">{stats.totalMembers}</div>
            <div className="stat-note">
              {memberLimit > 0
                ? `${Math.max(0, memberLimit - stats.totalMembers)} member slots left`
                : 'No member limit shown'}
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-label">Outstanding</div>
            <div
              className="stat-value"
              style={{
                color:
                  stats.totalBalance > 0
                    ? 'var(--color-danger)'
                    : 'var(--color-success)',
              }}
            >
              {formatMoney(stats.totalBalance)}
            </div>
            <div className="stat-note">Balance still owed</div>
          </div>

          <div className="stat-card">
            <div className="stat-label">Delivery progress</div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginBottom: '8px',
              }}
            >
              <div className="progress-track">
                <div
                  className="progress-fill"
                  style={{ width: `${stats.progress}%` }}
                />
              </div>

              <strong
                style={{
                  fontSize: '13px',
                  whiteSpace: 'nowrap',
                }}
              >
                {stats.progress}%
              </strong>
            </div>

            <div className="stat-note">
              {stats.totalDelivered} of {stats.totalOrders} orders delivered
            </div>
          </div>
        </section>

        {isAtMemberLimit && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '15px',
              marginBottom: '18px',
              padding: '11px 14px',
              border: '1px solid rgba(216, 178, 76, .35)',
              borderRadius: '10px',
              background: 'rgba(216, 178, 76, .08)',
            }}
          >
            <div>
              <div
                style={{
                  fontSize: '12px',
                  fontWeight: '700',
                  marginBottom: '2px',
                }}
              >
                Group member limit reached
              </div>

              <div
                style={{
                  color: 'var(--color-text-muted)',
                  fontSize: '11px',
                  lineHeight: 1.5,
                }}
              >
                Your current plan allows up to {memberLimit} group members.
              </div>
            </div>

            <Link
              href={`/dashboard/subscription?business_id=${businessId}`}
              className="action-button"
            >
              Upgrade
            </Link>
          </div>
        )}

        <section className="toolbar">
          <div className="search-wrap">
            <span className="search-icon">
              <Icon
                name="search"
                size={15}
                stroke="currentColor"
              />
            </span>

            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search groups or coordinators..."
              aria-label="Search groups"
            />
          </div>

          <div className="filter-wrap">
            {[
              ['all', 'All'],
              ['pending', 'Pending'],
              ['active', 'Active'],
              ['completed', 'Completed'],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={`filter-button${
                  statusFilter === value ? ' active' : ''
                }`}
                onClick={() => setStatusFilter(value)}
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        <div className="results-row">
          <span>
            {filteredGroups.length}{' '}
            {filteredGroups.length === 1 ? 'group' : 'groups'}
          </span>

          {(search || statusFilter !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSearch('')
                setStatusFilter('all')
              }}
              style={{
                border: 0,
                padding: 0,
                background: 'transparent',
                color: 'var(--color-accent)',
                font: 'inherit',
                fontSize: '11px',
                fontWeight: '700',
                cursor: 'pointer',
              }}
            >
              Clear filters
            </button>
          )}
        </div>

        {filteredGroups.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">👥</div>

            {groups.length === 0 ? (
              <>
                <h2>No groups yet</h2>
                <p>
                  Create your first group to organise Aso-Ebi,
                  coordinated orders or other bulk customer orders.
                </p>

                <Link
                  href={`/dashboard/groups/new?business_id=${businessId}`}
                  className="primary-button"
                >
                  <Icon name="plus" size={15} stroke="#fff" />
                  Create first group
                </Link>
              </>
            ) : (
              <>
                <h2>No matching groups</h2>
                <p>
                  Try another search term or change the status filter
                  to find the group you are looking for.
                </p>

                <button
                  type="button"
                  className="action-button"
                  onClick={() => {
                    setSearch('')
                    setStatusFilter('all')
                  }}
                >
                  Show all groups
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="group-list">
            {filteredGroups.map((group) => {
              const groupProgress =
                group.memberCount > 0
                  ? Math.round(
                      (group.deliveredCount / group.memberCount) * 100
                    )
                  : 0

              const isCompleted =
                (group.status || '').toLowerCase() === 'completed'

              const isOverdue =
                group.due_date &&
                new Date(`${group.due_date}T23:59:59`) < new Date() &&
                !isCompleted

              return (
                <article
                  key={group.id}
                  className="group-card"
                >
                  <div className="group-card-main">
                    <div className="group-card-head">
                      <div className="group-title-wrap">
                        <h2 className="group-title">
                          {group.group_name}
                        </h2>

                        <div className="group-coordinator">
                          {group.coordinator?.name
                            ? `Coordinator: ${group.coordinator.name}`
                            : 'No coordinator assigned'}
                        </div>
                      </div>

                      <span
                        className={`status-badge${
                          isCompleted ? ' completed' : ''
                        }`}
                      >
                        {getStatusLabel(group.status || 'active')}
                      </span>
                    </div>

                    <div className="group-meta">
                      <div className="meta-item">
                        <div className="meta-label">
                          Members
                        </div>
                        <div className="meta-value">
                          {group.memberCount}
                          {memberLimit > 0
                            ? ` / ${memberLimit}`
                            : ''}
                        </div>
                      </div>

                      <div className="meta-item">
                        <div className="meta-label">
                          Outstanding
                        </div>
                        <div
                          className={`meta-value ${
                            group.totalBalance > 0
                              ? 'owed'
                              : 'paid'
                          }`}
                        >
                          {formatMoney(group.totalBalance)}
                        </div>
                      </div>

                      <div className="meta-item">
                        <div className="meta-label">
                          Due date
                        </div>
                        <div
                          className="meta-value"
                          style={{
                            color: isOverdue
                              ? 'var(--color-danger)'
                              : undefined,
                          }}
                        >
                          {isOverdue
                            ? `${formatDate(group.due_date)} · Overdue`
                            : formatDate(group.due_date)}
                        </div>
                      </div>
                    </div>

                    <div className="group-progress">
                      <div className="group-progress-head">
                        <span>Delivery progress</span>
                        <span>
                          {group.deliveredCount} /{' '}
                          {group.memberCount} delivered
                        </span>
                      </div>

                      <div className="progress-track">
                        <div
                          className="progress-fill"
                          style={{
                            width: `${groupProgress}%`,
                          }}
                        />
                      </div>
                    </div>

                    <div className="group-actions">
                      <Link
                        href={`/dashboard/groups/${group.id}?business_id=${businessId}`}
                        className="action-button"
                      >
                        View group
                      </Link>

                      <Link
                        href={`/dashboard/groups/${group.id}/edit?business_id=${businessId}`}
                        className="action-button"
                      >
                        Edit
                      </Link>

                      <button
                        type="button"
                        className="action-button danger"
                        disabled={deletingId === group.id}
                        onClick={() => handleDelete(group)}
                      >
                        {deletingId === group.id
                          ? 'Deleting...'
                          : 'Delete'}
                      </button>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
