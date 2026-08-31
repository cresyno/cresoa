'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../../../lib/supabaseClient'

// ─── Icons ───
const Svg = ({ name, size = 20, stroke = 'currentColor' }) => {
  const icons = {
    plus: <><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></>,
    search: <><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></>,
    edit: <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />,
    trash: <><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></>,
    x: <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>,
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{icons[name]}</svg>
}

const formatMoney = (val) => `₦${Number(val || 0).toLocaleString('en-NG')}`

export default function MaterialsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const businessId = searchParams.get('business_id')

  const [materials, setMaterials] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)

  // Form state
  const [form, setForm] = useState({ item_name: '', category: '', description: '', unit: '', quantity: '', reorder_level: '', cost_price: '', selling_price: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const fetchMaterials = async () => {
      if (!businessId) return
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('inventory_items')
          .select('*')
          .eq('business_id', businessId)
          .eq('sector', 'printing')
          .order('item_name', { ascending: true })

        if (error) throw error
        setMaterials(data || [])
      } catch (err) {
        console.error('Error fetching materials:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchMaterials()
  }, [businessId])

  const filtered = useMemo(() => {
    let result = materials
    if (search) {
      result = result.filter(m => m.item_name.toLowerCase().includes(search.toLowerCase()))
    }
    if (filter === 'low') result = result.filter(m => Number(m.quantity_on_hand) <= Number(m.reorder_level) && Number(m.quantity_on_hand) > 0)
    if (filter === 'out') result = result.filter(m => Number(m.quantity_on_hand) === 0)
    return result
  }, [materials, search, filter])

  const totalValue = materials.reduce((sum, m) => sum + (Number(m.quantity_on_hand) * Number(m.cost_price || 0)), 0)
  const lowCount = materials.filter(m => Number(m.quantity_on_hand) <= Number(m.reorder_level) && Number(m.quantity_on_hand) > 0).length
  const outCount = materials.filter(m => Number(m.quantity_on_hand) === 0).length

  const openAdd = () => {
    setEditing(null)
    setForm({ item_name: '', category: '', description: '', unit: '', quantity: '', reorder_level: '', cost_price: '', selling_price: '' })
    setShowModal(true)
  }

  const openEdit = (m) => {
    setEditing(m)
    setForm({ item_name: m.item_name || '', category: m.category || '', description: m.description || '', unit: m.unit || '', quantity: m.quantity_on_hand || '', reorder_level: m.reorder_level || '', cost_price: m.cost_price || '', selling_price: m.selling_price || '' })
    setShowModal(true)
  }

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSave = async () => {
    if (!form.item_name.trim()) { alert('Material name is required.'); return }
    setSaving(true)
    try {
      const payload = {
        business_id: businessId,
        sector: 'printing',
        item_name: form.item_name.trim(),
        category: form.category || null,
        description: form.description || null,
        unit: form.unit || null,
        quantity_on_hand: Number(form.quantity) || 0,
        reorder_level: Number(form.reorder_level) || 0,
        cost_price: Number(form.cost_price) || 0,
        selling_price: Number(form.selling_price) || 0,
      }

      if (editing) {
        const { error } = await supabase.from('inventory_items').update(payload).eq('id', editing.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('inventory_items').insert(payload)
        if (error) throw error
      }

      // Refresh
      const { data } = await supabase.from('inventory_items').select('*').eq('business_id', businessId).eq('sector', 'printing').order('item_name', { ascending: true })
      setMaterials(data || [])
      setShowModal(false)
    } catch (err) {
      alert('Failed to save material.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this material?')) return
    const { error } = await supabase.from('inventory_items').delete().eq('id', id)
    if (!error) setMaterials(prev => prev.filter(m => m.id !== id))
  }

  const adjustStock = async (id, delta) => {
    const item = materials.find(m => m.id === id)
    if (!item) return
    const newQty = Math.max(0, Number(item.quantity_on_hand) + delta)
    const { error } = await supabase.from('inventory_items').update({ quantity_on_hand: newQty }).eq('id', id)
    if (!error) setMaterials(prev => prev.map(m => m.id === id ? { ...m, quantity_on_hand: newQty } : m))
  }

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: 'var(--cresoa-bg)' }}><div className="cresoa-loading-spinner" /></div>
  }

  return (
    <div style={{ padding: '1rem', maxWidth: '1200px', margin: '0 auto', minHeight: '100vh', background: 'var(--cresoa-bg)', paddingBottom: '80px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <p style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', margin: 0 }}>Printing</p>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0.2rem 0' }}>Materials</h1>
        </div>
        <button onClick={openAdd} className="cresoa-primary-button"><Svg name="plus" size={16} stroke="#fff" /> Add Material</button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.5rem', marginBottom: '1rem' }}>
        <div className="cresoa-card" style={{ padding: '0.75rem', textAlign: 'center' }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--cresoa-text-muted)' }}>Total</div>
          <div style={{ fontWeight: 700, fontSize: '1.2rem' }}>{materials.length}</div>
        </div>
        <div className="cresoa-card" style={{ padding: '0.75rem', textAlign: 'center' }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--cresoa-text-muted)' }}>Stock Value</div>
          <div style={{ fontWeight: 700, fontSize: '1.2rem', color: 'var(--cresoa-accent)' }}>{formatMoney(totalValue)}</div>
        </div>
        <div className="cresoa-card" style={{ padding: '0.75rem', textAlign: 'center', borderColor: lowCount > 0 ? 'var(--cresoa-danger)' : 'var(--cresoa-border)' }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--cresoa-text-muted)' }}>Low Stock</div>
          <div style={{ fontWeight: 700, fontSize: '1.2rem', color: lowCount > 0 ? 'var(--cresoa-danger)' : 'var(--cresoa-text)' }}>{lowCount}</div>
        </div>
        <div className="cresoa-card" style={{ padding: '0.75rem', textAlign: 'center', borderColor: outCount > 0 ? 'var(--cresoa-danger)' : 'var(--cresoa-border)' }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--cresoa-text-muted)' }}>Out of Stock</div>
          <div style={{ fontWeight: 700, fontSize: '1.2rem', color: outCount > 0 ? 'var(--cresoa-danger)' : 'var(--cresoa-text)' }}>{outCount}</div>
        </div>
      </div>

      {/* Search & Filter */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '200px', display: 'flex', alignItems: 'center', background: 'var(--cresoa-surface)', border: '1px solid var(--cresoa-border)', borderRadius: '8px', padding: '0.4rem 0.8rem' }}>
          <Svg name="search" size={16} stroke="var(--cresoa-text-muted)" style={{ marginRight: '0.5rem' }} />
          <input type="text" placeholder="Search materials..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', color: 'var(--cresoa-text)' }} />
        </div>
        {['all', 'low', 'out'].map(tab => (
          <button key={tab} onClick={() => setFilter(tab)} style={{ padding: '0.4rem 0.9rem', borderRadius: '20px', border: `1px solid ${filter === tab ? 'var(--cresoa-accent)' : 'var(--cresoa-border)'}`, background: filter === tab ? 'var(--cresoa-accent-soft)' : 'var(--cresoa-surface)', color: filter === tab ? 'var(--cresoa-accent)' : 'var(--cresoa-text-muted)', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}>
            {tab === 'all' ? 'All' : tab === 'low' ? 'Low' : 'Out'}
          </button>
        ))}
      </div>

      {/* Materials List */}
      {filtered.length === 0 ? (
        <div className="cresoa-empty-state">
          <Svg name="search" size={40} stroke="var(--cresoa-accent)" />
          <span className="cresoa-empty-state-title">No materials found</span>
          <span className="cresoa-empty-state-message">Add your first material to start tracking inventory.</span>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {filtered.map(m => {
            const isLow = Number(m.quantity_on_hand) <= Number(m.reorder_level) && Number(m.quantity_on_hand) > 0
            const isOut = Number(m.quantity_on_hand) === 0
            return (
              <div key={m.id} className="cresoa-card" style={{ padding: '0.8rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{m.item_name}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--cresoa-text-muted)' }}>
                    {m.category || 'Uncategorized'} · {m.unit ? `${m.quantity_on_hand} ${m.unit}` : `${m.quantity_on_hand} pcs`}
                    {m.cost_price > 0 && ` · Cost ${formatMoney(m.cost_price)}`}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <button onClick={() => adjustStock(m.id, -1)} style={{ width: '28px', height: '28px', borderRadius: '6px', border: '1px solid var(--cresoa-border)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>-</button>
                  <span style={{ fontWeight: 700, minWidth: '40px', textAlign: 'center', color: isOut ? 'var(--cresoa-danger)' : isLow ? 'var(--cresoa-warning)' : 'var(--cresoa-text)' }}>{m.quantity_on_hand}</span>
                  <button onClick={() => adjustStock(m.id, 1)} style={{ width: '28px', height: '28px', borderRadius: '6px', border: '1px solid var(--cresoa-border)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>+</button>
                </div>
                <div style={{ display: 'flex', gap: '0.3rem' }}>
                  <button onClick={() => openEdit(m)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cresoa-text-muted)' }}><Svg name="edit" size={16} stroke="currentColor" /></button>
                  <button onClick={() => handleDelete(m.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cresoa-danger)' }}><Svg name="trash" size={16} stroke="currentColor" /></button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }} onClick={() => !saving && setShowModal(false)}>
          <div style={{ background: 'var(--cresoa-surface)', borderRadius: '16px', padding: '1.5rem', maxWidth: '500px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 1rem' }}>{editing ? 'Edit Material' : 'Add Material'}</h3>
            <div style={{ display: 'grid', gap: '0.8rem' }}>
              <div>
                <label style={labelStyle}>Material Name *</label>
                <input type="text" name="item_name" value={form.item_name} onChange={handleChange} placeholder="e.g. A4 Paper 80gsm" style={inputStyle} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
                <div>
                  <label style={labelStyle}>Category</label>
                  <select name="category" value={form.category} onChange={handleChange} style={inputStyle}>
                    <option value="">Select</option>
                    {['Paper', 'Ink', 'Film', 'Plates', 'Binding', 'Other'].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Unit</label>
                  <input type="text" name="unit" value={form.unit} onChange={handleChange} placeholder="e.g. ream, liter, sheets" style={inputStyle} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Description</label>
                <textarea name="description" value={form.description} onChange={handleChange} rows={2} placeholder="e.g. 80gsm, white, A4" style={{ ...inputStyle, resize: 'vertical' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
                <div>
                  <label style={labelStyle}>Quantity *</label>
                  <input type="number" name="quantity" value={form.quantity} onChange={handleChange} placeholder="0" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Reorder Level</label>
                  <input type="number" name="reorder_level" value={form.reorder_level} onChange={handleChange} placeholder="0" style={inputStyle} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
                <div>
                  <label style={labelStyle}>Cost Price (₦)</label>
                  <input type="number" name="cost_price" value={form.cost_price} onChange={handleChange} placeholder="0" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Selling Price (₦)</label>
                  <input type="number" name="selling_price" value={form.selling_price} onChange={handleChange} placeholder="0" style={inputStyle} />
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
              <button onClick={() => setShowModal(false)} style={{ flex: 1, padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'transparent', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleSave} disabled={saving} style={{ flex: 1, padding: '0.6rem', borderRadius: '8px', border: 'none', background: 'var(--cresoa-accent)', color: '#fff', fontWeight: 700 }}>{saving ? 'Saving...' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const inputStyle = {
  width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-bg)', color: 'var(--cresoa-text)', fontSize: '0.95rem', boxSizing: 'border-box'
}
const labelStyle = { display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem', color: 'var(--cresoa-text)' }
