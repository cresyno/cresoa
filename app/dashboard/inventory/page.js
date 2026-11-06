'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../../lib/supabaseClient'
import { getCurrentBusinessId } from '../../../lib/getBusinessId'
import { Navigation } from '../../../components/Navigation'
import '../../globals.css'

// ─── EMBEDDED ICONS ───
const SvgIcons = {
  Plus: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>,
  Search: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>,
  X: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>,
  Box: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" /></svg>,
  Check: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>,
  ChevronDown: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>,
  Globe: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>
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
    <div style={{ background: '#FFFFFF', minHeight: '100vh', padding: '2rem', fontFamily: "'Inter', sans-serif", color: '#0F2B4A' }}>
      <Navigation businessId={businessId} />

      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2.5rem', marginTop: '1rem', borderBottom: '2px solid #0F2B4A', paddingBottom: '1.5rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.5px' }}>Inventory & Production</h1>
          <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.95rem', color: '#555' }}>Manage your stock, track costs, and calculate profit margins.</p>
        </div>
        <button 
          onClick={() => router.push(`/dashboard/inventory/new?business_id=${businessId}`)} 
          style={{ background: '#0F2B4A', color: '#FFFFFF', border: 'none', padding: '12px 24px', borderRadius: '8px', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 15px rgba(15,43,74,0.2)' }}
        >
          <SvgIcons.Plus /> Add New Item
        </button>
      </div>

      {/* METRICS GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
        <div style={{ background: '#FFFFFF', padding: '1.5rem', borderRadius: '12px', border: '1px solid #EAEAEA', boxShadow: '0 4px 15px rgba(0,0,0,0.02)' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#666' }}>Total Items</span>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#0F2B4A', marginTop: '0.5rem' }}>{totalItems}</div>
        </div>
        <div style={{ background: '#FFFFFF', padding: '1.5rem', borderRadius: '12px', border: '1px solid #EAEAEA', boxShadow: '0 4px 15px rgba(0,0,0,0.02)' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#666' }}>Total Stock Value</span>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#0F2B4A', marginTop: '0.5rem' }}>{formatMoney(totalStockValue)}</div>
        </div>
        <div style={{ background: '#FFFFFF', padding: '1.5rem', borderRadius: '12px', border: '1px solid #EAEAEA', boxShadow: '0 4px 15px rgba(0,0,0,0.02)' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#666' }}>Low Stock</span>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: lowStockItems > 0 ? '#D4AF37' : '#0F2B4A', marginTop: '0.5rem' }}>{lowStockItems}</div>
        </div>
        <div style={{ background: '#FFFFFF', padding: '1.5rem', borderRadius: '12px', border: '1px solid #EAEAEA', boxShadow: '0 4px 15px rgba(0,0,0,0.02)' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#666' }}>Out of Stock</span>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: outOfStockItems > 0 ? '#FF3B30' : '#0F2B4A', marginTop: '0.5rem' }}>{outOfStockItems}</div>
        </div>
      </div>

      {/* FILTERS */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', background: '#F8F9FA', borderRadius: '10px', padding: '0 1rem', border: '1px solid #EAEAEA', width: '100%', maxWidth: '400px' }}>
          <span style={{ color: '#999' }}><SvgIcons.Search /></span>
          <input 
            type="text" 
            placeholder="Search products..." 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            style={{ border: 'none', background: 'transparent', padding: '14px 10px', outline: 'none', width: '100%', fontSize: '0.95rem' }}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#999', display: 'flex' }}>
              <SvgIcons.X />
            </button>
          )}
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <div style={{ display: 'flex', background: '#F8F9FA', padding: '4px', borderRadius: '8px', border: '1px solid #EAEAEA' }}>
            {['all', 'low', 'out'].map(f => (
              <button 
                key={f}
                onClick={() => setFilter(f)} 
                style={{ 
                  padding: '8px 16px', borderRadius: '6px', border: 'none', 
                  background: filter === f ? '#FFFFFF' : 'transparent',
                  color: filter === f ? '#0F2B4A' : '#666',
                  fontWeight: filter === f ? 700 : 500,
                  cursor: 'pointer', fontSize: '0.85rem',
                  boxShadow: filter === f ? '0 2px 4px rgba(0,0,0,0.05)' : 'none'
                }}
              >
                {f === 'all' ? 'All Items' : f === 'low' ? 'Low Stock' : 'Out of Stock'}
              </button>
            ))}
          </div>

          <div style={{ position: 'relative' }} ref={categoryMenuRef}>
            <button 
              onClick={() => setShowCategoryMenu(!showCategoryMenu)}
              style={{ padding: '10px 16px', borderRadius: '8px', background: '#FFFFFF', border: '1px solid #EAEAEA', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, color: '#0F2B4A' }}
            >
              {categoryFilter === 'all' ? 'All Categories' : categoryFilter}
              <SvgIcons.ChevronDown />
            </button>
            {showCategoryMenu && (
              <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '8px', background: '#FFFFFF', border: '1px solid #EAEAEA', borderRadius: '8px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', minWidth: '150px', zIndex: 10, overflow: 'hidden' }}>
                <button 
                  onClick={() => { setCategoryFilter('all'); setShowCategoryMenu(false); }}
                  style={{ width: '100%', textAlign: 'left', padding: '12px 16px', background: categoryFilter === 'all' ? '#F4F6F8' : '#FFF', border: 'none', cursor: 'pointer', fontSize: '0.9rem', fontWeight: categoryFilter === 'all' ? 700 : 500 }}
                >
                  All Categories
                </button>
                {categories.map(cat => (
                  <button 
                    key={cat} 
                    onClick={() => { setCategoryFilter(cat); setShowCategoryMenu(false); }}
                    style={{ width: '100%', textAlign: 'left', padding: '12px 16px', background: categoryFilter === cat ? '#F4F6F8' : '#FFF', border: 'none', borderTop: '1px solid #f0f0f0', cursor: 'pointer', fontSize: '0.9rem', fontWeight: categoryFilter === cat ? 700 : 500 }}
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
        <div style={{ textAlign: 'center', padding: '5rem 2rem', background: '#F8F9FA', borderRadius: '16px', border: '2px dashed #EAEAEA' }}>
          <div style={{ color: '#0F2B4A', marginBottom: '1rem', display: 'flex', justifyContent: 'center' }}><SvgIcons.Box /></div>
          <h3 style={{ fontSize: '1.4rem', color: '#0F2B4A', margin: '0 0 10px 0' }}>{items.length === 0 ? 'Your inventory is empty' : 'No items found'}</h3>
          <p style={{ color: '#666' }}>{items.length === 0 ? 'Start by adding your first product to track production and sales.' : 'Try adjusting your search or filters.'}</p>
          {items.length === 0 && (
            <button 
              onClick={() => router.push(`/dashboard/inventory/new?business_id=${businessId}`)} 
              style={{ marginTop: '1.5rem', background: '#0F2B4A', color: '#FFF', padding: '12px 24px', borderRadius: '8px', border: 'none', fontWeight: 700, cursor: 'pointer' }}
            >
              Add First Item
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {filteredItems.map(item => {
            const isLow = Number(item.quantity_on_hand || 0) <= Number(item.reorder_level || 0) && Number(item.quantity_on_hand || 0) > 0
            const isOut = Number(item.quantity_on_hand || 0) === 0
            const isEditing = editingItemId === item.id
            
            // Calculate Margin
            const cost = Number(item.unit_cost || item.cost_price || 0)
            const selling = Number(item.selling_price || 0)
            const margin = selling > 0 ? Math.round(((selling - cost) / selling) * 100) : 0

            return (
              <div 
                key={item.id} 
                onClick={() => { if (!isEditing) router.push(`/dashboard/inventory/${item.id}/edit?business_id=${businessId}`) }}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem', background: '#FFFFFF', borderRadius: '16px', border: '1px solid #EAEAEA', boxShadow: '0 4px 15px rgba(0,0,0,0.02)', cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 8px 25px rgba(15,43,74,0.08)'}
                onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.02)'}
              >
                
                {/* LEFT: Image & Name */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flex: 1 }}>
                  <div style={{ width: '64px', height: '64px', borderRadius: '12px', background: '#F8F9FA', border: '1px solid #EAEAEA', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.item_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ color: '#CCC' }}><SvgIcons.Box /></div>
                    )}
                  </div>
                  
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                      <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0F2B4A' }}>{item.item_name}</h4>
                      {item.is_listed_on_website && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#E6F4EA', color: '#137333', fontSize: '0.7rem', fontWeight: 800, padding: '4px 8px', borderRadius: '6px', textTransform: 'uppercase' }}>
                          <SvgIcons.Globe /> Website
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#888', display: 'flex', gap: '12px' }}>
                      {item.category && <span>Category: <strong style={{ color: '#555' }}>{item.category}</strong></span>}
                      {item.sku && <span>SKU: <strong style={{ color: '#555' }}>{item.sku}</strong></span>}
                    </div>
                  </div>
                </div>

                {/* MIDDLE: Financials */}
                <div style={{ display: 'flex', gap: '2rem', marginRight: '2rem' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#888', textTransform: 'uppercase' }}>Cost</div>
                    <div style={{ fontSize: '1rem', fontWeight: 600, color: '#555' }}>{formatMoney(item.unit_cost || item.cost_price)}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#888', textTransform: 'uppercase' }}>Price</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0F2B4A' }}>{formatMoney(item.selling_price)}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#888', textTransform: 'uppercase' }}>Margin</div>
                    <div style={{ fontSize: '1rem', fontWeight: 700, color: margin > 0 ? '#137333' : '#FF3B30' }}>{margin}%</div>
                  </div>
                </div>

                {/* RIGHT: Stock */}
                <div>
                  {isEditing ? (
                    <div 
                      style={{ display: 'flex', alignItems: 'center', background: '#FFF', border: '2px solid #0F2B4A', borderRadius: '8px', overflow: 'hidden', padding: '2px' }}
                      ref={qtyWrapperRef}
                      onClick={e => e.stopPropagation()}
                    >
                      <input
                        ref={qtyInputRef}
                        type="number"
                        value={tempQuantity}
                        onChange={e => setTempQuantity(e.target.value)}
                        onKeyDown={e => handleKeyDown(e, item)}
                        style={{ width: '60px', padding: '8px', border: 'none', outline: 'none', fontSize: '1rem', fontWeight: 700, textAlign: 'center' }}
                        min="0"
                      />
                      <button 
                        onClick={e => handleSaveQty(e, item)}
                        style={{ background: '#0F2B4A', color: '#FFF', border: 'none', padding: '8px 12px', cursor: 'pointer', borderRadius: '6px' }}
                      >
                        <SvgIcons.Check />
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={e => handleQtyClick(e, item)}
                      style={{ 
                        background: isOut ? '#FFF0F0' : isLow ? '#FFF8E6' : '#E6F4EA', 
                        color: isOut ? '#FF3B30' : isLow ? '#D4AF37' : '#137333',
                        border: 'none', padding: '10px 16px', borderRadius: '8px', 
                        cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '90px'
                      }}
                    >
                      <span style={{ fontSize: '1.2rem', fontWeight: 800 }}>{item.quantity_on_hand || 0}</span>
                      <span style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>In Stock</span>
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
        <div style={{ position: 'fixed', bottom: '20px', right: '20px', background: toastType === 'error' ? '#FF3B30' : '#0F2B4A', color: '#FFF', padding: '16px 24px', borderRadius: '8px', fontWeight: 600, boxShadow: '0 10px 30px rgba(0,0,0,0.2)', zIndex: 9999 }}>
          {toastMessage}
        </div>
      )}
    </div>
  )
}
