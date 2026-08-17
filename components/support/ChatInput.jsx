// components/support/ChatInput.jsx
import { useState } from 'react';
import Icon from '@/components/Icon';

export default function ChatInput({ onSend, disabled }) {
  const [input, setInput] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (input.trim() && !disabled) {
      onSend(input.trim());
      setInput('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 p-3 border-t border-[var(--cresoa-border)] bg-[var(--cresoa-surface)]">
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Ask Tessa..."
        disabled={disabled}
        className="flex-1 bg-transparent border-none outline-none text-[var(--cresoa-text)] placeholder-gray-400 text-sm"
      />
      <button 
        type="submit" 
        disabled={!input.trim() || disabled}
        className="p-2 text-[var(--cresoa-primary)] disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 transition-transform"
      >
        <Icon name="send" className="w-5 h-5" />
      </button>
    </form>
  );
}
