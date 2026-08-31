'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { supabase } from '../../../../../lib/supabaseClient'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import FileUpload from '../../../../../components/FileUpload'

// ─── Self-contained SVG Icons ───
const Svg = ({ name, size = 20, stroke = 'currentColor', style }) => {
  const icons = {
    back: <><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></>,
    card: <><rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><line x1="1" y1="10" x2="23" y2="10" /></>,
    arrow: <><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></>,
    whatsapp: <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />,
    edit: <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />,
    file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></>,
    link: <><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></>,
    copy: <><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></>,
    upload: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></>,
    check: <polyline points="20 6 9 17 4 12" />,
    x: <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>,
    trash: <><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></>,
    printer: <><polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="8" /></>,
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>{icons[name]}</svg>
}

// ─── Constants ───
const STAGES = ['quote','awaiting_deposit','designing','awaiting_approval','in_production','quality_check','ready','delivered']
const STAGE_LABELS = { quote:'Quote', awaiting_deposit:'Awaiting Deposit', designing:'Designing', awaiting_approval:'Awaiting Approval', in_production:'In Production', quality_check:'Quality Check', ready:'Ready', delivered:'Delivered' }

const formatMoney = (val) => `₦${Number(val || 0).toLocaleString('en-NG')}`
const formatDate = (dateStr) => dateStr ? new Date(dateStr).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Not set'

// ─── Helper Component ───
const DetailRow = ({ label, value, highlight }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px solid var(--cresoa-border)', background: highlight ? 'var(--cresoa-warning-soft)' : 'transparent', borderRadius: '4px' }}>
    <span style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.85rem' }}>{label}</span>
    <span style={{ fontSize: '0.9rem', fontWeight: 600, textAlign: 'right', maxWidth: '65%', wordBreak: 'break-word', color: highlight ? 'var(--cresoa-warning)' : 'var(--cresoa-text)' }}>{value}</span>
  </div>
)

export default function PrintJobDetailPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const jobId = params.id
  const businessIdFromUrl = searchParams?.get('business_id')

  const [businessId, setBusinessId] = useState(null)
  const [job, setJob] = useState(null)
  const [customer, setCustomer] = useState(null)
  const [business, setBusiness] = useState(null)
  const [items, setItems] = useState([])
  const [files, setFiles] = useState([])
  const [revisions, setRevisions] = useState([])
  const [payments, setPayments] = useState([])
  const [invoices, setInvoices] = useState([])
  const [trackingLink, setTrackingLink] = useState('')

  const [showStatusModal, setShowStatusModal] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentNote, setPaymentNote] = useState('')
  const [savingPayment, setSavingPayment] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [copied, setCopied] = useState(false)
  const [pdfLoading, setPdfLoading] = useState(false)

  const [isMobile, setIsMobile] = useState(false)
  const quotationRef = useRef(null)

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
    const fetchAll = async () => {
      if (!jobId || !businessIdFromUrl) return
      try {
        const { data: jobData, error: jobError } = await supabase
          .from('print_jobs')
          .select('*')
          .eq('id', jobId)
          .eq('business_id', businessIdFromUrl)
          .maybeSingle()
        if (jobError) throw jobError
        if (!jobData) throw new Error('Print job not found')
        setJob(jobData)

        if (jobData.customer_id) {
          const { data: cust } = await supabase.from('customers').select('*').eq('id', jobData.customer_id).maybeSingle()
          setCustomer(cust)
        }

        const { data: biz } = await supabase.from('businesses').select('*').eq('id', businessIdFromUrl).maybeSingle()
        setBusiness(biz)

        const { data: filesData } = await supabase
          .from('job_files')
          .select('*')
          .eq('job_id', jobId)
          .order('created_at', { ascending: false })
        setFiles(filesData || [])

        const { data: revisionsData } = await supabase
          .from('job_revisions')
          .select('*')
          .eq('job_id', jobId)
          .order('created_at', { ascending: false })
        setRevisions(revisionsData || [])

        const { data: paymentsData } = await supabase
          .from('payment_records')
          .select('*')
          .eq('job_id', jobId)
          .order('created_at', { ascending: false })
        setPayments(paymentsData || [])

        const { data: invoicesData } = await supabase
          .from('invoices')
          .select('*')
          .eq('job_id', jobId)
        setInvoices(invoicesData || [])

        if (jobData.tracking_token) {
          setTrackingLink(`${window.location.origin}/track/${jobData.tracking_token}`)
        }
      } catch (err) {
        console.error('Fetch error:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchAll()
  }, [jobId, businessIdFromUrl])

  const [loading, setLoading] = useState(true)

  const balance = job ? Math.max(0, Number(job.total) - Number(job.amount_paid)) : 0
  const isPaid = balance <= 0
  const isDelivered = job?.status === 'delivered'

  // Status update
  const handleUpdateStatus = async (status) => {
    if (!status || status === job.status) { setShowStatusModal(false); return }
    setUpdatingStatus(true)
    try {
      const { error } = await supabase.from('print_jobs').update({ status, updated_at: new Date().toISOString() }).eq('id', job.id)
      if (error) throw error
      setJob(prev => ({ ...prev, status }))
      setShowStatusModal(false)
    } catch (err) {
      alert('Failed to update status.')
    } finally { setUpdatingStatus(false) }
  }

  // Payment record
  const handleRecordPayment = async (e) => {
    e.preventDefault()
    const amount = parseFloat(paymentAmount)
    if (!amount || amount <= 0) { alert('Enter a valid amount.'); return }
    if (amount > balance) { alert(`Amount exceeds balance (${formatMoney(balance)})`); return }
    setSavingPayment(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const { error: payError } = await supabase.from('payment_records').insert({
        business_id: businessIdFromUrl,
        customer_id: job.customer_id,
        job_id: job.id,
        amount,
        note: paymentNote || 'Job payment',
        created_by: session.user.id,
      })
      if (payError) throw payError

      const newPaid = Number(job.amount_paid || 0) + amount
      await supabase.from('print_jobs').update({ amount_paid: newPaid, updated_at: new Date().toISOString() }).eq('id', job.id)
      setJob(prev => ({ ...prev, amount_paid: newPaid }))
      setPaymentAmount(''); setPaymentNote(''); setShowPaymentModal(false)
      alert('Payment recorded successfully.')
    } catch (err) {
      alert('Failed to record payment.')
    } finally { setSavingPayment(false) }
  }

  // Tracking link
  const generateTrackingLink = async () => {
    try {
      const token = Math.random().toString(36).substring(2, 10) + Date.now().toString(36)
      const { error } = await supabase.from('print_jobs').update({ tracking_token: token, updated_at: new Date().toISOString() }).eq('id', job.id)
      if (error) throw error
      const link = `${window.location.origin}/track/${token}`
      setTrackingLink(link)
      setJob(prev => ({ ...prev, tracking_token: token }))
      alert('Tracking link generated!')
    } catch (err) {
      alert('Failed to generate link.')
    }
  }

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(trackingLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { alert('Could not copy') }
  }

  // WhatsApp share
  const shareWhatsApp = (type = 'status') => {
    if (!customer?.phone) { alert('Customer has no phone number.'); return }
    const customerName = customer.name || customer.first_name || 'Customer'
    let message = ''
    if (type === 'tracking' && trackingLink) {
      message = `Hi ${customerName}, here is the tracking link for your **${job.title}**: ${trackingLink}`
    } else if (type === 'invoice') {
      message = `Hi ${customerName}, here is your invoice for **${job.title}**.`
    } else {
      message = `Hi ${customerName}, your **${job.title}** is now ${STAGE_LABELS[job.status]}.`
    }
    const url = `https://wa.me/${customer.phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`
    window.open(url, '_blank')
  }

  // ─── EXACT PDF LOGIC (From Invoice Page) ───
  const generatePdfBlob = async () => {
    if (!quotationRef.current) return null
    setPdfLoading(true)
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
    setPdfLoading(false)
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
      link.download = `${job.job_number}.pdf`
      link.click()
      URL.revokeObjectURL(url)
    } catch (err) { alert('Failed to generate PDF.') }
  }

  const handleShareWhatsApp = async () => {
    if (!customer?.phone) { alert('Customer has no phone number.'); return }
    try {
      const pdfBlob = await generatePdfBlob()
      const fileName = `${job.job_number}.pdf`
      const file = new File([pdfBlob], fileName, { type: 'application/pdf' })
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file] })
      } else {
        const url = URL.createObjectURL(pdfBlob)
        const link = document.createElement('a')
        link.href = url
        link.download = fileName
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        setTimeout(() => URL.revokeObjectURL(url), 1000)
        alert('PDF downloaded. Please attach it to WhatsApp.')
      }
    } catch (err) {
      console.error('Share failed:', err)
      alert('Failed to share PDF.')
    }
  }

  const handlePrint = () => { window.print() }

  // Edit logic
  const [isEditing, setIsEditing] = useState(false)
  const [editItems, setEditItems] = useState([])

  const handleEditItem = (index, field, value) => {
    setEditItems(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item))
  }

  const handleSaveEdit = async () => {
    try {
      const { error } = await supabase.from('print_jobs').update({
        items: editItems.map(i => ({ ...i, total: Number(i.quantity) * Number(i.unit_price) })),
        subtotal: editItems.reduce((s, i) => s + (Number(i.quantity) * Number(i.unit_price)), 0),
        total: editItems.reduce((s, i) => s + (Number(i.quantity) * Number(i.unit_price)), 0),
      }).eq('id', job.id)
      if (error) throw error
      setJob(prev => ({ ...prev, items: editItems.map(i => ({ ...i, total: Number(i.quantity) * Number(i.unit_price) })), subtotal: editItems.reduce((s, i) => s + (Number(i.quantity) * Number(i.unit_price)), 0), total: editItems.reduce((s, i) => s + (Number(i.quantity) * Number(i.unit_price)), 0) }))
      setItems(editItems.map(i => ({ ...i, total: Number(i.quantity) * Number(i.unit_price) })))
      setIsEditing(false)
      alert('Job updated successfully!')
    } catch (err) {
      alert('Failed to update job.')
    }
  }

  if (loading) {
    return <div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'var(--cresoa-bg)' }}><div className="cresoa-loading-spinner" /></div>
  }

  if (!job) {
    return (
      <div style={{ minHeight: '70vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--cresoa-bg)', textAlign: 'center' }}>
        <h2>Couldn't load job</h2>
        <button onClick={() => router.push(`/dashboard/printing/jobs?business_id=${businessIdFromUrl}`)} className="cresoa-primary-button">Back to Jobs</button>
      </div>
    )
  }

  const customerName = customer?.name || customer?.first_name || 'Customer'
  const statusColors = { quote: 'var(--cresoa-text-muted)', awaiting_deposit: 'var(--cresoa-warning)', designing: 'var(--cresoa-info)', awaiting_approval: 'var(--cresoa-warning)', in_production: 'var(--cresoa-accent)', quality_check: 'var(--cresoa-info)', ready: 'var(--cresoa-success)', delivered: 'var(--cresoa-success)' }

  return (
    <div style={{ padding: '1rem', maxWidth: '1200px', margin: '0 auto', paddingBottom: '120px', background: 'var(--cresoa-bg)', minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <button onClick={() => router.push(`/dashboard/printing/jobs?business_id=${businessIdFromUrl}`)} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cresoa-text-muted)' }}><Svg name="back" size={16} stroke="currentColor" /> Back</button>
        {!isEditing && (
          <button onClick={() => setIsEditing(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.4rem 1rem', borderRadius: '8px', border: '1px solid var(--cresoa-accent)', background: 'var(--cresoa-accent-soft)', color: 'var(--cresoa-accent)', fontWeight: 600, cursor: 'pointer' }}><Svg name="edit" size={14} stroke="currentColor" /> Edit</button>
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
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>{job.title || 'Untitled Job'}</h1>
          <p style={{ color: 'var(--cresoa-text-muted)', margin: '0.2rem 0 0' }}>{customerName} · {job.job_number}</p>
        </div>
        <span style={{ padding: '0.3rem 0.8rem', borderRadius: '12px', background: `${statusColors[job.status] || '#666'}20`, color: statusColors[job.status] || '#666', fontWeight: 700, textTransform: 'capitalize' }}>{STAGE_LABELS[job.status] || job.status}</span>
      </div>

      {/* Quick Actions (primary) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '1rem' }}>
        <button onClick={() => router.push(`/dashboard/printing/invoices/new?job_id=${job.id}&business_id=${businessIdFromUrl}`)} className="cresoa-primary-button"><Svg name="file" size={16} stroke="#fff" /> Invoice</button>
        <button onClick={() => shareWhatsApp('status')} className="cresoa-primary-button" style={{ background: '#25D366' }}><Svg name="whatsapp" size={16} stroke="#fff" /> WhatsApp</button>
      </div>

      {/* Financials */}
      <div style={{ background: 'var(--cresoa-surface)', borderRadius: '16px', padding: '1.2rem', marginBottom: '1rem', border: '1px solid var(--cresoa-border)' }}>
        <h3 style={{ margin: '0 0 0.8rem', fontSize: '1rem', fontWeight: 800 }}>💰 Financials</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.8rem' }}>
          <div style={{ padding: '0.6rem', background: 'var(--cresoa-surface-soft)', borderRadius: '8px', textAlign: 'center' }}>
            <div style={{ fontSize: '0.65rem', color: 'var(--cresoa-text-muted)' }}>Total</div>
            <div style={{ fontWeight: 700, fontSize: '1rem' }}>{formatMoney(job.total)}</div>
          </div>
          <div style={{ padding: '0.6rem', background: 'var(--cresoa-surface-soft)', borderRadius: '8px', textAlign: 'center' }}>
            <div style={{ fontSize: '0.65rem', color: 'var(--cresoa-text-muted)' }}>Paid</div>
            <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--cresoa-success)' }}>{formatMoney(job.amount_paid)}</div>
          </div>
        </div>
        <div style={{ padding: '1rem', borderRadius: '12px', background: isPaid ? 'var(--cresoa-success-soft)' : 'var(--cresoa-danger-soft)', border: `1px solid ${isPaid ? 'var(--cresoa-success)' : 'var(--cresoa-danger)'}`, textAlign: 'center' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: isPaid ? 'var(--cresoa-success)' : 'var(--cresoa-danger)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{isPaid ? 'Paid in Full' : 'Balance Due'}</div>
          <div style={{ fontSize: '2rem', fontWeight: 900, color: isPaid ? 'var(--cresoa-success)' : 'var(--cresoa-danger)' }}>{formatMoney(balance)}</div>
        </div>
        {invoices.length > 0 && (
          <div style={{ marginTop: '0.8rem' }}>
            {invoices.map(inv => (
              <button key={inv.id} onClick={() => router.push(`/dashboard/printing/invoices/${inv.id}?business_id=${businessIdFromUrl}`)} style={{ display: 'block', width: '100%', padding: '0.4rem', background: 'var(--cresoa-bg)', border: '1px solid var(--cresoa-border)', borderRadius: '6px', marginBottom: '0.3rem', textAlign: 'left', cursor: 'pointer', color: 'var(--cresoa-text)' }}>{inv.invoice_number} · {formatMoney(inv.total)}</button>
            ))}
          </div>
        )}
      </div>

      {/* Production */}
      <div style={{ background: 'var(--cresoa-surface)', borderRadius: '16px', padding: '1.2rem', marginBottom: '1rem', border: '1px solid var(--cresoa-border)' }}>
        <h3 style={{ margin: '0 0 0.8rem', fontSize: '1rem', fontWeight: 800 }}>🔄 Production</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          {STAGES.map((stage, idx) => {
            const isComplete = STAGES.indexOf(job.status) >= idx
            const isCurrent = job.status === stage
            return (
              <div key={stage} style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', flex: 1, minWidth: '70px' }}>
                <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: isComplete ? 'var(--cresoa-success)' : 'var(--cresoa-border)', color: isComplete ? '#fff' : 'var(--cresoa-text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.7rem' }}>{idx + 1}</div>
                <span style={{ fontSize: '0.6rem', textAlign: 'center', color: isCurrent ? 'var(--cresoa-text)' : 'var(--cresoa-text-muted)', fontWeight: isCurrent ? 700 : 400 }}>{STAGE_LABELS[stage]}</span>
                {idx < STAGES.length - 1 && <div style={{ flex: 1, height: '2px', background: isComplete ? 'var(--cresoa-success)' : 'var(--cresoa-border)' }} />}
              </div>
            )
          })}
        </div>
        <button onClick={() => setShowStatusModal(true)} className="cresoa-primary-button" style={{ width: '100%', justifyContent: 'center' }}><Svg name="arrow" size={16} stroke="#fff" /> Update Stage</button>
      </div>

      {/* Customer Tracking */}
      <div style={{ background: 'var(--cresoa-surface)', borderRadius: '16px', padding: '1.2rem', marginBottom: '1rem', border: '1px solid var(--cresoa-border)' }}>
        <h3 style={{ margin: '0 0 0.8rem', fontSize: '1rem', fontWeight: 800 }}>🔗 Customer Tracking</h3>
        {trackingLink ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem', background: 'var(--cresoa-bg)', borderRadius: '8px', border: '1px solid var(--cresoa-border)', marginBottom: '0.5rem' }}>
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.8rem' }}>{trackingLink}</span>
              <button onClick={copyLink} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cresoa-text-muted)' }}>{copied ? <Svg name="check" size={16} stroke="green" /> : <Svg name="copy" size={16} stroke="currentColor" />}</button>
            </div>
            <button onClick={() => shareWhatsApp('tracking')} className="cresoa-primary-button" style={{ width: '100%', background: '#25D366', justifyContent: 'center' }}><Svg name="whatsapp" size={16} stroke="#fff" /> Share via WhatsApp</button>
          </>
        ) : (
          <button onClick={generateTrackingLink} className="cresoa-primary-button" style={{ width: '100%', background: 'var(--cresoa-primary)', justifyContent: 'center' }}><Svg name="link" size={16} stroke="#fff" /> Generate Tracking Link</button>
        )}
      </div>

      {/* Design & Files */}
      <div style={{ background: 'var(--cresoa-surface)', borderRadius: '16px', padding: '1.2rem', marginBottom: '1rem', border: '1px solid var(--cresoa-border)' }}>
        <h3 style={{ margin: '0 0 0.8rem', fontSize: '1rem', fontWeight: 800 }}>🎨 Design & Files</h3>
        <FileUpload
          jobId={job.id}
          businessId={businessIdFromUrl}
          sector="printing"
          label="Upload Artwork"
          onUploaded={async () => {
            const { data: freshFiles } = await supabase
              .from('job_files')
              .select('*')
              .eq('job_id', jobId)
              .order('created_at', { ascending: false })
            setFiles(freshFiles || [])
          }}
        />
        {files.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.8rem' }}>
            {files.map(file => (
              <div key={file.id} style={{ padding: '0.4rem', background: 'var(--cresoa-bg)', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid var(--cresoa-border)' }}>
                <span style={{ fontSize: '0.8rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>{file.filename}</span>
                <a href={file.file_url} target="_blank" rel="noopener" style={{ color: 'var(--cresoa-accent)', fontSize: '0.8rem' }}>View</a>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.85rem', margin: '0.8rem 0 0' }}>No files uploaded yet. Upload artwork, reference images, or documents.</p>
        )}
      </div>

      {/* Job Information */}
      <div style={{ background: 'var(--cresoa-surface)', borderRadius: '16px', padding: '1.2rem', marginBottom: '1rem', border: '1px solid var(--cresoa-border)' }}>
        <h3 style={{ margin: '0 0 0.8rem', fontSize: '1rem', fontWeight: 800 }}>📋 Job Information</h3>
        <DetailRow label="Job Type" value={job.job_type || '—'} />
        <DetailRow label="Quantity" value={job.quantity || '—'} />
        <DetailRow label="Specifications" value={job.specifications?.specs || '—'} />
        <DetailRow label="Price" value={formatMoney(job.total)} />
        <DetailRow label="Deadline" value={job.deadline ? formatDate(job.deadline) : 'Not set'} highlight={!job.deadline} />
        <DetailRow label="Delivery" value={job.delivery_method === 'delivery' ? (job.delivery_address || 'Business Delivery') : 'Customer Pickup'} />
        <DetailRow label="Created" value={formatDate(job.created_at)} />
        {job.notes && <DetailRow label="Notes" value={job.notes} />}
      </div>

      {/* Delivery / Pickup */}
      <div style={{ background: 'var(--cresoa-surface)', borderRadius: '16px', padding: '1.2rem', marginBottom: '1rem', border: '1px solid var(--cresoa-border)' }}>
        <h3 style={{ margin: '0 0 0.8rem', fontSize: '1rem', fontWeight: 800 }}>📦 Delivery / Pickup</h3>
        <DetailRow label="Method" value={job.delivery_method === 'delivery' ? 'Business Delivery' : 'Customer Pickup'} />
        {job.delivery_address && <DetailRow label="Address" value={job.delivery_address} />}
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.8rem' }}>
          {job.status !== 'ready' && job.status !== 'delivered' && <button onClick={() => handleUpdateStatus('ready')} className="cresoa-primary-button" style={{ flex: 1, background: 'var(--cresoa-success)' }}>Mark Ready</button>}
          {job.status !== 'delivered' && <button onClick={() => handleUpdateStatus('delivered')} className="cresoa-primary-button" style={{ flex: 1, background: 'var(--cresoa-primary)' }}>Mark Delivered</button>}
        </div>
      </div>

      {/* Secondary Actions */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <button onClick={() => router.push(`/dashboard/printing/jobs/${job.id}/edit?business_id=${businessIdFromUrl}`)} className="cresoa-primary-button" style={{ flex: 1, background: 'var(--cresoa-primary)' }}><Svg name="edit" size={14} stroke="#fff" /> Edit</button>
        <button onClick={() => alert('Duplicate feature coming soon')} className="cresoa-primary-button" style={{ flex: 1, background: 'var(--cresoa-border)', color: 'var(--cresoa-text)' }}><Svg name="copy" size={14} stroke="currentColor" /> Duplicate</button>
      </div>

      {/* Sticky mobile action bar */}
      <div style={{ position: 'fixed', bottom: '64px', left: 0, right: 0, background: 'var(--cresoa-surface)', borderTop: '1px solid var(--cresoa-border)', padding: '0.5rem 1rem', display: 'flex', gap: '0.5rem', zIndex: 999, boxShadow: '0 -2px 10px rgba(0,0,0,0.05)' }}>
        <button onClick={() => setShowPaymentModal(true)} className="cresoa-primary-button" style={{ flex: 1, background: 'var(--cresoa-success)' }}><Svg name="card" size={16} stroke="#fff" /> Record Payment</button>
        <button onClick={() => setShowStatusModal(true)} className="cresoa-primary-button" style={{ flex: 1, background: 'var(--cresoa-accent)' }}><Svg name="arrow" size={16} stroke="#fff" /> Update Stage</button>
      </div>

      {/* Status Modal */}
      {showStatusModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }} onClick={() => setShowStatusModal(false)}>
          <div style={{ background: 'var(--cresoa-surface)', borderRadius: '16px', padding: '1.5rem', maxWidth: '400px', width: '100%' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 1rem', fontWeight: 700 }}>Update Stage</h3>
            <div style={{ display: 'grid', gap: '0.5rem' }}>
              {STAGES.map(stage => (
                <button key={stage} onClick={() => handleUpdateStatus(stage)} disabled={updatingStatus || job.status === stage} style={{ padding: '0.6rem', borderRadius: '8px', border: `1px solid ${job.status === stage ? 'var(--cresoa-accent)' : 'var(--cresoa-border)'}`, background: job.status === stage ? 'var(--cresoa-accent-soft)' : 'var(--cresoa-surface)', color: job.status === stage ? 'var(--cresoa-accent)' : 'var(--cresoa-text)', cursor: 'pointer', fontWeight: 600, textAlign: 'left' }}>
                  {STAGE_LABELS[stage]} {job.status === stage && '✓'}
                </button>
              ))}
            </div>
            <button onClick={() => setShowStatusModal(false)} style={{ marginTop: '1rem', width: '100%', padding: '0.6rem', borderRadius: '8px', border: 'none', background: 'var(--cresoa-border)', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }} onClick={() => setShowPaymentModal(false)}>
          <form onSubmit={handleRecordPayment} style={{ background: 'var(--cresoa-surface)', borderRadius: '16px', padding: '1.5rem', maxWidth: '400px', width: '100%' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 1rem', fontWeight: 700 }}>Record Payment</h3>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem' }}>Amount (₦)</label>
            <input type="number" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} placeholder={`Max ${formatMoney(balance)}`} style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-bg)', color: 'var(--cresoa-text)' }} required />
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, margin: '0.8rem 0 0.3rem' }}>Note (optional)</label>
            <input type="text" value={paymentNote} onChange={(e) => setPaymentNote(e.target.value)} placeholder="e.g. Bank transfer" style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-bg)', color: 'var(--cresoa-text)' }} />
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
              <button type="button" onClick={() => setShowPaymentModal(false)} style={{ flex: 1, padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'transparent', cursor: 'pointer' }}>Cancel</button>
              <button type="submit" disabled={savingPayment} style={{ flex: 1, padding: '0.6rem', borderRadius: '8px', border: 'none', background: 'var(--cresoa-accent)', color: '#fff', fontWeight: 700 }}>{savingPayment ? 'Saving...' : 'Save Payment'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
              }
