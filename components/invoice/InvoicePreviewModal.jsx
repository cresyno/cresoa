'use client'

import { useState } from 'react';
import { InvoiceIcon } from './Icons';

export default function InvoicePreviewModal({ order, business, onClose }) {
  // ─── Editable State ──────────────────────────────────────
  // These will be pre-filled with real order data in the next step.
  const [editableItems, setEditableItems] = useState('1x Blue Agbada\n1x Red Cap');
  const [customNote, setCustomNote] = useState('Thank you for your patronage! We appreciate your business.');
  const [paymentStatus, setPaymentStatus] = useState('Balance Due');

  // ─── Placeholder Data (Will be replaced with real props later) ──
  const customerName = 'Tunde Adeyemi';
  const orderDate = '20 Aug 2026';
  const businessName = business?.name || 'Your Business Name';

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      backdropFilter: 'blur(6px)',
      zIndex: 999,
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'center',
      animation: 'fadeIn 0.2s ease-out'
    }}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `}</style>

      {/* The Bottom Sheet */}
      <div style={{
        width: '100%',
        maxWidth: '600px',
        maxHeight: '88vh',
        backgroundColor: 'var(--color-card)',
        borderTopLeftRadius: '20px',
        borderTopRightRadius: '20px',
        boxShadow: '0 -8px 32px rgba(0,0,0,0.15)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards'
      }}>
        
        {/* 1. Header (Fixed) */}
        <div style={{
          padding: '1rem 1.5rem',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0,
          backgroundColor: 'var(--color-card)'
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: 'var(--color-text)' }}>Invoice Preview</h3>
            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>#{order?.id || 'ORD-1234'}</p>
          </div>
          <button 
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--color-text-muted)',
              padding: '0.25rem'
            }}
          >
            <InvoiceIcon name="close" size={24} stroke="var(--color-text)" />
          </button>
        </div>

        {/* 2. Scrollable Invoice Preview (Editable Area) */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '1.5rem',
          backgroundColor: 'var(--color-bg)'
        }}>
          
          {/* Invoice Canvas (Styled with Brand Colors) */}
          <div style={{
            backgroundColor: 'var(--color-card)',
            borderRadius: '12px',
            padding: '1.5rem',
            border: '1px solid var(--color-border)',
            boxShadow: 'var(--shadow-sm)',
            marginBottom: '1rem'
          }}>
            <div style={{ borderBottom: '2px solid var(--color-accent)', paddingBottom: '0.75rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h4 style={{ margin: 0, color: 'var(--color-primary)', fontSize: '1.2rem', fontWeight: 700 }}>{businessName}</h4>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{business?.location || 'Lagos, Nigeria'}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Date</div>
                <div style={{ fontWeight: 500, color: 'var(--color-text)' }}>{orderDate}</div>
              </div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Bill To</div>
              <div style={{ fontWeight: 500, color: 'var(--color-text)' }}>{customerName}</div>
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
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    borderRadius: '6px',
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-bg)',
                    color: 'var(--color-text)',
                    fontSize: '0.9rem',
                    fontFamily: 'inherit',
                    resize: 'vertical'
                  }}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem', fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-text)' }}>
                  Total: ₦30,000
                </div>
              </div>
            </div>

            {/* Editable Note Section */}
            <div style={{ marginBottom: '0.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>
                <InvoiceIcon name="edit" size={12} stroke="var(--color-accent)" /> Custom Note
              </label>
              <textarea 
                value={customNote}
                onChange={(e) => setCustomNote(e.target.value)}
                rows={2}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  borderRadius: '6px',
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-bg)',
                  color: 'var(--color-text)',
                  fontSize: '0.85rem',
                  fontFamily: 'inherit',
                  resize: 'vertical'
                }}
              />
            </div>

            {/* Payment Status Toggle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Status:</span>
              <select 
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value)}
                style={{
                  padding: '0.25rem 0.5rem',
                  borderRadius: '6px',
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-bg)',
                  color: 'var(--color-text)',
                  fontSize: '0.8rem',
                  fontWeight: 500
                }}
              >
                <option value="Paid in Full">Paid in Full</option>
                <option value="Deposit Paid">Deposit Paid</option>
                <option value="Balance Due" selected>Balance Due</option>
              </select>
            </div>
          </div>
        </div>

        {/* 3. Action Footer (Fixed at bottom) */}
        <div style={{
          padding: '1rem 1.5rem calc(1rem + env(safe-area-inset-bottom))',
          borderTop: '1px solid var(--color-border)',
          backgroundColor: 'var(--color-card)',
          display: 'flex',
          gap: '0.75rem',
          flexShrink: 0
        }}>
          <button 
            onClick={() => { /* Logic to trigger Download PDF or Web Share API */ }}
            style={{
              flex: 1,
              padding: '0.75rem',
              borderRadius: '10px',
              border: '1px solid var(--color-border)',
              background: 'transparent',
              color: 'var(--color-text)',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem'
            }}
          >
            <InvoiceIcon name="download" size={18} stroke="var(--color-text)" />
            Download
          </button>
          
          <button 
            onClick={() => { /* Logic to trigger WhatsApp Share */ }}
            style={{
              flex: 1,
              padding: '0.75rem',
              borderRadius: '10px',
              border: 'none',
              background: '#25D366',
              color: '#fff',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem'
            }}
          >
            <InvoiceIcon name="whatsapp" size={18} stroke="#fff" />
            Share WhatsApp
          </button>
        </div>

      </div>
    </div>
  );
            }
