'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../../lib/supabaseClient'
import { getCurrentBusinessId } from '../../../lib/getBusinessId'
import { Navigation } from '../../../components/Navigation'
import '../../../globals.css'

// ─── EMBEDDED ICONS ───
const SvgIcons = {
  Plus: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>,
  Search: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>,
  X: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>,
  Box: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" /></svg>,
  Check: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>,
  ChevronDown: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
}

const formatMoney = (value) => `₦${Number(value || 0).toLocaleString('en-NG')}`

export default function InventoryPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const businessId = getCurrentBusinessId() || searchParams.get('business_id')

  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [showCategoryMenu, setShowCategoryMenu] = useState(false)
  const categoryMenuRef = useRef(null)

  // Inline Quantity Editor State
  const [editingItemId, setEditingItemId] = useState(null)
  const [tempQuantity, setTempQuantity] = useState('')
  const qtyInputRef = useRef(null)
  const qtyWrapperRef = useRef(null)

  // Custom UI
  const [toastMessage, setToastMessage] = useState('')
  const [toastType, setToastType] = useState('success')

  const showToast = (msg, type = 'success') => {
    setToastMessage(msg)
    setToastType(type)
    setTimeout(() => setToastMessage(''), 3000)
  }

  // Close dropdowns and cancel edit on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (categoryMenuRef.current && !categoryMenuRef.current.contains(event.target)) {
        setShowCategoryMenu(false)
      }
      if (editingItemId && qtyWrapperRef.current && !qtyWrapperRef.current.contains(event.target)) {
        setEditingItemId(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [editingItemId])

  // Fetch Inventory
  useEffect(() => {
    if (!businessId) { router.push('/dashboard'); return }
    const fetchInventory = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('inventory_items')
        .select('*')
        .eq('business_id', businessId)
        .order('item_name', { ascending: true })
      
      if (error) {
        showToast('Failed to load inventory', 'error')
      } else {
        setItems(data || [])
      }
      setLoading(false)
    }
    fetchInventory()
  }, [businessId, router])

  // Derived Data
  const totalItems = items.length
  const totalStockValue = items.reduce((sum, i) => sum + (Number(i.quantity_on_hand || 0) * Number(i.selling_price || 0)), 0)
  const lowStockItems = items.filter(i => Number(i.quantity_on_hand || 0) <= Number(i.reorder_level || 0) && Number(i.quantity_on_hand || 0) > 0).length
  const outOfStockItems = items.filter(i => Number(i.quantity_on_hand || 0) === 0).length

  const categories = useMemo(() => {
    const catSet = new Set(items.map(i => i.category).filter(Boolean))
    return Array.from(catSet)
  }, [items])

  const filteredItems = useMemo(() => {
    let result = items
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(i => i.item_name.toLowerCase().includes(q))
    }
    if (categoryFilter !== 'all') {
      result = result.filter(i => i.category === categoryFilter)
    }
    if (filter === 'low') {
      result = result.filter(i => Number(i.quantity_on_hand || 0) <= Number(i.reorder_level || 0) && Number(i.quantity_on_hand || 0) > 0)
    } else if (filter === 'out') {
      result = result.filter(i => Number(i.quantity_on_hand || 0) === 0)
    }
    return result
  }, [items, search, categoryFilter, filter])

  // Inline Quantity Editor Handlers
  const handleQtyClick = (e, item) => {
    e.stopPropagation()
    setEditingItemId(item.id)
    setTempQuantity(String(item.quantity_on_hand || 0))
    setTimeout(() => {
      if (qtyInputRef.current) {
        qtyInputRef.current.focus()
        qtyInputRef.current.select()
      }
    }, 50)
  }

  const handleSaveQty = async (e, item) => {
    e.stopPropagation()
    e.preventDefault()
    
    const newQty = parseInt(tempQuantity, 10)
    
    if (isNaN(newQty) || newQty < 0) {
      showToast('Please enter a valid positive number.', 'error')
      setEditingItemId(null)
      return
    }

    if (newQty === item.quantity_on_hand) {
      setEditingItemId(null)
      return
    }

    setItems(prev => prev.map(i => i.id === item.id ? { ...i, quantity_on_hand: newQty } : i))
    setEditingItemId(null)
    showToast('Stock updated')

    try {
      const { error } = await supabase
        .from('inventory_items')
        .update({ quantity_on_hand: newQty })
        .eq('id', item.id)
      
      if (error) throw error
    } catch (err) {
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, quantity_on_hand: item.quantity_on_hand } : i))
      showToast('Failed to update stock', 'error')
    }
  }

  const handleKeyDown = (e, item) => {
    if (e.key === 'Enter') {
      handleSaveQty(e, item)
    } else if (e.key === 'Escape') {
      setEditingItemId(null)
    }
  }

  if (loading) return <div className="order-page-loading"><div className="spinner" /></div>

  return (
    <div className="orders-page">
      <Navigation businessId={businessId} />

      {/* HEADER */}
      <div className="orders-header">
        <div>
          <h1 className="orders-title">Inventory</h1>
          <p className="orders-subtitle">Manage stock & supplies</p>
        </div>
        <button onClick={() => router.push(`/dashboard/inventory/new?business_id=${businessId}`)} className="cresoa-primary-button">
          <SvgIcons.Plus /> Add Item
        </button>
      </div>

      {/* METRICS GRID */}
      <div className="orders-metrics-grid">
        <div className="orders-metric-box">
          <span className="metric-label">Total Items</span>
          <span className="metric-value">{totalItems}</span>
        </div>
        <div className="orders-metric-box">
          <span className="metric-label">Stock Value</span>
          <span className="metric-value" style={{ fontSize: '1.2rem' }}>{formatMoney(totalStockValue)}</span>
        </div>
        <div className="orders-metric-box">
          <span className="metric-label">Low Stock</span>
          <span className="metric-value" style={{ color: lowStockItems > 0 ? 'var(--color-accent)' : 'var(--color-secondary)' }}>
            {lowStockItems}
          </span>
        </div>
        <div className="orders-metric-box">
          <span className="metric-label">Out of Stock</span>
          <span className="metric-value" style={{ color: outOfStockItems > 0 ? 'var(--color-danger)' : 'var(--color-secondary)' }}>
            {outOfStockItems}
          </span>
        </div>
      </div>

      {/* FILTERS */}
      <div className="orders-filters">
        <div className="orders-search-wrapper">
          <span className="search-icon"><SvgIcons.Search /></span>
          <input 
            type="text" 
            className="orders-search-input" 
            placeholder="Search items..." 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
          />
          {search && (
            <button className="search-clear-btn" onClick={() => setSearch('')}>
              <SvgIcons.X />
            </button>
          )}
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <div className="smart-tabs-container" style={{ marginBottom: 0, flex: 1 }}>
            <button className={`smart-tab ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>All</button>
            <button className={`smart-tab ${filter === 'low' ? 'active' : ''}`} onClick={() => setFilter('low')}>Low Stock</button>
            <button className={`smart-tab ${filter === 'out' ? 'active' : ''}`} onClick={() => setFilter('out')}>Out of Stock</button>
          </div>

          <div className="custom-dropdown-wrapper" ref={categoryMenuRef} style={{ width: 'auto' }}>
            <button 
              className="custom-dropdown-btn" 
              onClick={() => setShowCategoryMenu(!showCategoryMenu)}
              style={{ padding: '8px 12px', fontSize: '0.8rem', width: 'auto', gap: '8px' }}
            >
              {categoryFilter === 'all' ? 'Categories' : categoryFilter}
              <SvgIcons.ChevronDown />
            </button>
            {showCategoryMenu && (
              <div className="custom-dropdown-menu" style={{ width: '150px', right: 0, left: 'auto' }}>
                <button 
                  className={`custom-dropdown-item ${categoryFilter === 'all' ? 'active' : ''}`}
                  onClick={() => { setCategoryFilter('all'); setShowCategoryMenu(false); }}
                >
                  All Categories
                </button>
                {categories.map(cat => (
                  <button 
                    key={cat} 
                    className={`custom-dropdown-item ${categoryFilter === cat ? 'active' : ''}`}
                    onClick={() => { setCategoryFilter(cat); setShowCategoryMenu(false); }}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* INVENTORY LIST */}
      {filteredItems.length === 0 ? (
        <div className="orders-empty">
          <div className="empty-icon"><SvgIcons.Box /></div>
          <h3>{items.length === 0 ? 'Your inventory is empty' : 'No items found'}</h3>
          <p>{items.length === 0 ? 'Start by adding your first product or raw material.' : 'Try adjusting your search or filters.'}</p>
          {items.length === 0 && (
            <button onClick={() => router.push(`/dashboard/inventory/new?business_id=${businessId}`)} className="cresoa-primary-button" style={{ marginTop: '1rem' }}>
              Add First Item
            </button>
          )}
        </div>
      ) : (
        <div className="inventory-list">
          {filteredItems.map(item => {
            const isLow = Number(item.quantity_on_hand || 0) <= Number(item.reorder_level || 0) && Number(item.quantity_on_hand || 0) > 0
            const isOut = Number(item.quantity_on_hand || 0) === 0
            const isEditing = editingItemId === item.id

            return (
              <div 
                key={item.id} 
                className="inventory-card" 
                onClick={() => { if (!isEditing) router.push(`/dashboard/inventory/${item.id}/edit?business_id=${businessId}`) }}
              >
                
                <div className="inventory-card-left">
                  <div className="inventory-thumb">
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.item_name} />
                    ) : (
                      <SvgIcons.Box />
                    )}
                  </div>
                  <div className="inventory-info">
                    <div className="inventory-name-row">
                      <h4 className="inventory-name">{item.item_name}</h4>
                      {item.is_listed_on_website && (
                        <span className="badge-website">Website</span>
                      )}
                    </div>
                    <p className="inventory-price">{formatMoney(item.selling_price)}</p>
                  </div>
                </div>

                <div className="inventory-card-right">
                  {isEditing ? (
                    <div 
                      className="inline-qty-editor" 
                      ref={qtyWrapperRef}
                      onClick={e => e.stopPropagation()}
                    >
                      <input
                        ref={qtyInputRef}
                        type="number"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={tempQuantity}
                        onChange={e => setTempQuantity(e.target.value)}
                        onKeyDown={e => handleKeyDown(e, item)}
                        className="inline-qty-input"
                        min="0"
                      />
                      <button 
                        id={`save-qty-${item.id}`}
                        className="inline-qty-save-btn" 
                        onClick={e => handleSaveQty(e, item)}
                        title="Save Quantity"
                      >
                        <SvgIcons.Check />
                      </button>
                    </div>
                  ) : (
                    <button 
                      className={`qty-display-btn ${isOut ? 'is-out' : isLow ? 'is-low' : 'is-ok'}`}
                      onClick={e => handleQtyClick(e, item)}
                    >
                      <span className="qty-number">{item.quantity_on_hand || 0}</span>
                      <span className="qty-label">in stock</span>
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div style={{ marginTop: '2rem' }}><Navigation businessId={businessId} /></div>

      {/* TOAST */}
      {toastMessage && (
        <div className={`app-toast ${toastType}`}>
          {toastMessage}
        </div>
      )}
    </div>
  )
    }
