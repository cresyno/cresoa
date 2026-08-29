'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { supabase } from '../../../../../lib/supabaseClient'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

// ─── Self-contained SVGs ───
const Svg = ({ name, size = 20, stroke = 'currentColor', style }) => {
  const icons = {
    back: <><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></>,
    download: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></>,
    whatsapp: <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />,
    printer: <><polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="8" /></>,
    check: <polyline points="20 6 9 17 4 12" />,
    x: <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>,
    'arrow-right': <><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></>,
    'file-text': <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></>,
    chevron: <polyline points="9 18 15 12 9 6" />,
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

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [pdfLoading, setPdfLoading] = useState(false)

  const quotationRef = useRef(null)
  const [logoDataUrl, setLogoDataUrl] = useState(null)
  const [isMobile, setIsMobile] = useState(false)

  // Detect mobile
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

  // Fetch quotation
  useEffect(() => {
    const fetchQuotation = async () => {
      try {
        const bizId = businessIdFromUrl
        if (!bizId) { router.push('/dashboard'); return }
        setBusinessId(bizId)

        const { data: quoteData, error: quoteError } = await supabase
          .from('quotations')
          .select(`
            *,
            customers ( id, name, first_name, last_name, phone, email, address )
          `)
          .eq('id', quotationId)
          .eq('business_id', bizId)
          .maybeSingle()

        if (quoteError) throw quoteError
        if (!quoteData) throw new Error('Quotation not found')
        setQuote(quoteData)
        setCustomer(quoteData.customers)
        setItems(quoteData.items || [])

        const { data: bizData } = await supabase
          .from('businesses')
          .select('*')
          .eq('id', bizId)
          .maybeSingle()
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

  // PDF generation (same logic as invoice)
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
      link.download = `${quote.quote_number}.pdf`
      link.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      alert('Failed to generate PDF.')
    }
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
        // Fallback: download PDF, then open WhatsApp
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
    } catch (err) {
      alert('Failed to share. Please try again.')
    }
  }

  const handlePrint = () => { window.print() }

  // Status update
  const handleUpdateStatus = async (newStatus) => {
    try {
      const { error } = await supabase
        .from('quotations')
        .update({ status: newStatus })
        .eq('id', quote.id)
      if (error) throw error
      setQuote(prev => ({ ...prev, status: newStatus }))
      alert(`Quotation marked as ${newStatus}.`)
    } catch (err) {
      alert('Failed to update status.')
    }
  }

  // Convert to Job
  const handleConvertToJob = async () => {
    if (!confirm('Convert this quotation to a job? This will create a new print job.')) return
    try {
      const { data: newJob, error: jobError } = await supabase
        .from('print_jobs')
        .insert({
          business_id: businessId,
          customer_id: quote.customer_id,
          job_number: `PR-${Date.now().toString().slice(-6)}`,
          title: quote.items?.[0]?.description || 'Print Job',
          job_type: quote.items?.[0]?.description || '',
          quantity: 1,
          specifications: { quote_id: quote.id },
          status: 'awaiting_deposit',
          total: quote.total,
          amount_paid: 0,
          notes: quote.notes || null,
        })
        .select()
        .single()

      if (jobError) throw jobError

      // Link quotation to job
      await supabase.from('quotations').update({ status: 'converted', job_id: newJob.id }).eq('id', quote.id)

      router.push(`/dashboard/printing/jobs/${newJob.id}?business_id=${businessId}`)
    } catch (err) {
      alert('Failed to convert to job.')
    }
  }

  if (loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--cresoa-bg)' }}><div className="cresoa-loading-spinner" /></div>
  if (error || !quote) return (
    <div style={{ minHeight: '70vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', textAlign: 'center' }}>
      <Svg name="x" size={30} stroke="var(--cresoa-danger)" />
      <h2>Couldn't load quotation</h2>
      <p>{error || 'Quotation not found'}</p>
      <button onClick={() => router.push(`/dashboard/printing/quotations?business_id=${businessIdFromUrl}`)} className="cresoa-primary-button">Back</button>
    </div>
  )

  const statusColors = {
    draft: 'var(--cresoa-text-muted)',
    sent: 'var(--cresoa-info)',
    approved: 'var(--cresoa-success)',
    rejected: 'var(--cresoa-danger)',
    converted: 'var(--cresoa-accent)',
  }

  return (
    <div style={{ padding: '1rem', maxWidth: '1200px', margin: '0 auto', paddingBottom: '120px', background: 'var(--cresoa-bg)', minHeight: '100vh' }}>
      <button onClick={() => router.push(`/dashboard/printing/quotations?business_id=${businessIdFromUrl}`)} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cresoa-text-muted)', marginBottom: '1rem' }}>
        <Svg name="back" size={16} stroke="currentColor" /> Back to Quotations
      </button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0', color: 'var(--cresoa-text)' }}>{quote.quote_number}</h1>
          <p style={{ color: 'var(--cresoa-text-muted)', margin: '0.2rem 0 0' }}>{customer?.name || customer?.first_name || 'Customer'}</p>
        </div>
        <span style={{ padding: '0.3rem 0.8rem', borderRadius: '12px', background: `${statusColors[quote.status] || '#666'}20`, color: statusColors[quote.status] || '#666', fontWeight: 700, textTransform: 'capitalize' }}>{quote.status}</span>
      </div>

      {/* QUICK ACTIONS - Desktop sidebar */}
      {!isMobile && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '1.5rem' }}>
          <div>
            {/* Quotation PDF area */}
            <div id="quotation-print-area" ref={quotationRef} style={{ background: '#fff', borderRadius: '12px', border: '1px solid var(--cresoa-border)', padding: '1.5rem', color: '#1a1a1a', overflow: 'hidden' }}>
              {/* Header */}
              <div style={{ borderBottom: '2px solid var(--cresoa-accent)', paddingBottom: '0.75rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {logoDataUrl ? <img src={logoDataUrl} alt={business?.name} style={{ width: '80px', height: '80px', objectFit: 'contain' }} /> : <div style={{ width: '80px', height: '80px', borderRadius: '6px', background: 'var(--cresoa-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700 }}>{business?.name?.charAt(0) || 'B'}</div>}
                  <div>
                    <h2 style={{ margin: 0, color: 'var(--cresoa-primary)', fontSize: '1.1rem' }}>{business?.name || 'Business'}</h2>
                    {business?.location && <p style={{ margin: '2px 0', color: '#666', fontSize: '0.8rem' }}>{business.location}</p>}
                    {business?.phone && <p style={{ margin: '2px 0', color: '#666', fontSize: '0.8rem' }}>{business.phone}</p>}
                    {business?.email && <p style={{ margin: '2px 0', color: '#666', fontSize: '0.8rem' }}>{business.email}</p>}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <h3 style={{ margin: 0, fontSize: '1.1rem' }}>QUOTATION</h3>
                  <p style={{ margin: '4px 0', fontSize: '0.8rem', color: '#666' }}>#{quote.quote_number}</p>
                  <p style={{ margin: '4px 0', fontSize: '0.8rem', color: '#666' }}>Date: {formatDate(quote.created_at)}</p>
                </div>
              </div>

              {/* Billed To */}
              {customer && (
                <div style={{ marginBottom: '1rem' }}>
                  <p style={{ margin: 0, color: '#666', fontSize: '0.7rem', fontWeight: 700 }}>PREPARED FOR</p>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: '1.1rem' }}>{customer.name || customer.first_name}</p>
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
                      <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>{item.description}</td>
                      <td style={{ padding: '8px', textAlign: 'center', borderBottom: '1px solid #eee' }}>{item.quantity}</td>
                      <td style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid #eee' }}>{formatMoney(item.unit_price)}</td>
                      <td style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid #eee', fontWeight: 600 }}>{formatMoney(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
                <div style={{ width: '220px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}><span>Subtotal</span><span>{formatMoney(quote.subtotal)}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid #eee', padding: '8px 0', fontWeight: 700 }}><span>Total</span><span>{formatMoney(quote.total)}</span></div>
                </div>
              </div>

              {/* Notes */}
              {quote.notes && <p style={{ fontStyle: 'italic', color: '#666', fontSize: '0.85rem' }}>{quote.notes}</p>}

              <p style={{ textAlign: 'center', color: '#999', fontSize: '0.7rem', borderTop: '1px solid #eee', paddingTop: '0.5rem', marginTop: '0.5rem' }}>
                Powered by Cresoa — Business management made simple.
              </p>
            </div>
          </div>

          {/* Sidebar Actions */}
          <div className="no-print" style={{ position: 'sticky', top: '20px', alignSelf: 'start' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--cresoa-text)', margin: '0 0 0.75rem' }}>QUICK ACTIONS</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <button onClick={handleDownloadPDF} disabled={pdfLoading} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-surface)', color: 'var(--cresoa-text)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>
                {pdfLoading ? <Svg name="chevron" size={16} stroke="currentColor" /> : <Svg name="download" size={16} stroke="currentColor" />} {pdfLoading ? 'Generating...' : 'Download PDF'}
              </button>
              <button onClick={handleShareWhatsApp} disabled={pdfLoading} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-surface)', color: 'var(--cresoa-text)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>
                {pdfLoading ? <Svg name="chevron" size={16} stroke="currentColor" /> : <Svg name="whatsapp" size={16} stroke="currentColor" />} {pdfLoading ? 'Preparing...' : 'Send via WhatsApp'}
              </button>
              <button onClick={handlePrint} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-surface)', color: 'var(--cresoa-text)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>
                <Svg name="printer" size={16} stroke="currentColor" /> Print
              </button>
              {quote.status !== 'approved' && quote.status !== 'rejected' && quote.status !== 'converted' && (
                <button onClick={() => handleUpdateStatus('approved')} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-surface)', color: 'var(--cresoa-text)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>
                  <Svg name="check" size={16} stroke="var(--cresoa-success)" /> Mark Approved
                </button>
              )}
              {quote.status !== 'rejected' && quote.status !== 'approved' && quote.status !== 'converted' && (
                <button onClick={() => handleUpdateStatus('rejected')} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-surface)', color: 'var(--cresoa-text)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>
                  <Svg name="x" size={16} stroke="var(--cresoa-danger)" /> Mark Rejected
                </button>
              )}
                    {quote.status === 'approved' && (
                <button onClick={handleConvertToJob} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', borderRadius: '12px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-surface)', color: 'var(--cresoa-text)', cursor: 'pointer', width: '100%', textAlign: 'left' }}>
                  <Svg name="arrow-right" size={20} stroke="var(--cresoa-accent)" />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>Convert to Job</div>
                  </div>
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
           
