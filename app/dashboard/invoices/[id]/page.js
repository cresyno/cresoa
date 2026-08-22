'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '../../../../lib/supabaseClient'
import { requireBusinessAccess } from '../../../../lib/requireBusinessAccess'
import { Navigation } from '../../../../components/Navigation'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import '../../../globals.css'

// ─── Self-contained SVGs ───
const Svg = ({ name, size = 20, stroke = 'currentColor', style }) => {
  const icons = {
    back: <><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></>,
    download: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></>,
    whatsapp: <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />,
    printer: <><polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="8" /></>,
    card: <><rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><line x1="1" y1="10" x2="23" y2="10" /></>,
    x: <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>,
    chevron: <polyline points="9 18 15 12 9 6" />,
    edit: <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />,
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>{icons[name]}</svg>
}

export default function InvoiceDetailPage() {
  const router = useRouter()
  const params = useParams()
  const invoiceId = params.id

  const [businessId, setBusinessId] = useState(null)
  const [invoice, setInvoice] = useState(null)
  const [customer, setCustomer] = useState(null)
  const [business, setBusiness] = useState(null)
  const [items, setItems] = useState([])

  const [customNote, setCustomNote] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [bankName, setBankName] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [accountName, setAccountName] = useState('')
  const [cacNumber, setCacNumber] = useState('')
  const [tinNumber, setTinNumber] = useState('')

  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentNote, setPaymentNote] = useState('')
  const [savingPayment, setSavingPayment] = useState(false)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [savingEdits, setSavingEdits] = useState(false)

  const invoiceRef = useRef(null)
  const [logoDataUrl, setLogoDataUrl] = useState(null)

  // Screen size detection for Quick Actions
  const [isDesktop, setIsDesktop] = useState(false)

  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 768)
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
        #invoice-print-area, #invoice-print-area * { visibility: visible; }
        #invoice-print-area { position: absolute; left: 0; top: 0; width: 100%; }
        .no-print { display: none !important; }
      }
    `
    document.head.appendChild(style)
    return () => document.head.removeChild(style)
  }, [])

  // Fetch invoice
  useEffect(() => {
    const fetchInvoice = async () => {
      try {
        const bizId = await requireBusinessAccess(router)
        if (!bizId) return
        setBusinessId(bizId)

        const { data: invoiceData, error: invoiceError } = await supabase
          .from('invoices')
          .select(`
            *,
            customers ( id, name, first_name, last_name, phone, email, address ),
            invoice_items ( id, item_name, description, quantity, price, total, order_id )
          `)
          .eq('id', invoiceId)
          .eq('business_id', bizId)
          .single()

        if (invoiceError) throw invoiceError
        setInvoice(invoiceData)
        setCustomer(invoiceData.customers)
        setItems(invoiceData.invoice_items || [])

        const { data: bizData } = await supabase
          .from('businesses')
          .select('*')
          .eq('id', bizId)
          .single()
        setBusiness(bizData)

        if (bizData?.logo_url) {
          const img = new Image()
          img.crossOrigin = 'anonymous'
          img.src = bizData.logo_url
          img.onload = () => {
            const canvas = document.createElement('canvas')
            canvas.width = img.width
            canvas.height = img.height
            const ctx = canvas.getContext('2d')
            ctx.drawImage(img, 0, 0)
            setLogoDataUrl(canvas.toDataURL('image/png'))
          }
        }

        setCustomNote(invoiceData.custom_note || '')
        setDueDate(invoiceData.due_date || '')
        setBankName(invoiceData.bank_name || bizData?.bank_name || '')
        setAccountNumber(invoiceData.account_number || bizData?.account_number || '')
        setAccountName(invoiceData.account_name || bizData?.account_name || '')
        setCacNumber(invoiceData.cac_number || bizData?.cac_number || '')
        setTinNumber(bizData?.tin_number || '')
      } catch (err) {
        console.error(err)
        setError('Could not load invoice.')
      } finally {
        setLoading(false)
      }
    }
    fetchInvoice()
  }, [invoiceId, router])

  const formatMoney = (val) => `₦${Number(val || 0).toLocaleString('en-NG')}`
  const formatDate = (dateStr) => dateStr ? new Date(dateStr).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'

  const balance = invoice ? Number(invoice.total) - Number(invoice.amount_paid) : 0
  const isPaid = balance <= 0

  const handleSaveEdits = async () => {
    if (!invoice) return
    setSavingEdits(true)
    try {
      const { error } = await supabase
        .from('invoices')
        .update({
          custom_note: customNote,
          due_date: dueDate,
          bank_name: bankName,
          account_number: accountNumber,
          account_name: accountName,
          cac_number: cacNumber,
        })
        .eq('id', invoice.id)
      if (error) throw error
      alert('Invoice updated successfully.')
    } catch (err) {
      console.error(err)
      alert('Failed to save changes.')
    } finally {
      setSavingEdits(false)
    }
  }

  const handleRecordPayment = async (e) => {
    e.preventDefault()
    const amount = parseFloat(paymentAmount)
    if (!amount || amount <= 0) { alert('Enter a valid amount.'); return }
    if (amount > balance) { alert(`Amount exceeds balance (${formatMoney(balance)}).`); return }
    setSavingPayment(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const { error: payError } = await supabase
        .from('payment_records')
        .insert({
          business_id: businessId,
          customer_id: customer?.id,
          invoice_id: invoice.id,
          amount: amount,
          note: paymentNote || 'Payment recorded',
          created_by: session.user.id,
        })
      if (payError) throw payError

      const newPaid = Number(invoice.amount_paid) + amount
      const newStatus = newPaid >= Number(invoice.total) ? 'paid' : 'partial'
      await supabase.from('invoices').update({ amount_paid: newPaid, status: newStatus }).eq('id', invoice.id)

      const linkedOrderIds = items.map(i => i.order_id).filter(Boolean)
      for (const orderId of linkedOrderIds) {
        const { data: order } = await supabase.from('orders').select('amount_paid').eq('id', orderId).single()
        if (order) {
          const newOrderPaid = Number(order.amount_paid || 0) + amount
          await supabase.from('orders').update({ amount_paid: newOrderPaid }).eq('id', orderId)
        }
      }

      const { data: freshInvoice } = await supabase
        .from('invoices')
        .select(`
          *,
          customers ( id, name, first_name, last_name, phone, email, address ),
          invoice_items ( id, item_name, description, quantity, price, total, order_id )
        `)
        .eq('id', invoice.id)
        .single()
      setInvoice(freshInvoice)
      setCustomer(freshInvoice.customers)
      setItems(freshInvoice.invoice_items || [])

      setShowPaymentModal(false)
      setPaymentAmount('')
      setPaymentNote('')
      alert('Payment recorded successfully.')
    } catch (err) {
      console.error(err)
      alert('Failed to record payment.')
    } finally {
      setSavingPayment(false)
    }
  }

  const generatePdfBlob = async () => {
    if (!invoiceRef.current) return null
    await new Promise(resolve => setTimeout(resolve, 100))
    const canvas = await html2canvas(invoiceRef.current, { scale: 2, backgroundColor: '#ffffff' })
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
      link.download = `${invoice.invoice_number}.pdf`
      link.click()
      URL.revokeObjectURL(url)
    } catch (err) { alert('Failed to generate PDF.') }
  }

  const handleShareWhatsApp = async () => {
    if (!customer?.phone) { alert('Customer has no phone number.'); return }
    const message = `Hi ${customer.name || customer.first_name}, here is your invoice ${invoice.invoice_number}. Total: ${formatMoney(invoice.total)}. Thank you for your business!`
    try {
      const pdfBlob = await generatePdfBlob()
      const fileName = `${invoice.invoice_number}.pdf`
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [new File([pdfBlob], fileName)] })) {
        await navigator.share({
          title: `Invoice ${invoice.invoice_number}`,
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

  const handlePrint = () => { window.print() }

  if (loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--cresoa-bg)' }}><div className="cresoa-loading-spinner" /></div>
  if (error || !invoice) return (
    <div style={{ minHeight: '70vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', textAlign: 'center' }}>
      <Svg name="x" size={30} stroke="var(--cresoa-danger)" />
      <h2>Couldn't load invoice</h2>
      <p>{error || 'Invoice not found'}</p>
      <button onClick={() => router.push(`/dashboard/invoices?business_id=${businessId}`)} className="cresoa-primary-button">Back</button>
    </div>
  )

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto', paddingBottom: '120px' }}>
      <Navigation businessId={businessId} />
      <button onClick={() => router.push(`/dashboard/invoices?business_id=${businessId}`)} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cresoa-text-muted)', marginBottom: '1rem' }}>
        <Svg name="back" size={16} stroke="currentColor" /> Back to Invoices
      </button>

      <div style={{ display: isDesktop ? 'grid' : 'block', gridTemplateColumns: isDesktop ? '1fr 280px' : '1fr', gap: '1.5rem' }}>
        {/* MAIN INVOICE AREA */}
        <div>
          {/* Invoice Preview (For PDF & Print) */}
          <div id="invoice-print-area" ref={invoiceRef} style={{ background: '#fff', borderRadius: '12px', border: '1px solid var(--cresoa-border)', padding: '1.5rem', marginBottom: '1rem', color: '#1a1a1a' }}>
            {/* Header */}
            <div style={{ borderBottom: '2px solid var(--cresoa-accent)', paddingBottom: '0.75rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {logoDataUrl ? <img src={logoDataUrl} alt={business?.name} style={{ width: '80px', height: '80px', objectFit: 'contain' }} /> : <div style={{ width: '80px', height: '80px', borderRadius: '6px', background: 'var(--cresoa-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700 }}>{business?.name?.charAt(0) || 'B'}</div>}
                <div>
                  <h2 style={{ margin: 0, color: 'var(--cresoa-primary)', fontSize: '1.2rem' }}>{business?.name || 'Business'}</h2>
                  {business?.location && <p style={{ margin: '2px 0', color: '#666', fontSize: '0.8rem' }}>{business.location}</p>}
                  {business?.phone && <p style={{ margin: '2px 0', color: '#666', fontSize: '0.8rem' }}>{business.phone}</p>}
                  {business?.email && <p style={{ margin: '2px 0', color: '#666', fontSize: '0.8rem' }}>{business.email}</p>}
                  {/* TIN & CAC Below Phone/Email */}
                  {(tinNumber || cacNumber) && (
                    <div style={{ marginTop: '2px' }}>
                      {tinNumber && <p style={{ margin: '0', color: '#666', fontSize: '0.75rem' }}>TIN: {tinNumber}</p>}
                      {cacNumber && <p style={{ margin: '0', color: '#666', fontSize: '0.75rem' }}>CAC: {cacNumber}</p>}
                    </div>
                  )}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <h3 style={{ margin: 0 }}>INVOICE <span style={{ fontSize: '0.8rem', fontWeight: 400 }}>(NGN)</span> #{invoice.invoice_number}</h3>
                <p style={{ margin: '2px 0', color: '#666', fontSize: '0.8rem' }}>Issued: {formatDate(invoice.issue_date)}</p>
                <p style={{ margin: '2px 0', color: '#666', fontSize: '0.8rem' }}>Due: {formatDate(dueDate)}</p>
                <span style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600, background: isPaid ? '#e6f4ea' : '#fff3e0', color: isPaid ? '#1e7e34' : '#e65100' }}>{isPaid ? 'PAID' : 'BALANCE DUE'}</span>
              </div>
            </div>

            {/* Billed To */}
            {customer && (
              <div style={{ marginBottom: '1rem' }}>
                <p style={{ margin: 0, color: '#666', fontSize: '0.7rem', fontWeight: 700 }}>BILL TO</p>
                <p style={{ margin: 0, fontWeight: 600 }}>{customer.name || customer.first_name}</p>
                {customer.phone && <p style={{ margin: 0, color: '#666', fontSize: '0.8rem' }}>{customer.phone}</p>}
                {customer.email && <p style={{ margin: 0, color: '#666', fontSize: '0.8rem' }}>{customer.email}</p>}
                {customer.address && <p style={{ margin: 0, color: '#666', fontSize: '0.8rem' }}>{customer.address}</p>}
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
                {items.map((item, i) => (
                  <tr key={i}>
                    <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>
                      {item.item_name}
                      {item.description && <div style={{ color: '#666', fontSize: '0.75rem' }}>{item.description}</div>}
                    </td>
                    <td style={{ padding: '8px', textAlign: 'center', borderBottom: '1px solid #eee' }}>{item.quantity}</td>
                    <td style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid #eee' }}>{formatMoney(item.price)}</td>
                    <td style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid #eee', fontWeight: 600 }}>{formatMoney(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
              <div style={{ width: '220px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}><span>Subtotal</span><span>{formatMoney(invoice.subtotal)}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid #eee', padding: '8px 0', fontWeight: 700 }}><span>Total</span><span>{formatMoney(invoice.total)}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', color: 'green' }}><span>Paid</span><span>{formatMoney(invoice.amount_paid)}</span></div>
              </div>
            </div>

            {/* Amount Due Box */}
            <div style={{ marginBottom: '1rem', padding: '0.75rem', background: isPaid ? '#e6f4ea' : '#fff3e0', borderRadius: '8px', border: `1px solid ${isPaid ? 'var(--cresoa-success)' : 'var(--cresoa-danger)'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, color: isPaid ? 'var(--cresoa-success)' : 'var(--cresoa-danger)' }}>{isPaid ? 'AMOUNT PAID' : 'AMOUNT DUE'}</span>
                <span style={{ fontWeight: 800, fontSize: '1.2rem', color: isPaid ? 'var(--cresoa-success)' : 'var(--cresoa-danger)' }}>{formatMoney(isPaid ? invoice.total : balance)}</span>
              </div>
            </div>

            {/* Payment Details */}
            <div style={{ marginBottom: '1rem', padding: '0.75rem', background: '#f8f9fa', borderRadius: '8px', border: '1px solid #eee', fontSize: '0.85rem' }}>
              <strong>PAYMENT DETAILS</strong>
              <div>Bank: {bankName || 'N/A'} | Acct: {accountNumber || 'N/A'} | Name: {accountName || 'N/A'}</div>
            </div>

            {customNote && <p style={{ fontStyle: 'italic', color: '#666', fontSize: '0.85rem' }}>{customNote}</p>}

            <p style={{ textAlign: 'center', color: '#999', fontSize: '0.7rem', borderTop: '1px solid #eee', paddingTop: '0.5rem', marginTop: '0.5rem' }}>
              Powered by Cresoa — Business management made simple.
            </p>
          </div>

          {/* Editable Section (Hidden on print) */}
    <div className="no-print" style={{ background: 'var(--cresoa-surface)', borderRadius: '12px', border: '1px solid var(--cresoa-border)', padding: '1rem', marginBottom: '1rem' }}>
            <h3 style={{ margin: '0 0 0.75rem', color: 'var(--cresoa-text)', fontSize: '1rem' }}>Edit Invoice Details</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div><label style={{ fontSize: '0.75rem', color: 'var(--cresoa-text-muted)' }}>Due Date</label><input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} style={{ width: '100%', padding: '0.4rem', borderRadius: '6px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-bg)', color: 'var(--cresoa-text)' }} /></div>
              <div><label style={{ fontSize: '0.75rem', color: 'var(--cresoa-text-muted)' }}>Custom Note</label><input type="text" value={customNote} onChange={(e) => setCustomNote(e.target.value)} style={{ width: '100%', padding: '0.4rem', borderRadius: '6px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-bg)', color: 'var(--cresoa-text)' }} /></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div><label style={{ fontSize: '0.75rem', color: 'var(--cresoa-text-muted)' }}>Bank Name</label><input type="text" value={bankName} onChange={(e) => setBankName(e.target.value)} style={{ width: '100%', padding: '0.4rem', borderRadius: '6px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-bg)', color: 'var(--cresoa-text)' }} /></div>
              <div><label style={{ fontSize: '0.75rem', color: 'var(--cresoa-text-muted)' }}>Account Number (10 digits)</label><input type="text" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, '').slice(0, 10))} style={{ width: '100%', padding: '0.4rem', borderRadius: '6px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-bg)', color: 'var(--cresoa-text)' }} /></div>
              <div><label style={{ fontSize: '0.75rem', color: 'var(--cresoa-text-muted)' }}>Account Name</label><input type="text" value={accountName} onChange={(e) => setAccountName(e.target.value)} style={{ width: '100%', padding: '0.4rem', borderRadius: '6px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-bg)', color: 'var(--cresoa-text)' }} /></div>
            </div>
            <div style={{ marginBottom: '0.75rem' }}>
              <label style={{ fontSize: '0.75rem', color: 'var(--cresoa-text-muted)' }}>CAC Number (Optional)</label>
              <input type="text" value={cacNumber} onChange={(e) => setCacNumber(e.target.value)} placeholder="e.g. RC-12345" style={{ width: '100%', padding: '0.4rem', borderRadius: '6px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-bg)', color: 'var(--cresoa-text)' }} />
            </div>
            <button onClick={handleSaveEdits} disabled={savingEdits} className="cresoa-primary-button" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}>{savingEdits ? 'Saving...' : 'Save Changes'}</button>
          </div>
        </div>

        {/* QUICK ACTIONS SIDEBAR (Desktop only) */}
        {isDesktop && (
          <div className="no-print" style={{ position: 'sticky', top: '20px', alignSelf: 'start' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--cresoa-text)', margin: '0 0 0.75rem' }}>QUICK ACTIONS</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <button onClick={handleDownloadPDF} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-surface)', color: 'var(--cresoa-text)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>
                <Svg name="download" size={16} stroke="currentColor" /> Download PDF
              </button>
              <button onClick={handleShareWhatsApp} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-surface)', color: 'var(--cresoa-text)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>
                <Svg name="whatsapp" size={16} stroke="currentColor" /> Send via WhatsApp
              </button>
              <button onClick={handlePrint} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-surface)', color: 'var(--cresoa-text)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>
                <Svg name="printer" size={16} stroke="currentColor" /> Print
              </button>
              <button onClick={() => setShowPaymentModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-surface)', color: 'var(--cresoa-text)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>
                <Svg name="card" size={16} stroke="currentColor" /> Record Payment
              </button>
            </div>
          </div>
        )}
      </div>

      {/* QUICK ACTIONS MOBILE LIST (Below page content) */}
      {!isDesktop && (
        <div className="no-print" style={{ marginTop: '1rem' }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--cresoa-text)', margin: '0 0 0.75rem' }}>QUICK ACTIONS</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <button onClick={handleDownloadPDF} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', borderRadius: '12px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-surface)', color: 'var(--cresoa-text)', cursor: 'pointer', width: '100%', textAlign: 'left' }}>
              <Svg name="download" size={20} stroke="var(--cresoa-accent)" />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>Download PDF</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--cresoa-text-muted)' }}>Save invoice as PDF</div>
              </div>
              <Svg name="chevron" size={16} stroke="var(--cresoa-text-muted)" />
            </button>
            <button onClick={handleShareWhatsApp} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', borderRadius: '12px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-surface)', color: 'var(--cresoa-text)', cursor: 'pointer', width: '100%', textAlign: 'left' }}>
              <Svg name="whatsapp" size={20} stroke="var(--cresoa-accent)" />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>Send via WhatsApp</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--cresoa-text-muted)' }}>Share invoice with customer</div>
              </div>
              <Svg name="chevron" size={16} stroke="var(--cresoa-text-muted)" />
            </button>
            <button onClick={handlePrint} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', borderRadius: '12px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-surface)', color: 'var(--cresoa-text)', cursor: 'pointer', width: '100%', textAlign: 'left' }}>
              <Svg name="printer" size={20} stroke="var(--cresoa-accent)" />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>Print</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--cresoa-text-muted)' }}>Print or save as PDF</div>
              </div>
              <Svg name="chevron" size={16} stroke="var(--cresoa-text-muted)" />
            </button>
            <button onClick={() => setShowPaymentModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', borderRadius: '12px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-surface)', color: 'var(--cresoa-text)', cursor: 'pointer', width: '100%', textAlign: 'left' }}>
              <Svg name="card" size={20} stroke="var(--cresoa-accent)" />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>Record Payment</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--cresoa-text-muted)' }}>Add a new payment</div>
              </div>
              <Svg name="chevron" size={16} stroke="var(--cresoa-text-muted)" />
            </button>
          </div>
        </div>
      )}

      {/* Payment Modal (Responsive) */}
      {showPaymentModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }} onClick={() => setShowPaymentModal(false)}>
          <form onClick={(e) => e.stopPropagation()} onSubmit={handleRecordPayment} style={{ background: 'var(--cresoa-surface)', border: '1px solid var(--cresoa-border)', borderRadius: '16px', padding: '1.5rem', width: '100%', maxWidth: '480px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 12px 40px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, color: 'var(--cresoa-text)' }}>Record Payment</h3>
              <button type="button" onClick={() => setShowPaymentModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cresoa-text-muted)' }}>
                <Svg name="x" size={20} stroke="currentColor" />
              </button>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.3rem', color: 'var(--cresoa-text)' }}>Amount (₦)</label>
              <input type="number" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} placeholder={`Max ${formatMoney(balance)}`} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-bg)', color: 'var(--cresoa-text)', fontSize: '1rem', outline: 'none', boxSizing: 'border-box' }} required />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.3rem', color: 'var(--cresoa-text)' }}>Note (optional)</label>
              <input type="text" value={paymentNote} onChange={(e) => setPaymentNote(e.target.value)} placeholder="e.g. Cash payment" style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-bg)', color: 'var(--cresoa-text)', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button type="button" onClick={() => setShowPaymentModal(false)} style={{ padding: '0.6rem 1.2rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'transparent', color: 'var(--cresoa-text)', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
              <button type="submit" disabled={savingPayment} className="cresoa-primary-button" style={{ padding: '0.6rem 1.5rem', opacity: savingPayment ? '0.7' : '1' }}>{savingPayment ? 'Recording...' : 'Save Payment'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
