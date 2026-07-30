'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../../../lib/supabaseClient'
import { getPlanLimits } from '../../../../lib/planLimits'
export default function NewOrderPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [businessId, setBusinessId] = useState(null)
  const [sector, setSector] = useState(null)
  const [plan, setPlan] = useState('free')
  const [currentOrderCount, setCurrentOrderCount] = useState(0)
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  // Form fields
  const [customerId, setCustomerId] = useState('')
  const [itemName, setItemName] = useState('')
  const [price, setPrice] = useState('')
  const [deposit, setDeposit] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [status, setStatus] = useState('Order placed')

  // Repairs-specific fields
  const [deviceType, setDeviceType] = useState('')
  const [deviceModel, setDeviceModel] = useState('')
  const [serialNumber, setSerialNumber] = useState('')
  const [deviceCondition, setDeviceCondition] = useState('')
  const [deviceColor, setDeviceColor] = useState('')
  const [issueDescription, setIssueDescription] = useState('')
  const [estimatedTime, setEstimatedTime] = useState('')
  const [partsUsed, setPartsUsed] = useState([])
  const [partName, setPartName] = useState('')
  const [partQuantity, setPartQuantity] = useState(1)
  const [partCost, setPartCost] = useState('')

  // Duplicate order
  const [isDuplicating, setIsDuplicating] = useState(false)

  // New customer
  const [showNewCustomer, setShowNewCustomer] = useState(false)
  const [newCustomerName, setNewCustomerName] = useState('')
  const [newCustomerPhone, setNewCustomerPhone] = useState('')
  const [creatingCustomer, setCreatingCustomer] = useState(false)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data: business } = await supabase
        .from('businesses')
        .select('id, sector, plan')
        .eq('owner_id', user.id)
        .single()

      if (!business) {
        router.push('/onboarding')
        return
      }

      setBusinessId(business.id)
      setSector(business.sector)
      setPlan(business.plan || 'free')

      // Count existing orders
      const { count } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', business.id)
      setCurrentOrderCount(count || 0)

      // Load customers
      const { data: customerData } = await supabase
        .from('customers')
        .select('*')
        .eq('business_id', business.id)
        .order('name', { ascending: true })
      setCustomers(customerData || [])

      // Check for duplicate param
      const duplicateId = searchParams?.get('duplicate')
      if (duplicateId) {
        await loadDuplicateOrder(duplicateId)
      }

      setLoading(false)
    }

    load()
  }, [searchParams])

  const loadDuplicateOrder = async (orderId) => {
    setIsDuplicating(true)
    const { data: order } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single()

    if (order) {
      setCustomerId(order.customer_id || '')
      setItemName(order.title || '')
      setPrice(order.price?.toString() || '')
      setDeposit(order.amount_paid?.toString() || '')
      setDueDate(order.due_date || '')
      setStatus(order.current_status || 'Order placed')
      // For repairs
      setDeviceType(order.device_type || '')
      setDeviceModel(order.device_model || '')
      setSerialNumber(order.serial_number || '')
      setDeviceCondition(order.device_condition || '')
      setDeviceColor(order.device_color || '')
      setIssueDescription(order.customer_notes || '')
      setEstimatedTime(order.estimated_repair_time?.toString() || '')
      setPartsUsed(order.parts_used || [])
    }
    setIsDuplicating(false)
  }

  // Part management
  const addPart = () => {
    if (!partName.trim() || !partCost) return
    const costNum = Number(partCost)
    const qty = Number(partQuantity) || 1
    setPartsUsed([...partsUsed, { name: partName.trim(), quantity: qty, cost: costNum }])
    setPartName('')
    setPartQuantity(1)
    setPartCost('')
  }

  const removePart = (index) => {
    setPartsUsed(partsUsed.filter((_, i) => i !== index))
  }

  // New customer
  const handleCreateCustomer = async (e) => {
    e.preventDefault()
    setCreatingCustomer(true)
    setMessage('')

    const phoneDigits = newCustomerPhone.replace(/\D/g, '')
    if (!newCustomerName.trim() || phoneDigits.length !== 11) {
      setMessage('Please enter a valid name and 11-digit phone number.')
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
    setMessage('✅ Customer created!')
  }

  // Submit
  const handleSubmit = async (e) => {
    e.preventDefault()
    setMessage('')
    setSaving(true)

    if (!customerId) {
      setMessage('Please select a customer.')
      setSaving(false)
      return
    }

    // Plan limit check
    const limits = getPlanLimits(plan)
    if (currentOrderCount >= limits.orders) {
      setMessage(`❌ You've reached the limit of ${limits.orders} orders on your Free plan. Please upgrade to add more.`)
      setSaving(false)
      return
    }

    // Validate based on sector
    const isRepairs = sector === 'Repairs & Technical Services'
    if (isRepairs) {
      if (!deviceType.trim()) {
        setMessage('Please enter the device type.')
        setSaving(false)
        return
      }
      if (!issueDescription.trim()) {
        setMessage('Please describe the issue.')
        setSaving(false)
        return
      }
    }

    if (!itemName.trim() && !isRepairs) {
      setMessage('Please enter the item/garment name.')
      setSaving(false)
      return
    }

    if (!price || Number(price) <= 0) {
      setMessage('Please enter a valid price.')
      setSaving(false)
      return
    }

    const priceNum = Number(price)
    const depositNum = Number(deposit) || 0
    const trackingToken = crypto.randomUUID()

    // Build order object
    const orderData = {
      business_id: businessId,
      customer_id: customerId,
      title: isRepairs ? `${deviceType} ${deviceModel || 'Repair'}` : itemName.trim(),
      price: priceNum,
      amount_paid: depositNum,
      due_date: dueDate || null,
      current_status: status,
      tracking_token: trackingToken,
      customer_notes: isRepairs ? issueDescription.trim() : null,
    }

    // Add repairs-specific fields
    if (isRepairs) {
      orderData.device_type = deviceType.trim()
      orderData.device_model = deviceModel.trim()
      orderData.serial_number = serialNumber.trim()
      orderData.device_condition = deviceCondition.trim()
      orderData.device_color = deviceColor.trim()
      orderData.estimated_repair_time = Number(estimatedTime) || null
      orderData.parts_used = partsUsed.length > 0 ? partsUsed : null
    }

    const { data: order, error } = await supabase
      .from('orders')
      .insert(orderData)
      .select()
      .single()

    if (error) {
      setMessage('Error: ' + error.message)
      setSaving(false)
      return
    }

    setMessage('✅ Order created!')
    setSaving(false)

    setTimeout(() => {
      // Redirect to order detail (fashion) or repair job detail (repairs)
      if (isRepairs) {
        router.push(`/dashboard/repairs/jobs/${order.id}`)
      } else {
        router.push(`/dashboard/orders/${order.id}`)
      }
    }, 800)
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
      </div>
    )
  }

  const limits = getPlanLimits(plan)
  const canAddMore = currentOrderCount < limits.orders
  const isRepairs = sector === 'Repairs & Technical Services'

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
        .form-card {
          background: #fff;
          border-radius: 14px;
          padding: 1.5rem;
          border: 1px solid #E8E0D5;
          max-width: 480px;
          margin: 0 auto;
        }
        .form-group { margin-bottom: 1rem; }
        .form-group label { display: block; color: #2B2620; margin-bottom: 0.3rem; font-size: 0.85rem; font-weight: 500; }
        .form-input { width: 100%; padding: 0.7rem; border-radius: 8px; border: 1px solid #E8E0D5; font-size: 0.95rem; background: #fff; box-sizing: border-box; color: #2B2620; transition: border-color 0.2s ease; }
        .form-input:focus { outline: none; border-color: #C79A2B; }
        .btn-primary {
          width: 100%; padding: 0.85rem; border-radius: 8px; border: none;
          background: linear-gradient(135deg, #C79A2B, #B4881E);
          color: #1E3A5F; font-size: 1rem; font-weight: 700;
          box-shadow: 0 4px 14px rgba(199,154,43,0.3);
          cursor: pointer; transition: transform 0.1s ease;
        }
        .btn-primary:active { transform: scale(0.98); }
        .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
        .btn-secondary { padding: 0.5rem 1rem; border-radius: 6px; border: 1px solid #E8E0D5; background: #fff; color: #1E3A5F; font-size: 0.8rem; cursor: pointer; }
        .btn-secondary:hover { background: #F5EFE2; }
        .btn-link { background: none; border: none; color: #1E3A5F; font-size: 0.8rem; font-weight: 600; cursor: pointer; text-decoration: underline; }
        .btn-link:hover { color: #C79A2B; }
        .back-link { background: none; border: none; color: #1E3A5F; font-size: 0.85rem; padding: 0; margin-bottom: 1rem; cursor: pointer; }
        .back-link:hover { text-decoration: underline; }
        .header-row { display: flex; align-items: center; gap: 0.8rem; margin-bottom: 1rem; flex-wrap: wrap; }
        .header-row h1 { color: #1E3A5F; font-size: 1.3rem; font-weight: 700; margin: 0; }
        .header-row .badge { background: #F6E9C8; color: #1E3A5F; padding: 0.1rem 0.6rem; border-radius: 12px; font-size: 0.65rem; font-weight: 600; }
        .part-item { display: flex; justify-content: space-between; align-items: center; padding: 0.4rem 0; border-bottom: 1px solid #F0EDE8; font-size: 0.85rem; }
        .part-item:last-child { border-bottom: none; }
        .part-item .name { color: #1E3A5F; font-weight: 500; }
        .part-item .cost { color: #6B6255; }
        .part-item .remove-btn { background: none; border: none; color: #AE4A34; cursor: pointer; font-size: 0.8rem; }
        .new-customer-form { background: #F8F6F2; border-radius: 8px; padding: 1rem; margin-top: 0.5rem; border: 1px solid #E8E0D5; }
        .new-customer-form .row { display: flex; gap: 0.5rem; flex-wrap: wrap; }
        .new-customer-form .row input { flex: 1; min-width: 100px; }
        .inline-flex { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
        .parts-section { background: #F8F6F2; border-radius: 8px; padding: 1rem; margin-bottom: 1rem; }
        .parts-section .row { display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 0.5rem; }
        .parts-section .row input { flex: 1; min-width: 80px; }
        .parts-section .row .small { flex: 0.5; min-width: 60px; }
        .plan-limit-warning {
          background: #F1DBD3;
          border: 1px solid #AE4A34;
          border-radius: 8px;
          padding: 0.8rem 1rem;
          margin-bottom: 1rem;
          color: #AE4A34;
          font-size: 0.85rem;
          text-align: center;
        }
        @media (max-width: 420px) {
          .form-card { padding: 1rem; }
          .new-customer-form .row { flex-direction: column; }
          .new-customer-form .row input { width: 100%; }
          .parts-section .row { flex-direction: column; }
          .parts-section .row input { width: 100%; }
          .inline-flex { flex-direction: column; align-items: stretch; }
        }
      `}</style>

      <button className="back-link" onClick={() => router.push('/dashboard')}>
        ← Back to dashboard
      </button>

      <div className="header-row">
        <h1>{isRepairs ? '🔧 New Repair Job' : '📋 New Order'}</h1>
        {isRepairs && <span className="badge">Repairs</span>}
        {!isRepairs && <span className="badge">Fashion</span>}
        {plan === 'free' && (
          <span style={{ fontSize: '0.7rem', background: '#F0EDE8', padding: '0.1rem 0.5rem', borderRadius: '10px', color: '#6B6255' }}>
            Free ({currentOrderCount}/{limits.orders} orders)
          </span>
        )}
      </div>

      {!canAddMore && (
        <div className="plan-limit-warning">
          <strong>⚠️ You've reached the limit of {limits.orders} orders on your Free plan.</strong>
          <br />
          <a href="/dashboard/subscription" style={{ color: '#AE4A34', fontWeight: '600' }}>Upgrade now to add more →</a>
        </div>
      )}

      <form onSubmit={handleSubmit} className="form-card">
        {/* Customer */}
        <div className="form-group">
          <div className="inline-flex" style={{ justifyContent: 'space-between' }}>
            <label style={labelStyle}>Customer</label>
            <button type="button" className="btn-link" onClick={() => setShowNewCustomer(!showNewCustomer)}>
              {showNewCustomer ? '✕ Cancel' : '+ New customer'}
            </button>
          </div>

          {showNewCustomer ? (
            <div className="new-customer-form">
              <p style={{ fontSize: '0.8rem', color: '#6B6255', margin: '0 0 0.5rem' }}>
                Add a new customer first, then create their order.
              </p>
              <div className="row">
                <input
                  className="form-input"
                  type="text"
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                  placeholder="Customer name"
                  required
                  disabled={!canAddMore}
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
                  disabled={!canAddMore}
                  style={inputStyle}
                />
              </div>
              <button
                type="button"
                className="btn-primary"
                onClick={handleCreateCustomer}
                disabled={creatingCustomer || !canAddMore}
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
              disabled={!canAddMore}
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

        {isRepairs ? (
          // REPAIRS FIELDS
          <>
            <div className="inline-flex">
              <div className="form-group flex-1" style={{ flex: 1, minWidth: '120px' }}>
                <label style={labelStyle}>Device Type <span style={{ color: '#AE4A34' }}>*</span></label>
                <input
                  type="text"
                  value={deviceType}
                  onChange={(e) => setDeviceType(e.target.value)}
                  placeholder="e.g. iPhone, Samsung, Laptop"
                  required
                  disabled={!canAddMore}
                  style={inputStyle}
                />
              </div>
              <div className="form-group flex-1" style={{ flex: 1, minWidth: '120px' }}>
                <label style={labelStyle}>Device Model</label>
                <input
                  type="text"
                  value={deviceModel}
                  onChange={(e) => setDeviceModel(e.target.value)}
                  placeholder="e.g. iPhone 13, Galaxy S22"
                  disabled={!canAddMore}
                  style={inputStyle}
                />
              </div>
            </div>

            <div className="inline-flex">
              <div className="form-group flex-1">
                <label style={labelStyle}>Serial / IMEI</label>
                <input
                  type="text"
                  value={serialNumber}
                  onChange={(e) => setSerialNumber(e.target.value)}
                  placeholder="e.g. IMEI or Serial #"
                  disabled={!canAddMore}
                  style={inputStyle}
                />
              </div>
              <div className="form-group flex-1">
                <label style={labelStyle}>Device Color</label>
                <input
                  type="text"
                  value={deviceColor}
                  onChange={(e) => setDeviceColor(e.target.value)}
                  placeholder="e.g. Black, Silver"
                  disabled={!canAddMore}
                  style={inputStyle}
                />
              </div>
            </div>

            <div className="form-group">
              <label style={labelStyle}>Device Condition</label>
              <input
                type="text"
                value={deviceCondition}
                onChange={(e) => setDeviceCondition(e.target.value)}
                placeholder="e.g. Cracked screen, Water damage"
                disabled={!canAddMore}
                style={inputStyle}
              />
            </div>

            <div className="form-group">
              <label style={labelStyle}>Issue Description <span style={{ color: '#AE4A34' }}>*</span></label>
              <textarea
                value={issueDescription}
                onChange={(e) => setIssueDescription(e.target.value)}
                rows={3}
                placeholder="Describe the problem..."
     required
                disabled={!canAddMore}
                style={{ ...inputStyle, fontFamily: 'inherit', resize: 'vertical' }}
              />
            </div>

            <div className="parts-section">
              <label style={{ ...labelStyle, marginBottom: '0.3rem' }}>🔩 Parts Used</label>
              <div className="row">
                <input
                  type="text"
                  value={partName}
                  onChange={(e) => setPartName(e.target.value)}
                  placeholder="Part name"
                  disabled={!canAddMore}
                  style={{ ...inputStyle, padding: '0.4rem' }}
                />
                <input
                  type="number"
                  value={partQuantity}
                  onChange={(e) => setPartQuantity(e.target.value)}
                  placeholder="Qty"
                  disabled={!canAddMore}
                  style={{ ...inputStyle, padding: '0.4rem', minWidth: '60px' }}
                />
                <input
                  type="number"
                  value={partCost}
                  onChange={(e) => setPartCost(e.target.value)}
                  placeholder="Cost (₦)"
                  disabled={!canAddMore}
                  style={{ ...inputStyle, padding: '0.4rem', minWidth: '80px' }}
                />
                <button type="button" className="btn-secondary" onClick={addPart} disabled={!canAddMore} style={{ padding: '0.3rem 0.8rem', fontSize: '0.75rem' }}>
                  Add
                </button>
              </div>
              {partsUsed.length > 0 && (
                <div style={{ marginTop: '0.5rem' }}>
                  {partsUsed.map((p, i) => (
                    <div key={i} className="part-item">
                      <span className="name">{p.name}</span>
                      <span className="cost">{p.quantity} × ₦{p.cost.toLocaleString()} = ₦{(p.quantity * p.cost).toLocaleString()}</span>
                      <button type="button" className="remove-btn" onClick={() => removePart(i)}>✕</button>
                    </div>
                  ))}
                  <div style={{ textAlign: 'right', fontSize: '0.85rem', fontWeight: '600', color: '#1E3A5F', paddingTop: '0.3rem' }}>
                    Total Parts: ₦{partsUsed.reduce((sum, p) => sum + p.quantity * p.cost, 0).toLocaleString()}
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          // FASHION FIELDS
          <div className="form-group">
            <label style={labelStyle}>Item / Garment name</label>
            <input
              type="text"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              placeholder="e.g. Aso-ebi gown, Ankara top..."
              required
              disabled={!canAddMore}
              style={inputStyle}
            />
          </div>
        )}

        {/* Pricing (shared) */}
        <div className="inline-flex">
          <div className="form-group flex-1" style={{ flex: 1, minWidth: '120px' }}>
            <label style={labelStyle}>Total Price (₦) <span style={{ color: '#AE4A34' }}>*</span></label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0.00"
              required
              disabled={!canAddMore}
              style={inputStyle}
            />
          </div>
          <div className="form-group flex-1" style={{ flex: 1, minWidth: '120px' }}>
            <label style={labelStyle}>Deposit (₦)</label>
            <input
              type="number"
              value={deposit}
              onChange={(e) => setDeposit(e.target.value)}
              placeholder="0.00"
              disabled={!canAddMore}
              style={inputStyle}
            />
          </div>
        </div>

        {/* Estimated time (repairs only) */}
        {isRepairs && (
          <div className="form-group">
            <label style={labelStyle}>Estimated Time (minutes)</label>
            <input
              type="number"
              value={estimatedTime}
              onChange={(e) => setEstimatedTime(e.target.value)}
              placeholder="e.g. 60"
              disabled={!canAddMore}
              style={inputStyle}
            />
          </div>
        )}

        {/* Due Date */}
        <div className="form-group">
          <label style={labelStyle}>Due date</label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            disabled={!canAddMore}
            style={inputStyle}
          />
        </div>

        {/* Status */}
        <div className="form-group">
          <label style={labelStyle}>Starting status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            disabled={!canAddMore}
            style={inputStyle}
          >
            {isRepairs ? (
              <>
                <option value="Diagnosing">Diagnosing</option>
                <option value="Awaiting Parts">Awaiting Parts</option>
                <option value="Repairing">Repairing</option>
                <option value="Ready">Ready for Pickup</option>
                <option value="Completed">Completed</option>
                <option value="Delivered">Delivered</option>
              </>
            ) : (
              <>
                <option value="Order placed">Order placed</option>
                <option value="Cutting">Cutting</option>
                <option value="Sewing">Sewing</option>
                <option value="Ready">Ready</option>
                <option value="Delivered">Delivered</option>
              </>
            )}
          </select>
        </div>

        {/* Submit */}
        {canAddMore ? (
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Creating...' : isRepairs ? '🔧 Create repair job' : '🚀 Create order'}
          </button>
        ) : (
          <button
            type="button"
            className="btn-primary"
            onClick={() => router.push('/dashboard/subscription')}
            style={{ background: '#AE4A34', boxShadow: '0 4px 14px rgba(174,74,52,0.3)' }}
          >
            🔒 Upgrade to add more orders
          </button>
        )}

        {message && (
          <p style={{ marginTop: '0.8rem', fontSize: '0.85rem', color: message.startsWith('✅') ? '#4C7A5E' : '#AE4A34', textAlign: 'center' }}>
            {message}
          </p>
        )}
      </form>
    </main>
  )
                    }
