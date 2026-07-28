'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../../lib/supabaseClient'
import { showToast } from '../../../../lib/toast'

const REPAIR_STAGES = ['Diagnosing', 'Awaiting Parts', 'Repairing', 'Ready', 'Completed', 'Delivered']

export default function RepairJobDetailPage({ params }) {
  const router = useRouter()
  const [job, setJob] = useState(null)
  const [business, setBusiness] = useState(null)
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)

  // Edit form state
  const [deviceType, setDeviceType] = useState('')
  const [deviceModel, setDeviceModel] = useState('')
  const [serialNumber, setSerialNumber] = useState('')
  const [deviceCondition, setDeviceCondition] = useState('')
  const [deviceColor, setDeviceColor] = useState('')
  const [issueDescription, setIssueDescription] = useState('')
  const [price, setPrice] = useState('')
  const [deposit, setDeposit] = useState('')
  const [estimatedTime, setEstimatedTime] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [status, setStatus] = useState('Diagnosing')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  // Payment form
  const [showPaymentForm, setShowPaymentForm] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentNote, setPaymentNote] = useState('')
  const [recordingPayment, setRecordingPayment] = useState(false)

  // Internal notes
  const [internalNotes, setInternalNotes] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)
  const [notesMessage, setNotesMessage] = useState('')

  // Delete state
  const [deleting, setDeleting] = useState(false)

  // Parts used in the job
  const [partsUsed, setPartsUsed] = useState([])

  const load = async () => {
    const { data: jobData } = await supabase
      .from('orders')
      .select('*, customers(name, phone)')
      .eq('id', params.id)
      .single()

    setJob(jobData)
    if (jobData) {
      setDeviceType(jobData.device_type || '')
      setDeviceModel(jobData.device_model || '')
      setSerialNumber(jobData.serial_number || '')
      setDeviceCondition(jobData.device_condition || '')
      setDeviceColor(jobData.device_color || '')
      setIssueDescription(jobData.customer_notes || '')
      setPrice(jobData.price?.toString() || '')
      setDeposit(jobData.amount_paid?.toString() || '')
      setEstimatedTime(jobData.estimated_repair_time?.toString() || '')
      setDueDate(jobData.due_date || '')
      setStatus(jobData.current_status || 'Diagnosing')
      setInternalNotes(jobData.internal_notes || '')
      setPartsUsed(jobData.parts_used || [])

      const { data: businessData } = await supabase
        .from('businesses')
        .select('name')
        .eq('id', jobData.business_id)
        .single()

      setBusiness(businessData)

      const { data: paymentData } = await supabase
        .from('payment_records')
        .select('*')
        .eq('order_id', params.id)
        .order('created_at', { ascending: false })
      setPayments(paymentData || [])
    }

    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [params.id])

  const getStatusInfo = (status) => {
    const map = {
      'Diagnosing': { label: 'Diagnosing', color: '#6B6255', bg: '#F0EDE8' },
      'Awaiting Parts': { label: 'Awaiting Parts', color: '#B4881E', bg: '#F6E9C8' },
      'Repairing': { label: 'Repairing', color: '#1E3A5F', bg: '#D6E0EB' },
      'Ready': { label: 'Ready for Pickup', color: '#4C7A5E', bg: '#DCEBE2' },
      'Completed': { label: 'Completed', color: '#4C7A5E', bg: '#DCEBE2' },
      'Delivered': { label: 'Delivered', color: '#6B6255', bg: '#E8E0D5' },
    }
    return map[status] || { label: status || 'Diagnosing', color: '#6B6255', bg: '#F0EDE8' }
  }

  const formatDate = (d) => {
    if (!d) return ''
    return new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  const formatPhone = (phone) => {
    if (!phone) return ''
    return phone.startsWith('0') ? '234' + phone.slice(1) : phone
  }

  const advanceStatus = async () => {
    const currentIndex = REPAIR_STAGES.indexOf(job.current_status)
    if (currentIndex === -1 || currentIndex === REPAIR_STAGES.length - 1) return
    await supabase.from('orders').update({ current_status: REPAIR_STAGES[currentIndex + 1] }).eq('id', job.id)
    load()
  }

  const undoStatus = async () => {
    const currentIndex = REPAIR_STAGES.indexOf(job.current_status)
    if (currentIndex <= 0) return
    await supabase.from('orders').update({ current_status: REPAIR_STAGES[currentIndex - 1] }).eq('id', job.id)
    load()
  }

  const copyTrackingLink = () => {
    const link = `https://cresoa.vercel.app/track/${job.tracking_token}`
    navigator.clipboard.writeText(link)
    showToast('Tracking link copied!', '#1E3A5F')
  }

  const sendLinkViaWhatsApp = () => {
    const phone = formatPhone(job.customers?.phone)
    if (!phone) {
      alert('This customer has no phone number saved.')
      return
    }
    const link = `https://cresoa.vercel.app/track/${job.tracking_token}`
    const msg = `Hi ${job.customers?.name}! This is ${business?.name}. Here's your job tracking link — you can check your repair status anytime: ${link}`
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank')
  }

  const sendStatusUpdate = () => {
    const phone = formatPhone(job.customers?.phone)
    if (!phone) {
      alert('This customer has no phone number saved.')
      return
    }
    const status = getStatusInfo(job.current_status)
    const msg = `Hi ${job.customers?.name}, this is ${business?.name}. Your repair "${job.title}" is now at the "${status.label}" stage.`
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank')
  }

  const sendReminder = async () => {
    const phone = formatPhone(job.customers?.phone)
    if (!phone) {
      alert('This customer has no phone number saved.')
      return
    }
    const bal = job.price - job.amount_paid
    const msg = `Hi ${job.customers?.name}, this is a reminder for your balance of ₦${bal.toLocaleString()} for "${job.title}". Thank you.`
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank')
    await supabase.from('orders').update({ last_reminder_sent_at: new Date().toISOString() }).eq('id', job.id)
    load()
  }

  const duplicateJob = () => {
    router.push(`/dashboard/repairs/jobs/new?duplicate=${job.id}`)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setMessage('')
    setSaving(true)

    const { error } = await supabase
      .from('orders')
      .update({
        device_type: deviceType.trim(),
        device_model: deviceModel.trim(),
        serial_number: serialNumber.trim(),
        device_condition: deviceCondition.trim(),
        device_color: deviceColor.trim(),
        customer_notes: issueDescription.trim(),
        price: Number(price) || 0,
        amount_paid: Number(deposit) || 0,
        estimated_repair_time: Number(estimatedTime) || null,
        due_date: dueDate || null,
        current_status: status,
      })
      .eq('id', job.id)

    if (error) {
      setMessage('Error: ' + error.message)
      setSaving(false)
      return
    }

    setMessage('✅ Saved!')
    setSaving(false)
    load()
  }

  const handleSaveNotes = async () => {
    setNotesMessage('')
    setSavingNotes(true)

    const { error } = await supabase
      .from('orders')
      .update({ internal_notes: internalNotes })
      .eq('id', job.id)

    if (error) {
      setNotesMessage('Error saving notes.')
    } else {
      setNotesMessage('✅ Notes saved!')
    }
    setSavingNotes(false)
  }

  const handleRecordPayment = async (e) => {
    e.preventDefault()
    const amount = Number(paymentAmount)

    if (!amount || amount <= 0) {
      alert('Enter a valid payment amount.')
      return
    }

    const newTotal = job.amount_paid + amount
    if (newTotal > job.price) {
      alert(`This payment would exceed the job price (₦${job.price.toLocaleString()}).`)
      return
    }

    setRecordingPayment(true)

    await supabase.from('payment_records').insert({
      order_id: job.id,
      amount: amount,
      note: paymentNote || null,
    })

    await supabase
      .from('orders')
      .update({ amount_paid: newTotal })
      .eq('id', job.id)

    setPaymentAmount('')
    setPaymentNote('')
    setShowPaymentForm(false)
    setRecordingPayment(false)
    load()
  }

  const handleDelete = async () => {
    const confirmed = window.confirm(`Delete this repair job? This cannot be undone.`)
    if (!confirmed) return

    setDeleting(true)
    await supabase.from('orders').delete().eq('id', job.id)
    router.push('/dashboard/repairs')
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#F5EFE2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
          .spinner {
            width: 40px; height: 40px;
            border: 4px solid #e4d8c2;
            border-top: 4px solid #1E3A5F;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
          }
        `}</style>
        <div className="spinner"></div>
        <p style={{ color: '#6B6255', marginTop: '1rem' }}>Loading job...</p>
      </div>
    )
  }

  if (!job) {
    return (
      <div style={{ minHeight: '100vh', background: '#F5EFE2', padding: '2rem', textAlign: 'center' }}>
        <p style={{ color: '#2B2620' }}>Job not found.</p>
        <button onClick={() => router.push('/dashboard/repairs')}>← Back to repairs</button>
      </div>
    )
  }

  const statusInfo = getStatusInfo(job.current_status)
  const balance = job.price - job.amount_paid
  const currentIndex = REPAIR_STAGES.indexOf(job.current_status)
  const isLastStage = currentIndex === REPAIR_STAGES.length - 1
  const isFirstStage = currentIndex === 0

  const inputStyle = {
    width: '100%', padding: '0.7rem', borderRadius: '8px',
    border: '1px solid #E8E0D5', fontSize: '1rem', boxSizing: 'border-box',
    background: '#fff', color: '#2B2620',
    transition: 'border-color 0.2s ease',
  }

  const labelStyle = { display: 'block', color: '#2B2620', marginBottom: '0.3rem', fontSize: '0.85rem', fontWeight: '500' }

  return (
    <main style={{ minHeight: '100vh', background: '#F5EFE2', padding: '1.5rem 1.2rem' }}>
      <style>{`
        .card {
          background: #fff;
          border-radius: 14px;
          padding: 1.2rem;
          border: 1px solid #E8E0D5;
          margin-bottom: 1rem;
          box-shadow: 0 2px 8px rgba(30,58,95,0.04);
        }
        .stat-card {
          background: #fff;
          border-radius: 10px;
          padding: 0.6rem 0.4rem;
          border: 1px solid #E8E0D5;
          text-align: center;
          flex: 1;
          min-width: 60px;
        }
        .stat-card .value {
          font-size: 1.1rem;
          font-weight: 700;
          margin: 0;
        }
        .stat-card .value.red { color: #AE4A34; }
        .stat-card .value.green { color: #4C7A5E; }
        .stat-card .value.navy { color: #1E3A5F; }
        .stat-card .label {
          color: #6B6255;
          font-size: 0.6rem;
          margin: 0.1rem 0 0;
        }
        .status-timeline {
          display: flex;
          justify-content: space-between;
          margin-bottom: 1rem;
          position: relative;
        }
        .status-timeline::before {
          content: '';
          position: absolute;
          top: 50%;
          left: 10%;
          right: 10%;
          height: 2px;
          background: #E8E0D5;
          transform: translateY(-50%);
        }
        .status-dot {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.2rem;
          position: relative;
          z-index: 1;
          flex: 1;
        }
        .status-dot .dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          border: 2px solid #E8E0D5;
          background: #fff;
          transition: all 0.3s ease;
        }
        .status-dot .dot.active {
          width: 16px;
          height: 16px;
          border-color: #C79A2B;
          background: #C79A2B;
        }
        .status-dot .dot.done {
          border-color: #4C7A5E;
          background: #4C7A5E;
        }
        .status-dot .label {
          font-size: 0.55rem;
          color: #6B6255;
          text-align: center;
          max-width: 40px;
        }
        .status-dot .label.active {
          color: #1E3A5F;
          font-weight: 600;
        }
        .btn {
          padding: 0.4rem 0.8rem;
          border-radius: 6px;
          font-size: 0.7rem;
          font-weight: 600;
          text-decoration: none;
          border: 1px solid #E8E0D5;
          background: #fff;
          color: #1E3A5F;
          cursor: pointer;
          transition: background 0.1s ease;
          display: inline-flex;
          align-items: center;
          gap: 0.2rem;
        }
        .btn:hover { background: #F5EFE2; }
        .btn-primary {
          background: #1E3A5F;
          border-color: #1E3A5F;
          color: #fff;
        }
        .btn-primary:hover { background: #0F1E30; }
        .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
        .btn-gold {
          background: #C79A2B;
          border-color: #C79A2B;
          color: #1E3A5F;
        }
        .btn-gold:hover { background: #B4881E; }
        .btn-green {
          background: #4C7A5E;
          border-color: #4C7A5E;
          color: #fff;
        }
        .btn-green:hover { background: #3A5F4A; }
        .btn-red {
          background: #AE4A34;
          border-color: #AE4A34;
          color: #fff;
        }
        .btn-red:hover { background: #8A3626; }
        .btn-block { width: 100%; justify-content: center; }
        .back-link {
          background: none;
          border: none;
          color: #1E3A5F;
          font-size: 0.85rem;
          padding: 0;
          margin-bottom: 1rem;
          cursor: pointer;
        }
        .back-link:hover { text-decoration: underline; }
        .header-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-bottom: 0.5rem;
        }
        .header-row .name-section { flex: 1; }
        .header-row .name-section h1 {
          color: #1E3A5F;
          font-size: 1.3rem;
          font-weight: 700;
          margin: 0;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-wrap: wrap;
        }
        .header-row .name-section .customer {
          color: #6B6255;
          font-size: 0.9rem;
          margin: 0.1rem 0 0;
        }
        .header-actions {
          display: flex;
          gap: 0.3rem;
          flex-wrap: wrap;
        }
        .stats-row {
          display: flex;
          gap: 0.4rem;
          margin-bottom: 1rem;
          flex-wrap: wrap;
        }
        .action-row {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
          margin-bottom: 1rem;
        }
        .payment-row {
          display: flex;
          justify-content: space-between;
          padding: 0.3rem 0;
          border-bottom: 1px solid #F0EDE8;
          font-size: 0.8rem;
        }
        .payment-row:last-child { border-bottom: none; }
        .order-status-badge {
          display: inline-block;
          padding: 0.2rem 0.7rem;
          border-radius: 20px;
          font-size: 0.7rem;
          font-weight: 600;
          letter-spacing: 0.3px;
          text-transform: uppercase;
        }
        .parts-used-item {
          display: flex;
          justify-content: space-between;
          padding: 0.3rem 0;
          border-bottom: 1px solid #F0EDE8;
          font-size: 0.85rem;
        }
        .parts-used-item:last-child { border-bottom: none; }
        @media (max-width: 420px) {
          .header-row { flex-direction: column; }
          .header-actions { width: 100%; }
          .action-row { flex-direction: column; }
          .action-row button { width: 100%; }
          .status-timeline { flex-wrap: wrap; gap: 0.2rem; }
          .status-dot .label { font-size: 0.5rem; max-width: 30px; }
        }
      `}</style>

      <button className="back-link" onClick={() => router.back()}>← Back</button>
<div className="header-row">
  <div className="name-section">
    <h1>
      {job.title || 'Repair Job'}
      <span className="order-status-badge" style={{ background: statusInfo.bg, color: statusInfo.color }}>
        {statusInfo.label}
      </span>
    </h1>
    <p className="customer">
      👤 {job.customers?.name || 'No customer'}
      {job.customers?.phone && ` · 📱 ${job.customers.phone}`}
    </p>
  </div>
  <div className="header-actions">
    {job.customers?.phone && (
      <>
        <a href={`tel:${job.customers.phone}`} className="btn btn-gold">📞 Call</a>
        <a href={`https://wa.me/${formatPhone(job.customers.phone)}`} target="_blank" rel="noopener noreferrer" className="btn btn-green">💬 WhatsApp</a>
      </>
    )}
    <button className="btn btn-primary" onClick={duplicateJob}>📋 Duplicate</button>
    <button className="btn" onClick={() => setEditing(!editing)}>
      {editing ? '✕ Close' : '✏️ Edit'}
    </button>
  </div>
</div>

{/* Stats */}
<div className="stats-row">
  <div className="stat-card">
    <p className="value navy">₦{job.price.toLocaleString()}</p>
    <p className="label">Total</p>
  </div>
  <div className="stat-card">
    <p className="value green">₦{job.amount_paid.toLocaleString()}</p>
    <p className="label">Paid</p>
  </div>
  <div className="stat-card">
    <p className={`value ${balance > 0 ? 'red' : 'green'}`}>
      {balance > 0 ? `₦${balance.toLocaleString()}` : '✓ Paid'}
    </p>
    <p className="label">Balance</p>
  </div>
  <div className="stat-card">
    <p className="value navy">{job.due_date ? formatDate(job.due_date) : '—'}</p>
    <p className="label">Due Date</p>
  </div>
</div>

{/* Device Details */}
<div className="card">
  <h3 style={{ color: '#1E3A5F', fontSize: '0.95rem', margin: '0 0 0.6rem' }}>📱 Device Details</h3>
  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.3rem' }}>
    <div><span style={{ color: '#6B6255' }}>Type:</span> <strong>{job.device_type || '—'}</strong></div>
    <div><span style={{ color: '#6B6255' }}>Model:</span> <strong>{job.device_model || '—'}</strong></div>
    <div><span style={{ color: '#6B6255' }}>Serial/IMEI:</span> <strong>{job.serial_number || '—'}</strong></div>
    <div><span style={{ color: '#6B6255' }}>Color:</span> <strong>{job.device_color || '—'}</strong></div>
    <div><span style={{ color: '#6B6255' }}>Condition:</span> <strong>{job.device_condition || '—'}</strong></div>
    <div><span style={{ color: '#6B6255' }}>Est. Time:</span> <strong>{job.estimated_repair_time ? `${job.estimated_repair_time} min` : '—'}</strong></div>
  </div>
  <div style={{ marginTop: '0.5rem' }}>
    <span style={{ color: '#6B6255' }}>Issue:</span>
    <p style={{ margin: '0.2rem 0 0', color: '#2B2620', fontSize: '0.9rem' }}>{job.customer_notes || 'No description'}</p>
  </div>
</div>

{/* Parts Used */}
{partsUsed.length > 0 && (
  <div className="card">
    <h3 style={{ color: '#1E3A5F', fontSize: '0.95rem', margin: '0 0 0.6rem' }}>🔩 Parts Used</h3>
    {partsUsed.map((p, i) => (
      <div key={i} className="parts-used-item">
        <span>{p.name}</span>
        <span>{p.quantity} × ₦{p.cost.toLocaleString()} = ₦{(p.quantity * p.cost).toLocaleString()}</span>
      </div>
    ))}
  </div>
)}

{/* Status Timeline */}
<div className="card">
  <div className="status-timeline">
    {REPAIR_STAGES.map((stage, i) => {
      const isActive = i === currentIndex
      const isDone = i < currentIndex
      return (
        <div key={stage} className="status-dot">
          <div className={`dot ${isActive ? 'active' : ''} ${isDone ? 'done' : ''}`} />
          <span className={`label ${isActive ? 'active' : ''}`}>{stage}</span>
        </div>
      )
    })}
  </div>

  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
    <button className="btn" onClick={undoStatus} disabled={isFirstStage} style={{ opacity: isFirstStage ? 0.4 : 1 }}>← Undo</button>
    <button className="btn btn-primary" onClick={advanceStatus} disabled={isLastStage} style={{ opacity: isLastStage ? 0.4 : 1 }}>
      {isLastStage ? '✓ Completed' : `→ ${REPAIR_STAGES[currentIndex + 1]}`}
    </button>
  </div>
</div>

{/* Actions */}
<div className="action-row">
  <button className="btn btn-gold" onClick={copyTrackingLink}>🔗 Copy Link</button>
  <button className="btn btn-green" onClick={sendLinkViaWhatsApp}>📱 Send Link</button>
  <button className="btn btn-primary" onClick={sendStatusUpdate}>📤 Status Update</button>
  {balance > 0 && <button className="btn btn-red" onClick={sendReminder}>🔔 Reminder</button>}
</div>

{/* Edit Form */}
{editing && (
  <form onSubmit={handleSave} className="card">
    <h2 style={{ color: '#1E3A5F', fontSize: '1rem', margin: '0 0 0.8rem' }}>✏️ Edit Repair Job</h2>
    <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap' }}>
      <div className="form-group" style={{ flex: 1, minWidth: '120px' }}>
        <label style={labelStyle}>Device Type</label>
        <input type="text" value={deviceType} onChange={(e) => setDeviceType(e.target.value)} style={inputStyle} />
      </div>
      <div className="form-group" style={{ flex: 1, minWidth: '120px' }}>
        <label style={labelStyle}>Device Model</label>
        <input type="text" value={deviceModel} onChange={(e) => setDeviceModel(e.target.value)} style={inputStyle} />
      </div>
    </div>
    <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap' }}>
      <div className="form-group" style={{ flex: 1, minWidth: '120px' }}>
        <label style={labelStyle}>Serial / IMEI</label>
        <input type="text" value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} style={inputStyle} />
      </div>
      <div className="form-group" style={{ flex: 1, minWidth: '120px' }}>
        <label style={labelStyle}>Color</label>
        <input type="text" value={deviceColor} onChange={(e) => setDeviceColor(e.target.value)} style={inputStyle} />
      </div>
    </div>
    <div className="form-group">
      <label style={labelStyle}>Condition</label>
      <input type="text" value={deviceCondition} onChange={(e) => setDeviceCondition(e.target.value)} style={inputStyle} />
    </div>
    <div className="form-group">
      <label style={labelStyle}>Issue Description</label>
      <textarea value={issueDescription} onChange={(e) => setIssueDescription(e.target.value)} rows={2} style={inputStyle} />
    </div>
    <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap' }}>
      <div className="form-group" style={{ flex: 1, minWidth: '120px' }}>
        <label style={labelStyle}>Total Price (₦)</label>
        <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} style={inputStyle} />
      </div>
      <div className="form-group" style={{ flex: 1, minWidth: '120px' }}>
        <label style={labelStyle}>Deposit (₦)</label>
        <input type="number" value={deposit} onChange={(e) => setDeposit(e.target.value)} style={inputStyle} />
      </div>
    </div>
    <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap' }}>
      <div className="form-group" style={{ flex: 1, minWidth: '120px' }}>
        <label style={labelStyle}>Est. Time (min)</label>
        <input type="number" value={estimatedTime} onChange={(e) => setEstimatedTime(e.target.value)} style={inputStyle} />
      </div>
      <div className="form-group" style={{ flex: 1, minWidth: '120px' }}>
        <label style={labelStyle}>Due Date</label>
        <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} style={inputStyle} />
      </div>
    </div>
    <div className="form-group">
      <label style={labelStyle}>Status</label>
      <select value={status} onChange={(e) => setStatus(e.target.value)} style={inputStyle}>
        {REPAIR_STAGES.map((s) => (<option key={s} value={s}>{s}</option>))}
      </select>
    </div>
    <button type="submit" className="btn btn-gold btn-block" disabled={saving}>
      {saving ? 'Saving...' : '💾 Save changes'}
    </button>
    {message && <p style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: message.startsWith('✅') ? '#4C7A5E' : '#AE4A34' }}>{message}</p>}
  </form>
)}
      {/* Payments */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <h2 style={{ color: '#1E3A5F', fontSize: '1rem', margin: 0 }}>💰 Payments</h2>
          {balance > 0 && <button className="btn btn-green" onClick={() => setShowPaymentForm(!showPaymentForm)}>
            {showPaymentForm ? '✕ Cancel' : '+ Record Payment'}
          </button>}
        </div>

        {showPaymentForm && (
          <form onSubmit={handleRecordPayment} style={{ marginTop: '0.8rem', paddingTop: '0.8rem', borderTop: '1px solid #E8E0D5' }}>
            <div style={{ marginBottom: '0.6rem' }}>
              <label style={labelStyle}>Amount (₦)</label>
              <input type="number" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} style={inputStyle} required autoFocus />
            </div>
            <div style={{ marginBottom: '0.8rem' }}>
              <label style={labelStyle}>Note (optional)</label>
              <input type="text" value={paymentNote} onChange={(e) => setPaymentNote(e.target.value)} placeholder="e.g. Cash payment" style={inputStyle} />
            </div>
            <button type="submit" className="btn btn-green btn-block" disabled={recordingPayment}>
              {recordingPayment ? 'Recording...' : '💰 Record payment'}
            </button>
          </form>
        )}

        {payments.length === 0 ? (
          <p style={{ color: '#6B6255', fontSize: '0.85rem', margin: '0.5rem 0 0' }}>No payments recorded yet.</p>
        ) : (
          <div style={{ marginTop: '0.5rem' }}>
            {payments.map((p) => (
              <div key={p.id} className="payment-row">
                <span style={{ color: '#6B6255' }}>{formatDate(p.created_at)} {p.note && `— ${p.note}`}</span>
                <span style={{ fontWeight: '600', color: '#4C7A5E' }}>₦{p.amount.toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Internal Notes */}
      <div className="card">
        <h2 style={{ color: '#1E3A5F', fontSize: '1rem', margin: '0 0 0.3rem' }}>📝 Internal Notes</h2>
        <p style={{ color: '#6B6255', fontSize: '0.75rem', margin: '0 0 0.6rem' }}>Only you see these — not shared with the customer.</p>
        <textarea value={internalNotes} onChange={(e) => setInternalNotes(e.target.value)} rows={3} placeholder="Add internal notes..." style={{ ...inputStyle, fontFamily: 'inherit', resize: 'vertical' }} />
        <button className="btn btn-primary btn-block" onClick={handleSaveNotes} disabled={savingNotes}>
          {savingNotes ? 'Saving...' : '💾 Save notes'}
        </button>
        {notesMessage && <p style={{ marginTop: '0.3rem', fontSize: '0.8rem', color: notesMessage.startsWith('✅') ? '#4C7A5E' : '#AE4A34' }}>{notesMessage}</p>}
      </div>

      {/* Delete */}
      <button className="btn btn-red btn-block" onClick={handleDelete} disabled={deleting} style={{ marginTop: '0.5rem' }}>
        {deleting ? 'Deleting...' : '🗑️ Delete job'}
      </button>
    </main>
  )
    }
