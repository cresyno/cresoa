// components/invoice/Icons.jsx
import React from 'react';

// This component is completely self-contained. It does not rely on your global Icon.jsx.
export function InvoiceIcon({ name, size = 24, stroke = 'currentColor', className = '' }) {
  const props = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: stroke,
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    className
  };

  const icons = {
    // X (Close Modal)
    close: (
      <svg {...props}>
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    ),
    // WhatsApp / Message Circle
    whatsapp: (
      <svg {...props}>
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
      </svg>
    ),
    // Download
    download: (
      <svg {...props}>
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
    ),
    // Check (Payment status or confirm)
    check: (
      <svg {...props}>
        <polyline points="20 6 9 17 4 12" />
      </svg>
    ),
    // Edit / Pencil (For the editable fields)
    edit: (
      <svg {...props}>
        <path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
      </svg>
    ),
  };

  return icons[name] || <span className={className} />;
}
