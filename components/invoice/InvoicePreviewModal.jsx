'use client'

import { useState, useRef } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

// ─── Self-contained SVGs (No external imports) ───
const InvoiceIcon = ({ name, size = 20, stroke = 'currentColor' }) => {
  const icons = {
    close: <path d="M18 6L6 18M6 6l12 12" />,
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

  // ─── REAL DATA ONLY (No fake fallbacks) ──────────────
  const customerName = order?.customers?.name || order?.customers?.first_name || '';
  const businessName = business?.name || '';
  const businessLogo = business?.logo_url || business?.tracking_logo_url || '';

  // These are the columns that now exist after your SQL ran:
  const businessLocation = business?.location || '';
  const businessPhone = business?.phone || '';
  const businessWhatsapp = business?.whatsapp || '';
  const businessEmail = business?.email || '';
  const businessAddress = business?.address || '';
  const bankName = business?.bank_name || '';
  const accountNumber = business?.account_number || '';
  const accountName = business?.account_name || '';

  const orderTitle = order?.title || '';
  const orderPrice = Number(order?.price) || 0;
  const orderQuantity = Number(order?.quantity) || 1;
  const orderId = order?.id || '';
  const orderDate = order?.created_at ? new Date(order.created_at) : new Date();

  // ─── Derived Invoice Fields ─────────────────────────────
  const invoiceNumber = `INV-${orderDate.getFullYear()}${String(orderDate.getMonth()+1).padStart(2, '0')}${String(orderDate.getDate()).padStart(2, '0')}-001`;
  const dueDate = new Date(orderDate);
  dueDate.setDate(dueDate.getDate() + 7); // 7 days due

  // ─── Editable State (Pre-filled with real order data) ──
  const [itemDesc, setItemDesc] = useState(orderTitle);
  const [itemQty, setItemQty] = useState(orderQuantity);
  const [itemRate, setItemRate] = useState(orderPrice / (orderQuantity || 1));
  const [customNote, setCustomNote] = useState('Thank you for your patronage! We appreciate your business.');
  const [paymentStatus, setPaymentStatus] = useState('Balance Due');

  // ─── Calculated Totals ──────────────────────────────────
  const itemAmount = itemQty * itemRate;
  const subTotal = itemAmount;
  const vat = 0;
  const discount = 0;
  const grandTotal = subTotal + vat - discount;

  const formatMoney = (val) => `₦${Number(val || 0).toLocaleString('en-NG')}`;
  const formatDate = (date) => date.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });

  // ─── PDF & Share Logic ──────────────────────────────────
  const handleDownloadPDF = async () => {
    if (!invoiceRef.current) return;
    setIsGenerating(true);
    try {
      const canvas = await html2canvas(invoiceRef.current, { scale: 2, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${invoiceNumber}.pdf`);
    } catch (err) {
      console.error(err);
      alert('PDF generation failed. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleShareWhatsApp = async () => {
    setIsGenerating(true);
    try {
      const canvas = await html2canvas(invoiceRef.current, { scale: 2, backgroundColor: '#ffffff' });
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      const imgData = canvas.toDataURL('image/png');
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      const pdfBlob = pdf.output('blob');

      if (navigator.share) {
        await navigator.share({
          title: `Invoice ${invoiceNumber}`,
          text: `Hi ${customerName}, here is your invoice for ${itemDesc}.`,
          files: [new File([pdfBlob], `${invoiceNumber}.pdf`, { type: 'application/pdf' })]
        });
      } else {
        pdf.save(`${invoiceNumber}.pdf`);
        const message = `Hi ${customerName}, here is your invoice for ${itemDesc}. Total: ${formatMoney(grandTotal)}.`;
        window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
      }
    } catch (err) {
      alert('Could not share. Please download manually.');
    } finally {
      setIsGenerating(false);
    }
  };

  // ─── Render ──────────────────────────────────────────────
  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)', zIndex: 999, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={onClose}>
      <style>{`
        @keyframes slideUp { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @media print { .no-print { display: none !important; } }
      `}</style>

      {/* Bottom Sheet Modal */}
      <div style={{ width: '100%', maxWidth: '600px', maxHeight: '88vh', backgroundColor: 'var(--color-card)', borderTopLeftRadius: '20px', borderTopRightRadius: '20px', boxShadow: '0 -8px 32px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', overflow: 'hidden', animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards' }} onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, backgroundColor: 'var(--color-card)' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: 'var(--color-text)' }}>Invoice Preview</h3>
            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>#{invoiceNumber}</p>
          </div>
          <button onClick={onClose} className="no-print" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: '0.25rem' }}>
            <InvoiceIcon name="close" size={24} stroke="var(--color-text)" />
          </button>
        </div>

        {/* Scrollable Area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', backgroundColor: 'var(--color-bg)' }}>
          
          {/* ─── PROFESSIONAL INVOICE CANVAS (PDF Target) ─── */}
          <div ref={invoiceRef} style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '1.5rem', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-sm)', marginBottom: '1rem', color: '#1a1a1a' }}>
            
            {/* 1. Brand Header & Contact Info */}
            <div style={{ borderBottom: '2px solid var(--color-accent)', paddingBottom: '0.75rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {/* ─── LOGO INTEGRATION (Rectangle) ─── */}
                {businessLogo ? (
                  <img 
                    src={businessLogo} 
                    alt={businessName} 
                    style={{ width: '48px', height: '48px', objectFit: 'contain', borderRadius: '6px' }} 
                  />
                ) : (
                  // Text-based logo if no image uploaded
                  <div style={{ width: '48px', height: '48px', borderRadius: '6px', background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', fontWeight: 700, color: '#fff' }}>
                    {businessName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <h2 style={{ margin: 0, color: 'var(--color-primary)', fontSize: '1.2rem', fontWeight: 700 }}>{businessName}</h2>
                  <p style={{ margin: '2px 0', fontSize: '0.8rem', color: '#666' }}>{businessLocation}</p>
                  <p style={{ margin: '2px 0', fontSize: '0.8rem', color: '#666' }}>
                    {businessPhone}
                    {businessPhone && businessEmail ? ' | ' : ''}
                    {businessEmail}
                  </p>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#333' }}>INVOICE #{invoiceNumber}</div>
                <div style={{ fontSize: '0.75rem', color: '#666' }}>Date: {formatDate(orderDate)}</div>
                <div style={{ fontSize: '0.75rem', color: '#666' }}>Due: {formatDate(dueDate)}</div>
              </div>
            </div>

            {/* 2. Bill To */}
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.7rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>BILL TO</div>
              <div style={{ fontWeight: 600, fontSize: '1rem', color: '#111' }}>{customerName}</div>
              {order?.customers?.phone && <div style={{ fontSize: '0.8rem', color: '#666' }}>{order.customers.phone}</div>}
            </div>

            {/* 3. Itemized Table */}
            <div style={{ width: '100%', border: '1px solid #eee', borderRadius: '8px', overflow: 'hidden', marginBottom: '1rem' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead style={{ background: '#f8f9fa' }}>
                  <tr>
                    <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid #eee', width: '40%' }}>Item / Description</th>
                    <th style={{ padding: '8px 12px', textAlign: 'center', borderBottom: '1px solid #eee', width: '20%' }}>Qty</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right', borderBottom: '1px solid #eee', width: '20%' }}>Rate</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right', borderBottom: '1px solid #eee', width: '20%' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ padding: '8px 12px', borderBottom: '1px solid #eee', color: '#333' }}>{itemDesc}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'center', borderBottom: '1px solid #eee', color: '#333' }}>{itemQty}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', borderBottom: '1px solid #eee', color: '#333' }}>{formatMoney(itemRate)}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', borderBottom: '1px solid #eee', fontWeight: 600, color: '#111' }}>{formatMoney(itemAmount)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* 4. Totals Breakdown */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
              <div style={{ width: '200px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '0.8rem', color: '#555' }}>
                  <span>Subtotal:</span><span>{formatMoney(subTotal)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '0.8rem', color: '#555' }}>
                  <span>VAT 7.5%:</span><span>{formatMoney(vat)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '0.8rem', color: '#555' }}>
                  <span>Discount:</span><span>{formatMoney(discount)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderTop: '2px solid #eee', fontSize: '1rem', fontWeight: 700, color: '#111' }}>
                  <span>TOTAL:</span><span>{formatMoney(grandTotal)}</span>
                </div>
              </div>
            </div>

            {/* 5. Status Badge */}
            <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.8rem', color: '#666' }}>Status:</span>
              <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600, background: paymentStatus === 'Paid in Full' ? '#e6f4ea' : '#fff3e0', color: paymentStatus === 'Paid in Full' ? '#1e7e34' : '#e65100' }}>
                {paymentStatus}
              </span>
            </div>

            {/* 6. Payment Details (Only show if real bank data exists) */}
            {bankName && accountNumber && (
              <div style={{ marginBottom: '1rem', padding: '0.75rem', background: '#f8f9fa', borderRadius: '8px', border: '1px solid #eee', fontSize: '0.8rem', color: '#333' }}>
                <strong style={{ display: 'block', marginBottom: '4px' }}>PAYMENT DETAILS</strong>
                <div>Bank: {bankName} | Acct: {accountNumber} | Name: {accountName || businessName}</div>
              </div>
            )}

            {/* 7. Footer Note */}
            <div style={{ fontSize: '0.8rem', color: '#666', fontStyle: 'italic' }}>
              {customNote}
            </div>
            <div style={{ marginTop: '8px', fontSize: '0.7rem', color: '#999', textAlign: 'center', borderTop: '1px solid #eee', paddingTop: '8px' }}>
              For enquiries, call {businessPhone || 'N/A'}.
            </div>
          </div>

          {/* ─── EDITING INPUTS (Outside the PDF canvas) ─── */}
          <div className="no-print" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Description</label>
                <input type="text" value={itemDesc} onChange={e => setItemDesc(e.target.value)} style={{ width: '100%', padding: '0.4rem', borderRadius: '6px', border: '1px solid var(--color-border)', fontSize: '0.8rem' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Qty</label>
                <input type="number" value={itemQty} onChange={e => setItemQty(Number(e.target.value))} style={{ width: '100%', padding: '0.4rem', borderRadius: '6px', border: '1px solid var(--color-border)', fontSize: '0.8rem' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Rate (₦)</label>
                <input type="number" value={itemRate} onChange={e => setItemRate(Number(e.target.value))} style={{ width: '100%', padding: '0.4rem', borderRadius: '6px', border: '1px solid var(--color-border)', fontSize: '0.8rem' }} />
              </div>
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Custom Note</label>
              <input type="text" value={customNote} onChange={e => setCustomNote(e.target.value)} style={{ width: '100%', padding: '0.4rem', borderRadius: '6px', border: '1px solid var(--color-border)', fontSize: '0.8rem' }} />
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Status</label>
              <select value={paymentStatus} onChange={e => setPaymentStatus(e.target.value)} style={{ width: '100%', padding: '0.4rem', borderRadius: '6px', border: '1px solid var(--color-border)', fontSize: '0.8rem', background: 'var(--color-bg)' }}>
                <option value="Balance Due">Balance Due</option>
                <option value="Paid in Full">Paid in Full</option>
                <option value="Deposit Paid">Deposit Paid</option>
              </select>
            </div>
          </div>
        </div>

        {/* Action Footer */}
        <div className="no-print" style={{ padding: '1rem 1.5rem calc(1.5rem + env(safe-area-inset-bottom))', borderTop: '1px solid var(--color-border)', backgroundColor: 'var(--color-card)', display: 'flex', gap: '0.75rem', flexShrink: 0 }}>
          <button onClick={handleDownloadPDF} disabled={isGenerating} style={{ flex: 1, padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--color-border)', background: 'transparent', color: 'var(--color-text)', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', opacity: isGenerating ? 0.6 : 1 }}>
            <InvoiceIcon name="download" size={18} stroke="var(--color-text)" /> {isGenerating ? 'Generating...' : 'Download PDF'}
          </button>
          <button onClick={handleShareWhatsApp} disabled={isGenerating} style={{ flex: 1, padding: '0.75rem', borderRadius: '10px', border: 'none', background: '#25D366', color: '#fff', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', opacity: isGenerating ? 0.6 : 1 }}>
            <InvoiceIcon name="whatsapp" size={18} stroke="#fff" /> {isGenerating ? 'Generating...' : 'Share WhatsApp'}
          </button>
        </div>
      </div>
    </div>
  );
        }
