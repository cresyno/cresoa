'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../../lib/supabaseClient'
import { getCurrentBusinessId } from '../../../lib/getBusinessId'
import { Icon } from '../../../components/Icon'

export default function GroupsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [businessName, setBusinessName] = useState('')
  const [search, setSearch] = useState('')

  const loadGroups = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      let businessId = getCurrentBusinessId()
      if (!businessId) {
        const { data: owned } = await supabase
          .from('businesses')
          .select('id, name')
          .eq('owner_id', user.id)
          .single()
        if (owned) {
          businessId = owned.id
          setBusinessName(owned.name)
        }
      } else {
        const { data: biz } = await supabase
          .from('businesses')
          .select('name')
          .eq('id', businessId)
          .single()
        if (biz) setBusinessName(biz.name)
      }

      if (!businessId) {
        router.push('/onboarding')
        return
      }

      // Fetch groups with their orders and customer details
      const { data, error } = await supabase
        .from('group_orders')
        .select('*, customers:coordinator_customer_id(name, phone)')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Also fetch each group's orders count and total balance
      const groupsWithDetails = await Promise.all(
        (data || []).map(async (g) => {
          const { data: orders, error: ordersError } = await supabase
            .from('orders')
            .select('price, amount_paid')
            .eq('group_order_id', g.id)
          if (ordersError) return { ...g, orderCount: 0, totalBalance: 0 }
          const total = orders.reduce((sum, o) => sum + (o.price || 0) - (o.amount_paid || 0), 0)
          return { ...g, orderCount: orders.length, totalBalance: total }
        })
      )

      setGroups(groupsWithDetails || [])
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

  const filteredGroups = groups.filter(g => {
    if (!search) return true
    const q = search.toLowerCase()
    return g.group_name?.toLowerCase().includes(q) ||
           g.customers?.name?.toLowerCase().includes(q)
  })

  // ─── Skeleton ───
  if (loading) {
    return (
      <div style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div style={{ width: '140px', height: '24px', background: 'var(--color-border)', borderRadius: '6px' }} />
          <div style={{ width: '80px', height: '20px', background: 'var(--color-border)', borderRadius: '6px' }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
          {[1,2,3].map(i => (
            <div key={i} style={{ background: 'var(--color-card)', padding: '1rem', borderRadius: '8px', boxShadow: 'var(--shadow-sm)', animation: 'pulse 1.5s infinite' }}>
              <div style={{ width: '60%', height: '16px', background: 'var(--color-border)', borderRadius: '6px' }} />
              <div style={{ width: '40%', height: '12px', background: 'var(--color-border)', borderRadius: '6px', marginTop: '0.5rem' }} />
              <div style={{ width: '30%', height: '12px', background: 'var(--color-border)', borderRadius: '6px', marginTop: '0.5rem' }} />
            </div>
          ))}
        </div>
        <style>{`@keyframes pulse { 0% { opacity: 0.6; } 50% { opacity: 1; } 100% { opacity: 0.6; } }`}</style>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-danger)' }}>
        {error}
        <button onClick={loadGroups} style={{ marginTop: '1rem', padding: '0.5rem 1.5rem', background: 'var(--color-accent)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Retry</button>
      </div>
    )
  }

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto', color: 'var(--color-text)' }}>
      {/* ─── Header ─── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: '600', margin: 0, color: 'var(--color-text)' }}>Group Orders</h1>
          {businessName && <p style={{ color: 'var(--color-text-muted)', margin: '0.1rem 0 0', fontSize: '0.85rem' }}>{groups.length} groups</p>}
        </div>
        <a href={`/dashboard/groups/new?business_id=${getCurrentBusinessId() || ''}`} style={{ padding: '0.4rem 1rem', background: 'var(--color-accent)', color: '#fff', borderRadius: '6px', fontWeight: '500', fontSize: '0.85rem', textDecoration: 'none' }}>
          <Icon name="plus" size={14} stroke="#fff" style={{ verticalAlign: 'middle', marginRight: '0.3rem' }} /> New Group
        </a>
      </div>

      {/* ─── Search ─── */}
      <input
        type="text"
        placeholder="Search by group name or coordinator..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ width: '100%', maxWidth: '400px', padding: '0.4rem 0.8rem', borderRadius: '6px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)', fontSize: '0.85rem', marginBottom: '1rem' }}
      />

      {/* ─── Groups List ─── */}
      {filteredGroups.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2.5rem', background: 'var(--color-card)', borderRadius: '12px', border: '1px dashed var(--color-border)' }}>
          <p style={{ color: 'var(--color-text-muted)', margin: '0 0 0.5rem' }}>No group orders yet</p>
          <a href={`/dashboard/groups/new?business_id=${getCurrentBusinessId() || ''}`} style={{ color: 'var(--color-accent)', fontWeight: '500', textDecoration: 'none' }}>Create first group →</a>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
          {filteredGroups.map(g => (
            <div key={g.id} style={{ background: 'var(--color-card)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ fontWeight: '500', fontSize: '0.95rem', color: 'var(--color-text)' }}>{g.group_name}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                Coordinator: {g.customers?.name || 'Unnamed'}
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.3rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>{g.orderCount} members</span>
                <span style={{ fontSize: '0.7rem', fontWeight: '500', color: g.totalBalance > 0 ? 'var(--color-danger)' : 'var(--color-success)' }}>
                  ₦{g.totalBalance.toLocaleString()} {g.totalBalance > 0 ? 'remaining' : '✓ paid'}
                </span>
              </div>
              <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem' }}>
                <a href={`/dashboard/groups/${g.id}?business_id=${getCurrentBusinessId() || ''}`} style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textDecoration: 'none', border: '1px solid var(--color-border)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>View</a>
                <a href={`/dashboard/groups/${g.id}/edit?business_id=${getCurrentBusinessId() || ''}`} style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textDecoration: 'none', border: '1px solid var(--color-border)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>Edit</a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
                  }
