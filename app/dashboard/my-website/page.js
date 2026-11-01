'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import EditorTab from './components/EditorTab'
import OrdersTab from './components/OrdersTab'
import QuotesTab from './components/QuotesTab'
import ProductsTab from './components/ProductsTab'
import { Navigation } from '../../../components/Navigation'
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
  
  // Get tab from URL or default to editor
  const currentTab = searchParams.get('tab') || 'editor'

  const handleTabChange = (tabId) => {
    router.push(`/dashboard/my-website?business_id=${businessId}&tab=${tabId}`)
  }

  if (!businessId) return <div style={{ padding: '2rem', textAlign: 'center' }}>Missing Business ID</div>

  return (
    <div className="orders-page" style={{ paddingBottom: '100px' }}>
      
      {/* HEADER */}
      <div className="orders-header" style={{ marginBottom: '1rem' }}>
        <div>
          <h1 className="orders-title">My Website</h1>
          <p className="orders-subtitle">Manage your public storefront</p>
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

      {/* TAB CONTENT */}
      <div style={{ marginTop: '1.5rem' }}>
        {currentTab === 'editor' && <EditorTab businessId={businessId} />}
        {currentTab === 'orders' && <OrdersTab businessId={businessId} />}
        {currentTab === 'quotes' && <QuotesTab businessId={businessId} />}
        {currentTab === 'products' && <ProductsTab businessId={businessId} />}
      </div>

      {/* Bottom Navigation */}
      <div style={{ marginTop: '2rem' }}>
        <Navigation businessId={businessId} />
      </div>

    </div>
  )
          }
