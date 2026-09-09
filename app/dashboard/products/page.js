'use client'

import { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '../../../lib/supabaseClient'
import { compressImage } from '../../../lib/compressImage'
import styles from './products.module.css'

const EMPTY_FORM = {
  name: '',
  price: '',
  description: '',
  image_url: '',
  stock: 0,
  active: true,
  on_website: false,
  featured: false,
}

export default function ProductsPage() {
  const searchParams = useSearchParams()
  const businessId = searchParams.get('business_id')

  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  // Search & filters (apply to the Inventory column)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all') // all, active, inactive
  const [listedFilter, setListedFilter] = useState('all') // all, listed, unlisted

  // Bulk selection (Inventory column only)
  const [selectedIds, setSelectedIds] = useState([])
  const [bulkQty, setBulkQty] = useState('')

  // Edit / Add modal
  const [editingProduct, setEditingProduct] = useState(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)

  // Which column shows below the 880px breakpoint
  const [mobileView, setMobileView] = useState('inventory')

  const showMessage = (text) => {
    setMessage(text)
    if (typeof window !== 'undefined') {
      window.clearTimeout(showMessage._t)
      showMessage._t = window.setTimeout(() => setMessage(''), 4000)
    }
  }

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

      // One-time migration from the old shop_products column, if inventory is empty
      if (!data || data.length === 0) {
        const { data: pageData, error: pageErr } = await supabase
          .from('business_public_pages')
          .select('shop_products')
          .eq('business_id', businessId)
          .maybeSingle()

        if (!pageErr && pageData?.shop_products?.length) {
          const legacyProducts = pageData.shop_products.map((p) => ({
            business_id: businessId,
            name: p.name || 'Untitled',
            price: p.price || '0',
            description: p.description || '',
            image_url: p.image_url || '',
            featured: p.featured || false,
            active: true,
            on_website: true, // these were already showing on the live site
            stock: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }))
          const { error: insertErr } = await supabase.from('business_products').insert(legacyProducts)
          if (insertErr) throw insertErr
          const { data: newData } = await supabase.from('business_products').select('*').eq('business_id', businessId)
          data = newData
          showMessage('✅ Migrated ' + legacyProducts.length + ' products from your website')
        }
      }

      setProducts(data || [])
    } catch (err) {
      showMessage('❌ Error loading products: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProducts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId])

  // ---------- Derived lists ----------

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (statusFilter === 'active' && !p.active) return false
      if (statusFilter === 'inactive' && p.active) return false
      if (listedFilter === 'listed' && !p.on_website) return false
      if (listedFilter === 'unlisted' && p.on_website) return false
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        return (
          p.name?.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q) ||
          String(p.price ?? '').toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [products, searchQuery, statusFilter, listedFilter])

  const websiteProducts = useMemo(() => {
    return products.filter((p) => {
      if (!p.on_website) return false
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        return p.name?.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q)
      }
      return true
    })
  }, [products, searchQuery])

  // ---------- Selection ----------

  const toggleSelect = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredProducts.length && filteredProducts.length > 0) {
      setSelectedIds([])
    } else {
      setSelectedIds(filteredProducts.map((p) => p.id))
    }
  }

  // ---------- Per-card actions ----------

  const updateStock = async (product, delta) => {
    const newStock = (product.stock || 0) + delta
    if (newStock < 0) return
    setProducts((prev) => prev.map((p) => (p.id === product.id ? { ...p, stock: newStock } : p)))
    const { error } = await supabase
      .from('business_products')
      .update({ stock: newStock, updated_at: new Date().toISOString() })
      .eq('id', product.id)
    if (error) {
      showMessage('❌ ' + error.message)
      fetchProducts()
    }
  }

  const toggleActive = async (product) => {
    const newActive = !product.active
    setProducts((prev) => prev.map((p) => (p.id === product.id ? { ...p, active: newActive } : p)))
    const { error } = await supabase
      .from('business_products')
      .update({ active: newActive, updated_at: new Date().toISOString() })
      .eq('id', product.id)
    if (error) {
      showMessage('❌ ' + error.message)
      fetchProducts()
    }
  }

  const toggleOnWebsite = async (product) => {
    const newValue = !product.on_website
    setProducts((prev) => prev.map((p) => (p.id === product.id ? { ...p, on_website: newValue } : p)))
    const { error } = await supabase
      .from('business_products')
      .update({ on_website: newValue, updated_at: new Date().toISOString() })
      .eq('id', product.id)
    if (error) {
      showMessage('❌ ' + error.message)
      fetchProducts()
    }
  }

  const toggleFeatured = async (product) => {
    const newFeatured = !product.featured
    if (newFeatured) {
      const featuredCount = products.filter((p) => p.featured).length
      if (featuredCount >= 4) {
        showMessage('You can only feature up to 4 products on your homepage.')
        return
      }
    }
    setProducts((prev) => prev.map((p) => (p.id === product.id ? { ...p, featured: newFeatured } : p)))
    const { error } = await supabase
      .from('business_products')
      .update({ featured: newFeatured, updated_at: new Date().toISOString() })
      .eq('id', product.id)
    if (error) {
      showMessage('❌ ' + error.message)
      fetchProducts()
    }
  }

  // ---------- Bulk actions ----------

  const applyBulkAddStock = async () => {
    if (selectedIds.length === 0 || bulkQty === '') return
    const qty = parseInt(bulkQty, 10)
    if (isNaN(qty) || qty === 0) return
    setSaving(true)
    try {
      const targets = products.filter((p) => selectedIds.includes(p.id))
      const updates = targets.map((p) => {
        const newStock = Math.max(0, (p.stock || 0) + qty)
        return supabase
          .from('business_products')
          .update({ stock: newStock, updated_at: new Date().toISOString() })
          .eq('id', p.id)
      })
      const results = await Promise.all(updates)
      const failed = results.find((r) => r.error)
      if (failed) throw failed.error
      showMessage(`✅ ${qty > 0 ? 'Added' : 'Removed'} ${Math.abs(qty)} to ${targets.length} product(s)`)
      setSelectedIds([])
      setBulkQty('')
      fetchProducts()
    } catch (err) {
      showMessage('❌ ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const applyBulkActive = async (active) => {
    if (selectedIds.length === 0) return
    setSaving(true)
    try {
      const { error } = await supabase
        .from('business_products')
        .update({ active, updated_at: new Date().toISOString() })
        .in('id', selectedIds)
      if (error) throw error
      showMessage(`✅ Marked as ${active ? 'active' : 'inactive'}`)
      setSelectedIds([])
      fetchProducts()
    } catch (err) {
      showMessage('❌ ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const applyBulkOnWebsite = async (onWebsite) => {
    if (selectedIds.length === 0) return
    setSaving(true)
    try {
      const { error } = await supabase
        .from('business_products')
        .update({ on_website: onWebsite, updated_at: new Date().toISOString() })
        .in('id', selectedIds)
      if (error) throw error
      showMessage(onWebsite ? '✅ Listed on website' : '✅ Removed from website')
      setSelectedIds([])
      fetchProducts()
    } catch (err) {
      showMessage('❌ ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const applyBulkDelete = async () => {
    if (selectedIds.length === 0) return
    if (!confirm(`Delete ${selectedIds.length} selected product(s)? This can't be undone.`)) return
    setSaving(true)
    try {
      const { error } = await supabase.from('business_products').delete().in('id', selectedIds)
      if (error) throw error
      showMessage('✅ Deleted product(s)')
      setSelectedIds([])
      fetchProducts()
    } catch (err) {
      showMessage('❌ ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  // ---------- Modal ----------

  const openEditModal = (product) => {
    setEditingProduct(product)
    setForm({
      name: product.name || '',
      price: product.price || '',
      description: product.description || '',
      image_url: product.image_url || '',
      stock: product.stock || 0,
      active: !!product.active,
      on_website: !!product.on_website,
      featured: !!product.featured,
    })
    setShowEditModal(true)
  }

  const openAddModal = () => {
    setEditingProduct(null)
    setForm(EMPTY_FORM)
    setShowEditModal(true)
  }

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
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
      const { data: urlData } = supabase.storage.from('business-assets').getPublicUrl(filePath)
      setForm((prev) => ({ ...prev, image_url: urlData.publicUrl }))
    } catch (err) {
      showMessage('❌ Upload failed: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const saveEditModal = async () => {
    if (!form.name.trim() || !String(form.price).trim()) {
      showMessage('Name and price are required.')
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
          on_website: form.on_website,
          featured: form.featured,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingProduct.id)
      if (error) throw error
      showMessage('✅ Product updated')
      setShowEditModal(false)
      fetchProducts()
    } catch (err) {
      showMessage('❌ ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleAddProduct = async () => {
    if (!form.name.trim() || !String(form.price).trim()) {
      showMessage('Name and price are required.')
      return
    }
    setSaving(true)
    try {
      const { error } = await supabase.from('business_products').insert({
        business_id: businessId,
        name: form.name,
        price: form.price,
        description: form.description,
        image_url: form.image_url,
        stock: form.stock,
        active: form.active,
        on_website: form.on_website,
        featured: form.featured,
      })
      if (error) throw error
      showMessage('✅ Product added')
      setShowEditModal(false)
      fetchProducts()
    } catch (err) {
      showMessage('❌ ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--cresoa-bg)' }}>
        <div className="cresoa-loading-spinner" />
      </div>
    )
  }

  const allSelected = selectedIds.length > 0 && selectedIds.length === filteredProducts.length

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Products</h1>
        <button onClick={openAddModal} className={styles.addButton}>+ Add product</button>
      </div>

      {message && (
        <div className={`${styles.message} ${message.startsWith('❌') ? styles.messageError : styles.messageSuccess}`}>
          {message}
        </div>
      )}

      {/* Search + filters — apply mainly to the Inventory column */}
      <div className={styles.toolbar}>
        <input
          type="text"
          placeholder="Search products..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={`${styles.input} ${styles.searchInput}`}
        />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={`${styles.input} ${styles.filterSelect}`}>
          <option value="all">All status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <select value={listedFilter} onChange={(e) => setListedFilter(e.target.value)} className={`${styles.input} ${styles.filterSelect}`}>
          <option value="all">All listings</option>
          <option value="listed">On website</option>
          <option value="unlisted">Not listed</option>
        </select>
      </div>

      {/* Mobile tabs — only visible below 880px */}
      <div className={styles.tabs}>
        <button
          onClick={() => setMobileView('inventory')}
          className={`${styles.tabButton} ${mobileView === 'inventory' ? styles.tabButtonActive : ''}`}
        >
          Inventory<span className={styles.tabCount}>({filteredProducts.length})</span>
        </button>
        <button
          onClick={() => setMobileView('website')}
          className={`${styles.tabButton} ${mobileView === 'website' ? styles.tabButtonActive : ''}`}
        >
          Website<span className={styles.tabCount}>({websiteProducts.length})</span>
        </button>
      </div>

      {/* Bulk action bar */}
      {selectedIds.length > 0 && (
        <div className={styles.bulkBar}>
          <strong>{selectedIds.length} selected</strong>
          <input
            type="number"
            placeholder="Qty to add"
            value={bulkQty}
            onChange={(e) => setBulkQty(e.target.value)}
            className={styles.bulkQtyInput}
          />
          <button onClick={applyBulkAddStock} disabled={saving} className={styles.smallButton}>Add to stock</button>
          <button onClick={() => applyBulkActive(true)} disabled={saving} className={styles.smallButton}>Set active</button>
          <button onClick={() => applyBulkActive(false)} disabled={saving} className={styles.smallButton}>Set inactive</button>
          <button onClick={() => applyBulkOnWebsite(true)} disabled={saving} className={styles.smallButton}>List on website</button>
          <button onClick={() => applyBulkOnWebsite(false)} disabled={saving} className={styles.smallButton}>Unlist</button>
          <button onClick={applyBulkDelete} disabled={saving} className={`${styles.smallButton} ${styles.smallButtonDanger}`}>Delete</button>
          <button onClick={() => setSelectedIds([])} className={`${styles.smallButton} ${styles.smallButtonGhost}`}>Clear</button>
        </div>
      )}

      <div className={styles.layout}>
        {/* ---------------- Inventory column ---------------- */}
        <div className={`${styles.column} ${mobileView !== 'inventory' ? styles.columnHiddenMobile : ''}`}>
          <div className={styles.columnHeader}>
            <h3 className={styles.columnTitle}>Inventory</h3>
            <span className={styles.columnSubtitle}>{filteredProducts.length} product{filteredProducts.length === 1 ? '' : 's'}</span>
          </div>

          {filteredProducts.length > 0 && (
            <label className={styles.selectAllRow}>
              <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} />
              Select all
            </label>
          )}

          {filteredProducts.length === 0 ? (
            <div className={styles.emptyState}>
              No products match these filters yet.<br />Add a product to start building your inventory.
            </div>
          ) : (
            <div className={styles.cardList}>
              {filteredProducts.map((product) => (
                <div key={product.id} className={styles.card}>
                  <div className={styles.cardTop}>
                    <input
                      type="checkbox"
                      className={styles.cardCheckbox}
                      checked={selectedIds.includes(product.id)}
                      onChange={() => toggleSelect(product.id)}
                    />
                    {product.image_url ? (
                      <img src={product.image_url} alt={product.name} className={styles.cardThumb} />
                    ) : (
                      <div className={styles.cardThumbPlaceholder}>No image</div>
                    )}
                    <div className={styles.cardBody}>
                      <div className={styles.badgeRow}>
                        <span className={`${styles.badge} ${product.active ? styles.badgeActive : styles.badgeInactive}`}>
                          {product.active ? 'Active' : 'Inactive'}
                        </span>
                        {product.on_website && <span className={`${styles.badge} ${styles.badgeFeatured}`}>On website</span>}
                      </div>
                      <h4 className={styles.cardName}>{product.name}</h4>
                      <p className={styles.cardPrice}>₦{product.price}</p>

                      <div className={styles.stepperRow}>
                        <span className={styles.stepperLabel}>Stock:</span>
                        <button
                          onClick={() => updateStock(product, -1)}
                          disabled={(product.stock || 0) <= 0}
                          className={styles.stepButton}
                          aria-label="Decrease stock"
                        >−</button>
                        <span className={styles.stepValue}>{product.stock || 0}</span>
                        <button onClick={() => updateStock(product, 1)} className={styles.stepButton} aria-label="Increase stock">+</button>
                      </div>

                    <div className={styles.cardActions}>
                        <button onClick={() => openEditModal(product)} className={styles.smallButton}>Edit</button>
                        <button onClick={() => toggleActive(product)} className={styles.smallButton}>
                          {product.active ? 'Mark inactive' : 'Mark active'}
                        </button>
                        <label className={styles.checkboxLabel}>
                          <input
                            type="checkbox"
                            checked={!!product.on_website}
                            onChange={() => toggleOnWebsite(product)}
                          />
                          List on website
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ---------------- Website products column ---------------- */}
        <div className={`${styles.column} ${mobileView !== 'website' ? styles.columnHiddenMobile : ''}`}>
          <div className={styles.columnHeader}>
            <h3 className={styles.columnTitle}>Website</h3>
            <span className={styles.columnSubtitle}>{websiteProducts.length} listed</span>
          </div>

          {websiteProducts.length === 0 ? (
            <div className={styles.emptyState}>
              Nothing listed yet.<br />Check "List on website" on a product in Inventory to show it here.
            </div>
          ) : (
            <div className={styles.cardList}>
              {websiteProducts.map((product) => (
                <div key={product.id} className={styles.card}>
                  <div className={styles.cardTop}>
                    {product.image_url ? (
                      <img src={product.image_url} alt={product.name} className={styles.cardThumb} />
                    ) : (
                      <div className={styles.cardThumbPlaceholder}>No image</div>
                    )}
                    <div className={styles.cardBody}>
                      <div className={styles.badgeRow}>
                        {(product.stock || 0) <= 0 && <span className={`${styles.badge} ${styles.badgeOutOfStock}`}>Out of stock</span>}
                        {product.featured && <span className={`${styles.badge} ${styles.badgeFeatured}`}>Featured</span>}
                      </div>
                      <h4 className={styles.cardName}>{product.name}</h4>
                      <p className={styles.cardPrice}>₦{product.price}</p>
                      {product.description && <p className={styles.cardDescription}>{product.description}</p>}

                      <div className={styles.cardActions}>
                        <button onClick={() => openEditModal(product)} className={styles.smallButton}>Edit</button>
                        <label className={styles.checkboxLabel}>
                          <input type="checkbox" checked={!!product.featured} onChange={() => toggleFeatured(product)} />
                          Featured
                        </label>
                        <button onClick={() => toggleOnWebsite(product)} className={`${styles.smallButton} ${styles.smallButtonGhost}`}>
                          Remove from website
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ---------------- Add / Edit modal ---------------- */}
      {showEditModal && (
        <div className={styles.modalOverlay} onClick={() => setShowEditModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>{editingProduct ? 'Edit product' : 'Add new product'}</h3>

            <div className={styles.modalGrid}>
              <div>
                <label className={styles.label}>Name *</label>
                <input type="text" name="name" value={form.name} onChange={handleFormChange} className={styles.input} />
              </div>
              <div>
                <label className={styles.label}>Price (₦) *</label>
                <input type="text" name="price" value={form.price} onChange={handleFormChange} className={styles.input} />
              </div>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Description</label>
              <textarea name="description" value={form.description} onChange={handleFormChange} rows={3} className={styles.input} style={{ resize: 'vertical' }} />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Image</label>
              <input type="file" accept="image/*" onChange={handleEditImageUpload} />
              {form.image_url && <img src={form.image_url} alt="Product" className={styles.thumbPreview} />}
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Stock</label>
              <input
                type="number"
                name="stock"
                value={form.stock}
                onChange={handleFormChange}
                className={styles.input}
                style={{ maxWidth: '110px' }}
              />
            </div>

            <div className={styles.toggleGroup}>
              <label className={styles.checkboxLabel}>
                <input type="checkbox" name="active" checked={form.active} onChange={handleFormChange} /> Active
              </label>
              <label className={styles.checkboxLabel}>
                <input type="checkbox" name="on_website" checked={form.on_website} onChange={handleFormChange} /> List on website
              </label>
              <label className={styles.checkboxLabel}>
                <input type="checkbox" name="featured" checked={form.featured} onChange={handleFormChange} /> Featured
              </label>
            </div>

            <div className={styles.modalActions}>
              {editingProduct ? (
                <button onClick={saveEditModal} disabled={saving} className={styles.primaryButton}>{saving ? 'Saving…' : 'Save'}</button>
              ) : (
                <button onClick={handleAddProduct} disabled={saving} className={styles.primaryButton}>{saving ? 'Adding…' : 'Add'}</button>
              )}
              <button onClick={() => setShowEditModal(false)} className={styles.secondaryButton}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
                              }
