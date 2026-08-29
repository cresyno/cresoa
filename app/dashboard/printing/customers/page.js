'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../../../lib/supabaseClient'

// ─── Self-contained SVG icons ───
const Svg = ({ name, size = 20, stroke = 'currentColor' }) => {
  const icons = {
    plus: <><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></>,
    search: <><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></>,
    user: <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></>,
    chevronRight: <polyline points="9 18 15 12 9 6" />,
    alert: <><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></>,
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{icons[name]}</svg>
}

const formatMoney = (val) => `₦${Number(val || 0).toLocaleString('en-NG')}`

export default function PrintingCustomersPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const businessId = searchParams.get('business_id')

  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    const fetchCustomers = async () => {
      if (!businessId) return
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('customers')
          .select('*')
          .eq('business_id', businessId)
          .eq('sector', 'printing')
          .order('created_at', { ascending: false })

        if (error) throw error

        // Fetch job stats for each customer
        const customersWithStats = await Promise.all(
          (data || []).map(async (customer) => {
            const { data: jobs } = await supabase
              .from('print_jobs')
              .select('total, amount_paid')
              .eq('customer_id', customer.id)
              .eq('business_id', businessId)

            const jobList = jobs || []
            const totalJobs = jobList.length
            const totalSpent = jobList.reduce((sum, j) => sum + Number(j.amount_paid || 0), 0)
            const outstanding = jobList.reduce((sum, j) => sum + (Number(j.total || 0) - Number(j.amount_paid || 0)), 0)

            return { ...customer, totalJobs, totalSpent, outstanding }
          })
        )

        setCustomers(customersWithStats)
      } catch (err) {
        console.error('Error fetching customers:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchCustomers()
  }, [businessId])

  const filteredCustomers = useMemo(() => {
    let result = customers
    const query = search.toLowerCase()
    if (query) {
      result = result.filter(c => (c.name || `${c.first_name || ''} ${c.last_name || ''}`).toLowerCase().includes(query))
    }
    if (filter === 'withJobs') result = result.filter(c => c.totalJobs > 0)
    if (filter === 'outstanding') result = result.filter(c => c.outstanding > 0)
    return result
  }, [customers, search, filter])

  if (loading) {
    return (
      <div style={{ padding: '1rem', maxWidth: '1200px', margin: '0 auto', background: 'var(--cresoa-bg)', minHeight: '100vh' }}>
        <div className="cresoa-skeleton-card" style={{ marginBottom: '1rem' }}>
          <div className="cresoa-skeleton medium" />
          <div className="cresoa-skeleton short" />
        </div>
        <div className="cresoa-loading-grid">
          {[1, 2, 3].map(i => (
            <div key={i} className="cresoa-skeleton-card">
              <div className="cresoa-skeleton short" />
              <div className="cresoa-skeleton long" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '1rem', maxWidth: '1200px', margin: '0 auto', background: 'var(--cresoa-bg)', minHeight: '100vh', paddingBottom: '80px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <p style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', margin: 0 }}>Printing</p>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0.2rem 0 0', color: 'var(--cresoa-text)' }}>Customers</h1>
          <p style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.85rem', margin: '0.1rem 0 0' }}>{customers.length} customers</p>
        </div>
        <button
          onClick={() => router.push(`/dashboard/printing/customers/new?business_id=${businessId}`)}
          className="cresoa-primary-button"
        >
          <Svg name="plus" size={16} stroke="#fff" /> Add Customer
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '0.5rem', marginBottom: '1rem' }}>
        <button onClick={() => setFilter('all')} style={{ background: filter === 'all' ? 'var(--cresoa-accent)' : 'var(--cresoa-surface)', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', cursor: 'pointer', textAlign: 'left' }}>
          <div style={{ fontSize: '0.65rem', color: filter === 'all' ? '#fff' : 'var(--cresoa-text-muted)', textTransform: 'uppercase' }}>Total</div>
          <div style={{ fontWeight: 700, fontSize: '1.1rem', color: filter === 'all' ? '#fff' : 'var(--cresoa-text)' }}>{customers.length}</div>
        </button>
        <button onClick={() => setFilter('withJobs')} style={{ background: filter === 'withJobs' ? 'var(--cresoa-accent)' : 'var(--cresoa-surface)', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', cursor: 'pointer', textAlign: 'left' }}>
          <div style={{ fontSize: '0.65rem', color: filter === 'withJobs' ? '#fff' : 'var(--cresoa-text-muted)', textTransform: 'uppercase' }}>With Jobs</div>
          <div style={{ fontWeight: 700, fontSize: '1.1rem', color: filter === 'withJobs' ? '#fff' : 'var(--cresoa-text)' }}>{customers.filter(c => c.totalJobs > 0).length}</div>
        </button>
        <button onClick={() => setFilter('outstanding')} style={{ background: filter === 'outstanding' ? 'var(--cresoa-accent)' : 'var(--cresoa-surface)', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', cursor: 'pointer', textAlign: 'left' }}>
          <div style={{ fontSize: '0.65rem', color: filter === 'outstanding' ? '#fff' : 'var(--cresoa-text-muted)', textTransform: 'uppercase' }}>Owing</div>
          <div style={{ fontWeight: 700, fontSize: '1.1rem', color: filter === 'outstanding' ? '#fff' : 'var(--cresoa-danger)' }}>{formatMoney(customers.reduce((sum, c) => sum + c.outstanding, 0))}</div>
        </button>
      </div>

      {/* Search */}
      <div style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', background: 'var(--cresoa-surface)', border: '1px solid var(--cresoa-border)', borderRadius: '8px', padding: '0.4rem 0.8rem' }}>
          <Svg name="search" size={16} stroke="var(--cresoa-text-muted)" style={{ marginRight: '0.5rem' }} />
          <input
            type="text"
            placeholder="Search customers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', color: 'var(--cresoa-text)', fontSize: '0.9rem' }}
          />
        </div>
      </div>

      {/* Customer List */}
      {filteredCustomers.length === 0 ? (
        <div className="cresoa-empty-state">
          <Svg name="user" size={40} stroke="var(--cresoa-accent)" />
          <span className="cresoa-empty-state-title">No customers found</span>
          <span className="cresoa-empty-state-message">Add your first customer to get started.</span>
          <button onClick={() => router.push(`/dashboard/printing/customers/new?business_id=${businessId}`)} className="cresoa-primary-button" style={{ marginTop: '1rem' }}>
            <Svg name="plus" size={14} stroke="#fff" /> Add Customer
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {filteredCustomers.map(customer => {
            const displayName = customer.name || `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'Unnamed'
            const initials = displayName.charAt(0).toUpperCase() || '?'
            const hasOutstanding = customer.outstanding > 0

            return (
              <div
                key={customer.id}
                onClick={() => router.push(`/dashboard/printing/customers/${customer.id}?business_id=${businessId}`)}
                className="cresoa-card"
                style={{ padding: '0.8rem 1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.75rem' }}
              >
                <span className="cresoa-avatar" style={{ width: '40px', height: '40px' }}>{initials}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--cresoa-text)' }}>{displayName}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--cresoa-text-muted)' }}>
                    {customer.phone || 'No phone'} · {customer.totalJobs} jobs · {formatMoney(customer.totalSpent)} spent
                  </div>
                </div>
                {hasOutstanding ? (
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--cresoa-danger)' }}>{formatMoney(customer.outstanding)} due</span>
                ) : customer.totalJobs > 0 ? (
                  <span style={{ fontSize: '0.8rem', color: 'var(--cresoa-success)' }}>Paid</span>
                ) : null}
                <Svg name="chevronRight" size={16} stroke="var(--cresoa-text-muted)" />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
    }
