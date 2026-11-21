'use client';
import { useState, useEffect } from 'react'
import { supabase } from '../../../../lib/supabaseClient'

export default function QuotesTab({ businessId }) {
  const [quotes, setQuotes] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchQuotes = async () => {
    const { data } = await supabase
      .from('public_quotes') // ✅ Using exact table name
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })
    setQuotes(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchQuotes() }, [businessId])

  if (loading) return <div>Loading quotes...</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {quotes.length === 0 ? <p>No quote requests yet.</p> : quotes.map(quote => (
        <div key={quote.id} style={{ background: 'var(--cresoa-surface)', padding: '1.2rem', borderRadius: '12px', border: '1px solid var(--cresoa-border)' }}>
          <h3>{quote.customer_name} ({quote.customer_phone})</h3>
          <p style={{ color: 'var(--cresoa-text-muted)', marginTop: '0.5rem' }}>{quote.message || 'No message provided.'}</p>
          <a href={`https://wa.me/${quote.customer_phone.replace(/\D/g, '')}`} target="_blank" style={{ display: 'inline-block', marginTop: '1rem', padding: '0.5rem 1rem', background: '#25D366', color: '#fff', borderRadius: '6px', textDecoration: 'none' }}>
            Reply on WhatsApp
          </a>
        </div>
      ))}
    </div>
  )
}
