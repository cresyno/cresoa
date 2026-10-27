'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import EditorTab from './components/EditorTab'
import OrdersTab from './components/OrdersTab'
import QuotesTab from './components/QuotesTab'
import ProductsTab from './components/ProductsTab'

const TABS = [
  { id: 'editor', label: 'Editor' },
  { id: 'orders', label: 'Online Orders' },
  { id: 'quotes', label: 'Quote Requests' },
  { id: 'products', label: 'Storefront Products' },
]

export default function MyWebsiteHub() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const businessId = searchParams.get('business_id')
  
  // Get tab from URL or default to editor
  const currentTab = searchParams.get('tab') || 'editor'

  const handleTabChange = (tabId) => {
    router.push(`/dashboard/my-website?business_id=${businessId}&tab=${tabId}`)
  }

  if (!businessId) return <div style={{ padding: '2rem', textAlign: 'center' }}>Missing Business ID</div>

  return (
    <div style={{ minHeight: '100vh', background: 'var(--cresoa-bg)' }}>
      {/* Tab Navigation Header */}
      <div style={{ 
        position: 'sticky', 
        top: 0, 
        zIndex: 10,
        background: 'var(--cresoa-surface)', 
        borderBottom: '1px solid var(--cresoa-border)',
        padding: '0 1rem'
      }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <div style={{ padding: '1.5rem 0 1rem 0' }}>
            <p style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', margin: 0 }}>My Business</p>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0.2rem 0' }}>My Website</h1>
          </div>
          
          <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', scrollbarWidth: 'none' }}>
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '0.8rem 0.5rem',
                  fontSize: '0.95rem',
                  fontWeight: currentTab === tab.id ? 700 : 500,
                  color: currentTab === tab.id ? 'var(--cresoa-accent)' : 'var(--cresoa-text-muted)',
                  borderBottom: currentTab === tab.id ? '3px solid var(--cresoa-accent)' : '3px solid transparent',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  whiteSpace: 'nowrap'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div style={{ padding: '1rem', maxWidth: '1000px', margin: '0 auto' }}>
        {currentTab === 'editor' && <EditorTab businessId={businessId} />}
        {currentTab === 'orders' && <OrdersTab businessId={businessId} />}
        {currentTab === 'quotes' && <QuotesTab businessId={businessId} />}
        {currentTab === 'products' && <ProductsTab businessId={businessId} />}
      </div>
    </div>
  )
  }
