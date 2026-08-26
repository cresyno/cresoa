'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../../../lib/supabaseClient'

// ─── Self-contained SVG Icons ───
const Svg = ({ name, size = 20, stroke = 'currentColor', style }) => {
  const icons = {
    plus: <><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></>,
    search: <><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></>,
    box: <><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" /></>,
    x: <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>,
    alert: <><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></>,
    edit: <><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></>,
    trash: <><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></>,
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>{icons[name]}</svg>
}

// ─── Helpers ───
const formatMoney = (val) => `₦${Number(val || 0).toLocaleString('en-NG')}`

// ─── Initial form state ───
const INITIAL_FORM = {
  item_name: '',
  category: '',
  description: '',
  selling_price: '',
  cost_price: '',
  quantity_on_hand: '',
  reorder_level: ''
}

// ─── Style constants ───
const inputStyle = {
  width: '100%',
  padding: '0.6rem 0.8rem',
  borderRadius: '8px',
  border: '1px solid var(--cresoa-border)',
  background: 'var(--cresoa-bg)',
  color: 'var(--cresoa-text)',
  fontSize: '0.95rem',
  boxSizing: 'border-box',
}

const labelStyle = {
  display: 'block',
  fontSize: '0.8rem',
  fontWeight: 600,
  marginBottom: '0.3rem',
  color: 'var(--cresoa-text)',
}

const primaryBtn = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.3rem',
  padding: '0.6rem 1.2rem',
  borderRadius: '8px',
  background: 'var(--cresoa-accent)',
  color: '#fff',
  border: 'none',
  fontWeight: 700,
  cursor: 'pointer',
  fontSize: '0.9rem',
}

const secondaryBtn = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.3rem',
  padding: '0.6rem 1.2rem',
  borderRadius: '8px',
  border: '1px solid var(--cresoa-border)',
  background: 'var(--cresoa-surface)',
  color: 'var(--cresoa-text)',
  fontWeight: 600,
  cursor: 'pointer',
  fontSize: '0.9rem',
}

export default function RepairsPartsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const businessId = searchParams.get('business_id')

  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filter, setFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [modalStep, setModalStep] = useState(1)
  const [formData, setFormData] = useState(INITIAL_FORM)
  const [saving, setSaving] = useState(false)

  // ─── Fetch parts (sector-scoped) ───
  useEffect(() => {
    const fetchParts = async () => {
      if (!businessId) return
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('inventory_items')
          .select('*')
          .eq('business_id', businessId)
          .eq('sector', 'repairs')
          .order('item_name', { ascending: true })

        if (error) throw error
        setItems(data || [])
      } catch (err) {
        console.error('Fetch parts error:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchParts()
  }, [businessId])

  // ─── Derived stats ───
  const totalParts = items.length
  const totalStockValue = items.reduce((sum, i) => sum + (Number(i.quantity_on_hand || 0) * Number(i.selling_price || 0)), 0)
  const lowStockItems = items.filter(i => Number(i.quantity_on_hand || 0) <= Number(i.reorder_level || 0) && Number(i.quantity_on_hand || 0) > 0).length
  const outOfStockItems = items.filter(i => Number(i.quantity_on_hand || 0) === 0).length

  // ─── Categories for filter ───
  const categories = useMemo(() => {
    const catSet = new Set(items.map(i => i.category).filter(Boolean))
    return Array.from(catSet)
  }, [items])

  // ─── Filtered items ───
  const filteredItems = useMemo(() => {
    let result = items
    if (searchTerm) {
      result = result.filter(i => i.item_name.toLowerCase().includes(searchTerm.toLowerCase()))
    }
    if (categoryFilter !== 'all') {
      result = result.filter(i => i.category === categoryFilter)
    }
    if (filter === 'low') result = result.filter(i => Number(i.quantity_on_hand) <= Number(i.reorder_level) && Number(i.quantity_on_hand) > 0)
    if (filter === 'out') result = result.filter(i => Number(i.quantity_on_hand) === 0)
    return result
  }, [items, searchTerm, filter, categoryFilter])

  // ─── Stock adjustment ───
  const adjustStock = async (item, delta) => {
    const newQty = Math.max(0, Number(item.quantity_on_hand || 0) + delta)
    const { error } = await supabase
      .from('inventory_items')
      .update({ quantity_on_hand: newQty })
      .eq('id', item.id)
      .eq('business_id', businessId)
      .eq('sector', 'repairs')

    if (!error) {
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, quantity_on_hand: newQty } : i))
    }
  }

  // ─── Open add modal ───
  const handleAddPart = () => {
    setEditingItem(null)
    setFormData(INITIAL_FORM)
    setModalStep(1)
    setShowModal(true)
  }

  // ─── Open edit modal ───
  const handleEditPart = (item) => {
    setEditingItem(item)
    setFormData({
      item_name: item.item_name || '',
      category: item.category || '',
      description: item.description || '',
      selling_price: item.selling_price || '',
      cost_price: item.cost_price || '',
      quantity_on_hand: item.quantity_on_hand || '',
      reorder_level: item.reorder_level || '',
    })
    setModalStep(1)
    setShowModal(true)
  }

  // ─── Delete part ───
  const handleDeletePart = async (item) => {
    if (!window.confirm(`Delete "${item.item_name}"? This cannot be undone.`)) return
    try {
      const { error } = await supabase
        .from('inventory_items')
        .delete()
        .eq('id', item.id)
        .eq('business_id', businessId)
        .eq('sector', 'repairs')

      if (error) throw error
      setItems(prev => prev.filter(i => i.id !== item.id))
    } catch (err) {
      console.error('Delete error:', err)
      alert('Failed to delete part.')
    }
  }

  // ─── Save (add or edit) ───
  const handleSaveItem = async () => {
    if (!formData.item_name || !formData.selling_price) {
      alert('Please fill in Part Name and Selling Price.')
      return
    }
    setSaving(true)
    try {
      const payload = {
        business_id: businessId,
        sector: 'repairs',
        item_name: formData.item_name,
        category: formData.category || null,
        description: formData.description || null,
        selling_price: Number(formData.selling_price) || 0,
        cost_price: Number(formData.cost_price) || 0,
        quantity_on_hand: Number(formData.quantity_on_hand) || 0,
        reorder_level: Number(formData.reorder_level) || 0,
      }

      let error
      if (editingItem) {
        const { error: updateError } = await supabase
          .from('inventory_items')
          .update(payload)
          .eq('id', editingItem.id)
          .eq('business_id', businessId)
          .eq('sector', 'repairs')
        error = updateError
      } else {
        const { error: insertError } = await supabase
          .from('inventory_items')
          .insert(payload)
        error = insertError
      }

      if (error) throw error

      // Refresh list
      const { data: freshData } = await supabase
        .from('inventory_items')
        .select('*')
        .eq('business_id', businessId)
        .eq('sector', 'repairs')
        .order('item_name', { ascending: true })
      if (freshData) setItems(freshData)

      setShowModal(false)
      setEditingItem(null)
      setFormData(INITIAL_FORM)
      setModalStep(1)
    } catch (err) {
      console.error('Save error:', err)
      alert('Failed to save part.')
    } finally {
      setSaving(false)
    }
  }

  // ─── Loading state ───
  if (loading) {
    return (
      <div style={{ padding: '1rem', maxWidth: '1200px', margin: '0 auto', background: 'var(--cresoa-bg)', minHeight: '100vh' }}>
        <div className="cresoa-skeleton-card" style={{ marginBottom: '1rem' }}>
          <div className="cresoa-skeleton medium" />
          <div className="cresoa-skeleton short" />
        </div>
        <div className="cresoa-loading-grid">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="cresoa-skeleton-card">
              <div className="cresoa-skeleton medium" />
              <div className="cresoa-skeleton short" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ─── Main render ───
  return (
    <div style={{ padding: '1rem', maxWidth: '1200px', margin: '0 auto', background: 'var(--cresoa-bg)', minHeight: '100vh', paddingBottom: '80px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <p style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', margin: 0 }}>Repairs</p>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0.2rem 0', color: 'var(--cresoa-text)' }}>Parts</h1>
          <p style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.85rem', margin: 0 }}>Manage your spare parts inventory</p>
        </div>
        <button onClick={handleAddPart} style={primaryBtn}>
          <Svg name="plus" size={16} stroke="#fff" /> Add Part
        </button>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <div className="cresoa-card" style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--cresoa-text-muted)', textTransform: 'uppercase' }}>Total Parts</div>
          <div style={{ fontWeight: 700, fontSize: '1.2rem', color: 'var(--cresoa-text)' }}>{totalParts}</div>
        </div>
        <div className="cresoa-card" style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--cresoa-text-muted)', textTransform: 'uppercase' }}>Stock Value</div>
          <div style={{ fontWeight: 700, fontSize: '1.2rem', color: 'var(--cresoa-accent)' }}>{formatMoney(totalStockValue)}</div>
        </div>
        <div className="cresoa-card" style={{ padding: '0.75rem 1rem', textAlign: 'center', borderColor: lowStockItems > 0 ? 'var(--cresoa-danger)' : 'var(--cresoa-border)' }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--cresoa-text-muted)', textTransform: 'uppercase' }}>Low Stock</div>
          <div style={{ fontWeight: 700, fontSize: '1.2rem', color: lowStockItems > 0 ? 'var(--cresoa-danger)' : 'var(--cresoa-text)' }}>{lowStockItems}</div>
        </div>
        <div className="cresoa-card" style={{ padding: '0.75rem 1rem', textAlign: 'center', borderColor: outOfStockItems > 0 ? 'var(--cresoa-danger)' : 'var(--cresoa-border)' }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--cresoa-text-muted)', textTransform: 'uppercase' }}>Out of Stock</div>
          <div style={{ fontWeight: 700, fontSize: '1.2rem', color: outOfStockItems > 0 ? 'var(--cresoa-danger)' : 'var(--cresoa-text)' }}>{outOfStockItems}</div>
        </div>
      </div>

      {/* Search & Filters */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', background: 'var(--cresoa-surface)', border: '1px solid var(--cresoa-border)', borderRadius: '8px', padding: '0.4rem 0.8rem' }}>
          <Svg name="search" size={16} stroke="var(--cresoa-text-muted)" style={{ marginRight: '0.5rem' }} />
          <input
            type="text"
            placeholder="Search parts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', color: 'var(--cresoa-text)', fontSize: '0.85rem' }}
          />
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {['all', 'low', 'out'].map(tab => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              style={{
                padding: '0.3rem 0.8rem',
                borderRadius: '20px',
                border: `1px solid ${filter === tab ? 'var(--cresoa-accent)' : 'var(--cresoa-border)'}`,
                background: filter === tab ? 'var(--cresoa-accent)' : 'var(--cresoa-surface)',
                color: filter === tab ? '#fff' : 'var(--cresoa-text-muted)',
                fontWeight: 600,
                fontSize: '0.75rem',
                cursor: 'pointer',
              }}
            >
              {tab === 'all' ? 'All' : tab === 'low' ? 'Low Stock' : 'Out of Stock'}
            </button>
          ))}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            style={{
              padding: '0.3rem 0.8rem',
              borderRadius: '20px',
              border: '1px solid var(--cresoa-border)',
              background: 'var(--cresoa-surface)',
              color: 'var(--cresoa-text)',
              fontWeight: 600,
              fontSize: '0.75rem',
              cursor: 'pointer',
            }}
          >
            <option value="all">All Categories</option>
            {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        </div>
      </div>

      {/* Parts List */}
      {items.length === 0 ? (
        <div className="cresoa-empty-state">
          <Svg name="box" size={40} stroke="var(--cresoa-accent)" />
          <span className="cresoa-empty-state-title">No parts yet</span>
          <span className="cresoa-empty-state-message">Start by adding your first spare part.</span>
          <button onClick={handleAddPart} style={{ ...primaryBtn, marginTop: '1rem' }}>Add Part</button>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="cresoa-empty-state">
          <Svg name="search" size={32} stroke="var(--cresoa-text-muted)" />
          <span className="cresoa-empty-state-title">No parts match your search</span>
          <span className="cresoa-empty-state-message">Try a different search or filter.</span>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {filteredItems.map(item => {
            const isOut = Number(item.quantity_on_hand || 0) === 0
            const isLow = Number(item.quantity_on_hand || 0) <= Number(item.reorder_level || 0) && !isOut
            return (
              <div key={item.id} className="cresoa-card" style={{ padding: '1rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ minWidth: '200px' }}>
                  <div style={{ fontWeight: 600, color: 'var(--cresoa-text)' }}>{item.item_name}</div>
                  <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.8rem', color: 'var(--cresoa-text-muted)', marginTop: '0.25rem', flexWrap: 'wrap' }}>
                    <span>Category: {item.category || 'N/A'}</span>
                    <span>Price: {formatMoney(item.selling_price)}</span>
                    {Number(item.cost_price || 0) > 0 && <span>Cost: {formatMoney(item.cost_price)}</span>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                    <button onClick={() => adjustStock(item, -1)} style={secondaryBtn}>-</button>
                    <span style={{ fontWeight: 700, color: isOut ? 'var(--cresoa-danger)' : isLow ? 'var(--cresoa-danger)' : 'var(--cresoa-success)', fontSize: '1rem' }}>{item.quantity_on_hand}</span>
                    <button onClick={() => adjustStock(item, 1)} style={secondaryBtn}>+</button>
                    <span style={{ fontSize: '0.75rem', color: 'var(--cresoa-text-muted)' }}>in stock</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  {isOut && <span className="cresoa-status cresoa-status-danger">Out</span>}
                  {isLow && !isOut && <span className="cresoa-status cresoa-status-warning">Low</span>}
                  <button onClick={() => handleEditPart(item)} style={{ ...secondaryBtn, padding: '0.3rem 0.6rem' }}>
                    <Svg name="edit" size={14} stroke="currentColor" />
                  </button>
                  <button onClick={() => handleDeletePart(item)} style={{ ...secondaryBtn, padding: '0.3rem 0.6rem', color: 'var(--cresoa-danger)', borderColor: 'var(--cresoa-danger)' }}>
                    <Svg name="trash" size={14} stroke="currentColor" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ─── MODAL ─── */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }} onClick={() => !saving && setShowModal(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: 'var(--cresoa-surface)', borderRadius: '20px', padding: '1.5rem', width: '100%', maxWidth: '480px', maxHeight: '90vh', overflowY: 'auto', boxShadow: 'var(--shadow-xl)' }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, color: 'var(--cresoa-text)' }}>{editingItem ? 'Edit Part' : 'Add Part'}</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cresoa-text-muted)' }}>
                <Svg name="x" size={20} stroke="currentColor" />
              </button>
            </div>

            {/* Progress bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              {[1, 2, 3].map(s => (
                <div key={s} style={{ flex: 1, height: '4px', borderRadius: '2px', background: modalStep >= s ? 'var(--cresoa-accent)' : 'var(--cresoa-border)' }} />
              ))}
            </div>
            <p style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.75rem', margin: '0 0 1rem', fontWeight: 600 }}>Step {modalStep} of 3</p>

              {/* Step 1: Part Info */}
            {modalStep === 1 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div>
                  <label style={labelStyle}>Part Name <span style={{ color: 'var(--cresoa-danger)' }}>*</span></label>
                  <input
                    type="text"
                    value={formData.item_name}
                    onChange={(e) => setFormData({ ...formData, item_name: e.target.value })}
                    placeholder="e.g. Battery, Screen, Cable"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Category</label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="e.g. Phone Parts, Laptop Parts"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Description (optional)</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={2}
                    placeholder="Any extra details..."
                    style={{ ...inputStyle, resize: 'vertical' }}
                  />
                </div>
                <button
                  onClick={() => setModalStep(2)}
                  disabled={!formData.item_name}
                  style={{ ...primaryBtn, opacity: formData.item_name ? 1 : 0.5, justifyContent: 'center' }}
                >
                  Continue
                </button>
              </div>
            )}

            {/* Step 2: Pricing & Stock */}
            {modalStep === 2 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label style={labelStyle}>Selling Price (₦) <span style={{ color: 'var(--cresoa-danger)' }}>*</span></label>
                    <input
                      type="number"
                      value={formData.selling_price}
                      onChange={(e) => setFormData({ ...formData, selling_price: e.target.value })}
                      placeholder="0"
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Cost Price (₦)</label>
                    <input
                      type="number"
                      value={formData.cost_price}
                      onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
                      placeholder="0"
                      style={inputStyle}
                    />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label style={labelStyle}>Quantity on Hand <span style={{ color: 'var(--cresoa-danger)' }}>*</span></label>
                    <input
                      type="number"
                      value={formData.quantity_on_hand}
                      onChange={(e) => setFormData({ ...formData, quantity_on_hand: e.target.value })}
                      placeholder="0"
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Reorder Level</label>
                    <input
                      type="number"
                      value={formData.reorder_level}
                      onChange={(e) => setFormData({ ...formData, reorder_level: e.target.value })}
                      placeholder="0"
                      style={inputStyle}
                    />
                  </div>
                </div>
                {formData.selling_price && formData.quantity_on_hand && (
                  <div style={{ background: 'var(--cresoa-accent-soft)', borderRadius: '8px', padding: '0.6rem', textAlign: 'center', fontWeight: 700, color: 'var(--cresoa-accent)' }}>
                    Stock Value: {formatMoney(Number(formData.selling_price) * Number(formData.quantity_on_hand))}
                  </div>
                )}
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button onClick={() => setModalStep(1)} style={secondaryBtn}>Back</button>
                  <button
                    onClick={() => setModalStep(3)}
                    disabled={!formData.selling_price || !formData.quantity_on_hand}
                    style={{ ...primaryBtn, flex: 2, opacity: formData.selling_price && formData.quantity_on_hand ? 1 : 0.5, justifyContent: 'center' }}
                  >
                    Continue
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Review & Save */}
            {modalStep === 3 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ background: 'var(--cresoa-surface-soft)', borderRadius: '8px', padding: '1rem' }}>
                  <h4 style={{ margin: '0 0 0.5rem', color: 'var(--cresoa-text)' }}>Summary</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.9rem' }}>
                    <div><strong style={{ color: 'var(--cresoa-text-muted)' }}>Part:</strong> <span style={{ color: 'var(--cresoa-text)' }}>{formData.item_name}</span></div>
                    <div><strong style={{ color: 'var(--cresoa-text-muted)' }}>Category:</strong> <span style={{ color: 'var(--cresoa-text)' }}>{formData.category || 'N/A'}</span></div>
                    <div><strong style={{ color: 'var(--cresoa-text-muted)' }}>Price:</strong> <span style={{ color: 'var(--cresoa-text)' }}>{formatMoney(formData.selling_price)}</span></div>
                    <div><strong style={{ color: 'var(--cresoa-text-muted)' }}>Quantity:</strong> <span style={{ color: 'var(--cresoa-text)' }}>{formData.quantity_on_hand}</span></div>
                    <div><strong style={{ color: 'var(--cresoa-text-muted)' }}>Stock Value:</strong> <span style={{ color: 'var(--cresoa-accent)', fontWeight: 700 }}>{formatMoney(Number(formData.selling_price) * Number(formData.quantity_on_hand))}</span></div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button onClick={() => setModalStep(2)} style={secondaryBtn}>Back</button>
                  <button onClick={handleSaveItem} disabled={saving} style={{ ...primaryBtn, flex: 2, justifyContent: 'center', opacity: saving ? 0.7 : 1 }}>
                    {saving ? 'Saving...' : editingItem ? 'Save Changes' : 'Save Part'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
                      }
