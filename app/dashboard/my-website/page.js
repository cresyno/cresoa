'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import EditorTab from './components/EditorTab'
import OrdersTab from './components/OrdersTab'
import QuotesTab from './components/QuotesTab'
import ProductsTab from './components/ProductsTab'
import '../../globals.css'

const TABS = [
  { id: 'editor', label: 'Store Editor' },
  { id: 'orders', label: 'Online Orders' },
  { id: 'quotes', label: 'Quote Requests' },
  { id: 'products', label: 'Products' },
]

export default function MyWebsiteHub() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const businessId = searchParams.get('business_id')
  
  const currentTab = searchParams.get('tab') || 'editor'

  const handleTabChange = (tabId) => {
    router.push(`/dashboard/my-website?business_id=${businessId}&tab=${tabId}`)
  }

  if (!businessId) return <div style={{ padding: '2rem', textAlign: 'center' }}>Missing Business ID</div>

  return (
    <div style={{ minHeight: '100vh', background: 'var(--cresoa-bg)' }}>
      
      {/* HEADER */}
      <div style={{ padding: '1.25rem 1.25rem 0 1.25rem', maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: 'var(--cresoa-text)' }}>My Website</h1>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: 'var(--cresoa-text-muted)' }}>Manage your public storefront</p>
          </div>
        </div>

        {/* SMART TABS */}
        <div className="smart-tabs-container">
          {TABS.map(tab => (
            <button
              key={tab.id}
              className={`smart-tab ${currentTab === tab.id ? 'active' : ''}`}
              onClick={() => handleTabChange(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* TAB CONTENT */}
      <div style={{ padding: '0 1.25rem' }}>
        {currentTab === 'editor' && <EditorTab businessId={businessId} />}
        {currentTab === 'orders' && <OrdersTab businessId={businessId} />}
        {currentTab === 'quotes' && <QuotesTab businessId={businessId} />}
        {currentTab === 'products' && <ProductsTab businessId={businessId} />}
      </div>

    </div>
  )
}
