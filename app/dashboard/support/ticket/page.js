'use client'

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Icon } from '../../../../components/Icon';
import { supabase } from '../../../../lib/supabaseClient';

export default function ClientTicketPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const businessId = searchParams.get('business_id');

  useEffect(() => {
    // 🛑 CATCH THE BAD ID IN THE URL BEFORE ANYTHING ELSE
    if (!businessId || businessId.trim() === '' || businessId === 'null' || businessId === 'undefined') {
      router.push('/dashboard/support');
    }
  }, [businessId, router]);

  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({ subject: '', category: '', description: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (businessId && businessId !== 'null' && businessId.trim() !== '') fetchTickets();
  }, [businessId]);

  const fetchTickets = async () => {
    if (!businessId || businessId === 'null' || businessId.trim() === '') return;
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch(`/api/support/tickets?business_id=${businessId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.tickets) setTickets(data.tickets);
    } catch (error) {
      console.error('Failed to fetch tickets');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // 🛑 FINAL FRONTEND GUARD
    if (!businessId || businessId.trim() === '' || businessId === 'null' || businessId === 'undefined') {
      alert('Business ID is invalid. Please go back to the dashboard and try again.');
      return;
    }

    if (!formData.subject || !formData.category || !formData.description) return;
    setIsSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        alert('Session expired. Please log out and log back in.');
        setIsSubmitting(false);
        return;
      }

      const res = await fetch('/api/support/ticket', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ business_id: businessId, ...formData })
      });
      if (res.ok) {
        setSuccessMessage('✅ Ticket submitted! We’ll get back to you within 24 hours.');
        setFormData({ subject: '', category: '', description: '' });
        fetchTickets();
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

  const handleBack = () => {
    router.push(`/dashboard/support?business_id=${businessId}`);
  };

  // ... [Keep the rest of your return (UI) exactly the same] ...
  return (
    <div style={{ padding: '1.5rem', maxWidth: '800px', margin: '0 auto', background: 'var(--color-bg)', minHeight: 'calc(100vh - 80px)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <button onClick={handleBack} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text)', fontSize: '1.2rem' }}>‹</button>
        <h1 style={{ color: 'var(--color-text)', fontSize: '1.5rem', fontWeight: '700', margin: 0 }}>Support Tickets</h1>
      </div>

      {successMessage && (
        <div style={{ background: '#2E7D5E15', color: '#2E7D5E', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid #2E7D5E30', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          {successMessage}
        </div>
      )}

      <div style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: '16px', padding: '1.5rem', marginBottom: '2rem', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
        <h3 style={{ color: 'var(--color-text)', fontSize: '1rem', fontWeight: '600', margin: '0 0 1rem' }}>Submit a New Ticket</h3>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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

      <div>
        <h3 style={{ color: 'var(--color-text)', fontSize: '1rem', fontWeight: '600', margin: '0 0 1rem' }}>Recent Tickets</h3>
        {loading ? (
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>Loading your tickets...</p>
        ) : tickets.length === 0 ? (
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>You haven't submitted any tickets yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {tickets.map((ticket) => (
              <div key={ticket.id} style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '1rem 1.25rem', boxShadow: '0 1px 4px rgba(0,0,0,0.02)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.25rem' }}>
                  <h4 style={{ color: 'var(--color-text)', fontSize: '0.95rem', fontWeight: '600', margin: 0 }}>{ticket.subject}</h4>
                  <span style={{ color: 'var(--color-text-muted)', fontSize: '0.7rem' }}>{new Date(ticket.created_at).toLocaleDateString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>{ticket.category}</span>
                  <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>{ticket.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
        }
