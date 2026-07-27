'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabaseClient'
import { showToast } from '../../../lib/toast'

export default function RemindersPage() {
  const router = useRouter()
  const [business, setBusiness] = useState(null)
  const [debtors, setDebtors] = useState([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    const { data: biz } = await supabase.from('businesses').select('*').eq('owner_id', user.id).single()
    setBusiness(biz)
    const { data: orders } = await supabase.from('orders').select('*, customers(name, phone)').eq('business_id', biz.id)
    setDebtors((orders || []).filter(o => o.price - o.amount_paid > 0))
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const send = async (order) => {
    const phone = order.customers?.phone?.startsWith('0') ? '234' + order.customers.phone.slice(1) : order.customers?.phone
    if (!phone) { alert('No phone saved.'); return }
    const bal = order.price - order.amount_paid
    const msg = `Hi ${order.customers?.name}, this is a reminder for your balance of ₦${bal.toLocaleString()} for ${order.title}. Thank you - ${business?.name}`
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank')
    await supabase.from('orders').update({ last_reminder_sent_at: new Date().toISOString() }).eq('id', order.id)
    showToast('Reminder sent!', '#4C7A5E')
  }

  if (loading) return <main style={{ minHeight: '100vh', background: '#F5EFE2', padding: '2rem' }}><p>Loading...</p></main>

  return (
    <main style={{ minHeight: '100vh', background: '#F5EFE2', padding: '2rem 1.5rem' }}>
      <div style={{ maxWidth: '450px', margin: '0 auto' }}>
        <button onClick={() => router.push('/dashboard')} style={{ background: 'none', border: 'none', color: '#1E3A5F', marginBottom: '1rem' }}>← Back</button>
        <h1 style={{ color: '#1E3A5F', fontSize: '1.4rem', marginBottom: '1rem' }}>Debtors ({debtors.length})</h1>
        {debtors.map(o => (
          <div key={o.id} style={{ background: '#fff', borderRadius: '10px', padding: '1rem', border: '1px solid #e4d8c2', marginBottom: '0.6rem' }}>
            <p style={{ margin: 0, fontWeight: '600', color: '#1E3A5F' }}>{o.customers?.name} — {o.title}</p>
            <p style={{ margin: '0.2rem 0 0.6rem', color: '#AE4A34' }}>₦{(o.price - o.amount_paid).toLocaleString()} owing</p>
            <button onClick={() => send(o)} style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: 'none', background: '#4C7A5E', color: '#fff', fontWeight: '600' }}>Send reminder</button>
          </div>
        ))}
      </div>
    </main>
  )
      }
