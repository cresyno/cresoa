'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { supabase } from '../../../../../lib/supabaseClient'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

const Svg = ({ name, size = 20, stroke = 'currentColor' }) => {
  const icons = {
    back: <><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></>,
    download: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></>,
    whatsapp: <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />,
    check: <polyline points="20 6 9 17 4 12" />,
    x: <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>,
    arrowRight: <><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></>,
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{icons[name]}</svg>
}

const formatMoney = (val) => `₦${Number(val || 0).toLocaleString('en-NG')}`

export default function QuotationDetailPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const quoteId = params.id
  const businessId = searchParams.get('business_id')

  const [quote, setQuote] = useState(null)
  const [customer, setCustomer] = useState(null)
  const [business, setBusiness] = useState(null)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [pdfLoading, setPdfLoading] = useState(false)

  const quoteRef = useRef(null)

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const { data: q } = await supabase.from('quotations').select('*').eq('id', quoteId).eq('business_id', businessId).maybeSingle()
        if (!q) throw new Error('Quotation not found')
        setQuote(q)
        setItems(q.items || [])

        if (q.customer_id) {
          const { data: cust } = await supabase.from('customers').select('*').eq('id', q.customer_id).maybeSingle()
          setCustomer(cust)
        }
        const { data: biz } = await supabase.from('businesses').select('*').eq('id', businessId).maybeSingle()
        setBusiness(biz)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchAll()
  }, [quoteId, businessId])

  const generatePdf = async () => {
    if (!quoteRef.current) return null
    setPdfLoading(true)
    await new Promise(resolve => setTimeout(resolve, 100))
    const originalWidth = quoteRef.current.style.width
    quoteRef.current.style.width = '794px'
    const canvas = await html2canvas(quoteRef.current, { scale: 2, backgroundColor: '#ffffff', windowWidth: 794 })
    quoteRef.current.style.width = originalWidth
    setPdfLoading(false)
    const imgData = canvas.toDataURL('image/png')
    const pdf = new jsPDF('p', 'mm', 'a4')
    const pdfWidth = pdf.internal.pageSize.getWidth()
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight)
    return pdf.output('blob')
  }

  const handleDownload = async () => {
    const blob = await generatePdf()
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${quote.quote_number}.pdf`
    link.click()
    URL.revokeObjectURL(url)
  }

  const handleWhatsApp = async () => {
    if (!customer?.phone) { alert('Customer has no phone.'); return }
    const blob = await generatePdf()
    const file = new File([blob], `${quote.quote_number}.pdf`, { type: 'application/pdf' })
    const message = `Hi ${customer.name || customer.first_name}, here is your quotation ${quote.quote_number}.`
    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ title: `Quotation ${quote.quote_number}`, text: message, files: [file] })
    } else {
      // Fallback: download and open WhatsApp with text
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${quote.quote_number}.pdf`
      link.click()
      URL.revokeObjectURL(url)
      const waUrl = `https://wa.me/${customer.phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`
      window.open(waUrl, '_blank')
    }
  }

  const updateStatus = async (status) => {
    const { error } = await supabase.from('quotations').update({ status }).eq('id', quote.id)
    if (!error) setQuote(prev => ({ ...prev, status }))
  }

  if (loading) return <div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'var(--cresoa-bg)' }}><div className="cresoa-loading-spinner" /></div>

  const customerName = customer?.name || `${customer?.first_name || ''} ${customer?.last_name || ''}`.trim() || 'Customer'

  return (
    <div style={{ padding: '1rem', maxWidth: '900px', margin: '0 auto', background: 'var(--cresoa-bg)', minHeight: '100vh', paddingBottom: '100px' }}>
      <button onClick={() => router.push(`/dashboard/printing/quotations?business_id=${businessId}`)} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cresoa-text-muted)', marginBottom: '1rem' }}><Svg name="back" size={16} stroke="currentColor" /> Back</button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>{quote.quote_number}</h1>
        <span style={{ padding: '0.2rem 0.8rem', borderRadius: '12px', background: 'var(--cresoa-accent-soft)', color: 'var(--cresoa-accent)', fontWeight: 700, textTransform: 'capitalize' }}>{quote.status}</span>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <button onClick={handleDownload} disabled={pdfLoading} className="cresoa-primary-button"><Svg name="download" size={16} stroke="#fff" /> PDF</button>
        <button onClick={handleWhatsApp} disabled={pdfLoading} className="cresoa-primary-button" style={{ background: '#25D366' }}><Svg name="whatsapp" size={16} stroke="#fff" /> WhatsApp</button>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        {['draft', 'sent', 'approved', 'rejected', 'converted'].map(status => (
          <button key={status} onClick={() => updateStatus(status)} style={{ padding: '0.3rem 0.8rem', borderRadius: '12px', border: `1px solid ${quote.status === status ? 'var(--cresoa-accent)' : 'var(--cresoa-border)'}`, background: quote.status === status ? 'var(--cresoa-accent-soft)' : 'var(--cresoa-surface)', color: quote.status === status ? 'var(--cresoa-accent)' : 'var(--cresoa-text-muted)', fontWeight: 600, fontSize: '0.75rem', cursor: 'pointer' }}>{status}</button>
        ))}
      </div>

      {/* PDF Preview (Always White, Fixed 794px) */}
      <div style={{ display: 'flex', justifyContent: 'center', overflowX: 'auto' }}>
        <div ref={quoteRef} style={{ background: '#ffffff', color: '#1a1a1a', width: '100%', maxWidth: '794px', borderRadius: '0', border: '1px solid #ddd', padding: '1.5rem', fontFamily: 'Inter, sans-serif', boxSizing: 'border-box' }}>
          {/* Header */}
          <div style={{ borderBottom: '2px solid #D4A52A', paddingBottom: '0.8rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              {business?.logo_url ? <img src={business.logo_url} alt="logo" style={{ width: '60px', height: '60px', objectFit: 'contain' }} /> : <div style={{ width: '60px', height: '60px', background: '#0F2B4A', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>{business?.name?.charAt(0) || 'B'}</div>}
              <h2 style={{ margin: '0.5rem 0 0', fontSize: '1.2rem' }}>{business?.name || 'Your Business'}</h2>
              {business?.location && <p style={{ margin: '0.2rem 0', fontSize: '0.8rem', color: '#666' }}>{business.location}</p>}
              {business?.phone && <p style={{ margin: '0.2rem 0', fontSize: '0.8rem', color: '#666' }}>{business.phone}</p>}
            </div>
            <div style={{ textAlign: 'right' }}>
              <h3 style={{ margin: 0 }}>QUOTATION</h3>
              <p style={{ margin: '0.2rem 0', fontSize: '0.8rem', color: '#666' }}>#{quote.quote_number}</p>
              <p style={{ margin: '0.2rem 0', fontSize: '0.8rem', color: '#666' }}>{new Date(quote.created_at).toLocaleDateString('en-NG')}</p>
            </div>
          </div>

          {/* Customer */}
          <p style={{ fontWeight: 700, marginBottom: '0.2rem' }}>Prepared for:</p>
          <p style={{ margin: '0.2rem 0' }}>{customerName}</p>
          {customer?.phone && <p style={{ margin: '0.2rem 0', fontSize: '0.85rem', color: '#666' }}>{customer.phone}</p>}
          {customer?.email && <p style={{ margin: '0.2rem 0', fontSize: '0.85rem', color: '#666' }}>{customer.email}</p>}

          {/* Items */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #ddd' }}>
                <th style={{ textAlign: 'left', padding: '0.4rem' }}>Item</th>
                <th style={{ textAlign: 'center', padding: '0.4rem' }}>Qty</th>
                <th style={{ textAlign: 'right', padding: '0.4rem' }}>Unit Price</th>
                <th style={{ textAlign: 'right', padding: '0.4rem' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '0.4rem' }}>{item.description}</td>
                  <td style={{ textAlign: 'center', padding: '0.4rem' }}>{item.quantity}</td>
                  <td style={{ textAlign: 'right', padding: '0.4rem' }}>{formatMoney(item.unit_price)}</td>
                  <td style={{ textAlign: 'right', padding: '0.4rem', fontWeight: 600 }}>{formatMoney(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
            <div style={{ width: '200px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.2rem 0' }}><span>Subtotal</span><span>{formatMoney(quote.subtotal)}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderTop: '2px solid #D4A52A', fontWeight: 700, fontSize: '1.1rem' }}><span>Total</span><span>{formatMoney(quote.total)}</span></div>
            </div>
          </div>

          {/* Notes */}
          {quote.notes && <p style={{ marginTop: '1rem', fontSize: '0.85rem', color: '#666', whiteSpace: 'pre-wrap' }}>{quote.notes}</p>}
        </div>
      </div>
    </div>
  )
  }
