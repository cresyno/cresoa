'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../../../../lib/supabaseClient'
import { getCurrentBusinessId } from '../../../../../lib/getBusinessId'
import { Icon } from '../../../../../components/Icon'
import { Card } from '../../../../../components/Card'
import { Navigation } from '../../../../../components/Navigation'
import '../../../../globals.css'

// ─── STEP DEFINITIONS (Specifically for Repairs) ──────────────────
const STEPS = [
  { id: 1, label: 'Customer' },
  { id: 2, label: 'Device' },
  { id: 3, label: 'Diagnosis' },
  { id: 4, label: 'Dates & Payment' },
  { id: 5, label: 'Review' },
]

const INITIAL_FORM = {
  customer_id: '',
  customer_name: '',
  customer_phone: '',
  customer_email: '',
  title: '',
  category: '',
  serial_number: '',
  description: '',
  notes: '',
  price: '',
  amount_paid: '',
  current_status: 'In Progress',
  due_date: '',
  fitting_date: '',
  delivery_date: '',
}

export default function NewRepairJobPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const businessId = getCurrentBusinessId() || searchParams.get('business_id')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savingDraft, setSavingDraft] = useState(false)
  const [error, setError] = useState(null)
  const [customers, setCustomers] = useState([])

  // ─── Wizard state ──────────────────────────────────────────
  const [step, setStep] = useState(1)
  const [customerSearch, setCustomerSearch] = useState('')
  const [showCustomerList, setShowCustomerList] = useState(false)
  const [isNewCustomer, setIsNewCustomer] = useState(false)
  const [formData, setFormData] = useState(INITIAL_FORM)
  const [showNewCustomerModal, setShowNewCustomerModal] = useState(false)

  // ─── Navigation helper ────────────────────────────────────
  const navigateWithBusiness = (path) => {
    const separator = path.includes('?') ? '&' : '?'
    router.push(`${path}${separator}business_id=${businessId}`)
  }

  // ─── Computed ─────────────────────────────────────────────
  const selectedCustomer = useMemo(() => {
    return customers.find(c => c.id === formData.customer_id) || null
  }, [customers, formData.customer_id])

  const filteredCustomers = useMemo(() => {
    const query = customerSearch.trim().toLowerCase()
    if (!query) return customers.slice(0, 6)
    return customers
      .filter(c => (c.name || '').toLowerCase().includes(query) ||
                    (c.phone || '').includes(query) ||
                    (c.email || '').toLowerCase().includes(query))
      .slice(0, 6)
  }, [customers, customerSearch])

  const remainingBalance = useMemo(() => {
    return Math.max((Number(formData.price) || 0) - (Number(formData.amount_paid) || 0), 0)
  }, [formData.price, formData.amount_paid])

  // ─── Data loading ──────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      if (!businessId) {
        router.push('/dashboard')
        return
      }
      try {
        const { data: customerData, error: custError } = await supabase
          .from('customers')
          .select('id, first_name, last_name, name, phone, email, sector')
          .eq('business_id', businessId)
          .eq('sector', 'repairs')
          .order('created_at', { ascending: false })
        if (custError) throw custError
        setCustomers((customerData || []).map(c => ({
          ...c,
          name: c.name || [c.first_name, c.last_name].filter(Boolean).join(' ')
        })))
      } catch (err) {
        console.error(err)
        setError('Unable to load data.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [businessId])

  // ─── Handlers ──────────────────────────────────────────────
  const updateField = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }))
    setError(null)
  }

  const handleCustomerSelect = (customer) => {
    setIsNewCustomer(false)
    setFormData(prev => ({
      ...prev,
      customer_id: customer.id,
      customer_name: customer.name || '',
      customer_phone: customer.phone || '',
      customer_email: customer.email || '',
    }))
    setCustomerSearch('')
    setShowCustomerList(false)
  }

  const handleClearCustomer = () => {
    setFormData(prev => ({
      ...prev,
      customer_id: '',
      customer_name: '',
      customer_phone: '',
      customer_email: '',
    }))
    setIsNewCustomer(false)
    setCustomerSearch('')
  }

  const handleCreateCustomer = () => {
    setShowNewCustomerModal(true)
    setIsNewCustomer(true)
  }

  const saveNewCustomer = async () => {
    const name = formData.customer_name.trim()
    if (!name) {
      setError('Customer name is required.')
      return
    }
    try {
      const names = name.split(/\s+/)
      const firstName = names.shift() || ''
      const lastName = names.join(' ') || firstName

      const { data: newCustomer, error } = await supabase
        .from('customers')
        .insert({
          business_id: businessId,
          sector: 'repairs',
          first_name: firstName,
          last_name: lastName,
          name: name,
          phone: formData.customer_phone.trim() || null,
          email: formData.customer_email.trim() || null,
        })
        .select('*')
        .single()
      if (error) throw error
      setCustomers(prev => [newCustomer, ...prev])
      handleCustomerSelect(newCustomer)
      setShowNewCustomerModal(false)
      setIsNewCustomer(false)
    } catch (err) {
      console.error(err)
      alert('Failed to create customer: ' + err.message)
    }
  }

  // ─── CRITICAL VALIDATION (Customer is MANDATORY) ───
  const validateStep = () => {
    if (step === 1) {
      if (!formData.customer_id && !formData.customer_name.trim()) {
        setError('Select a customer or create a new one.')
        return false
      }
    }
    if (step === 2) {
      if (!formData.title.trim()) {
        setError('Give this job a device name.')
        return false
      }
      if (!formData.category) {
        setError('Choose the device type.')
        return false
      }
    }
    if (step === 4) {
      const price = Number(formData.price)
      const paid = Number(formData.amount_paid) || 0
      if (!Number.isFinite(price) || price <= 0) {
        setError('Enter the total repair price.')
        return false
      }
      if (paid > price) {
        setError('Deposit cannot exceed the total price.')
        return false
      }
    }
    return true
  }

  const handleNext = () => {
    if (!validateStep()) return
    setStep(prev => Math.min(prev + 1, STEPS.length))
  }

  const handleBack = () => {
    setStep(prev => Math.max(prev - 1, 1))
    setError(null)
  }

  // ─── Submit / Draft ────────────────────────────────────────
  const handleSubmit = async (e, isDraft = false) => {
    e.preventDefault()
    if (!validateStep()) return

    if (isDraft) setSavingDraft(true)
    else setSaving(true)
    setError(null)

    try {
      let customerId = formData.customer_id
      if (!customerId) {
        const names = formData.customer_name.trim().split(/\s+/)
        const firstName = names.shift() || ''
        const lastName = names.join(' ') || firstName
        const { data: newCustomer, error: custError } = await supabase
          .from('customers')
          .insert({
            business_id: businessId,
            sector: 'repairs',
            first_name: firstName,
            last_name: lastName,
            name: formData.customer_name.trim(),
            phone: formData.customer_phone.trim() || null,
            email: formData.customer_email.trim() || null,
          })
          .select('id')
          .single()
        if (custError) throw custError
        customerId = newCustomer.id
      }

      const orderPayload = {
        business_id: businessId,
        sector: 'repairs',
        customer_id: customerId,
        title: formData.title.trim(),
        category: formData.category || null,
        description: formData.serial_number ? `Serial: ${formData.serial_number}\nFault: ${formData.description}` : formData.description,
        notes: formData.notes.trim() || null,
        price: Number(formData.price) || 0,
        amount_paid: Number(formData.amount_paid) || 0,
        current_status: isDraft ? 'draft' : 'In Progress',
        due_date: formData.delivery_date || null,
        fitting_date: formData.fitting_date || null,
        delivery_date: formData.delivery_date || null,
      }

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert(orderPayload)
        .select('id')
        .single()

      if (orderError) throw orderError

      // Log activity
      const { data: { user } } = await supabase.auth.getUser()
      await supabase.from('business_activity_logs').insert({
        business_id: businessId,
        performed_by: user.id,
        action: isDraft ? 'repair_job_draft_created' : 'repair_job_created',
        details: { title: formData.title }
      })

      if (isDraft) navigateWithBusiness('/dashboard/repairs/jobs')
      else navigateWithBusiness(`/dashboard/repairs/jobs/${order.id}`)

    } catch (err) {
      console.error(err)
      setError(err.message || 'Unable to create job.')
    } finally {
      setSaving(false)
      setSavingDraft(false)
    }
  }

  // ─── Loading skeleton ────────────────────────────────────
  if (loading) {
    return (
      <div style={{ padding: '1.5rem', maxWidth: '800px', margin: '0 auto', paddingBottom: '80px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div style={{ width: '140px', height: '24px', background: 'var(--cresoa-border)', borderRadius: '6px' }} />
          <div style={{ width: '80px', height: '24px', background: 'var(--cresoa-border)', borderRadius: '6px' }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
          {[1,2,3,4].map(i => (
            <div key={i} style={{ background: 'var(--cresoa-surface)', padding: '0.8rem 1rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', animation: 'pulse 1.5s infinite' }}>
              <div style={{ width: '60%', height: '16px', background: 'var(--cresoa-border)', borderRadius: '6px' }} />
              <div style={{ width: '40%', height: '12px', background: 'var(--cresoa-border)', borderRadius: '6px', marginTop: '0.3rem' }} />
            </div>
          ))}
        </div>
        <style>{`@keyframes pulse { 0% { opacity: 0.6; } 50% { opacity: 1; } 100% { opacity: 0.6; } }`}</style>
        <Navigation businessId={businessId} />
      </div>
    )
  }

  if (error && !loading) {
    return (
      <div style={{ padding: '1.5rem', maxWidth: '800px', margin: '0 auto', paddingBottom: '80px' }}>
        <Card style={{ padding: '2rem', textAlign: 'center' }}>
          <Icon name="alert-circle" size={32} stroke="var(--cresoa-danger)" />
          <h2 style={{ margin: '0.5rem 0' }}>Couldn't load data</h2>
          <p style={{ color: 'var(--cresoa-text-muted)' }}>{error}</p>
          <button onClick={() => window.location.reload()} className="cresoa-primary-button" style={{ marginTop: '1rem' }}>Retry</button>
        </Card>
        <Navigation businessId={businessId} />
      </div>
    )
  }

  return (
    <div style={{ padding: '1.5rem', maxWidth: '800px', margin: '0 auto', paddingBottom: '80px' }}>
      <Navigation businessId={businessId} />

      {/* ─── Header ──────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <div>
          <p style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', margin: 0 }}>Repairs</p>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0.2rem 0', color: 'var(--cresoa-text)' }}>New Repair Job</h1>
          <p style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.85rem', margin: 0 }}>Log a new device for repair</p>
        </div>
        <span style={{ padding: '0.2rem 0.8rem', borderRadius: '20px', background: 'var(--cresoa-warning-soft)', color: 'var(--cresoa-warning)', fontSize: '0.7rem', fontWeight: 600 }}>Draft</span>
      </div>

      {/* ─── Progress ────────────────────────────────────────── */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.3rem' }}>
          {STEPS.map((s, idx) => (
            <button
              key={s.id}
              onClick={() => { if (idx + 1 < step) setStep(idx + 1) }}
              style={{
                flex: 1,
                height: '6px',
                borderRadius: '99px',
                border: 'none',
                background: idx + 1 <= step ? 'var(--cresoa-accent)' : 'var(--cresoa-border)',
                cursor: idx + 1 < step ? 'pointer' : 'default',
                transition: 'background 0.2s'
              }}
              aria-label={`Step ${s.id}: ${s.label}`}
            />
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.3rem' }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--cresoa-text-muted)' }}>Step {step} of {STEPS.length}</span>
          <span style={{ fontSize: '0.7rem', color: 'var(--cresoa-text-muted)' }}>{STEPS[step - 1].label}</span>
        </div>
      </div>

      {/* ─── Step Content ────────────────────────────────────── */}
      <form onSubmit={(e) => e.preventDefault()}>
        <Card style={{ padding: '1.5rem', marginBottom: '1rem' }}>

          {/* Step 1: Customer (MANDATORY) */}
          {step === 1 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '1rem' }}>
                <Icon name="user" size={20} stroke="var(--cresoa-accent)" />
                <div>
                  <h3 style={{ margin: 0, fontSize: '1rem' }}>Who is bringing this device?</h3>
                  <p style={{ margin: '0.2rem 0 0', color: 'var(--cresoa-text-muted)', fontSize: '0.85rem' }}>Select an existing customer or create a new one. *Required</p>
                </div>
              </div>

              <div style={{ position: 'relative', marginBottom: '0.8rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0.4rem 0.8rem', border: '1px solid var(--cresoa-border)', borderRadius: '8px', background: 'var(--cresoa-bg)' }}>
                  <Icon name="search" size={16} stroke="var(--cresoa-text-muted)" />
                  <input
                    type="text"
                    value={customerSearch}
                    onChange={(e) => { setCustomerSearch(e.target.value); setShowCustomerList(true) }}
                    onFocus={() => setShowCustomerList(true)}
                    placeholder="Search by name, phone or email..."
                    style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', color: 'var(--cresoa-text)', fontSize: '0.9rem' }}
                  />
                </div>
                {showCustomerList && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--cresoa-surface)', border: '1px solid var(--cresoa-border)', borderRadius: '8px', boxShadow: 'var(--shadow-lg)', zIndex: 10, maxHeight: '200px', overflowY: 'auto' }}>
                    {filteredCustomers.length > 0 ? (
                      filteredCustomers.map(c => (
                        <button key={c.id} onClick={() => handleCustomerSelect(c)} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '0.6rem 0.8rem', width: '100%', border: 'none', borderBottom: '1px solid var(--cresoa-border)', background: 'transparent', cursor: 'pointer', textAlign: 'left' }}>
                          <span className="cresoa-avatar" style={{ width: '32px', height: '32px', fontSize: '12px' }}>{c.name?.charAt(0) || '?'}</span>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{c.name}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--cresoa-text-muted)' }}>{c.phone || c.email || 'No contact'}</div>
                          </div>
                          <Icon name="chevron-right" size={16} stroke="var(--cresoa-text-muted)" />
                        </button>
                      ))
                    ) : (
                      <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--cresoa-text-muted)' }}>
                        No customer found. <button onClick={handleCreateCustomer} style={{ background: 'none', border: 'none', color: 'var(--cresoa-accent)', cursor: 'pointer', fontWeight: 600 }}>Create new customer</button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {selectedCustomer ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.8rem', border: '1px solid var(--cresoa-border)', borderRadius: '8px', background: 'var(--cresoa-surface-soft)' }}>
                  <span className="cresoa-avatar" style={{ width: '40px', height: '40px', fontSize: '16px' }}>{selectedCustomer.name?.charAt(0) || 'C'}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600 }}>{selectedCustomer.name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--cresoa-text-muted)' }}>{selectedCustomer.phone || selectedCustomer.email || 'No contact'}</div>
                  </div>
                  <button onClick={handleClearCustomer} style={{ padding: '0.2rem 0.8rem', borderRadius: '4px', border: '1px solid var(--cresoa-border)', background: 'transparent', cursor: 'pointer', fontSize: '0.7rem' }}>Change</button>
                </div>
              ) : (
                <button onClick={handleCreateCustomer} style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', padding: '0.8rem', width: '100%', border: '1px dashed var(--cresoa-border)', borderRadius: '8px', background: 'transparent', cursor: 'pointer' }}>
                  <Icon name="plus" size={18} stroke="var(--cresoa-accent)" />
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Create new customer</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--cresoa-text-muted)' }}>Save their details for future repairs</div>
                  </div>
                </button>
              )}

                       {isNewCustomer && (
                <div style={{ marginTop: '0.8rem', paddingTop: '0.8rem', borderTop: '1px solid var(--cresoa-border)' }}>
                  <div style={{ display: 'grid', gap: '0.8rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.2rem' }}>Full name *</label>
                      <input type="text" value={formData.customer_name} onChange={(e) => updateField('customer_name', e.target.value)} style={{ width: '100%', padding: '0.5rem 0.8rem', borderRadius: '6px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-bg)', color: 'var(--cresoa-text)' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.2rem' }}>Phone</label>
                      <input type="tel" value={formData.customer_phone} onChange={(e) => updateField('customer_phone', e.target.value)} style={{ width: '100%', padding: '0.5rem 0.8rem', borderRadius: '6px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-bg)', color: 'var(--cresoa-text)' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.2rem' }}>Email</label>
                      <input type="email" value={formData.customer_email} onChange={(e) => updateField('customer_email', e.target.value)} style={{ width: '100%', padding: '0.5rem 0.8rem', borderRadius: '6px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-bg)', color: 'var(--cresoa-text)' }} />
                    </div>
                    <button type="button" onClick={saveNewCustomer} className="cresoa-primary-button" style={{ alignSelf: 'flex-start' }}>Save Customer</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Device */}
          {step === 2 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '1rem' }}>
                <Icon name="tool" size={20} stroke="var(--cresoa-accent)" />
                <div>
                  <h3 style={{ margin: 0, fontSize: '1rem' }}>What device is being repaired?</h3>
                  <p style={{ margin: '0.2rem 0 0', color: 'var(--cresoa-text-muted)', fontSize: '0.85rem' }}>Identify the device and the fault.</p>
                </div>
              </div>

              <div style={{ display: 'grid', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.2rem' }}>Device type *</label>
                  <select value={formData.category} onChange={(e) => updateField('category', e.target.value)} style={{ width: '100%', padding: '0.5rem 0.8rem', borderRadius: '6px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-bg)', color: 'var(--cresoa-text)' }}>
                    <option value="">Select device type</option>
                    <option value="Phone">Phone</option>
                    <option value="Laptop">Laptop</option>
                    <option value="Tablet">Tablet</option>
                    <option value="Desktop">Desktop</option>
                    <option value="Console">Console</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.2rem' }}>Device / Job name *</label>
                  <input type="text" value={formData.title} onChange={(e) => updateField('title', e.target.value)} placeholder="e.g. iPhone 13 screen replacement" style={{ width: '100%', padding: '0.5rem 0.8rem', borderRadius: '6px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-bg)', color: 'var(--cresoa-text)' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.2rem' }}>Serial / IMEI</label>
                  <input type="text" value={formData.serial_number} onChange={(e) => updateField('serial_number', e.target.value)} placeholder="Optional" style={{ width: '100%', padding: '0.5rem 0.8rem', borderRadius: '6px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-bg)', color: 'var(--cresoa-text)' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.2rem' }}>Reported fault</label>
                  <textarea value={formData.description} onChange={(e) => updateField('description', e.target.value)} rows={3} placeholder="e.g. Broken screen, battery not charging..." style={{ width: '100%', padding: '0.5rem 0.8rem', borderRadius: '6px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-bg)', color: 'var(--cresoa-text)' }} />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Diagnosis (Notes) */}
          {step === 3 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '1rem' }}>
                <Icon name="search" size={20} stroke="var(--cresoa-accent)" />
                <div>
                  <h3 style={{ margin: 0, fontSize: '1rem' }}>Diagnosis & Internal Notes</h3>
                  <p style={{ margin: '0.2rem 0 0', color: 'var(--cresoa-text-muted)', fontSize: '0.85rem' }}>Add your technical findings for your team.</p>
                </div>
              </div>
              <div style={{ display: 'grid', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.2rem' }}>Internal notes</label>
                  <textarea value={formData.notes} onChange={(e) => updateField('notes', e.target.value)} rows={5} placeholder="Parts needed, estimated time, technical details..." style={{ width: '100%', padding: '0.5rem 0.8rem', borderRadius: '6px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-bg)', color: 'var(--cresoa-text)' }} />
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Dates & Payment */}
          {step === 4 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '1rem' }}>
                <Icon name="calendar" size={20} stroke="var(--cresoa-accent)" />
                <div>
                  <h3 style={{ margin: 0, fontSize: '1rem' }}>Dates & Payment</h3>
                  <p style={{ margin: '0.2rem 0 0', color: 'var(--cresoa-text-muted)', fontSize: '0.85rem' }}>Set the important dates and agree the payment details.</p>
                </div>
              </div>

              <div style={{ display: 'grid', gap: '1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.2rem' }}>Diagnosis date</label>
                    <input type="date" value={formData.fitting_date} onChange={(e) => updateField('fitting_date', e.target.value)} style={{ width: '100%', padding: '0.5rem 0.8rem', borderRadius: '6px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-bg)', color: 'var(--cresoa-text)' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.2rem' }}>Delivery date</label>
                    <input type="date" value={formData.delivery_date} onChange={(e) => updateField('delivery_date', e.target.value)} style={{ width: '100%', padding: '0.5rem 0.8rem', borderRadius: '6px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-bg)', color: 'var(--cresoa-text)' }} />
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.2rem' }}>Total price *</label>
                  <input type="number" min="0" step="100" value={formData.price} onChange={(e) => updateField('price', e.target.value)} placeholder="e.g. 50000" style={{ width: '100%', padding: '0.5rem 0.8rem', borderRadius: '6px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-bg)', color: 'var(--cresoa-text)' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.2rem' }}>Deposit paid</label>
                  <input type="number" min="0" step="100" value={formData.amount_paid} onChange={(e) => updateField('amount_paid', e.target.value)} placeholder="e.g. 20000" style={{ width: '100%', padding: '0.5rem 0.8rem', borderRadius: '6px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-bg)', color: 'var(--cresoa-text)' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0.8rem', background: 'var(--cresoa-bg)', borderRadius: '6px' }}>
                  <span style={{ fontWeight: 600 }}>Balance remaining</span>
                  <strong style={{ color: remainingBalance > 0 ? 'var(--cresoa-danger)' : 'var(--cresoa-success)' }}>{new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(remainingBalance)}</strong>
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Review */}
          {step === 5 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '1rem' }}>
                <Icon name="check-circle" size={20} stroke="var(--cresoa-success)" />
                <div>
                  <h3 style={{ margin: 0, fontSize: '1rem' }}>Review & Submit</h3>
                  <p style={{ margin: '0.2rem 0 0', color: 'var(--cresoa-text-muted)', fontSize: '0.85rem' }}>Check everything before creating the job.</p>
                </div>
              </div>

              <div style={{ display: 'grid', gap: '0.8rem' }}>
                <Card style={{ padding: '0.8rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '0.5rem' }}>
                    <span className="cresoa-avatar" style={{ width: '36px', height: '36px' }}>{formData.customer_name?.charAt(0) || selectedCustomer?.name?.charAt(0) || '?'}</span>
                    <div>
                      <div style={{ fontWeight: 600 }}>{formData.customer_name || selectedCustomer?.name || 'Customer'}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--cresoa-text-muted)' }}>{formData.customer_phone || selectedCustomer?.phone || 'No phone'}</div>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.3rem', fontSize: '0.85rem' }}>
                    <div><span style={{ color: 'var(--cresoa-text-muted)' }}>Device:</span> <strong>{formData.title || '—'}</strong></div>
                    <div><span style={{ color: 'var(--cresoa-text-muted)' }}>Type:</span> <strong>{formData.category || '—'}</strong></div>
                    <div><span style={{ color: 'var(--cresoa-text-muted)' }}>Serial:</span> <strong>{formData.serial_number || '—'}</strong></div>
                    <div><span style={{ color: 'var(--cresoa-text-muted)' }}>Delivery:</span> <strong>{formData.delivery_date || 'Not set'}</strong></div>
                    <div><span style={{ color: 'var(--cresoa-text-muted)' }}>Total:</span> <strong>{new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(formData.price || 0)}</strong></div>
                    <div><span style={{ color: 'var(--cresoa-text-muted)' }}>Deposit:</span> <strong>{new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(formData.amount_paid || 0)}</strong></div>
                  </div>
                </Card>
              </div>
            </div>
          )}

        </Card>

        {/* ─── Error message ────────────────────────────────── */}
        {error && (
          <div style={{ padding: '0.6rem 1rem', borderRadius: '8px', background: 'var(--cresoa-danger-soft)', color: 'var(--cresoa-danger)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Icon name="alert-circle" size={16} stroke="var(--cresoa-danger)" /> {error}
          </div>
        )}

        {/* ─── Navigation buttons ───────────────────────────── */}
        <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap', justifyContent: 'space-between' }}>
          {step > 1 ? (
            <button type="button" onClick={handleBack} style={{ padding: '0.5rem 1.5rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'transparent', color: 'var(--cresoa-text)', cursor: 'pointer', fontWeight: 500 }}>
              <Icon name="arrow-left" size={14} stroke="currentColor" style={{ marginRight: '0.3rem' }} /> Back
            </button>
          ) : (
            <div />
          )}

          {step < STEPS.length ? (
            <button type="button" onClick={handleNext} className="cresoa-primary-button" style={{ padding: '0.5rem 1.5rem' }}>
              Continue <Icon name="arrow-right" size={14} stroke="#fff" style={{ marginLeft: '0.3rem' }} />
            </button>
          ) : (
            <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap', marginLeft: 'auto' }}>
              <button
                type="button"
                onClick={(e) => handleSubmit(e, true)}
                disabled={savingDraft}
                style={{ padding: '0.5rem 1.5rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'transparent', color: 'var(--cresoa-text)', cursor: 'pointer', fontWeight: 500 }}
              >
                {savingDraft ? 'Saving...' : 'Save as Draft'}
              </button>
              <button
                type="submit"
                onClick={(e) => handleSubmit(e, false)}
                disabled={saving}
                className="cresoa-primary-button"
                style={{ padding: '0.5rem 1.5rem' }}
              >
                {saving ? 'Creating...' : 'Create Job'}
              </button>
            </div>
          )}
        </div>
      </form>

      {/* ─── Footer ──────────────────────────────────────────── */}
      <div style={{ marginTop: '2rem' }}>
        <Navigation businessId={businessId} />
      </div>
    </div>
  )
            }
