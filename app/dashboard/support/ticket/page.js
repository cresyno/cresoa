'use client'

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '../../../../components/Icon';
import { supabase } from '../../../../lib/supabaseClient';

export default function ClientTicketPage() {
  const router = useRouter();

  const [formData, setFormData] = useState({ 
    email: '', 
    subject: '', 
    category: '', 
    description: '' 
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.email) {
        setFormData(prev => ({ ...prev, email: session.user.email }));
      }
    };
    init();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.email || !formData.subject || !formData.category || !formData.description) return;
    setIsSubmitting(true);
    try {
      // ✅ Sends directly to the new backend. No headers, no auth, no business_id.
      const res = await fetch('/api/support/ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      if (res.ok) {
        setSuccessMessage('✅ Ticket submitted! We’ll reply to your email within 24 hours.');
        setFormData(prev => ({ ...prev, subject: '', category: '', description: '' }));
        setTimeout(() => setSuccessMessage(''), 5000);
      } else {
        const errData = await res.json();
        alert(`Failed: ${errData.error || 'Please try again.'}`);
      }
    } catch (error) {
      alert('Network error. Please check your connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => router.push('/dashboard/support');

  return (
    <div style={{ padding: '1.5rem', maxWidth: '800px', margin: '0 auto', background: 'var(--color-bg)', minHeight: 'calc(100vh - 80px)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <button onClick={handleBack} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text)', fontSize: '1.2rem' }}>‹</button>
        <h1 style={{ color: 'var(--color-text)', fontSize: '1.5rem', fontWeight: '700', margin: 0 }}>Submit a Ticket</h1>
      </div>
      {successMessage && (
        <div style={{ background: '#2E7D5E15', color: '#2E7D5E', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid #2E7D5E30', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          {successMessage}
        </div>
      )}
      <div style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
        <h3 style={{ color: 'var(--color-text)', fontSize: '1rem', fontWeight: '600', margin: '0 0 1rem' }}>Contact Support</h3>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>Your Email Address (We'll reply here)</label>
            <input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} required style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)', fontSize: '0.95rem' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>Subject</label>
            <input type="text" value={formData.subject} onChange={(e) => setFormData({...formData, subject: e.target.value})} placeholder="Briefly describe the issue" required style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)', fontSize: '0.95rem' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>Category</label>
            <select value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} required style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)', fontSize: '0.95rem' }}>
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
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>Description</label>
            <textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} rows="4" placeholder="Provide detailed information so we can help you faster..." required style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)', fontSize: '0.95rem', resize: 'vertical', fontFamily: 'inherit' }} />
          </div>
          <button type="submit" disabled={isSubmitting} style={{ width: '100%', padding: '0.7rem', borderRadius: '10px', border: 'none', background: 'var(--color-primary)', color: '#fff', fontWeight: '600', fontSize: '1rem', cursor: 'pointer', opacity: isSubmitting ? '0.7' : '1' }}>
            {isSubmitting ? 'Submitting...' : 'Submit Ticket'}
          </button>
        </form>
      </div>
    </div>
  );
}
