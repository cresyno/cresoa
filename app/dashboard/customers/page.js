'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../../lib/supabaseClient'
import { Icon } from '../../../components/Icon'

export default function CustomersPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [businessName, setBusinessName] = useState('')
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('last_added')
  const [currentBusinessId, setCurrentBusinessId] = useState(null)

  const loadCustomers = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      // ─── Get business ID from URL ───
      const urlBizId = searchParams.get('business_id')
      let businessId = urlBizId

      if (!businessId || businessId.length < 20) {
        const { data: owned } = await supabase
          .from('businesses')
          .select('id, name')
          .eq('owner_id', user.id)
          .single()
        if (owned) {
          businessId = owned.id
          setBusinessName(owned.name)
        } else {
          const { data: membership } = await supabase
            .from('business_memberships')
            .select('business_id')
            .eq('user_id', user.id)
            .maybeSingle()
          if (membership) {
            businessId = membership.business_id
            const { data: biz } = await supabase
              .from('businesses')
              .select('name')
              .eq('id', businessId)
              .single()
            if (biz) setBusinessName(biz.name)
          }
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

      setCurrentBusinessId(businessId)

      // ─── Fetch customers via API ───
      const response = await fetch(`/api/customers?business_id=${businessId}`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      })

      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.error || 'Failed to load customers')
      }

      // ─── Fetch order stats for each customer ───
      const customersWithStats = await Promise.all(
        (result.customers || []).map(async (c) => {
          const { data: orders } = await supabase
            .from('orders')
            .select('price, amount_paid')
            .eq('customer_id', c.id)

          const orderCount = orders?.length || 0
          const totalSpent = orders?.reduce((sum, o) => sum + (o.amount_paid || 0), 0) || 0
          const balance = orders?.reduce((sum, o) => sum + ((o.price || 0) - (o.amount_paid || 0)), 0) || 0

          // Get last order date
          let lastOrder = null
          if (orders && orders.length > 0) {
            const { data: last } = await supabase
              .from('orders')
              .select('created_at')
              .eq('customer_id', c.id)
              .order('created_at', { ascending: false })
              .limit(1)
            if (last && last.length > 0) {
              lastOrder = last[0].created_at
            }
          }

          return {
            ...c,
            orderCount,
            totalSpent,
            balance,
            lastOrder,
          }
        })
      )

      // ─── Apply sorting ───
      const sorted = [...customersWithStats].sort((a, b) => {
        switch (sortBy) {
          case 'last_added':
            return new Date(b.created_at) - new Date(a.created_at)
          case 'most_orders':
            return b.orderCount - a.orderCount
          case 'most_spent':
            return b.totalSpent - a.totalSpent
          case 'name_asc':
            return a.first_name?.localeCompare(b.first_name || '') || 0
          default:
            return 0
        }
      })

      setCustomers(sorted)
    } catch (err) {
      console.error('Error loading customers:', err)
      setError('Failed to load customers: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCustomers()
  }, [router, searchParams, sortBy])

  const filteredCustomers = customers.filter(c => {
    if (!search) return true
    const q = search.toLowerCase()
    const fullName = `${c.first_name || ''} ${c.last_name || ''}`.toLowerCase()
    return fullName.includes(q) || c.phone?.includes(q)
  })

  // ─── Call handler ───
  const handleCall = (phone) => {
    if (!phone) return
    const cleanPhone = phone.replace(/\D/g, '')
    window.location.href = `tel:${cleanPhone}`
  }

  // ─── Skeleton ───
  if (loading) {
    return (
      <div style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div style={{ width: '140px', height: '24px', background: 'var(--color-border)', borderRadius: '6px' }} />
          <div style={{ width: '80px', height: '20px', background: 'var(--color-border)', borderRadius: '6px' }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem' }}>
          {[1,2,3,4,5,6].map(i => (
            <div key={i} style={{ background: 'var(--color-card)', padding: '1rem', borderRadius: '8px', boxShadow: 'var(--shadow-sm)', animation: 'pulse 1.5s infinite' }}>
              <div style={{ width: '60%', height: '16px', background: 'var(--color-border)', borderRadius: '6px' }} />
              <div style={{ width: '40%', height: '12px', background: 'var(--color-border)', borderRadius: '6px', marginTop: '0.5rem' }} />
              <div style={{ width: '50%', height: '10px', background: 'var(--color-border)', borderRadius: '6px', marginTop: '0.5rem' }} />
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
        <button onClick={loadCustomers} style={{ marginTop: '1rem', padding: '0.5rem 1.5rem', background: 'var(--color-accent)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Retry</button>
      </div>
    )
  }

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto', color: 'var(--color-text)' }}>
      {/* ─── Header ─── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: '600', margin: 0, color: 'var(--color-text)' }}>Customers</h1>
          <p style={{ color: 'var(--color-text-muted)', margin: '0.1rem 0 0', fontSize: '0.85rem' }}>
            {customers.length} customers · {businessName || 'Your business'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{ padding: '0.3rem 0.8rem', borderRadius: '6px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)', fontSize: '0.85rem' }}
          >
            <option value="last_added">Last Added</option>
            <option value="most_orders">Most Orders</option>
            <option value="most_spent">Most Spent</option>
            <option value="name_asc">Name (A–Z)</option>
          </select>
          <a
            href={`/dashboard/customers/new?business_id=${currentBusinessId || ''}`}
            style={{ padding: '0.4rem 1rem', background: 'var(--color-accent)', color: '#fff', borderRadius: '6px', fontWeight: '500', fontSize: '0.85rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
          >
            <Icon name="plus" size={14} stroke="#fff" /> Add Customer
          </a>
        </div>
      </div>

      {/* ─── Search ─── */}
      <input
        type="text"
        placeholder="Search by name or phone..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ width: '100%', maxWidth: '400px', padding: '0.4rem 0.8rem', borderRadius: '6px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)', fontSize: '0.85rem', marginBottom: '1.2rem' }}
      />

      {/* ─── Customers Grid ─── */}
      {filteredCustomers.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem 2rem', background: 'var(--color-card)', borderRadius: '12px', border: '1px dashed var(--color-border)' }}>
          <span style={{ fontSize: '3rem', display: 'block', marginBottom: '0.5rem' }}>👤</span>
          <h3 style={{ fontSize: '1rem', fontWeight: '600', margin: '0 0 0.3rem' }}>No customers found</h3>
          <p style={{ color: 'var(--color-text-muted)', margin: '0 0 1rem' }}>Add your first customer to start tracking orders.</p>
          <a href={`/dashboard/customers/new?business_id=${currentBusinessId || ''}`} style={{ display: 'inline-block', padding: '0.6rem 1.5rem', background: 'var(--color-accent)', color: '#fff', borderRadius: '6px', textDecoration: 'none', fontWeight: '600' }}>Add Customer →</a>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
          {filteredCustomers.map((c) => {
            const fullName = `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'Unnamed'
            const initials = fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

            return (
              <div key={c.id} style={{ background: 'var(--color-card)', borderRadius: '12px', padding: '1rem', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-sm)', transition: 'box-shadow 0.2s' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '0.5rem' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--color-accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '0.9rem', flexShrink: 0 }}>
                    {initials || '?'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '600', color: 'var(--color-text)' }}>{fullName}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                      {c.gender ? c.gender.charAt(0).toUpperCase() + c.gender.slice(1) : ''}
                      {c.age_category ? ` · ${c.age_category}` : ''}
                    </div>
                  </div>
                  {c.phone && (
                    <button
                      onClick={() => handleCall(c.phone)}
                      style={{ background: 'var(--color-success)', color: '#fff', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Icon name="phone" size={14} stroke="#fff" />
                    </button>
                  )}
                </div>

                {c.phone && (
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-text)', marginBottom: '0.2rem' }}>
                    📞 {c.phone}
                  </div>
                )}
                {c.email && (
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.2rem' }}>
                    ✉️ {c.email}
                  </div>
                )}
                {c.address && (
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>
                    📍 {c.address}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '1rem', paddingTop: '0.5rem', borderTop: '1px solid var(--color-border)', marginTop: '0.5rem' }}>
                  <div>
                    <div style={{ fontSize: '0.6rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Orders</div>
                    <div style={{ fontWeight: '600', fontSize: '0.95rem' }}>{c.orderCount || 0}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.6rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Spent</div>
                    <div style={{ fontWeight: '600', fontSize: '0.95rem' }}>₦{c.totalSpent?.toLocaleString() || 0}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.6rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Balance</div>
                    <div style={{ fontWeight: '600', fontSize: '0.95rem', color: c.balance > 0 ? 'var(--color-danger)' : 'var(--color-success)' }}>
                      {c.balance > 0 ? `₦${c.balance.toLocaleString()}` : '✓'}
                    </div>
                  </div>
                </div>

                {c.lastOrder && (
                  <div style={{ fontSize: '0.6rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
                    Last order: {new Date(c.lastOrder).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                )}

                <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem' }}>
                  <a href={`/dashboard/customers/${c.id}?business_id=${currentBusinessId || ''}`} style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textDecoration: 'none', border: '1px solid var(--color-border)', padding: '0.1rem 0.6rem', borderRadius: '4px' }}>View</a>
                  <a href={`/dashboard/customers/${c.id}/edit?business_id=${currentBusinessId || ''}`} style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textDecoration: 'none', border: '1px solid var(--color-border)', padding: '0.1rem 0.6rem', borderRadius: '4px' }}>Edit</a>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
          }
