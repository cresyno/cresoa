'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabaseClient'

export default function AllCustomersPage() {
  const router = useRouter()
  const [customers, setCustomers] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data: business } = await supabase
        .from('businesses')
        .select('id')
        .eq('owner_id', user.id)
        .single()

      const { data: customerData } = await supabase
        .from('customers')
        .select('*')
        .eq('business_id', business.id)
        .order('name', { ascending: true })

      setCustomers(customerData || [])
      setLoading(false)
    }

    load()
  }, [router])

  const filtered = customers.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.phone || '').includes(search)
  )

  if (loading) {
    return <main style={{ minHeight: '100vh', background: '#F5EFE2', padding: '2rem 1.5rem' }}><p style={{ color: '#2B2620' }}>Loading...</p></main>
  }

  return (
    <main style={{ minHeight: '100vh', background: '#F5EFE2', padding: '2rem 1.5rem' }}>
      <div style={{ maxWidth: '450px', margin: '0 auto' }}>
        <button
          onClick={() => router.push('/dashboard')}
          style={{ background: 'none', border: 'none', color: '#1E3A5F', fontSize: '0.85rem', padding: 0, marginBottom: '1rem' }}
        >
          ← Back to dashboard
        </button>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
          <h1 style={{ color: '#1E3A5F', fontSize: '1.4rem', margin: 0 }}>
            All customers ({customers.length})
          </h1>
          <a
            href="/dashboard/customers/new"
            style={{ background: '#1E3A5F', color: '#fff', padding: '0.5rem 0.9rem', borderRadius: '8px', fontSize: '0.8rem', fontWeight: '600', textDecoration: 'none' }}
          >
            + Add
          </a>
        </div>

        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or phone..."
          style={{ width: '100%', padding: '0.7rem', borderRadius: '8px', border: '1px solid #ccc', fontSize: '1rem', marginBottom: '1.2rem', boxSizing: 'border-box' }}
        />

        {filtered.length === 0 ? (
          <div style={{ background: '#fff', borderRadius: '12px', padding: '1.5rem', border: '1px solid #e4d8c2', textAlign: 'center', color: '#2B2620' }}>
            <p>No customers found.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {filtered.map((c) => (
              <a
                key={c.id}
                href={`/dashboard/customers/${c.id}`}
                style={{ display: 'block', background: '#fff', borderRadius: '10px', padding: '1rem', border: '1px solid #e4d8c2', textDecoration: 'none' }}
              >
                <p style={{ margin: 0, color: '#1E3A5F', fontWeight: '600' }}>{c.name}</p>
                {c.phone && <p style={{ margin: '0.2rem 0 0', color: '#6B6255', fontSize: '0.85rem' }}>{c.phone}</p>}
              </a>
            ))}
          </div>
        )}
      </div>
    </main>
  )
                                                                                                         }
