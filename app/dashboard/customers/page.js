'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../../lib/supabaseClient'
import { Icon } from '../../../components/Icon'
import { Card } from '../../../components/Card'
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
  const [filterType, setFilterType] = useState('all') // 'all' | 'withOrders' | 'outstanding' | 'paid'

  const loadCustomers = async () => {
    setLoading(true)
    setError(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

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
            const { data: biz } = await supabase
              .from('businesses')
              .select('name')
              .eq('id', resolvedBusinessId)
              .single()
            if (biz) setBusinessName(biz.name)
          }
        }
      } else {
        const { data: biz } = await supabase
          .from('businesses')
          .select('name')
          .eq('id', resolvedBusinessId)
          .single()
        if (biz) setBusinessName(biz.name)
      }

      if (!resolvedBusinessId) { router.push('/onboarding'); return }

      setBusinessId(resolvedBusinessId)

      const response = await fetch(
        `/api/customers?business_id=${resolvedBusinessId}`,
        { headers: { Authorization: `Bearer ${session.access_token}` } }
      )

      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Unable to load customers')

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

  // ─── Compute stats ───
  const totalOutstanding = customers.reduce((sum, c) => sum + Math.max(Number(c.balance || 0), 0), 0)
  const activeCustomers = customers.filter(c => c.orderCount > 0).length
  const customersWithBalance = customers.filter(c => Number(c.balance || 0) > 0).length

  // ─── Filtering ───
  const filteredCustomers = useMemo(() => {
    let result = customers
    const query = search.trim().toLowerCase()

    if (query) {
      result = result.filter(customer => {
        const name = `${customer.first_name || ''} ${customer.last_name || ''}`.toLowerCase()
        const phone = customer.phone || ''
        return name.includes(query) || phone.includes(query)
      })
    }

    switch (filterType) {
      case 'withOrders':
        result = result.filter(c => c.orderCount > 0)
        break
      case 'outstanding':
        result = result.filter(c => Number(c.balance || 0) > 0)
        break
      case 'paid':
        result = result.filter(c => Number(c.balance || 0) <= 0 && c.orderCount > 0)
        break
      default: // 'all'
        break
    }

    return result
  }, [customers, search, filterType])

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

      {/* Header – single authoritative */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <div>
          <p style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.05em', margin: 0 }}>
            {businessName || 'YOUR BUSINESS'}
          </p>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0.2rem 0 0', color: 'var(--cresoa-text)' }}>Customers</h1>
          <p style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.85rem', margin: '0.1rem 0 0' }}>
            {customers.length} customer{customers.length === 1 ? '' : 's'}
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

      {/* Summary Cards – interactive */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px,1fr))', gap: '0.5rem', marginBottom: '1rem' }}>
        <button
          onClick={() => setFilterType('all')}
          style={{
            background: filterType === 'all' ? 'var(--cresoa-accent)' : 'var(--cresoa-surface)',
            padding: '0.6rem 0.8rem',
            borderRadius: '8px',
            border: '1px solid var(--cresoa-border)',
            cursor: 'pointer',
            textAlign: 'left',
            transition: 'all 0.15s'
          }}
        >
          <div style={{ fontSize: '0.65rem', color: filterType === 'all' ? '#fff' : 'var(--cresoa-text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Total</div>
          <div style={{ fontWeight: '700', fontSize: '1.1rem', color: filterType === 'all' ? '#fff' : 'var(--cresoa-text)' }}>{customers.length}</div>
        </button>
        <button
          onClick={() => setFilterType(filterType === 'withOrders' ? 'all' : 'withOrders')}
          style={{
            background: filterType === 'withOrders' ? 'var(--cresoa-accent)' : 'var(--cresoa-surface)',
            padding: '0.6rem 0.8rem',
            borderRadius: '8px',
            border: '1px solid var(--cresoa-border)',
            cursor: 'pointer',
            textAlign: 'left',
            transition: 'all 0.15s'
          }}
        >
          <div style={{ fontSize: '0.65rem', color: filterType === 'withOrders' ? '#fff' : 'var(--cresoa-text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>With orders</div>
          <div style={{ fontWeight: '700', fontSize: '1.1rem', color: filterType === 'withOrders' ? '#fff' : 'var(--cresoa-text)' }}>{activeCustomers}</div>
        </button>
        <button
          onClick={() => setFilterType(filterType === 'outstanding' ? 'all' : 'outstanding')}
          style={{
            background: filterType === 'outstanding' ? 'var(--cresoa-accent)' : 'var(--cresoa-surface)',
            padding: '0.6rem 0.8rem',
            borderRadius: '8px',
            border: '1px solid var(--cresoa-border)',
            cursor: 'pointer',
            textAlign: 'left',
            transition: 'all 0.15s'
          }}
        >
          <div style={{ fontSize: '0.65rem', color: filterType === 'outstanding' ? '#fff' : 'var(--cresoa-text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Outstanding</div>
          <div style={{ fontWeight: '700', fontSize: '1.1rem', color: filterType === 'outstanding' ? '#fff' : 'var(--cresoa-danger)' }}>{formatMoney(totalOutstanding)}</div>
        </button>
      </div>

      {/* Outstanding Alert with filter action */}
      {customersWithBalance > 0 && (
        <Card style={{ marginBottom: '1rem', background: 'var(--cresoa-danger-soft)', borderColor: 'var(--cresoa-danger)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Icon name="alert-triangle" size={16} stroke="var(--cresoa-danger)" />
                <span style={{ fontWeight: 700, color: 'var(--cresoa-danger)', fontSize: '0.9rem' }}>Outstanding</span>
              </div>
              <div style={{ fontWeight: 700, fontSize: '1.2rem', color: 'var(--cresoa-danger)' }}>{formatMoney(totalOutstanding)}</div>
              <div style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.8rem' }}>{customersWithBalance} customer{customersWithBalance > 1 ? 's' : ''} need payment</div>
            </div>
            <button
              onClick={() => setFilterType(filterType === 'outstanding' ? 'all' : 'outstanding')}
              style={{ padding: '0.3rem 0.8rem', borderRadius: '20px', border: '1px solid var(--cresoa-danger)', background: 'transparent', color: 'var(--cresoa-danger)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}
            >
              {filterType === 'outstanding' ? 'Show all' : `View ${customersWithBalance} customers →`}
            </button>
          </div>
        </Card>
      )}

      {/* Search + Filter + Sort */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        <div style={{ flex: '1 1 200px', display: 'flex', alignItems: 'center', gap: '8px', height: '40px', padding: '0 12px', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-bg)' }}>
          <Icon name="search" size={16} stroke="var(--cresoa-text-muted)" />
          <input
            type="text"
            placeholder="Search name, phone or order..."
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
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
          style={{ padding: '0.4rem 0.8rem', borderRadius: '6px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-bg)', color: 'var(--cresoa-text)', fontSize: '0.85rem' }}
        >
          <option value="all">All</option>
          <option value="withOrders">With orders</option>
          <option value="outstanding">Outstanding</option>
          <option value="paid">Paid</option>
        </select>
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
          <h3 style={{ margin: '0.5rem 0 0.3rem', fontSize: '1rem' }}>
            {search ? 'No customer found' : filterType !== 'all' ? `No customers match this filter` : 'No customers yet'}
          </h3>
          <p style={{ color: 'var(--cresoa-text-muted)', margin: '0 0 1rem' }}>
            {search ? 'Try another search term.' : filterType !== 'all' ? 'Try a different filter.' : 'Add your first customer to get started.'}
          </p>
          {!search && filterType === 'all' && (
            <button onClick={() => router.push(businessId ? `/dashboard/customers/new?business_id=${businessId}` : '/dashboard/customers/new')} className="cresoa-primary-button">Add customer</button>
          )}
          {search && (
            <button onClick={() => setSearch('')} className="cresoa-primary-button" style={{ background: 'var(--cresoa-primary)' }}>Clear search</button>
          )}
          {filterType !== 'all' && !search && (
            <button onClick={() => setFilterType('all')} className="cresoa-primary-button" style={{ background: 'var(--cresoa-primary)' }}>Show all</button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {filteredCustomers.map(customer => {
            const fullName = `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'Unnamed customer'
            const initials = `${customer.first_name?.charAt(0) || ''}${customer.last_name?.charAt(0) || ''}`.toUpperCase() || '?'
            const hasBalance = Number(customer.balance || 0) > 0

            return (
              <Card key={customer.id} style={{ padding: '0.6rem 1rem' }}>
                <button
                  onClick={() => router.push(`/dashboard/customers/${customer.id}?business_id=${businessId}`)}
                  style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%', padding: 0, border: 0, background: 'transparent', cursor: 'pointer', textAlign: 'left' }}
                >
                  <div style={{ width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, borderRadius: '50%', background: 'var(--cresoa-primary)', color: '#fff', fontSize: '14px', fontWeight: 800 }}>{initials}</div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--cresoa-text)' }}>{fullName}</span>
                      {customer.orderCount > 0 && (
                        <span style={{ padding: '2px 8px', borderRadius: '20px', background: 'rgba(212,165,42,0.14)', color: 'var(--cresoa-text)', fontSize: '0.7rem', fontWeight: 700 }}>
                          {customer.orderCount} order{customer.orderCount > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--cresoa-text-muted)', marginTop: '0.1rem' }}>
                      {customer.phone || customer.email || 'No contact'}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem 0.8rem', fontSize: '0.75rem', color: 'var(--cresoa-text-muted)', marginTop: '0.2rem' }}>
                      <span>{customer.lastOrder ? `Last order · ${formatDate(customer.lastOrder.created_at)}` : 'No orders yet'}</span>
                      {hasBalance && (
                        <span style={{ color: 'var(--cresoa-danger)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                          <Icon name="alert-circle" size={12} stroke="var(--cresoa-danger)" />
                          {formatMoney(customer.balance)} due
                        </span>
                      )}
                      {!hasBalance && customer.orderCount > 0 && (
                        <span style={{ color: 'var(--cresoa-success)', fontWeight: 600 }}>Paid</span>
                      )}
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
