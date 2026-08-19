'use client'

import { useState, useEffect } from 'react';
import { Icon } from '../../../components/Icon';
import { supabase } from '../../../lib/supabaseClient';

export default function AdminSupportPage() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch('/api/support/tickets', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) {
        const err = await res.json();
        setErrorMessage(`Error ${res.status}: ${err.error || 'Unknown error'}`);
        setLoading(false);
        return;
      }
      const data = await res.json();
      if (data.tickets) setTickets(data.tickets);
    } catch (error) {
      setErrorMessage('Network error. Could not connect to the admin server.');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (ticketId, newStatus) => {
    setUpdatingStatus(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch('/api/support/ticket/status', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ ticketId, status: newStatus })
      });

      if (!res.ok) {
        const err = await res.json();
        alert(`Failed to update status: ${err.error || 'Unknown error'}`);
        return;
      }

      // Update local state immediately
      setTickets(prev =>
        prev.map(t => (t.id === ticketId ? { ...t, status: newStatus } : t))
      );
    } catch (error) {
      alert('Network error while updating status.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleSendReply = async () => {
    if (!replyMessage.trim() || !selectedTicket) return;
    setIsSending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch('/api/support/ticket/reply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ticketId: selectedTicket.id,
          message: replyMessage,
          status: 'resolved'
        })
      });

      if (!res.ok) {
        const err = await res.json();
        alert(`Failed to send reply: ${err.error || 'Unknown error'}`);
        return;
      }

      // Update local state: mark as resolved
      setTickets(prev =>
        prev.map(t => (t.id === selectedTicket.id ? { ...t, status: 'resolved' } : t))
      );
      setSelectedTicket(null);
      setReplyMessage('');
      alert('Reply sent successfully! Check your inbox.');
    } catch (error) {
      alert('Network error while sending reply.');
    } finally {
      setIsSending(false);
    }
  };

  const filteredTickets = statusFilter === 'all'
    ? tickets
    : tickets.filter(t => t.status === statusFilter);

  return (
    <div style={{ padding: '2rem', background: 'var(--color-bg)', minHeight: '100vh', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ color: 'var(--color-text)', fontSize: '1.8rem', fontWeight: '700', marginBottom: '0.5rem' }}>Admin · Support Tickets</h1>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: '2rem' }}>Manage tickets, reply to customers, and track resolution.</p>

      {errorMessage && (
        <div style={{ background: 'var(--color-danger)15', color: 'var(--color-danger)', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid var(--color-danger)30', marginBottom: '1rem' }}>
          <strong>Error:</strong> {errorMessage}
        </div>
      )}

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {['all', 'open', 'in_progress', 'resolved'].map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            style={{
              padding: '0.4rem 1rem',
              borderRadius: '20px',
              border: '1px solid var(--color-border)',
              background: statusFilter === status ? 'var(--color-primary)' : 'transparent',
              color: statusFilter === status ? '#fff' : 'var(--color-text)',
              cursor: 'pointer',
              fontSize: '0.8rem',
              fontWeight: 500,
              transition: 'all 0.2s'
            }}
          >
            {status.replace('_', ' ')}
          </button>
        ))}
      </div>

      {loading ? (
        <p style={{ color: 'var(--color-text-muted)' }}>Loading tickets...</p>
      ) : tickets.length === 0 ? (
        <p style={{ color: 'var(--color-text-muted)' }}>No tickets have been submitted yet. Check back later.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {filteredTickets.map((ticket) => (
            <div
              key={ticket.id}
              style={{
                background: 'var(--color-card)',
                border: '1px solid var(--color-border)',
                borderRadius: '12px',
                padding: '1rem 1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
                <div>
                  <h4 style={{ margin: '0 0 0.25rem', fontSize: '1rem', color: 'var(--color-text)' }}>{ticket.subject}</h4>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span>{ticket.email || 'No email'}</span> • <span>{ticket.category}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <select
                    value={ticket.status}
                    onChange={(e) => handleStatusChange(ticket.id, e.target.value)}
                    disabled={updatingStatus}
                    style={{
                      padding: '0.25rem 0.5rem',
                      borderRadius: '6px',
                      border: '1px solid var(--color-border)',
                      background: 'var(--color-bg)',
                      color: 'var(--color-text)',
                      fontSize: '0.8rem'
                    }}
                  >
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                  </select>
                  <button
                    onClick={() => setSelectedTicket(ticket)}
                    style={{
                      padding: '0.25rem 0.75rem',
                      borderRadius: '6px',
                      border: 'none',
                      background: 'var(--color-primary)',
                      color: '#fff',
                      fontSize: '0.8rem',
                      cursor: 'pointer'
                    }}
                  >
                    Reply
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedTicket && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            zIndex: 999,
            backdropFilter: 'blur(4px)'
          }}
        >
          <div
            style={{
              background: 'var(--color-card)',
              borderRadius: '16px',
              maxWidth: '500px',
              width: '100%',
              padding: '1.5rem',
              boxShadow: '0 20px 60px rgba(0,0,0,0.2)'
            }}
          >
            <h3 style={{ margin: '0 0 0.5rem', color: 'var(--color-text)' }}>Reply to Customer</h3>
            <p style={{ margin: '0 0 1rem', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
              Replying to: <strong>{selectedTicket.subject}</strong>
              <br />
              <span style={{ fontSize: '0.75rem' }}>{selectedTicket.email}</span>
            </p>
            <textarea
              value={replyMessage}
              onChange={(e) => setReplyMessage(e.target.value)}
              rows="5"
              placeholder="Type your resolution message here..."
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '8px',
                border: '1px solid var(--color-border)',
                background: 'var(--color-bg)',
                color: 'var(--color-text)',
                fontSize: '0.95rem',
                fontFamily: 'inherit',
                resize: 'vertical'
              }}
            />
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button
                onClick={() => { setSelectedTicket(null); setReplyMessage(''); }}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  border: '1px solid var(--color-border)',
                  background: 'transparent',
                  color: 'var(--color-text)',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSendReply}
                disabled={!replyMessage.trim() || isSending}
                style={{
                  padding: '0.5rem 1.5rem',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'var(--color-primary)',
                  color: '#fff',
                  cursor: 'pointer',
                  fontWeight: 600,
                  opacity: (!replyMessage.trim() || isSending) ? '0.7' : '1'
                }}
              >
                {isSending ? 'Sending...' : 'Send Email & Resolve'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
                    }
