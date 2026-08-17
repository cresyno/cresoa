'use client'

import { Suspense, useState, useRef, useEffect } from 'react';
import ChatMessage from '../../components/support/ChatMessage';
import ChatInput from '../../components/support/ChatInput';
import { useSearchParams } from 'next/navigation';

// We put the part that uses useSearchParams into its own component
function SupportContent() {
  const searchParams = useSearchParams();
  const businessId = searchParams.get('business_id');

  const [messages, setMessages] = useState([
    { role: 'assistant', text: `Hi, I'm Tessa 👋. Ask me anything about your business.` }
  ]);
  const [isLoading, setIsLoading] = useState(false);
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
      if (data.answer) setMessages(prev => [...prev, { role: 'assistant', text: data.answer }]);
      else setMessages(prev => [...prev, { role: 'assistant', text: "Tessa is having trouble connecting. Please contact support." }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', text: "Oops! Tessa's server is offline. Please try again later." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[var(--cresoa-background)]">
      <div className="flex items-center justify-between p-4 border-b border-[var(--cresoa-border)] bg-[var(--cresoa-surface)]">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="font-medium text-[var(--cresoa-text)] text-lg">Tessa</span>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-1">
        {messages.map((msg, idx) => <ChatMessage key={idx} message={msg.text} isUser={msg.role === 'user'} />)}
        {isLoading && <div className="flex justify-start mb-3">Loading...</div>}
        <div ref={messagesEndRef} />
      </div>
      <ChatInput onSend={handleSendMessage} disabled={isLoading} />
    </div>
  );
}

// The default export wraps the content in Suspense
export default function SupportPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen text-[var(--cresoa-text)]">Loading Tessa...</div>}>
      <SupportContent />
    </Suspense>
  );
          }
