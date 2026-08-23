'use client'

import { useState, useRef, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';

// 🎤 Mic Icon (self-contained)
const MicIcon = ({ size = 20, stroke = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <line x1="12" y1="19" x2="12" y2="23" />
    <line x1="8" y1="23" x2="16" y2="23" />
  </svg>
);

export default function TessaBottomSheet({ isOpen, onClose, businessId }) {
  const [messages, setMessages] = useState([
    { role: 'assistant', text: `Hi 👋, I'm Tessa. Ask me anything about your business.` }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [input, setInput] = useState('');
  const [sheetHeight, setSheetHeight] = useState('25vh');
  const [isNewConversation, setIsNewConversation] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef(null);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const dragStartY = useRef(null);
  const dragStartHeight = useRef(null);

  // Lock scroll when open
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  // Fetch memory on open
  useEffect(() => {
    const fetchHistory = async () => {
      if (!isOpen || !businessId || isNewConversation) return;
      try {
        const { data, error } = await supabase
          .from('support_messages')
          .select('sender_type, message')
          .eq('business_id', businessId)
          .order('created_at', { ascending: true })
          .limit(0);
        if (error || !data) return;
        if (data.length > 0) {
          setMessages(data.map(msg => ({
            role: msg.sender_type === 'user' ? 'user' : 'assistant',
            text: msg.message
          })));
        }
      } catch (e) {}
    };
    if (isOpen && !isNewConversation) fetchHistory();
  }, [isOpen, businessId, isNewConversation]);

  // Reset new chat flag
  useEffect(() => {
    if (isOpen && isNewConversation) {
      const timer = setTimeout(() => setIsNewConversation(false), 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen, isNewConversation]);

  // Auto-scroll
  useEffect(() => {
    if (isOpen) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  const handleNewChat = () => {
    setMessages([{ role: 'assistant', text: `Hi 👋, I'm Tessa. Ask me anything about your business.` }]);
    setIsNewConversation(true);
    setInput('');
  };

  // Voice recognition setup (robust for mobile)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return; // device doesn't support

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US'; // more reliable than en-NG on many Android browsers
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsRecording(true);
    recognition.onend = () => setIsRecording(false);
    recognition.onerror = (event) => {
      console.error('Voice error:', event.error);
      setIsRecording(false);
      if (event.error === 'not-allowed') {
        alert('Microphone permission denied. Please enable it in your browser settings.');
      }
    };
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      // Auto-send
      handleSendMessage(transcript);
    };

    recognitionRef.current = recognition;
  }, []); // setup once

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      alert('Voice input is not supported on this device. Please type instead.');
      return;
    }
    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      setInput('');
      recognitionRef.current.start();
    }
  };

  const handleSendMessage = async (forcedText) => {
    const text = forcedText || input;
    if (!text.trim() || isLoading) return;
    if (isRecording && recognitionRef.current) recognitionRef.current.stop();

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
          new_conversation: isNewConversation
        })
      });
      const data = await res.json();
      if (data.answer) setMessages(prev => [...prev, { role: 'assistant', text: data.answer }]);
      else setMessages(prev => [...prev, { role: 'assistant', text: "I'm having trouble connecting. Please try again." }]);
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

  // Resize logic (same as before)
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
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.3)' }} />

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
        <div 
          onMouseDown={startDrag}
          onTouchStart={startDrag}
          style={{ padding: '10px 0', cursor: 'grab', display: 'flex', justifyContent: 'center', flexShrink: 0, touchAction: 'none' }}
        >
          <div style={{ width: '40px', height: '4px', background: 'var(--color-border)', borderRadius: '2px' }} />
        </div>

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

        {/* Input Bar - changes while recording */}
        <div style={{ padding: '0.5rem 1rem calc(0.5rem + env(safe-area-inset-bottom))', borderTop: '1px solid var(--color-border)', display: 'flex', alignItems: 'flex-end', gap: '0.5rem', flexShrink: 0 }}>
          <div style={{ flex: 1, background: isRecording ? 'rgba(217,83,79,0.1)' : 'var(--color-bg)', border: '1px solid ' + (isRecording ? 'var(--color-danger)' : 'var(--color-border)'), borderRadius: '24px', padding: '0.3rem 0.3rem 0.3rem 1rem', display: 'flex', alignItems: 'flex-end', transition: 'all 0.3s' }}>
            {isRecording ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0', color: 'var(--color-danger)', fontSize: '0.9rem', fontWeight: 600 }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--color-danger)', animation: 'pulse-red 1s infinite' }} />
                Listening…
              </div>
            ) : (
              <textarea
                ref={textareaRef}
                rows={1}
                value={input}
                onChange={handleInputChange}
                placeholder="Message"
                disabled={isLoading}
                style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--color-text)', fontSize: '0.9rem', resize: 'none', minHeight: '32px', maxHeight: '100px', lineHeight: '1.4', fontFamily: 'inherit' }}
              />
            )}
            
            <button 
              onClick={toggleRecording}
              disabled={isLoading}
              style={{
                background: isRecording ? 'var(--color-danger)' : 'transparent',
                border: 'none',
                borderRadius: '50%',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                marginRight: '4px',
                transition: 'background 0.2s'
              }}
              aria-label="Voice input"
            >
              <MicIcon size={20} stroke={isRecording ? '#fff' : 'var(--color-text-muted)'} />
            </button>

            {/* Rainbow Send Button */}
            <div style={{ width: '38px', height: '38px', padding: '3px', borderRadius: '50%', background: 'conic-gradient(#ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)', animation: 'spin 3s linear infinite', flexShrink: 0 }}>
              <button 
                onClick={() => handleSendMessage()} 
                disabled={!input.trim() || isLoading} 
                style={{ 
                  background: 'var(--color-primary)', 
                  width: '100%', 
                  height: '100%', 
                  border: 'none', 
                  borderRadius: '50%', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  cursor: 'pointer', 
                  opacity: (!input.trim() || isLoading) ? '0.6' : '1'
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse-red {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(1.2); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
      }
