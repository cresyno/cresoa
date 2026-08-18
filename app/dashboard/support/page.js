'use client'

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Icon } from '../../../components/Icon';
import SupportModal from '../../../components/support/SupportModal';

export default function SupportPage() {
  const searchParams = useSearchParams();
  const businessId = searchParams.get('business_id');
  const [activeModal, setActiveModal] = useState(null);

  const options = [
    { id: 'tessa', title: 'Tessa AI Assistant', desc: 'Get instant, smart answers 24/7 without waiting.', icon: 'message-circle', color: 'var(--color-accent)' },
    { id: 'ticket', title: 'Submit a Ticket', desc: 'Send a detailed request and get a reply via email.', icon: 'file-text', color: 'var(--color-primary)' },
    { id: 'whatsapp', title: 'Talk to a Human', desc: 'Pre-fill a message and chat directly with our team.', icon: 'message-circle', color: '#25D366' },
  ];

  return (
    <div style={{ background: 'var(--color-bg)', minHeight: 'calc(100vh - 80px)', padding: '2.5rem 1.5rem', maxWidth: '1000px', margin: '0 auto' }}>
      
      {/* Header & Search */}
      <div style={{ marginBottom: '2.5rem', textAlign: 'center' }}>
        <h1 style={{ color: 'var(--color-text)', fontSize: '2rem', fontWeight: '700', margin: '0 0 0.5rem' }}>Support Hub</h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '1rem', margin: '0 0 1.5rem' }}>Find answers, talk to Tessa, or reach our team.</p>
        
        <div style={{ maxWidth: '500px', margin: '0 auto', position: 'relative' }}>
          <input 
            type="text" 
            placeholder="Search for answers..." 
            style={{ width: '100%', padding: '0.8rem 1rem 0.8rem 2.5rem', borderRadius: '12px', border: '1px solid var(--color-border)', background: 'var(--color-card)', color: 'var(--color-text)', fontSize: '0.95rem', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
          />
          <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }}>
            <Icon name="search" className="w-5 h-5" />
          </span>
        </div>
      </div>

      {/* 3 Premium Help Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
        {options.map((opt) => (
          <div key={opt.id} className="support-card" style={{ padding: '2rem 1.5rem', textAlign: 'center' }} onClick={() => setActiveModal(opt.id)}>
            <div className="support-card-icon" style={{ width: '60px', height: '60px', margin: '0 auto 1rem', background: `${opt.color}15` }}>
              <Icon name={opt.icon} className="w-7 h-7" style={{ color: opt.color }} />
            </div>
            <h4 className="support-card-title" style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '0.5rem' }}>{opt.title}</h4>
            <p className="support-card-desc" style={{ lineHeight: '1.5' }}>{opt.desc}</p>
          </div>
        ))}
      </div>

      {/* Quick FAQ Accordion */}
      <div style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: '16px', padding: '1.5rem 2rem', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
        <h3 style={{ color: 'var(--color-text)', fontSize: '1rem', fontWeight: '600', margin: '0 0 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ color: 'var(--color-accent)' }}>✦</span> Frequently Asked Questions
        </h3>
        <div className="faq-item"><p className="faq-q">How do I upgrade my subscription?</p><p className="faq-a">Navigate to the Subscription page and select a new plan.</p></div>
        <div className="faq-item"><p className="faq-q">How do I add a new staff member?</p><p className="faq-a">Open the Team & Staff page and generate an invite link.</p></div>
        <div className="faq-item" style={{ borderBottom: 'none' }}><p className="faq-q">What do I do if I can't log in?</p><p className="faq-a">Use the "Forgot Password" option on the login screen.</p></div>
      </div>

      {/* The Modal System */}
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
