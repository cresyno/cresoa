'use client'

import { useEffect, useMemo, useState, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../../lib/supabaseClient'
import { Navigation } from '../../../components/Navigation'
import '../../globals.css'

// ─── EMBEDDED ICONS ───
const SvgIcons = {
  Search: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  ),
  X: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
  Users: () => (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  Plus: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
  AlertTriangle: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
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
        if (owned) resolvedBusinessId = owned.id
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

  if (loading) {
    return (
      <div style={{ padding: '1rem', background: '#FFFFFF', minHeight: '100vh', fontFamily: "'Inter', sans-serif" }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
          <div style={{ width: '140px', height: '28px', background: '#F4F6F8', borderRadius: '8px' }} />
          <div style={{ width: '110px', height: '38px', background: '#F4F6F8', borderRadius: '8px' }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
          {[1,2,3,4].map(i => <div key={i} style={{ height: '80px', background: '#F4F6F8', borderRadius: '12px' }} />)}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {[1,2,3].map(i => <div key={i} style={{ height: '100px', background: '#F4F6F8', borderRadius: '16px' }} />)}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: '4rem 2rem', textAlign: 'center', color: '#FF3B30', fontFamily: "'Inter', sans-serif" }}>
        <p style={{ marginBottom: '1rem', fontWeight: 600 }}>{error}</p>
        <button onClick={loadCustomers} style={{ background: '#0F2B4A', color: '#FFF', padding: '12px 24px', borderRadius: '8px', border: 'none', fontWeight: 700, cursor: 'pointer' }}>Try again</button>
      </div>
    )
  }

  return (
    <div style={{ background: '#FFFFFF', minHeight: '100vh', padding: '1rem', fontFamily: "'Inter', sans-serif", color: '#0F2B4A', paddingBottom: '100px' }}>
      <Navigation businessId={businessId} />

      {/* ─── HEADER ─── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem', borderBottom: '2px solid #0F2B4A', paddingBottom: '1.5rem', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 800, letterSpacing: '-0.5px' }}>Customers</h1>
          <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.95rem', color: '#555' }}>
            {customers.length} customer{customers.length === 1 ? '' : 's'} in your database.
          </p>
        </div>
        <button
          onClick={() => router.push(businessId ? `/dashboard/customers/new?business_id=${businessId}` : '/dashboard/customers/new')}
          style={{ background: '#0F2B4A', color: '#FFFFFF', border: 'none', padding: '12px 24px', borderRadius: '8px', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 4px 15px rgba(15,43,74,0.2)', width: 'fit-content' }}
        >
          <SvgIcons.Plus /> Add Customer
        </button>
      </div>

      {/* ─── METRICS ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{ background: '#FFFFFF', padding: '1.25rem', borderRadius: '12px', border: '1px solid #EAEAEA', boxShadow: '0 4px 15px rgba(0,0,0,0.02)' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#666' }}>Total</span>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0F2B4A', marginTop: '0.2rem' }}>{customers.length}</div>
        </div>
        <div style={{ background: '#FFFFFF', padding: '1.25rem', borderRadius: '12px', border: '1px solid #EAEAEA', boxShadow: '0 4px 15px rgba(0,0,0,0.02)' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#666' }}>With Orders</span>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0F2B4A', marginTop: '0.2rem' }}>{activeCustomers}</div>
        </div>
        <div style={{ background: '#FFFFFF', padding: '1.25rem', borderRadius: '12px', border: '1px solid #EAEAEA', boxShadow: '0 4px 15px rgba(0,0,0,0.02)' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#666' }}>Owing</span>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#FF3B30', marginTop: '0.2rem' }}>{customersWithBalance}</div>
        </div>
        <div style={{ background: '#FFFFFF', padding: '1.25rem', borderRadius: '12px', border: '1px solid #EAEAEA', boxShadow: '0 4px 15px rgba(0,0,0,0.02)' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#666' }}>Outstanding</span>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#FF3B30', marginTop: '0.2rem' }}>{formatMoney(totalOutstanding)}</div>
        </div>
      </div>

      {/* ─── OUTSTANDING ALERT ─── */}
      {customersWithBalance > 0 && (
        <div style={{ background: 'linear-gradient(135deg, #0F2B4A, #1A4685)', padding: '1.5rem', borderRadius: '16px', color: '#FFF', display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem', fontWeight: 800 }}>
            <SvgIcons.AlertTriangle /> Outstanding Balance
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#D4AF37' }}>{formatMoney(totalOutstanding)}</div>
              <div style={{ fontSize: '0.85rem', color: '#A0B2C6', marginTop: '4px' }}>{customersWithBalance} customer{customersWithBalance > 1 ? 's' : ''} need payment</div>
            </div>
            <button
              onClick={() => setFilterType(filterType === 'outstanding' ? 'all' : 'outstanding')}
              style={{ background: '#D4AF37', color: '#0F2B4A', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}
            >
              {filterType === 'outstanding' ? 'Show All' : `View ${customersWithBalance}`}
            </button>
          </div>
        </div>
      )}

      {/* ─── FILTERS ─── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', background: '#F8F9FA', borderRadius: '10px', padding: '0 1rem', border: '1px solid #EAEAEA', width: '100%' }}>
          <span style={{ color: '#999' }}><SvgIcons.Search /></span>
          <input
            type="text"
            placeholder="Search by name or phone..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ border: 'none', background: 'transparent', padding: '14px 10px', outline: 'none', width: '100%', fontSize: '0.95rem' }}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#999', display: 'flex' }}>
              <SvgIcons.X />
            </button>
          )}
        </div>
        
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* CUSTOM FILTER DROPDOWN */}
          <div style={{ position: 'relative', flex: 1, minWidth: '140px' }} ref={filterMenuRef}>
            <button onClick={() => { setShowFilterMenu(!showFilterMenu); setShowSortMenu(false); }} style={{ width: '100%', padding: '12px 16px', borderRadius: '8px', background: '#FFFFFF', border: '1px solid #EAEAEA', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, color: '#0F2B4A' }}>
              {filterOptions.find(o => o.value === filterType)?.label}
              <SvgIcons.ChevronDown />
            </button>
            {showFilterMenu && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px', background: '#FFFFFF', border: '1px solid #EAEAEA', borderRadius: '8px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', zIndex: 10, overflow: 'hidden' }}>
                {filterOptions.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => { setFilterType(opt.value); setShowFilterMenu(false); }}
                    style={{ width: '100%', textAlign: 'left', padding: '12px 16px', background: filterType === opt.value ? '#F4F6F8' : '#FFF', border: 'none', borderBottom: '1px solid #F0F0F0', cursor: 'pointer', fontSize: '0.9rem', color: '#0F2B4A', fontWeight: filterType === opt.value ? 700 : 500 }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* CUSTOM SORT DROPDOWN */}
          <div style={{ position: 'relative', flex: 1, minWidth: '140px' }} ref={sortMenuRef}>
            <button onClick={() => { setShowSortMenu(!showSortMenu); setShowFilterMenu(false); }} style={{ width: '100%', padding: '12px 16px', borderRadius: '8px', background: '#FFFFFF', border: '1px solid #EAEAEA', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, color: '#0F2B4A' }}>
              {sortOptions.find(o => o.value === sortBy)?.label}
              <SvgIcons.ChevronDown />
            </button>
            {showSortMenu && (
              <div style={{ position: 'absolute', top: '100%', right: 0, left: 0, marginTop: '4px', background: '#FFFFFF', border: '1px solid #EAEAEA', borderRadius: '8px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', zIndex: 10, overflow: 'hidden' }}>
                {sortOptions.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => { setSortBy(opt.value); setShowSortMenu(false); }}
                    style={{ width: '100%', textAlign: 'left', padding: '12px 16px', background: sortBy === opt.value ? '#F4F6F8' : '#FFF', border: 'none', borderBottom: '1px solid #F0F0F0', cursor: 'pointer', fontSize: '0.9rem', color: '#0F2B4A', fontWeight: sortBy === opt.value ? 700 : 500 }}
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
        <div style={{ textAlign: 'center', padding: '4rem 1rem', background: '#F8F9FA', borderRadius: '16px', border: '2px dashed #EAEAEA' }}>
          <div style={{ color: '#0F2B4A', marginBottom: '1rem', display: 'flex', justifyContent: 'center' }}><SvgIcons.Users /></div>
          <h3 style={{ fontSize: '1.2rem', color: '#0F2B4A', margin: '0 0 10px 0' }}>{search ? 'No customer found' : filterType !== 'all' ? 'No customers match this filter' : 'No customers yet'}</h3>
          <p style={{ color: '#666', fontSize: '0.9rem' }}>{search ? 'Try another search term.' : filterType !== 'all' ? 'Try a different filter.' : 'Add your first customer to get started.'}</p>
          {!search && filterType === 'all' && (
            <button onClick={() => router.push(businessId ? `/dashboard/customers/new?business_id=${businessId}` : '/dashboard/customers/new')} style={{ marginTop: '1.5rem', background: '#0F2B4A', color: '#FFF', padding: '12px 24px', borderRadius: '8px', border: 'none', fontWeight: 700, cursor: 'pointer' }}>Add Customer</button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {filteredCustomers.map(customer => {
            const fullName = customer.name || `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'Unnamed customer'
            const hasBalance = Number(customer.balance || 0) > 0

            return (
              <div
                key={customer.id}
                onClick={() => router.push(`/dashboard/customers/${customer.id}?business_id=${businessId}`)}
                style={{ display: 'flex', flexDirection: 'column', padding: '1.25rem', background: '#FFFFFF', borderRadius: '16px', border: '1px solid #EAEAEA', boxShadow: '0 4px 15px rgba(0,0,0,0.02)', cursor: 'pointer', transition: 'all 0.2s', gap: '1rem' }}
                onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 8px 25px rgba(15,43,74,0.08)'}
                onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.02)'}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#0F2B4A', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', fontWeight: 800, flexShrink: 0 }}>
                      {getInitials(customer)}
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0F2B4A' }}>{fullName}</h3>
                      <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#666' }}>{customer.phone || customer.email || 'No contact info'}</p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                    {customer.orderCount > 0 && (
                      <span style={{ background: '#F4F6F8', color: '#0F2B4A', fontSize: '0.75rem', fontWeight: 700, padding: '4px 8px', borderRadius: '6px' }}>
                        {customer.orderCount} order{customer.orderCount > 1 ? 's' : ''}
                      </span>
                    )}
                    {hasBalance ? (
                      <span style={{ color: '#FF3B30', fontSize: '0.85rem', fontWeight: 800 }}>{formatMoney(customer.balance)} due</span>
                    ) : customer.orderCount > 0 ? (
                      <span style={{ color: '#137333', fontSize: '0.85rem', fontWeight: 800 }}>✓ Paid</span>
                    ) : null}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #EAEAEA', paddingTop: '1rem', fontSize: '0.85rem', color: '#888' }}>
                  <span>{customer.lastOrder ? `Last order: ${formatDate(customer.lastOrder.created_at)}` : 'No orders yet'}</span>
                  <div style={{ color: '#0F2B4A' }}><SvgIcons.ChevronRight /></div>
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
