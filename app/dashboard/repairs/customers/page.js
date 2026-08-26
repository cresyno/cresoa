'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../../../lib/supabaseClient'

// ─── Self-contained SVG icons ───
const Svg = ({ name, size = 20, stroke = 'currentColor', style }) => {
  const icons = {
    search: <><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></>,
    users: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>,
    alert: <><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></>,
    chevronRight: <polyline points="9 18 15 12 9 6" />,
    plus: <><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></>,
    x: <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>,
    alertTriangle: <><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></>,
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>{icons[name]}</svg>
}

// ─── Helpers ───
const formatMoney = (value) => `₦${Number(value || 0).toLocaleString('en-NG')}`
const formatDate = (value) => !value ? 'No order yet' : new Date(value).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })

const inputStyle = {
  flex: 1,
  border: 'none',
  outline: 'none',
  background: 'transparent',
  color: 'var(--cresoa-text)',
  fontSize: '0.85rem',
}

const selectStyle = {
  padding: '0.4rem 0.8rem',
  borderRadius: '6px',
  border: '1px solid var(--cresoa-border)',
  background: 'var(--cresoa-bg)',
  color: 'var(--cresoa-text)',
  fontSize: '0.85rem',
}

const primaryButtonStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.3rem',
  padding: '0.6rem 1.2rem',
  borderRadius: '8px',
  background: 'var(--cresoa-accent)',
  color: '#fff',
  border: 'none',
  fontWeight: 700,
  cursor: 'pointer',
  fontSize: '0.9rem',
}

export default function RepairsCustomersPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const businessId = searchParams.get('business_id')

  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('last_added')
  const [filterType, setFilterType] = useState('all')
  const [businessName, setBusinessName] = useState('')

  // Fetch customers + stats (sector-scoped)
  useEffect(() => {
    const fetchData = async () => {
      if (!businessId) return
      setLoading(true)
      setError(null)
      try {
        // Fetch business name
        const { data: bizData } = await supabase
          .from('businesses')
          .select('name')
          .eq('id', businessId)
          .maybeSingle()
        if (bizData) setBusinessName(bizData.name)

        // Fetch customers
        const { data: customersData, error: customersError } = await supabase
          .from('customers')
          .select('*')
          .eq('business_id', businessId)
          .eq('sector', 'repairs')
          .order('created_at', { ascending: false })

        if (customersError) throw customersError

        // Fetch orders for each customer to compute stats
        const customersWithStats = await Promise.all(
          (customersData || []).map(async (customer) => {
            const { data: orders } = await supabase
              .from('orders')
              .select('id, price, amount_paid, created_at, current_status')
              .eq('customer_id', customer.id)
              .eq('business_id', businessId)
              .eq('sector', 'repairs')

            const orderList = orders || []
            const orderCount = orderList.length
            const totalSpent = orderList.reduce((sum, o) => sum + Number(o.amount_paid || 0), 0)
            const balance = orderList.reduce((sum, o) => sum + Number(o.price || 0) - Number(o.amount_paid || 0), 0)
            const lastOrder = [...orderList].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0] || null

            return { ...customer, orderCount, totalSpent, balance, lastOrder }
          })
        )

        setCustomers(customersWithStats)
      } catch (err) {
        console.error('Repairs customers error:', err)
        setError(err.message || 'Could not load customers.')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [businessId])

  // Stats
  const totalOutstanding = customers.reduce((sum, c) => sum + Math.max(Number(c.balance || 0), 0), 0)
  const activeCustomers = customers.filter(c => c.orderCount > 0).length
  const customersWithBalance = customers.filter(c => Number(c.balance || 0) > 0).length

  // Filter + Sort
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
      default:
        break
    }

    // Sort
    result = [...result].sort((a, b) => {
      if (sortBy === 'most_orders') return b.orderCount - a.orderCount
      if (sortBy === 'most_spent') return b.totalSpent - a.totalSpent
      if (sortBy === 'name_asc') return `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`)
      return new Date(b.created_at) - new Date(a.created_at)
    })

    return result
  }, [customers, search, filterType, sortBy])

  // Loading skeleton
  if (loading) {
    return (
      <div style={{ padding: '1rem', maxWidth: '1200px', margin: '0 auto', background: 'var(--cresoa-bg)', minHeight: '100vh' }}>
        <div className="cresoa-skeleton-card" style={{ marginBottom: '1rem' }}>
          <div className="cresoa-skeleton medium" />
          <div className="cresoa-skeleton short" />
        </div>
        <div className="cresoa-loading-grid" style={{ marginBottom: '1rem' }}>
          {[1, 2, 3].map(i => (
            <div key={i} className="cresoa-skeleton-card">
              <div className="cresoa-skeleton short" />
              <div className="cresoa-skeleton long" />
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {[1, 2, 3].map(i => (
            <div key={i} className="cresoa-skeleton-card">
              <div className="cresoa-skeleton medium" />
              <div className="cresoa-skeleton short" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div style={{ minHeight: '70vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', textAlign: 'center' }}>
        <Svg name="alertTriangle" size={30} stroke="var(--cresoa-danger)" />
        <h2 style={{ margin: '14px 0 7px', color: 'var(--cresoa-text)', fontSize: '19px' }}>Couldn't load customers</h2>
        <p style={{ maxWidth: '360px', margin: '0 0 18px', color: 'var(--cresoa-text-muted)', fontSize: '13px' }}>{error}</p>
        <button onClick={() => window.location.reload()} className="cresoa-primary-button">Try again</button>
      </div>
    )
  }

  // Navigate to add customer
  const handleAddCustomer = () => {
    router.push(`/dashboard/repairs/customers/new?business_id=${businessId}`)
  }

  return (
    <div style={{ padding: '1rem', maxWidth: '1200px', margin: '0 auto', background: 'var(--cresoa-bg)', minHeight: '100vh', paddingBottom: '80px' }}>
      {/* ─── HEADER ─── */}
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
        <button onClick={handleAddCustomer} style={primaryButtonStyle}>
          <Svg name="plus" size={14} stroke="#fff" /> Add customer
        </button>
      </div>

      {/* ─── STATS CARDS ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px,1fr))', gap: '0.5rem', marginBottom: '1rem' }}>
        {/* Total */}
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
        {/* With Orders */}
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
        {/* Outstanding */}
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

      {/* ─── OUTSTANDING ALERT (if any) ─── */}
      {customersWithBalance > 0 && (
        <div className="cresoa-card" style={{ marginBottom: '1rem', background: 'var(--cresoa-danger-soft)', borderColor: 'var(--cresoa-danger)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Svg name="alertTriangle" size={16} stroke="var(--cresoa-danger)" />
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
        </div>
      )}

      {/* ─── SEARCH + FILTER + SORT ─── */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        <div style={{ flex: '1 1 200px', display: 'flex', alignItems: 'center', gap: '8px', height: '40px', padding: '0 12px', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-bg)' }}>
          <Svg name="search" size={16} stroke="var(--cresoa-text-muted)" />
          <input
            type="text"
            placeholder="Search name, phone..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={inputStyle}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer', color: 'var(--cresoa-text-muted)' }}>
              <Svg name="x" size={16} stroke="currentColor" />
            </button>
          )}
        </div>
        <select value={filterType} onChange={e => setFilterType(e.target.value)} style={selectStyle}>
          <option value="all">All</option>
          <option value="withOrders">With orders</option>
          <option value="outstanding">Outstanding</option>
          <option value="paid">Paid</option>
        </select>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={selectStyle}>
          <option value="last_added">Recently added</option>
          <option value="most_orders">Most orders</option>
          <option value="most_spent">Highest payments</option>
          <option value="name_asc">Name A–Z</option>
        </select>
      </div>

      {/* ─── CUSTOMER LIST ─── */}
      {filteredCustomers.length === 0 ? (
        <div className="cresoa-empty-state">
          <Svg name="users" size={30} stroke="var(--cresoa-primary)" />
          <span className="cresoa-empty-state-title">No customers found</span>
          <span className="cresoa-empty-state-message">Add your first customer to get started.</span>
          <button onClick={handleAddCustomer} className="cresoa-primary-button" style={{ marginTop: '1rem' }}>
            <Svg name="plus" size={14} stroke="#fff" /> Add customer
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {filteredCustomers.map(customer => {
            const fullName = `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'Unnamed customer'
            const initials = `${customer.first_name?.charAt(0) || ''}${customer.last_name?.charAt(0) || ''}`.toUpperCase() || '?'
            const hasBalance = Number(customer.balance || 0) > 0

            return (
              <div key={customer.id} className="cresoa-card" style={{ padding: '0.6rem 1rem' }}>
                <button
                  onClick={() => router.push(`/dashboard/repairs/customers/${customer.id}?business_id=${businessId}`)}
                  style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%', padding: 0, border: 0, background: 'transparent', cursor: 'pointer', textAlign: 'left' }}
                >
                  <span className="cresoa-avatar">{initials}</span>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--cresoa-text)' }}>{fullName}</span>
                      {customer.orderCount > 0 && (
                        <span style={{ padding: '2px 8px', borderRadius: '20px', background: 'rgba(212,165,42,0.14)', color: 'var(--cresoa-text)', fontSize: '0.7rem', fontWeight: 700 }}>
                          {customer.orderCount} job{customer.orderCount > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--cresoa-text-muted)', marginTop: '0.1rem' }}>
                      {customer.phone || customer.email || 'No contact'}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem 0.8rem', fontSize: '0.75rem', color: 'var(--cresoa-text-muted)', marginTop: '0.2rem' }}>
                      <span>{customer.lastOrder ? `Last job · ${formatDate(customer.lastOrder.created_at)}` : 'No jobs yet'}</span>
                      {hasBalance && (
                        <span style={{ color: 'var(--cresoa-danger)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                          <Svg name="alert" size={12} stroke="var(--cresoa-danger)" />
                          {formatMoney(customer.balance)} due
                        </span>
                      )}
                      {!hasBalance && customer.orderCount > 0 && (
                        <span style={{ color: 'var(--cresoa-success)', fontWeight: 600 }}>Paid</span>
                      )}
                    </div>
                  </div>
                  <Svg name="chevronRight" size={18} stroke="var(--cresoa-text-muted)" />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
    }
