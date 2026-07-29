'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../../../../lib/supabaseClient'
import { showToast } from '../../../../../../lib/toast'
import { isFeatureAvailable } from '../../../../../../lib/planLimits'

const REPAIR_STAGES = ['Diagnosing', 'Awaiting Parts', 'Repairing', 'Ready', 'Completed', 'Delivered']

export default function EditRepairJobPage({ params }) {
  const router = useRouter()
  const [job, setJob] = useState(null)
  const [business, setBusiness] = useState(null)
  const [plan, setPlan] = useState('free')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  // Form state
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
  const [internalNotes, setInternalNotes] = useState('')
  const [partsUsed, setPartsUsed] = useState([])

  // For adding parts inline
  const [newPartName, setNewPartName] = useState('')
  const [newPartQty, setNewPartQty] = useState(1)
  const [newPartCost, setNewPartCost] = useState('')

  const load = async () => {
    // Fetch job
    const { data: jobData } = await supabase
      .from('orders')
      .select('*, customers(name, phone)')
      .eq('id', params.id)
      .single()

    if (!jobData) {
      setLoading(false)
      return
    }

    setJob(jobData)
    // Populate form fields
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

    // Fetch business and plan
    const { data: businessData } = await supabase
      .from('businesses')
      .select('name, plan')
      .eq('id', jobData.business_id)
      .single()
    setBusiness(businessData)
    setPlan(businessData?.plan || 'free')

    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [params.id])

  // Add part to list
  const addPart = () => {
    if (!newPartName.trim() || !newPartCost) return
    const cost = Number(newPartCost)
    const qty = Number(newPartQty) || 1
    setPartsUsed([...partsUsed, { name: newPartName.trim(), quantity: qty, cost }])
    setNewPartName('')
    setNewPartQty(1)
    setNewPartCost('')
  }

  const removePart = (index) => {
    setPartsUsed(partsUsed.filter((_, i) => i !== index))
  }

  // Save changes
  const handleSubmit = async (e) => {
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
        internal_notes: internalNotes.trim(),
        parts_used: partsUsed,
      })
      .eq('id', job.id)

    if (error) {
      setMessage('Error: ' + error.message)
      setSaving(false)
      return
    }

    showToast('✅ Job updated!', '#4C7A5E')
    setSaving(false)
    router.push(`/dashboard/repairs/jobs/${job.id}`)
  }

  const handleDelete = async () => {
    const confirmed = window.confirm('Delete this job? This cannot be undone.')
    if (!confirmed) return
    await supabase.from('orders').delete().eq('id', job.id)
    router.push('/dashboard/repairs/jobs')
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

  const inputStyle = {
    width: '100%', padding: '0.7rem', borderRadius: '8px',
    border: '1px solid #E8E0D5', fontSize: '1rem', boxSizing: 'border-box',
    background: '#fff', color: '#2B2620',
    transition: 'border-color 0.2s ease',
  }
  const labelStyle = { display: 'block', color: '#2B2620', marginBottom: '0.3rem', fontSize: '0.85rem', fontWeight: '500' }

  // Plan locking check
  const canEditTracking = isFeatureAvailable(plan, 'tracking_links')
  const canEditWhatsApp = isFeatureAvailable(plan, 'whatsapp_reminders')
  return (
    <main style={{ minHeight: '100vh', background: '#F5EFE2', padding: '1.5rem 1.2rem' }}>
      <style>{`
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
        .form-card {
          background: #fff;
          border-radius: 14px;
          padding: 1.5rem;
          border: 1px solid #E8E0D5;
          max-width: 560px;
          margin: 0 auto;
        }
        .form-group { margin-bottom: 1rem; }
        .btn-primary {
          width: 100%;
          padding: 0.85rem;
          border-radius: 8px;
          border: none;
          background: linear-gradient(135deg, #C79A2B, #B4881E);
          color: #1E3A5F;
          font-size: 1rem;
          font-weight: 700;
          box-shadow: 0 4px 14px rgba(199,154,43,0.3);
          cursor: pointer;
          transition: transform 0.1s ease;
        }
        .btn-primary:active { transform: scale(0.98); }
        .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
        .btn-secondary {
          padding: 0.5rem 1rem;
          border-radius: 6px;
          border: 1px solid #E8E0D5;
          background: #fff;
          color: #1E3A5F;
          font-size: 0.8rem;
          cursor: pointer;
        }
        .btn-secondary:hover { background: #F5EFE2; }
        .btn-danger {
          background: none;
          border: none;
          color: #AE4A34;
          font-size: 0.8rem;
          cursor: pointer;
          padding: 0;
        }
        .btn-danger:hover { text-decoration: underline; }
        .part-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.4rem 0;
          border-bottom: 1px solid #F0EDE8;
        }
        .part-item:last-child { border-bottom: none; }
        .part-item .name { color: #1E3A5F; font-weight: 500; }
        .part-item .cost { color: #6B6255; }
        .part-item .remove-btn {
          background: none;
          border: none;
          color: #AE4A34;
          cursor: pointer;
        }
        .inline-flex { display: flex; gap: 0.5rem; flex-wrap: wrap; align-items: center; }
        .flex-1 { flex: 1; }
        .flex-0-5 { flex: 0.5; min-width: 60px; }
        @media (max-width: 420px) {
          .form-card { padding: 1rem; }
          .inline-flex { flex-direction: column; align-items: stretch; }
          .flex-1, .flex-0-5 { width: 100%; }
        }
      `}</style>

      <button className="back-link" onClick={() => router.back()}>← Back</button>

      <div style={{ maxWidth: '560px', margin: '0 auto', marginBottom: '1rem' }}>
        <h1 style={{ color: '#1E3A5F', fontSize: '1.4rem', margin: 0 }}>✏️ Edit Repair Job</h1>
        <p style={{ color: '#6B6255', margin: '0.2rem 0 0' }}>
          {job.customers?.name ? `For ${job.customers.name}` : 'No customer'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="form-card">
        {/* Customer info (read-only) */}
        <div className="form-group">
          <label style={labelStyle}>Customer</label>
          <div style={{ padding: '0.7rem', background: '#F8F6F2', borderRadius: '8px', border: '1px solid #E8E0D5' }}>
            <strong>{job.customers?.name || 'No name'}</strong>
            {job.customers?.phone && <span style={{ color: '#6B6255', marginLeft: '0.5rem' }}>· {job.customers.phone}</span>}
          </div>
        </div>

        {/* Device Details */}
        <div className="inline-flex">
          <div className="form-group flex-1">
            <label style={labelStyle}>Device Type</label>
            <input type="text" value={deviceType} onChange={(e) => setDeviceType(e.target.value)} style={inputStyle} />
          </div>
          <div className="form-group flex-1">
            <label style={labelStyle}>Device Model</label>
            <input type="text" value={deviceModel} onChange={(e) => setDeviceModel(e.target.value)} style={inputStyle} />
          </div>
        </div>

        <div className="inline-flex">
          <div className="form-group flex-1">
            <label style={labelStyle}>Serial / IMEI</label>
            <input type="text" value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} style={inputStyle} />
          </div>
          <div className="form-group flex-1">
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

        {/* Parts Used */}
        <div className="form-group">
          <label style={labelStyle}>🔩 Parts Used</label>
          {partsUsed.length > 0 && (
            <div style={{ marginBottom: '0.5rem' }}>
              {partsUsed.map((p, i) => (
                <div key={i} className="part-item">
                  <span className="name">{p.name}</span>
                  <span className="cost">{p.quantity} × ₦{p.cost.toLocaleString()} = ₦{(p.quantity * p.cost).toLocaleString()}</span>
                  <button type="button" className="remove-btn" onClick={() => removePart(i)}>✕</button>
                </div>
              ))}
            </div>
          )}
          <div className="inline-flex">
            <input
              type="text"
              value={newPartName}
              onChange={(e) => setNewPartName(e.target.value)}
              placeholder="Part name"
              style={{ ...inputStyle, flex: 1 }}
            />
            <input
              type="number"
              value={newPartQty}
              onChange={(e) => setNewPartQty(e.target.value)}
              placeholder="Qty"
              style={{ ...inputStyle, width: '60px' }}
            />
            <input
              type="number"
              value={newPartCost}
              onChange={(e) => setNewPartCost(e.target.value)}
              placeholder="Cost (₦)"
              style={{ ...inputStyle, width: '100px' }}
            />
            <button type="button" className="btn-secondary" onClick={addPart}>Add</button>
          </div>
        </div>

        {/* Pricing */}
        <div className="inline-flex">
          <div className="form-group flex-1">
            <label style={labelStyle}>Total Price (₦)</label>
            <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} style={inputStyle} />
          </div>
          <div className="form-group flex-1">
            <label style={labelStyle}>Deposit Paid (₦)</label>
            <input type="number" value={deposit} onChange={(e) => setDeposit(e.target.value)} style={inputStyle} />
          </div>
        </div>

        <div className="inline-flex">
          <div className="form-group flex-1">
            <label style={labelStyle}>Est. Time (minutes)</label>
            <input type="number" value={estimatedTime} onChange={(e) => setEstimatedTime(e.target.value)} style={inputStyle} />
          </div>
          <div className="form-group flex-1">
            <label style={labelStyle}>Due Date</label>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} style={inputStyle} />
          </div>
        </div>

        <div className="form-group">
          <label style={labelStyle}>Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)} style={inputStyle}>
            {REPAIR_STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div className="form-group">
          <label style={labelStyle}>Internal Notes</label>
          <textarea value={internalNotes} onChange={(e) => setInternalNotes(e.target.value)} rows={2} style={inputStyle} placeholder="Notes only you can see..." />
        </div>

        {/* Locked Features Banner */}
        {(!canEditTracking || !canEditWhatsApp) && (
          <div style={{
            background: '#F1DBD3',
            border: '1px solid #AE4A34',
            borderRadius: '8px',
            padding: '0.8rem',
            marginBottom: '1rem',
            color: '#AE4A34',
            fontSize: '0.85rem',
            textAlign: 'center',
          }}>
            <strong>🔒 Some features are locked</strong>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem' }}>
              Upgrade to Starter/Pro to edit tracking links and WhatsApp reminders.
            </p>
          </div>
        )}

        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? 'Saving...' : '💾 Save Changes'}
        </button>

        {message && (
          <p style={{ marginTop: '0.8rem', fontSize: '0.85rem', color: '#AE4A34', textAlign: 'center' }}>
            {message}
          </p>
        )}
      </form>

      <div style={{ maxWidth: '560px', margin: '0 auto', marginTop: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
        <button className="btn-danger" onClick={handleDelete}>🗑️ Delete Job</button>
      </div>
    </main>
  )
          }
