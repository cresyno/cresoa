'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../../lib/supabaseClient'
import { compressImage } from '../../../lib/compressImage' // Ensure this path is correct
import { Card } from '../../../components/Card'
import { Navigation } from '../../../components/Navigation'

const Svg = ({ name, size = 20, stroke = 'currentColor' }) => {
  const icons = {
    plus: <><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></>,
    search: <><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></>,
    box: <><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" /></>,
    x: <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>,
    image: <><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></>,
    globe: <><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></>,
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{icons[name]}</svg>
}

const goldBtn = { background: '#D4A52A', color: '#fff', border: 'none', padding: '0.6rem 1.2rem', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', boxShadow: '0 2px 8px rgba(212,165,42,0.3)' }
const whiteBtn = { background: '#fff', color: '#0F2B4A', border: '1px solid #E5E0D8', padding: '0.6rem 1.2rem', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }

export default function InventoryPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const businessId = searchParams.get('business_id')

  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filter, setFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [showAddModal, setShowAddModal] = useState(false)

  // Wizard modal state
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    item_name: '', category: '', description: '', selling_price: '',
    cost_price: '', quantity_on_hand: '', reorder_level: '',
    // NEW WEBSITE FIELDS
    image_url: '', web_description: '', is_listed_on_website: false, featured_on_website: false
  })
  const [uploadingImage, setUploadingImage] = useState(false)
  const [saving, setSaving] = useState(false)

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

  const totalItems = items.length
  const totalStockValue = items.reduce((sum, i) => sum + (Number(i.quantity_on_hand || 0) * Number(i.selling_price || 0)), 0)
  const lowStockItems = items.filter(i => Number(i.quantity_on_hand || 0) <= Number(i.reorder_level || 0)).length
  const outOfStockItems = items.filter(i => Number(i.quantity_on_hand || 0) === 0).length

  const categories = useMemo(() => {
    const catSet = new Set(items.map(i => i.category).filter(Boolean))
    return Array.from(catSet)
  }, [items])

  const filteredItems = items.filter(item => {
    const matchesSearch = item.item_name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter
    let matchesFilter = true
    if (filter === 'low') matchesFilter = Number(item.quantity_on_hand || 0) <= Number(item.reorder_level || 0)
    if (filter === 'out') matchesFilter = Number(item.quantity_on_hand || 0) === 0
    return matchesSearch && matchesCategory && matchesFilter
  })

  const adjustStock = async (item, delta) => {
    const newQty = Math.max(0, Number(item.quantity_on_hand || 0) + delta)
    const { error } = await supabase.from('inventory_items').update({ quantity_on_hand: newQty }).eq('id', item.id)
    if (!error) setItems(prev => prev.map(i => i.id === item.id ? { ...i, quantity_on_hand: newQty } : i))
  }

  const handleImageUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploadingImage(true)
    try {
      const compressedBlob = await compressImage(file, 200)
      const filePath = `${businessId}/product-${Date.now()}.jpg`
      const { error } = await supabase.storage.from('business-assets').upload(filePath, compressedBlob)
      if (error) throw error
      const { data } = supabase.storage.from('business-assets').getPublicUrl(filePath)
      setFormData(prev => ({ ...prev, image_url: data.publicUrl }))
    } catch (err) {
      alert('Image upload failed: ' + err.message)
    } finally {
      setUploadingImage(false)
    }
  }

  const handleSaveItem = async () => {
    if (!formData.item_name || !formData.selling_price) {
      alert('Please fill in Item Name and Selling Price.')
      return
    }
    setSaving(true)
    try {
      let validBusinessId = businessId || localStorage.getItem('selectedBusinessId')
      if (!validBusinessId) {
        alert('Business ID missing. Please reload.')
        return
      }

      const { error } = await supabase.from('inventory_items').insert({
        business_id: validBusinessId,
        item_name: formData.item_name,
        category: formData.category || null,
        description: formData.description || null,
        selling_price: Number(formData.selling_price) || 0,
        cost_price: Number(formData.cost_price) || 0,
        quantity_on_hand: Number(formData.quantity_on_hand) || 0,
        reorder_level: Number(formData.reorder_level) || 0,
        // WEBSITE FIELDS
        image_url: formData.image_url || null,
        web_description: formData.web_description || null,
        is_listed_on_website: formData.is_listed_on_website,
        featured_on_website: formData.featured_on_website,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })

      if (error) throw error

      const { data } = await supabase.from('inventory_items').select('*').eq('business_id', validBusinessId).order('item_name', { ascending: true })
      if (data) setItems(data)
      setShowAddModal(false)
      setStep(1)
      setFormData({ item_name: '', category: '', description: '', selling_price: '', cost_price: '', quantity_on_hand: '', reorder_level: '', image_url: '', web_description: '', is_listed_on_website: false, featured_on_website: false })
    } catch (e) {
      alert('Error: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto' }}><Navigation businessId={businessId} /><p>Loading inventory...</p></div>

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto', paddingBottom: '80px', background: '#F8F6F2', minHeight: '100vh' }}>
      <Navigation businessId={businessId} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <p style={{ color: '#8A8A8A', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', margin: 0 }}>Inventory</p>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0.2rem 0', color: '#1A1A1A' }}>Stock & Supplies</h1>
        </div>
        <button onClick={() => setShowAddModal(true)} style={goldBtn}>
          <Svg name="plus" size={16} stroke="#fff" /> Add Item
        </button>
      </div>

      {/* Stats & Filters (Same as before) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <Card style={{ padding: '0.75rem 1rem', textAlign: 'center' }}><div style={{ fontSize: '0.65rem', color: '#8A8A8A', textTransform: 'uppercase' }}>Total Items</div><div style={{ fontWeight: 700, fontSize: '1.2rem', color: '#1A1A1A' }}>{totalItems}</div></Card>
        <Card style={{ padding: '0.75rem 1rem', textAlign: 'center' }}><div style={{ fontSize: '0.65rem', color: '#8A8A8A', textTransform: 'uppercase' }}>Stock Value</div><div style={{ fontWeight: 700, fontSize: '1.2rem', color: '#D4A52A' }}>₦{totalStockValue.toLocaleString()}</div></Card>
        <Card style={{ padding: '0.75rem 1rem', textAlign: 'center', borderColor: lowStockItems > 0 ? '#D9534F' : '#E5E0D8' }}><div style={{ fontSize: '0.65rem', color: '#8A8A8A', textTransform: 'uppercase' }}>Low Stock</div><div style={{ fontWeight: 700, fontSize: '1.2rem', color: lowStockItems > 0 ? '#D9534F' : '#1A1A1A' }}>{lowStockItems}</div></Card>
        <Card style={{ padding: '0.75rem 1rem', textAlign: 'center', borderColor: outOfStockItems > 0 ? '#D9534F' : '#E5E0D8' }}><div style={{ fontSize: '0.65rem', color: '#8A8A8A', textTransform: 'uppercase' }}>Out of Stock</div><div style={{ fontWeight: 700, fontSize: '1.2rem', color: outOfStockItems > 0 ? '#D9534F' : '#1A1A1A' }}>{outOfStockItems}</div></Card>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', background: '#fff', border: '1px solid #E5E0D8', borderRadius: '8px', padding: '0.4rem 0.8rem' }}>
          <Svg name="search" size={16} stroke="#8A8A8A" style={{ marginRight: '0.5rem' }} />
          <input type="text" placeholder="Search items..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', color: '#1A1A1A', fontSize: '0.85rem' }} />
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {['all', 'low', 'out'].map(tab => (
            <button key={tab} onClick={() => setFilter(tab)} style={{ padding: '0.3rem 0.8rem', borderRadius: '20px', border: `1px solid ${filter === tab ? '#D4A52A' : '#E5E0D8'}`, background: filter === tab ? '#D4A52A' : '#fff', color: filter === tab ? '#fff' : '#1A1A1A', fontWeight: 600, fontSize: '0.75rem', cursor: 'pointer' }}>
              {tab === 'all' ? 'All' : tab === 'low' ? 'Low Stock' : 'Out of Stock'}
            </button>
          ))}
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} style={{ padding: '0.3rem 0.8rem', borderRadius: '20px', border: '1px solid #E5E0D8', background: '#fff', color: '#1A1A1A', fontWeight: 600, fontSize: '0.75rem', cursor: 'pointer' }}>
            <option value="all">All Categories</option>
            {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        </div>
      </div>

      {/* Inventory List with Thumbnails */}
      {items.length === 0 ? (
        <Card style={{ padding: '3rem 1.5rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', background: '#fff' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#FBF3E0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Svg name="box" size={40} stroke="#D4A52A" /></div>
          <div><h3 style={{ margin: 0, color: '#1A1A1A' }}>Your inventory is empty</h3><p style={{ margin: '0.5rem 0 0', color: '#8A8A8A', fontSize: '0.85rem' }}>Start by adding your first product or raw material.</p></div>
          <button onClick={() => setShowAddModal(true)} style={goldBtn}>Add your first item</button>
        </Card>
      ) : filteredItems.length === 0 ? (
        <Card style={{ padding: '2rem', textAlign: 'center', color: '#8A8A8A', background: '#fff' }}>No items match your search.</Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {filteredItems.map(item => {
            const isLow = Number(item.quantity_on_hand || 0) <= Number(item.reorder_level || 0)
            const isOut = Number(item.quantity_on_hand || 0) === 0
            return (
              <Card key={item.id} style={{ padding: '1rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', background: '#fff' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', minWidth: '200px' }}>
                  {/* Thumbnail */}
                  <div style={{ width: '48px', height: '48px', borderRadius: '8px', background: '#F8F6F2', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                    {item.image_url ? <img src={item.image_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Svg name="image" size={20} stroke="#8A8A8A" />}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, color: '#1A1A1A', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      {item.item_name}
                      {item.is_listed_on_website && <span title="Live on Website" style={{ background: '#E8F5E9', color: '#2E7D5E', padding: '0.1rem 0.4rem', borderRadius: '4px', fontSize: '0.6rem', fontWeight: 700 }}>🌐 Website</span>}
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.8rem', color: '#8A8A8A', marginTop: '0.25rem', flexWrap: 'wrap' }}>
                      <span>Price: ₦{Number(item.selling_price || 0).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <button onClick={() => adjustStock(item, -1)} style={whiteBtn}>-</button>
                    <span style={{ fontWeight: 700, color: isOut ? '#D9534F' : isLow ? '#D9534F' : '#2E7D5E', fontSize: '1rem' }}>{item.quantity_on_hand}</span>
                    <button onClick={() => adjustStock(item, 1)} style={whiteBtn}>+</button>
                  </div>
                  <div>
                    {isOut && <span style={{ background: '#D9534F', color: '#fff', fontSize: '0.65rem', fontWeight: 600, padding: '0.15rem 0.5rem', borderRadius: '4px' }}>Out</span>}
                    {isLow && !isOut && <span style={{ background: '#D4A52A', color: '#fff', fontSize: '0.65rem', fontWeight: 600, padding: '0.15rem 0.5rem', borderRadius: '4px' }}>Low</span>}
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* ─── WIZARD MODAL ─── */}
      {showAddModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }} onClick={() => !saving && setShowAddModal(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: '20px', padding: '1.5rem', width: '100%', maxWidth: '480px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 12px 40px rgba(0,0,0,0.2)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, color: '#1A1A1A' }}>Add Item</h3>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8A8A8A' }}><Svg name="x" size={20} stroke="currentColor" /></button>
            </div>

            {/* Progress Bar (Now 4 steps) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              {[1, 2, 3, 4].map(s => <div key={s} style={{ flex: 1, height: '4px', borderRadius: '2px', background: step >= s ? '#D4A52A' : '#E5E0D8' }} />)}
            </div>
            <p style={{ color: '#8A8A8A', fontSize: '0.75rem', margin: '0 0 1rem', fontWeight: 600 }}>Step {step} of 4</p>

            {/* Step 1: Basics */}
            {step === 1 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.3rem', color: '#1A1A1A' }}>Item Name <span style={{ color: '#D9534F' }}>*</span></label>
                  <input type="text" value={formData.item_name} onChange={(e) => setFormData({ ...formData, item_name: e.target.value })} placeholder="e.g. Ankara Fabric" style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #E5E0D8', background: '#F8F6F2', color: '#1A1A1A', fontSize: '0.9rem', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.3rem', color: '#1A1A1A' }}>Category</label>
                  <input type="text" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} placeholder="e.g. Fabric, Foodstuff" style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #E5E0D8', background: '#F8F6F2', color: '#1A1A1A', fontSize: '0.9rem', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.3rem', color: '#1A1A1A' }}>Internal Description (optional)</label>
                  <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={2} placeholder="Notes for your staff..." style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #E5E0D8', background: '#F8F6F2', color: '#1A1A1A', fontSize: '0.9rem', boxSizing: 'border-box', resize: 'vertical' }} />
                </div>
                <button onClick={() => setStep(2)} disabled={!formData.item_name} style={{ ...goldBtn, opacity: formData.item_name ? 1 : 0.5 }}>Continue</button>
              </div>
            )}

            {/* Step 2: Pricing */}
             {step === 2 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.3rem', color: '#1A1A1A' }}>Selling Price (₦) <span style={{ color: '#D9534F' }}>*</span></label>
                    <input type="number" value={formData.selling_price} onChange={(e) => setFormData({ ...formData, selling_price: e.target.value })} placeholder="0" style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #E5E0D8', background: '#F8F6F2', color: '#1A1A1A', fontSize: '0.9rem', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.3rem', color: '#1A1A1A' }}>Cost Price (₦)</label>
                    <input type="number" value={formData.cost_price} onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })} placeholder="0" style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #E5E0D8', background: '#F8F6F2', color: '#1A1A1A', fontSize: '0.9rem', boxSizing: 'border-box' }} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.3rem', color: '#1A1A1A' }}>Quantity in Stock <span style={{ color: '#D9534F' }}>*</span></label>
                    <input type="number" value={formData.quantity_on_hand} onChange={(e) => setFormData({ ...formData, quantity_on_hand: e.target.value })} placeholder="0" style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #E5E0D8', background: '#F8F6F2', color: '#1A1A1A', fontSize: '0.9rem', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.3rem', color: '#1A1A1A' }}>Reorder Level</label>
                    <input type="number" value={formData.reorder_level} onChange={(e) => setFormData({ ...formData, reorder_level: e.target.value })} placeholder="0" style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #E5E0D8', background: '#F8F6F2', color: '#1A1A1A', fontSize: '0.9rem', boxSizing: 'border-box' }} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                  <button onClick={() => setStep(1)} style={whiteBtn}>Back</button>
                  <button onClick={() => setStep(3)} disabled={!formData.selling_price || !formData.quantity_on_hand} style={{ ...goldBtn, flex: 2, opacity: formData.selling_price && formData.quantity_on_hand ? 1 : 0.5 }}>Continue</button>
                </div>
              </div>
            )}

            {/* Step 3: Website Storefront */}
            {step === 3 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ background: '#FBF3E0', padding: '1rem', borderRadius: '8px', border: '1px solid #F2E2B9', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#8A6A10' }}>
                  <Svg name="globe" size={20} stroke="#D4A52A" />
                  <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Add details for your public website.</span>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.3rem', color: '#1A1A1A' }}>Product Photo</label>
                  <div style={{ border: '2px dashed #E5E0D8', borderRadius: '8px', padding: '1rem', textAlign: 'center', background: '#F8F6F2' }}>
                    {formData.image_url ? (
                      <div style={{ position: 'relative' }}>
                        <img src={formData.image_url} style={{ maxWidth: '100%', maxHeight: '120px', borderRadius: '8px', objectFit: 'cover' }} />
                        <label style={{ display: 'block', marginTop: '0.5rem', color: '#D4A52A', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600 }}>Change Photo<input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} /></label>
                      </div>
                    ) : (
                      <label style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', color: '#8A8A8A' }}>
                        {uploadingImage ? <span>Uploading...</span> : <><Svg name="image" size={24} /><span style={{ fontSize: '0.8rem', marginTop: '0.5rem', fontWeight: 600 }}>Click to upload photo</span></>}
                        <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
                      </label>
                    )}
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.3rem', color: '#1A1A1A' }}>Public Web Description</label>
                  <textarea value={formData.web_description} onChange={(e) => setFormData({ ...formData, web_description: e.target.value })} rows={3} placeholder="Describe this product for customers on your website..." style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #E5E0D8', background: '#F8F6F2', color: '#1A1A1A', fontSize: '0.9rem', boxSizing: 'border-box', resize: 'vertical' }} />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#F8F6F2', padding: '1rem', borderRadius: '8px' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1A1A1A' }}>List on Website</div>
                    <div style={{ fontSize: '0.75rem', color: '#8A8A8A' }}>Show this product in your store.</div>
                  </div>
                  <button onClick={() => setFormData({ ...formData, is_listed_on_website: !formData.is_listed_on_website })} style={{ width: '48px', height: '24px', borderRadius: '12px', border: 'none', background: formData.is_listed_on_website ? '#2E7D5E' : '#E5E0D8', position: 'relative', cursor: 'pointer', transition: 'background 0.2s' }}>
                    <span style={{ position: 'absolute', top: '2px', left: formData.is_listed_on_website ? '26px' : '2px', width: '20px', height: '20px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }} />
                  </button>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <button onClick={() => setStep(2)} style={whiteBtn}>Back</button>
                  <button onClick={() => setStep(4)} style={{ ...goldBtn, flex: 2 }}>Continue</button>
                </div>
              </div>
            )}

            {/* Step 4: Summary */}
            {step === 4 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ background: '#F8F6F2', borderRadius: '8px', padding: '1rem' }}>
                  <h4 style={{ margin: '0 0 0.5rem', color: '#1A1A1A' }}>Summary</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.9rem' }}>
                    <div><strong style={{ color: '#8A8A8A' }}>Item:</strong> <span style={{ color: '#1A1A1A' }}>{formData.item_name}</span></div>
                    <div><strong style={{ color: '#8A8A8A' }}>Price:</strong> <span style={{ color: '#1A1A1A' }}>₦{Number(formData.selling_price).toLocaleString()}</span></div>
                    <div><strong style={{ color: '#8A8A8A' }}>Quantity:</strong> <span style={{ color: '#1A1A1A' }}>{formData.quantity_on_hand}</span></div>
                    <div><strong style={{ color: '#8A8A8A' }}>Website Status:</strong> <span style={{ color: formData.is_listed_on_website ? '#2E7D5E' : '#D9534F', fontWeight: 700 }}>{formData.is_listed_on_website ? 'Listed' : 'Not Listed'}</span></div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button onClick={() => setStep(3)} style={whiteBtn}>Back</button>
                  <button onClick={handleSaveItem} disabled={saving} style={{ ...goldBtn, flex: 2, opacity: saving ? 0.7 : 1 }}>{saving ? 'Saving...' : 'Save Item'}</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      <div style={{ marginTop: '2rem' }}><Navigation businessId={businessId} /></div>
    </div>
  )
}
