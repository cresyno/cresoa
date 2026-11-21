import { useClientSearchParams as useSearchParams } from '../../../lib/useClientSearchParams';
'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../../../lib/supabaseClient'
import { getCurrentBusinessId } from '../../../../lib/getBusinessId'
import { MeasurementForm } from '../../../../components/MeasurementForm'
import '../../../globals.css'

const STEPS = [
  { id: 1, label: 'Personal Info' },
  { id: 2, label: 'Contact' },
  { id: 3, label: 'Measurements' },
  { id: 4, label: 'Review' },
]

const INITIAL_FORM = {
  first_name: '',
  last_name: '',
  phone: '',
  email: '',
  gender: '',
  age_category: '',
  address: '',
  notes: '',
  measurements: {},
}

// ─── EMBEDDED ICONS ───
const SvgIcons = {
  ArrowLeft: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>,
  ChevronDown: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>,
}

export default function NewCustomerPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const businessId = getCurrentBusinessId() || searchParams.get('business_id')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  const [step, setStep] = useState(1)
  const [form, setForm] = useState(INITIAL_FORM)
  
  // Custom Dropdown State
  const [openDropdown, setOpenDropdown] = useState(null)
  const dropdownRef = useRef(null)

  // Custom UI State
  const [modalConfig, setModalConfig] = useState({ isOpen: false, title: '', message: '', confirmText: '', onConfirm: null })
  const [toastMessage, setToastMessage] = useState('')
  const [toastType, setToastType] = useState('success')

  const showToast = (msg, type = 'success') => {
    setToastMessage(msg)
    setToastType(type)
    setTimeout(() => setToastMessage(''), 3000)
  }

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpenDropdown(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (!businessId) { router.push('/dashboard'); return }
    setLoading(false)
  }, [businessId, router])

  const updateField = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  const validateStep = () => {
    if (step === 1) {
      if (!form.first_name.trim() || !form.last_name.trim() || !form.phone.trim()) {
        showToast('Please fill all required fields.', 'error')
        return false
      }
    }
    return true
  }

  const handleNext = () => {
    if (validateStep()) setStep(prev => Math.min(prev + 1, STEPS.length))
  }

  const handleBack = () => setStep(prev => Math.max(prev - 1, 1))

  const promptSave = () => {
    if (!validateStep()) return
    setModalConfig({
      isOpen: true,
      title: 'Save Customer',
      message: `Are you sure you want to create a profile for ${form.first_name} ${form.last_name}?`,
      confirmText: 'Save Customer',
      onConfirm: async () => {
        setModalConfig(prev => ({ ...prev, isOpen: false }))
        setSaving(true)

        try {
          const { data: { session } } = await supabase.auth.getSession()
          if (!session) { router.push('/login'); return }

          const payload = {
            business_id: businessId,
            first_name: form.first_name.trim(),
            last_name: form.last_name.trim(),
            phone: form.phone.trim(),
            email: form.email.trim() || null,
            gender: form.gender || null,
            age_category: form.age_category || null,
            address: form.address.trim() || null,
            notes: form.notes.trim() || null,
            measurements: form.measurements || {},
            name: `${form.first_name.trim()} ${form.last_name.trim()}`
          }

          const response = await fetch('/api/customers', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify(payload),
          })

          const result = await response.json()
          if (!response.ok) throw new Error(result.error || 'Could not create customer.')

          const customerId = result.customer?.id || result.data?.id
          if (!customerId) throw new Error('No customer ID returned.')

          await supabase.from('business_activity_logs').insert({
            business_id: businessId,
            performed_by: session.user.id,
            action: 'customer_created',
            details: { name: `${form.first_name} ${form.last_name}` },
          })

          showToast('Customer created successfully')
          router.push(`/dashboard/customers/${customerId}?business_id=${businessId}`)

        } catch (err) {
          showToast(err.message || 'Failed to create customer.', 'error')
          setSaving(false)
        }
      }
    })
  }

  if (loading) return <div className="order-page-loading"><div className="spinner" /></div>

  return (
    <div className="wizard-page">
      {/* ─── HEADER & PROGRESS ─── */}
      <div className="wizard-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <button onClick={() => router.back()} className="order-back-btn" style={{ margin: 0 }}>
            <SvgIcons.ArrowLeft /> Cancel
          </button>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-primary)' }}>Step {step} of {STEPS.length}</span>
        </div>
        
        <div className="wizard-progress-bar">
          {STEPS.map((s, idx) => (
            <div key={s.id} className={`wizard-progress-segment ${idx + 1 <= step ? 'active' : ''}`} />
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '0.75rem', fontWeight: 600, color: 'var(--cresoa-text-muted)' }}>
          <span>{STEPS[step - 1].label}</span>
          <span>{Math.round(((step - 1) / (STEPS.length - 1)) * 100)}% Complete</span>
        </div>
      </div>

      {/* ─── SCROLLABLE CONTENT ─── */}
      <div className="wizard-content">
        
        {/* STEP 1: PERSONAL INFO */}
        {step === 1 && (
          <div className="wizard-step">
            <h2 className="wizard-title">Personal Information</h2>
            <p className="wizard-subtitle">Basic details for this customer.</p>

            <div className="form-grid-2">
              <div className="form-group">
                <label className="order-label">First Name *</label>
                <input type="text" className="order-input" value={form.first_name} onChange={e => updateField('first_name', e.target.value)} placeholder="Enter first name" autoFocus />
              </div>
              <div className="form-group">
                <label className="order-label">Last Name *</label>
                <input type="text" className="order-input" value={form.last_name} onChange={e => updateField('last_name', e.target.value)} placeholder="Enter last name" />
              </div>
            </div>

            <div className="form-group">
              <label className="order-label">Phone Number *</label>
              <input type="tel" className="order-input" value={form.phone} onChange={e => updateField('phone', e.target.value)} placeholder="Enter phone number" />
            </div>

            <div className="form-grid-2">
              {/* CUSTOM GENDER DROPDOWN */}
              <div className="form-group" ref={openDropdown === 'gender' ? dropdownRef : null}>
                <label className="order-label">Gender</label>
                <div className="custom-dropdown-wrapper">
                  <button type="button" className="custom-dropdown-btn" onClick={() => setOpenDropdown(openDropdown === 'gender' ? null : 'gender')}>
                    <span style={{ color: form.gender ? 'var(--cresoa-text)' : 'var(--cresoa-text-muted)' }}>{form.gender || 'Select gender'}</span>
                    <SvgIcons.ChevronDown />
                  </button>
                  {openDropdown === 'gender' && (
                    <div className="custom-dropdown-menu">
                      {['Female', 'Male', 'Other'].map(opt => (
                        <button key={opt} type="button" className={`custom-dropdown-item ${form.gender === opt ? 'active' : ''}`} onClick={() => { updateField('gender', opt); setOpenDropdown(null) }}>{opt}</button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* CUSTOM AGE DROPDOWN */}
              <div className="form-group" ref={openDropdown === 'age' ? dropdownRef : null}>
                <label className="order-label">Age Category</label>
                <div className="custom-dropdown-wrapper">
                  <button type="button" className="custom-dropdown-btn" onClick={() => setOpenDropdown(openDropdown === 'age' ? null : 'age')}>
                    <span style={{ color: form.age_category ? 'var(--cresoa-text)' : 'var(--cresoa-text-muted)' }}>{form.age_category || 'Select age'}</span>
                    <SvgIcons.ChevronDown />
                  </button>
                  {openDropdown === 'age' && (
                    <div className="custom-dropdown-menu">
                      {['Adult', 'Child'].map(opt => (
                        <button key={opt} type="button" className={`custom-dropdown-item ${form.age_category === opt ? 'active' : ''}`} onClick={() => { updateField('age_category', opt); setOpenDropdown(null) }}>{opt}</button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: CONTACT */}
        {step === 2 && (
          <div className="wizard-step">
            <h2 className="wizard-title">Contact Details</h2>
            <p className="wizard-subtitle">Optional but helpful for communication.</p>

            <div className="form-group">
              <label className="order-label">Email Address</label>
              <input type="email" className="order-input" value={form.email} onChange={e => updateField('email', e.target.value)} placeholder="Enter email address" />
            </div>

            <div className="form-group">
              <label className="order-label">Physical Address</label>
              <textarea className="order-input" rows={3} value={form.address} onChange={e => updateField('address', e.target.value)} placeholder="Enter full address" />
            </div>

            <div className="form-group">
              <label className="order-label">Private Notes</label>
              <textarea className="order-input" rows={2} value={form.notes} onChange={e => updateField('notes', e.target.value)} placeholder="Enter private notes for your team" />
            </div>
          </div>
        )}

        {/* STEP 3: MEASUREMENTS */}
        {step === 3 && (
          <div className="wizard-step">
            <h2 className="wizard-title">Measurements</h2>
            <p className="wizard-subtitle">Save sizing details for this customer.</p>

            <div className="order-card" style={{ padding: '0' }}>
              <MeasurementForm measurements={form.measurements} onChange={(updated) => updateField('measurements', updated)} showNotes={false} label="" />
            </div>
          </div>
        )}

        {/* STEP 4: REVIEW */}
        {step === 4 && (
          <div className="wizard-step">
            <h2 className="wizard-title">Review Customer</h2>
            <p className="wizard-subtitle">Confirm the details before saving.</p>

            <div className="order-card" style={{ padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid var(--cresoa-border)', paddingBottom: '12px', marginBottom: '12px' }}>
                <div className="customer-card-avatar">{(form.first_name.charAt(0) || '') + (form.last_name.charAt(0) || '')}</div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>{form.first_name} {form.last_name}</h3>
                  <p style={{ margin: '2px 0 0', fontSize: '0.85rem', color: 'var(--cresoa-text-muted)' }}>{form.phone}</p>
                </div>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.9rem' }}>
                <div><span style={{ color: 'var(--cresoa-text-muted)' }}>Gender:</span> <br/><strong>{form.gender || 'Not set'}</strong></div>
                <div><span style={{ color: 'var(--cresoa-text-muted)' }}>Age:</span> <br/><strong>{form.age_category || 'Not set'}</strong></div>
                <div style={{ gridColumn: '1 / -1' }}><span style={{ color: 'var(--cresoa-text-muted)' }}>Email:</span> <br/><strong>{form.email || 'Not set'}</strong></div>
                {Object.keys(form.measurements || {}).filter(k => form.measurements[k]).length > 0 && (
                  <div style={{ gridColumn: '1 / -1', paddingTop: '8px', borderTop: '1px dashed var(--cresoa-border)' }}>
                    <span style={{ color: 'var(--cresoa-text-muted)' }}>Measurements Saved:</span> 
                    <span style={{ marginLeft: '6px', color: 'var(--color-secondary)', fontWeight: 700 }}>Yes</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ─── FIXED BOTTOM NAVIGATION ─── */}
      <div className="wizard-footer">
        {step > 1 ? (
          <button onClick={handleBack} className="order-btn-secondary" style={{ flex: 1, padding: '14px' }}>Back</button>
        ) : <div style={{ flex: 1 }} />}
        
        {step < STEPS.length ? (
          <button onClick={handleNext} className="cresoa-primary-button" style={{ flex: 2, padding: '14px' }}>
            Continue
          </button>
        ) : (
          <button onClick={promptSave} disabled={saving} className="cresoa-primary-button" style={{ flex: 2, padding: '14px' }}>
            {saving ? 'Saving...' : 'Save Customer'}
          </button>
        )}
      </div>

      {/* ─── CUSTOM CONFIRM MODAL ─── */}
      {modalConfig.isOpen && (
        <div className="app-modal-overlay" onClick={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}>
          <div className="app-modal-box" onClick={e => e.stopPropagation()}>
            <h3 className="app-modal-title">{modalConfig.title}</h3>
            <p className="app-modal-message">{modalConfig.message}</p>
            <div className="app-modal-actions">
              <button className="app-modal-btn cancel" onClick={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}>Cancel</button>
              <button className="app-modal-btn confirm" onClick={modalConfig.onConfirm}>{modalConfig.confirmText}</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── TOAST ─── */}
      {toastMessage && (
        <div className={`app-toast ${toastType}`}>
          {toastMessage}
        </div>
      )}

    </div>
  )
    }
