'use client'

import { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '../../../lib/supabaseClient'
import { compressImage } from '../../../lib/compressImage'

const inputStyle = { width: '100%', padding: '0.7rem 0.9rem', borderRadius: '10px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-bg)', color: 'var(--cresoa-text)', fontSize: '0.95rem', boxSizing: 'border-box' }
const labelStyle = { display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem', color: 'var(--cresoa-text)' }
const cardStyle = { background: 'var(--cresoa-surface)', borderRadius: '12px', padding: '1rem', border: '1px solid var(--cresoa-border)' }

export default function ProductsPage() {
  const searchParams = useSearchParams()
  const businessId = searchParams.get('business_id')

  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all') // all, active, inactive
  const [featuredFilter, setFeaturedFilter] = useState('all') // all, featured, non-featured

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState([])
  const [bulkQuantity, setBulkQuantity] = useState('')

  // Edit modal
  const [editingProduct, setEditingProduct] = useState(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [form, setForm] = useState({ name: '', price: '', description: '', image_url: '', stock: 0, active: true, featured: false })

  // Mobile view toggle: 'inventory' or 'website'
  const [mobileView, setMobileView] = useState('inventory')

  const fetchProducts = async () => {
    if (!businessId) return
    setLoading(true)
    try {
      let { data, error } = await supabase
        .from('business_products')
        .select('*')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Migration from shop_products if empty
      if (!data || data.length === 0) {
        const { data: pageData, error: pageErr } = await supabase
          .from('business_public_pages')
          .select('shop_products')
          .eq('business_id', businessId)
          .maybeSingle()

        if (!pageErr && pageData?.shop_products?.length) {
          const legacyProducts = pageData.shop_products.map((p, idx) => ({
            business_id: businessId,
            name: p.name || 'Untitled',
            price: p.price || '0',
            description: p.description || '',
            image_url: p.image_url || '',
            featured: p.featured || false,
            active: true,
            stock: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }))
          const { error: insertErr } = await supabase.from('business_products').insert(legacyProducts)
          if (insertErr) throw insertErr
          const { data: newData } = await supabase.from('business_products').select('*').eq('business_id', businessId)
          data = newData
          setMessage('✅ Migrated ' + legacyProducts.length + ' products from your website')
        }
      }

      setProducts(data || [])
    } catch (err) {
      setMessage('Error loading products: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProducts()
  }, [businessId])

  // Filtered products for inventory view
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      if (statusFilter === 'active' && !p.active) return false
      if (statusFilter === 'inactive' && p.active) return false
      if (featuredFilter === 'featured' && !p.featured) return false
      if (featuredFilter === 'non-featured' && p.featured) return false
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        return p.name.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q) || p.price?.includes(q)
      }
      return true
    })
  }, [products, searchQuery, statusFilter, featuredFilter])

  // Products shown in website column (only active ones)
  const websiteProducts = useMemo(() => {
    return products.filter(p => p.active)
  }, [products])

  // Toggle selection
  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  // Select all (within filtered list)
  const toggleSelectAll = () => {
    if (selectedIds.length === filteredProducts.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(filteredProducts.map(p => p.id))
    }
  }

  // Quantity +/- on card
  const updateStock = async (product, delta) => {
    const newStock = (product.stock || 0) + delta
    if (newStock < 0) return
    const { error } = await supabase
      .from('business_products')
      .update({ stock: newStock, updated_at: new Date().toISOString() })
      .eq('id', product.id)
    if (error) setMessage(error.message)
    else fetchProducts()
  }

  // Toggle active
  const toggleActive = async (product) => {
    const newActive = !product.active
    const { error } = await supabase
      .from('business_products')
      .update({ active: newActive, updated_at: new Date().toISOString() })
      .eq('id', product.id)
    if (error) setMessage(error.message)
    else fetchProducts()
  }

  // Toggle featured (max 4)
  const toggleFeatured = async (product) => {
    const newFeatured = !product.featured
    if (newFeatured) {
      const featuredCount = products.filter(p => p.featured).length
      if (featuredCount >= 4) {
        setMessage('You can only feature up to 4 products on homepage.')
        return
      }
    }
    const { error } = await supabase
      .from('business_products')
      .update({ featured: newFeatured, updated_at: new Date().toISOString() })
      .eq('id', product.id)
    if (error) setMessage(error.message)
    else fetchProducts()
  }

  // Bulk quantity update
  const applyBulkQuantity = async () => {
    if (selectedIds.length === 0) return
    if (bulkQuantity === '') return
    const qty = parseInt(bulkQuantity)
    if (isNaN(qty) || qty < 0) return
    setSaving(true)
    try {
      const { error } = await supabase
        .from('business_products')
        .update({ stock: qty, updated_at: new Date().toISOString() })
        .in('id', selectedIds)
      if (error) throw error
      setMessage('✅ Bulk quantity updated')
      setSelectedIds([])
      setBulkQuantity('')
      fetchProducts()
    } catch (err) {
      setMessage('❌ ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  // Bulk active toggle
  const applyBulkActive = async (active) => {
    if (selectedIds.length === 0) return
    setSaving(true)
    try {
      const { error } = await supabase
        .from('business_products')
        .update({ active, updated_at: new Date().toISOString() })
        .in('id', selectedIds)
      if (error) throw error
      setMessage(`✅ Marked as ${active ? 'active' : 'inactive'}`)
      setSelectedIds([])
      fetchProducts()
    } catch (err) {
      setMessage('❌ ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  // Bulk delete
  const applyBulkDelete = async () => {
    if (selectedIds.length === 0) return
    if (!confirm('Delete selected products?')) return
    setSaving(true)
    try {
      const { error } = await supabase
        .from('business_products')
        .delete()
        .in('id', selectedIds)
      if (error) throw error
      setMessage('✅ Deleted products')
      setSelectedIds([])
      fetchProducts()
    } catch (err) {
      setMessage('❌ ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  // Edit modal handlers
  const openEditModal = (product) => {
    setEditingProduct(product)
    setForm({
      name: product.name,
      price: product.price,
      description: product.description || '',
      image_url: product.image_url || '',
      stock: product.stock || 0,
      active: product.active,
      featured: product.featured,
    })
    setShowEditModal(true)
  }

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  const handleEditImageUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setSaving(true)
    try {
      const compressedBlob = await compressImage(file, 200)
      const filePath = `${businessId}/product-${Date.now()}.jpg`
      const { error: uploadError } = await supabase.storage
        .from('business-assets')
        .upload(filePath, compressedBlob, { contentType: 'image/jpeg' })
      if (uploadError) throw uploadError
      const { data: urlData } = supabase.storage
        .from('business-assets')
        .getPublicUrl(filePath)
      setForm(prev => ({ ...prev, image_url: urlData.publicUrl }))
    } catch (err) {
      setMessage('Upload failed: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const saveEditModal = async () => {
    if (!form.name.trim() || !form.price.trim()) {
      setMessage('Name and price are required.')
      return
    }
    setSaving(true)
    try {
      const { error } = await supabase
        .from('business_products')
        .update({
          name: form.name,
          price: form.price,
          description: form.description,
          image_url: form.image_url,
          stock: form.stock,
          active: form.active,
          featured: form.featured,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingProduct.id)
      if (error) throw error
      setMessage('✅ Product updated')
      setShowEditModal(false)
      fetchProducts()
    } catch (err) {
      setMessage('❌ ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  // Add new product
  const openAddModal = () => {
    setEditingProduct(null)
    setForm({ name: '', price: '', description: '', image_url: '', stock: 0, active: true, featured: false })
    setShowEditModal(true)
  }

  const handleAddProduct = async () => {
    if (!form.name.trim() || !form.price.trim()) {
      setMessage('Name and price are required.')
      return
    }
    setSaving(true)
    try {
      const { error } = await supabase
        .from('business_products')
        .insert({
          business_id: businessId,
          name: form.name,
          price: form.price,
          description: form.description,
          image_url: form.image_url,
          stock: form.stock,
          active: form.active,
          featured: form.featured,
        })
      if (error) throw error
      setMessage('✅ Product added')
      setShowEditModal(false)
      fetchProducts()
    } catch (err) {
      setMessage('❌ ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--cresoa-bg)' }}><div className="cresoa-loading-spinner" /></div>

  return (
    <div style={{ padding: '1rem', maxWidth: '1200px', margin: '0 auto', background: 'var(--cresoa-bg)', minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Products Management</h1>
        <button onClick={openAddModal} style={{ background: 'var(--cresoa-accent)', color: '#fff', padding: '0.6rem 1.2rem', borderRadius: '8px', border: 'none', fontWeight: 700, cursor: 'pointer' }}>+ Add Product</button>
      </div>

      {message && <div style={{ padding: '0.6rem 1rem', borderRadius: '8px', marginBottom: '1rem', background: message.startsWith('✅') ? 'var(--cresoa-success-soft)' : 'var(--cresoa-danger-soft)', color: message.startsWith('✅') ? 'var(--cresoa-success)' : 'var(--cresoa-danger)' }}>{message}</div>}

      {/* Filters */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Search products..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ ...inputStyle, maxWidth: '250px' }}
        />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ ...inputStyle, maxWidth: '150px' }}>
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <select value={featuredFilter} onChange={(e) => setFeaturedFilter(e.target.value)} style={{ ...inputStyle, maxWidth: '150px' }}>
          <option value="all">All Featured</option>
          <option value="featured">Featured</option>
          <option value="non-featured">Not Featured</option>
        </select>
      </div>

      {/* Mobile toggle */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <button
          onClick={() => setMobileView('inventory')}
          style={{ padding: '0.4rem 0.8rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: mobileView === 'inventory' ? 'var(--cresoa-accent)' : 'var(--cresoa-surface)', color: mobileView === 'inventory' ? '#fff' : 'inherit', fontWeight: 600 }}
        >Inventory</button>
        <button
          onClick={() => setMobileView('website')}
          style={{ padding: '0.4rem 0.8rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: mobileView === 'website' ? 'var(--cresoa-accent)' : 'var(--cresoa-surface)', color: mobileView === 'website' ? '#fff' : 'inherit', fontWeight: 600 }}
        >Website Products</button>
      </div>

      {/* Bulk actions */}
      {selectedIds.length > 0 && (
        <div style={{ padding: '0.6rem 1rem', background: 'var(--cresoa-accent-soft)', borderRadius: '8px', marginBottom: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <strong>Selected ({selectedIds.length}):</strong>
          <input
            type="number"
            placeholder="Set qty"
            value={bulkQuantity}
            onChange={(e) => setBulkQuantity(e.target.value)}
            style={{ ...inputStyle, maxWidth: '100px', marginBottom: '0' }}
          />
          <button onClick={applyBulkQuantity} disabled={saving} style={{ padding: '0.4rem 0.8rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-surface)', fontWeight: 600 }}>Set Qty</button>
          <button onClick={() => applyBulkActive(true)} disabled={saving} style={{ padding: '0.4rem 0.8rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-surface)', fontWeight: 600 }}>Set Active</button>
          <button onClick={() => applyBulkActive(false)} disabled={saving} style={{ padding: '0.4rem 0.8rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-surface)', fontWeight: 600 }}>Set Inactive</button>
          <button onClick={applyBulkDelete} disabled={saving} style={{ padding: '0.4rem 0.8rem', borderRadius: '8px', border: '1px solid var(--cresoa-danger)', background: 'var(--cresoa-danger)', color: '#fff', fontWeight: 600 }}>Delete</button>
          <button onClick={() => setSelectedIds([])} style={{ padding: '0.4rem 0.8rem', borderRadius: '8px', border: 'none', background: 'transparent', fontWeight: 600 }}>Clear</button>
        </div>
      )}

      {/* Two-column layout (desktop) with responsive switch */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', '@media (max-width: 768px)': { gridTemplateColumns: '1fr' } }}>
        {/* Inventory Column */}
        <div style={{ ...cardStyle, '@media (max-width: 768px)': { display: mobileView === 'inventory' ? 'block' : 'none' } }}>
          <h3 style={{ marginBottom: '1rem' }}>Inventory (All Products)</h3>

          {/* Select All checkbox */}
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}>
            <input type="checkbox" checked={selectedIds.length === filteredProducts.length && filteredProducts.length > 0} onChange={toggleSelectAll} />
            <span style={{ fontWeight: 600 }}>Select All</span>
          </label>

          {filteredProducts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--cresoa-text-muted)' }}>No products found.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              {filteredProducts.map(product => (
                <div key={product.id} style={{ border: '1px solid var(--cresoa-border)', borderRadius: '8px', padding: '0.8rem' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'start' }}>
                    <input type="checkbox" checked={selectedIds.includes(product.id)} onChange={() => toggleSelect(product.id)} />
                    <div style={{ flex: 1 }}>
                      {product.image_url && <img src={product.image_url} alt={product.name} style={{ width: '80px', height: '60px', objectFit: 'cover', borderRadius: '6px', marginBottom: '0.5rem' }} />}
                      <h4 style={{ margin: '0 0 0.3rem', fontWeight: 700 }}>{product.name}</h4>
                      <p style={{ margin: '0 0 0.3rem', color: 'var(--cresoa-accent)', fontWeight: 700 }}>₦{product.price}</p>
                      {product.description && <p style={{ margin: '0 0 0.3rem', color: 'var(--cresoa-text-muted)', fontSize: '0.85rem' }}>{product.description}</p>}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                        <span>Stock:</span>
                        <button onClick={() => updateStock(product, -1)} style={{ padding: '0.1rem 0.4rem', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-surface)', borderRadius: '4px' }}>-</button>
                        <span style={{ fontWeight: 700 }}>{product.stock || 0}</span>
                        <button onClick={() => updateStock(product, 1)} style={{ padding: '0.1rem 0.4rem', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-surface)', borderRadius: '4px' }}>+</button>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.5rem' }}>
                    <button onClick={() => openEditModal(product)} style={{ padding: '0.2rem 0.6rem', borderRadius: '6px', border: '1px solid var(--cresoa-border)', cursor: 'pointer', fontSize: '0.85rem' }}>Edit</button>
                    <button onClick={() => toggleActive(product)} style={{ padding: '0.2rem 0.6rem', borderRadius: '6px', border: '1px solid var(--cresoa-border)', cursor: 'pointer', fontSize: '0.85rem', background: product.active ? 'var(--cresoa-success-soft)' : 'var(--cresoa-danger-soft)', color: product.active ? 'var(--cresoa-success)' : 'var(--cresoa-danger)' }}>{product.active ? 'Active' : 'Inactive'}</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

              {/* Website Products Column */}
        <div style={{ ...cardStyle, '@media (max-width: 768px)': { display: mobileView === 'website' ? 'block' : 'none' } }}>
          <h3 style={{ marginBottom: '1rem' }}>Website Products (Active)</h3>

          {websiteProducts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--cresoa-text-muted)' }}>No active products. Toggle products to active to show here.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              {websiteProducts.map(product => (
                <div key={product.id} style={{ border: '1px solid var(--cresoa-border)', borderRadius: '8px', padding: '0.8rem' }}>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {product.image_url && <img src={product.image_url} alt={product.name} style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '6px' }} />}
                    <div style={{ flex: 1 }}>
                      <h4 style={{ margin: '0 0 0.3rem', fontWeight: 700 }}>{product.name}</h4>
                      <p style={{ margin: '0 0 0.3rem', color: 'var(--cresoa-accent)', fontWeight: 700 }}>₦{product.price}</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.8rem' }}>
                          <input type="checkbox" checked={product.featured} onChange={() => toggleFeatured(product)} /> Featured
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Edit/Add Modal */}
      {showEditModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem' }}>
          <div style={{ background: 'var(--cresoa-surface)', borderRadius: '16px', padding: '1.5rem', maxWidth: '500px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ marginBottom: '1rem' }}>{editingProduct ? 'Edit Product' : 'Add New Product'}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
              <div>
                <label style={labelStyle}>Name *</label>
                <input type="text" name="name" value={form.name} onChange={handleFormChange} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Price (₦) *</label>
                <input type="text" name="price" value={form.price} onChange={handleFormChange} style={inputStyle} />
              </div>
            </div>
            <div style={{ marginTop: '0.8rem' }}>
              <label style={labelStyle}>Description</label>
              <textarea name="description" value={form.description} onChange={handleFormChange} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
            </div>
            <div style={{ marginTop: '0.8rem' }}>
              <label style={labelStyle}>Image</label>
              <input type="file" accept="image/*" onChange={handleEditImageUpload} />
              {form.image_url && <img src={form.image_url} alt="Product" style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px', marginTop: '0.5rem' }} />}
            </div>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.8rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <div>
                <label style={labelStyle}>Stock</label>
                <input type="number" name="stock" value={form.stock} onChange={handleFormChange} style={{ ...inputStyle, width: '80px' }} />
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <input type="checkbox" name="active" checked={form.active} onChange={handleFormChange} /> Active
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <input type="checkbox" name="featured" checked={form.featured} onChange={handleFormChange} /> Featured
              </label>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
              {editingProduct ? (
                <button onClick={saveEditModal} disabled={saving} style={{ background: 'var(--cresoa-accent)', color: '#fff', padding: '0.6rem 1.5rem', borderRadius: '8px', border: 'none', fontWeight: 700 }}>{saving ? 'Saving...' : 'Save'}</button>
              ) : (
                <button onClick={handleAddProduct} disabled={saving} style={{ background: 'var(--cresoa-accent)', color: '#fff', padding: '0.6rem 1.5rem', borderRadius: '8px', border: 'none', fontWeight: 700 }}>{saving ? 'Adding...' : 'Add'}</button>
              )}
              <button onClick={() => setShowEditModal(false)} style={{ background: 'var(--cresoa-surface)', color: 'var(--cresoa-text)', padding: '0.6rem 1.5rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', fontWeight: 700 }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
                      }
