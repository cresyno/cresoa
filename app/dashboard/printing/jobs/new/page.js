'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../../../../lib/supabaseClient'

// ─── Self-contained SVG icons ───
const Svg = ({ name, size = 20, stroke = 'currentColor' }) => {
  const icons = {
    plus: <><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></>,
    back: <><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></>,
    search: <><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></>,
    user: <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></>,
    file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></>,
    check: <polyline points="20 6 9 17 4 12" />,
    clock: <><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></>,
    naira: <><path d="M6 3v18M18 3v18M6 8h12M6 16h12" /><path d="M6 3l6 9 6-9M6 21l6-9 6 9" /></>,
    x: <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>,
    arrowRight: <><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></>,
    upload: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></>,
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{icons[name]}</svg>
}

const JOB_TYPES = [
  'Flyers', 'Business Cards', 'Banners', 'Stickers', 'T-shirts', 'Signage',
  'Wedding Programmes', 'Posters', 'Brochures', 'Invitation Cards', 'Branding', 'Design Services', 'Custom Service'
]

const STEPS = [
  { id: 1, label: 'Customer' },
  { id: 2, label: 'Job Details' },
  { id: 3, label: 'Payment' },
  { id: 4, label: 'Deadline & Staff' },
  { id: 5, label: 'Review' },
]

const inputStyle = {
  width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px',
  border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-bg)',
  color: 'var(--cresoa-text)', fontSize: '0.95rem', boxSizing: 'border-box'
}

const labelStyle = { display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem', color: 'var(--cresoa-text)' }

const PRIMARY_BTN = {
  background: 'var(--cresoa-accent)', color: '#fff', border: 'none', borderRadius: '8px',
  padding: '0.6rem 1.2rem', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem'
}

const SECONDARY_BTN = {
  background: 'transparent', color: 'var(--cresoa-text)', border: '1px solid var(--cresoa-border)',
  borderRadius: '8px', padding: '0.6rem 1.2rem', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem'
}

export default function NewPrintJobPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const businessId = searchParams.get('business_id')

  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [customers, setCustomers] = useState([])
  const [customerSearch, setCustomerSearch] = useState('')

  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [showNewCustomer, setShowNewCustomer] = useState(false)
  const [newCustomerName, setNewCustomerName] = useState('')
  const [newCustomerPhone, setNewCustomerPhone] = useState('')

  const [form, setForm] = useState({
    title: '', jobType: '', quantity: '', specifications: '',
    size: '', material: '', color: '', finishing: '',
    price: '', paymentStatus: 'unpaid', amountPaid: '', dueDate: '', dueTime: '',
    deliveryMethod: 'pickup', deliveryAddress: '', assignedStaffIds: [],
    notes: '',
  })

  const [staffList, setStaffList] = useState([])

  useEffect(() => {
    const init = async () => {
      if (!businessId) return
      setLoading(true)
      try {
        const { data: custs } = await supabase
          .from('customers')
          .select('*')
          .eq('business_id', businessId)
          .eq('sector', 'printing')
          .order('created_at', { ascending: false })
        setCustomers(custs || [])

        const { data: staff } = await supabase
          .from('staff')
          .select('*')
          .eq('business_id', businessId)
        setStaffList(staff || [])
      } catch (e) {
        console.error('Init error:', e)
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [businessId])

  const updateField = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }))
    setError('')
  }

  // Handle customer selection
  const handleSelectCustomer = (customer) => {
    setSelectedCustomer(customer)
  }

  // Create new customer inline
  const handleCreateCustomer = async () => {
    if (!newCustomerName.trim()) {
      setError('Customer name is required.')
      return
    }
    const nameParts = newCustomerName.trim().split(' ')
    const firstName = nameParts[0] || ''
    const lastName = nameParts.slice(1).join(' ') || ''

    const { data: newCust, error: custError } = await supabase
      .from('customers')
      .insert({
        business_id: businessId,
        sector: 'printing',
        first_name: firstName,
        last_name: lastName,
        phone: newCustomerPhone.trim() || null,
        name: newCustomerName.trim(),
      })
      .select()
      .single()

    if (custError) {
      setError('Failed to create customer: ' + custError.message)
      return
    }

    setSelectedCustomer(newCust)
    setShowNewCustomer(false)
    setNewCustomerName('')
    setNewCustomerPhone('')
    setCustomers(prev => [newCust, ...prev])
  }

  // Validate current step
  const validateStep = () => {
    if (step === 1) {
      if (!selectedCustomer) {
        setError('Please select a customer.')
        return false
      }
    }
    if (step === 2) {
      if (!form.title.trim()) { setError('Job title is required.'); return false }
      if (!form.jobType) { setError('Select a job type.'); return false }
      if (!form.quantity || Number(form.quantity) < 1) { setError('Quantity must be at least 1.'); return false }
    }
    if (step === 3) {
      if (!form.price || Number(form.price) <= 0) { setError('Price must be greater than 0.'); return false }
      if (form.paymentStatus === 'partial' && form.amountPaid && Number(form.amountPaid) > Number(form.price)) {
        setError('Amount paid cannot exceed total price.')
        return false
      }
    }
    setError('')
    return true
  }

  const handleNext = () => {
    if (!validateStep()) return
    setStep(prev => Math.min(prev + 1, 5))
  }

  const handleBack = () => {
    setError('')
    setStep(prev => Math.max(prev - 1, 1))
  }

  // Calculate balance
  const balance = Number(form.price || 0) - Number(form.amountPaid || 0)

  // Handle create job
  const handleCreateJob = async () => {
    if (!validateStep()) return
    if (saving) return
    setSaving(true)
    setError('')

    try {
      // Generate job number
      const prefix = `PR-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`
      const { count } = await supabase
        .from('print_jobs')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', businessId)
      const jobNumber = `${prefix}-${String((count || 0) + 1).padStart(4, '0')}`

      // Determine status based on payment
      let status = 'quote'
      if (form.paymentStatus === 'paid') status = 'in_production'
      else if (form.paymentStatus === 'partial' || form.paymentStatus === 'deposit') status = 'awaiting_production'

      const { data: job, error: jobError } = await supabase
        .from('print_jobs')
        .insert({
          business_id: businessId,
          customer_id: selectedCustomer.id,
          job_number: jobNumber,
          title: form.title.trim(),
          job_type: form.jobType,
          quantity: Number(form.quantity),
          specifications: {
            specs: form.specifications,
            size: form.size,
            material: form.material,
            color: form.color,
            finishing: form.finishing,
          },
          status: status,
          deadline: form.dueDate ? new Date(form.dueDate + (form.dueTime ? `T${form.dueTime}` : 'T23:59:59')) : null,
          total: Number(form.price),
          amount_paid: form.paymentStatus === 'unpaid' ? 0 : Number(form.amountPaid || 0),
          deposit: form.paymentStatus === 'deposit' ? Number(form.amountPaid || 0) : 0,
          delivery_method: form.deliveryMethod,
          delivery_address: form.deliveryAddress || null,
          assigned_staff_ids: form.assignedStaffIds,
          notes: form.notes || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (jobError) throw jobError

      // Log activity
      await supabase.from('business_activity_logs').insert({
        business_id: businessId,
        performed_by: (await supabase.auth.getUser()).data.user.id,
        action: 'print_job_created',
        details: { job_number: jobNumber, title: form.title },
      })

      // ✅ MANUAL REDIRECT – goes to job detail after explicit click
      router.push(`/dashboard/printing/jobs/${job.id}?business_id=${businessId}`)
    } catch (err) {
      console.error('Create job error:', err)
      setError(err.message || 'Failed to create job.')
      setSaving(false)
    }
  }

  // ─── Render Steps ───
  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1rem' }}>Select Customer</h2>
            <div style={{ marginBottom: '0.8rem' }}>
              <input type="text" placeholder="Search customers..." value={customerSearch} onChange={(e) => setCustomerSearch(e.target.value)} style={{ ...inputStyle, display: 'flex', alignItems: 'center', gap: '0.5rem' }} />
            </div>
            {showNewCustomer ? (
              <div style={{ background: 'var(--cresoa-surface-soft)', padding: '1rem', borderRadius: '8px', marginBottom: '0.8rem' }}>
                <label style={labelStyle}>New Customer Name *</label>
                <input type="text" value={newCustomerName} onChange={(e) => setNewCustomerName(e.target.value)} placeholder="e.g. Iya Bisi" style={{ ...inputStyle, marginBottom: '0.5rem' }} />
                <label style={labelStyle}>Phone (optional)</label>
                <input type="text" value={newCustomerPhone} onChange={(e) => setNewCustomerPhone(e.target.value)} placeholder="0803..." style={{ ...inputStyle, marginBottom: '0.8rem' }} />
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button onClick={handleCreateCustomer} style={{ ...PRIMARY_BTN, flex: 1 }}>Save Customer</button>
                  <button onClick={() => setShowNewCustomer(false)} style={SECONDARY_BTN}>Cancel</button>
                </div>
              </div>
            ) : (
              <button onClick={() => setShowNewCustomer(true)} style={{ ...PRIMARY_BTN, width: '100%', marginBottom: '0.8rem', background: 'var(--cresoa-primary)' }}>
                <Svg name="plus" size={16} stroke="#fff" /> Add New Customer
              </button>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '300px', overflowY: 'auto' }}>
              {customers.filter(c => (c.name || `${c.first_name || ''} ${c.last_name || ''}`).toLowerCase().includes(customerSearch.toLowerCase())).map(customer => {
                const displayName = customer.name || `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'Unnamed'
                const isSelected = selectedCustomer?.id === customer.id
                return (
                  <button key={customer.id} onClick={() => handleSelectCustomer(customer)} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.8rem', border: `1px solid ${isSelected ? 'var(--cresoa-accent)' : 'var(--cresoa-border)'}`, borderRadius: '8px', background: isSelected ? 'var(--cresoa-accent-soft)' : 'var(--cresoa-surface)', cursor: 'pointer', textAlign: 'left' }}>
                    <span style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--cresoa-accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, flexShrink: 0 }}>{(displayName).charAt(0)}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <strong style={{ display: 'block', color: 'var(--cresoa-text)', fontSize: '0.9rem' }}>{displayName}</strong>
                      {customer.phone && <span style={{ fontSize: '0.8rem', color: 'var(--cresoa-text-muted)' }}>{customer.phone}</span>}
                    </div>
                    {isSelected && <span style={{ color: 'var(--cresoa-accent)', fontSize: '1.2rem' }}>✓</span>}
                  </button>
                )
              })}
            </div>
          </div>
        )
      case 2:
        return (
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1rem' }}>Job Details</h2>
            <div style={{ marginBottom: '0.8rem' }}>
              <label style={labelStyle}>Job Title *</label>
              <input type="text" value={form.title} onChange={(e) => updateField('title', e.target.value)} placeholder="e.g. Church Anniversary Banner" style={inputStyle} />
            </div>
            <div style={{ marginBottom: '0.8rem' }}>
              <label style={labelStyle}>Job Type *</label>
              <select value={form.jobType} onChange={(e) => updateField('jobType', e.target.value)} style={inputStyle}>
                <option value="">Select type</option>
                {JOB_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: '0.8rem' }}>
              <label style={labelStyle}>Quantity *</label>
              <input type="number" value={form.quantity} onChange={(e) => updateField('quantity', e.target.value)} placeholder="e.g. 500" min="1" style={inputStyle} />
            </div>
            <div style={{ marginBottom: '0.8rem' }}>
              <label style={labelStyle}>Specifications / Requirements</label>
              <textarea value={form.specifications} onChange={(e) => updateField('specifications', e.target.value)} rows={3} placeholder="e.g. A5, Full colour, 150gsm, Matte finish" style={{ ...inputStyle, resize: 'vertical' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
              <div>
                <label style={labelStyle}>Size</label>
                <input type="text" value={form.size} onChange={(e) => updateField('size', e.target.value)} placeholder="e.g. A5" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Material</label>
                <input type="text" value={form.material} onChange={(e) => updateField('material', e.target.value)} placeholder="e.g. 150gsm" style={inputStyle} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem', marginTop: '0.8rem' }}>
              <div>
                <label style={labelStyle}>Colour</label>
                <input type="text" value={form.color} onChange={(e) => updateField('color', e.target.value)} placeholder="e.g. Full colour" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Finishing</label>
                <input type="text" value={form.finishing} onChange={(e) => updateField('finishing', e.target.value)} placeholder="e.g. Matte" style={inputStyle} />
              </div>
            </div>
          </div>
        )
      case 3:
        return (
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1rem' }}>Price & Payment</h2>
            <div style={{ marginBottom: '0.8rem' }}>
              <label style={labelStyle}>Price (₦) *</label>
              <input type="number" value={form.price} onChange={(e) => updateField('price', e.target.value)} placeholder="e.g. 45000" style={inputStyle} />
            </div>
            <div style={{ marginBottom: '0.8rem' }}>
              <label style={labelStyle}>Payment Status</label>
              <select value={form.paymentStatus} onChange={(e) => updateField('paymentStatus', e.target.value)} style={inputStyle}>
                <option value="unpaid">Unpaid</option>
                <option value="deposit">Deposit</option>
                <option value="partial">Partially Paid</option>
                <option value="paid">Paid</option>
              </select>
            </div>
            {form.paymentStatus !== 'unpaid' && (
              <div style={{ marginBottom: '0.8rem' }}>
                <label style={labelStyle}>Amount Paid (₦)</label>
                <input type="number" value={form.amountPaid} onChange={(e) => updateField('amountPaid', e.target.value)} placeholder="e.g. 20000" style={inputStyle} />
              </div>
            )}
            {form.paymentStatus !== 'unpaid' && form.price && (
              <div style={{ background: 'var(--cresoa-surface-soft)', padding: '0.8rem', borderRadius: '8px', marginBottom: '0.8rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                  <span>Balance:</span>
                  <strong style={{ color: balance > 0 ? 'var(--cresoa-danger)' : 'var(--cresoa-success)' }}>₦{Math.max(0, balance).toLocaleString()}</strong>
                </div>
              </div>
            )}
          </div>
        )
      case 4:
        return (
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1rem' }}>Deadline, Delivery & Staff</h2>
            <div style={{ marginBottom: '0.8rem' }}>
              <label style={labelStyle}>Due Date</label>
              <input type="date" value={form.dueDate} onChange={(e) => updateField('dueDate', e.target.value)} style={inputStyle} />
            </div>
            <div style={{ marginBottom: '0.8rem' }}>
              <label style={labelStyle}>Due Time (optional)</label>
              <input type="time" value={form.dueTime} onChange={(e) => updateField('dueTime', e.target.value)} style={inputStyle} />
            </div>
            <div style={{ marginBottom: '0.8rem' }}>
              <label style={labelStyle}>Delivery Method</label>
              <select value={form.deliveryMethod} onChange={(e) => updateField('deliveryMethod', e.target.value)} style={inputStyle}>
                <option value="pickup">Customer Pickup</option>
                <option value="delivery">Business Delivery</option>
              </select>
            </div>
            {form.deliveryMethod === 'delivery' && (
              <div style={{ marginBottom: '0.8rem' }}>
                <label style={labelStyle}>Delivery Address</label>
                <input type="text" value={form.deliveryAddress} onChange={(e) => updateField('deliveryAddress', e.target.value)} placeholder="e.g. 12 Allen Ave, Ikeja" style={inputStyle} />
              </div>
            )}
            <div style={{ marginBottom: '0.8rem' }}>
              <label style={labelStyle}>Assign to Staff (optional)</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {staffList.length === 0 ? (
                  <p style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.85rem' }}>No staff members yet.</p>
                ) : (
                  staffList.map(staff => {
                    const isSelected = form.assignedStaffIds.includes(staff.id)
                    return (
                      <label key={staff.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '0.5rem', background: 'var(--cresoa-surface-soft)', borderRadius: '6px' }}>
                        <input type="checkbox" checked={isSelected} onChange={(e) => {
                          if (e.target.checked) {
                            updateField('assignedStaffIds', [...form.assignedStaffIds, staff.id])
                          } else {
                            updateField('assignedStaffIds', form.assignedStaffIds.filter(id => id !== staff.id))
                          }
                        }} />
                        <span>{staff.name}</span>
                      </label>
                    )
                  })
                )}
              </div>
            </div>
          </div>
        )
      case 5:
        return (
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1rem' }}>Review & Create</h2>
            <div style={{ background: 'var(--cresoa-surface-soft)', padding: '1rem', borderRadius: '8px' }}>
              <ReviewRow label="Customer" value={selectedCustomer ? (selectedCustomer.name || `${selectedCustomer.first_name || ''} ${selectedCustomer.last_name || ''}`.trim() || 'Unnamed') : '—'} />
              <ReviewRow label="Job Title" value={form.title || '—'} />
              <ReviewRow label="Job Type" value={form.jobType || '—'} />
              <ReviewRow label="Quantity" value={form.quantity || '—'} />
              <ReviewRow label="Price" value={form.price ? `₦${Number(form.price).toLocaleString()}` : '—'} />
              <ReviewRow label="Paid" value={form.amountPaid ? `₦${Number(form.amountPaid).toLocaleString()}` : '₦0'} />
              <ReviewRow label="Balance" value={balance > 0 ? `₦${Math.max(0, balance).toLocaleString()}` : '₦0'} />
              <ReviewRow label="Due Date" value={form.dueDate || '—'} />
              <ReviewRow label="Delivery" value={form.deliveryMethod === 'pickup' ? 'Customer Pickup' : `Business Delivery - ${form.deliveryAddress || 'No address'}`} />
              <ReviewRow label="Assigned" value={form.assignedStaffIds.length > 0 ? form.assignedStaffIds.length + ' staff' : 'Unassigned'} />
              {form.notes && <ReviewRow label="Notes" value={form.notes} />}
            </div>
            <p style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.8rem', marginTop: '0.8rem' }}>Job Number will be generated automatically (e.g., PR-001234).</p>
          </div>
        )
      default:
        return null
    }
  }

  if (loading) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--cresoa-bg)' }}><div className="cresoa-loading-spinner" /></div>
  }

  return (
    <div style={{ padding: '1rem', maxWidth: '700px', margin: '0 auto', background: 'var(--cresoa-bg)', minHeight: '100vh', paddingBottom: '100px' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <p style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Printing</p>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0.2rem 0' }}>New Print Job</h1>
      </div>

      {/* Progress Bar */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '0.3rem' }}>
          {STEPS.map((s, i) => (
            <div key={s.id} style={{ flex: 1, height: '6px', borderRadius: '99px', background: i + 1 <= step ? 'var(--cresoa-accent)' : 'var(--cresoa-border)', transition: 'background 0.2s' }} />
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.3rem' }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--cresoa-text-muted)' }}>Step {step} of {STEPS.length}</span>
          <span style={{ fontSize: '0.7rem', color: 'var(--cresoa-text-muted)' }}>{STEPS[step - 1].label}</span>
        </div>
      </div>

      {/* Error */}
      {error && <div style={{ padding: '0.6rem 1rem', borderRadius: '8px', background: 'var(--cresoa-danger-soft)', color: 'var(--cresoa-danger)', marginBottom: '1rem', fontSize: '0.9rem' }}>{error}</div>}

      {/* Steps Content */}
      {renderStep()}

      {/* Navigation Buttons */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem', gap: '0.8rem' }}>
        {step > 1 && <button onClick={handleBack} style={SECONDARY_BTN}><Svg name="back" size={16} stroke="currentColor" style={{ marginRight: '0.3rem' }} /> Back</button>}
        {step < 5 ? (
          <button onClick={handleNext} style={{ ...PRIMARY_BTN, marginLeft: 'auto' }}>Continue <Svg name="arrowRight" size={16} stroke="#fff" style={{ marginLeft: '0.3rem' }} /></button>
        ) : (
          <button onClick={handleCreateJob} disabled={saving} style={{ ...PRIMARY_BTN, marginLeft: 'auto', opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Creating...' : 'Create Job'}
          </button>
        )}
      </div>
    </div>
  )
}

// Helper component for review rows
function ReviewRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px solid var(--cresoa-border)' }}>
      <span style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.85rem' }}>{label}</span>
      <strong style={{ fontSize: '0.9rem', textAlign: 'right' }}>{value}</strong>
    </div>
  )
          }
