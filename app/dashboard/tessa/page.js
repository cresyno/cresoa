'use client'

import { Suspense, useState, useRef, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Icon } from '../../../components/Icon';
import ChatMessage from '../../../components/support/ChatMessage';
import ChatInput from '../../../components/support/ChatInput';

function TessaChatContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const businessId = searchParams.get('business_id');

  const [messages, setMessages] = useState([
    { role: 'assistant', text: `Hi 👋, I'm Tessa. Ask me anything about your business.` }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);

  // A list of useful starting points (Quick Action Chips)
  const suggestions = [
    "What are the subscription plans?",
    "How do I add a staff member?",
    "What are the Aso-Ebi limits?",
    "How do I reset my password?"
  ];

  const handleSuggestionClick = (text) => {
    setInput(text);
    // Optional: auto-send immediately if you want. For now, just fill the input.
  };

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;
    const text = input.trim();
    setInput('');
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
        setMessages(prev => [...prev, { role: 'assistant', text: "I'm having trouble connecting. Please try again." }]);
      }
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', text: "Oops! My server is offline. Please try again later." }]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 80px)', background: 'var(--color-bg)' }}>
      
      {/* Premium Header */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '1rem 1.5rem', borderBottom: '1px solid var(--color-border)', background: 'var(--color-card)', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={() => router.push(`/dashboard/support?business_id=${businessId}`)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text)', padding: '0.25rem' }}>
            <Icon name="arrow-left" className="w-5 h-5" />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#22c55e', animation: 'pulse 2s infinite' }}></div>
            <span style={{ fontWeight: '600', color: 'var(--color-text)', fontSize: '1rem' }}>Tessa AI</span>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem 1.5rem 0.5rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {messages.map((msg, idx) => (
          <ChatMessage key={idx} message={msg.text} isUser={msg.role === 'user'} />
        ))}
        {isLoading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div className="tessa-msg-ai">
              <div style={{ display: 'flex', gap: '0.25rem' }}>
                <span className="dot-bounce"></span>
                <span className="dot-bounce" style={{ animationDelay: '-0.16s' }}></span>
                <span className="dot-bounce" style={{ animationDelay: '-0.32s' }}></span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Action Chips (New!) */}
      <div style={{ padding: '0.5rem 1.5rem 1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', background: 'var(--color-bg)' }}>
        {suggestions.map((s, idx) => (
          <button 
            key={idx}
            onClick={() => handleSuggestionClick(s)}
            style={{
              padding: '0.4rem 1rem',
              fontSize: '0.75rem',
              background: 'var(--color-card)',
              color: 'var(--color-text)',
              border: '1px solid var(--color-border)',
              borderRadius: '20px',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--color-accent)'}
            onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--color-border)'}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Polished Input Area */}
      <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--color-border)', background: 'var(--color-card)', display: 'flex', gap: '0.75rem', boxShadow: '0 -4px 12px rgba(0,0,0,0.02)' }}>
        <input 
          type="text" 
          value={input} 
          onChange={(e) => setInput(e.target.value)} 
          onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()} 
          placeholder="Ask Tessa..." 
          disabled={isLoading}
          className="tessa-input"
          style={{ flex: 1, padding: '0.75rem 1rem', borderRadius: '12px', background: 'var(--color-bg)', color: 'var(--color-text)', border: '1px solid var(--color-border)', fontSize: '0.95rem', outline: 'none' }}
        />
        <button onClick={handleSendMessage} disabled={!input.trim() || isLoading} className="tessa-send-btn" style={{ padding: '0.75rem 1.2rem', borderRadius: '12px', background: 'var(--color-primary)', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'opacity 0.2s' }}>
          <Icon name="send" className="w-5 h-5" />
        </button>
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
