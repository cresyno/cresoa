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
    { id: 'tessa', title: 'Tessa AI Assistant', desc: 'Get instant answers 24/7 using our smart AI.', icon: 'message-circle', color: 'var(--color-accent)' },
    { id: 'ticket', title: 'Support Ticket', desc: 'Submit a detailed request and get a reply via email.', icon: 'file-text', color: 'var(--color-primary)' },
    { id: 'whatsapp', title: 'Chat on WhatsApp', desc: 'Pre-fill a message and instantly reach our team.', icon: 'message-circle', color: '#25D366' },
  ];

  return (
    <div style={{ background: 'var(--color-bg)', minHeight: 'calc(100vh - 80px)', padding: '2rem 1.5rem', maxWidth: '800px', margin: '0 auto' }}>
      
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ color: 'var(--color-text)', fontSize: '1.5rem', fontWeight: 'bold', margin: '0 0 0.25rem' }}>Quick Help</h1>
        <p style={{ color: 'var(--color-text-muted)', margin: 0 }}>Find answers, talk to Tessa, or reach out to our team.</p>
      </div>

      {/* FAQs */}
      <div style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: '16px', padding: '1rem 1.5rem', marginBottom: '2rem' }}>
        <h3 style={{ color: 'var(--color-text)', fontSize: '1rem', fontWeight: '600', margin: '0 0 0.5rem' }}>Frequently Asked Questions</h3>
        <div className="faq-item"><p className="faq-q">How do I upgrade my subscription?</p><p className="faq-a">Go to the Subscription page and select a new plan.</p></div>
        <div className="faq-item"><p className="faq-q">How do I add a new staff member?</p><p className="faq-a">Open the Team & Staff page and generate an invite link.</p></div>
        <div className="faq-item"><p className="faq-q">What do I do if I can't log in?</p><p className="faq-a">Use the "Forgot Password" option on the login screen.</p></div>
      </div>

      {/* Quick Options Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        {options.map((opt) => (
          <div key={opt.id} className="support-card" onClick={() => setActiveModal(opt.id)}>
            <div className="support-card-icon" style={{ background: `${opt.color}15` }}>
              <Icon name={opt.icon} className="w-6 h-6" style={{ color: opt.color }} />
            </div>
            <h4 className="support-card-title">{opt.title}</h4>
            <p className="support-card-desc">{opt.desc}</p>
          </div>
        ))}
      </div>

      {/* The Modal Engine */}
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
