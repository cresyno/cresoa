'use client'

import { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

// ─── Self-contained Mic Icon ───
const MicIcon = ({ size = 20, stroke = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <line x1="12" y1="19" x2="12" y2="23" />
    <line x1="8" y1="23" x2="16" y2="23" />
  </svg>
);

export default function TessaBottomSheet({ isOpen, onClose, businessId }) {
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);

  // ─── Voice Recognition Setup ───
  useEffect(() => {
    if (typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition)) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-NG'; // Nigerian English support
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = (event) => {
        console.error('Voice error:', event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
          alert('Microphone permission denied. Please enable it in your browser settings.');
        }
      };
      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInputText(transcript);
        // Auto-send after voice capture
        handleSend(transcript);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const handleStartRecording = () => {
    if (!recognitionRef.current) {
      alert('Voice input is not supported on this device. Please type instead.');
      return;
    }
    setIsRecording(true);
    recognitionRef.current.start();
  };

  const handleStopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsRecording(false);
  };

  // ─── Send Message (Regular + Voice) ───
  const handleSend = async (text) => {
    const message = text || inputText;
    if (!message.trim()) return;

    const newMessages = [...messages, { role: 'user', content: message }];
    setMessages(newMessages);
    setInputText('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/support/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          message,
          business_id: businessId,
          new_conversation: false
        })
      });

      const data = await response.json();
      setMessages([...newMessages, { role: 'assistant', content: data.answer }]);
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages([...newMessages, { role: 'assistant', content: 'I am having trouble connecting. Please try again.' }]);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1000, background: 'var(--color-card)', borderTopLeftRadius: '20px', borderTopRightRadius: '20px', boxShadow: '0 -8px 32px rgba(0,0,0,0.15)' }}>
      {/* Header */}
      <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, color: 'var(--color-text)' }}>Tessa AI</h3>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}>✕</button>
      </div>

      {/* Chat Area */}
      <div style={{ padding: '1rem 1.5rem', maxHeight: '50vh', overflowY: 'auto' }}>
        {messages.length === 0 ? (
          <p style={{ color: 'var(--color-text-muted)', textAlign: 'center' }}>Ask me anything about your business!</p>
        ) : (
          messages.map((msg, idx) => (
            <div key={idx} style={{ marginBottom: '0.75rem', textAlign: msg.role === 'user' ? 'right' : 'left' }}>
              <span style={{ display: 'inline-block', padding: '0.6rem 0.9rem', borderRadius: '12px', background: msg.role === 'user' ? 'var(--color-primary)' : 'var(--color-bg)', color: 'var(--color-text)' }}>
                {msg.content}
              </span>
            </div>
          ))
        )}
      </div>

      {/* Input Area */}
      <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--color-border)', display: 'flex', gap: '0.5rem' }}>
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Type or speak..."
          style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)' }}
        />
        <button
          onClick={isRecording ? handleStopRecording : handleStartRecording}
          style={{
            background: isRecording ? 'var(--color-danger)' : 'var(--color-accent)',
            border: 'none',
            borderRadius: '8px',
            padding: '0.6rem 0.8rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          aria-label="Voice input"
        >
          <MicIcon size={20} stroke="#fff" />
        </button>
        <button
          onClick={() => handleSend()}
          style={{ background: 'var(--color-primary)', border: 'none', borderRadius: '8px', padding: '0.6rem 1rem', cursor: 'pointer', color: '#fff' }}
        >
          Send
        </button>
      </div>
    </div>
  );
      }
