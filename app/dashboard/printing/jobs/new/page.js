'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../../../../lib/supabaseClient'

// ─── Self-contained SVG icons ───
const Svg = ({ name, size = 20, stroke = 'currentColor' }) => {
  const icons = {
    arrowLeft: <polyline points="15 18 9 12 15 6" />,
    arrowRight: <polyline points="9 18 15 12 9 6" />,
    plus: <><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></>,
    search: <><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></>,
    check: <polyline points="20 6 9 17 4 12" />,
    user: <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></>,
    file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></>,
    paperclip: <><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" /></>,
    clock: <><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></>,
    truck: <><rect x="1" y="3" width="15" height="13" /><polygon points="16 8 20 8 23 11 23 16 16 16 16 8" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" /></>,
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{icons[name]}</svg>
}

const JOB_TYPES = [
  'Flyers', 'Business Cards', 'Banners', 'Stickers', 'T-shirts',
  'Signage', 'Wedding Programmes', 'Posters', 'Brochures',
  'Invitation Cards', 'Branding', 'Design Services', 'Custom Service'
]

const PAYMENT_TYPES = [
  { value: 'unpaid', label: 'Unpaid' },
  { value: 'deposit', label: 'Deposit' },
  { value: 'partial', label: 'Partially Paid' },
  { value: 'paid', label: 'Paid' },
]

const STEPS = ['Customer', 'Job Details', 'Payment & Delivery', 'Assign & Files', 'Review']

export default function NewPrintingJobPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const businessId = searchParams.get('business_id')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [step, setStep] = useState(1)

  // ─── Data ───
  const [customers, setCustomers] = useState([])
  const [staff, setStaff] = useState([])
  const [customerSearch, setCustomerSearch] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [showAddCustomer, setShowAddCustomer] = useState(false)
  const [newCustomer, setNewCustomer] = useState({ first_name: '', last_name: '', phone: '' })

  // ─── Form Data ───
  const [form, setForm] = useState({
    title: '',
    job_type: '',
    quantity: '',
    specs_text: '',
    size: '',
    material: '',
    colour: '',
    finishing: '',
    price: '',
    payment_type: 'unpaid',
    amount_paid: '',
    due_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    due_time: '',
    delivery_method: 'pickup',
    delivery_address: '',
    staff_id: '',
    notes: '',
    files: [],
  })

  // ─── Fetch data ───
  useEffect(() => {
    const fetchData = async () => {
      if (!businessId) return
      setLoading(true)
      try {
        const { data: custData } = await supabase
          .from('customers')
          .select('*')
          .eq('business_id', businessId)
          .eq('sector', 'printing')
          .order('first_name', { ascending: true })
        setCustomers(custData || [])

        const { data: staffData } = await supabase
          .from('staff')
          .select('*')
          .eq('business_id', businessId)
        setStaff(staffData || [])
      } catch (e) {
        console.error('Error fetching data:', e)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [businessId])

  // ─── Helpers ───
  const updateField = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }))
    setError('')
  }

  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      const name = `${c.first_name || ''} ${c.last_name || ''}`.toLowerCase()
      return name.includes(customerSearch.toLowerCase()) || (c.phone || '').includes(customerSearch)
    })
  }, [customers, customerSearch])

  const balance = useMemo(() => {
    const price = Number(form.price || 0)
    const paid = Number(form.amount_paid || 0)
    return Math.max(0, price - paid)
  }, [form.price, form.amount_paid])

  const validateStep = () => {
    if (step === 1) {
      if (!selectedCustomer) {
        setError('Please select a customer.')
        return false
      }
    }
    if (step === 2) {
      if (!form.title.trim()) {
        setError('Job title is required.')
        return false
      }
      if (!form.job_type) {
        setError('Please select a job type.')
        return false
      }
      if (!form.quantity || Number(form.quantity) < 1) {
        setError('Quantity must be at least 1.')
        return false
      }
    }
    if (step === 3) {
      if (!form.price || Number(form.price) <= 0) {
        setError('Price must be greater than 0.')
        return false
      }
      if (!form.due_date) {
        setError('Due date is required.')
        return false
      }
    }
    setError('')
    return true
  }

  const handleNext = () => {
    if (!validateStep()) return
    setStep(prev => Math.min(prev + 1, STEPS.length))
  }

  const handleBack = () => {
    setError('')
    setStep(prev => Math.max(prev - 1, 1))
  }

  // ─── Add Customer inline ───
  const handleAddCustomer = async () => {
    if (!newCustomer.first_name.trim() || !newCustomer.phone.trim()) {
      setError('First name and phone are required.')
      return
    }
    setError('')
    try {
      const { data: customer, error: insertError } = await supabase
        .from('customers')
        .insert({
          business_id: businessId,
          sector: 'printing',
          first_name: newCustomer.first_name.trim(),
          last_name: newCustomer.last_name.trim() || null,
          phone: newCustomer.phone.trim(),
        })
        .select()
        .single()
      if (insertError) throw insertError
      setCustomers(prev => [...prev, customer])
      setSelectedCustomer(customer)
      setShowAddCustomer(false)
      setNewCustomer({ first_name: '', last_name: '', phone: '' })
    } catch (e) {
      console.error('Add customer error:', e)
      setError(e.message || 'Failed to add customer')
    }
  }

  // ─── File Upload (simple - store filename for now) ───
  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      setForm(prev => ({ ...prev, files: [...prev.files, { name: file.name, size: file.size }] }))
    }
  }

  const removeFile = (index) => {
    setForm(prev => ({ ...prev, files: prev.files.filter((_, i) => i !== index) }))
  }

  // ─── Submit ───
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (step < STEPS.length) {
      handleNext()
      return
    }

    // Final validation
    if (!selectedCustomer || !form.title || !form.job_type || !form.quantity || !form.price) {
      setError('Please complete all required fields.')
      return
    }

    setSaving(true)
    setError('')

    try {
      const jobNumber = `PR-${Date.now().toString().slice(-6)}`
      const { data: job, error: jobError } = await supabase
        .from('print_jobs')
        .insert({
          business_id: businessId,
          customer_id: selectedCustomer.id,
          job_number: jobNumber,
          title: form.title.trim(),
          description: form.specs_text || null,
          quantity: Number(form.quantity),
          specs: {
            size: form.size || null,
            material: form.material || null,
            colour: form.colour || null,
            finishing: form.finishing || null,
          },
          job_type: form.job_type,
          deadline: form.due_date ? new Date(`${form.due_date}T${form.due_time || '23:59'}`).toISOString() : null,
          status: 'quote',
          technician_id: form.staff_id || null,
          deposit: form.payment_type === 'deposit' ? Number(form.amount_paid || 0) : 0,
          amount_paid: Number(form.amount_paid || 0),
          total: Number(form.price),
          notes: form.notes || null,
          delivery_method: form.delivery_method,
          delivery_address: form.delivery_method === 'delivery' ? form.delivery_address : null,
        })
        .select()
        .single()

      if (jobError) throw jobError

      // Insert files if any
      if (form.files.length > 0) {
        for (const file of form.files) {
          await supabase
            .from('job_files')
            .insert({
              job_id: job.id,
              filename: file.name,
              file_url: null,
              version: 1,
            })
        }
      }

      // Redirect to job detail page
      router.push(`/dashboard/printing/jobs/${job.id}?business_id=${businessId}`)
    } catch (err) {
      console.error('Create printing job error:', err)
      setError(err.message || 'Failed to create job')
      setSaving(false)
    }
  }

  // ─── Render Steps ───
  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <div>
            <h3 style={stepTitleStyle}>Select Customer</h3>

            {!showAddCustomer ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', padding: '0.4rem 0.8rem', border: '1px solid var(--cresoa-border)', borderRadius: '8px', background: 'var(--cresoa-bg)' }}>
                  <Svg name="search" size={16} stroke="var(--cresoa-text-muted)" />
                  <input
                    type="text"
                    placeholder="Search customers..."
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', color: 'var(--cresoa-text)', fontSize: '0.9rem' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '200px', overflowY: 'auto' }}>
                  {filteredCustomers.length === 0 ? (
                    <p style={{ color: 'var(--cresoa-text-muted)', textAlign: 'center' }}>No customers found.</p>
                  ) : (
                    filteredCustomers.map(customer => (
                      <button
                        key={customer.id}
                        type="button"
                        onClick={() => setSelectedCustomer(customer)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem',
                          border: `1px solid ${selectedCustomer?.id === customer.id ? 'var(--cresoa-accent)' : 'var(--cresoa-border)'}`,
                          borderRadius: '8px', background: selectedCustomer?.id === customer.id ? 'var(--cresoa-accent-soft)' : 'var(--cresoa-surface)',
                          cursor: 'pointer', textAlign: 'left'
                        }}
                      >
                        <span className="cresoa-avatar">
                          {(customer.first_name?.charAt(0) || '') + (customer.last_name?.charAt(0) || '') || '?'}
                        </span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600 }}>{customer.first_name} {customer.last_name}</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--cresoa-text-muted)' }}>{customer.phone}</div>
                        </div>
                        {selectedCustomer?.id === customer.id && <Svg name="check" size={16} stroke="var(--cresoa-accent)" />}
                      </button>
                    ))
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setShowAddCustomer(true)}
                  style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.3rem', background: 'none', border: 'none', color: 'var(--cresoa-accent)', fontWeight: 600, cursor: 'pointer', padding: '0.5rem 0' }}
                >
                  <Svg name="plus" size={16} stroke="var(--cresoa-accent)" /> Add New Customer
                </button>
              </>
            ) : (
              <div style={{ background: 'var(--cresoa-surface-soft)', padding: '1rem', borderRadius: '8px' }}>
                <h4 style={{ margin: '0 0 0.8rem' }}>New Customer</h4>
                <div style={{ display: 'grid', gap: '0.75rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    <div>
                      <label style={labelStyle}>First Name *</label>
                      <input type="text" value={newCustomer.first_name} onChange={(e) => setNewCustomer({ ...newCustomer, first_name: e.target.value })} style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>Last Name</label>
                      <input type="text" value={newCustomer.last_name} onChange={(e) => setNewCustomer({ ...newCustomer, last_name: e.target.value })} style={inputStyle} />
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle}>Phone *</label>
                    <input type="tel" value={newCustomer.phone} onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })} style={inputStyle} />
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button type="button" onClick={handleAddCustomer} className="cresoa-primary-button" style={{ padding: '0.5rem 1rem' }}>Add Customer</button>
                    <button type="button" onClick={() => setShowAddCustomer(false)} style={{ padding: '0.5rem 1rem', border: '1px solid var(--cresoa-border)', background: 'transparent', borderRadius: '8px', cursor: 'pointer' }}>Cancel</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )

      case 2:
        return (
          <div>
            <h3 style={stepTitleStyle}>Job Details</h3>
            <div style={{ display: 'grid', gap: '1rem' }}>
              <div>
                <label style={labelStyle}>Job Title *</label>
                <input type="text" value={form.title} onChange={(e) => updateField('title', e.target.value)} placeholder="e.g. Church Anniversary Banner" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Job Type *</label>
                <select value={form.job_type} onChange={(e) => updateField('job_type', e.target.value)} style={inputStyle}>
                  <option value="">Select job type</option>
                  {JOB_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Quantity *</label>
                <input type="number" value={form.quantity} onChange={(e) => updateField('quantity', e.target.value)} placeholder="e.g. 500" min="1" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Specifications / Requirements</label>
                <textarea value={form.specs_text} onChange={(e) => updateField('specs_text', e.target.value)} rows={3} placeholder="e.g. A5, Full colour, Double-sided, 150gsm, Matte finish" style={{ ...inputStyle, resize: 'vertical' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '0.5rem' }}>
                <div>
                  <label style={labelStyle}>Size</label>
                  <input type="text" value={form.size} onChange={(e) => updateField('size', e.target.value)} placeholder="e.g. A4" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Material</label>
                  <input type="text" value={form.material} onChange={(e) => updateField('material', e.target.value)} placeholder="e.g. 150gsm" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Colour</label>
                  <input type="text" value={form.colour} onChange={(e) => updateField('colour', e.target.value)} placeholder="e.g. Full colour" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Finishing</label>
                  <input type="text" value={form.finishing} onChange={(e) => updateField('finishing', e.target.value)} placeholder="e.g. Matte" style={inputStyle} />
                </div>
              </div>
            </div>
          </div>
        )

      case 3:
        return (
          <div>
            <h3 style={stepTitleStyle}>Payment & Delivery</h3>
            <div style={{ display: 'grid', gap: '1rem' }}>
              <div>
                <label style={labelStyle}>Total Price (₦) *</label>
                <input type="number" value={form.price} onChange={(e) => updateField('price', e.target.value)} placeholder="e.g. 45000" min="0" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Payment Type</label>
                <select value={form.payment_type} onChange={(e) => updateField('payment_type', e.target.value)} style={inputStyle}>
                  {PAYMENT_TYPES.map(pt => <option key={pt.value} value={pt.value}>{pt.label}</option>)}
                </select>
              </div>
              {(form.payment_type === 'deposit' || form.payment_type === 'partial') && (
                <div>
                  <label style={labelStyle}>Amount Paid (₦)</label>
                  <input type="number" value={form.amount_paid} onChange={(e) => updateField('amount_paid', e.target.value)} placeholder="e.g. 20000" min="0" max={form.price} style={inputStyle} />
                </div>
              )}
              {form.payment_type !== 'unpaid' && (
                <div style={{ padding: '0.6rem', background: 'var(--cresoa-accent-soft)', borderRadius: '8px', textAlign: 'center', fontWeight: 700 }}>
                  Balance: ₦{balance.toLocaleString()}
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div>
                  <label style={labelStyle}>Due Date *</label>
                  <input type="date" value={form.due_date} onChange={(e) => updateField('due_date', e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Due Time (optional)</label>
                  <input type="time" value={form.due_time} onChange={(e) => updateField('due_time', e.target.value)} style={inputStyle} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Delivery Method</label>
                <select value={form.delivery_method} onChange={(e) => updateField('delivery_method', e.target.value)} style={inputStyle}>
                  <option value="pickup">Customer Pickup</option>
                  <option value="delivery">Business Delivery</option>
                </select>
              </div>
              {form.delivery_method === 'delivery' && (
                <div>
                  <label style={labelStyle}>Delivery Address</label>
                  <input type="text" value={form.delivery_address} onChange={(e) => updateField('delivery_address', e.target.value)} placeholder="e.g. 12 Main Road, Ikeja" style={inputStyle} />
                </div>
              )}
            </div>
          </div>
        )

      case 4:
        return (
          <div>
            <h3 style={stepTitleStyle}>Assign & Files</h3>
            <div style={{ display: 'grid', gap: '1rem' }}>
              <div>
                <label style={labelStyle}>Assign to Staff (optional)</label>
                <select value={form.staff_id} onChange={(e) => updateField('staff_id', e.target.value)} style={inputStyle}>
                  <option value="">Unassigned</option>
                  {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Upload Files (artwork, reference, documents)</label>
                <input type="file" onChange={handleFileChange} multiple style={{ width: '100%', padding: '0.6rem', border: '1px solid var(--cresoa-border)', borderRadius: '8px', background: 'var(--cresoa-bg)', color: 'var(--cresoa-text)' }} />
                {form.files.length > 0 && (
                  <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    {form.files.map((file, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.3rem 0.6rem', background: 'var(--cresoa-surface-soft)', borderRadius: '6px', fontSize: '0.85rem' }}>
                        <Svg name="file" size={14} stroke="var(--cresoa-text-muted)" />
                        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</span>
                        <button type="button" onClick={() => removeFile(i)} style={{ background: 'none', border: 'none', color: 'var(--cresoa-danger)', cursor: 'pointer' }}>✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label style={labelStyle}>Notes</label>
                <textarea value={form.notes} onChange={(e) => updateField('notes', e.target.value)} rows={3} placeholder="e.g. Customer wants gold text and matte finish" style={{ ...inputStyle, resize: 'vertical' }} />
              </div>
            </div>
          </div>
        )

      case 5:
        return (
          <div>
            <h3 style={stepTitleStyle}>Review & Create</h3>
            <div style={{ background: 'var(--cresoa-surface-soft)', padding: '1rem', borderRadius: '8px', display: 'grid', gap: '0.5rem', fontSize: '0.9rem' }}>
              <ReviewRow label="Customer" value={selectedCustomer ? `${selectedCustomer.first_name} ${selectedCustomer.last_name}` : '—'} />
              <ReviewRow label="Job Title" value={form.title || '—'} />
              <ReviewRow label="Job Type" value={form.job_type || '—'} />
              <ReviewRow label="Quantity" value={form.quantity || '—'} />
              <ReviewRow label="Price" value={`₦${Number(form.price || 0).toLocaleString()}`} />
              <ReviewRow label="Paid" value={`₦${Number(form.amount_paid || 0).toLocaleString()}`} />
              <ReviewRow label="Balance" value={`₦${balance.toLocaleString()}`} />
              <ReviewRow label="Due Date" value={form.due_date ? new Date(form.due_date).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'} />
              <ReviewRow label="Delivery" value={form.delivery_method === 'delivery' ? `Business Delivery (${form.delivery_address})` : 'Customer Pickup'} />
              <ReviewRow label="Assigned Staff" value={staff.find(s => s.id === form.staff_id)?.name || 'Unassigned'} />
              {form.files.length > 0 && <ReviewRow label="Files" value={`${form.files.length} file(s)`} />}
              {form.notes && <ReviewRow label="Notes" value={form.notes} />}
            </div>
            <p style={{ color: 'var(--cresoa-text-muted)', marginTop: '0.8rem', fontSize: '0.85rem' }}>Job Number will be generated automatically (e.g., PR-001234).</p>
          </div>
        )

      default:
        return null
    }
  }

  if (loading) {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--cresoa-bg)' }}><div className="cresoa-loading-spinner" /></div>
  }

  return (
    <div style={{ padding: '1rem', maxWidth: '600px', margin: '0 auto', background: 'var(--cresoa-bg)', minHeight: '100vh', paddingBottom: '80px' }}>
      {/* Header */}
      <div style={{ marginBottom: '1rem' }}>
        <p style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', margin: 0 }}>Printing</p>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0.2rem 0', color: 'var(--cresoa-text)' }}>New Print Job</h1>
      </div>

      {/* Progress Bar */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
          {STEPS.map((label, i) => (
            <span key={label} style={{ fontSize: '0.65rem', fontWeight: i + 1 <= step ? '600' : '400', color: i + 1 <= step ? 'var(--cresoa-accent)' : 'var(--cresoa-text-muted)' }}>
              {label}
            </span>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '0.3rem' }}>
          {STEPS.map((_, i) => (
            <div key={i} style={{ flex: 1, height: '6px', borderRadius: '99px', background: i + 1 <= step ? 'var(--cresoa-accent)' : 'var(--cresoa-border)' }} />
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{ padding: '0.6rem 1rem', borderRadius: '8px', background: 'var(--cresoa-danger-soft)', color: 'var(--cresoa-danger)', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ background: 'var(--cresoa-surface)', borderRadius: '12px', padding: '1.5rem', border: '1px solid var(--cresoa-border)' }}>
          {renderStepContent()}
        </div>

        {/* Navigation Buttons */}
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
          {step > 1 && (
            <button type="button" onClick={handleBack} className="cresoa-secondary-button" style={{ padding: '0.6rem 1.2rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'transparent', color: 'var(--cresoa-text)', fontWeight: 600, cursor: 'pointer' }}>
              <Svg name="arrowLeft" size={14} stroke="currentColor" /> Back
            </button>
          )}
          {step < STEPS.length ? (
            <button type="button" onClick={handleNext} className="cresoa-primary-button" style={{ padding: '0.6rem 1.2rem', flex: 1, justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              Continue <Svg name="arrowRight" size={14} stroke="#fff" />
            </button>
          ) : (
            <button type="submit" disabled={saving} className="cresoa-primary-button" style={{ padding: '0.6rem 1.2rem', flex: 1, justifyContent: 'center', opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Creating...' : 'Create Job'}
            </button>
          )}
        </div>
      </form>
    </div>
  )
}

// ─── Helper components & styles ───
function ReviewRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px solid var(--cresoa-border)' }}>
      <span style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.85rem' }}>{label}</span>
      <span style={{ fontWeight: '600', fontSize: '0.9rem', textAlign: 'right' }}>{value}</span>
    </div>
  )
}

const inputStyle = {
  width: '100%',
  padding: '0.6rem 0.8rem',
  borderRadius: '8px',
  border: '1px solid var(--cresoa-border)',
  background: 'var(--cresoa-bg)',
  color: 'var(--cresoa-text)',
  fontSize: '0.95rem',
  boxSizing: 'border-box',
}

const labelStyle = {
  display: 'block',
  fontSize: '0.85rem',
  fontWeight: '600',
  marginBottom: '0.3rem',
  color: 'var(--cresoa-text)',
}

const stepTitleStyle = {
  fontSize: '1.1rem',
  fontWeight: '700',
  marginBottom: '1rem',
  color: 'var(--cresoa-primary)',
                }
