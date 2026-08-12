'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../../lib/supabaseClient'
import { Icon } from '../../../components/Icon'
import { Card } from '../../../components/Card'
import { SectionHeader } from '../../../components/SectionHeader'
import { StatusPill } from '../../../components/StatusPill'
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
      const {
        data: { session }
      } = await supabase.auth.getSession()

      if (!session) {
        router.push('/login')
        return
      }

      const {
        data: { user }
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      const urlBusinessId =
        searchParams.get('business_id')

      let resolvedBusinessId = urlBusinessId

      if (
        !resolvedBusinessId ||
        resolvedBusinessId.length < 20
      ) {
        const { data: owned } = await supabase
          .from('businesses')
          .select('id, name')
          .eq('owner_id', user.id)
          .single()

        if (owned) {
          resolvedBusinessId = owned.id
          setBusinessName(owned.name)
        } else {
          const { data: membership } =
            await supabase
              .from('business_memberships')
              .select('business_id')
              .eq('user_id', user.id)
              .maybeSingle()

          if (membership) {
            resolvedBusinessId =
              membership.business_id

            const { data: business } =
              await supabase
                .from('businesses')
                .select('name')
                .eq(
                  'id',
                  resolvedBusinessId
                )
                .single()

            if (business) {
              setBusinessName(business.name)
            }
          }
        }
      } else {
        const { data: business } =
          await supabase
            .from('businesses')
            .select('name')
            .eq('id', resolvedBusinessId)
            .single()

        if (business) {
          setBusinessName(business.name)
        }
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
            Authorization:
              `Bearer ${session.access_token}`
          }
        }
      )

      const result = await response.json()

      if (!response.ok) {
        throw new Error(
          result.error ||
            'Unable to load customers'
        )
      }

      const customersWithStats =
        await Promise.all(
          (result.customers || []).map(
            async customer => {
              const { data: orders } =
                await supabase
                  .from('orders')
                  .select(
                    'id, price, amount_paid, created_at, current_status'
                  )
                  .eq(
                    'customer_id',
                    customer.id
                  )

              const orderList = orders || []

              const orderCount =
                orderList.length

              const totalSpent =
                orderList.reduce(
                  (sum, order) =>
                    sum +
                    Number(
                      order.amount_paid || 0
                    ),
                  0
                )

              const balance =
                orderList.reduce(
                  (sum, order) =>
                    sum +
                    Number(
                      order.price || 0
                    ) -
                    Number(
                      order.amount_paid || 0
                    ),
                  0
                )

              const lastOrder =
                [...orderList].sort(
                  (a, b) =>
                    new Date(b.created_at) -
                    new Date(a.created_at)
                )[0] || null

              return {
                ...customer,
                orderCount,
                totalSpent,
                balance,
                lastOrder
              }
            }
          )
        )

      const sorted =
        [...customersWithStats].sort(
          (a, b) => {
            if (sortBy === 'most_orders') {
              return (
                b.orderCount -
                a.orderCount
              )
            }

            if (sortBy === 'most_spent') {
              return (
                b.totalSpent -
                a.totalSpent
              )
            }

            if (sortBy === 'name_asc') {
              return `${a.first_name} ${a.last_name}`
                .localeCompare(
                  `${b.first_name} ${b.last_name}`
                )
            }

            return (
              new Date(b.created_at) -
              new Date(a.created_at)
            )
          }
        )

      setCustomers(sorted)
    } catch (err) {
      console.error(
        'Customers page error:',
        err
      )

      setError(
        err?.message ||
          'Something went wrong while loading customers.'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCustomers()
  }, [searchParams, sortBy])

  const filteredCustomers = useMemo(() => {
    const query = search
      .trim()
      .toLowerCase()

    if (!query) return customers

    return customers.filter(customer => {
      const name =
        `${customer.first_name || ''} ${customer.last_name || ''}`
          .toLowerCase()

      const phone =
        customer.phone || ''

      return (
        name.includes(query) ||
        phone.includes(query)
      )
    })
  }, [customers, search])

  const totalOutstanding = customers.reduce(
    (sum, customer) =>
      sum +
      Math.max(Number(customer.balance || 0), 0),
    0
  )

  const activeCustomers =
    customers.filter(
      customer =>
        customer.orderCount > 0
    ).length

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

      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '20px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            style={{ width: '42px', height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--cresoa-border)', borderRadius: '13px', background: 'var(--cresoa-surface)', color: 'var(--cresoa-primary)', cursor: 'pointer' }}
          >
            <Icon name="arrow-left" size={19} stroke="currentColor" />
          </button>
          <div>
            <span style={{ color: 'var(--cresoa-text-muted)', fontSize: '10px', letterSpacing: '.08em', fontWeight: 800, textTransform: 'uppercase' }}>
              {businessName || 'YOUR BUSINESS'}
            </span>
            <h1 style={{ margin: '4px 0', fontSize: '26px', lineHeight: 1.15, fontWeight: 900, color: 'var(--cresoa-text)' }}>Customers</h1>
            <p style={{ margin: 0, color: 'var(--cresoa-text-muted)', fontSize: '13px' }}>
              {customers.length === 0 ? 'Build your customer list' : `${customers.length} customer${customers.length === 1 ? '' : 's'} in your business`}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => router.push(businessId ? `/dashboard/customers/new?business_id=${businessId}` : '/dashboard/customers/new')}
          style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '12px 14px', border: 0, borderRadius: '13px', background: 'var(--cresoa-accent)', color: '#fff', fontSize: '12px', fontWeight: 800, cursor: 'pointer', boxShadow: 'var(--shadow-sm)' }}
        >
          <Icon name="plus" size={18} stroke="currentColor" />
          <span>Add customer</span>
        </button>
      </header>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px,1fr))', gap: '10px', marginBottom: '18px' }}>
        <div style={{ minHeight: '92px', padding: '13px', borderRadius: '18px', background: 'var(--cresoa-surface)', border: '1px solid var(--cresoa-border)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ width: '34px', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '10px', marginBottom: '10px', background: 'rgba(15,43,74,0.1)', color: 'var(--cresoa-primary)' }}>
            <Icon name="users" size={19} stroke="currentColor" />
          </div>
          <span style={{ display: 'block', color: 'var(--cresoa-text-muted)', fontSize: '10px', marginBottom: '4px' }}>Customers</span>
          <strong style={{ display: 'block', color: 'var(--cresoa-text)', fontSize: '15px', fontWeight: 900 }}>{customers.length}</strong>
        </div>
        <div style={{ minHeight: '92px', padding: '13px', borderRadius: '18px', background: 'var(--cresoa-surface)', border: '1px solid var(--cresoa-border)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ width: '34px', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '10px', marginBottom: '10px', background: 'rgba(46,125,94,0.12)', color: 'var(--cresoa-success)' }}>
            <Icon name="user-check" size={19} stroke="currentColor" />
          </div>
          <span style={{ display: 'block', color: 'var(--cresoa-text-muted)', fontSize: '10px', marginBottom: '4px' }}>With orders</span>
          <strong style={{ display: 'block', color: 'var(--cresoa-text)', fontSize: '15px', fontWeight: 900 }}>{activeCustomers}</strong>
        </div>
        <div style={{ minHeight: '92px', padding: '13px', borderRadius: '18px', background: 'var(--cresoa-surface)', border: '1px solid var(--cresoa-border)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ width: '34px', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '10px', marginBottom: '10px', background: 'rgba(212,165,42,0.14)', color: 'var(--cresoa-accent)' }}>
            <Icon name="wallet" size={19} stroke="currentColor" />
          </div>
          <span style={{ display: 'block', color: 'var(--cresoa-text-muted)', fontSize: '10px', marginBottom: '4px' }}>Outstanding</span>
          <strong style={{ display: 'block', color: 'var(--cresoa-text)', fontSize: '15px', fontWeight: 900 }}>{formatMoney(totalOutstanding)}</strong>
        </div>
      </section>

      <section style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '22px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', height: '48px', padding: '0 14px', borderRadius: '14px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-surface)' }}>
          <Icon name="search" size={18} stroke="var(--cresoa-text-muted)" />
          <input
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search name or phone..."
            style={{ flex: 1, border: 0, outline: 'none', background: 'transparent', color: 'var(--cresoa-text)', fontSize: '14px' }}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '26px', height: '26px', border: 0, borderRadius: '50%', background: 'var(--cresoa-bg)', color: 'var(--cresoa-text-muted)', cursor: 'pointer' }}>
              <Icon name="x" size={16} stroke="currentColor" />
            </button>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '46px', padding: '0 14px', borderRadius: '14px', background: 'var(--cresoa-surface)', border: '1px solid var(--cresoa-border)' }}>
          <span style={{ color: 'var(--cresoa-text-muted)', fontSize: '12px', fontWeight: 700 }}>Sort</span>
          <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ border: 0, outline: 'none', background: 'transparent', color: 'var(--cresoa-text)', fontSize: '12px', fontWeight: 800 }}>
            <option value="last_added">Recently added</option>
            <option value="most_orders">Most orders</option>
            <option value="most_spent">Highest payments</option>
            <option value="name_asc">Name A–Z</option>
          </select>
        </div>
      </section>

      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '12px' }}>
          <div>
            <span style={{ color: 'var(--cresoa-text-muted)', fontSize: '10px', fontWeight: 900, letterSpacing: '.1em', textTransform: 'uppercase' }}>CUSTOMER LIST</span>
            <h2 style={{ margin: '4px 0 0', color: 'var(--cresoa-text)', fontSize: '19px' }}>{search ? `Results for “${search}”` : 'Your customers'}</h2>
          </div>
          {search && <span style={{ color: 'var(--cresoa-text-muted)', fontSize: '12px' }}>{filteredCustomers.length} result{filteredCustomers.length === 1 ? '' : 's'}</span>}
        </div>

        {filteredCustomers.length === 0 ? (
          <div style={{ padding: '42px 20px', textAlign: 'center', border: '1px dashed var(--cresoa-border)', borderRadius: '20px', background: 'var(--cresoa-surface)' }}>
            <div style={{ width: '58px', height: '58px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 15px', borderRadius: '18px', background: 'rgba(15,43,74,0.08)' }}>
              <Icon name={search ? 'search-x' : 'users'} size={26} stroke="var(--cresoa-primary)" />
            </div>
            <h3 style={{ margin: 0, color: 'var(--cresoa-text)', fontSize: '17px' }}>{search ? 'No customer found' : 'No customers yet'}</h3>
            <p style={{ maxWidth: '330px', margin: '8px auto 18px', color: 'var(--cresoa-text-muted)', fontSize: '13px', lineHeight: 1.55 }}>
              {search ? 'Try another name or phone number.' : 'Add your first customer so you can keep their orders, payments, and measurements together.'}
            </p>
            {!search ? (
              <button onClick={() => router.push(businessId ? `/dashboard/customers/new?business_id=${businessId}` : '/dashboard/customers/new')} style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '12px 15px', border: 0, borderRadius: '12px', background: 'var(--cresoa-accent)', color: '#fff', fontSize: '12px', fontWeight: 800, cursor: 'pointer' }}>
                <Icon name="plus" size={17} stroke="currentColor" /> Add your first customer
              </button>
            ) : (
              <button onClick={() => setSearch('')} style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '12px 15px', border: 0, borderRadius: '12px', background: 'var(--cresoa-primary)', color: '#fff', fontSize: '12px', fontWeight: 800, cursor: 'pointer' }}>
                Clear search
              </button>
            )}
          </div>
        ) : (
        <button onClick={() => setSearch('')} style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '12px 15px', border: 0, borderRadius: '12px', background: 'var(--cresoa-primary)', color: '#fff', fontSize: '12px', fontWeight: 800, cursor: 'pointer' }}>
                Clear search
              </button>
            )}
          </div>
</section>

        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {filteredCustomers.map(customer => {
              const fullName = `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'Unnamed customer'
              const initials = `${customer.first_name?.charAt(0) || ''}${customer.last_name?.charAt(0) || ''}`.toUpperCase() || '?'
              const hasBalance = Number(customer.balance || 0) > 0

              return (
                <button
                  key={customer.id}
                  onClick={() => router.push(`/dashboard/customers/${customer.id}`)}
                  style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%', padding: '14px', textAlign: 'left', borderRadius: '18px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-surface)', boxShadow: 'var(--shadow-sm)', cursor: 'pointer', transition: 'border-color 0.15s, box-shadow 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(15,43,74,0.2)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--cresoa-border)'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)' }}
                >
                  <div style={{ width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, borderRadius: '50%', background: 'var(--cresoa-primary)', color: '#fff', fontSize: '15px', fontWeight: 900 }}>{initials}</div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                      <h3 style={{ margin: 0, color: 'var(--cresoa-text)', fontSize: '15px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fullName}</h3>
                      {customer.orderCount > 0 && (
                        <span style={{ flexShrink: 0, padding: '3px 7px', borderRadius: '20px', background: 'rgba(212,165,42,0.14)', color: 'var(--cresoa-text)', fontSize: '9px', fontWeight: 800 }}>{customer.orderCount} {customer.orderCount === 1 ? 'order' : 'orders'}</span>
                      )}
                    </div>
                    <p style={{ margin: '5px 0', color: 'var(--cresoa-text-muted)', fontSize: '12px' }}>{customer.phone || customer.email || 'No contact information'}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', fontSize: '11px', color: 'var(--cresoa-text-muted)' }}>
                      <span>{customer.lastOrder ? `Last order ${formatDate(customer.lastOrder.created_at)}` : 'No orders yet'}</span>
                      {hasBalance && <strong style={{ color: 'var(--cresoa-danger)' }}>{formatMoney(customer.balance)} due</strong>}
                      {!hasBalance && customer.orderCount > 0 && <span style={{ color: 'var(--cresoa-success)', fontWeight: 800 }}>Paid</span>}
                    </div>
                  </div>
                  <Icon name="chevron-right" size={18} stroke="var(--cresoa-text-muted)" />
                </button>
              )
            })}
          </div>
        )}
      </section>

      <div style={{ marginTop: '2rem' }}>
        <Navigation businessId={businessId} />
      </div>
    </main>
  )
}
