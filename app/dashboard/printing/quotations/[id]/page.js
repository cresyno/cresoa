'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { supabase } from '../../../../../lib/supabaseClient'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

// ─── Self-contained SVGs (Match Invoice Page) ───
const Svg = ({ name, size = 20, stroke = 'currentColor', style }) => {
  const icons = {
    back: <><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></>,
    download: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></>,
    whatsapp: <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />,
    printer: <><polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="8" /></>,
    check: <polyline points="20 6 9 17 4 12" />,
    x: <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>,
    edit: <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />,
    trash: <><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></>,
    'arrow-right': <><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></>,
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>{icons[name]}</svg>
}

export default function QuotationDetailPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const quotationId = params.id
  const businessIdFromUrl = searchParams?.get('business_id')

  const [businessId, setBusinessId] = useState(null)
  const [quote, setQuote] = useState(null)
  const [customer, setCustomer] = useState(null)
  const [business, setBusiness] = useState(null)
  const [items, setItems] = useState([])

  // Editable fields
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({ bank_name: '', account_number: '', account_name: '', cac_number: '', tin_number: '', valid_till: '', due_date: '' })
  const [editItems, setEditItems] = useState([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const quotationRef = useRef(null)
  const [logoDataUrl, setLogoDataUrl] = useState(null)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Print styles
  useEffect(() => {
    const style = document.createElement('style')
    style.innerHTML = `
      @media print {
        body * { visibility: hidden; }
        #quotation-print-area, #quotation-print-area * { visibility: visible; }
        #quotation-print-area { position: absolute; left: 0; top: 0; width: 100%; }
        .no-print { display: none !important; }
      }
    `
    document.head.appendChild(style)
    return () => document.head.removeChild(style)
  }, [])

  useEffect(() => {
    const fetchQuotation = async () => {
      try {
        const bizId = businessIdFromUrl
        if (!bizId) { router.push('/dashboard'); return }
        setBusinessId(bizId)

        const { data: quoteData, error: quoteError } = await supabase
          .from('quotations')
          .select('*')
          .eq('id', quotationId)
          .eq('business_id', bizId)
          .maybeSingle()

        if (quoteError) throw quoteError
        if (!quoteData) throw new Error('Quotation not found')
        setQuote(quoteData)
        setItems(quoteData.items || [])
        setEditItems(quoteData.items || [])

        if (quoteData.customer_id) {
          const { data: cust } = await supabase.from('customers').select('*').eq('id', quoteData.customer_id).maybeSingle()
          setCustomer(cust)
        }

        const { data: biz } = await supabase.from('businesses').select('*').eq('id', bizId).maybeSingle()
        setBusiness(biz)

        if (biz) {
          setEditForm({
            bank_name: biz.bank_name || '',
            account_number: biz.account_number || '',
            account_name: biz.account_name || '',
            cac_number: biz.cac_number || '',
            tin_number: biz.tin_number || '',
            valid_till: quoteData.valid_till || '',
            due_date: quoteData.due_date || '',
          })
        }

        if (biz?.logo_url) {
          const img = new Image()
          img.crossOrigin = 'anonymous'
          img.src = biz.logo_url
          img.onload = () => {
            const canvas = document.createElement('canvas')
            canvas.width = img.width
            canvas.height = img.height
            const ctx = canvas.getContext('2d')
            ctx.drawImage(img, 0, 0)
            setLogoDataUrl(canvas.toDataURL('image/png'))
          }
        }
      } catch (err) {
        console.error(err)
        setError('Could not load quotation.')
      } finally {
        setLoading(false)
      }
    }
    fetchQuotation()
  }, [quotationId, businessIdFromUrl, router])

  const formatMoney = (val) => `₦${Number(val || 0).toLocaleString('en-NG')}`
  const formatDate = (dateStr) => dateStr ? new Date(dateStr).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'

  // ─── EXACT LOGIC FROM FASHION INVOICE PAGE ───
  const generatePdfBlob = async () => {
    if (!quotationRef.current) return null
    await new Promise(resolve => setTimeout(resolve, 100))
    const originalWidth = quotationRef.current.style.width
    quotationRef.current.style.width = '794px'
    const canvas = await html2canvas(quotationRef.current, {
      scale: 2,
      backgroundColor: '#ffffff',
      windowWidth: 794,
      scrollX: 0,
      scrollY: 0,
    })
    quotationRef.current.style.width = originalWidth
    const imgData = canvas.toDataURL('image/png')
    const pdf = new jsPDF('p', 'mm', 'a4')
    const pdfWidth = pdf.internal.pageSize.getWidth()
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight)
    return pdf.output('blob')
  }

  const handleDownloadPDF = async () => {
    try {
      const blob = await generatePdfBlob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${quote.quote_number}.pdf`
      link.click()
      URL.revokeObjectURL(url)
    } catch (err) { alert('Failed to generate PDF.') }
  }

  const handleShareWhatsApp = async () => {
    if (!customer?.phone) { alert('Customer has no phone number.'); return }
    const message = `Hi ${customer.name || customer.first_name}, here is your quotation ${quote.quote_number}. Total: ${formatMoney(quote.total)}. Thank you for your business!`
    try {
      const pdfBlob = await generatePdfBlob()
      const fileName = `${quote.quote_number}.pdf`
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [new File([pdfBlob], fileName)] })) {
        await navigator.share({
          title: `Quotation ${quote.quote_number}`,
          text: message,
          files: [new File([pdfBlob], fileName, { type: 'application/pdf' })]
        })
      } else {
        const url = URL.createObjectURL(pdfBlob)
        const link = document.createElement('a')
        link.href = url
        link.download = fileName
        link.click()
        URL.revokeObjectURL(url)
        alert('PDF downloaded. Please attach it to the WhatsApp chat you are about to open.')
        const waUrl = `https://wa.me/${customer.phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`
        window.open(waUrl, '_blank')
      }
    } catch (err) { alert('Failed to share. Please try again.') }
  }
  // ─── END EXACT LOGIC ───

  const handlePrint = () => { window.print() }

  const handleUpdateStatus = async (newStatus) => {
    try {
      const { error } = await supabase.from('quotations').update({ status: newStatus }).eq('id', quote.id)
      if (error) throw error
      setQuote(prev => ({ ...prev, status: newStatus }))
    } catch (err) { alert('Failed to update status.') }
  }

  const handleConvertToJob = async () => {
    if (!confirm('Convert this quotation to a print job?')) return
    try {
      const { data: newJob, error: jobError } = await supabase.from('print_jobs').insert({
        business_id: businessId,
        customer_id: quote.customer_id,
        job_number: `PR-${Date.now().toString().slice(-6)}`,
        title: editItems[0]?.description || 'Print Job',
        quantity: editItems[0]?.quantity || 1,
        status: 'awaiting_deposit',
        total: quote.total,
        amount_paid: 0,
        notes: quote.notes || null,
      }).select().single()
      if (jobError) throw jobError
      await supabase.from('quotations').update({ status: 'converted', job_id: newJob.id }).eq('id', quote.id)
      router.push(`/dashboard/printing/jobs/${newJob.id}?business_id=${businessId}`)
    } catch (err) { alert('Failed to convert to job.') }
  }

  const handleDelete = async () => {
    if (!confirm('Delete this quotation?')) return
    try {
      const { error } = await supabase.from('quotations').delete().eq('id', quote.id)
      if (error) throw error
      router.push(`/dashboard/printing/quotations?business_id=${businessId}`)
    } catch (err) { alert('Failed to delete quotation.') }
  }

  const handleEditItem = (index, field, value) => {
    setEditItems(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item))
  }

  const handleSaveEdit = async () => {
    try {
      const { error: quoteError } = await supabase.from('quotations').update({
        items: editItems.map(i => ({ ...i, total: Number(i.quantity) * Number(i.unit_price) })),
        subtotal: editItems.reduce((s, i) => s + (Number(i.quantity) * Number(i.unit_price)), 0),
        total: editItems.reduce((s, i) => s + (Number(i.quantity) * Number(i.unit_price)), 0),
        due_date: editForm.due_date || null,
        valid_till: editForm.valid_till || null,
      }).eq('id', quote.id)
      if (quoteError) throw quoteError

      const { error: bizError } = await supabase.from('businesses').update({
        bank_name: editForm.bank_name,
        account_number: editForm.account_number,
        account_name: editForm.account_name,
        cac_number: editForm.cac_number,
        tin_number: editForm.tin_number,
      }).eq('id', businessId)
      if (bizError) throw bizError

      const { data: freshBiz } = await supabase.from('businesses').select('*').eq('id', businessId).maybeSingle()
      setBusiness(freshBiz)
      setQuote(prev => ({ ...prev, items: editItems.map(i => ({ ...i, total: Number(i.quantity) * Number(i.unit_price) })), subtotal: editItems.reduce((s, i) => s + (Number(i.quantity) * Number(i.unit_price)), 0), total: editItems.reduce((s, i) => s + (Number(i.quantity) * Number(i.unit_price)), 0), due_date: editForm.due_date, valid_till: editForm.valid_till }))
      setItems(editItems.map(i => ({ ...i, total: Number(i.quantity) * Number(i.unit_price) })))
      setIsEditing(false)
      alert('Quotation updated successfully!')
    } catch (err) {
      console.error(err)
      alert('Failed to save changes.')
    }
  }

  if (loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--cresoa-bg)' }}><div className="cresoa-loading-spinner" /></div>
  if (error || !quote) return <div style={{ minHeight: '70vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', textAlign: 'center' }}><Svg name="x" size={30} stroke="var(--cresoa-danger)" /><h2>Couldn't load quotation</h2><p>{error || 'Quotation not found'}</p><button onClick={() => router.push(`/dashboard/printing/quotations?business_id=${businessIdFromUrl}`)} className="cresoa-primary-button">Back</button></div>

  const customerName = customer?.name || customer?.first_name || 'Customer'
  const statusColors = { draft: 'var(--cresoa-text-muted)', sent: 'var(--cresoa-info)', approved: 'var(--cresoa-success)', rejected: 'var(--cresoa-danger)', converted: 'var(--cresoa-accent)' }
  const isConverted = quote.status === 'converted'

  return (
    <div style={{ padding: '1rem', maxWidth: '1200px', margin: '0 auto', paddingBottom: '120px', background: 'var(--cresoa-bg)', minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <button onClick={() => router.push(`/dashboard/printing/quotations?business_id=${businessIdFromUrl}`)} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cresoa-text-muted)' }}><Svg name="back" size={16} stroke="currentColor" /> Back</button>
        {!isEditing && (
          <button onClick={() => setIsEditing(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.4rem 1rem', borderRadius: '8px', border: '1px solid var(--cresoa-accent)', background: 'var(--cresoa-accent-soft)', color: 'var(--cresoa-accent)', fontWeight: 600, cursor: 'pointer' }}>
            <Svg name="edit" size={14} stroke="currentColor" /> Edit
          </button>
        )}
        {isEditing && (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={() => setIsEditing(false)} style={{ padding: '0.4rem 1rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'transparent', color: 'var(--cresoa-text)' }}>Cancel</button>
            <button onClick={handleSaveEdit} style={{ padding: '0.4rem 1rem', borderRadius: '8px', border: 'none', background: 'var(--cresoa-accent)', color: '#fff', fontWeight: 600 }}>Save Changes</button>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>{quote.quote_number}</h1>
          <p style={{ color: 'var(--cresoa-text-muted)', margin: '0.2rem 0 0' }}>{customerName}</p>
        </div>
        <span style={{ padding: '0.3rem 0.8rem', borderRadius: '12px', background: `${statusColors[quote.status] || '#666'}20`, color: statusColors[quote.status] || '#666', fontWeight: 700, textTransform: 'capitalize' }}>{quote.status}</span>
      </div>

      {/* PDF Area */}
      <div id="quotation-print-area" ref={quotationRef} style={{ background: '#fff', borderRadius: '12px', border: '1px solid var(--cresoa-border)', padding: '1.5rem', marginBottom: '1rem', color: '#1a1a1a', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ borderBottom: '2px solid var(--cresoa-accent)', paddingBottom: '0.75rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {logoDataUrl ? <img src={logoDataUrl} alt={business?.name} style={{ width: '80px', height: '80px', objectFit: 'contain' }} /> : <div style={{ width: '80px', height: '80px', background: '#0F2B4A', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>{business?.name?.charAt(0) || 'B'}</div>}
            <div>
              <h2 style={{ margin: 0, color: '#0F2B4A', fontSize: '1.1rem' }}>{business?.name || 'Business'}</h2>
              {business?.location && <p style={{ margin: '2px 0', color: '#666', fontSize: '0.8rem' }}>{business.location}</p>}
              {business?.phone && <p style={{ margin: '2px 0', color: '#666', fontSize: '0.8rem' }}>{business.phone}</p>}
              {business?.email && <p style={{ margin: '2px 0', color: '#666', fontSize: '0.8rem' }}>{business.email}</p>}
              {(isEditing ? editForm.tin_number : business?.tin_number) && <p style={{ margin: '2px 0', color: '#666', fontSize: '0.75rem' }}>TIN: {isEditing ? editForm.tin_number : business?.tin_number}</p>}
              {(isEditing ? editForm.cac_number : business?.cac_number) && <p style={{ margin: '2px 0', color: '#666', fontSize: '0.75rem' }}>CAC: {isEditing ? editForm.cac_number : business?.cac_number}</p>}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>QUOTATION</h3>
            <p style={{ margin: '4px 0', fontSize: '0.8rem', color: '#666' }}>#{quote.quote_number}</p>
            <p style={{ margin: '4px 0', fontSize: '0.8rem', color: '#666' }}>{formatDate(quote.created_at)}</p>
            <p style={{ margin: '4px 0', fontSize: '0.8rem', color: '#666' }}>Valid Till: <strong>{isEditing ? editForm.valid_till : (quote.valid_till ? formatDate(quote.valid_till) : 'Not set')}</strong></p>
          </div>
        </div>

        {/* Customer */}
        {customer && (
          <div style={{ marginBottom: '1rem' }}>
            <p style={{ margin: 0, color: '#666', fontSize: '0.7rem', fontWeight: 700 }}>PREPARED FOR</p>
            <p style={{ margin: 0, fontWeight: 600, fontSize: '1.1rem' }}>{customerName}</p>
            {customer.phone && <p style={{ margin: 0, color: '#666', fontSize: '0.8rem' }}>{customer.phone}</p>}
            {customer.email && <p style={{ margin: 0, color: '#666', fontSize: '0.8rem' }}>{customer.email}</p>}
          </div>
        )}

          {/* Items Table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', marginBottom: '1rem' }}>
          <thead>
            <tr style={{ background: '#f8f9fa' }}>
              <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Item</th>
              <th style={{ padding: '8px', textAlign: 'center', borderBottom: '1px solid #ddd' }}>Qty</th>
              <th style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid #ddd' }}>Unit Price</th>
              <th style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid #ddd' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {(isEditing ? editItems : items).map((item, i) => (
              <tr key={i}>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>
                  {isEditing ? <input type="text" value={item.description} onChange={(e) => handleEditItem(i, 'description', e.target.value)} style={{ width: '100%', border: '1px solid #ccc', borderRadius: '4px', padding: '4px' }} /> : item.description}
                </td>
                <td style={{ padding: '8px', textAlign: 'center', borderBottom: '1px solid #eee' }}>
                  {isEditing ? <input type="number" value={item.quantity} onChange={(e) => handleEditItem(i, 'quantity', e.target.value)} style={{ width: '60px', border: '1px solid #ccc', borderRadius: '4px', padding: '4px', textAlign: 'center' }} /> : item.quantity}
                </td>
                <td style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid #eee' }}>
                  {isEditing ? <input type="number" value={item.unit_price} onChange={(e) => handleEditItem(i, 'unit_price', e.target.value)} style={{ width: '90px', border: '1px solid #ccc', borderRadius: '4px', padding: '4px', textAlign: 'right' }} /> : formatMoney(item.unit_price)}
                </td>
                <td style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid #eee', fontWeight: 600 }}>
                  {isEditing ? formatMoney(Number(item.quantity) * Number(item.unit_price)) : formatMoney(item.total)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
          <div style={{ width: '220px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}><span>Subtotal</span><span>{formatMoney(isEditing ? editItems.reduce((s, i) => s + (Number(i.quantity) * Number(i.unit_price)), 0) : quote.subtotal)}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid #eee', padding: '8px 0', fontWeight: 700 }}><span>Total</span><span>{formatMoney(isEditing ? editItems.reduce((s, i) => s + (Number(i.quantity) * Number(i.unit_price)), 0) : quote.total)}</span></div>
          </div>
        </div>

        {/* Editable Bank Details */}
        {isEditing && (
          <div style={{ marginBottom: '1rem', padding: '0.8rem', background: '#f8f9fa', borderRadius: '8px' }}>
            <strong>Bank & Compliance</strong>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.5rem' }}>
              <div><label style={{ fontSize: '0.75rem' }}>Bank Name</label><input type="text" value={editForm.bank_name} onChange={(e) => setEditForm({ ...editForm, bank_name: e.target.value })} style={{ width: '100%', padding: '4px', border: '1px solid #ccc', borderRadius: '4px' }} /></div>
              <div><label style={{ fontSize: '0.75rem' }}>Account Number</label><input type="text" value={editForm.account_number} onChange={(e) => setEditForm({ ...editForm, account_number: e.target.value })} style={{ width: '100%', padding: '4px', border: '1px solid #ccc', borderRadius: '4px' }} /></div>
              <div><label style={{ fontSize: '0.75rem' }}>Account Name</label><input type="text" value={editForm.account_name} onChange={(e) => setEditForm({ ...editForm, account_name: e.target.value })} style={{ width: '100%', padding: '4px', border: '1px solid #ccc', borderRadius: '4px' }} /></div>
              <div><label style={{ fontSize: '0.75rem' }}>Due Date</label><input type="date" value={editForm.due_date} onChange={(e) => setEditForm({ ...editForm, due_date: e.target.value })} style={{ width: '100%', padding: '4px', border: '1px solid #ccc', borderRadius: '4px' }} /></div>
              <div><label style={{ fontSize: '0.75rem' }}>Valid Till</label><input type="date" value={editForm.valid_till} onChange={(e) => setEditForm({ ...editForm, valid_till: e.target.value })} style={{ width: '100%', padding: '4px', border: '1px solid #ccc', borderRadius: '4px' }} /></div>
            </div>
          </div>
        )}

        {!isEditing && (
          <div style={{ marginBottom: '1rem', padding: '0.8rem', background: '#f8f9fa', borderRadius: '8px', fontSize: '0.85rem' }}>
            <strong>Payment Details</strong>
            <div style={{ marginTop: '4px' }}>Bank: {business?.bank_name || 'N/A'} | Acct: {business?.account_number || 'N/A'} | Name: {business?.account_name || 'N/A'}</div>
          </div>
        )}

        {quote.notes && <p style={{ fontStyle: 'italic', color: '#666', fontSize: '0.85rem' }}>{quote.notes}</p>}
      </div>

      {/* ACTION BUTTONS */}
      <div className="no-print" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
          <button onClick={handleDownloadPDF} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-surface)', color: 'var(--cresoa-text)', cursor: 'pointer', fontWeight: 600 }}><Svg name="download" size={16} stroke="currentColor" /> Download PDF</button>
          <button onClick={handleShareWhatsApp} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-surface)', color: 'var(--cresoa-text)', cursor: 'pointer', fontWeight: 600 }}><Svg name="whatsapp" size={16} stroke="currentColor" /> WhatsApp</button>
        </div>
        {!isConverted && quote.status !== 'approved' && quote.status !== 'rejected' && (
          <button onClick={() => handleUpdateStatus('approved')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--cresoa-success)', background: 'var(--cresoa-success-soft)', color: 'var(--cresoa-success)', cursor: 'pointer', fontWeight: 700 }}><Svg name="check" size={16} stroke="currentColor" /> Approve</button>
        )}
        {!isConverted && quote.status !== 'approved' && quote.status !== 'rejected' && (
          <button onClick={() => handleUpdateStatus('rejected')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--cresoa-danger)', background: 'var(--cresoa-danger-soft)', color: 'var(--cresoa-danger)', cursor: 'pointer', fontWeight: 700 }}><Svg name="x" size={16} stroke="currentColor" /> Reject</button>
        )}
        {quote.status === 'approved' && (
          <button onClick={handleConvertToJob} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--cresoa-accent)', background: 'var(--cresoa-accent)', color: '#fff', cursor: 'pointer', fontWeight: 700 }}><Svg name="arrow-right" size={16} stroke="currentColor" /> Convert to Job</button>
        )}
        <button onClick={handleDelete} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--cresoa-danger)', background: 'transparent', color: 'var(--cresoa-danger)', cursor: 'pointer', fontWeight: 600 }}><Svg name="trash" size={16} stroke="currentColor" /> Delete Quotation</button>
      </div>
    </div>
  )
          }
