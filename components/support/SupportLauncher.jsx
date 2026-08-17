'use client'
import { useState } from 'react';
import { Icon } from '../../components/Icon';
import SupportPanel from './SupportPanel';

export default function SupportLauncher({ businessId }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center w-14 h-14 rounded-full bg-[var(--cresoa-primary)] text-white shadow-lg hover:scale-105 transition-transform"
      >
        <Icon name="message-circle" className="w-6 h-6" />
      </button>

      {isOpen && (
        <div className="absolute bottom-20 right-0 w-[350px] h-[500px] max-w-[90vw] max-h-[70vh] overflow-hidden rounded-lg shadow-2xl border border-[var(--cresoa-border)]">
          <SupportPanel onClose={() => setIsOpen(false)} businessId={businessId} />
        </div>
      )}
    </div>
  );
}
