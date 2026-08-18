'use client'

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Icon } from '../../../components/Icon';
import SupportModal from '../../../components/support/SupportModal';

export default function SupportPage() {
  const searchParams = useSearchParams();
  const businessId = searchParams.get('business_id');
  const [activeModal, setActiveModal] = useState(null); // 'tessa' | 'ticket' | 'whatsapp'

  const options = [
    { id: 'tessa', title: 'Tessa AI Assistant', desc: 'Get instant, smart answers 24/7 without waiting.', icon: 'message-circle', color: 'var(--color-accent)' },
    { id: 'ticket', title: 'Support Ticket', desc: 'Submit a detailed request and get a reply via email.', icon: 'file-text', color: 'var(--color-primary)' },
    { id: 'whatsapp', title: 'Talk to a Human', desc: 'Pre-fill a message and chat directly with our team.', icon: 'message-circle', color: '#25D366' },
  ];

  return (
    <div style={{ background: 'var(--color-bg)', minHeight: 'calc(100vh - 80px)', padding: '2.5rem 1.5rem', maxWidth: '1000px', margin: '0 auto' }}>
      
      {/* Elegant Header */}
      <div style={{ marginBottom: '2.5rem', textAlign: 'center' }}>
        <h1 style={{ color: 'var(--color-text)', fontSize: '2rem', fontWeight: '700', margin: '0 0 0.25rem', letterSpacing: '-0.5px' }}>Support Hub</h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '1rem', margin: '0', fontWeight: '400' }}>Find quick solutions, talk to Tessa, or reach our team.</p>
      </div>

      {/* Premium FAQ Section */}
      <div style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: '20px', padding: '1.5rem 2rem', marginBottom: '3rem', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
        <h3 style={{ color: 'var(--color-text)', fontSize: '1rem', fontWeight: '600', margin: '0 0 0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ color: 'var(--color-accent)' }}>✦</span> Quick Answers
        </h3>
        <div className="faq-item"><p className="faq-q">How do I upgrade my subscription?</p><p className="faq-a">Navigate to the Subscription page and select a new plan.</p></div>
        <div className="faq-item"><p className="faq-q">How do I add a new staff member?</p><p className="faq-a">Open the Team & Staff page and generate an invite link.</p></div>
        <div className="faq-item" style={{ borderBottom: 'none' }}><p className="faq-q">What do I do if I can't log in?</p><p className="faq-a">Use the "Forgot Password" option on the login screen.</p></div>
      </div>

      {/* Captivating Action Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
        {options.map((opt) => (
          <div key={opt.id} className="support-card" style={{ padding: '2rem 1.5rem' }} onClick={() => setActiveModal(opt.id)}>
            <div className="support-card-icon" style={{ width: '56px', height: '56px', background: `${opt.color}15` }}>
              <Icon name={opt.icon} className="w-6 h-6" style={{ color: opt.color, width: '28px', height: '28px' }} />
            </div>
            <h4 className="support-card-title" style={{ fontSize: '1.1rem', marginTop: '0.5rem' }}>{opt.title}</h4>
            <p className="support-card-desc">{opt.desc}</p>
          </div>
        ))}
      </div>

      {/* The Premium Modal System */}
      {activeModal && (
        <SupportModal 
          type={activeModal} 
          businessId={businessId} 
          onClose={() => setActiveModal(null)} 
        />
      )}
    </div>
  );
        }
