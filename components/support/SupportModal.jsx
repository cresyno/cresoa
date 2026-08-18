'use client'

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '../../components/Icon';

export default function SupportModal({ type, businessId, onClose }) {
  const router = useRouter();
  const [waMessage, setWaMessage] = useState('Hello, I need help with my Cresoa account.');

  const handleWhatsAppSend = () => {
    const url = `https://wa.me/2349049209780?text=${encodeURIComponent(waMessage)}`;
    window.open(url, '_blank');
    onClose();
  };

  // ✅ FIXED: Correctly navigates to our new Tessa page with business_id
  const handleTessaNavigate = () => {
    router.push(`/dashboard/tessa?business_id=${businessId}`);
    onClose();
  };

  const handleTicketNavigate = () => {
    router.push(`/dashboard/support/ticket?business_id=${businessId}`);
    onClose();
  };

  const renderContent = () => {
    if (type === 'tessa') {
      return (
        <>
          <div className="modal-icon" style={{ background: 'var(--color-accent)15' }}><Icon name="message-circle" className="w-6 h-6" style={{ color: 'var(--color-accent)' }} /></div>
          <h3 className="modal-title">24/7 AI Assistance</h3>
          <p className="modal-desc">Tessa is a smart AI built specifically for the fashion business. She can answer questions about orders, staff, and production instantly—no waiting around.</p>
          <div className="modal-actions"><button className="btn-modal-primary" onClick={handleTessaNavigate}>Chat with Tessa</button><button className="btn-modal-close" onClick={onClose}>Cancel</button></div>
        </>
      );
    } else if (type === 'ticket') {
      return (
        <>
          <div className="modal-icon" style={{ background: 'var(--color-primary)15' }}><Icon name="file-text" className="w-6 h-6" style={{ color: 'var(--color-primary)' }} /></div>
          <h3 className="modal-title">Submit a Support Ticket</h3>
          <p className="modal-desc">For detailed inquiries, open a support ticket. Our dedicated team will review it and reply to your registered email address within 24 hours.</p>
          <div className="modal-actions"><button className="btn-modal-primary" onClick={handleTicketNavigate}>Open Ticket Form</button><button className="btn-modal-close" onClick={onClose}>Cancel</button></div>
        </>
      );
    } else if (type === 'whatsapp') {
      return (
        <>
          <div className="modal-icon" style={{ background: '#25D36615' }}><Icon name="message-circle" className="w-6 h-6" style={{ color: '#25D366' }} /></div>
          <h3 className="modal-title">Chat with a Human</h3>
          <p className="modal-desc">Need to speak to a real person? Write your message below. Once you hit send, your WhatsApp app will open with the text pre-filled.</p>
          <textarea className="modal-textarea" value={waMessage} onChange={(e) => setWaMessage(e.target.value)} rows="3" />
          <div className="modal-actions"><button className="btn-modal-primary" style={{ background: '#25D366' }} onClick={handleWhatsAppSend}>Open WhatsApp</button><button className="btn-modal-close" onClick={onClose}>Cancel</button></div>
        </>
      );
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">{renderContent()}</div>
    </div>
  );
}
