'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../../../lib/supabaseClient'
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
  const [customers, setCustomers] = useState([])

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

  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  // New customer form
  const [showNewCustomer, setShowNewCustomer] = useState(false)
  const [newCustomerName, setNewCustomerName] = useState('')
  const [newCustomerPhone, setNewCustomerPhone] = useState('')
  const [creatingCustomer, setCreatingCustomer] = useState(false)

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

    setBusinessId(business.id)

    const { data: customerData } = await supabase
      .from('customers')
      .select('*')
      .eq('business_id', business.id)
      .order('name', { ascending: true })

    setCustomers(customerData || [])
  }

  useEffect(() => {
    load()
  }, [])

  // Add part to list
  const addPart = () => {
    if (!partName.trim() || !partCost) return

    const costNum = Number(partCost)
    const qty = Number(partQuantity) || 1

    setParts([...parts, {
      name: partName.trim(),
      quantity: qty,
      cost: costNum,
      total: costNum * qty,
    }])

    setPartName('')
    setPartQuantity(1)
    setPartCost('')
  }

  const removePart = (index) => {
    setParts(parts.filter((_, i) => i !== index))
  }

  // Create customer
  const handleCreateCustomer = async (e) => {
    e.preventDefault()
    setCreatingCustomer(true)
    setMessage('')

    const phoneDigits = newCustomerPhone.replace(/\D/g, '')

    if (!newCustomerName.trim()) {
      setMessage('Please enter the customer name.')
      setCreatingCustomer(false)
      return
    }

    if (phoneDigits.length !== 11) {
      setMessage('Phone number must be 11 digits.')
      setCreatingCustomer(false)
      return
    }

    const { data: customer, error } = await supabase
      .from('customers')
      .insert({
        business_id: businessId,
        name: newCustomerName.trim(),
        phone: phoneDigits,
      })
      .select()
      .single()

    if (error) {
      setMessage('Error creating customer: ' + error.message)
      setCreatingCustomer(false)
      return
    }

    setCustomers([...customers, customer])
    setCustomerId(customer.id)
    setNewCustomerName('')
    setNewCustomerPhone('')
    setShowNewCustomer(false)
    setCreatingCustomer(false)
    showToast('✅ Customer created!', '#4C7A5E')
  }

  // Submit form
  const handleSubmit = async (e) => {
    e.preventDefault()
    setMessage('')
    setLoading(true)

    if (!customerId) {
      setMessage('Please select a customer.')
      setLoading(false)
      return
    }

    if (!deviceType.trim()) {
      setMessage('Please enter the device type.')
      setLoading(false)
      return
    }

    if (!issueDescription.trim()) {
      setMessage('Please describe the issue.')
      setLoading(false)
      return
    }

    if (!price || Number(price) <= 0) {
      setMessage('Please enter a valid price.')
      setLoading(false)
      return
    }

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

    if (error) {
      setMessage('Error: ' + error.message)
      setLoading(false)
      return
    }

    showToast('✅ Repair job created!', '#4C7A5E')
    setLoading(false)

    setTimeout(() => {
      router.push(`/dashboard/repairs/jobs/${job.id}`)
    }, 800)
  }

  const inputStyle = {
    width: '100%', padding: '0.7rem', borderRadius: '8px',
    border: '1px solid #E8E0D5', fontSize: '0.95rem',
    background: '#fff', boxSizing: 'border-box', color: '#2B2620',
    transition: 'border-color 0.2s ease',
  }

  const labelStyle = {
    display: 'block', color: '#2B2620', marginBottom: '0.3rem',
    fontSize: '0.85rem', fontWeight: '500',
  }

  if (!businessId) {
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
      </div>
    )
  }

  const totalPartsCost = parts.reduce((sum, p) => sum + p.total, 0)

  return (
    <main style={{ minHeight: '100vh', background: '#F5EFE2', padding: '1.5rem 1.2rem' }}>
      <style>{`
        .form-card {
          background: #fff;
          border-radius: 14px;
          padding: 1.5rem;
          border: 1px solid #E8E0D5;
          max-width: 480px;
          margin: 0 auto;
        }
        .form-group {
          margin-bottom: 1rem;
        }
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
        .btn-primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
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
        .btn-link {
          background: none;
          border: none;
          color: #1E3A5F;
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          text-decoration: underline;
        }
        .btn-link:hover { color: #C79A2B; }
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
          align-items: center;
          gap: 0.8rem;
          margin-bottom: 1rem;
          flex-wrap: wrap;
        }
        .header-row h1 {
          color: #1E3A5F;
          font-size: 1.3rem;
          font-weight: 700;
          margin: 0;
        }
        .header-row .badge {
          background: #F6E9C8;
          color: #1E3A5F;
          padding: 0.1rem 0.6rem;
          border-radius: 12px;
          font-size: 0.65rem;
          font-weight: 600;
        }
        .part-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.4rem 0;
          border-bottom: 1px solid #F0EDE8;
          font-size: 0.85rem;
        }
        .part-item:last-child { border-bottom: none; }
        .part-item .name { color: #1E3A5F; font-weight: 500; }
        .part-item .cost { color: #6B6255; }
        .part-item .remove-btn {
          background: none;
          border: none;
          color: #AE4A34;
          cursor: pointer;
          font-size: 0.8rem;
        }
        .new-customer-form {
          background: #F8F6F2;
          border-radius: 8px;
          padding: 1rem;
          margin-top: 0.5rem;
          border: 1px solid #E8E0D5;
        }
        .new-customer-form .row {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }
        .new-customer-form .row input {
          flex: 1;
          min-width: 100px;
        }
        .inline-flex {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-wrap: wrap;
        }
        .parts-section {
          background: #F8F6F2;
          border-radius: 8px;
          padding: 1rem;
          margin-bottom: 1rem;
        }
        .parts-section .row {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
          margin-bottom: 0.5rem;
        }
        .parts-section .row input {
          flex: 1;
          min-width: 80px;
        }
        .parts-section .row .small {
          flex: 0.5;
          min-width: 60px;
        }
        @media (max-width: 420px) {
          .form-card { padding: 1rem; }
          .new-customer-form .row { flex-direction: column; }
          .new-customer-form .row input { width: 100%; }
          .parts-section .row { flex-direction: column; }
          .parts-section .row input { width: 100%; }
        }
      `}</style>

      {/* ===== BACK BUTTON ===== */}
      <button className="back-link" onClick={() => router.push('/dashboard/repairs')}>
        ← Back to dashboard
      </button>

      {/* ===== HEADER ===== */}
      <div className="header-row">
        <h1>🔧 New Repair Job</h1>
        <span className="badge">Repairs</span>
      </div>

      {/* ===== FORM ===== */}
      <form onSubmit={handleSubmit} className="form-card">
        {/* Customer */}
        <div className="form-group">
          <div className="inline-flex" style={{ justifyContent: 'space-between' }}>
            <label style={labelStyle}>Customer</label>
            <button
              type="button"
              className="btn-link"
              onClick={() => setShowNewCustomer(!showNewCustomer)}
            >
              {showNewCustomer ? '✕ Cancel' : '+ New customer'}
            </button>
          </div>

          {showNewCustomer ? (
            <div className="new-customer-form">
              <p style={{ fontSize: '0.8rem', color: '#6B6255', margin: '0 0 0.5rem' }}>
                Add a new customer first, then create their repair job.
              </p>
              <div className="row">
                <input
                  className="form-input"
                  type="text"
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                  placeholder="Customer name"
                  required
                  style={inputStyle}
                />
                <input
                  className="form-input"
                  type="tel"
                  inputMode="numeric"
                  value={newCustomerPhone}
                  onChange={(e) => setNewCustomerPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                  placeholder="Phone 080..."
                  required
                  style={inputStyle}
                />
              </div>
              <button
                type="button"
                className="btn-primary"
                onClick={handleCreateCustomer}
                disabled={creatingCustomer}
                style={{ padding: '0.5rem', fontSize: '0.85rem' }}
              >
                {creatingCustomer ? 'Creating...' : '➕ Create customer'}
              </button>
            </div>
          ) : (
            <select
              className="form-input"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              required
              style={inputStyle}
            >
              <option value="">Select a customer</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.phone ? `· ${c.phone}` : ''}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Device Details */}
        <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap' }}>
          <div className="form-group" style={{ flex: 1, minWidth: '120px' }}>
            <label style={labelStyle}>Device Type <span style={{ color: '#AE4A34' }}>*</span></label>
            <input
              className="form-input"
              type="text"
              value={deviceType}
              onChange={(e) => setDeviceType(e.target.value)}
              placeholder="e.g. iPhone, Samsung, Laptop"
              required
              style={inputStyle}
            />
          </div>
          <div className="form-group" style={{ flex: 1, minWidth: '120px' }}>
            <label style={labelStyle}>Device Model</label>
            <input
              className="form-input"
              type="text"
              value={deviceModel}
              onChange={(e) => setDeviceModel(e.target.value)}
              placeholder="e.g. iPhone 13, Galaxy S22"
              style={inputStyle}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap' }}>
          <div className="form-group" style={{ flex: 1, minWidth: '120px' }}>
            <label style={labelStyle}>Serial Number / IMEI</label>
            <input
              className="form-input"
              type="text"
              value={serialNumber}
              onChange={(e) => setSerialNumber(e.target.value)}
              placeholder="e.g. IMEI or Serial #"
              style={inputStyle}
            />
          </div>
          <div className="form-group" style={{ flex: 1, minWidth: '120px' }}>
            <label style={labelStyle}>Device Color</label>
            <input
              className="form-input"
              type="text"
              value={deviceColor}
              onChange={(e) => setDeviceColor(e.target.value)}
              placeholder="e.g. Black, Silver"
              style={inputStyle}
            />
          </div>
        </div>
        {/* Device Condition */}
        <div className="form-group">
          <label style={labelStyle}>Device Condition</label>
          <input
            className="form-input"
            type="text"
            value={deviceCondition}
            onChange={(e) => setDeviceCondition(e.target.value)}
            placeholder="e.g. Cracked screen, Water damage, Battery issue"
            style={inputStyle}
          />
        </div>

        {/* Issue Description */}
        <div className="form-group">
          <label style={labelStyle}>Issue Description <span style={{ color: '#AE4A34' }}>*</span></label>
          <textarea
            className="form-input"
            value={issueDescription}
            onChange={(e) => setIssueDescription(e.target.value)}
            placeholder="Describe the problem with the device..."
            rows={3}
            required
            style={{ ...inputStyle, fontFamily: 'inherit', resize: 'vertical' }}
          />
        </div>

        {/* Parts Used */}
        <div className="parts-section">
          <label style={{ ...labelStyle, marginBottom: '0.3rem' }}>🔩 Parts Used</label>

          <div className="row">
            <input
              className="form-input"
              type="text"
              value={partName}
              onChange={(e) => setPartName(e.target.value)}
              placeholder="Part name"
              style={{ ...inputStyle, padding: '0.4rem' }}
            />
            <input
              className="form-input small"
              type="number"
              value={partQuantity}
              onChange={(e) => setPartQuantity(e.target.value)}
              placeholder="Qty"
              style={{ ...inputStyle, padding: '0.4rem', minWidth: '60px' }}
            />
            <input
              className="form-input small"
              type="number"
              value={partCost}
              onChange={(e) => setPartCost(e.target.value)}
              placeholder="Cost (₦)"
              style={{ ...inputStyle, padding: '0.4rem', minWidth: '80px' }}
            />
            <button
              type="button"
              className="btn-secondary"
              onClick={addPart}
              style={{ padding: '0.3rem 0.8rem', fontSize: '0.75rem' }}
            >
              Add
            </button>
          </div>

          {parts.length > 0 && (
            <div style={{ marginTop: '0.5rem' }}>
              {parts.map((p, i) => (
                <div key={i} className="part-item">
                  <span className="name">{p.name}</span>
                  <span className="cost">{p.quantity} × ₦{p.cost.toLocaleString()} = ₦{p.total.toLocaleString()}</span>
                  <button type="button" className="remove-btn" onClick={() => removePart(i)}>✕</button>
                </div>
              ))}
              <div style={{ textAlign: 'right', fontSize: '0.85rem', fontWeight: '600', color: '#1E3A5F', paddingTop: '0.3rem' }}>
                Total Parts: ₦{totalPartsCost.toLocaleString()}
              </div>
            </div>
          )}
        </div>

        {/* Pricing */}
        <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap' }}>
          <div className="form-group" style={{ flex: 1, minWidth: '120px' }}>
            <label style={labelStyle}>Total Price (₦) <span style={{ color: '#AE4A34' }}>*</span></label>
            <input
              className="form-input"
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0.00"
              required
              style={inputStyle}
            />
          </div>
          <div className="form-group" style={{ flex: 1, minWidth: '120px' }}>
            <label style={labelStyle}>Deposit Paid (₦)</label>
            <input
              className="form-input"
              type="number"
              value={deposit}
              onChange={(e) => setDeposit(e.target.value)}
              placeholder="0.00"
              style={inputStyle}
            />
          </div>
        </div>

        {/* Estimated Time & Due Date */}
        <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap' }}>
          <div className="form-group" style={{ flex: 1, minWidth: '120px' }}>
            <label style={labelStyle}>Estimated Time (minutes)</label>
            <input
              className="form-input"
              type="number"
              value={estimatedTime}
              onChange={(e) => setEstimatedTime(e.target.value)}
              placeholder="e.g. 60"
              style={inputStyle}
            />
          </div>
          <div className="form-group" style={{ flex: 1, minWidth: '120px' }}>
            <label style={labelStyle}>Due Date</label>
            <input
              className="form-input"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              style={inputStyle}
            />
          </div>
        </div>

        {/* Status */}
        <div className="form-group">
          <label style={labelStyle}>Status</label>
          <select
            className="form-input"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            style={inputStyle}
          >
            {REPAIR_STAGES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>

        {/* Submit */}
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Creating job...' : '🔧 Create repair job'}
        </button>

        {message && (
          <p style={{ marginTop: '0.8rem', fontSize: '0.85rem', color: '#AE4A34', textAlign: 'center' }}>
            {message}
          </p>
        )}
      </form>
    </main>
  )
                }
