'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../../../lib/supabaseClient'
import { Navigation } from '../../../../components/Navigation'
import '../../../globals.css'

export default function AdminSeoPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const businessId = searchParams.get('business_id')

  const [loading, setLoading] = useState(true)
  const [authorized, setAuthorized] = useState(false)
  const [requests, setRequests] = useState([])
  const [toastMessage, setToastMessage] = useState('')

  const showToast = (msg) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(''), 3000)
  }

  useEffect(() => {
    const checkAuthAndFetch = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user?.email === 'taiwoabraham640@gmail.com') {
        setAuthorized(true)
        
        // Step 1: Fetch pending requests and business names
        const { data: reqData } = await supabase
          .from('seo_requests')
          .select(`
            id, 
            status, 
            created_at,
            business_id,
            businesses ( name )
          `)
          .eq('status', 'pending')
          .order('created_at', { ascending: true })
        
        if (reqData && reqData.length > 0) {
          // Step 2: Fetch the slugs for those specific business IDs
          const bizIds = reqData.map(r => r.business_id)
          const { data: pageData } = await supabase
            .from('business_public_pages')
            .select('business_id, slug')
            .in('business_id', bizIds)

          // Step 3: Merge the slug into the request data
          const mergedData = reqData.map(req => {
            const page = pageData?.find(p => p.business_id === req.business_id)
            return {
              ...req,
              slug: page?.slug || ''
            }
          })
          setRequests(mergedData)
        } else {
          setRequests([])
        }
      }
      setLoading(false)
    }
    checkAuthAndFetch()
  }, [])

  const markAsDone = async (id) => {
    await supabase.from('seo_requests').update({ status: 'completed' }).eq('id', id)
    setRequests(requests.filter(r => r.id !== id))
    showToast('Marked as submitted to Google')
  }

  const copyToClipboard = (url) => {
    navigator.clipboard.writeText(url)
    showToast('URL copied! Paste it into Search Console.')
  }

  if (loading) return <div className="order-page-loading"><div className="spinner" /></div>

  if (!authorized) {
    return (
      <div className="order-page-error" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
           <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
        </div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 8px 0', color: 'var(--cresoa-text)' }}>Not Authorized</h2>
        <p style={{ color: 'var(--cresoa-text-muted)' }}>You do not have permission to view this page.</p>
      </div>
    )
  }

  return (
    <div className="orders-page">
      {businessId && <Navigation businessId={businessId} />}

      <div className="orders-header">
        <div>
          <h1 className="orders-title">SEO Requests</h1>
          <p className="orders-subtitle">Pending Google Indexing ({requests.length})</p>
        </div>
      </div>

      {requests.length === 0 ? (
        <div className="orders-empty">
          <h3>No pending requests</h3>
          <p>All businesses are visible on Google.</p>
        </div>
      ) : (
        <div className="orders-list">
          {requests.map(req => {
            const bizName = req.businesses?.name || 'Unknown Business'
            const url = req.slug ? `https://www.cresoa.com.ng/${req.slug}` : ''

            return (
              <div key={req.id} className="cresoa-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ margin: 0, fontWeight: 700, fontSize: '1rem' }}>{bizName}</h3>
                    <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: 'var(--cresoa-text-muted)' }}>
                      Requested: {new Date(req.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span style={{ padding: '4px 8px', borderRadius: '4px', background: 'var(--color-accent-soft)', color: 'var(--color-accent)', fontSize: '0.7rem', fontWeight: 700 }}>Pending</span>
                </div>

                <div style={{ background: 'var(--cresoa-surface-soft)', padding: '12px', borderRadius: '8px', fontSize: '0.85rem', wordBreak: 'break-all', fontWeight: 600 }}>
                  {url || 'No public URL found'}
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  {url ? (
                    <>
                      <button 
                        onClick={() => copyToClipboard(url)} 
                        className="cresoa-primary-button" 
                        style={{ flex: 1, padding: '10px', fontSize: '0.8rem', display: 'flex', justifyContent: 'center' }}
                      >
                        Copy URL
                      </button>
                      <a 
                        href="https://search.google.com/search-console" 
                        target="_blank" 
                        rel="noreferrer" 
                        className="order-btn-secondary" 
                        style={{ flex: 1, padding: '10px', fontSize: '0.8rem', display: 'flex', justifyContent: 'center', textDecoration: 'none' }}
                      >
                        Open Search Console
                      </a>
                    </>
                  ) : (
                    <button disabled className="cresoa-primary-button" style={{ flex: 1, padding: '10px', fontSize: '0.8rem', opacity: 0.5 }}>
                      No URL to submit
                    </button>
                  )}
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button onClick={() => markAsDone(req.id)} className="order-btn-secondary" style={{ padding: '6px 12px', fontSize: '0.75rem' }}>
                    Mark as Done
                  </button>
                </div>

              </div>
            )
          })}
        </div>
      )}

      {toastMessage && <div className="app-toast success">{toastMessage}</div>}
    </div>
  )
  }
