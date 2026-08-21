'use client'

import { useState, useRef } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

// ─── Self-contained SVGs (No external import) ───
const InvoiceIcon = ({ name, size = 20, stroke = 'currentColor' }) => {
  const icons = {
    close: <path d="M18 6L6 18M6 6l12 12" />,
    edit: <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />,
    download: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></>,
    whatsapp: <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {icons[name]}
    </svg>
  );
};

export default function InvoicePreviewModal({ order, business, onClose }) {
  const invoiceRef = useRef(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // ─── Derived Real Data from Props ──────────────────────
  const customerName = order?.customers?.name || order?.customers?.first_name || 'Customer';
  const businessName = business?.name || 'Your Business';
  const businessAddress = business?.address || 'Lagos, Nigeria';
  const orderTitle = order?.title || 'Order';
  const orderQuantity = order?.quantity || 1;
  const orderPrice = order?.price || 0;
  const orderId = order?.id || 'ORD-1234';
  const orderDate = order?.created_at ? new Date(order.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A';

  // ─── Editable State ──────────────────────────────────────
  const [editableItems, setEditableItems] = useState(`${orderQuantity}x ${orderTitle}`);
  const [customNote, setCustomNote] = useState('Thank you for your patronage! We appreciate your business.');
  const [paymentStatus, setPaymentStatus] = useState('Balance Due');

  const formatMoney = (val) => `₦${Number(val || 0).toLocaleString('en-NG')}`;

  // ─── 1. Download PDF Button Logic ──────────────────────
  const handleDownloadPDF = async () => {
    if (!invoiceRef.current) return;
    setIsGenerating(true);
    try {
      const canvas = await html2canvas(invoiceRef.current, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Invoice_${orderId.slice(0, 8)}.pdf`);
    } catch (err) {
      console.error('PDF generation error:', err);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  // ─── 2. Share WhatsApp Button Logic ─────────────────────
  const handleShareWhatsApp = async () => {
    setIsGenerating(true);
    try {
      // Generate the PDF first to share it
      const canvas = await html2canvas(invoiceRef.current, { scale: 2 });
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      const imgData = canvas.toDataURL('image/png');
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      const pdfBlob = pdf.output('blob');

      // Attempt Native Share (Mobile) - attaches the PDF directly
      if (navigator.share) {
        await navigator.share({
          title: `Invoice ${orderId.slice(0, 8)}`,
          text: `Hi ${customerName}, here is your invoice for ${orderTitle}.`,
          files: [new File([pdfBlob], `Invoice_${orderId.slice(0, 8)}.pdf`, { type: 'application/pdf' })]
        });
      } else {
        // Desktop Fallback: Download PDF & Open WhatsApp with a message
        pdf.save(`Invoice_${orderId.slice(0, 8)}.pdf`);
        const message = `Hi ${customerName}, here is your invoice for ${orderTitle}. Total: ${formatMoney(orderPrice)}.`;
        const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank');
      }
    } catch (err) {
      console.error('Share error:', err);
      alert('Could not share. Please download and share manually.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)',
      backdropFilter: 'blur(6px)', zIndex: 999, display: 'flex',
      alignItems: 'flex-end', justifyContent: 'center'
    }} onClick={onClose}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `}</style>

      <div style={{
        width: '100%', maxWidth: '600px', maxHeight: '88vh',
        backgroundColor: 'var(--color-card)',
        borderTopLeftRadius: '20px', borderTopRightRadius: '20px',
        boxShadow: '0 -8px 32px rgba(0,0,0,0.15)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards'
      }} onClick={(e) => e.stopPropagation()}>
        
        {/* 1. Header */}
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, backgroundColor: 'var(--color-card)' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: 'var(--color-text)' }}>Invoice Preview</h3>
            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>#{orderId.slice(0, 8)}</p>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: '0.25rem' }}>
            <InvoiceIcon name="close" size={24} stroke="var(--color-text)" />
          </button>
        </div>

        {/* 2. Scrollable Invoice Preview (Ref attached) */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', backgroundColor: 'var(--color-bg)' }}>
          <div ref={invoiceRef} style={{ backgroundColor: 'var(--color-card)', borderRadius: '12px', padding: '1.5rem', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-sm)', marginBottom: '1rem' }}>
            
            {/* Brand Header */}
            <div style={{ borderBottom: '2px solid var(--color-accent)', paddingBottom: '0.75rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h4 style={{ margin: 0, color: 'var(--color-primary)', fontSize: '1.2rem', fontWeight: 700 }}>{businessName}</h4>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{businessAddress}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Date</div>
                <div style={{ fontWeight: 500, color: 'var(--color-text)' }}>{orderDate}</div>
              </div>
            </div>

            {/* Bill To */}
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Bill To</div>
              <div style={{ fontWeight: 500, color: 'var(--color-text)' }}>{customerName}</div>
              {order?.customers?.phone && <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{order.customers.phone}</div>}
            </div>

            {/* Editable Items Section */}
            <div style={{ marginBottom: '1rem', border: '1px solid var(--color-border)', borderRadius: '8px', overflow: 'hidden' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0.75rem', background: 'var(--color-bg)', borderBottom: '1px solid var(--color-border)', fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                <span>Item / Description</span>
                <span style={{ textAlign: 'right' }}>Amount</span>
              </div>
              <div style={{ padding: '0.75rem' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>
                  <InvoiceIcon name="edit" size={12} stroke="var(--color-accent)" /> Tap to edit items
                </label>
                <textarea 
                  value={editableItems}
                  onChange={(e) => setEditableItems(e.target.value)}
                  rows={3}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)', fontSize: '0.9rem', fontFamily: 'inherit', resize: 'vertical' }}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem', fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-text)' }}>
                  Total: {formatMoney(orderPrice)}
                </div>
              </div>
            </div>

            {/* Editable Note */}
            <div style={{ marginBottom: '0.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>
                <InvoiceIcon name="edit" size={12} stroke="var(--color-accent)" /> Custom Note
              </label>
              <textarea 
                value={customNote}
                onChange={(e) => setCustomNote(e.target.value)}
                rows={2}
                style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)', fontSize: '0.85rem', fontFamily: 'inherit', resize: 'vertical' }}
              />
            </div>

            {/* Payment Status */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Status:</span>
              <select 
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value)}
                style={{ padding: '0.25rem 0.5rem', borderRadius: '6px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)', fontSize: '0.8rem', fontWeight: 500 }}
              >
                <option value="Paid in Full">Paid in Full</option>
                <option value="Deposit Paid">Deposit Paid</option>
                <option value="Balance Due">Balance Due</option>
              </select>
            </div>
          </div>
        </div>

        {/* 3. Action Footer (Working Buttons) */}
        <div style={{ padding: '1rem 1.5rem calc(1rem + env(safe-area-inset-bottom))', borderTop: '1px solid var(--color-border)', backgroundColor: 'var(--color-card)', display: 'flex', gap: '0.75rem', flexShrink: 0 }}>
          <button 
            onClick={handleDownloadPDF}
            disabled={isGenerating}
            style={{
              flex: 1, padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--color-border)',
              background: 'transparent', color: 'var(--color-text)', fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
              opacity: isGenerating ? 0.6 : 1
            }}
          >
            <InvoiceIcon name="download" size={18} stroke="var(--color-text)" />
            {isGenerating ? 'Generating...' : 'Download PDF'}
          </button>
          
          <button 
            onClick={handleShareWhatsApp}
            disabled={isGenerating}
            style={{
              flex: 1, padding: '0.75rem', borderRadius: '10px', border: 'none',
              background: '#25D366', color: '#fff', fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
              opacity: isGenerating ? 0.6 : 1
            }}
          >
            <InvoiceIcon name="whatsapp" size={18} stroke="#fff" />
            {isGenerating ? 'Generating...' : 'Share WhatsApp'}
          </button>
        </div>

      </div>
    </div>
  );
        }
