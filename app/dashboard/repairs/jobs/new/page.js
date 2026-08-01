'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../../../lib/supabaseClient'
import { getPlanLimits } from '../../../../../lib/planLimits'
import { showToast } from '../../../../../lib/toast'

const REPAIR_STAGES = [
  { value: 'Diagnosing', label: 'Diagnosing' },
  { value: 'Awaiting Parts', label: 'Awaiting Parts' },
  { value: 'Repairing', label: 'Repairing' },
  { value: 'Ready', label: 'Ready for Pickup' },
  { value: 'Completed', label: 'Completed' },
  { value: 'Delivered', label: 'Delivered' },
]

export default function NewRepairJobPage() {
  const router = useRouter()
  const [businessId, setBusinessId] = useState(null)
  const [business, setBusiness] = useState(null)
  const [plan, setPlan] = useState('free')
  const [currentOrderCount, setCurrentOrderCount] = useState(0)
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)

  // Form state
  const [customerId, setCustomerId] = useState('')
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

  // Parts used
  const [parts, setParts] = useState([])
  const [partName, setPartName] = useState('')
  const [partQuantity, setPartQuantity] = useState(1)
  const [partCost, setPartCost] = useState('')

  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  // New customer form
  const [showNewCustomer, setShowNewCustomer] = useState(false)
  const [newCustomerName, setNewCustomerName] = useState('')
  const [newCustomerPhone, setNewCustomerPhone] = useState('')
  const [creatingCustomer, setCreatingCustomer] = useState(false)

  // Step wizard
  const [step, setStep] = useState(1) // 1: Customer, 2: Device, 3: Pricing

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: businessData } = await supabase
      .from('businesses')
      .select('id, plan')
      .eq('owner_id', user.id)
      .single()

    if (!businessData) { router.push('/onboarding'); return }

    setBusinessId(businessData.id)
    setBusiness(businessData)
    setPlan(businessData.plan || 'free')

    const { count } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', businessData.id)
    setCurrentOrderCount(count || 0)

    const { data: customerData } = await supabase
      .from('customers')
      .select('*')
      .eq('business_id', businessData.id)
      .order('name', { ascending: true })

    setCustomers(customerData || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const addPart = () => {
    if (!partName.trim() || !partCost) return
    const costNum = Number(partCost)
    const qty = Number(partQuantity) || 1
    setParts([...parts, { name: partName.trim(), quantity: qty, cost: costNum, total: costNum * qty }])
    setPartName('')
    setPartQuantity(1)
    setPartCost('')
  }

  const removePart = (index) => {
    setParts(parts.filter((_, i) => i !== index))
  }

  const handleCreateCustomer = async (e) => {
    e.preventDefault()
    setCreatingCustomer(true)
    setMessage('')
    const phoneDigits = newCustomerPhone.replace(/\D/g, '')
    if (!newCustomerName.trim()) { setMessage('Please enter the customer name.'); setCreatingCustomer(false); return }
    if (phoneDigits.length !== 11) { setMessage('Phone number must be 11 digits.'); setCreatingCustomer(false); return }

    const { data: customer, error } = await supabase
      .from('customers')
      .insert({ business_id: businessId, name: newCustomerName.trim(), phone: phoneDigits })
      .select()
      .single()

    if (error) { setMessage('Error creating customer: ' + error.message); setCreatingCustomer(false); return }

    setCustomers([...customers, customer])
    setCustomerId(customer.id)
    setNewCustomerName('')
    setNewCustomerPhone('')
    setShowNewCustomer(false)
    setCreatingCustomer(false)
    showToast('✅ Customer created!', '#2E7D5E')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMessage('')
    setSaving(true)

    if (!customerId) { setMessage('Please select a customer.'); setSaving(false); return }
    const limits = getPlanLimits(plan)
    if (currentOrderCount >= limits.orders) {
      setMessage(`❌ You've reached the limit of ${limits.orders} orders on your Free plan. Please upgrade.`)
      setSaving(false)
      return
    }
    if (!deviceType.trim()) { setMessage('Please enter the device type.'); setSaving(false); return }
    if (!issueDescription.trim()) { setMessage('Please describe the issue.'); setSaving(false); return }
    if (!price || Number(price) <= 0) { setMessage('Please enter a valid price.'); setSaving(false); return }

    const priceNum = Number(price)
    const depositNum = Number(deposit) || 0
    const trackingToken = crypto.randomUUID()

    const { data: job, error } = await supabase
      .from('orders')
      .insert({
        business_id: businessId,
        customer_id: customerId,
        title: `${deviceType} ${deviceModel || 'Repair'}`,
        device_type: deviceType.trim(),
        device_model: deviceModel.trim(),
        serial_number: serialNumber.trim(),
        device_condition: deviceCondition.trim(),
        device_color: deviceColor.trim(),
        customer_notes: issueDescription.trim(),
        price: priceNum,
        amount_paid: depositNum,
        estimated_repair_time: Number(estimatedTime) || null,
        due_date: dueDate || null,
        current_status: status,
        tracking_token: trackingToken,
        parts_used: parts.length > 0 ? parts : null,
      })
      .select()
      .single()

    if (error) { setMessage('Error: ' + error.message); setSaving(false); return }

    showToast('✅ Repair job created!', '#2E7D5E')
    setSaving(false)
    setTimeout(() => router.push(`/dashboard/repairs/jobs/${job.id}`), 800)
  }

  const canGoNext = () => {
    if (step === 1) return !!customerId
    if (step === 2) return deviceType.trim() && issueDescription.trim()
    return true
  }

  const goNext = () => {
    if (step === 1 && !customerId) { setMessage('Please select a customer.'); return }
    if (step === 2 && !deviceType.trim()) { setMessage('Please enter device type.'); return }
    if (step === 2 && !issueDescription.trim()) { setMessage('Please describe the issue.'); return }
    setMessage('')
    setStep(step + 1)
  }

  const goBack = () => { setStep(step - 1); setMessage('') }

  const limits = getPlanLimits(plan)
  const canAddMore = currentOrderCount < limits.orders
  const totalPartsCost = parts.reduce((sum, p) => sum + p.total, 0)

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#F8F6F2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
          .spinner { width: 40px; height: 40px; border: 4px solid #e4d8c2; border-top: 4px solid #0F2B4A; border-radius: 50%; animation: spin 0.8s linear infinite; }
        `}</style>
        <div className="spinner"></div>
      </div>
    )
  }

  const inputStyle = {
    width: '100%', padding: '0.7rem', borderRadius: '8px',
    border: '1px solid #E5E0D8', fontSize: '0.95rem',
    background: '#fff', boxSizing: 'border-box', color: '#1A1A1A',
    transition: 'border-color 0.2s ease',
  }
  const labelStyle = {
    display: 'block', color: '#0F2B4A', marginBottom: '0.3rem',
    fontSize: '0.85rem', fontWeight: '600',
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F8F6F2', padding: '1.2rem', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <style>{`
        .glass-card {
          background: rgba(255,255,255,0.7);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255,255,255,0.3);
          border-radius: 16px;
          box-shadow: 0 4px 16px rgba(15,43,74,0.06);
          padding: 1.5rem;
          max-width: 600px;
          margin: 0 auto;
        }
        .step-indicator {
          display: flex;
          justify-content: space-between;
          margin-bottom: 1.5rem;
        }
        .step-indicator .step {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          font-size: 0.75rem;
          font-weight: 600;
          color: #8A8A8A;
        }
        .step-indicator .step.active { color: #0F2B4A; }
        .step-indicator .step.done { color: #2E7D5E; }
        .step-indicator .step .num {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: #E5E0D8;
          color: #8A8A8A;
          font-size: 0.7rem;
          font-weight: 700;
        }
        .step-indicator .step.active .num { background: #0F2B4A; color: #fff; }
        .step-indicator .step.done .num { background: #2E7D5E; color: #fff; }
        .step-line {
          flex: 1;
          height: 2px;
          background: #E5E0D8;
          margin: 0 0.3rem;
          align-self: center;
        }
        .step-line.done { background: #2E7D5E; }
        .btn-primary {
          width: 100%;
          padding: 0.85rem;
          border-radius: 10px;
          border: none;
          background: linear-gradient(135deg, #D4A52A, #C79A2B);
          color: #0F2B4A;
          font-size: 1rem;
          font-weight: 700;
          box-shadow: 0 4px 14px rgba(212,165,42,0.3);
          cursor: pointer;
          transition: transform 0.1s ease;
        }
        .btn-primary:active { transform: scale(0.98); }
        .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
        .btn-secondary {
          padding: 0.6rem 1.2rem;
          border-radius: 8px;
          border: 1px solid #E5E0D8;
          background: #fff;
          color: #0F2B4A;
          font-size: 0.85rem;
          cursor: pointer;
          transition: background 0.2s;
        }
        .btn-secondary:hover { background: #F8F6F2; }
        .btn-link {
          background: none;
          border: none;
          color: #D4A52A;
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          text-decoration: underline;
        }
        .btn-link:hover { color: #B4881E; }
        .back-link {
          background: none;
          border: none;
          color: #0F2B4A;
          font-size: 0.85rem;
          padding: 0;
          margin-bottom: 1rem;
          cursor: pointer;
          font-weight: 500;
        }
        .back-link:hover { text-decoration: underline; }
        .form-group { margin-bottom: 1.2rem; }
        .form-row { display: flex; gap: 0.8rem; flex-wrap: wrap; }
        .form-row .flex-1 { flex: 1; min-width: 120px; }
        .part-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.3rem 0;
          border-bottom: 1px solid #F0EDE8;
          font-size: 0.85rem;
        }
        .part-item:last-child { border-bottom: none; }
        .part-item .name { color: #0F2B4A; font-weight: 500; }
        .part-item .cost { color: #8A8A8A; }
        .part-item .remove-btn {
          background: none;
          border: none;
          color: #D9534F;
          cursor: pointer;
          font-size: 0.8rem;
        }
        .new-customer-form {
          background: rgba(255,255,255,0.5);
          backdrop-filter: blur(8px);
          border-radius: 12px;
          padding: 1rem;
          margin-top: 0.5rem;
          border: 1px solid #E5E0D8;
        }
        .plan-limit-warning {
          background: #F1DBD3;
          border: 1px solid #D9534F;
          border-radius: 10px;
          padding: 0.8rem 1rem;
          margin-bottom: 1rem;
          color: #D9534F;
          font-size: 0.85rem;
          text-align: center;
        }
        .parts-section {
          background: rgba(255,255,255,0.4);
          backdrop-filter: blur(8px);
          border-radius: 12px;
          padding: 1rem;
          margin-bottom: 1.2rem;
        }
        .inline-flex { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
        .mt-2 { margin-top: 0.5rem; }
        .text-muted { color: #8A8A8A; font-size: 0.75rem; }
        .text-danger { color: #D9534F; }
        .text-success { color: #2E7D5E; }
        @media (max-width: 480px) {
          .glass-card { padding: 1rem; }
          .step-indicator .step { font-size: 0.6rem; }
          .step-indicator .step .num { width: 20px; height: 20px; font-size: 0.6rem; }
        }
      `}</style>

      <button className="back-link" onClick={() => router.push('/dashboard/repairs')}>← Back to repairs</button>

      <div className="glass-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <h1 style={{ fontSize: '1.3rem', fontWeight: '700', color: '#0F2B4A', margin: 0 }}>🔧 New Repair Job</h1>
          <span style={{ background: '#F6E9C8', color: '#0F2B4A', fontSize: '0.6rem', fontWeight: '600', padding: '0.1rem 0.5rem', borderRadius: '10px' }}>
            Repairs
          </span>
        </div>

        {!canAddMore && (
          <div className="plan-limit-warning">
            <strong>⚠️ You've reached the limit of {limits.orders} orders on your Free plan.</strong><br />
            <a href="/dashboard/subscription" style={{ color: '#D9534F', fontWeight: '600' }}>Upgrade now →</a>
          </div>
        )}

        {/* Step Indicator */}
        <div className="step-indicator">
          <div className={`step ${step >= 1 ? 'done' : ''} ${step === 1 ? 'active' : ''}`}>
            <span className="num">1</span> Customer
          </div>
          <div className={`step-line ${step >= 2 ? 'done' : ''}`} />
          <div className={`step ${step >= 2 ? 'done' : ''} ${step === 2 ? 'active' : ''}`}>
            <span className="num">2</span> Device
          </div>
          <div className={`step-line ${step >= 3 ? 'done' : ''}`} />
          <div className={`step ${step >= 3 ? 'done' : ''} ${step === 3 ? 'active' : ''}`}>
            <span className="num">3</span> Pricing
          </div>
        </div>

        {message && (
          <div style={{ background: '#F1DBD3', color: '#D9534F', padding: '0.6rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.85rem' }}>
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* STEP 1: Customer */}
          {step === 1 && (
            <div>
              <div className="form-group">
                <div className="inline-flex" style={{ justifyContent: 'space-between' }}>
                  <label style={labelStyle}>Customer</label>
                  <button type="button" className="btn-link" onClick={() => setShowNewCustomer(!showNewCustomer)}>
                    {showNewCustomer ? '✕ Cancel' : '+ New customer'}
                  </button>
                </div>

                {showNewCustomer ? (
                  <div className="new-customer-form">
                    <p className="text-muted">Add a new customer first.</p>
                    <div className="form-row">
                      <div className="flex-1">
                        <input type="text" value={newCustomerName} onChange={(e) => setNewCustomerName(e.target.value)} placeholder="Customer name" required disabled={!canAddMore} style={inputStyle} />
                      </div>
                      <div className="flex-1">
                        <input type="tel" inputMode="numeric" value={newCustomerPhone} onChange={(e) => setNewCustomerPhone(e.target.value.replace(/\D/g, '').slice(0, 11))} placeholder="Phone 080..." required disabled={!canAddMore} style={inputStyle} />
                      </div>
                    </div>
                    <button type="button" className="btn-primary" onClick={handleCreateCustomer} disabled={creatingCustomer || !canAddMore} style={{ padding: '0.5rem', fontSize: '0.85rem' }}>
                      {creatingCustomer ? 'Creating...' : '➕ Create customer'}
                    </button>
                  </div>
                ) : (
                  <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} required disabled={!canAddMore} style={inputStyle}>
                    <option value="">Select a customer</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>{c.name} {c.phone ? `· ${c.phone}` : ''}</option>
                    ))}
                  </select>
                )}
              </div>
              <button type="button" className="btn-primary" onClick={goNext} disabled={!customerId}>Next →</button>
            </div>
          )}

          {/* STEP 2: Device & Issue */}
          {step === 2 && (
            <div>
              <div className="form-row">
                <div className="flex-1">
                  <label style={labelStyle}>Device Type <span className="text-danger">*</span></label>
                  <input type="text" value={deviceType} onChange={(e) => setDeviceType(e.target.value)} placeholder="e.g. iPhone" required disabled={!canAddMore} style={inputStyle} />
                </div>
                <div className="flex-1">
                  <label style={labelStyle}>Device Model</label>
                  <input type="text" value={deviceModel} onChange={(e) => setDeviceModel(e.target.value)} placeholder="e.g. 13 Pro" disabled={!canAddMore} style={inputStyle} />
                </div>
              </div>
              <div className="form-row">
                <div className="flex-1">
                  <label style={labelStyle}>Serial / IMEI</label>
                  <input type="text" value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} placeholder="IMEI" disabled={!canAddMore} style={inputStyle} />
                </div>
                <div className="flex-1">
                  <label style={labelStyle}>Device Color</label>
                  <input type="text" value={deviceColor} onChange={(e) => setDeviceColor(e.target.value)} placeholder="e.g. Silver" disabled={!canAddMore} style={inputStyle} />
                </div>
              </div>
              <div className="form-group">
                <label style={labelStyle}>Device Condition</label>
                <input type="text" value={deviceCondition} onChange={(e) => setDeviceCondition(e.target.value)} placeholder="e.g. Cracked screen" disabled={!canAddMore} style={inputStyle} />
              </div>
              <div className="form-group">
                <label style={labelStyle}>Issue Description <span className="text-danger">*</span></label>
                <textarea value={issueDescription} onChange={(e) => setIssueDescription(e.target.value)} rows={3} placeholder="Describe the problem..." required disabled={!canAddMore} style={{ ...inputStyle, fontFamily: 'inherit', resize: 'vertical' }} />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button type="button" className="btn-secondary" onClick={goBack}>← Back</button>
                <button type="button" className="btn-primary" onClick={goNext} disabled={!deviceType.trim() || !issueDescription.trim()}>Next →</
            issueDescription.trim()}>Next →</button>
              </div>
            </div>
          )}

          {/* STEP 3: Pricing & Parts */}
          {step === 3 && (
            <div>
              <div className="parts-section">
                <label style={labelStyle}>🔩 Parts Used</label>
                <div className="form-row">
                  <input type="text" value={partName} onChange={(e) => setPartName(e.target.value)} placeholder="Part name" disabled={!canAddMore} style={{ ...inputStyle, padding: '0.4rem' }} />
                  <input type="number" value={partQuantity} onChange={(e) => setPartQuantity(e.target.value)} placeholder="Qty" disabled={!canAddMore} style={{ ...inputStyle, padding: '0.4rem', width: '60px' }} />
                  <input type="number" value={partCost} onChange={(e) => setPartCost(e.target.value)} placeholder="Cost (₦)" disabled={!canAddMore} style={{ ...inputStyle, padding: '0.4rem', width: '100px' }} />
                  <button type="button" className="btn-secondary" onClick={addPart} disabled={!partName || !partCost || !canAddMore}>Add</button>
                </div>
                {parts.length > 0 && (
                  <div style={{ marginTop: '0.5rem' }}>
                    {parts.map((p, i) => (
                      <div key={i} className="part-item">
                        <span className="name">{p.name} × {p.quantity}</span>
                        <span className="cost">₦{p.total.toLocaleString()}</span>
                        <button type="button" className="remove-btn" onClick={() => removePart(i)}>✕</button>
                      </div>
                    ))}
                    <div style={{ marginTop: '0.3rem', fontWeight: '700', color: '#0F2B4A', textAlign: 'right' }}>
                      Total Parts: ₦{totalPartsCost.toLocaleString()}
                    </div>
                  </div>
                )}
              </div>

              <div className="form-row">
                <div className="flex-1">
                  <label style={labelStyle}>Total Price (₦) <span className="text-danger">*</span></label>
                  <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" required disabled={!canAddMore} style={inputStyle} />
                </div>
                <div className="flex-1">
                  <label style={labelStyle}>Deposit (₦)</label>
                  <input type="number" value={deposit} onChange={(e) => setDeposit(e.target.value)} placeholder="0.00" disabled={!canAddMore} style={inputStyle} />
                </div>
              </div>
              <div className="form-row">
                <div className="flex-1">
                  <label style={labelStyle}>Estimated Time (min)</label>
                  <input type="number" value={estimatedTime} onChange={(e) => setEstimatedTime(e.target.value)} placeholder="e.g. 60" disabled={!canAddMore} style={inputStyle} />
                </div>
                <div className="flex-1">
                  <label style={labelStyle}>Due Date</label>
                  <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} disabled={!canAddMore} style={inputStyle} />
                </div>
              </div>
              <div className="form-group">
                <label style={labelStyle}>Status</label>
                <select value={status} onChange={(e) => setStatus(e.target.value)} disabled={!canAddMore} style={inputStyle}>
                  {REPAIR_STAGES.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn-secondary" onClick={goBack}>← Back</button>
                <button type="submit" className="btn-primary" disabled={saving || !canAddMore || !price || Number(price) <= 0}>
                  {saving ? 'Creating...' : 'Create repair job'}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  )
            }
