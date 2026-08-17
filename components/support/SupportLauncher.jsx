// components/support/SupportLauncher.jsx
import { useState } from 'react';
import Icon from '@/components/Icon';

export default function SupportLauncher() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center w-14 h-14 rounded-full bg-[var(--cresoa-primary)] text-white shadow-lg hover:scale-105 transition-transform"
      >
        <Icon name="message-circle" className="w-6 h-6" />
      </button>

      {/* The Chat Panel (To build in Step 6) */}
      {isOpen && (
        <div className="absolute bottom-20 right-0 w-80 h-96 bg-[var(--cresoa-surface)] rounded-lg shadow-2xl border border-[var(--cresoa-border)] p-4">
          <p className="text-[var(--cresoa-text)] font-medium">Hi, I'm Tessa 👋</p>
          <p className="text-sm text-gray-500 mt-2">Ask me anything about your business.</p>
        </div>
      )}
    </div>
  );
}
