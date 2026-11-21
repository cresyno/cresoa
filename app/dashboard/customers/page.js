import { useClientSearchParams as useSearchParams } from '../../lib/useClientSearchParams';
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
  Plus: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
  AlertTriangle: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  Ruler: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21.3 15.3l-12-12a2.4 2.4 0 0 0-3.4 0l-1.6 1.6a2.4 2.4 0 0 0 0 3.4l12 12a2.4 2.4 0 0 0 3.4 0l1.6-1.6a2.4 2.4 0 0 0 0-3.4z"/><path d="M14.5 6.5l4 4"/><path d="M10.5 10.5l4 4"/><path d="M6.5 14.5l4 4"/>
    </svg>
  ),
  Phone: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  )
}

const formatMoney = value => `₦${Number(value || 0).toLocaleString('en-NG')}`

const timeAgo = (dateString) => {
  if (!dateString) return null
  const date = new Date(dateString)
  const now = new Date()
  const diffInDays = Math.floor((now - date) / (1000 * 60 * 60 * 24))
  if (diffInDays === 0) return 'Today'
  if (diffInDays === 1) return 'Yesterday'
  if (diffInDays < 30) return `${diffInDays} days ago`
  const months = Math.floor(diffInDays / 30)
  return `${months} month${months > 1 ? 's' : ''} ago`
}

// Fix the Yemi Yemi duplicate name issue
const formatName = (customer) => {
  if (customer.name) return customer.name
  const fName = customer.first_name || ''
  const lName = customer.last_name || ''
  if (fName.toLowerCase() === lName.toLowerCase()) return fName
  return `${fName} ${lName}`.trim() || 'Unnamed Client'
}

export default function ClientsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [businessId, setBusinessId] = useState(null)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('owes_most') // Default to Owes Most
  const [filterType, setFilterType] = useState('all')

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
    setLoading(true); setError(null)
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
      if (!response.ok) throw new Error(result.error || 'Unable to load clients')

      const customersWithStats = await Promise.all(
        (result.customers || []).map(async customer => {
          const { data: orders } = await supabase.from('orders').select('id, price, amount_paid, created_at').eq('customer_id', customer.id)
          const orderList = orders || []
          const balance = orderList.reduce((sum, o) => sum + Number(o.price || 0) - Number(o.amount_paid || 0), 0)
          const lastOrder = [...orderList].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0] || null
          const hasMeasurements = customer.measurements && Object.keys(customer.measurements).length > 0
          
          return { ...customer, orderCount: orderList.length, balance, lastOrder, hasMeasurements }
        })
      )

      setCustomers(customersWithStats)
    } catch (err) {
      setError(err?.message || 'Something went wrong')
    } finally { setLoading(false) }
  }

  useEffect(() => { loadCustomers() }, [searchParams])

  const totalOutstanding = customers.reduce((sum, c) => sum + Math.max(Number(c.balance || 0), 0), 0)
  const customersWithBalance = customers.filter(c => Number(c.balance || 0) > 0).length

  const filteredCustomers = useMemo(() => {
    let result = customers
    const query = search.trim().toLowerCase()

    if (query) {
      result = result.filter(customer => {
        const name = formatName(customer).toLowerCase()
        const phone = customer.phone || ''
        return name.includes(query) || phone.includes(query)
      })
    }

    if (filterType === 'outstanding') result = result.filter(c => Number(c.balance || 0) > 0)
    else if (filterType === 'no_measurements') result = result.filter(c => !c.hasMeasurements)

    // Sort
    result = [...result].sort((a, b) => {
      if (sortBy === 'owes_most') return Math.max(0, b.balance) - Math.max(0, a.balance)
      if (sortBy === 'name_asc') return formatName(a).localeCompare(formatName(b))
      return new Date(b.created_at) - new Date(a.created_at)
    })

    return result
  }, [customers, search, filterType, sortBy])

  const getInitials = (customer) => {
    const name = formatName(customer)
    if (!name) return '?'
    const parts = name.split(/\s+/)
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
  }

  const handleWhatsApp = (phone, name, balance) => {
    if (!phone) return
    let cleanPhone = phone.replace(/\D/g, '')
    if (cleanPhone.startsWith('0')) cleanPhone = '234' + cleanPhone.slice(1)
    const text = balance > 0 
      ? `Hello ${name}, a friendly reminder from Cresoa regarding your outstanding balance of ₦${balance.toLocaleString()}.`
      : `Hello ${name}, how are you doing today?`
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`, '_blank')
  }

  const handleCall = (phone) => {
    if (!phone) return
    window.location.href = `tel:${phone.replace(/\D/g, '')}`
  }

  const filterOptions = [
    { label: 'All Clients', value: 'all' },
    { label: 'Owing You', value: 'outstanding' },
    { label: 'Missing Measurements', value: 'no_measurements' }
  ]

  const sortOptions = [
    { label: 'Owes Most', value: 'owes_most' },
    { label: 'A to Z', value: 'name_asc' },
    { label: 'Recently Added', value: 'last_added' }
  ]

  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading Client Book...</div>
  if (error) return <div style={{ padding: '40px', textAlign: 'center', color: 'red' }}>{error}</div>

  return (
    <div style={{ background: '#FFFFFF', minHeight: '100vh', padding: '1rem', fontFamily: "'Inter', sans-serif", color: '#0F2B4A', paddingBottom: '120px' }}>
      
      <Navigation businessId={businessId} />

      {/* ─── HEADER ─── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem', marginBottom: '1.5rem' }}>
        <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 800, letterSpacing: '-0.5px' }}>Client Book</h1>
        <p style={{ margin: 0, fontSize: '0.95rem', color: '#555' }}>All your clients and who owes you.</p>
      </div>

      {/* ─── OUTSTANDING BANNER (Replaces the 4 Stat Cards) ─── */}
      {customersWithBalance > 0 && (
        <div style={{ background: 'linear-gradient(135deg, #0F2B4A, #1A4685)', padding: '1.25rem', borderRadius: '16px', color: '#FFF', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <div style={{ fontSize: '0.85rem', color: '#A0B2C6', fontWeight: 600, marginBottom: '4px' }}>Money Clients Owe You</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#D4AF37' }}>{formatMoney(totalOutstanding)}</div>
            <div style={{ fontSize: '0.8rem', color: '#A0B2C6', marginTop: '4px' }}>{customersWithBalance} client{customersWithBalance > 1 ? 's' : ''} owe you</div>
          </div>
          <button
            onClick={() => setFilterType(filterType === 'outstanding' ? 'all' : 'outstanding')}
            style={{ background: '#D4AF37', color: '#0F2B4A', border: 'none', padding: '12px 18px', borderRadius: '10px', fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer', minHeight: '48px' }}
          >
            {filterType === 'outstanding' ? 'Show All' : 'See who owes me'}
          </button>
        </div>
      )}

      {/* ─── FILTERS ─── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', background: '#F8F9FA', borderRadius: '12px', padding: '0 1rem', border: '1px solid #EAEAEA' }}>
          <span style={{ color: '#999' }}><SvgIcons.Search /></span>
          <input
            type="text"
            placeholder="Search client name or number..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ border: 'none', background: 'transparent', padding: '14px 10px', outline: 'none', width: '100%', fontSize: '0.95rem' }}
          />
          {search && <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#999', display: 'flex' }}><SvgIcons.X /></button>}
        </div>
        
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1 }} ref={filterMenuRef}>
            <button onClick={() => { setShowFilterMenu(!showFilterMenu); setShowSortMenu(false); }} style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', background: '#FFFFFF', border: '1px solid #EAEAEA', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, color: '#0F2B4A' }}>
              {filterOptions.find(o => o.value === filterType)?.label}
              <SvgIcons.ChevronDown />
            </button>
            {showFilterMenu && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px', background: '#FFF', border: '1px solid #EAEAEA', borderRadius: '10px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', zIndex: 10, overflow: 'hidden' }}>
                {filterOptions.map(opt => (
                  <button key={opt.value} onClick={() => { setFilterType(opt.value); setShowFilterMenu(false); }} style={{ width: '100%', textAlign: 'left', padding: '12px 16px', background: filterType === opt.value ? '#F4F6F8' : '#FFF', border: 'none', borderBottom: '1px solid #F0F0F0', cursor: 'pointer', fontSize: '0.9rem', color: '#0F2B4A', fontWeight: filterType === opt.value ? 700 : 500 }}>{opt.label}</button>
                ))}
              </div>
            )}
          </div>

          <div style={{ position: 'relative', flex: 1 }} ref={sortMenuRef}>
            <button onClick={() => { setShowSortMenu(!showSortMenu); setShowFilterMenu(false); }} style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', background: '#FFFFFF', border: '1px solid #EAEAEA', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, color: '#0F2B4A' }}>
              {sortOptions.find(o => o.value === sortBy)?.label}
              <SvgIcons.ChevronDown />
            </button>
            {showSortMenu && (
              <div style={{ position: 'absolute', top: '100%', right: 0, left: 0, marginTop: '4px', background: '#FFF', border: '1px solid #EAEAEA', borderRadius: '10px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', zIndex: 10, overflow: 'hidden' }}>
                {sortOptions.map(opt => (
                  <button key={opt.value} onClick={() => { setSortBy(opt.value); setShowSortMenu(false); }} style={{ width: '100%', textAlign: 'left', padding: '12px 16px', background: sortBy === opt.value ? '#F4F6F8' : '#FFF', border: 'none', borderBottom: '1px solid #F0F0F0', cursor: 'pointer', fontSize: '0.9rem', color: '#0F2B4A', fontWeight: sortBy === opt.value ? 700 : 500 }}>{opt.label}</button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── CLIENT LIST ─── */}
      {filteredCustomers.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 1rem', background: '#F8F9FA', borderRadius: '16px', border: '2px dashed #EAEAEA' }}>
          <h3 style={{ fontSize: '1.2rem', color: '#0F2B4A', margin: '0 0 10px 0' }}>No clients found</h3>
          <p style={{ color: '#666', fontSize: '0.9rem' }}>Try adjusting your search or filters.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredCustomers.map(customer => {
            const fullName = formatName(customer)
            const hasBalance = Number(customer.balance || 0) > 0
            const lastOrderText = customer.lastOrder ? `Last order ${timeAgo(customer.lastOrder.created_at)}` : null

            return (
              <div key={customer.id} onClick={() => router.push(`/dashboard/customers/${customer.id}?business_id=${businessId}`)} style={{ display: 'flex', flexDirection: 'column', padding: '16px', background: '#FFFFFF', borderRadius: '16px', border: '1px solid #EAEAEA', boxShadow: '0 2px 8px rgba(0,0,0,0.02)', cursor: 'pointer' }}>
                
                {/* LINE 1: Name & Avatar */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#0F2B4A', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', fontWeight: 800, flexShrink: 0 }}>
                      {getInitials(customer)}
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0F2B4A' }}>{fullName}</h3>
                      <p style={{ margin: '2px 0 0 0', fontSize: '0.85rem', color: '#666' }}>{customer.phone || 'No phone saved'}</p>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    {hasBalance ? (
                      <span style={{ color: '#FF3B30', fontSize: '0.9rem', fontWeight: 800, display: 'block' }}>Owes {formatMoney(customer.balance)}</span>
                    ) : customer.orderCount > 0 ? (
                      <span style={{ color: '#137333', fontSize: '0.9rem', fontWeight: 800, display: 'block' }}>Fully Paid</span>
                    ) : null}
                  </div>
                </div>

                {/* LINE 2: Badges */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                  {customer.hasMeasurements ? (
                    <span style={{ background: '#E6F4EA', color: '#137333', padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <SvgIcons.Ruler /> Measured
                    </span>
                  ) : (
                    <span style={{ background: '#FFF7E6', color: '#D97706', padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      ⚠️ No Measurements
                    </span>
                  )}
                  {lastOrderText && <span style={{ background: '#F4F6F8', color: '#666', padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600 }}>{lastOrderText}</span>}
                </div>

                {/* LINE 3: Actions (Stop propagation to prevent opening the card when clicking a button) */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #EAEAEA', paddingTop: '12px' }} onClick={e => e.stopPropagation()}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {customer.phone ? (
                      <>
                        <button onClick={() => handleWhatsApp(customer.phone, fullName, customer.balance)} style={{ background: hasBalance ? '#E6F4EA' : '#F4F6F8', color: hasBalance ? '#137333' : '#0F2B4A', border: 'none', padding: '8px 14px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}>
                          {hasBalance ? 'Send Reminder' : 'Chat'}
                        </button>
                        <button onClick={() => handleCall(customer.phone)} style={{ background: '#F4F6F8', color: '#0F2B4A', border: 'none', padding: '8px 12px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>
                          <SvgIcons.Phone />
                        </button>
                      </>
                    ) : (
                      <button onClick={() => router.push(`/dashboard/customers/${customer.id}?business_id=${businessId}`)} style={{ background: '#FFF7E6', color: '#D97706', border: '1px dashed #D97706', padding: '8px 14px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}>
                        + Add Phone Number
                      </button>
                    )}
                  </div>

                  {customer.orderCount === 0 && (
                    <button onClick={() => router.push(`/dashboard/orders/new?business_id=${businessId}&customer_id=${customer.id}`)} style={{ background: '#0F2B4A', color: '#FFF', border: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}>
                      + Start Order
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ─── STICKY ADD CLIENT BUTTON ─── */}
      <div style={{ position: 'fixed', bottom: '75px', left: '16px', right: '16px', background: 'linear-gradient(to top, #FFF 60%, transparent)', paddingTop: '20px', paddingBottom: '10px', zIndex: 90 }}>
        <button onClick={() => router.push(businessId ? `/dashboard/customers/new?business_id=${businessId}` : '/dashboard/customers/new')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', padding: '16px', background: '#0F2B4A', color: '#FFF', fontSize: '1rem', fontWeight: 700, borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(15, 43, 74, 0.3)', cursor: 'pointer' }}>
          <SvgIcons.Plus /> Add Client
        </button>
      </div>

      <div style={{ marginTop: '2rem' }}><Navigation businessId={businessId} /></div>
    </div>
  )
                      }
