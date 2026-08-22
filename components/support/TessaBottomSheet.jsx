'use client'

import { useState, useRef, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';

export default function TessaBottomSheet({ isOpen, onClose, businessId }) {
  const [messages, setMessages] = useState([
    { role: 'assistant', text: `Hi 👋, I'm Tessa. Ask me anything about your business.` }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  // ─── Auto-scroll to bottom when messages change ───
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // ─── Fetch chat history from Supabase when sheet opens ───
  useEffect(() => {
    const fetchHistory = async () => {
      if (!isOpen || !businessId) return;
      try {
        const { data, error } = await supabase
          .from('support_messages')
          .select('sender_type, message')
          .eq('business_id', businessId)
          .order('created_at', { ascending: true })
          .limit(10);

        if (error || !data) return;
        if (data.length > 0) {
          setMessages(data.map(msg => ({
            role: msg.sender_type === 'user' ? 'user' : 'assistant',
            text: msg.message
          })));
        }
      } catch (e) {
        console.error('Failed to fetch history:', e);
      }
    };

    if (isOpen) fetchHistory();
  }, [isOpen, businessId]);

  // ─── Send Message Logic ───
  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;
    const text = input.trim();
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    setMessages(prev => [...prev, { role: 'user', text }]);
    setIsLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch('/api/support/message', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ message: text, business_id: businessId })
      });
      const data = await res.json();
      if (data.answer) {
        setMessages(prev => [...prev, { role: 'assistant', text: data.answer }]);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', text: "I'm having trouble connecting. Please try again." }]);
      }
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', text: "Oops! My server is offline. Please try again later." }]);
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Auto-expand textarea (max 5 lines) ───
  const handleInputChange = (e) => {
    const textarea = e.target;
    setInput(textarea.value);
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 999,
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'center'
    }}>
      {/* Backdrop */}
      <div 
        onClick={onClose}
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(4px)'
        }}
      />

      {/* Bottom Sheet */}
      <div style={{
        position: 'relative',
        width: '100%',
        maxWidth: '600px',
        height: '85vh',
        maxHeight: '85vh',
        backgroundColor: 'var(--color-card)',
        borderTopLeftRadius: '20px',
        borderTopRightRadius: '20px',
        boxShadow: '0 -8px 32px rgba(0,0,0,0.3)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards'
      }}>
        <style>{`
          @keyframes slideUp {
            from { transform: translateY(100%); }
            to { transform: translateY(0); }
          }
        `}</style>

        {/* Header */}
        <div style={{
          padding: '1rem 1.5rem',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#22c55e' }}></div>
            <div>
              <div style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--color-text)' }}>Tessa AI</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>Online</div>
            </div>
          </div>
          <button 
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--color-text)',
              padding: '0.5rem',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Chat Area */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '1rem 1rem 1rem 1rem',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--color-bg)'
        }}>
          {messages.map((msg, idx) => (
            <ChatMessage key={idx} message={msg.text} isUser={msg.role === 'user'} />
          ))}
          {isLoading && (
            <div style={{ display: 'flex', justifyContent: 'flex-start', padding: '0.5rem 0' }}>
              <div style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', padding: '0.6rem 1rem', borderRadius: '18px 18px 18px 0', display: 'inline-block' }}>
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

        {/* Input Bar */}
        <div style={{
          padding: '0.75rem 1rem calc(0.75rem + env(safe-area-inset-bottom))',
          borderTop: '1px solid var(--color-border)',
          background: 'var(--color-card)',
          display: 'flex',
          alignItems: 'flex-end',
          gap: '0.75rem',
          flexShrink: 0
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'flex-end',
            flex: 1,
            background: 'var(--color-bg)',
            border: '1px solid var(--color-border)',
            borderRadius: '24px',
            padding: '0.4rem 0.4rem 0.4rem 1rem'
          }}>
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={handleInputChange}
              placeholder="Message"
              disabled={isLoading}
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: 'var(--color-text)',
                fontSize: '0.95rem',
                padding: '0.5rem 0',
                resize: 'none',
                minHeight: '40px',
                maxHeight: '120px',
                lineHeight: '1.5',
                fontFamily: 'inherit',
                overflowY: 'hidden'
              }}
            />
            <div style={{ flexShrink: 0, width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <button 
                onClick={handleSendMessage} 
                disabled={!input.trim() || isLoading} 
                style={{ 
                  background: 'var(--color-primary)', 
                  width: '36px', 
                  height: '36px', 
                  border: 'none', 
                  borderRadius: '50%', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  cursor: 'pointer', 
                  opacity: (!input.trim() || isLoading) ? '0.6' : '1',
                  transition: 'opacity 0.2s ease'
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
    }
