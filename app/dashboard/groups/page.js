'use client'

import { useEffect, useState } from 'react'
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
  const [error, setError] = useState(null)
  const [business, setBusiness] = useState(null)
  const [businessName, setBusinessName] = useState('')
  const [sector, setSector] = useState('')
  const [plan, setPlan] = useState('free')
  const [canUseGroups, setCanUseGroups] = useState(false)
  const [memberLimit, setMemberLimit] = useState(0)

  const loadGroups = async () => {
    setLoading(true)
    setError(null)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      const bizId = getCurrentBusinessId()

      if (!bizId) {
        router.push('/dashboard')
        return
      }

      const { data: bizData, error: bizError } = await supabase
        .from('businesses')
        .select('id, name, sector, plan')
        .eq('id', bizId)
        .single()

      if (bizError || !bizData) {
        router.push('/onboarding')
        return
      }

      setBusiness(bizData)
      setBusinessName(bizData.name || '')
      setSector(bizData.sector || '')
      setPlan(bizData.plan || 'free')

      const isFashion = bizData.sector === 'Fashion & Custom Wear'
      const groupsAllowed = isFeatureAvailable(
        bizData.plan || 'free',
        'groups'
      )
      const canUse = isFashion && groupsAllowed

      setCanUseGroups(canUse)

      if (!canUse) {
        setLoading(false)
        return
      }

      const limits = getPlanLimits(bizData.plan || 'free')
      setMemberLimit(limits.maxGroupMembers || 0)

      const { data: groupsData, error: groupsError } = await supabase
        .from('group_orders')
        .select(`
          *,
          coordinator:coordinator_customer_id (
            name,
            phone
          )
        `)
        .eq('business_id', bizId)
        .order('created_at', { ascending: false })

      if (groupsError) {
        throw groupsError
      }

      const groupsWithStats = await Promise.all(
        (groupsData || []).map(async (group) => {
          const { data: orders, error: ordersError } = await supabase
            .from('orders')
            .select('price, amount_paid, current_status')
            .eq('group_order_id', group.id)

          if (ordersError) {
            return {
              ...group,
              memberCount: 0,
              totalBalance: 0,
              deliveredCount: 0,
            }
          }

          const memberCount = orders.length

          const totalBalance = orders.reduce(
            (sum, order) =>
              sum +
              Math.max(
                0,
                (order.price || 0) - (order.amount_paid || 0)
              ),
            0
          )

          const deliveredCount = orders.filter(
            (order) => order.current_status === 'Delivered'
          ).length

          return {
            ...group,
            memberCount,
            totalBalance,
            deliveredCount,
          }
        })
      )

      setGroups(groupsWithStats)
    } catch (err) {
      console.error('Error loading groups:', err)
      setError('Failed to load groups.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadGroups()
  }, [router, searchParams])

  const handleDelete = async (groupId) => {
    if (
      !confirm(
        'Delete this group? All linked orders will be unassigned.'
      )
    ) {
      return
    }

    try {
      await supabase
        .from('orders')
        .update({ group_order_id: null })
        .eq('group_order_id', groupId)
            const { error } = await supabase
        .from('group_orders')
        .delete()
        .eq('id', groupId)

      if (error) {
        throw error
      }

      await loadGroups()
    } catch (err) {
      console.error('Error deleting group:', err)
      alert('Failed to delete group.')
    }
  }

  if (loading) {
    return (
      <div
        style={{
          padding: '1.5rem',
          maxWidth: '1200px',
          margin: '0 auto',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: '1rem',
          }}
        >
          <div
            style={{
              width: '140px',
              height: '24px',
              background: 'var(--color-border)',
              borderRadius: '6px',
            }}
          />

          <div
            style={{
              width: '100px',
              height: '32px',
              background: 'var(--color-border)',
              borderRadius: '6px',
            }}
          />
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns:
              'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '1rem',
          }}
        >
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              style={{
                background: 'var(--color-card)',
                padding: '1rem',
                borderRadius: '8px',
                boxShadow: 'var(--shadow-sm)',
                animation: 'pulse 1.5s infinite',
              }}
            >
              <div
                style={{
                  width: '60%',
                  height: '16px',
                  background: 'var(--color-border)',
                  borderRadius: '6px',
                }}
              />

              <div
                style={{
                  width: '40%',
                  height: '12px',
                  background: 'var(--color-border)',
                  borderRadius: '6px',
                  marginTop: '0.5rem',
                }}
              />

              <div
                style={{
                  width: '30%',
                  height: '12px',
                  background: 'var(--color-border)',
                  borderRadius: '6px',
                  marginTop: '0.5rem',
                }}
              />
            </div>
          ))}
        </div>

        <style>{`
          @keyframes pulse {
            0% {
              opacity: 0.6;
            }

            50% {
              opacity: 1;
            }

            100% {
              opacity: 0.6;
            }
          }
        `}</style>
      </div>
    )
  }

  if (!canUseGroups) {
    const isFashion = sector === 'Fashion & Custom Wear'

    const reason = !isFashion
      ? 'Group orders are only available for Fashion businesses.'
      : 'Your current plan does not support group orders.'

    return (
      <div
        style={{
          padding: '1.5rem',
          maxWidth: '1200px',
          margin: '0 auto',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            padding: '3rem 2rem',
            background: 'var(--color-card)',
            borderRadius: '16px',
            border: '1px solid var(--color-border)',
          }}
        >
          <span
            style={{
              fontSize: '3rem',
              display: 'block',
              marginBottom: '0.5rem',
            }}
          >
            👥
          </span>

          <h2
            style={{
              fontSize: '1.25rem',
              fontWeight: '600',
              margin: '0 0 0.5rem',
            }}
          >
            Group Orders
          </h2>

          <p
            style={{
              color: 'var(--color-text-muted)',
              margin: '0 0 1rem',
            }}
          >
            {reason}
          </p>

          {!isFashion ? (
            <p
              style={{
                fontSize: '0.9rem',
                color: 'var(--color-text-muted)',
              }}
            >
              This feature is exclusively for{' '}
              <strong>Fashion & Custom Wear</strong> businesses.
            </p>
          ) : (
            <a
              href={`/dashboard/subscription?business_id=${
                getCurrentBusinessId() || ''
              }`}
              style={{
                display: 'inline-block',
                padding: '0.6rem 1.5rem',
                background: 'var(--color-accent)',
                color: '#fff',
                borderRadius: '6px',
                textDecoration: 'none',
                fontWeight: '600',
              }}
            >
              Upgrade to Starter or Pro
            </a>
          )}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div
        style={{
          padding: '1.5rem',
          maxWidth: '1200px',
          margin: '0 auto',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            background: 'var(--color-card)',
            padding: '2rem',
            borderRadius: '12px',
            border: '1px solid var(--color-border)',
          }}
        >
          <p style={{ color: 'var(--color-danger)' }}>
            {error}
          </p>

          <button
            onClick={loadGroups}
            style={{
              marginTop: '1rem',
              padding: '0.5rem 1.5rem',
              background: 'var(--color-accent)',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  const totalGroups = groups.length

  const totalMembers = groups.reduce(
    (sum, group) => sum + group.memberCount,
    0
  )

  const totalBalance = groups.reduce(
    (sum, group) => sum + group.totalBalance,
    0
  )

  const totalDelivered = groups.reduce(
    (sum, group) => sum + group.deliveredCount,
    0
  )

  const totalOrders = groups.reduce(
    (sum, group) => sum + group.memberCount,
    0
  )

  const progress =
    totalOrders > 0
      ? Math.round((totalDelivered / totalOrders) * 100)
      : 0

  return (
    <div
      style={{
        padding: '1.5rem',
        maxWidth: '1200px',
        margin: '0 auto',
        color: 'var(--color-text)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.5rem',
          marginBottom: '1rem',
        }}
      >
        <div>
          <h1
            style={{
              fontSize: '1.25rem',
              fontWeight: '600',
              margin: 0,
              color: 'var(--color-text)',
            }}
          >
            Group Orders
          </h1>

          <p
            style={{
              color: 'var(--color-text-muted)',
              margin: '0.1rem 0 0',
              fontSize: '0.85rem',
            }}
          >
            {totalGroups} group
            {totalGroups !== 1 ? 's' : ''} · {totalMembers}{' '}
            members · ₦{totalBalance.toLocaleString()} total owed
          </p>
        </div>

        <a
          href={`/dashboard/groups/new?business_id=${
            getCurrentBusinessId() || ''
          }`}
          style={{
            padding: '0.4rem 1rem',
            background: 'var(--color-accent)',
            color: '#fff',
            borderRadius: '6px',
            fontWeight: '500',
            fontSize: '0.85rem',
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.3rem',
          }}
        >
          <Icon name="plus" size={14} stroke="#fff" />
          New Group
        </a>
      </div>

      {/* ─── Stats bar ─── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns:
            'repeat(auto-fit, minmax(120px, 1fr))',
          gap: '0.5rem',
          marginBottom: '1.5rem',
        }}
      >
        <div
          style={{
            background: 'var(--color-card)',
            padding: '0.6rem 0.8rem',
            borderRadius: '8px',
            border: '1px solid var(--color-border)',
          }}
        >
          <div
            style={{
              fontSize: '0.65rem',
              color: 'var(--color-text-muted)',
              textTransform: 'uppercase',
            }}
          >
            Groups
          </div>

          <div
            style={{
              fontWeight: '700',
              fontSize: '1.1rem',
            }}
          >
            {totalGroups}
          </div>
        </div>

        <div
          style={{
            background: 'var(--color-card)',
            padding: '0.6rem 0.8rem',
            borderRadius: '8px',
            border: '1px solid var(--color-border)',
          }}
        >
          <div
            style={{
              fontSize: '0.65rem',
              color: 'var(--color-text-muted)',
              textTransform: 'uppercase',
            }}
          >
            Members
          </div>

          <div
            style={{
              fontWeight: '700',
              fontSize: '1.1rem',
            }}
          >
            {totalMembers}
          </div>
        </div>

        <div
          style={{
            background: 'var(--color-card)',
            padding: '0.6rem 0.8rem',
            borderRadius: '8px',
            border: '1px solid var(--color-border)',
          }}
        >
          <div
            style={{
              fontSize: '0.65rem',
              color: 'var(--color-text-muted)',
              textTransform: 'uppercase',
            }}
          >
            Owed
          </div>

          <div
            style={{
              fontWeight: '700',
              fontSize: '1.1rem',
              color:
                totalBalance > 0
                  ? 'var(--color-danger)'
                  : 'var(--color-success)',
            }}
          >
            ₦{totalBalance.toLocaleString()}
          </div>
        </div>

        <div
          style={{
            background: 'var(--color-card)',
            padding: '0.6rem 0.8rem',
            borderRadius: '8px',
            border: '1px solid var(--color-border)',
          }}
        >
          <div
            style={{
              fontSize: '0.65rem',
              color: 'var(--color-text-muted)',
              textTransform: 'uppercase',
            }}
          >
            Progress
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
            }}
          >
            <div
              style={{
                flex: 1,
                height: '6px',
                background: 'var(--color-bg)',
                borderRadius: '4px',
              }}
            >
              <div
                style={{
                  width: `${progress}%`,
                  height: '100%',
                  background: 'var(--color-success)',
                  borderRadius: '4px',
                }}
              />
            </div>

            <span
              style={{
                fontWeight: '600',
                fontSize: '0.9rem',
              }}
            >
              {progress}%
            </span>
          </div>
        </div>
      </div>

      {/* ─── Groups List ─── */}
      {groups.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '3rem 2rem',
            background: 'var(--color-card)',
            borderRadius: '12px',
            border: '1px dashed var(--color-border)',
          }}
        >
          <span
            style={{
              fontSize: '3rem',
              display: 'block',
              marginBottom: '0.5rem',
            }}
          >
            👥
          </span>

          <h3
            style={{
              fontSize: '1rem',
              fontWeight: '600',
              margin: '0 0 0.3rem',
            }}
          >
            No groups yet
          </h3>

          <p
            style={{
              color: 'var(--color-text-muted)',
              margin: '0 0 1rem',
            }}
          >
            Create your first group to manage Aso-Ebi or bulk orders.
          </p>

          <a
            href={`/dashboard/groups/new?business_id=${
              getCurrentBusinessId() || ''
            }`}
            style={{
              display: 'inline-block',
              padding: '0.6rem 1.5rem',
              background: 'var(--color-accent)',
              color: '#fff',
              borderRadius: '6px',
              textDecoration: 'none',
              fontWeight: '600',
            }}
          >
            Create Group
          </a>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns:
              'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '1rem',
          }}
        >
          {groups.map((group) => {
            const groupProgress =
              group.memberCount > 0
                ? Math.round(
                    (group.deliveredCount /
                      group.memberCount) *
                      100
                  )
                : 0

            const isOverdue =
              group.due_date &&
              new Date(group.due_date) < new Date()

            return (
              <div
                key={group.id}
                style={{
                  background: 'var(--color-card)',
                  borderRadius: '12px',
                  padding: '1rem',
                  border: '1px solid var(--color-border)',
                  boxShadow: 'var(--shadow-sm)',
                  transition: 'box-shadow 0.2s',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                  }}
                >
                  <div
                    style={{
                      fontWeight: '600',
                      fontSize: '1rem',
                      color: 'var(--color-text)',
                    }}
                  >
                    {group.group_name}
                  </div>

                  <span
                    style={{
                      fontSize: '0.65rem',
                      fontWeight: '600',
                      padding: '0.1rem 0.6rem',
                      borderRadius: '12px',
                      background:
                        group.status === 'completed'
                          ? 'var(--color-success)'
                          : 'var(--color-accent)',
                      color: '#fff',
                    }}
                  >
                    {group.status === 'completed'
                      ? 'Completed'
                      : 'Active'}
                  </span>
                </div>

                <div
                  style={{
                    fontSize: '0.8rem',
                    color: 'var(--color-text-muted)',
                    marginTop: '0.2rem',
                  }}
                >
                  {group.coordinator?.name
                    ? `Coordinator: ${group.coordinator.name}`
                    : 'No coordinator'}
                </div>

                {group.due_date && (
                  <div
                    style={{
                      fontSize: '0.75rem',
                      color: isOverdue
                        ? 'var(--color-danger)'
                        : 'var(--color-text-muted)',
                      marginTop: '0.2rem',
                    }}
                  >
                    Due:{' '}
                    {new Date(
                      group.due_date
                    ).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                    {isOverdue && ' ⚠️ Overdue'}
                  </div>
                )}

                <div
                  style={{
                    display: 'flex',
                    gap: '0.5rem',
                    marginTop: '0.3rem',
                    flexWrap: 'wrap',
                  }}
                >
                  <span
                    style={{
                      fontSize: '0.7rem',
                      color: 'var(--color-text-muted)',
                    }}
                  >
                    {group.memberCount} members
                  </span>

                  <span
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: '500',
                      color:
                        group.totalBalance > 0
                          ? 'var(--color-danger)'
                          : 'var(--color-success)',
                    }}
                  >
                    ₦{group.totalBalance.toLocaleString()}{' '}
                    {group.totalBalance > 0
                      ? 'owed'
                      : '✓ paid'}
                  </span>
                </div>

                           <div
                  style={{
                    marginTop: '0.3rem',
                    height: '4px',
                    background: 'var(--color-bg)',
                    borderRadius: '4px',
                  }}
                >
                  <div
                    style={{
                      width: `${groupProgress}%`,
                      height: '100%',
                      background: 'var(--color-success)',
                      borderRadius: '4px',
                    }}
                  />
                </div>

                <div
                  style={{
                    marginTop: '0.8rem',
                    display: 'flex',
                    gap: '0.5rem',
                    flexWrap: 'wrap',
                    borderTop:
                      '1px solid var(--color-border)',
                    paddingTop: '0.5rem',
                  }}
                >
                  <a
                    href={`/dashboard/groups/${group.id}?business_id=${
                      getCurrentBusinessId() || ''
                    }`}
                    style={{
                      fontSize: '0.7rem',
                      color: 'var(--color-text-muted)',
                      textDecoration: 'none',
                      border:
                        '1px solid var(--color-border)',
                      padding: '0.1rem 0.6rem',
                      borderRadius: '4px',
                    }}
                  >
                    View
                  </a>

                  <a
                    href={`/dashboard/groups/${group.id}/edit?business_id=${
                      getCurrentBusinessId() || ''
                    }`}
                    style={{
                      fontSize: '0.7rem',
                      color: 'var(--color-text-muted)',
                      textDecoration: 'none',
                      border:
                        '1px solid var(--color-border)',
                      padding: '0.1rem 0.6rem',
                      borderRadius: '4px',
                    }}
                  >
                    Edit
                  </a>

                  <button
                    onClick={() => handleDelete(group.id)}
                    style={{
                      fontSize: '0.7rem',
                      color: 'var(--color-danger)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '0.1rem 0.6rem',
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
