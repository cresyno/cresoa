'use client'
import { useState } from 'react';
import { Icon } from '../../components/Icon';

export default function TicketForm({ businessId, onClose, onSuccess }) {
  const [formData, setFormData] = useState({ subject: '', category: '', description: '' });
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.subject || !formData.category || !formData.description) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/support/ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ business_id: businessId, ...formData })
      });
      if (res.ok) onSuccess();
      else alert('Failed to submit ticket. Please try again.');
    } catch (error) {
      alert('Network error. Please check your connection.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md bg-[var(--color-card)] rounded-xl shadow-2xl border border-[var(--color-border)] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-[var(--color-border)]">
          <h2 className="font-semibold text-[var(--color-text)]">Submit a Ticket</h2>
          <button onClick={onClose} className="p-1 hover:bg-[var(--color-bg)] rounded-full transition-colors">
            <Icon name="x" className="w-5 h-5 text-[var(--color-text)]" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1">Subject</label>
            <input 
              type="text" name="subject" value={formData.subject} onChange={handleChange}
              className="w-full px-3 py-2 text-sm bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg text-[var(--color-text)] placeholder-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/50"
              placeholder="Briefly describe the issue" required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1">Category</label>
            <select name="category" value={formData.category} onChange={handleChange}
              className="w-full px-3 py-2 text-sm bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/50" required
            >
              <option value="">Select a category</option>
              <option value="billing">Billing / Subscription</option>
              <option value="staff">Staff / Team</option>
              <option value="orders">Orders / Production</option>
              <option value="technical">Technical Issue (Bug)</option>
              <option value="account">Account / Login</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1">Description</label>
            <textarea name="description" rows="4" value={formData.description} onChange={handleChange}
              className="w-full px-3 py-2 text-sm bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg text-[var(--color-text)] placeholder-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/50 resize-none"
              placeholder="Provide detailed information so we can help you faster..." required
            />
          </div>
          <button type="submit" disabled={isLoading}
            className="w-full py-2.5 bg-[var(--color-primary)] text-white font-semibold text-sm rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Submitting...' : 'Submit Ticket'}
          </button>
        </form>
      </div>
    </div>
  );
}
