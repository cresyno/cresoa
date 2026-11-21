'use client';
import { useClientSearchParams as useSearchParams } from '../../lib/useClientSearchParams';
import { useState, useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation';
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
  Globe: () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>,
  Star: () => <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
}

const formatMoney = (value) => `₦${Number(value || 0).toLocaleString('en-NG')}`

export default function InventoryPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const businessId = getCurrentBusinessId() || searchParams.get('business_id')

  const [activeTab, setActiveTab] = useState('stock') // 'stock' or 'storefront'
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  
  // Stock Tab Filters
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

  // Storefront Modal State
  const [storefrontEditingItem, setStorefrontEditingItem] = useState(null)
  const [savingStorefront, setSavingStorefront] = useState(false)
  const [storefrontError, setStorefrontError] = useState('')

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

  // Derived Data (Stock Tab)
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
    if (e.key === 'Enter') handleSaveQty(e, item)
    else if (e.key === 'Escape') setEditingItemId(null)
  }

  // ─── STOREFRONT (PRODUCTS TAB) LOGIC ───

  const toggleWebsiteListing = async (item) => {
    if (!item.is_listed_on_website) {
      const issues = []
      if (!item.image_url) issues.push("Add a high-quality product image")
      if (!item.web_description || item.web_description.trim().length < 50) issues.push("Write a description (min 50 characters)")
      if (!item.selling_price || item.selling_price <= 0) issues.push("Set a valid price")

      if (issues.length > 0) {
        setStorefrontEditingItem(item)
        setStorefrontError(`Cannot go live yet. ${issues[0]}.`)
        return
      }
    }

    setItems(prev => prev.map(i => i.id === item.id ? { ...i, is_listed_on_website: !item.is_listed_on_website } : i))
    await supabase.from('inventory_items').update({ is_listed_on_website: !item.is_listed_on_website }).eq('id', item.id)
  }

  const saveStorefrontItem = async () => {
    if (!storefrontEditingItem) return
    
    if (!storefrontEditingItem.item_name?.trim()) {
      setStorefrontError("Product name is required.")
      return
    }
    if (storefrontEditingItem.web_description && storefrontEditingItem.web_description.trim().length > 0 && storefrontEditingItem.web_description.trim().length < 50) {
      setStorefrontError("Description must be at least 50 characters to ensure customer trust.")
      return
    }

    setSavingStorefront(true)
    setStorefrontError('')
    try {
      const { error } = await supabase
        .from('inventory_items')
        .update({
          item_name: storefrontEditingItem.item_name,
          selling_price: storefrontEditingItem.selling_price,
          web_description: storefrontEditingItem.web_description,
          category: storefrontEditingItem.category,
          is_featured: storefrontEditingItem.is_featured
        })
        .eq('id', storefrontEditingItem.id)
      
      if (error) throw error
      
      setItems(prev => prev.map(i => i.id === storefrontEditingItem.id ? storefrontEditingItem : i))
      setStorefrontEditingItem(null)
    } catch (err) {
      setStorefrontError('Error saving: ' + err.message)
    } finally {
      setSavingStorefront(false)
    }
  }

  if (loading) return <div style={{ padding: '4rem', textAlign: 'center', color: '#0F2B4A', fontWeight: 600 }}>Loading inventory...</div>

return (
  <div style={{ background: '#FFFFFF', minHeight: '100vh', padding: '1rem', fontFamily: "'Inter', sans-serif", color: '#0F2B4A', overflowX: 'hidden' }}>
    
    {/* MOBILE-FIRST RESPONSIVE STYLES */}
    <style dangerouslySetInnerHTML={{__html: `
      .inv-header { display: flex; flex-direction: column; gap: 1.5rem; margin-bottom: 1.5rem; }
      .inv-metrics { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; margin-bottom: 2rem; }
      .inv-filters { display: flex; flex-direction: column; gap: 1rem; margin-bottom: 2rem; }
      .inv-card { display: flex; flex-direction: column; padding: 1.25rem; background: #FFFFFF; border-radius: 16px; border: 1px solid #EAEAEA; box-shadow: 0 4px 15px rgba(0,0,0,0.02); gap: 1rem; cursor: pointer; transition: all 0.2s; }
      .inv-financials { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; background: #F8F9FA; padding: 1rem; border-radius: 12px; border: 1px solid #EAEAEA; width: 100%; }
      .inv-stock-row { display: flex; justify-content: space-between; align-items: center; width: 100%; }
      .inv-switch { display: flex; background: #F4F6F8; padding: 4px; border-radius: 12px; border: 1px solid #EAEAEA; width: 100%; max-width: 400px; margin: 0 auto; }
      
      @media (min-width: 768px) {
        .inv-header { flex-direction: row; justify-content: space-between; align-items: flex-end; }
        .inv-metrics { grid-template-columns: repeat(4, 1fr); gap: 1.5rem; }
        .inv-filters { flex-direction: row; justify-content: space-between; align-items: center; flex-wrap: wrap; }
        .inv-card { flex-direction: row; align-items: center; justify-content: space-between; gap: 2rem; }
        .inv-financials { display: flex; gap: 2rem; background: transparent; padding: 0; border: none; width: auto; }
        .inv-stock-row { width: auto; }
        .inv-switch { margin: 0; }
      }
    `}} />

    <Navigation businessId={businessId} />

    {/* HEADER & TABS */}
    <div className="inv-header" style={{ marginTop: '1rem', borderBottom: '2px solid #0F2B4A', paddingBottom: '1.5rem' }}>
      
      {/* Title & Add Button */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 800, letterSpacing: '-0.5px' }}>Inventory</h1>
          <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.95rem', color: '#555' }}>Manage stock and curate your public shop.</p>
        </div>
        <button 
          onClick={() => router.push(`/dashboard/inventory/new?business_id=${businessId}`)} 
          style={{ background: '#0F2B4A', color: '#FFFFFF', border: 'none', padding: '14px 24px', borderRadius: '8px', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 4px 15px rgba(15,43,74,0.2)', width: 'fit-content' }}
        >
          <SvgIcons.Plus /> Add New Item
        </button>
      </div>
      
      {/* High Contrast Tabs (Centered on Mobile) */}
      <div className="inv-switch">
        <button 
          onClick={() => setActiveTab('stock')} 
          style={{ flex: 1, padding: '12px 20px', borderRadius: '8px', border: 'none', background: activeTab === 'stock' ? '#0F2B4A' : 'transparent', color: activeTab === 'stock' ? '#FFFFFF' : '#666', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem', boxShadow: activeTab === 'stock' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.2s' }}
        >
          Stock
        </button>
        <button 
          onClick={() => setActiveTab('storefront')} 
          style={{ flex: 1, padding: '12px 20px', borderRadius: '8px', border: 'none', background: activeTab === 'storefront' ? '#0F2B4A' : 'transparent', color: activeTab === 'storefront' ? '#FFFFFF' : '#666', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem', boxShadow: activeTab === 'storefront' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.2s' }}
        >
          Storefront
        </button>
      </div>
    </div>

      {/* ─── TAB 1: STOCK & PRODUCTION ─── */}
      {activeTab === 'stock' && (
        <>
          {/* METRICS GRID */}
          <div className="inv-metrics">
            <div style={{ background: '#FFFFFF', padding: '1.25rem', borderRadius: '12px', border: '1px solid #EAEAEA', boxShadow: '0 4px 15px rgba(0,0,0,0.02)' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#666' }}>Total Items</span>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0F2B4A', marginTop: '0.2rem' }}>{totalItems}</div>
            </div>
            <div style={{ background: '#FFFFFF', padding: '1.25rem', borderRadius: '12px', border: '1px solid #EAEAEA', boxShadow: '0 4px 15px rgba(0,0,0,0.02)' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#666' }}>Stock Value</span>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0F2B4A', marginTop: '0.2rem' }}>{formatMoney(totalStockValue)}</div>
            </div>
            <div style={{ background: '#FFFFFF', padding: '1.25rem', borderRadius: '12px', border: '1px solid #EAEAEA', boxShadow: '0 4px 15px rgba(0,0,0,0.02)' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#666' }}>Low Stock</span>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: lowStockItems > 0 ? '#D4AF37' : '#0F2B4A', marginTop: '0.2rem' }}>{lowStockItems}</div>
            </div>
            <div style={{ background: '#FFFFFF', padding: '1.25rem', borderRadius: '12px', border: '1px solid #EAEAEA', boxShadow: '0 4px 15px rgba(0,0,0,0.02)' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#666' }}>Out of Stock</span>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: outOfStockItems > 0 ? '#FF3B30' : '#0F2B4A', marginTop: '0.2rem' }}>{outOfStockItems}</div>
            </div>
          </div>

          {/* FILTERS */}
          <div className="inv-filters">
            <div style={{ display: 'flex', alignItems: 'center', background: '#F8F9FA', borderRadius: '10px', padding: '0 1rem', border: '1px solid #EAEAEA', width: '100%', maxWidth: '100%' }}>
              <span style={{ color: '#999' }}><SvgIcons.Search /></span>
              <input 
                type="text" 
                placeholder="Search stock..." 
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

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', background: '#F8F9FA', padding: '4px', borderRadius: '8px', border: '1px solid #EAEAEA', overflowX: 'auto', whiteSpace: 'nowrap' }}>
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
                    {f === 'all' ? 'All' : f === 'low' ? 'Low' : 'Out'}
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

          {/* STOCK LIST */}
      {filteredItems.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem 1rem', background: '#F8F9FA', borderRadius: '16px', border: '2px dashed #EAEAEA' }}>
              <div style={{ color: '#0F2B4A', marginBottom: '1rem', display: 'flex', justifyContent: 'center' }}><SvgIcons.Box /></div>
              <h3 style={{ fontSize: '1.2rem', color: '#0F2B4A', margin: '0 0 10px 0' }}>{items.length === 0 ? 'Your inventory is empty' : 'No items found'}</h3>
              <p style={{ color: '#666', fontSize: '0.9rem' }}>{items.length === 0 ? 'Start by adding your first product.' : 'Try adjusting your filters.'}</p>
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
                const cost = Number(item.unit_cost || item.cost_price || 0)
                const selling = Number(item.selling_price || 0)
                const margin = selling > 0 ? Math.round(((selling - cost) / selling) * 100) : 0

                return (
                  <div 
                    key={item.id} 
                    className="inv-card"
                    onClick={() => { if (!isEditing) router.push(`/dashboard/inventory/${item.id}/edit?business_id=${businessId}`) }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, width: '100%' }}>
                      <div style={{ width: '56px', height: '56px', borderRadius: '12px', background: '#F8F9FA', border: '1px solid #EAEAEA', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                        {item.image_url ? (
                          <img src={item.image_url} alt={item.item_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ color: '#CCC' }}><SvgIcons.Box /></div>
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0F2B4A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {item.item_name}
                          </h4>
                        </div>
                        {item.category && (
                          <div style={{ fontSize: '0.8rem', color: '#888', marginTop: '4px' }}>{item.category}</div>
                        )}
                      </div>
                    </div>

                    <div className="inv-financials">
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Cost</div>
                        <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#555' }}>{formatMoney(item.unit_cost || item.cost_price)}</div>
                      </div>
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Price</div>
                        <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0F2B4A' }}>{formatMoney(item.selling_price)}</div>
                      </div>
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Margin</div>
                        <div style={{ fontSize: '0.95rem', fontWeight: 700, color: margin > 0 ? '#137333' : '#FF3B30' }}>{margin}%</div>
                      </div>
                    </div>

                    <div className="inv-stock-row">
                      <div style={{ fontSize: '0.8rem', color: '#888', fontWeight: 600 }}>Stock Level</div>
                      {isEditing ? (
                        <div style={{ display: 'flex', alignItems: 'center', background: '#FFF', border: '2px solid #0F2B4A', borderRadius: '8px', overflow: 'hidden', padding: '2px' }} ref={qtyWrapperRef} onClick={e => e.stopPropagation()}>
                          <input ref={qtyInputRef} type="number" value={tempQuantity} onChange={e => setTempQuantity(e.target.value)} onKeyDown={e => handleKeyDown(e, item)} style={{ width: '60px', padding: '6px', border: 'none', outline: 'none', fontSize: '1rem', fontWeight: 700, textAlign: 'center' }} min="0" />
                          <button onClick={e => handleSaveQty(e, item)} style={{ background: '#0F2B4A', color: '#FFF', border: 'none', padding: '6px 10px', cursor: 'pointer', borderRadius: '6px' }}><SvgIcons.Check /></button>
                        </div>
                      ) : (
                        <button onClick={e => handleQtyClick(e, item)} style={{ background: isOut ? '#FFF0F0' : isLow ? '#FFF8E6' : '#E6F4EA', color: isOut ? '#FF3B30' : isLow ? '#D4AF37' : '#137333', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '1.1rem', fontWeight: 800 }}>{item.quantity_on_hand || 0}</span>
                          <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase' }}>In Stock</span>
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* ─── TAB 2: WEBSITE STOREFRONT ─── */}
      {activeTab === 'storefront' && (
        <div style={{ paddingBottom: '100px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: '#0F2B4A' }}>Storefront Collection</h2>
              <p style={{ fontSize: '0.9rem', color: '#666', marginTop: '0.4rem' }}>Write descriptions and curate what customers see.</p>
            </div>
            <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#fff', background: '#0F2B4A', padding: '8px 16px', borderRadius: '20px' }}>
              {items.filter(i => i.is_listed_on_website).length} Live
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {items.map(item => {
              const hasImage = !!item.image_url
              const hasDesc = item.web_description && item.web_description.trim().length >= 50
              const hasPrice = item.selling_price > 0
              const isReady = hasImage && hasDesc && hasPrice

              return (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem', border: '1px solid #EAEAEA', borderRadius: '16px', background: '#FFFFFF', boxShadow: '0 4px 15px rgba(0,0,0,0.02)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
                    {item.image_url ? (
                      <img src={item.image_url} style={{ width: '64px', height: '64px', borderRadius: '12px', objectFit: 'cover', border: '1px solid #f0f0f0' }} />
                    ) : (
                      <div style={{ width: '64px', height: '64px', borderRadius: '12px', background: '#FFF0F0', border: '1px dashed #FF3B30', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', color: '#FF3B30', fontWeight: 700, textAlign: 'center', padding: '4px' }}>
                        No Image
                      </div>
                    )}
                    
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0F2B4A' }}>{item.item_name}</h4>
                        {item.is_featured && <span style={{ background: '#D4AF37', color: '#fff', fontSize: '0.6rem', fontWeight: 800, padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase' }}>Featured</span>}
                        {!isReady && <span style={{ background: '#FFF0F0', color: '#FF3B30', fontSize: '0.6rem', fontWeight: 800, padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase' }}>Needs Attention</span>}
                      </div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#D4AF37', marginTop: '4px' }}>
                        ₦{Number(item.selling_price).toLocaleString()}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: hasDesc ? '#666' : '#FF3B30', marginTop: '4px', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden', fontStyle: hasDesc ? 'normal' : 'italic' }}>
                        {item.web_description ? item.web_description : 'Description missing...'}
                      </div>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginLeft: '1rem' }}>
                    <button 
                      onClick={() => { setStorefrontEditingItem(item); setStorefrontError(''); }}
                      style={{ padding: '8px 12px', borderRadius: '8px', background: '#F4F6F8', color: '#0F2B4A', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.75rem' }}
                    >
                      Edit
                    </button>
                    <button 
                      onClick={() => toggleWebsiteListing(item)}
                      style={{ padding: '8px 12px', borderRadius: '8px', background: item.is_listed_on_website ? '#0F2B4A' : '#FFFFFF', color: item.is_listed_on_website ? '#FFFFFF' : '#0F2B4A', border: item.is_listed_on_website ? '1px solid #0F2B4A' : '1px solid #EAEAEA', cursor: 'pointer', fontWeight: 700, fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: item.is_listed_on_website ? '#D4AF37' : '#ccc' }} />
                      {item.is_listed_on_website ? 'Live' : 'Draft'}
                    </button>
                  </div>
                </div>
              )
            })}
            {items.length === 0 && (
              <div style={{ textAlign: 'center', padding: '4rem 2rem', background: '#F8F9FA', borderRadius: '16px', border: '2px dashed #EAEAEA' }}>
                <h3 style={{ margin: '0 0 10px 0', color: '#0F2B4A', fontSize: '1.2rem' }}>Your collection is empty</h3>
                <p style={{ color: '#666' }}>Go to the Stock tab to add your first product.</p>
              </div>
            )}
          </div>
        </div>
      )}

      <div style={{ marginTop: '2rem' }}><Navigation businessId={businessId} /></div>

      {/* ─── STOREFRONT EDIT MODAL ─── */}
      {storefrontEditingItem && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,43,74,0.7)', backdropFilter: 'blur(5px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={() => setStorefrontEditingItem(null)}>
          <div style={{ background: '#FFFFFF', width: '100%', maxWidth: '600px', borderRadius: '24px', padding: '2rem', boxShadow: '0 25px 50px rgba(0,0,0,0.25)', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.4rem', color: '#0F2B4A', fontWeight: 800 }}>Curate Product</h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#666' }}>Write a description that sells.</p>
              </div>
              <button onClick={() => setStorefrontEditingItem(null)} style={{ background: '#F4F6F8', border: 'none', width: '36px', height: '36px', borderRadius: '50%', fontSize: '1.2rem', cursor: 'pointer', color: '#0F2B4A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
            </div>

            {storefrontError && (
              <div style={{ padding: '12px', background: '#FFF0F0', color: '#FF3B30', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 600, marginBottom: '1.5rem', border: '1px solid #FFD6D6' }}>
                {storefrontError}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: '#0F2B4A', marginBottom: '6px', textTransform: 'uppercase' }}>Product Name</label>
                <input type="text" value={storefrontEditingItem.item_name} onChange={e => setStorefrontEditingItem({...storefrontEditingItem, item_name: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '2px solid #EAEAEA', fontSize: '1rem', outline: 'none' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: '#0F2B4A', marginBottom: '6px', textTransform: 'uppercase' }}>Price (₦)</label>
                  <input type="number" value={storefrontEditingItem.selling_price} onChange={e => setStorefrontEditingItem({...storefrontEditingItem, selling_price: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '2px solid #EAEAEA', fontSize: '1rem', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: '#0F2B4A', marginBottom: '6px', textTransform: 'uppercase' }}>Category</label>
                  <input type="text" value={storefrontEditingItem.category || ''} onChange={e => setStorefrontEditingItem({...storefrontEditingItem, category: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '2px solid #EAEAEA', fontSize: '1rem', outline: 'none' }} />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0F2B4A', textTransform: 'uppercase' }}>Website Description</label>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: (storefrontEditingItem.web_description?.length || 0) >= 50 ? '#137333' : '#FF3B30' }}>
                    {storefrontEditingItem.web_description?.length || 0} / 50 min chars
                  </span>
                </div>
                <textarea 
                  rows={4}
                  placeholder="Describe the fabric, the fit, the inspiration. A premium description builds customer trust..."
                  value={storefrontEditingItem.web_description || ''} 
                  onChange={e => setStorefrontEditingItem({...storefrontEditingItem, web_description: e.target.value})}
                  style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '2px solid #EAEAEA', fontSize: '1rem', fontFamily: 'inherit', resize: 'vertical', outline: 'none', lineHeight: 1.6 }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#F8F9FA', padding: '1rem', borderRadius: '12px', border: '1px solid #EAEAEA' }}>
                <div>
                  <div style={{ fontWeight: 800, color: '#0F2B4A', fontSize: '0.95rem' }}>Feature on Homepage</div>
                  <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '2px' }}>Show this in the main collection grid.</div>
                </div>
                <button 
                  onClick={() => setStorefrontEditingItem({...storefrontEditingItem, is_featured: !storefrontEditingItem.is_featured})}
                  style={{ width: '50px', height: '28px', borderRadius: '14px', border: 'none', background: storefrontEditingItem.is_featured ? '#D4AF37' : '#D1D5DB', position: 'relative', cursor: 'pointer', transition: 'all 0.3s' }}
                >
                  <span style={{ position: 'absolute', top: '2px', left: storefrontEditingItem.is_featured ? '24px' : '2px', width: '24px', height: '24px', borderRadius: '50%', background: '#fff', transition: 'all 0.3s', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }} />
                </button>
              </div>

            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '2rem' }}>
              <button onClick={() => setStorefrontEditingItem(null)} style={{ flex: 1, padding: '14px', borderRadius: '10px', border: '2px solid #EAEAEA', background: '#fff', fontWeight: 700, color: '#666', cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={saveStorefrontItem} disabled={savingStorefront} style={{ flex: 2, padding: '14px', borderRadius: '10px', border: 'none', background: '#0F2B4A', color: '#fff', fontWeight: 700, fontSize: '1rem', cursor: savingStorefront ? 'wait' : 'pointer', boxShadow: '0 4px 15px rgba(15,43,74,0.2)' }}>
                {savingStorefront ? 'Saving...' : 'Save & Validate'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* TOAST */}
      {toastMessage && (
        <div style={{ position: 'fixed', bottom: '20px', right: '20px', left: '20px', background: toastType === 'error' ? '#FF3B30' : '#0F2B4A', color: '#FFF', padding: '16px', borderRadius: '8px', fontWeight: 600, boxShadow: '0 10px 30px rgba(0,0,0,0.2)', zIndex: 9999, textAlign: 'center' }}>
          {toastMessage}
        </div>
      )}
    </div>
  )
}
