import { useState } from 'react';
import { Icon } from '../../components/Icon';

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
    <form onSubmit={handleSubmit} className="flex items-center gap-2 p-3 border-t border-[var(--color-border)] bg-[var(--color-card)]">
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Ask Tessa..."
        disabled={disabled}
        className="flex-1 bg-[var(--color-bg)] border border-[var(--color-border)] outline-none rounded-lg px-3 py-2 text-[var(--color-text)] placeholder-[var(--color-text-muted)] text-sm focus:ring-2 focus:ring-[var(--color-accent)]/30"
      />
      <button 
        type="submit" 
        disabled={!input.trim() || disabled}
        className="p-2 bg-[var(--color-primary)] text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
      >
        <Icon name="send" className="w-5 h-5" />
      </button>
    </form>
  );
}
