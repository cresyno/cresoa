'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../../lib/supabaseClient'
import { Card } from '../../../components/Card'
import { SectionHeader } from '../../../components/SectionHeader'
import { Icon } from '../../../components/Icon'
import { Navigation } from '../../../components/Navigation'

// ─── Self-contained SVG Icons (No imports) ───
const Svg = ({ name, size = 20, stroke = 'currentColor' }) => {
  const icons = {
    plus: <><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></>,
    search: <><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></>,
    box: <><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" /></>,
    x: <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>,
    edit: <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />,
    check: <polyline points="20 6 9 17 4 12" />,
    alert: <><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></>,
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{icons[name]}</svg>
}

export default function InventoryPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const businessId = searchParams.get('business_id')

  const navigateWithBusiness = (path) => {
    const separator = path.includes('?') ? '&' : '?'
    router.push(`${path}${separator}business_id=${businessId}`)
  }

  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filter, setFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [showAddModal, setShowAddModal] = useState(false)

  // ─── Wizard Modal State ───
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    item_name: '',
    category: '',
    new_category: '',
    description: '',
    selling_price: '',
    quantity_on_hand: '',
    reorder_level: '',
    cost_price: '',
  })
  const [saving, setSaving] = useState(false)

  // Fetch inventory
  useEffect(() => {
    const fetchInventory = async () => {
      if (!businessId) return
      setLoading(true)
      const { data, error } = await supabase
        .from('inventory_items')
        .select('*')
        .eq('business_id', businessId)
        .order('item_name', { ascending: true })
      if (!error) setItems(data || [])
      setLoading(false)
    }
    fetchInventory()
  }, [businessId])

  // Derived stats
  const totalItems = items.length
  const totalStockValue = items.reduce((sum, i) => sum + (Number(i.quantity_on_hand || 0) * Number(i.selling_price || 0)), 0)
  const lowStockItems = items.filter(i => Number(i.quantity_on_hand || 0) <= Number(i.reorder_level || 0)).length
  const outOfStockItems = items.filter(i => Number(i.quantity_on_hand || 0) === 0).length

  // Get unique categories
  const categories = useMemo(() => {
    const catSet = new Set(items.map(i => i.category).filter(Boolean))
    return Array.from(catSet)
  }, [items])

  // Filter logic
  const filteredItems = items.filter(item => {
    const matchesSearch = item.item_name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter
    let matchesFilter = true
    if (filter === 'low') matchesFilter = Number(item.quantity_on_hand || 0) <= Number(item.reorder_level || 0)
    if (filter === 'out') matchesFilter = Number(item.quantity_on_hand || 0) === 0
    return matchesSearch && matchesCategory && matchesFilter
  })

  // ─── Quick Adjust Stock ───
  const adjustStock = async (item, delta) => {
    const newQty = Math.max(0, Number(item.quantity_on_hand || 0) + delta)
    const { error } = await supabase
      .from('inventory_items')
      .update({ quantity_on_hand: newQty })
      .eq('id', item.id)
    if (!error) {
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, quantity_on_hand: newQty } : i))
    }
  }

  // ─── Save Item (from Wizard) ───
  const handleSaveItem = async () => {
    if (!formData.item_name || !formData.selling_price) return
    setSaving(true)
    try {
      const finalCategory = formData.new_category || formData.category
      const { error } = await supabase
        .from('inventory_items')
        .insert({
          business_id: businessId,
          item_name: formData.item_name,
          category: finalCategory || null,
          description: formData.description || null,
          selling_price: Number(formData.selling_price) || 0,
          cost_price: Number(formData.cost_price) || 0,
          quantity_on_hand: Number(formData.quantity_on_hand) || 0,
          reorder_level: Number(formData.reorder_level) || 0,
          sku: formData.sku || null,
        })
      if (!error) {
        // Refresh items
        const { data } = await supabase
          .from('inventory_items')
          .select('*')
          .eq('business_id', businessId)
          .order('item_name', { ascending: true })
        if (data) setItems(data)
        setShowAddModal(false)
        setStep(1)
        setFormData({ item_name: '', category: '', new_category: '', description: '', selling_price: '', quantity_on_hand: '', reorder_level: '', cost_price: '' })
      }
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto' }}><Navigation businessId={businessId} /><p>Loading inventory...</p></div>

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto', paddingBottom: '80px', background: 'var(--cresoa-bg)' }}>
      <Navigation businessId={businessId} />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <p style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', margin: 0 }}>Inventory</p>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0.2rem 0', color: 'var(--cresoa-text)' }}>Stock & Supplies</h1>
        </div>
        <button onClick={() => setShowAddModal(true)} style={{ background: 'var(--cresoa-primary)', color: '#fff', border: 'none', padding: '0.5rem 1rem', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Svg name="plus" size={16} stroke="#fff" /> Add Item
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <Card style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--cresoa-text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Total Items</div>
          <div style={{ fontWeight: 700, fontSize: '1.2rem', color: 'var(--cresoa-text)' }}>{totalItems}</div>
        </Card>
        <Card style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--cresoa-text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Stock Value</div>
          <div style={{ fontWeight: 700, fontSize: '1.2rem', color: 'var(--cresoa-accent)' }}>₦{totalStockValue.toLocaleString()}</div>
        </Card>
        <Card style={{ padding: '0.75rem 1rem', textAlign: 'center', borderColor: lowStockItems > 0 ? 'var(--cresoa-danger)' : 'var(--cresoa-border)' }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--cresoa-text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Low Stock</div>
          <div style={{ fontWeight: 700, fontSize: '1.2rem', color: lowStockItems > 0 ? 'var(--cresoa-danger)' : 'var(--cresoa-text)' }}>{lowStockItems}</div>
        </Card>
        <Card style={{ padding: '0.75rem 1rem', textAlign: 'center', borderColor: outOfStockItems > 0 ? 'var(--cresoa-danger)' : 'var(--cresoa-border)' }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--cresoa-text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Out of Stock</div>
          <div style={{ fontWeight: 700, fontSize: '1.2rem', color: outOfStockItems > 0 ? 'var(--cresoa-danger)' : 'var(--cresoa-text)' }}>{outOfStockItems}</div>
        </Card>
      </div>

      {/* Search & Filters */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', background: 'var(--cresoa-surface)', border: '1px solid var(--cresoa-border)', borderRadius: '8px', padding: '0.4rem 0.8rem' }}>
          <Svg name="search" size={16} stroke="var(--cresoa-text-muted)" style={{ marginRight: '0.5rem' }} />
          <input type="text" placeholder="Search items..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', color: 'var(--cresoa-text)', fontSize: '0.85rem' }} />
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {['all', 'low', 'out'].map(tab => (
            <button key={tab} onClick={() => setFilter(tab)} style={{ padding: '0.3rem 0.8rem', borderRadius: '20px', border: `1px solid ${filter === tab ? 'var(--cresoa-accent)' : 'var(--cresoa-border)'}`, background: filter === tab ? 'var(--cresoa-accent-soft)' : 'transparent', color: filter === tab ? 'var(--cresoa-accent)' : 'var(--cresoa-text-muted)', fontWeight: 600, fontSize: '0.75rem', cursor: 'pointer' }}>
              {tab === 'all' ? 'All' : tab === 'low' ? 'Low Stock' : 'Out of Stock'}
            </button>
          ))}
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} style={{ padding: '0.3rem 0.8rem', borderRadius: '20px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-surface)', color: 'var(--cresoa-text)', fontWeight: 600, fontSize: '0.75rem', cursor: 'pointer' }}>
            <option value="all">All Categories</option>
            {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        </div>
      </div>

      {/* Inventory List */}
      {items.length === 0 ? (
        <Card style={{ padding: '3rem 1.5rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--cresoa-accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Svg name="box" size={40} stroke="var(--cresoa-accent)" />
          </div>
          <div>
            <h3 style={{ margin: 0, color: 'var(--cresoa-text)' }}>Your inventory is empty</h3>
            <p style={{ margin: '0.5rem 0 0', color: 'var(--cresoa-text-muted)', fontSize: '0.85rem' }}>Start by adding your first product or raw material.</p>
          </div>
          <button onClick={() => setShowAddModal(true)} style={{ background: 'var(--cresoa-primary)', color: '#fff', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Svg name="plus" size={16} stroke="#fff" /> Add your first item
          </button>
        </Card>
      ) : filteredItems.length === 0 ? (
        <Card style={{ padding: '2rem', textAlign: 'center', color: 'var(--cresoa-text-muted)' }}>
          No items match your search.
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {filteredItems.map(item => {
            const isLow = Number(item.quantity_on_hand || 0) <= Number(item.reorder_level || 0)
            const isOut = Number(item.quantity_on_hand || 0) === 0
            return (
              <Card key={item.id} style={{ padding: '1rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ minWidth: '200px' }}>
                  <div style={{ fontWeight: 600, color: 'var(--cresoa-text)' }}>{item.item_name}</div>
                  <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.8rem', color: 'var(--cresoa-text-muted)', marginTop: '0.25rem', flexWrap: 'wrap' }}>
                    <span>Category: {item.category || 'N/A'}</span>
                    <span>Price: ₦{Number(item.selling_price || 0).toLocaleString()}</span>
                    {Number(item.cost_price || 0) > 0 && <span>Cost: ₦{Number(item.cost_price).toLocaleString()}</span>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                    <button onClick={() => adjustStock(item, -1)} style={{ width: '28px', height: '28px', borderRadius: '50%', border: '1px solid var(--cresoa-border)', background: 'transparent', cursor: 'pointer', color: 'var(--cresoa-text)', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>-</button>
                    <span style={{ fontWeight: 700, color: isOut ? 'var(--cresoa-danger)' : isLow ? 'var(--cresoa-danger)' : 'var(--cresoa-success)', fontSize: '1rem' }}>{item.quantity_on_hand}</span>
                    <button onClick={() => adjustStock(item, 1)} style={{ width: '28px', height: '28px', borderRadius: '50%', border: '1px solid var(--cresoa-border)', background: 'transparent', cursor: 'pointer', color: 'var(--cresoa-text)', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                    <span style={{ fontSize: '0.75rem', color: 'var(--cresoa-text-muted)' }}>in stock</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  {isOut && <span style={{ background: 'var(--cresoa-danger)', color: '#fff', fontSize: '0.65rem', fontWeight: 600, padding: '0.15rem 0.5rem', borderRadius: '4px', textTransform: 'uppercase' }}>Out</span>}
                  {isLow && !isOut && <span style={{ background: 'var(--cresoa-warning)', color: '#fff', fontSize: '0.65rem', fontWeight: 600, padding: '0.15rem 0.5rem', borderRadius: '4px', textTransform: 'uppercase' }}>Low</span>}
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* ─── WIZARD MODAL (Add Item) ─── */}
      {showAddModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }} onClick={() => !saving && setShowAddModal(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: 'var(--cresoa-surface)', border: '1px solid var(--cresoa-border)', borderRadius: '20px', padding: '1.5rem', width: '100%', maxWidth: '480px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 12px 40px rgba(0,0,0,0.2)' }}>
            
            {/* Header + Close */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, color: 'var(--cresoa-text)' }}>Add Item</h3>
              <button onClick={() => setShowAddModal(false)} style={{ background: '#D4A52A', border: 'none', cursor: 'pointer', color: 'var(--cresoa-text-muted)' }}>
                <Svg name="x" size={20} stroke="currentColor" />
              </button>
            </div>

            {/* Progress Bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
              {[1, 2, 3].map(s => (
                <div key={s} style={{ flex: 1, height: '4px', borderRadius: '2px', background: step >= s ? 'var(--cresoa-accent)' : 'var(--cresoa-border)' }} />
              ))}
            </div>
            <p style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.75rem', margin: '0 0 1rem', fontWeight: 600 }}>Step {step} of 3</p>

            {/* STEP 1: Basic Info */}
            {step === 1 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.3rem', color: 'var(--cresoa-text)' }}>Item Name <span style={{ color: 'var(--cresoa-danger)' }}>*</span></label>
                  <input type="text" value={formData.item_name} onChange={(e) => setFormData({ ...formData, item_name: e.target.value })} placeholder="e.g. Bag of Rice, Ankara Fabric, Laptop Battery" style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-bg)', color: 'var(--cresoa-text)', fontSize: '0.9rem', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.3rem', color: 'var(--cresoa-text)' }}>Category</label>
                  <input type="text" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} placeholder="e.g. Fabric, Foodstuff, Spare Parts, Electronics" style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-bg)', color: 'var(--cresoa-text)', fontSize: '0.9rem', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.3rem', color: 'var(--cresoa-text)' }}>Description (optional)</label>
                  <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={2} placeholder="Any extra details..." style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-bg)', color: 'var(--cresoa-text)', fontSize: '0.9rem', boxSizing: 'border-box', resize: 'vertical' }} />
                </div>
                <button onClick={() => setStep(2)} disabled={!formData.item_name} className="cresoa-primary-button" style={{ marginTop: '0.5rem', opacity: formData.item_name ? 1 : 0.5 }}>Continue</button>
              </div>
            )}

              {/* STEP 2: Pricing & Stock */}
            {step === 2 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.3rem', color: 'var(--cresoa-text)' }}>Selling Price (₦) <span style={{ color: 'var(--cresoa-danger)' }}>*</span></label>
                    <input type="number" value={formData.selling_price} onChange={(e) => setFormData({ ...formData, selling_price: e.target.value })} placeholder="0" style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-bg)', color: 'var(--cresoa-text)', fontSize: '0.9rem', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.3rem', color: 'var(--cresoa-text)' }}>Cost Price (₦)</label>
                    <input type="number" value={formData.cost_price} onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })} placeholder="0" style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-bg)', color: 'var(--cresoa-text)', fontSize: '0.9rem', boxSizing: 'border-box' }} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.3rem', color: 'var(--cresoa-text)' }}>Quantity on Hand <span style={{ color: 'var(--cresoa-danger)' }}>*</span></label>
                    <input type="number" value={formData.quantity_on_hand} onChange={(e) => setFormData({ ...formData, quantity_on_hand: e.target.value })} placeholder="0" style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-bg)', color: 'var(--cresoa-text)', fontSize: '0.9rem', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.3rem', color: 'var(--cresoa-text)' }}>Reorder Level</label>
                    <input type="number" value={formData.reorder_level} onChange={(e) => setFormData({ ...formData, reorder_level: e.target.value })} placeholder="0" style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-bg)', color: 'var(--cresoa-text)', fontSize: '0.9rem', boxSizing: 'border-box' }} />
                  </div>
                </div>
                {/* Live Stock Value Preview */}
                {formData.selling_price && formData.quantity_on_hand && (
                  <div style={{ background: 'var(--cresoa-accent-soft)', borderRadius: '8px', padding: '0.6rem', textAlign: 'center', fontWeight: 700, color: 'var(--cresoa-accent)' }}>
                    Stock Value: ₦{(Number(formData.selling_price) * Number(formData.quantity_on_hand)).toLocaleString()}
                  </div>
                )}
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <button onClick={() => setStep(1)} style={{ flex: 1, padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'transparent', cursor: 'pointer', fontWeight: 600, color: 'var(--cresoa-text)', fontSize: '0.9rem' }}>Back</button>
                  <button onClick={() => setStep(3)} disabled={!formData.selling_price || !formData.quantity_on_hand} className="cresoa-primary-button" style={{ flex: 2, opacity: formData.selling_price && formData.quantity_on_hand ? 1 : 0.5 }}>Continue</button>
                </div>
              </div>
            )}

            {/* STEP 3: Review & Save */}
            {step === 3 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ background: 'var(--cresoa-bg)', borderRadius: '8px', padding: '1rem' }}>
                  <h4 style={{ margin: '0 0 0.5rem', color: 'var(--cresoa-text)' }}>Summary</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.9rem' }}>
                    <div><strong style={{ color: 'var(--cresoa-text-muted)' }}>Item:</strong> <span style={{ color: 'var(--cresoa-text)' }}>{formData.item_name}</span></div>
                    <div><strong style={{ color: 'var(--cresoa-text-muted)' }}>Category:</strong> <span style={{ color: 'var(--cresoa-text)' }}>{formData.category || 'N/A'}</span></div>
                    <div><strong style={{ color: 'var(--cresoa-text-muted)' }}>Price:</strong> <span style={{ color: 'var(--cresoa-text)' }}>₦{Number(formData.selling_price).toLocaleString()}</span></div>
                    <div><strong style={{ color: 'var(--cresoa-text-muted)' }}>Quantity:</strong> <span style={{ color: 'var(--cresoa-text)' }}>{formData.quantity_on_hand}</span></div>
                    <div><strong style={{ color: 'var(--cresoa-text-muted)' }}>Stock Value:</strong> <span style={{ color: 'var(--cresoa-accent)', fontWeight: 700 }}>₦{(Number(formData.selling_price) * Number(formData.quantity_on_hand)).toLocaleString()}</span></div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button onClick={() => setStep(2)} style={{ flex: 1, padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'transparent', cursor: 'pointer', fontWeight: 600, color: 'var(--cresoa-text)', fontSize: '0.9rem' }}>Back</button>
                  <button onClick={handleSaveItem} disabled={saving} className="cresoa-primary-button" style={{ flex: 2, opacity: saving ? 0.7 : 1 }}>{saving ? 'Saving...' : 'Save Item'}</button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      <div style={{ marginTop: '2rem' }}>
        <Navigation businessId={businessId} />
      </div>
    </div>
  )
                  }
                                                                                                                                                                             
