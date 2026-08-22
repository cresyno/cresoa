'use client'

import { useState, useRef, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';

export default function TessaBottomSheet({ isOpen, onClose, businessId }) {
  // Start with a fresh greeting every time the sheet opens
  const [messages, setMessages] = useState([
    { role: 'assistant', text: `Hi 👋, I'm Tessa. Ask me anything about your business.` }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [input, setInput] = useState('');
  const [sheetHeight, setSheetHeight] = useState('25vh');
  const [isNewConversation, setIsNewConversation] = useState(true);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const dragStartY = useRef(null);
  const dragStartHeight = useRef(null);

  // 🚨 LOCK the dashboard scroll when sheet is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (isOpen) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  // 🆕 New Chat button logic (starts fresh, no old history)
  const handleNewChat = () => {
    setMessages([{ role: 'assistant', text: `Hi 👋, I'm Tessa. Ask me anything about your business.` }]);
    setIsNewConversation(true);
    setInput('');
  };

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;
    const text = input.trim();
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    setMessages(prev => [...prev, { role: 'user', text }]);
    setIsLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res = await fetch('/api/support/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ 
          message: text, 
          business_id: businessId,
          new_conversation: isNewConversation // 🔥 Tells Tessa to ignore old history
        })
      });
      const data = await res.json();
      if (data.answer) setMessages(prev => [...prev, { role: 'assistant', text: data.answer }]);
      else setMessages(prev => [...prev, { role: 'assistant', text: "I'm having trouble connecting. Please try again." }]);
      
      // After the first message, future messages keep context
      setIsNewConversation(false);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', text: "Oops! My server is offline. Please try again later." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const textarea = e.target;
    setInput(textarea.value);
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
  };

  // ✅ Resize logic with preventDefault to stop dashboard scrolling
  const startDrag = (e) => {
    e.preventDefault();
    dragStartY.current = e.clientY || e.touches[0].clientY;
    dragStartHeight.current = sheetHeight;
    document.addEventListener('mousemove', onDrag);
    document.addEventListener('touchmove', onDrag, { passive: false });
    document.addEventListener('mouseup', endDrag);
    document.addEventListener('touchend', endDrag);
  };

  const onDrag = (e) => {
    e.preventDefault();
    if (!dragStartY.current || !dragStartHeight.current) return;
    const currentY = e.clientY || e.touches[0].clientY;
    const delta = dragStartY.current - currentY;
    const newHeight = Math.min(Math.max(parseInt(dragStartHeight.current) + delta, 150), window.innerHeight * 0.9);
    setSheetHeight(`${newHeight}px`);
  };

  const endDrag = () => {
    dragStartY.current = null;
    dragStartHeight.current = null;
    document.removeEventListener('mousemove', onDrag);
    document.removeEventListener('touchmove', onDrag);
    document.removeEventListener('mouseup', endDrag);
    document.removeEventListener('touchend', endDrag);
  };

  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 999, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      {/* Backdrop (no blur) */}
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.3)' }} />

      {/* Resizable Bottom Sheet */}
      <div style={{
        position: 'relative',
        width: '100%',
        maxWidth: '600px',
        height: sheetHeight,
        backgroundColor: 'var(--color-card)',
        borderTopLeftRadius: '16px',
        borderTopRightRadius: '16px',
        boxShadow: '0 -4px 24px rgba(0,0,0,0.2)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        transition: 'height 0.05s linear'
      }}>
        {/* Drag Handle */}
        <div 
          onMouseDown={startDrag}
          onTouchStart={startDrag}
          style={{ padding: '10px 0', cursor: 'grab', display: 'flex', justifyContent: 'center', flexShrink: 0, touchAction: 'none' }}
        >
          <div style={{ width: '40px', height: '4px', background: 'var(--color-border)', borderRadius: '2px' }} />
        </div>

        {/* Header with New Chat button */}
        <div style={{ padding: '0 1rem 0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e' }} />
            <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--color-text)' }}>Tessa AI</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button onClick={handleNewChat} style={{ background: 'none', border: '1px solid var(--color-border)', padding: '0.2rem 0.6rem', borderRadius: '12px', fontSize: '0.75rem', color: 'var(--color-text-muted)', cursor: 'pointer' }}>New Chat</button>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text)' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        </div>

        {/* Chat Area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem 1rem', display: 'flex', flexDirection: 'column', background: 'var(--color-bg)' }}>
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

        {/* Input */}
        <div style={{ padding: '0.5rem 1rem calc(0.5rem + env(safe-area-inset-bottom))', borderTop: '1px solid var(--color-border)', display: 'flex', alignItems: 'flex-end', gap: '0.5rem', flexShrink: 0 }}>
          <div style={{ flex: 1, background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: '24px', padding: '0.3rem 0.3rem 0.3rem 1rem', display: 'flex', alignItems: 'flex-end' }}>
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={handleInputChange}
              placeholder="Message"
              disabled={isLoading}
              style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--color-text)', fontSize: '0.9rem', resize: 'none', minHeight: '32px', maxHeight: '100px', lineHeight: '1.4', fontFamily: 'inherit' }}
            />
            <button onClick={handleSendMessage} disabled={!input.trim() || isLoading} style={{ background: 'var(--color-primary)', width: '32px', height: '32px', border: 'none', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', opacity: (!input.trim() || isLoading) ? '0.6' : '1' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
        }
