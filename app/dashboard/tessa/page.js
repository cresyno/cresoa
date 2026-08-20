'use client'

import { Suspense, useState, useRef, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';
import ChatMessage from '../../../components/support/ChatMessage';

function TessaChatContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const businessId = searchParams.get('business_id');
  const textareaRef = useRef(null);

  const [messages, setMessages] = useState([
    { role: 'assistant', text: `Hi 👋, I'm Tessa. Ask me anything about your business.` }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);

  // ─── Auto-Expand Textarea (Max 5 lines) ──────────────────
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const lineHeight = parseInt(getComputedStyle(textareaRef.current).lineHeight);
      const maxHeight = lineHeight * 5; // Stop expanding at 5 lines
      const newHeight = Math.min(textareaRef.current.scrollHeight, maxHeight);
      textareaRef.current.style.height = newHeight + 'px';
      textareaRef.current.style.overflowY = newHeight >= maxHeight ? 'auto' : 'hidden';
    }
  }, [input]);

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;
    const text = input.trim();
    setInput('');
    // Reset textarea height after send
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.overflowY = 'hidden';
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

  // ─── Auto-scroll to bottom ─────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', background: 'var(--color-bg)' }}>
      
      {/* Header - Fixed at top */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1rem', borderBottom: '1px solid var(--color-border)', background: 'var(--color-card)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={() => router.push(`/dashboard/support?business_id=${businessId}`)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text)' }}>
            <span style={{ fontSize: '1.2rem' }}>‹</span>
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#22c55e' }}></div>
            <div>
              <div style={{ fontWeight: '600', fontSize: '1rem', color: 'var(--color-text)' }}>Tessa AI</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>Online</div>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Area - Fills all available space, scrolls internally */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1rem', display: 'flex', flexDirection: 'column', background: 'var(--color-bg)' }}>
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

      {/* Input Bar - Fixed at bottom, expands upwards with textarea */}
      <div style={{ padding: '0.75rem 1rem', borderTop: '1px solid var(--color-border)', background: 'var(--color-card)', display: 'flex', alignItems: 'flex-end', gap: '0.75rem', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', flex: 1, background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: '24px', padding: '0.4rem 0.4rem 0.4rem 1rem' }}>
          
          {/* 🔥 REPLACED INPUT WITH SMART TEXTAREA */}
          <textarea 
            ref={textareaRef}
            rows={1}
            value={input} 
            onChange={(e) => setInput(e.target.value)} 
            onKeyDown={(e) => {
              // Enter adds a new line naturally. No interference needed.
              // We only prevent accidental form submission if it were inside a form tag.
            }}
            placeholder="Message" 
            disabled={isLoading}
            style={{ 
              flex: 1, 
              background: 'transparent', 
              border: 'none', 
              outline: 'none', 
              color: 'var(--color-text)', 
              fontSize: '0.95rem', 
              padding: '0.3rem 0',
              resize: 'none',
              minHeight: '24px',
              maxHeight: '120px', // Roughly 5 lines
              lineHeight: '1.5',
              fontFamily: 'inherit',
              overflowY: 'hidden'
            }}
          />
          
          <div className="rainbow-glow-btn-wrapper" style={{ flexShrink: 0, width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
  );
}

export default function TessaChatPage() {
  return (
    <Suspense fallback={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--color-bg)', color: 'var(--color-text-muted)' }}>Loading Tessa...</div>}>
      <TessaChatContent />
    </Suspense>
  );
}
