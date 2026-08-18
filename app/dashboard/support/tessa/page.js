'use client'

import { useState } from 'react';

export default function TessaChatPage() {
  const [messages, setMessages] = useState([
    { role: 'assistant', text: `Hi 👋, I'm Tessa. Ask me anything.` }
  ]);
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (!input.trim()) return;
    setMessages([...messages, { role: 'user', text: input }]);
    setInput('');
    setTimeout(() => {
      setMessages(prev => [...prev, { role: 'assistant', text: "I'm in safe mode. No API calls." }]);
    }, 800);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--color-bg)' }}>
      {/* Header without back button */}
      <div style={{ padding: '1rem', borderBottom: '1px solid var(--color-border)', background: 'var(--color-card)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#22c55e' }}></div>
          <span style={{ fontWeight: '600', color: 'var(--color-text)' }}>Tessa (Safe Mode)</span>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
        {messages.map((msg, idx) => (
          <div key={idx} style={{ textAlign: msg.role === 'user' ? 'right' : 'left', marginBottom: '0.5rem' }}>
            <span style={{ 
              display: 'inline-block', 
              padding: '0.5rem 1rem', 
              borderRadius: '12px', 
              background: msg.role === 'user' ? 'var(--color-primary)' : 'var(--color-card)',
              color: msg.role === 'user' ? '#fff' : 'var(--color-text)',
              border: msg.role === 'user' ? 'none' : '1px solid var(--color-border)'
            }}>
              {msg.text}
            </span>
          </div>
        ))}
      </div>

      {/* Input - NO ICON COMPONENT HERE */}
      <div style={{ padding: '1rem', borderTop: '1px solid var(--color-border)', background: 'var(--color-card)', display: 'flex', gap: '0.5rem' }}>
        <input 
          value={input} 
          onChange={(e) => setInput(e.target.value)} 
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Type anything..." 
          style={{ flex: 1, padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)' }}
        />
        <button onClick={handleSend} style={{ padding: '0.5rem 1rem', borderRadius: '8px', background: 'var(--color-primary)', color: '#fff', border: 'none', fontWeight: 'bold' }}>
          Send
        </button>
      </div>
    </div>
  );
            }
