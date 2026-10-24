'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../../lib/supabaseClient'
import { Icon } from '../../../components/Icon'
import { Navigation } from '../../../components/Navigation'
import '../../globals.css'

const formatMoney = value => `₦${Number(value || 0).toLocaleString('en-NG')}`

const formatDate = value => {
  if (!value) return 'No order yet'
  return new Date(value).toLocaleDateString('en-NG', {
    day: 'numeric', month: 'short', year: 'numeric'
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
  const [filterType, setFilterType] = useState('all')

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
        const { data: owned } = await supabase.from('businesses').select('id, name').eq('owner_id', user.id).single()
        if (owned) {
          resolvedBusinessId = owned.id
          setBusinessName(owned.name)
        } else {
          const { data: membership } = await supabase.from('business_memberships').select('business_id').eq('user_id', user.id).maybeSingle()
          if (membership) {
            resolvedBusinessId = membership.business_id
            const { data: biz } = await supabase.from('businesses').select('name').eq('id', resolvedBusinessId).single()
            if (biz) setBusinessName(biz.name)
          }
        }
      } else {
        const { data: biz } = await supabase.from('businesses').select('name').eq('id', resolvedBusinessId).single()
        if (biz) setBusinessName(biz.name)
      }

      if (!resolvedBusinessId) { router.push('/onboarding'); return }
      setBusinessId(resolvedBusinessId)

      const response = await fetch(`/api/customers?business_id=${resolvedBusinessId}`, {
        headers: { Authorization: `Bearer ${session.access_token}` }
      })

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

  useEffect(() => { loadCustomers() }, [searchParams, sortBy])

  const totalOutstanding = customers.reduce((sum, c) => sum + Math.max(Number(c.balance || 0), 0), 0)
  const activeCustomers = customers.filter(c => c.orderCount > 0).length
  const customersWithBalance = customers.filter(c => Number(c.balance || 0) > 0).length

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
      case 'withOrders': result = result.filter(c => c.orderCount > 0); break
      case 'outstanding': result = result.filter(c => Number(c.balance || 0) > 0); break
      case 'paid': result = result.filter(c => Number(c.balance || 0) <= 0 && c.orderCount > 0); break
      default: break
    }

    return result
  }, [customers, search, filterType])

  // ─── SKELETON LOADING STATE ───
  if (loading) {
    return (
      <div className="customers-page">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <div className="skeleton-box" style={{ width: '140px', height: '28px' }} />
          <div className="skeleton-box" style={{ width: '110px', height: '38px' }} />
        </div>
        <div className="customers-metrics-grid">
          {[1,2,3,4].map(i => (
            <div key={i} className="skeleton-box" style={{ height: '80px', borderRadius: '12px' }} />
          ))}
        </div>
        <div style={{ marginTop: '1.5rem', marginBottom: '1rem' }}>
           <div className="skeleton-box" style={{ height: '44px', width: '100%', marginBottom: '10px' }} />
           <div style={{ display: 'flex', gap: '10px' }}>
              <div className="skeleton-box" style={{ height: '40px', flex: 1 }} />
              <div className="skeleton-box" style={{ height: '40px', flex: 1 }} />
           </div>
        </div>
        <div className="customers-list">
          {[1,2,3].map(i => (
            <div key={i} className="skeleton-box" style={{ height: '110px', marginBottom: '12px', borderRadius: '16px' }} />
          ))}
        </div>
        <Navigation businessId={businessId} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="order-page-error">
        <Icon name="alert-circle" size={30} stroke="var(--cresoa-danger)" />
        <h2>Couldn't load customers</h2>
        <p>{error}</p>
        <button onClick={loadCustomers} className="cresoa-primary-button">Try again</button>
      </div>
    )
  }

  return (
    <div className="customers-page">
      <Navigation businessId={businessId} />

      {/* ─── HEADER ─── */}
      <div className="customers-header">
        <div>
          <h1 className="orders-title">Customers</h1>
          <p className="orders-subtitle">
            {customers.length} customer{customers.length === 1 ? '' : 's'}
          </p>
        </div>
        <button
          onClick={() => router.push(businessId ? `/dashboard/customers/new?business_id=${businessId}` : '/dashboard/customers/new')}
          className="cresoa-primary-button"
        >
          <Icon name="plus" size={14} stroke="#fff" /> Add Customer
        </button>
      </div>

      {/* ─── METRICS ─── */}
      <div className="customers-metrics-grid">
        <div className="orders-metric-box">
          <span className="metric-label">Total</span>
          <span className="metric-value">{customers.length}</span>
        </div>
        <div className="orders-metric-box">
          <span className="metric-label">With Orders</span>
          <span className="metric-value">{activeCustomers}</span>
        </div>
        <div className="orders-metric-box">
          <span className="metric-label">Owing</span>
          <span className="metric-value text-danger">{customersWithBalance}</span>
        </div>
        <div className="orders-metric-box">
          <span className="metric-label">Outstanding</span>
          <span className="metric-value text-danger" style={{ fontSize: '1.1rem' }}>{formatMoney(totalOutstanding)}</span>
        </div>
      </div>

      {/* ─── OUTSTANDING ALERT ─── */}
      {customersWithBalance > 0 && (
        <div className="outstanding-alert">
          <div>
            <div className="outstanding-title">
              <Icon name="alert-triangle" size={16} stroke="var(--color-danger)" />
              Outstanding Balance
            </div>
            <div className="outstanding-amount">{formatMoney(totalOutstanding)}</div>
            <div className="outstanding-subtitle">{customersWithBalance} customer{customersWithBalance > 1 ? 's' : ''} need payment</div>
          </div>
          <button
            onClick={() => setFilterType(filterType === 'outstanding' ? 'all' : 'outstanding')}
            className="outstanding-btn"
          >
            {filterType === 'outstanding' ? 'Show All' : `View ${customersWithBalance} Customers`}
          </button>
        </div>
      )}

      {/* ─── FILTERS ─── */}
      <div className="orders-filters">
        <input
          type="text"
          className="orders-search-input"
          placeholder="Search by name or phone..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <div className="orders-filter-row">
          <select value={filterType} onChange={e => setFilterType(e.target.value)} className="orders-select">
            <option value="all">All Customers</option>
            <option value="withOrders">With Orders</option>
            <option value="outstanding">Outstanding</option>
            <option value="paid">Paid</option>
          </select>
          <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="orders-select">
            <option value="last_added">Recently Added</option>
            <option value="most_orders">Most Orders</option>
            <option value="most_spent">Highest Payments</option>
            <option value="name_asc">Name A–Z</option>
          </select>
        </div>
      </div>

      {/* ─── CUSTOMER LIST ─── */}
      {filteredCustomers.length === 0 ? (
        <div className="orders-empty">
          <Icon name={search ? 'search-x' : 'users'} size={30} stroke="var(--color-primary)" />
          <h3>{search ? 'No customer found' : filterType !== 'all' ? 'No customers match this filter' : 'No customers yet'}</h3>
          <p>{search ? 'Try another search term.' : filterType !== 'all' ? 'Try a different filter.' : 'Add your first customer to get started.'}</p>
          {!search && filterType === 'all' && (
            <button onClick={() => router.push(businessId ? `/dashboard/customers/new?business_id=${businessId}` : '/dashboard/customers/new')} className="cresoa-primary-button">Add Customer</button>
          )}
          {search && (
            <button onClick={() => setSearch('')} className="cresoa-primary-button">Clear Search</button>
          )}
          {filterType !== 'all' && !search && (
            <button onClick={() => setFilterType('all')} className="cresoa-primary-button">Show All</button>
          )}
        </div>
      ) : (
        <div className="customers-list">
          {filteredCustomers.map(customer => {
            const fullName = `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'Unnamed customer'
            const initials = `${customer.first_name?.charAt(0) || ''}${customer.last_name?.charAt(0) || ''}`.toUpperCase() || '?'
            const hasBalance = Number(customer.balance || 0) > 0

            return (
              <div 
                key={customer.id} 
                className="customer-list-card"
                onClick={() => router.push(`/dashboard/customers/${customer.id}?business_id=${businessId}`)}
              >
                <div className="customer-card-top">
                  <div className="customer-card-info">
                    <div className="customer-card-avatar">{initials}</div>
                    <div>
                      <h3 className="customer-card-name">{fullName}</h3>
                      <p className="customer-card-phone">{customer.phone || customer.email || 'No contact'}</p>
                    </div>
                  </div>
                  
                  <div className="customer-card-stats">
                    {customer.orderCount > 0 && (
                      <span className="customer-order-badge">
                        {customer.orderCount} order{customer.orderCount > 1 ? 's' : ''}
                      </span>
                    )}
                    {hasBalance ? (
                      <span className="customer-balance-due">{formatMoney(customer.balance)} due</span>
                    ) : customer.orderCount > 0 ? (
                      <span className="customer-balance-paid">✓ Paid</span>
                    ) : null}
                  </div>
                </div>

                <div className="customer-card-bottom">
                  <span>{customer.lastOrder ? `Last order: ${formatDate(customer.lastOrder.created_at)}` : 'No orders yet'}</span>
                  <Icon name="chevron-right" size={16} stroke="var(--cresoa-text-muted)" />
                </div>
              </div>
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
