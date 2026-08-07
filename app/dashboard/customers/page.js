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
  const [currentBusinessId, setCurrentBusinessId] = useState(null)

  const loadCustomers = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      // ─── FORCE: Use ONLY the URL param – NO localStorage fallback ───
      const urlBizId = searchParams.get('business_id')
      console.log('🔍 List page: URL business_id =', urlBizId)

      let businessId = urlBizId

      // If URL param is missing or invalid, fallback to owned business
      if (!businessId || businessId.length < 20) {
        console.warn('⚠️ URL param missing or invalid, falling back to owned business')
        const { data: owned } = await supabase
          .from('businesses')
          .select('id, name')
          .eq('owner_id', user.id)
          .single()
        if (owned) {
          businessId = owned.id
          setBusinessName(owned.name)
          console.log('📌 Fallback to owned business:', businessId)
        } else {
          // Also check membership
          const { data: membership } = await supabase
            .from('business_memberships')
            .select('business_id')
            .eq('user_id', user.id)
            .maybeSingle()
          if (membership) {
            businessId = membership.business_id
            console.log('📌 Fallback to membership business:', businessId)
            // Fetch name
            const { data: biz } = await supabase
              .from('businesses')
              .select('name')
              .eq('id', businessId)
              .single()
            if (biz) setBusinessName(biz.name)
          }
        }
      } else {
        // URL param is valid – fetch business name
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
      console.log('✅ Final business ID used for query:', businessId)

      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false })

      if (error) throw error
      console.log('📊 Customers fetched:', data?.length || 0)
      setCustomers(data || [])
    } catch (err) {
      console.error('Error loading customers:', err)
      setError('Failed to load customers.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCustomers()
  }, [router, searchParams])

  const filteredCustomers = customers.filter(c => {
    if (!search) return true
    const q = search.toLowerCase()
    return c.name?.toLowerCase().includes(q) || c.phone?.toLowerCase().includes(q)
  })

  // ─── Skeleton ───
  if (loading) {
    return (
      <div style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div style={{ width: '140px', height: '24px', background: 'var(--color-border)', borderRadius: '6px' }} />
          <div style={{ width: '80px', height: '20px', background: 'var(--color-border)', borderRadius: '6px' }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem' }}>
          {[1,2,3,4,5].map(i => (
            <div key={i} style={{ background: 'var(--color-card)', padding: '1rem', borderRadius: '8px', boxShadow: 'var(--shadow-sm)', animation: 'pulse 1.5s infinite' }}>
              <div style={{ width: '60%', height: '16px', background: 'var(--color-border)', borderRadius: '6px' }} />
              <div style={{ width: '40%', height: '12px', background: 'var(--color-border)', borderRadius: '6px', marginTop: '0.5rem' }} />
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
          {businessName && <p style={{ color: 'var(--color-text-muted)', margin: '0.1rem 0 0', fontSize: '0.85rem' }}>{customers.length} customers</p>}
          {/* ─── DEBUG: Show business ID ─── */}
          {currentBusinessId && (
            <p style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
              Business ID: {currentBusinessId.slice(0,8)}...
              {currentBusinessId === searchParams.get('business_id') ? ' ✅ from URL' : ' ⚠️ fallback'}
            </p>
          )}
        </div>
        <a href={`/dashboard/customers/new?business_id=${currentBusinessId || ''}`} style={{ padding: '0.4rem 1rem', background: 'var(--color-accent)', color: '#fff', borderRadius: '6px', fontWeight: '500', fontSize: '0.85rem', textDecoration: 'none' }}>
          <Icon name="plus" size={14} stroke="#fff" style={{ verticalAlign: 'middle', marginRight: '0.3rem' }} /> Add Customer
        </a>
      </div>

      {/* ─── Search ─── */}
      <input
        type="text"
        placeholder="Search by name or phone..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ width: '100%', maxWidth: '400px', padding: '0.4rem 0.8rem', borderRadius: '6px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)', fontSize: '0.85rem', marginBottom: '1rem' }}
      />

      {/* ─── Customers List ─── */}
      {filteredCustomers.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2.5rem', background: 'var(--color-card)', borderRadius: '12px', border: '1px dashed var(--color-border)' }}>
          <p style={{ color: 'var(--color-text-muted)', margin: '0 0 0.5rem' }}>No customers found</p>
          <a href={`/dashboard/customers/new?business_id=${currentBusinessId || ''}`} style={{ color: 'var(--color-accent)', fontWeight: '500', textDecoration: 'none' }}>Add first customer →</a>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
          {filteredCustomers.map(c => (
            <div key={c.id} style={{ background: 'var(--color-card)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ fontWeight: '500', fontSize: '0.95rem', color: 'var(--color-text)' }}>{c.name}</div>
              {c.phone && <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{c.phone}</div>}
              <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem' }}>
                <a href={`/dashboard/customers/${c.id}?business_id=${currentBusinessId || ''}`} style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textDecoration: 'none', border: '1px solid var(--color-border)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>View</a>
                <a href={`/dashboard/customers/${c.id}/edit?business_id=${currentBusinessId || ''}`} style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textDecoration: 'none', border: '1px solid var(--color-border)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>Edit</a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
  }
