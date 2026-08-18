'use client'

import { useState, useRef, useEffect } from 'react';
import { Icon } from '../../../components/Icon';
import ChatMessage from '../../../components/support/ChatMessage';
import ChatInput from '../../../components/support/ChatInput';
import WhatsAppCard from '../../../components/support/WhatsAppCard';
import TicketForm from '../../../components/support/TicketForm';

export default function SupportContent({ businessId }) {
  const [messages, setMessages] = useState([
    { role: 'assistant', text: `Hi, I'm Tessa 👋. Ask me anything about your business.` }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (text) => {
    setMessages(prev => [...prev, { role: 'user', text }]);
    setIsLoading(true);
    try {
      const res = await fetch('/api/support/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, business_id: businessId })
      });
      const data = await res.json();
      if (data.answer) {
        setMessages(prev => [...prev, { role: 'assistant', text: data.answer }]);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', text: "Tessa is having trouble connecting. Please contact support." }]);
      }
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', text: "Oops! Tessa's server is offline. Please try again later." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTicketSuccess = () => {
    setIsTicketModalOpen(false);
    setMessages(prev => [...prev, { role: 'assistant', text: "✅ Your ticket was submitted successfully! A member of our team will get back to you shortly." }]);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 80px)', background: 'var(--color-bg)', padding: '1rem', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexShrink: 0 }}>
        <div>
          <h1 className="support-hub-title" style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--color-text)', margin: 0 }}>Support Hub</h1>
          <p className="support-hub-subtitle" style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: '0.25rem 0 0' }}>Get help with Tessa, submit a ticket, or chat with a human.</p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1, overflow: 'hidden' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '1rem', borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg)' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', animation: 'pulse 2s infinite' }}></div>
            <span style={{ fontWeight: '500', color: 'var(--color-text)', fontSize: '0.875rem' }}>Tessa · AI Assistant</span>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', background: 'var(--color-card)' }}>
            {messages.map((msg, idx) => (
              <ChatMessage key={idx} message={msg.text} isUser={msg.role === 'user'} />
            ))}
            {isLoading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '0.75rem' }}>
                <div style={{ background: 'var(--color-bg)', padding: '0.6rem 1rem', borderRadius: '1rem 1rem 1rem 0', border: '1px solid var(--color-border)' }}>
                  <div style={{ display: 'flex', gap: '0.25rem' }}>
                    <span style={{ width: '6px', height: '6px', background: '#9ca3af', borderRadius: '50%', display: 'inline-block', animation: 'bounce 1.4s infinite ease-in-out both' }}></span>
                    <span style={{ width: '6px', height: '6px', background: '#9ca3af', borderRadius: '50%', display: 'inline-block', animation: 'bounce 1.4s infinite ease-in-out both', animationDelay: '-0.16s' }}></span>
                    <span style={{ width: '6px', height: '6px', background: '#9ca3af', borderRadius: '50%', display: 'inline-block', animation: 'bounce 1.4s infinite ease-in-out both', animationDelay: '-0.32s' }}></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          <div style={{ borderTop: '1px solid var(--color-border)', flexShrink: 0 }}>
            <ChatInput onSend={handleSendMessage} disabled={isLoading} />
          </div>
        </div>

        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1rem', flexShrink: 0, paddingBottom: '1rem' }}>
          <div className="card-surface" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--color-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon name="file-text" className="w-5 h-5" style={{ color: 'var(--color-primary)' }} />
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontWeight: '500', color: 'var(--color-text)', fontSize: '0.875rem', margin: '0 0 0.25rem' }}>Submit a Ticket</h3>
                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', margin: '0 0 0.75rem' }}>Non-urgent issues? Our team will respond via email within 24 hours.</p>
                <button 
                  onClick={() => setIsTicketModalOpen(true)}
                  className="btn-primary" style={{ width: '100%', padding: '0.5rem 1rem', background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}
                >
                  Open Ticket Form
                </button>
              </div>
            </div>
          </div>

          <WhatsAppCard phoneNumber="2349049209780" businessName="Cresoa" />
        </div>
      </div>

      {isTicketModalOpen && (
        <TicketForm 
          businessId={businessId} 
          onClose={() => setIsTicketModalOpen(false)} 
          onSuccess={handleTicketSuccess} 
        />
      )}
    </div>
  );
      }
