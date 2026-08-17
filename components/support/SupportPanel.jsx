import { useState, useRef, useEffect } from 'react';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import { Icon } from '../../components/Icon'; // Corrected import

export default function SupportPanel({ onClose, businessId }) {
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
      if (data.answer) {
        setMessages(prev => [...prev, { role: 'assistant', text: data.answer }]);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', text: "Tessa is having trouble connecting. Please contact support via WhatsApp." }]);
      }
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', text: "Oops! Tessa's server is offline. Please try again later." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[var(--cresoa-surface)] rounded-lg shadow-2xl">
      <div className="flex items-center justify-between p-4 border-b border-[var(--cresoa-border)]">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="font-medium text-[var(--cresoa-text)]">Tessa</span>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-[var(--cresoa-surface-secondary)] rounded-full transition-colors">
          <Icon name="x" className="w-5 h-5 text-[var(--cresoa-text)]" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-1 bg-[var(--cresoa-background)]">
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

      <ChatInput onSend={handleSendMessage} disabled={isLoading} />
    </div>
  );
          }
