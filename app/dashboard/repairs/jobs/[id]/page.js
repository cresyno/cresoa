'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { supabase } from '../../../../../lib/supabaseClient'
import { getCurrentBusinessId } from '../../../../../lib/getBusinessId'
import { Icon } from '../../../../../components/Icon'
import { Card } from '../../../../../components/Card'
import { Navigation } from '../../../../../components/Navigation'
import '../../../../globals.css'

export default function RepairJobDetailPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const businessId = getCurrentBusinessId() || searchParams.get('business_id')
  const jobId = params.id

  const [job, setJob] = useState(null)
  const [customer, setCustomer] = useState(null)
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentNote, setPaymentNote] = useState('')
  const [savingPayment, setSavingPayment] = useState(false)
  const [savingEdit, setSavingEdit] = useState(false)
  const [editForm, setEditForm] = useState({
    title: '',
    price: '',
    due_date: ''
  })

  useEffect(() => {
    const load = async () => {
      if (!businessId || !jobId) return
      try {
        const { data: jobData, error: jobError } = await supabase
          .from('orders')
          .select('*, customers (*)')
          .eq('id', jobId)
          .eq('business_id', businessId)
          .eq('sector', 'repairs')
          .single()

        if (jobError) throw jobError
        setJob(jobData)
        setCustomer(jobData.customers)
        setEditForm({
          title: jobData.title || '',
          price: jobData.price || '',
          due_date: jobData.due_date || ''
        })

        const { data: paymentData } = await supabase
          .from('payment_records')
          .select('*')
          .eq('order_id', jobId)
          .order('created_at', { ascending: false })
        setPayments(paymentData || [])
      } catch (err) {
        console.error('Error loading job:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [businessId, jobId])

  const balance = useMemo(() => {
    return Math.max((Number(job?.price || 0)) - (Number(job?.amount_paid || 0)), 0)
  }, [job])

  const isPaid = balance <= 0

  if (loading) {
    return (
      <div style={{ padding: '1.5rem', maxWidth: '800px', margin: '0 auto', background: 'var(--cresoa-bg)' }}>
        <Navigation businessId={businessId} />
        <p style={{ color: 'var(--cresoa-text-muted)' }}>Loading job...</p>
      </div>
    )
  }

  if (!job) {
    return (
      <div style={{ padding: '1.5rem', maxWidth: '800px', margin: '0 auto', background: 'var(--cresoa-bg)' }}>
        <Navigation businessId={businessId} />
        <Card style={{ padding: '2rem', textAlign: 'center' }}>
          <Icon name="alert-circle" size={32} stroke="var(--cresoa-danger)" />
          <p style={{ marginTop: '1rem' }}>Job not found.</p>
          <button onClick={() => router.push(`/dashboard/repairs/jobs?business_id=${businessId}`)} className="cresoa-primary-button">Back to Jobs</button>
        </Card>
      </div>
    )
  }

  const STATUS_FLOW = ['Diagnosis', 'In Progress', 'Awaiting Parts', 'Ready', 'Delivered']
  const currentStatusIndex = STATUS_FLOW.findIndex(s => s === job.current_status)
  const statusIndex = currentStatusIndex >= 0 ? currentStatusIndex : 0

  const handleSavePayment = async (e) => {
    e.preventDefault()
    const amount = parseFloat(paymentAmount)
    if (!amount || amount <= 0) { alert('Enter a valid amount.'); return }
    if (amount > balance) { alert(`Amount exceeds balance (₦${balance.toLocaleString()}).`); return }

    setSavingPayment(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const { error: payError } = await supabase.from('payment_records').insert({
        business_id: businessId,
        order_id: jobId,
        amount: amount,
        note: paymentNote || 'Payment recorded',
        created_by: session.user.id
      })
      if (payError) throw payError

      const newPaid = Number(job.amount_paid || 0) + amount
      const newStatus = newPaid >= Number(job.price) ? 'Delivered' : job.current_status
      await supabase.from('orders').update({ amount_paid: newPaid, current_status: newStatus }).eq('id', jobId)

      setJob({ ...job, amount_paid: newPaid, current_status: newStatus })
      setPayments([...payments, { id: Date.now(), amount, note: paymentNote || 'Payment recorded', created_at: new Date().toISOString() }])
      setShowPaymentModal(false)
      setPaymentAmount('')
      setPaymentNote('')
      alert('Payment recorded successfully!')
    } catch (err) {
      alert('Failed to record payment: ' + err.message)
    } finally {
      setSavingPayment(false)
    }
  }

  const handleSaveEdit = async (e) => {
    e.preventDefault()
    setSavingEdit(true)
    try {
      const { error } = await supabase.from('orders').update({
        title: editForm.title,
        price: Number(editForm.price) || 0,
        due_date: editForm.due_date || null
      }).eq('id', jobId)
      if (error) throw error
      setJob({ ...job, title: editForm.title, price: Number(editForm.price) || 0, due_date: editForm.due_date || null })
      setShowEditModal(false)
      alert('Job updated successfully!')
    } catch (err) {
      alert('Failed to update job: ' + err.message)
    } finally {
      setSavingEdit(false)
    }
  }

  const handleCreateInvoice = () => {
    router.push(`/dashboard/invoices/new?order_id=${jobId}&business_id=${businessId}`)
  }

  return (
    <div style={{ padding: '1.5rem', maxWidth: '800px', margin: '0 auto', background: 'var(--cresoa-bg)', paddingBottom: '100px' }}>
      <Navigation businessId={businessId} />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
        <button onClick={() => router.push(`/dashboard/repairs/jobs?business_id=${businessId}`)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cresoa-text-muted)', fontSize: '0.85rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
          <Icon name="arrow-left" size={16} stroke="currentColor" /> Back to Jobs
        </button>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button onClick={handleCreateInvoice} className="cresoa-primary-button" style={{ fontSize: '0.8rem', padding: '0.4rem 0.9rem' }}>
            <Icon name="file-text" size={14} stroke="#fff" /> Create Invoice
          </button>
          <button onClick={() => setShowEditModal(true)} style={{ background: 'transparent', border: '1px solid var(--cresoa-border)', padding: '0.4rem 0.9rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.8rem', color: 'var(--cresoa-text)' }}>
            <Icon name="edit" size={14} stroke="currentColor" /> Edit
          </button>
        </div>
      </div>

      {/* Progress Flow */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.3rem' }}>
          {STATUS_FLOW.map((status, idx) => (
            <div key={status} style={{ flex: 1, textAlign: 'center' }}>
              <div style={{
                width: '28px', height: '28px', margin: '0 auto 0.3rem', borderRadius: '50%',
                background: idx <= statusIndex ? 'var(--cresoa-accent)' : 'var(--cresoa-border)',
                color: idx <= statusIndex ? '#fff' : 'var(--cresoa-text-muted)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: '0.75rem'
              }}>
                {idx <= statusIndex ? <Icon name="check" size={14} stroke="#fff" /> : idx + 1}
              </div>
              <div style={{ fontSize: '0.6rem', color: idx === statusIndex ? 'var(--cresoa-accent)' : 'var(--cresoa-text-muted)', fontWeight: idx === statusIndex ? 700 : 400, whiteSpace: 'nowrap' }}>
                {status}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Money Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '0.5rem', marginBottom: '1rem' }}>
        <Card style={{ padding: '0.6rem', textAlign: 'center' }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--cresoa-text-muted)' }}>Total</div>
          <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--cresoa-text)' }}>₦{Number(job.price || 0).toLocaleString()}</div>
        </Card>
        <Card style={{ padding: '0.6rem', textAlign: 'center', borderColor: isPaid ? 'var(--cresoa-success)' : 'var(--cresoa-border)' }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--cresoa-text-muted)' }}>Paid</div>
          <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--cresoa-success)' }}>₦{Number(job.amount_paid || 0).toLocaleString()}</div>
        </Card>
        <Card style={{ padding: '0.6rem', textAlign: 'center', borderColor: balance > 0 ? 'var(--cresoa-danger)' : 'var(--cresoa-success)' }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--cresoa-text-muted)' }}>Balance</div>
          <div style={{ fontWeight: 700, fontSize: '1rem', color: balance > 0 ? 'var(--cresoa-danger)' : 'var(--cresoa-success)' }}>₦{balance.toLocaleString()}</div>
        </Card>
        <Card style={{ padding: '0.6rem', textAlign: 'center', borderColor: job.due_date && new Date(job.due_date) < new Date() && job.current_status !== 'Delivered' ? 'var(--cresoa-danger)' : 'var(--cresoa-border)' }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--cresoa-text-muted)' }}>Due</div>
          <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--cresoa-text)' }}>{job.due_date ? new Date(job.due_date).toLocaleDateString() : '—'}</div>
        </Card>
      </div>

      {/* Customer Card */}
      {customer && (
        <Card style={{ padding: '1rem', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            <span className="cresoa-avatar" style={{ width: '48px', height: '48px', fontSize: '18px' }}>{customer.name?.charAt(0) || '?'}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600 }}>{customer.name || 'Customer'}</div>
              {customer.phone && <div style={{ fontSize: '0.8rem', color: 'var(--cresoa-text-muted)' }}>{customer.phone}</div>}
              {customer.email && <div style={{ fontSize: '0.8rem', color: 'var(--cresoa-text-muted)' }}>{customer.email}</div>}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.8rem' }}>
            {customer.phone && (
              <a href={`tel:${customer.phone}`} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.4rem 0.8rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', textDecoration: 'none', color: 'var(--cresoa-text)', fontSize: '0.8rem' }}>
                <Icon name="phone" size={14} stroke="currentColor" /> Call
              </a>
            )}
            {customer.phone && (
              <button onClick={() => window.open(`https://wa.me/${customer.phone.replace(/\D/g, '')}`, '_blank')} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.4rem 0.8rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'transparent', color: 'var(--cresoa-text)', fontSize: '0.8rem', cursor: 'pointer' }}>
                <Icon name="message-circle" size={14} stroke="currentColor" /> WhatsApp
              </button>
            )}
          </div>
        </Card>
      )}

      {/* Device Details */}
      <Card style={{ padding: '1rem', marginBottom: '1rem' }}>
        <h3 style={{ margin: '0 0 0.75rem', fontSize: '0.9rem', fontWeight: 600 }}>Device & Fault</h3>
        <div style={{ display: 'grid', gap: '0.5rem', fontSize: '0.85rem' }}>
          <div><strong>Device:</strong> {job.title || '—'}</div>
          <div><strong>Type:</strong> {job.category || '—'}</div>
          {job.description && <div><strong>Description:</strong> <span style={{ whiteSpace: 'pre-wrap' }}>{job.description}</span></div>}
          {job.notes && <div><strong>Internal Notes:</strong> <span style={{ whiteSpace: 'pre-wrap' }}>{job.notes}</span></div>}
        </div>
      </Card>

      {/* Quick Actions */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <button onClick={() => setShowPaymentModal(true)} disabled={isPaid} className="cresoa-primary-button" style={{ flex: 1, fontSize: '0.8rem', opacity: isPaid ? 0.6 : 1 }}>
          <Icon name="credit-card" size={14} stroke="#fff" /> Record Payment
        </button>
      </div>

      {/* Payment History */}
      {payments.length > 0 && (
        <Card style={{ padding: '1rem', marginBottom: '1rem' }}>
          <h3 style={{ margin: '0 0 0.75rem', fontSize: '0.9rem', fontWeight: 600 }}>Payment History</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {payments.map(p => (
              <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0.6rem', background: 'var(--cresoa-bg)', borderRadius: '6px' }}>
                <div>
                  <span style={{ fontWeight: 600 }}>₦{Number(p.amount || 0).toLocaleString()}</span>
                  <span style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.75rem', marginLeft: '0.5rem' }}>{p.note || 'Payment'}</span>
                </div>
                <span style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.7rem' }}>{new Date(p.created_at).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }} onClick={() => setShowPaymentModal(false)}>
          <form onSubmit={handleSavePayment} onClick={(e) => e.stopPropagation()} style={{ background: 'var(--cresoa-surface)', borderRadius: '16px', padding: '1.5rem', width: '100%', maxWidth: '420px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1rem' }}>Record Payment</h3>
              <button type="button" onClick={() => setShowPaymentModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cresoa-text-muted)' }}>
                <Icon name="x" size={20} stroke="currentColor" />
              </button>
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.3rem' }}>Amount (₦)</label>
              <input type="number" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} placeholder={`Max ₦${balance.toLocaleString()}`} style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-bg)', color: 'var(--cresoa-text)' }} required />
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.3rem' }}>Note</label>
              <input type="text" value={paymentNote} onChange={(e) => setPaymentNote(e.target.value)} placeholder="e.g. Cash payment" style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-bg)', color: 'var(--cresoa-text)' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button type="button" onClick={() => setShowPaymentModal(false)} style={{ padding: '0.4rem 1rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'transparent', cursor: 'pointer' }}>Cancel</button>
              <button type="submit" disabled={savingPayment} className="cresoa-primary-button" style={{ padding: '0.4rem 1.5rem', opacity: savingPayment ? 0.7 : 1 }}>
                {savingPayment ? 'Saving...' : 'Save Payment'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }} onClick={() => setShowEditModal(false)}>
          <form onSubmit={handleSaveEdit} onClick={(e) => e.stopPropagation()} style={{ background: 'var(--cresoa-surface)', borderRadius: '16px', padding: '1.5rem', width: '100%', maxWidth: '420px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1rem' }}>Edit Job</h3>
              <button type="button" onClick={() => setShowEditModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cresoa-text-muted)' }}>
                <Icon name="x" size={20} stroke="currentColor" />
              </button>
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.3rem' }}>Job Title</label>
              <input type="text" value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-bg)', color: 'var(--cresoa-text)' }} />
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.3rem' }}>Total Price (₦)</label>
              <input type="number" value={editForm.price} onChange={(e) => setEditForm({ ...editForm, price: e.target.value })} style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-bg)', color: 'var(--cresoa-text)' }} />
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.3rem' }}>Due Date</label>
              <input type="date" value={editForm.due_date} onChange={(e) => setEditForm({ ...editForm, due_date: e.target.value })} style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-bg)', color: 'var(--cresoa-text)' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button type="button" onClick={() => setShowEditModal(false)} style={{ padding: '0.4rem 1rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'transparent', cursor: 'pointer' }}>Cancel</button>
              <button type="submit" disabled={savingEdit} className="cresoa-primary-button" style={{ padding: '0.4rem 1.5rem', opacity: savingEdit ? 0.7 : 1 }}>
                {savingEdit ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div style={{ marginTop: '2rem' }}>
        <Navigation businessId={businessId} />
      </div>
    </div>
  )
        }
