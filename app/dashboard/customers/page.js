'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../../lib/supabaseClient'
import { Icon } from '../../../components/Icon'
import { Card } from '../../../components/Card'
import { SectionHeader } from '../../../components/SectionHeader'
import { Navigation } from '../../../components/Navigation'
import '../../globals.css'

const formatMoney = value =>
  `₦${Number(value || 0).toLocaleString('en-NG')}`

const formatDate = value => {
  if (!value) return 'No order yet'
  return new Date(value).toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}

export default function CustomersPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [businessName, setBusinessName] = useState('')
  const [businessId, setBusinessId] = useState(null)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('last_added')

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

      const urlBusinessId = searchParams.get('business_id')
      let resolvedBusinessId = urlBusinessId

      if (!resolvedBusinessId || resolvedBusinessId.length < 20) {
        const { data: owned } = await supabase
          .from('businesses')
          .select('id, name')
          .eq('owner_id', user.id)
          .single()

        if (owned) {
          resolvedBusinessId = owned.id
          setBusinessName(owned.name)
        } else {
          const { data: membership } = await supabase
            .from('business_memberships')
            .select('business_id')
            .eq('user_id', user.id)
            .maybeSingle()

          if (membership) {
            resolvedBusinessId = membership.business_id
            const { data: business } = await supabase
              .from('businesses')
              .select('name')
              .eq('id', resolvedBusinessId)
              .single()
            if (business) setBusinessName(business.name)
          }
        }
      } else {
        const { data: business } = await supabase
          .from('businesses')
          .select('name')
          .eq('id', resolvedBusinessId)
          .single()
        if (business) setBusinessName(business.name)
      }

      if (!resolvedBusinessId) {
        router.push('/onboarding')
        return
      }

      setBusinessId(resolvedBusinessId)

      const response = await fetch(
        `/api/customers?business_id=${resolvedBusinessId}`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`
          }
        }
      )

      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.error || 'Unable to load customers')
      }

      const customersWithStats = await Promise.all(
        (result.customers || []).map(async customer => {
          const { data: orders } = await supabase
            .from('orders')
            .select('id, price, amount_paid, created_at, current_status')
            .eq('customer_id', customer.id)

          const orderList = orders || []
          const orderCount = orderList.length
          const totalSpent = orderList.reduce((sum, o) => sum + Number(o.amount_paid || 0), 0)
          const balance = orderList.reduce((sum, o) => sum + Number(o.price || 0) - Number(o.amount_paid || 0), 0)
          const lastOrder = [...orderList].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0] || null

          return { ...customer, orderCount, totalSpent, balance, lastOrder }
        })
      )

      const sorted = [...customersWithStats].sort((a, b) => {
        if (sortBy === 'most_orders') return b.orderCount - a.orderCount
        if (sortBy === 'most_spent') return b.totalSpent - a.totalSpent
        if (sortBy === 'name_asc') return `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`)
        return new Date(b.created_at) - new Date(a.created_at)
      })

      setCustomers(sorted)
    } catch (err) {
      console.error('Customers page error:', err)
      setError(err?.message || 'Something went wrong while loading customers.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCustomers()
  }, [searchParams, sortBy])

  const filteredCustomers = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return customers
    return customers.filter(customer => {
      const name = `${customer.first_name || ''} ${customer.last_name || ''}`.toLowerCase()
      const phone = customer.phone || ''
      return name.includes(query) || phone.includes(query)
    })
  }, [customers, search])

  const totalOutstanding = customers.reduce((sum, c) => sum + Math.max(Number(c.balance || 0), 0), 0)
  const activeCustomers = customers.filter(c => c.orderCount > 0).length

  // ─── Skeleton ───
  if (loading) {
    return (
      <main style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto', paddingBottom: '80px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div style={{ width: '140px', height: '24px', background: 'var(--cresoa-border)', borderRadius: '6px' }} />
          <div style={{ width: '100px', height: '32px', background: 'var(--cresoa-border)', borderRadius: '6px' }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px,1fr))', gap: '0.8rem', marginBottom: '1rem' }}>
          {[1,2,3].map(i => (
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
      </main>
    )
  }

  if (error) {
    return (
      <main style={{ minHeight: '70vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', textAlign: 'center' }}>
        <Icon name="alert-circle" size={30} stroke="var(--cresoa-danger)" />
        <h2 style={{ margin: '14px 0 7px', color: 'var(--cresoa-text)', fontSize: '19px' }}>Couldn't load customers</h2>
        <p style={{ maxWidth: '360px', margin: '0 0 18px', color: 'var(--cresoa-text-muted)', fontSize: '13px' }}>{error}</p>
        <button onClick={loadCustomers} style={{ padding: '12px 18px', border: 0, borderRadius: '12px', background: 'var(--cresoa-accent)', color: '#fff', fontSize: '12px', fontWeight: 800, cursor: 'pointer' }}>Try again</button>
      </main>
    )
  }

  return (
    <main style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto', paddingBottom: '80px' }}>
      <Navigation businessId={businessId} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: '600', margin: 0, color: 'var(--cresoa-text)' }}>Customers</h1>
          <p style={{ color: 'var(--cresoa-text-muted)', margin: '0.1rem 0 0', fontSize: '0.85rem' }}>
            {customers.length} customer{customers.length === 1 ? '' : 's'} · {activeCustomers} with orders
          </p>
        </div>
        <button
          onClick={() => router.push(businessId ? `/dashboard/customers/new?business_id=${businessId}` : '/dashboard/customers/new')}
          className="cresoa-primary-button"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', textDecoration: 'none' }}
        >
          <Icon name="plus" size={14} stroke="#fff" /> Add customer
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px,1fr))', gap: '0.5rem', marginBottom: '1rem' }}>
        <div style={{ background: 'var(--cresoa-surface)', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)' }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--cresoa-text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Total</div>
          <div style={{ fontWeight: '700', fontSize: '1.1rem' }}>{customers.length}</div>
        </div>
        <div style={{ background: 'var(--cresoa-surface)', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)' }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--cresoa-text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Active</div>
          <div style={{ fontWeight: '700', fontSize: '1.1rem' }}>{activeCustomers}</div>
        </div>
        <div style={{ background: 'var(--cresoa-surface)', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)' }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--cresoa-text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Outstanding</div>
          <div style={{ fontWeight: '700', fontSize: '1.1rem', color: 'var(--cresoa-danger)' }}>{formatMoney(totalOutstanding)}</div>
        </div>
      </div>

      {/* Search and Sort */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        <div style={{ flex: '1 1 200px', display: 'flex', alignItems: 'center', gap: '8px', height: '40px', padding: '0 12px', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-bg)' }}>
          <Icon name="search" size={16} stroke="var(--cresoa-text-muted)" />
          <input
            type="text"
            placeholder="Search name or phone..."
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
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
          style={{ padding: '0.4rem 0.8rem', borderRadius: '6px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-bg)', color: 'var(--cresoa-text)', fontSize: '0.85rem' }}
        >
          <option value="last_added">Recently added</option>
          <option value="most_orders">Most orders</option>
          <option value="most_spent">Highest payments</option>
          <option value="name_asc">Name A–Z</option>
        </select>
      </div>

      {/* Customer List */}
      {filteredCustomers.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem 2rem', background: 'var(--cresoa-surface)', borderRadius: '12px', border: '1px dashed var(--cresoa-border)' }}>
          <Icon name={search ? 'search-x' : 'users'} size={30} stroke="var(--cresoa-primary)" />
          <h3 style={{ margin: '0.5rem 0 0.3rem', fontSize: '1rem' }}>{search ? 'No customer found' : 'No customers yet'}</h3>
          <p style={{ color: 'var(--cresoa-text-muted)', margin: '0 0 1rem' }}>{search ? 'Try another name or phone number.' : 'Add your first customer to get started.'}</p>
          {!search ? (
            <button onClick={() => router.push(businessId ? `/dashboard/customers/new?business_id=${businessId}` : '/dashboard/customers/new')} className="cresoa-primary-button">Add customer</button>
          ) : (
            <button onClick={() => setSearch('')} className="cresoa-primary-button" style={{ background: 'var(--cresoa-primary)' }}>Clear search</button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {filteredCustomers.map(customer => {
            const fullName = `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'Unnamed customer'
            const initials = `${customer.first_name?.charAt(0) || ''}${customer.last_name?.charAt(0) || ''}`.toUpperCase() || '?'
            const hasBalance = Number(customer.balance || 0) > 0

            return (
              <Card key={customer.id} style={{ padding: '1rem' }}>
                <button
                  onClick={() => router.push(`/dashboard/customers/${customer.id}`)}
                  style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%', padding: 0, border: 0, background: 'transparent', cursor: 'pointer', textAlign: 'left' }}
                >
                  <div style={{ width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, borderRadius: '50%', background: 'var(--cresoa-primary)', color: '#fff', fontSize: '15px', fontWeight: 900 }}>{initials}</div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                      <span style={{ fontWeight: '600', fontSize: '0.95rem', color: 'var(--cresoa-text)' }}>{fullName}</span>
                      {customer.orderCount > 0 && (
                        <span style={{ padding: '3px 7px', borderRadius: '20px', background: 'rgba(212,165,42,0.14)', color: 'var(--cresoa-text)', fontSize: '9px', fontWeight: 800 }}>{customer.orderCount} order{customer.orderCount > 1 ? 's' : ''}</span>
                      )}
                    </div>
                    <div style={{ marginTop: '0.2rem', display: 'flex', flexWrap: 'wrap', gap: '0.3rem 0.8rem', fontSize: '0.8rem', color: 'var(--cresoa-text-muted)' }}>
                      <span>{customer.phone || customer.email || 'No contact'}</span>
                      <span>·</span>
                      <span>{customer.lastOrder ? `Last order ${formatDate(customer.lastOrder.created_at)}` : 'No orders yet'}</span>
                      {hasBalance && <span style={{ color: 'var(--cresoa-danger)', fontWeight: '600' }}>{formatMoney(customer.balance)} due</span>}
                      {!hasBalance && customer.orderCount > 0 && <span style={{ color: 'var(--cresoa-success)', fontWeight: '600' }}>Paid</span>}
                    </div>
                  </div>
                  <Icon name="chevron-right" size={18} stroke="var(--cresoa-text-muted)" />
                </button>
              </Card>
            )
          })}
        </div>
      )}

      <div style={{ marginTop: '2rem' }}>
        <Navigation businessId={businessId} />
      </div>
    </main>
  )
                                }
