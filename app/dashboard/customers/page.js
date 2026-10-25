'use client'

import { useEffect, useMemo, useState, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../../lib/supabaseClient'
import { Navigation } from '../../../components/Navigation'
import '../../globals.css'

// ─── EMBEDDED ICONS ───
const SvgIcons = {
  Search: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  ),
  X: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  ChevronDown: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  ),
  ChevronRight: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  ),
  AlertTriangle: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  Users: () => (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  Plus: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

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
  const [businessId, setBusinessId] = useState(null)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('last_added')
  const [filterType, setFilterType] = useState('all')

  // Custom Dropdown State
  const [showFilterMenu, setShowFilterMenu] = useState(false)
  const [showSortMenu, setShowSortMenu] = useState(false)
  const filterMenuRef = useRef(null)
  const sortMenuRef = useRef(null)

  // Handle click outside for dropdowns
  useEffect(() => {
    function handleClickOutside(event) {
      if (filterMenuRef.current && !filterMenuRef.current.contains(event.target)) setShowFilterMenu(false)
      if (sortMenuRef.current && !sortMenuRef.current.contains(event.target)) setShowSortMenu(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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
        const { data: owned } = await supabase.from('businesses').select('id').eq('owner_id', user.id).single()
        if (owned) {
          resolvedBusinessId = owned.id
        }
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
            .select('id, price, amount_paid, created_at')
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
        if (sortBy === 'name_asc') {
          const nameA = a.name || `${a.first_name} ${a.last_name}`
          const nameB = b.name || `${b.first_name} ${b.last_name}`
          return nameA.localeCompare(nameB)
        }
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
        const name = (customer.name || `${customer.first_name || ''} ${customer.last_name || ''}`).toLowerCase()
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

  // Robust Initials Generator
  const getInitials = (customer) => {
    const name = customer.name || `${customer.first_name || ''} ${customer.last_name || ''}`.trim()
    if (!name) return '?'
    const parts = name.split(/\s+/)
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
  }

  const filterOptions = [
    { label: 'All Customers', value: 'all' },
    { label: 'With Orders', value: 'withOrders' },
    { label: 'Outstanding', value: 'outstanding' },
    { label: 'Paid', value: 'paid' }
  ]

  const sortOptions = [
    { label: 'Recently Added', value: 'last_added' },
    { label: 'Most Orders', value: 'most_orders' },
    { label: 'Highest Payments', value: 'most_spent' },
    { label: 'Name A–Z', value: 'name_asc' }
  ]

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
      <div className="order-page-error" style={{ paddingTop: '4rem', textAlign: 'center' }}>
        <p style={{ color: 'var(--color-danger)' }}>{error}</p>
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
          <SvgIcons.Plus /> Add Customer
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
          <div className="outstanding-content">
            <div className="outstanding-title">
              <SvgIcons.AlertTriangle />
              Outstanding Balance
            </div>
            <div className="outstanding-amount">{formatMoney(totalOutstanding)}</div>
            <div className="outstanding-subtitle">{customersWithBalance} customer{customersWithBalance > 1 ? 's' : ''} need payment</div>
          </div>
          <button
            onClick={() => setFilterType(filterType === 'outstanding' ? 'all' : 'outstanding')}
            className="outstanding-btn"
          >
            {filterType === 'outstanding' ? 'Show All' : `View ${customersWithBalance}`}
          </button>
        </div>
      )}

      {/* ─── FILTERS ─── */}
      <div className="orders-filters">
        <div className="custom-search-wrapper">
          <span className="search-icon"><SvgIcons.Search /></span>
          <input
            type="text"
            className="custom-search-input"
            placeholder="Search by name or phone..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button className="search-clear-btn" onClick={() => setSearch('')}>
              <SvgIcons.X />
            </button>
          )}
        </div>
        
        <div className="orders-filter-row">
          {/* CUSTOM FILTER DROPDOWN */}
          <div className="custom-select-wrapper" ref={filterMenuRef}>
            <button className="custom-select-btn" onClick={() => { setShowFilterMenu(!showFilterMenu); setShowSortMenu(false); }}>
              {filterOptions.find(o => o.value === filterType)?.label}
              <SvgIcons.ChevronDown />
            </button>
            {showFilterMenu && (
              <div className="custom-dropdown-menu">
                {filterOptions.map(opt => (
                  <button
                    key={opt.value}
                    className={`custom-dropdown-item ${filterType === opt.value ? 'active' : ''}`}
                    onClick={() => { setFilterType(opt.value); setShowFilterMenu(false); }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* CUSTOM SORT DROPDOWN */}
          <div className="custom-select-wrapper" ref={sortMenuRef}>
            <button className="custom-select-btn" onClick={() => { setShowSortMenu(!showSortMenu); setShowFilterMenu(false); }}>
              {sortOptions.find(o => o.value === sortBy)?.label}
              <SvgIcons.ChevronDown />
            </button>
            {showSortMenu && (
              <div className="custom-dropdown-menu">
                {sortOptions.map(opt => (
                  <button
                    key={opt.value}
                    className={`custom-dropdown-item ${sortBy === opt.value ? 'active' : ''}`}
                    onClick={() => { setSortBy(opt.value); setShowSortMenu(false); }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── CUSTOMER LIST ─── */}
      {filteredCustomers.length === 0 ? (
        <div className="orders-empty">
          <div className="empty-icon"><SvgIcons.Users /></div>
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
            const fullName = customer.name || `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'Unnamed customer'
            const hasBalance = Number(customer.balance || 0) > 0

            return (
              <div
                key={customer.id}
                className="customer-list-card"
                onClick={() => router.push(`/dashboard/customers/${customer.id}?business_id=${businessId}`)}
              >
                <div className="customer-card-top">
                  <div className="customer-card-info">
                    <div className="customer-card-avatar">{getInitials(customer)}</div>
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
                  <SvgIcons.ChevronRight />
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
