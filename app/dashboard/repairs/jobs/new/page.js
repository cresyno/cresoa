'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../../../../lib/supabaseClient'
import { Navigation } from '../../../../../components/Navigation'

// ─── Self-contained SVG icons ───
const Svg = ({ name, size = 20, stroke = 'currentColor' }) => {
  const icons = {
    back: <><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></>,
    check: <polyline points="20 6 9 17 4 12" />,
    naira: <><path d="M6 3v18M18 3v18M6 8h12M6 16h12" /><path d="M6 3l6 9 6-9M6 21l6-9 6 9" /></>,
    user: <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></>,
    tool: <><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" /></>,
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{icons[name]}</svg>
}

// ─── Button Styles ───
const goldBtn = {
  background: '#D4A52A', color: '#fff', border: 'none', padding: '0.8rem',
  borderRadius: '8px', fontWeight: 700, cursor: 'pointer', fontSize: '1rem',
  width: '100%', boxShadow: '0 2px 8px rgba(212,165,42,0.3)',
}

const whiteBtn = {
  background: '#fff', color: '#0F2B4A', border: '1px solid #E5E0D8', padding: '0.8rem',
  borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '1rem',
  width: '100%',
}

export default function NewRepairJobPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const businessId = searchParams.get('business_id')

  const [step, setStep] = useState(1)
  const [customers, setCustomers] = useState([])
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ title: '', customer_id: '', description: '', price: '', due_date: '' })

  useEffect(() => {
    const fetchCustomers = async () => {
      if (!businessId) return
      const { data } = await supabase.from('customers').select('id, name').eq('business_id', businessId).eq('sector', 'repairs').order('name')
      setCustomers(data || [])
    }
    fetchCustomers()
  }, [businessId])

  const handleSave = async () => {
    if (!form.title || !form.price) { alert('Please fill in title and price.'); return }
    setSaving(true)
    try {
      const { error } = await supabase.from('orders').insert({
        business_id: businessId,
        sector: 'repairs',
        title: form.title,
        customer_id: form.customer_id || null,
        description: form.description || null,
        price: Number(form.price) || 0,
        amount_paid: 0,
        current_status: 'In Progress',
        due_date: form.due_date || null,
      })
      if (error) throw error
      router.push(`/dashboard/repairs/jobs?business_id=${businessId}`)
    } catch (e) {
      alert('Failed to save job: ' + e.message)
    } finally { setSaving(false) }
  }

  return (
    <div style={{ padding: '1.5rem', maxWidth: '600px', margin: '0 auto', background: '#F8F6F2', minHeight: '100vh' }}>
      <Navigation businessId={businessId} />
      
      <button onClick={() => router.push(`/dashboard/repairs/jobs?business_id=${businessId}`)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0F2B4A', fontSize: '1rem', marginBottom: '1rem' }}>
        <Svg name="back" size={16} stroke="#0F2B4A" /> Back
      </button>

      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1A1A1A', marginBottom: '0.5rem' }}>New Repair Job</h1>
      
      {/* Step Progress */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2rem' }}>
        {[1, 2, 3].map(s => (
          <div key={s} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
            <div style={{ width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.8rem', background: step >= s ? '#D4A52A' : '#E5E0D8', color: step >= s ? '#fff' : '#8A8A8A' }}>{s}</div>
            {s < 3 && <div style={{ flex: 1, height: '2px', background: step > s ? '#D4A52A' : '#E5E0D8' }} />}
          </div>
        ))}
      </div>

      {/* STEP 1: Device Info */}
      {step === 1 && (
        <div style={{ background: '#fff', borderRadius: '16px', padding: '1.5rem', border: '1px solid #E5E0D8' }}>
          <h3 style={{ margin: '0 0 1rem', color: '#1A1A1A' }}>Device Information</h3>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem', color: '#1A1A1A' }}>Device / Job Title <span style={{ color: '#D9534F' }}>*</span></label>
            <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. iPhone 13 screen replacement" style={{ width: '100%', padding: '0.7rem', borderRadius: '8px', border: '1px solid #E5E0D8', background: '#F8F6F2', color: '#1A1A1A', fontSize: '1rem' }} />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem', color: '#1A1A1A' }}>Description / Fault</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} placeholder="e.g. Broken screen, battery not charging..." style={{ width: '100%', padding: '0.7rem', borderRadius: '8px', border: '1px solid #E5E0D8', background: '#F8F6F2', color: '#1A1A1A', fontSize: '0.9rem', resize: 'vertical' }} />
          </div>
          <button onClick={() => setStep(2)} disabled={!form.title} style={{ ...goldBtn, opacity: form.title ? 1 : 0.5 }}>Continue</button>
        </div>
      )}

      {/* STEP 2: Customer & Price */}
      {step === 2 && (
        <div style={{ background: '#fff', borderRadius: '16px', padding: '1.5rem', border: '1px solid #E5E0D8' }}>
          <h3 style={{ margin: '0 0 1rem', color: '#1A1A1A' }}>Customer & Price</h3>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem', color: '#1A1A1A' }}>Customer</label>
            <select value={form.customer_id} onChange={(e) => setForm({ ...form, customer_id: e.target.value })} style={{ width: '100%', padding: '0.7rem', borderRadius: '8px', border: '1px solid #E5E0D8', background: '#F8F6F2', color: '#1A1A1A', fontSize: '1rem' }}>
              <option value="">Select customer (optional)</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem', color: '#1A1A1A' }}>Price (₦) <span style={{ color: '#D9534F' }}>*</span></label>
            <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #E5E0D8', borderRadius: '8px', background: '#F8F6F2' }}>
              <span style={{ padding: '0.7rem', color: '#8A8A8A' }}><Svg name="naira" size={16} stroke="#8A8A8A" /></span>
              <input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="0" style={{ flex: 1, border: 'none', background: 'transparent', padding: '0.7rem', color: '#1A1A1A', fontSize: '1rem' }} />
            </div>
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem', color: '#1A1A1A' }}>Due Date</label>
            <input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} style={{ width: '100%', padding: '0.7rem', borderRadius: '8px', border: '1px solid #E5E0D8', background: '#F8F6F2', color: '#1A1A1A', fontSize: '1rem' }} />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={() => setStep(1)} style={whiteBtn}>Back</button>
            <button onClick={() => setStep(3)} disabled={!form.price} style={{ ...goldBtn, opacity: form.price ? 1 : 0.5 }}>Review</button>
          </div>
        </div>
      )}

      {/* STEP 3: Review & Save */}
      {step === 3 && (
        <div style={{ background: '#fff', borderRadius: '16px', padding: '1.5rem', border: '1px solid #E5E0D8' }}>
          <h3 style={{ margin: '0 0 1rem', color: '#1A1A1A' }}>Review Job</h3>
          <div style={{ background: '#F8F6F2', borderRadius: '8px', padding: '1rem', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}><span style={{ color: '#8A8A8A' }}>Device:</span><strong style={{ color: '#1A1A1A' }}>{form.title}</strong></div>
            {form.customer_id && customers.find(c => c.id === form.customer_id) && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}><span style={{ color: '#8A8A8A' }}>Customer:</span><strong style={{ color: '#1A1A1A' }}>{customers.find(c => c.id === form.customer_id).name}</strong></div>
            )}
            {form.description && <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}><span style={{ color: '#8A8A8A' }}>Fault:</span><strong style={{ color: '#1A1A1A' }}>{form.description}</strong></div>}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}><span style={{ color: '#8A8A8A' }}>Price:</span><strong style={{ color: '#D4A52A' }}>₦{Number(form.price).toLocaleString()}</strong></div>
            {form.due_date && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#8A8A8A' }}>Due:</span><strong style={{ color: '#1A1A1A' }}>{new Date(form.due_date).toLocaleDateString()}</strong></div>}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={() => setStep(2)} style={whiteBtn}>Back</button>
            <button onClick={handleSave} disabled={saving} style={{ ...goldBtn, opacity: saving ? 0.7 : 1 }}>{saving ? 'Saving...' : 'Save Job'}</button>
          </div>
        </div>
      )}

      <div style={{ marginTop: '2rem' }}><Navigation businessId={businessId} /></div>
    </div>
  )
    }
