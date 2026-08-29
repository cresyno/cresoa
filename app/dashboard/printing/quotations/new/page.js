'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../../../../lib/supabaseClient'

const Svg = ({ name, size = 20, stroke = 'currentColor' }) => {
  const icons = {
    plus: <><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></>,
    back: <><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></>,
    trash: <><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></>,
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{icons[name]}</svg>
}

const inputStyle = {
  width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px',
  border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-bg)',
  color: 'var(--cresoa-text)', fontSize: '0.95rem', boxSizing: 'border-box',
  transition: 'border-color 0.2s',
  outline: 'none',
}

const labelStyle = { display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem', color: 'var(--cresoa-text)' }

const JOB_TYPES = ['Flyers', 'Business Cards', 'Banners', 'Stickers', 'T-shirts', 'Signage', 'Wedding Programmes', 'Posters', 'Brochures', 'Invitation Cards', 'Branding', 'Design Services', 'Custom Service']

function NewQuotationContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const businessId = searchParams.get('business_id')

  const [customers, setCustomers] = useState([])
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [customerSearch, setCustomerSearch] = useState('')
  const [showNewCustomer, setShowNewCustomer] = useState(false)
  const [newCustomerName, setNewCustomerName] = useState('')
  const [newCustomerPhone, setNewCustomerPhone] = useState('')

  const [title, setTitle] = useState('')
  const [jobType, setJobType] = useState('')
  const [quantity, setQuantity] = useState('')
  const [specifications, setSpecifications] = useState('')
  const [validTill, setValidTill] = useState('')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState([{ description: '', quantity: '', unit_price: '' }])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchCustomers = async () => {
      const { data } = await supabase.from('customers').select('*').eq('business_id', businessId).eq('sector', 'printing').order('name', { ascending: true })
      setCustomers(data || [])
    }
    fetchCustomers()
  }, [businessId])

  const handleCustomerSelect = (customer) => setSelectedCustomer(customer)

  const addItem = () => setItems(prev => [...prev, { description: '', quantity: '', unit_price: '' }])

  const updateItem = (index, field, value) => {
    setItems(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item))
  }

  const removeItem = (index) => setItems(prev => prev.filter((_, i) => i !== index))

  const subtotal = items.reduce((sum, item) => sum + (Number(item.quantity || 0) * Number(item.unit_price || 0)), 0)

  const handleCreateNewCustomer = async () => {
    if (!newCustomerName.trim()) { setError('Customer name is required.'); return }
    const nameParts = newCustomerName.trim().split(' ')
    const firstName = nameParts[0] || ''
    const lastName = nameParts.slice(1).join(' ') || ''
    const { data: newCust, error: custError } = await supabase.from('customers').insert({ business_id: businessId, sector: 'printing', name: newCustomerName.trim(), first_name: firstName, last_name: lastName, phone: newCustomerPhone.trim() || null }).select().single()
    if (custError) { setError('Failed to create customer.'); return }
    setSelectedCustomer(newCust)
    setShowNewCustomer(false)
    setNewCustomerName('')
    setNewCustomerPhone('')
    setCustomers(prev => [newCust, ...prev])
  }

  const handleSave = async () => {
    if (!selectedCustomer) { setError('Please select a customer.'); return }
    if (!title.trim()) { setError('Quotation title is required.'); return }
    if (!jobType) { setError('Please select a job type.'); return }
    if (items.length === 0 || items.some(i => !i.description.trim() || !i.quantity || !i.unit_price)) { setError('Each item needs a description, quantity, and unit price.'); return }

    setSaving(true)
    setError('')
    try {
      const quoteNumber = `Q-${Date.now().toString().slice(-6)}`
      const { data: quote, error: quoteError } = await supabase.from('quotations').insert({
        business_id: businessId,
        customer_id: selectedCustomer.id,
        quote_number: quoteNumber,
        status: 'draft',
        items: items.map(i => ({ description: i.description, quantity: Number(i.quantity), unit_price: Number(i.unit_price), total: Number(i.quantity) * Number(i.unit_price) })),
        subtotal: subtotal,
        total: subtotal,
        valid_till: validTill || null,
        notes: notes || null,
        job_type: jobType,
        quantity: Number(quantity) || null,
        specifications: specifications || null,
      }).select().single()

      if (quoteError) throw quoteError
      router.push(`/dashboard/printing/quotations/${quote.id}?business_id=${businessId}`)
    } catch (err) {
      setError(err.message || 'Failed to save quotation.')
      setSaving(false)
    }
  }

  return (
    <div style={{ padding: '1rem', maxWidth: '700px', margin: '0 auto', background: 'var(--cresoa-bg)', minHeight: '100vh', paddingBottom: '100px' }}>
      <button onClick={() => router.push(`/dashboard/printing/quotations?business_id=${businessId}`)} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cresoa-text-muted)', marginBottom: '1rem' }}>
        <Svg name="back" size={16} stroke="currentColor" /> Back to Quotations
      </button>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem' }}>Create New Quotation</h1>

      {error && <div style={{ padding: '0.6rem 1rem', borderRadius: '8px', background: 'var(--cresoa-danger-soft)', color: 'var(--cresoa-danger)', marginBottom: '1rem' }}>{error}</div>}

      {/* Customer Section */}
      <div style={{ background: 'var(--cresoa-surface)', borderRadius: '12px', padding: '1.2rem', marginBottom: '1rem', border: '1px solid var(--cresoa-border)' }}>
        <h3 style={{ marginBottom: '0.8rem', fontWeight: 700 }}>Select Customer</h3>
        <input
          type="text"
          placeholder="Search by customer name or phone number..."
          value={customerSearch}
          onChange={(e) => setCustomerSearch(e.target.value)}
          style={inputStyle}
        />
        <div style={{ maxHeight: '200px', overflowY: 'auto', marginTop: '0.5rem' }}>
          {customers.filter(c => (c.name || `${c.first_name || ''} ${c.last_name || ''}`).toLowerCase().includes(customerSearch.toLowerCase())).map(c => (
            <button key={c.id} onClick={() => handleCustomerSelect(c)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', padding: '0.5rem', border: `1px solid ${selectedCustomer?.id === c.id ? 'var(--cresoa-accent)' : 'var(--cresoa-border)'}`, borderRadius: '8px', background: selectedCustomer?.id === c.id ? 'var(--cresoa-accent-soft)' : 'var(--cresoa-surface)', marginBottom: '0.3rem', cursor: 'pointer', textAlign: 'left' }}>
              <span style={{ fontWeight: 600 }}>{c.name || `${c.first_name || ''} ${c.last_name || ''}`.trim()}</span>
              {c.phone && <span style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.8rem' }}>{c.phone}</span>}
            </button>
          ))}
          {customers.length === 0 && <p style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '0.5rem' }}>No customers yet. Add a new one below.</p>}
        </div>
        {showNewCustomer ? (
          <div style={{ marginTop: '0.5rem', background: 'var(--cresoa-surface-soft)', padding: '0.8rem', borderRadius: '8px' }}>
            <label style={labelStyle}>New Customer Name *</label>
            <input type="text" placeholder="e.g. Iya Bisi" value={newCustomerName} onChange={(e) => setNewCustomerName(e.target.value)} style={{ ...inputStyle, marginBottom: '0.5rem' }} />
            <label style={labelStyle}>Phone Number</label>
            <input type="tel" placeholder="e.g. 0803 123 4567" value={newCustomerPhone} onChange={(e) => setNewCustomerPhone(e.target.value)} style={{ ...inputStyle, marginBottom: '0.5rem' }} />
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={handleCreateNewCustomer} style={{ flex: 1, padding: '0.5rem', borderRadius: '8px', border: 'none', background: 'var(--cresoa-accent)', color: '#fff', fontWeight: 600 }}>Save Customer</button>
              <button onClick={() => setShowNewCustomer(false)} style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'transparent' }}>Cancel</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowNewCustomer(true)} style={{ marginTop: '0.5rem', padding: '0.5rem 1rem', borderRadius: '8px', border: '1px dashed var(--cresoa-border)', background: 'transparent', color: 'var(--cresoa-text)', fontWeight: 600 }}>+ Add New Customer</button>
        )}
      </div>

      {/* Job Details */}
      <div style={{ background: 'var(--cresoa-surface)', borderRadius: '12px', padding: '1.2rem', marginBottom: '1rem', border: '1px solid var(--cresoa-border)' }}>
        <h3 style={{ marginBottom: '0.8rem', fontWeight: 700 }}>Job Details</h3>
        <label style={labelStyle}>Quotation Title *</label>
        <input type="text" placeholder="e.g. Wedding Invitations, 500 Flyers" value={title} onChange={(e) => setTitle(e.target.value)} style={{ ...inputStyle, marginBottom: '0.8rem' }} />

        <label style={labelStyle}>Job Type *</label>
        <select value={jobType} onChange={(e) => setJobType(e.target.value)} style={{ ...inputStyle, marginBottom: '0.8rem' }}>
          <option value="">Select job type (e.g. Flyers, Banners...)</option>
          {JOB_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>

        <label style={labelStyle}>Quantity (optional)</label>
        <input type="number" placeholder="e.g. 500 copies" value={quantity} onChange={(e) => setQuantity(e.target.value)} style={{ ...inputStyle, marginBottom: '0.8rem' }} />

        <label style={labelStyle}>Specifications (optional)</label>
        <textarea placeholder="e.g. A5 size, full colour, 150gsm, matte finish" value={specifications} onChange={(e) => setSpecifications(e.target.value)} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
      </div>

      {/* Items & Pricing */}
      <div style={{ background: 'var(--cresoa-surface)', borderRadius: '12px', padding: '1.2rem', marginBottom: '1rem', border: '1px solid var(--cresoa-border)' }}>
        <h3 style={{ marginBottom: '0.8rem', fontWeight: 700 }}>Items & Pricing</h3>
        {items.map((item, index) => (
          <div key={index} style={{ display: 'grid', gridTemplateColumns: '1fr 70px 110px 30px', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center' }}>
            <input type="text" placeholder="Description (e.g. Design and printing)" value={item.description} onChange={(e) => updateItem(index, 'description', e.target.value)} style={inputStyle} />
            <input type="number" placeholder="Qty" value={item.quantity} onChange={(e) => updateItem(index, 'quantity', e.target.value)} style={inputStyle} />
            <input type="number" placeholder="Unit ₦" value={item.unit_price} onChange={(e) => updateItem(index, 'unit_price', e.target.value)} style={inputStyle} />
            <button onClick={() => removeItem(index)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cresoa-danger)' }}><Svg name="trash" size={16} stroke="currentColor" /></button>
          </div>
        ))}
        <button onClick={addItem} style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: '1px dashed var(--cresoa-border)', background: 'transparent', color: 'var(--cresoa-text-muted)', fontWeight: 600 }}>+ Add Item</button>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem', paddingTop: '0.8rem', borderTop: '1px solid var(--cresoa-border)' }}>
          <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>Subtotal: ₦{subtotal.toLocaleString()}</span>
        </div>
      </div>

      {/* Additional Details */}
      <div style={{ background: 'var(--cresoa-surface)', borderRadius: '12px', padding: '1.2rem', marginBottom: '1rem', border: '1px solid var(--cresoa-border)' }}>
        <h3 style={{ marginBottom: '0.8rem', fontWeight: 700 }}>Validity & Notes</h3>
        <label style={labelStyle}>Valid Until (optional)</label>
        <input type="date" placeholder="Select validity date" value={validTill} onChange={(e) => setValidTill(e.target.value)} style={{ ...inputStyle, marginBottom: '0.8rem' }} />

        <label style={labelStyle}>Notes / Payment Terms (optional)</label>
        <textarea placeholder="e.g. 50% deposit required before production starts" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
      </div>

      {/* Sticky Save Button */}
      <div style={{ position: 'sticky', bottom: '80px', background: 'var(--cresoa-surface)', padding: '0.5rem', borderTop: '1px solid var(--cresoa-border)' }}>
        <button onClick={handleSave} disabled={saving} className="cresoa-primary-button" style={{ width: '100%', justifyContent: 'center' }}>
          {saving ? 'Saving Quotation...' : 'Generate Quotation'}
        </button>
      </div>
    </div>
  )
}

export default function NewQuotationPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'var(--cresoa-bg)' }}>Loading...</div>}>
      <NewQuotationContent />
    </Suspense>
  )
                      }
