'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '../../../lib/supabaseClient'

const STATUSES = ['new', 'contacted', 'closed']
const STATUS_COLORS = {
  new: '#D4A52A',
  contacted: '#3B82F6',
  closed: '#6B7280',
}

const parseSpecs = (specs) => {
  if (!specs) return []
  try {
    const obj = typeof specs === 'string' ? JSON.parse(specs) : specs
    if (!obj || typeof obj !== 'object') return []
    return Object.entries(obj).map(([key, value]) => ({ key, value }))
  } catch {
    return []
  }
}

export default function PublicQuotesPage() {
  const searchParams = useSearchParams()
  const businessId = searchParams.get('business_id')

  const [quotes, setQuotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

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
      console.error(err)
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
    if (!error) fetchQuotes()
  }

  const filteredQuotes = quotes.filter(quote => {
    if (statusFilter !== 'all' && quote.status !== statusFilter) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      return (
        quote.customer_name?.toLowerCase().includes(q) ||
        quote.customer_phone?.includes(q) ||
        quote.message?.toLowerCase().includes(q) ||
        quote.product_name?.toLowerCase().includes(q)
      )
    }
    return true
  })

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--cresoa-bg)' }}><div className="cresoa-loading-spinner" /></div>

  return (
    <div style={{ padding: '1rem', maxWidth: '1000px', margin: '0 auto', background: 'var(--cresoa-bg)', minHeight: '100vh' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1rem' }}>Quote Requests</h1>

      {/* Search & Filter */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Search by name, phone, product..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ padding: '0.6rem 0.9rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', flex: 1, minWidth: '200px' }}
        />
        <button onClick={() => setStatusFilter('all')} style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: statusFilter === 'all' ? '2px solid var(--cresoa-accent)' : '1px solid var(--cresoa-border)', background: statusFilter === 'all' ? 'var(--cresoa-accent-soft)' : 'var(--cresoa-surface)', cursor: 'pointer', fontWeight: 600 }}>All</button>
        {STATUSES.map(status => (
          <button key={status} onClick={() => setStatusFilter(status)} style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: statusFilter === status ? '2px solid var(--cresoa-accent)' : '1px solid var(--cresoa-border)', background: statusFilter === status ? 'var(--cresoa-accent-soft)' : 'var(--cresoa-surface)', cursor: 'pointer', fontWeight: 600, textTransform: 'capitalize' }}>{status}</button>
        ))}
      </div>

      {filteredQuotes.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--cresoa-text-muted)' }}>
          <p>No quote requests found.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {filteredQuotes.map(quote => {
            const specs = parseSpecs(quote.specifications)
            return (
              <div key={quote.id} style={{ background: 'var(--cresoa-surface)', borderRadius: '12px', padding: '1.2rem', border: '1px solid var(--cresoa-border)' }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>{quote.customer_name || 'Unknown'}</h3>
                    <p style={{ margin: '0.2rem 0', color: 'var(--cresoa-text-muted)', fontSize: '0.85rem' }}>{quote.customer_phone || 'No phone'}</p>
                  </div>
                  <span style={{ padding: '0.3rem 0.8rem', borderRadius: '20px', background: STATUS_COLORS[quote.status] + '20', color: STATUS_COLORS[quote.status], fontWeight: 700, fontSize: '0.8rem', textTransform: 'capitalize' }}>{quote.status}</span>
                </div>

                {/* Message */}
                {quote.message && (
                  <p style={{ margin: '0.8rem 0', color: 'var(--cresoa-text)', lineHeight: 1.6 }}>{quote.message}</p>
                )}

                {/* Product/Service */}
                {quote.product_name && (
                  <div style={{ marginBottom: '0.5rem' }}>
                    <strong style={{ fontSize: '0.85rem' }}>Product/Service:</strong>
                    <span style={{ marginLeft: '0.5rem', fontSize: '0.9rem' }}>{quote.product_name}</span>
                  </div>
                )}

                {/* Specifications (parsed) */}
                {specs.length > 0 && (
                  <div style={{ background: 'var(--cresoa-bg)', borderRadius: '8px', padding: '0.8rem', marginTop: '0.5rem' }}>
                    <strong style={{ fontSize: '0.85rem', marginBottom: '0.3rem', display: 'block' }}>Details:</strong>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.3rem' }}>
                      {specs.map(({ key, value }) => (
                        <div key={key} style={{ fontSize: '0.85rem' }}>
                          <span style={{ color: 'var(--cresoa-text-muted)' }}>{key.replace(/_/g, ' ')}:</span>
                          <span style={{ fontWeight: 600 }}> {value || '—'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Contact & Action Buttons */}
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                  {quote.customer_phone && (
                    <a href={`tel:${quote.customer_phone}`} style={{ padding: '0.4rem 0.8rem', borderRadius: '8px', background: '#25D366', color: '#fff', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 600 }}>📞 Call</a>
                  )}
                  {quote.customer_phone && (
                    <a href={`https://wa.me/${quote.customer_phone.replace(/\D/g, '')}`} target="_blank" rel="noopener" style={{ padding: '0.4rem 0.8rem', borderRadius: '8px', background: '#25D366', color: '#fff', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 600 }}>💬 WhatsApp</a>
                  )}
                  {quote.customer_email && (
                    <a href={`mailto:${quote.customer_email}`} style={{ padding: '0.4rem 0.8rem', borderRadius: '8px', background: '#3B82F6', color: '#fff', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 600 }}>✉️ Email</a>
                  )}
                </div>

                {/* Status Update */}
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.8rem', borderTop: '1px solid var(--cresoa-border)', paddingTop: '0.8rem' }}>
                  {STATUSES.map(status => (
                    <button key={status} onClick={() => updateStatus(quote.id, status)} style={{ padding: '0.3rem 0.8rem', borderRadius: '6px', border: '1px solid var(--cresoa-border)', background: quote.status === status ? 'var(--cresoa-accent)' : 'transparent', color: quote.status === status ? '#fff' : 'var(--cresoa-text)', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', textTransform: 'capitalize' }}>
                      {status}
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
          }
