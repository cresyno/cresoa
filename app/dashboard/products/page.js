'use client'

import { useState, useEffect } from 'react'
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
  const [editingId, setEditingId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', price: '', description: '', image_url: '', featured: false, active: true, stock: 0 })
  const [searchQuery, setSearchQuery] = useState('')
  const [filter, setFilter] = useState('all')

  // Fetch products from business_products, and migrate from shop_products if empty
  const fetchProducts = async () => {
    if (!businessId) return
    setLoading(true)
    try {
      // Try to fetch from business_products table
      let { data, error } = await supabase
        .from('business_products')
        .select('*')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false })

      if (error) throw error

      // If no products, migrate from business_public_pages.shop_products
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

          const { error: insertErr } = await supabase
            .from('business_products')
            .insert(legacyProducts)

          if (insertErr) throw insertErr

          // Re-fetch from business_products
          const { data: newData, error: refetchErr } = await supabase
            .from('business_products')
            .select('*')
            .eq('business_id', businessId)
            .order('created_at', { ascending: false })

          if (refetchErr) throw refetchErr
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

  // Reset form when opening add
  const openAddForm = () => {
    setEditingId(null)
    setForm({ name: '', price: '', description: '', image_url: '', featured: false, active: true, stock: 0 })
    setShowForm(true)
  }

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  const handleImageUpload = async (e) => {
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
      setMessage('Image uploaded')
    } catch (err) {
      setMessage('Upload failed: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleSave = async () => {
    if (!form.name.trim() || !form.price.trim()) {
      setMessage('Name and price are required.')
      return
    }
    setSaving(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      let result
      if (editingId) {
        result = await supabase
          .from('business_products')
          .update({
            name: form.name,
            price: form.price,
            description: form.description,
            image_url: form.image_url,
            featured: form.featured,
            active: form.active,
            stock: form.stock,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingId)
      } else {
        result = await supabase
          .from('business_products')
          .insert({
            business_id: businessId,
            name: form.name,
            price: form.price,
            description: form.description,
            image_url: form.image_url,
            featured: form.featured,
            active: form.active,
            stock: form.stock,
          })
      }

      if (result.error) throw result.error
      setMessage('✅ Product saved!')
      setShowForm(false)
      setEditingId(null)
      setForm({ name: '', price: '', description: '', image_url: '', featured: false, active: true, stock: 0 })
      fetchProducts()
    } catch (err) {
      setMessage('❌ ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (product) => {
    setEditingId(product.id)
    setForm({
      name: product.name,
      price: product.price,
      description: product.description || '',
      image_url: product.image_url || '',
      featured: product.featured,
      active: product.active,
      stock: product.stock || 0,
    })
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this product?')) return
    const { error } = await supabase.from('business_products').delete().eq('id', id)
    if (error) setMessage('Delete error: ' + error.message)
    else {
      setMessage('✅ Product deleted')
      fetchProducts()
    }
  }

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
      .update({ featured: newFeatured })
      .eq('id', product.id)
    if (error) setMessage(error.message)
    else fetchProducts()
  }

  const toggleActive = async (product) => {
    const newActive = !product.active
    const { error } = await supabase
      .from('business_products')
      .update({ active: newActive })
      .eq('id', product.id)
    if (error) setMessage(error.message)
    else fetchProducts()
  }

  // Filter and search
  const filteredProducts = products.filter(p => {
    if (filter === 'active' && !p.active) return false
    if (filter === 'inactive' && p.active) return false
    if (filter === 'featured' && !p.featured) return false
    if (searchQuery && !p.name.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--cresoa-bg)' }}><div className="cresoa-loading-spinner" /></div>

  return (
    <div style={{ padding: '1rem', maxWidth: '1200px', margin: '0 auto', background: 'var(--cresoa-bg)', minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Products Management</h1>
        <button onClick={openAddForm} style={{ background: 'var(--cresoa-accent)', color: '#fff', padding: '0.6rem 1.2rem', borderRadius: '8px', border: 'none', fontWeight: 700, cursor: 'pointer' }}>+ Add Product</button>
      </div>

      {message && <div style={{ padding: '0.6rem 1rem', borderRadius: '8px', marginBottom: '1rem', background: message.startsWith('✅') ? 'var(--cresoa-success-soft)' : 'var(--cresoa-danger-soft)', color: message.startsWith('✅') ? 'var(--cresoa-success)' : 'var(--cresoa-danger)' }}>{message}</div>}

      {/* Search and Filter */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Search products..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ ...inputStyle, maxWidth: '250px' }}
        />
        <select value={filter} onChange={(e) => setFilter(e.target.value)} style={{ ...inputStyle, maxWidth: '150px' }}>
          <option value="all">All</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="featured">Featured</option>
        </select>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div style={{ ...cardStyle, marginBottom: '1.5rem', padding: '1.5rem' }}>
          <h3 style={{ marginBottom: '1rem' }}>{editingId ? 'Edit Product' : 'Add New Product'}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={labelStyle}>Product Name *</label>
              <input type="text" name="name" value={form.name} onChange={handleInputChange} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Price (₦) *</label>
              <input type="text" name="price" value={form.price} onChange={handleInputChange} style={inputStyle} placeholder="e.g. 15,000" />
            </div>
          </div>
          <div style={{ marginTop: '0.8rem' }}>
            <label style={labelStyle}>Description</label>
            <textarea name="description" value={form.description} onChange={handleInputChange} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
          </div>
          <div style={{ marginTop: '0.8rem' }}>
            <label style={labelStyle}>Product Image</label>
            <input type="file" accept="image/*" onChange={handleImageUpload} />
            {form.image_url && <img src={form.image_url} alt="Product" style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px', marginTop: '0.5rem' }} />}
          </div>
          <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.8rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <input type="checkbox" name="featured" checked={form.featured} onChange={handleInputChange} /> Featured on homepage (max 4)
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <input type="checkbox" name="active" checked={form.active} onChange={handleInputChange} /> Active (show online)
            </label>
            <div>
              <label style={labelStyle}>Stock</label>
              <input type="number" name="stock" value={form.stock} onChange={handleInputChange} style={{ ...inputStyle, width: '80px' }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
            <button onClick={handleSave} disabled={saving} style={{ background: 'var(--cresoa-accent)', color: '#fff', padding: '0.6rem 1.5rem', borderRadius: '8px', border: 'none', fontWeight: 700 }}>{saving ? 'Saving...' : 'Save'}</button>
            <button onClick={() => setShowForm(false)} style={{ background: 'var(--cresoa-surface)', color: 'var(--cresoa-text)', padding: '0.6rem 1.5rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', fontWeight: 700 }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Products Grid */}
      {filteredProducts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--cresoa-text-muted)' }}>
          <p style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>No products yet</p>
          <p>Add your first product to start selling online.</p>
          <button onClick={openAddForm} style={{ marginTop: '1rem', background: 'var(--cresoa-accent)', color: '#fff', padding: '0.6rem 1.5rem', borderRadius: '8px', border: 'none', fontWeight: 700 }}>+ Add Product</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem' }}>
          {filteredProducts.map(product => (
            <div key={product.id} style={cardStyle}>
              {product.image_url && <img src={product.image_url} alt={product.name} style={{ width: '100%', height: '150px', objectFit: 'cover', borderRadius: '8px', marginBottom: '0.5rem' }} />}
              <h4 style={{ fontWeight: 700, margin: '0 0 0.3rem' }}>{product.name}</h4>
              <p style={{ color: 'var(--cresoa-accent)', fontWeight: 700, margin: '0 0 0.3rem' }}>₦{product.price}</p>
              {product.description && <p style={{ color: 'var(--cresoa-text-muted)', fontSize: '0.85rem' }}>{product.description}</p>}
              <div style={{ display: 'flex', gap: '0.3rem', marginTop: '0.5rem' }}>
                <button onClick={() => handleEdit(product)} style={{ background: 'none', border: '1px solid var(--cresoa-border)', padding: '0.3rem 0.6rem', borderRadius: '6px', cursor: 'pointer' }}>Edit</button>
                <button onClick={() => handleDelete(product.id)} style={{ background: 'none', border: '1px solid var(--cresoa-danger)', color: 'var(--cresoa-danger)', padding: '0.3rem 0.6rem', borderRadius: '6px', cursor: 'pointer' }}>Delete</button>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.8rem' }}>
                  <input type="checkbox" checked={product.featured} onChange={() => toggleFeatured(product)} /> Featured
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.8rem' }}>
                  <input type="checkbox" checked={product.active} onChange={() => toggleActive(product)} /> Active
                </label>
                <span style={{ fontSize: '0.8rem', color: 'var(--cresoa-text-muted)' }}>Stock: {product.stock}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
    }
