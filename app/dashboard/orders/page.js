'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabaseClient'
import OrderCard from '../../../components/OrderCard'

export default function AllOrdersPage() {
  const router = useRouter()
  const [orders, setOrders] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    const { data: businessData } = await supabase
      .from('businesses')
      .select('*')
      .eq('owner_id', user.id)
      .single()

    const { data: orderData } = await supabase
      .from('orders')
      .select('*, customers(name, phone)')
      .eq('business_id', businessData.id)
      .is('group_order_id', null)
      .order('created_at', { ascending: false })

    setOrders(orderData || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [router])

  const filtered = orders.filter((o) =>
    o.title.toLowerCase().includes(search.toLowerCase()) ||
    (o.customers?.name || '').toLowerCase().includes(search.toLowerCase())
  )

  if (loading) {
    return (
      <main style={{ minHeight: '100vh', background: '#F5EFE2', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
          .cresoa-spinner {
            width: 40px; height: 40px;
            border: 4px solid #e4d8c2;
            border-top: 4px solid #1E3A5F;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
          }
        `}</style>
        <div className="cresoa-spinner"></div>
        <p style={{ color: '#6B6255', fontSize: '0.85rem', marginTop: '1rem' }}>Loading orders...</p>
      </main>
    )
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

        <h1 style={{ color: '#1E3A5F', fontSize: '1.4rem', marginBottom: '1.2rem' }}>
          All orders ({orders.length})
        </h1>

        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by item or customer..."
          style={{ width: '100%', padding: '0.7rem', borderRadius: '8px', border: '1px solid #ccc', fontSize: '1rem', marginBottom: '1.2rem', boxSizing: 'border-box' }}
        />

        {filtered.length === 0 ? (
          <div style={{ background: '#fff', borderRadius: '12px', padding: '1.5rem', border: '1px solid #e4d8c2', textAlign: 'center', color: '#2B2620' }}>
            <p>No orders found.</p>
          </div>
        ) : (
          filtered.map((o) => <OrderCard key={o.id} order={o} />)
        )}
      </div>
    </main>
  )
}
