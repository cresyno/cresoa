'use client'

import { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Icon } from '../../components/Icon';
import ChatMessage from '../../components/support/ChatMessage';
import ChatInput from '../../components/support/ChatInput';
import WhatsAppCard from '../../components/support/WhatsAppCard';
import TicketForm from '../../components/support/TicketForm';

export default function SupportPage() {
  const searchParams = useSearchParams();
  const businessId = searchParams.get('business_id');

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
    // Add a confirmation message to the chat
    setMessages(prev => [...prev, { role: 'assistant', text: "✅ Your ticket was submitted successfully! A member of our team will get back to you shortly." }]);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] bg-[var(--cresoa-background)] p-4 max-w-6xl mx-auto w-full">
      
      {/* Page Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div>
          <h1 className="text-xl font-bold text-[var(--cresoa-text)]">Support Hub</h1>
          <p className="text-xs text-[var(--cresoa-text-muted)]">Get help with Tessa, submit a ticket, or chat with a human.</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 flex-1 overflow-hidden">
        
        {/* Left Column: Tessa AI Chat */}
        <div className="flex-1 flex flex-col bg-[var(--cresoa-surface)] border border-[var(--cresoa-border)] rounded-xl shadow-sm overflow-hidden">
          {/* Chat Header */}
          <div className="flex items-center gap-2 p-4 border-b border-[var(--cresoa-border)] bg-[var(--cresoa-background)]">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="font-medium text-[var(--cresoa-text)] text-sm">Tessa · AI Assistant</span>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[var(--cresoa-surface)]">
            {messages.map((msg, idx) => (
              <ChatMessage key={idx} message={msg.text} isUser={msg.role === 'user'} />
            ))}
            {isLoading && (
              <div className="flex justify-start mb-3">
                <div className="bg-[var(--cresoa-surface-secondary)] px-4 py-2.5 rounded-2xl rounded-bl-none border border-[var(--cresoa-border)]">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input */}
          <div className="border-t border-[var(--cresoa-border)] flex-shrink-0">
            <ChatInput onSend={handleSendMessage} disabled={isLoading} />
          </div>
        </div>

        {/* Right Column: Actions (WhatsApp + Ticket) */}
        <div className="w-full lg:w-72 flex flex-col gap-4 flex-shrink-0 overflow-y-auto pb-4">
          
          {/* Submit a Ticket Card */}
          <div className="bg-[var(--cresoa-surface)] border border-[var(--cresoa-border)] rounded-xl p-5 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-[var(--cresoa-accent)]/10 flex items-center justify-center flex-shrink-0">
                <Icon name="file-text" className="w-5 h-5 text-[var(--cresoa-accent)]" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-[var(--cresoa-text)] text-sm mb-1">Submit a Ticket</h3>
                <p className="text-[var(--cresoa-text-muted)] text-xs mb-3">
                  Non-urgent issues? Our team will respond via email within 24 hours.
                </p>
                <button 
                  onClick={() => setIsTicketModalOpen(true)}
                  className="w-full py-2 bg-[var(--cresoa-primary)] text-white text-xs font-semibold rounded-lg hover:opacity-90 transition-opacity"
                >
                  Open Ticket Form
                </button>
              </div>
            </div>
          </div>

          {/* WhatsApp Support Card */}
          <WhatsAppCard phoneNumber="2349049209780" businessName="Cresoa" />

        </div>
      </div>

      {/* Render the Ticket Modal when open */}
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
