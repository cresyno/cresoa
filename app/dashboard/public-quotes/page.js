'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '../../../lib/supabaseClient'

const STATUSES = ['new', 'contacted', 'closed']

export default function QuotesPage() {
  const searchParams = useSearchParams()
  const businessId = searchParams.get('business_id')

  const [quotes, setQuotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [message, setMessage] = useState('')

  const fetchQuotes = async () => {
    if (!businessId) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('business_quotes')
        .select('*')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false })
      if (error) throw error
      setQuotes(data || [])
    } catch (err) {
      setMessage('Error loading quotes: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchQuotes()
  }, [businessId])

  const updateStatus = async (id, newStatus) => {
    const { error } = await supabase
      .from('business_quotes')
      .update({ status: newStatus })
      .eq('id', id)
    if (error) setMessage(error.message)
    else fetchQuotes()
  }

  const filteredQuotes = statusFilter === 'all' ? quotes : quotes.filter(q => q.status === statusFilter)

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--cresoa-bg)' }}><div className="cresoa-loading-spinner" /></div>

  return (
    <div style={{ padding: '1rem', maxWidth: '1000px', margin: '0 auto', background: 'var(--cresoa-bg)', minHeight: '100vh' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1rem' }}>Quotes</h1>
      {message && <div style={{ padding: '0.6rem 1rem', borderRadius: '8px', marginBottom: '1rem', background: 'var(--cresoa-danger-soft)', color: 'var(--cresoa-danger)' }}>{message}</div>}

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <button onClick={() => setStatusFilter('all')} style={{ padding: '0.4rem 0.8rem', borderRadius: '6px', border: statusFilter === 'all' ? '2px solid var(--cresoa-accent)' : '1px solid var(--cresoa-border)', background: statusFilter === 'all' ? 'var(--cresoa-accent-soft)' : 'var(--cresoa-surface)', cursor: 'pointer' }}>All</button>
        {STATUSES.map(status => (
          <button key={status} onClick={() => setStatusFilter(status)} style={{ padding: '0.4rem 0.8rem', borderRadius: '6px', border: statusFilter === status ? '2px solid var(--cresoa-accent)' : '1px solid var(--cresoa-border)', background: statusFilter === status ? 'var(--cresoa-accent-soft)' : 'var(--cresoa-surface)', cursor: 'pointer', textTransform: 'capitalize' }}>{status}</button>
        ))}
      </div>

      {filteredQuotes.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--cresoa-text-muted)' }}>No quotes yet.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {filteredQuotes.map(quote => (
            <div key={quote.id} style={{ background: 'var(--cresoa-surface)', borderRadius: '12px', padding: '1rem', border: '1px solid var(--cresoa-border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <strong>{quote.customer_name}</strong>
                  <div style={{ fontSize: '0.85rem', color: 'var(--cresoa-text-muted)' }}>{quote.customer_phone}</div>
                </div>
                <span style={{ padding: '0.2rem 0.6rem', borderRadius: '12px', background: 'var(--cresoa-accent-soft)', color: 'var(--cresoa-accent)', fontWeight: 700, fontSize: '0.75rem', textTransform: 'capitalize' }}>{quote.status}</span>
              </div>
              {quote.message && <p style={{ marginTop: '0.5rem', color: 'var(--cresoa-text-muted)', fontSize: '0.9rem' }}>{quote.message}</p>}
              {quote.product_name && <div style={{ fontSize: '0.85rem' }}><strong>Product/Service:</strong> {quote.product_name}</div>}
              {quote.quantity && <div style={{ fontSize: '0.85rem' }}><strong>Quantity:</strong> {quote.quantity}</div>}
              {quote.specifications && <div style={{ fontSize: '0.85rem' }}><strong>Specs:</strong> {quote.specifications}</div>}
              {quote.deadline && <div style={{ fontSize: '0.85rem' }}><strong>Deadline:</strong> {quote.deadline}</div>}
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.8rem' }}>
                {STATUSES.map(status => (
                  <button key={status} onClick={() => updateStatus(quote.id, status)} style={{ padding: '0.3rem 0.6rem', borderRadius: '6px', border: '1px solid var(--cresoa-border)', background: quote.status === status ? 'var(--cresoa-accent)' : 'transparent', color: quote.status === status ? '#fff' : 'var(--cresoa-text)', fontWeight: 600, fontSize: '0.75rem', cursor: 'pointer', textTransform: 'capitalize' }}>{status}</button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
                                  }
