'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../../../lib/supabaseClient'
import OrderCard from '../../../../../components/OrderCard'

export default function CustomerOrdersPage({ params }) {
  const router = useRouter()
  const [customer, setCustomer] = useState(null)
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    const { data: customerData } = await supabase
      .from('customers')
      .select('*')
      .eq('id', params.id)
      .single()

    setCustomer(customerData)

    const { data: orderData } = await supabase
      .from('orders')
      .select('*, customers(name, phone)')
      .eq('customer_id', params.id)
      .order('created_at', { ascending: false })

    setOrders(orderData || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [params.id])

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
          onClick={() => router.push('/dashboard/customers')}
          style={{ background: 'none', border: 'none', color: '#1E3A5F', fontSize: '0.85rem', padding: 0, marginBottom: '1rem' }}
        >
          ← Back to customers
        </button>

        <h1 style={{ color: '#1E3A5F', fontSize: '1.4rem', marginBottom: '0.2rem' }}>
          {customer?.name}'s orders
        </h1>
        <p style={{ color: '#6B6255', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
          {orders.length} order{orders.length !== 1 ? 's' : ''}
        </p>

        {orders.length === 0 ? (
          <div style={{ background: '#fff', borderRadius: '12px', padding: '1.5rem', border: '1px solid #e4d8c2', textAlign: 'center', color: '#2B2620' }}>
            <p>No orders yet for this customer.</p>
          </div>
        ) : (
          orders.map((o) => <OrderCard key={o.id} order={o} />)
        )}
      </div>
    </main>
  )
}
