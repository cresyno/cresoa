'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../../lib/supabaseClient'

const STATUSES = ['new', 'contacted', 'closed']

export default function PublicQuotesPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const businessId = searchParams.get('business_id')

  const [quotes, setQuotes] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
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
        console.error('Fetch public quotes error:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchQuotes()
  }, [businessId])

  const updateStatus = async (id, newStatus) => {
    const { error } = await supabase.from('business_quotes').update({ status: newStatus }).eq('id', id)
    if (!error) setQuotes(prev => prev.map(q => q.id === id ? { ...q, status: newStatus } : q))
  }

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--cresoa-bg)' }}><div className="cresoa-loading-spinner" /></div>

  return (
    <div style={{ padding: '1rem', maxWidth: '900px', margin: '0 auto', background: 'var(--cresoa-bg)', minHeight: '100vh' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1rem' }}>Website Quotes</h1>
      {quotes.length === 0 ? (
        <div className="cresoa-empty-state">
          <span className="cresoa-empty-state-title">No quote requests yet</span>
          <span className="cresoa-empty-state-message">When customers request quotes on your website, they'll appear here.</span>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
          {quotes.map(quote => (
            <div key={quote.id} className="cresoa-card" style={{ padding: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <strong style={{ display: 'block', marginBottom: '0.2rem' }}>{quote.customer_name}</strong>
                  <span style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.85rem' }}>{quote.customer_phone}</span>
                </div>
                <span style={{ padding: '0.2rem 0.6rem', borderRadius: '12px', background: 'var(--cresoa-accent-soft)', color: 'var(--cresoa-accent)', fontWeight: 700, fontSize: '0.75rem', textTransform: 'capitalize' }}>{quote.status}</span>
              </div>
              {quote.message && <p style={{ marginTop: '0.5rem', color: 'var(--cresoa-text-muted)', fontSize: '0.85rem' }}>{quote.message}</p>}
              {quote.product_name && <div style={{ fontSize: '0.85rem' }}><strong>Product/Service:</strong> {quote.product_name}</div>}
              {quote.quantity && <div style={{ fontSize: '0.85rem' }}><strong>Quantity:</strong> {quote.quantity}</div>}
              {quote.specifications && <div style={{ fontSize: '0.85rem' }}><strong>Specifications:</strong> {quote.specifications}</div>}
              {quote.deadline && <div style={{ fontSize: '0.85rem' }}><strong>Deadline:</strong> {quote.deadline}</div>}
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.8rem' }}>
                {STATUSES.map(status => (
                  <button key={status} onClick={() => updateStatus(quote.id, status)} style={{ padding: '0.3rem 0.8rem', borderRadius: '6px', border: '1px solid var(--cresoa-border)', background: quote.status === status ? 'var(--cresoa-accent)' : 'transparent', color: quote.status === status ? '#fff' : 'var(--cresoa-text)', fontWeight: 600, fontSize: '0.75rem', cursor: 'pointer', textTransform: 'capitalize' }}>
                    {status}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
                                           }
