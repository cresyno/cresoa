'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabaseClient'
import { getCurrentBusinessId } from '../../../lib/getBusinessId'
import { Navigation } from '../../../components/Navigation'
import '../../globals.css'

const Icon = ({ name, size = 20, stroke = 'currentColor' }) => {
  const icons = {
    plus: <><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></>,
    search: <><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></>,
    arrowRight: <><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></>,
    file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></>,
    alert: <><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></>,
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{icons[name]}</svg>
}

export default function InvoicesPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [invoices, setInvoices] = useState([])
  const [businessId, setBusinessId] = useState(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    const fetchInvoices = async () => {
      const bizId = getCurrentBusinessId()
      if (!bizId) {
        router.push('/dashboard')
        return
      }
      setBusinessId(bizId)

      try {
        const { data, error } = await supabase
          .from('invoices')
          .select(`
            *,
            customers ( id, name, first_name, last_name, phone )
          `)
          .eq('business_id', bizId)
          .order('created_at', { ascending: false })

        if (error) throw error
        setInvoices(data || [])
      } catch (err) {
        console.error(err)
        setError('Could not load invoices.')
      } finally {
        setLoading(false)
      }
    }
    fetchInvoices()
  }, [router])

  const filtered = invoices.filter(inv => {
    const customerName = inv.customers?.name || inv.customers?.first_name || ''
    const invNum = inv.invoice_number || ''
    const matchSearch = customerName.toLowerCase().includes(search.toLowerCase()) || invNum.toLowerCase().includes(search.toLowerCase())

    let matchFilter = true
    if (filter === 'paid') matchFilter = inv.status === 'paid' || inv.balance_due <= 0
    if (filter === 'unpaid') matchFilter = inv.status !== 'paid' && inv.balance_due > 0
    if (filter === 'overdue') matchFilter = inv.status === 'overdue'

    return matchSearch && matchFilter
  })

  const formatMoney = (val) => `₦${Number(val || 0).toLocaleString('en-NG')}`
  const formatDate = (date) => date ? new Date(date).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'

  const statusBadge = (inv) => {
    if (inv.status === 'paid' || inv.balance_due <= 0) return { label: 'Paid', bg: 'var(--cresoa-success-soft)', color: 'var(--cresoa-success)' }
    if (inv.status === 'overdue') return { label: 'Overdue', bg: 'var(--cresoa-danger-soft)', color: 'var(--cresoa-danger)' }
    return { label: 'Balance Due', bg: 'var(--cresoa-warning-soft)', color: 'var(--cresoa-warning)' }
  }

  if (loading) return <div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}><div className="cresoa-loading-spinner" /></div>

  if (error) return (
    <div style={{ minHeight: '70vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <Icon name="alert" size={30} stroke="var(--cresoa-danger)" />
      <p>{error}</p>
      <button onClick={() => router.push('/dashboard')} className="cresoa-primary-button">Go back</button>
    </div>
  )

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto', paddingBottom: '80px' }}>
      <Navigation businessId={businessId} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--cresoa-text)' }}>Invoices</h1>
        <button onClick={() => router.push(`/dashboard/invoices/new?business_id=${businessId}`)} className="cresoa-primary-button" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Icon name="plus" size={16} stroke="#fff" /> New Invoice
        </button>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '200px', display: 'flex', alignItems: 'center', background: 'var(--cresoa-surface)', border: '1px solid var(--cresoa-border)', borderRadius: '8px', padding: '0.4rem 0.8rem' }}>
          <Icon name="search" size={16} stroke="var(--cresoa-text-muted)" style={{ marginRight: '0.5rem' }} />
          <input type="text" placeholder="Search by customer or invoice #" value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', color: 'var(--cresoa-text)' }} />
        </div>
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          {['all', 'paid', 'unpaid', 'overdue'].map(tab => (
            <button key={tab} onClick={() => setFilter(tab)} style={{
              padding: '0.4rem 0.9rem',
              borderRadius: '20px',
              border: `1px solid ${filter === tab ? 'var(--cresoa-accent)' : 'var(--cresoa-border)'}`,
              background: filter === tab ? 'var(--cresoa-accent-soft)' : 'transparent',
              color: filter === tab ? 'var(--cresoa-accent)' : 'var(--cresoa-text-muted)',
              fontWeight: 600,
              fontSize: '0.8rem',
              cursor: 'pointer',
            }}>{tab.charAt(0).toUpperCase() + tab.slice(1)}</button>
          ))}
        </div>
      </div>

      {invoices.length === 0 && (
        <div style={{ textAlign: 'center', padding: '4rem 0', background: 'var(--cresoa-surface)', borderRadius: '16px', border: '1px solid var(--cresoa-border)' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '20px', background: 'var(--cresoa-accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
            <Icon name="file" size={40} stroke="var(--cresoa-accent)" />
          </div>
          <h3 style={{ color: 'var(--cresoa-text)', marginBottom: '0.5rem' }}>No invoices yet</h3>
          <p style={{ color: 'var(--cresoa-text-muted)', marginBottom: '1.5rem' }}>Create your first invoice to start tracking payments.</p>
          <button onClick={() => router.push(`/dashboard/invoices/new?business_id=${businessId}`)} className="cresoa-primary-button"><Icon name="plus" size={16} stroke="#fff" style={{ marginRight: '0.3rem' }} /> Create First Invoice</button>
        </div>
      )}

      {invoices.length > 0 && (
        <>
          {/* Desktop Table */}
          <div style={{ display: 'none', '@media (min-width: 768px)': { display: 'block' } }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', background: 'var(--cresoa-surface)', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--cresoa-border)' }}>
              <thead>
                <tr style={{ background: 'var(--cresoa-bg)', borderBottom: '1px solid var(--cresoa-border)' }}>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: 'var(--cresoa-text-muted)' }}>Invoice #</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: 'var(--cresoa-text-muted)' }}>Customer</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: 'var(--cresoa-text-muted)' }}>Date</th>
                  <th style={{ padding: '12px', textAlign: 'right', fontSize: '0.75rem', fontWeight: 700, color: 'var(--cresoa-text-muted)' }}>Amount</th>
                  <th style={{ padding: '12px', textAlign: 'center', fontSize: '0.75rem', fontWeight: 700, color: 'var(--cresoa-text-muted)' }}>Status</th>
                  <th style={{ padding: '12px' }}></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(inv => {
                  const customerName = inv.customers?.name || inv.customers?.first_name || 'Unknown'
                  const badge = statusBadge(inv)
                  return (
                    <tr key={inv.id} onClick={() => router.push(`/dashboard/invoices/${inv.id}?business_id=${businessId}`)} style={{ cursor: 'pointer', borderBottom: '1px solid var(--cresoa-border)' }}>
                      <td style={{ padding: '12px', fontWeight: 600 }}>{inv.invoice_number}</td>
                      <td style={{ padding: '12px' }}>{customerName}</td>
                      <td style={{ padding: '12px', color: 'var(--cresoa-text-muted)', fontSize: '0.85rem' }}>{formatDate(inv.issue_date)}</td>
                      <td style={{ padding: '12px', textAlign: 'right', fontWeight: 600 }}>{formatMoney(inv.total)}</td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <span style={{ padding: '0.25rem 0.75rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700, background: badge.bg, color: badge.color }}>{badge.label}</span>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right' }}><Icon name="arrowRight" size={16} stroke="var(--cresoa-text-muted)" /></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', '@media (min-width: 768px)': { display: 'none' } }}>
            {filtered.map(inv => {
              const customerName = inv.customers?.name || inv.customers?.first_name || 'Unknown'
              const badge = statusBadge(inv)
              return (
                <div key={inv.id} onClick={() => router.push(`/dashboard/invoices/${inv.id}?business_id=${businessId}`)} style={{ background: 'var(--cresoa-surface)', borderRadius: '12px', padding: '1rem', border: '1px solid var(--cresoa-border)', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <strong>{inv.invoice_number}</strong>
                    <span style={{ padding: '0.2rem 0.6rem', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 700, background: badge.bg, color: badge.color }}>{badge.label}</span>
                  </div>
                  <p style={{ margin: '0 0 0.5rem', color: 'var(--cresoa-text-muted)', fontSize: '0.85rem' }}>{customerName}</p>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--cresoa-text-muted)' }}>{formatDate(inv.issue_date)}</span>
                    <strong style={{ fontSize: '0.9rem' }}>{formatMoney(inv.total)}</strong>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
      }
