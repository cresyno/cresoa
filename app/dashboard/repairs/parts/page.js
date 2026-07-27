'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabaseClient'
import { showToast } from '../../../lib/toast'

export default function PartsPage() {
  const router = useRouter()
  const [parts, setParts] = useState([])
  const [loading, setLoading] = useState(true)
  const [businessId, setBusinessId] = useState(null)

  const [showModal, setShowModal] = useState(false)
  const [partName, setPartName] = useState('')
  const [partQuantity, setPartQuantity] = useState('')
  const [partCost, setPartCost] = useState('')
  const [partSupplier, setPartSupplier] = useState('')
  const [saving, setSaving] = useState(false)

  const loadParts = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    const { data: business } = await supabase
      .from('businesses')
      .select('id')
      .eq('owner_id', user.id)
      .single()

    if (!business) {
      router.push('/onboarding')
      return
    }

    setBusinessId(business.id)

    const { data: partData } = await supabase
      .from('parts_inventory')
      .select('*')
      .eq('business_id', business.id)
      .order('name', { ascending: true })

    setParts(partData || [])
    setLoading(false)
  }

  useEffect(() => {
    loadParts()
  }, [])

  const handleAddPart = async (e) => {
    e.preventDefault()
    setSaving(true)

    if (!partName.trim() || !partQuantity || !partCost) {
      showToast('Please fill in name, quantity, and cost.', '#AE4A34')
      setSaving(false)
      return
    }

    const { error } = await supabase
      .from('parts_inventory')
      .insert({
        business_id: businessId,
        name: partName.trim(),
        quantity: Number(partQuantity) || 0,
        cost: Number(partCost) || 0,
        supplier: partSupplier.trim() || null,
      })

    if (error) {
      showToast('Error: ' + error.message, '#AE4A34')
      setSaving(false)
      return
    }

    showToast('✅ Part added!', '#4C7A5E')
    setPartName('')
    setPartQuantity('')
    setPartCost('')
    setPartSupplier('')
    setShowModal(false)
    setSaving(false)
    loadParts()
  }

  const deletePart = async (id) => {
    const confirmed = window.confirm('Delete this part?')
    if (!confirmed) return

    await supabase.from('parts_inventory').delete().eq('id', id)
    loadParts()
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#F5EFE2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
          .spinner {
            width: 40px; height: 40px;
            border: 4px solid #e4d8c2;
            border-top: 4px solid #1E3A5F;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
          }
        `}</style>
        <div className="spinner"></div>
      </div>
    )
  }

  return (
    <main style={{ minHeight: '100vh', background: '#F5EFE2', padding: '1.5rem 1.2rem' }}>
      <style>{`
        .header-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-bottom: 1.2rem;
        }
        .header-row h1 {
          color: #1E3A5F;
          font-size: 1.3rem;
          font-weight: 700;
          margin: 0;
        }
        .part-card {
          background: #fff;
          border-radius: 10px;
          padding: 0.7rem 0.9rem;
          border: 1px solid #E8E0D5;
          margin-bottom: 0.5rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 0.4rem;
        }
        .part-card .name {
          font-weight: 600;
          color: #1E3A5F;
          font-size: 0.9rem;
          margin: 0;
        }
        .part-card .details {
          color: #6B6255;
          font-size: 0.75rem;
          margin: 0.1rem 0 0;
        }
        .part-card .actions {
          display: flex;
          gap: 0.4rem;
          align-items: center;
        }
        .part-card .actions .qty {
          font-weight: 700;
          color: #1E3A5F;
          font-size: 0.9rem;
        }
        .part-card .actions .cost {
          font-weight: 600;
          color: #AE4A34;
          font-size: 0.8rem;
          margin-right: 0.5rem;
        }
        .btn {
          padding: 0.4rem 0.8rem;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 600;
          border: 1px solid #E8E0D5;
          background: #fff;
          color: #1E3A5F;
          cursor: pointer;
          transition: background 0.1s ease;
          text-decoration: none;
        }
        .btn:hover { background: #F5EFE2; }
        .btn-primary {
          background: #1E3A5F;
          border-color: #1E3A5F;
          color: #fff;
        }
        .btn-primary:hover { background: #0F1E30; }
        .btn-danger {
          background: #fff;
          border-color: #AE4A34;
          color: #AE4A34;
        }
        .btn-danger:hover { background: #F1DBD3; }
        .btn-gold {
          background: #C79A2B;
          border-color: #C79A2B;
          color: #1E3A5F;
        }
        .btn-gold:hover { background: #B4881E; }

        .empty-state {
          background: #fff;
          border-radius: 10px;
          padding: 1.5rem;
          border: 1px solid #E8E0D5;
          text-align: center;
          color: #6B6255;
          font-size: 0.9rem;
        }
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.4);
          backdrop-filter: blur(4px);
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1.5rem;
        }
        .modal-content {
          background: #F5EFE2;
          border-radius: 16px;
          padding: 1.5rem;
          max-width: 400px;
          width: 100%;
        }
        .modal-content .form-group { margin-bottom: 0.8rem; }
        .modal-content label {
          display: block;
          color: #2B2620;
          margin-bottom: 0.2rem;
          font-size: 0.8rem;
          font-weight: 500;
        }
        .modal-content input {
          width: 100%;
          padding: 0.6rem;
          border-radius: 6px;
          border: 1px solid #E8E0D5;
          font-size: 0.9rem;
          box-sizing: border-box;
        }
        .modal-content input:focus { outline: none; border-color: #C79A2B; }
        .modal-actions {
          display: flex;
          gap: 0.5rem;
          margin-top: 0.8rem;
        }
        .modal-actions .btn { flex: 1; justify-content: center; }
      `}</style>

      <div className="header-row">
        <h1>📦 Parts Inventory</h1>
        <button className="btn btn-gold" onClick={() => setShowModal(true)}>+ Add Part</button>
      </div>

      {parts.length === 0 ? (
        <div className="empty-state">
          <p>No parts in inventory yet.</p>
          <button className="btn btn-gold" style={{ marginTop: '0.5rem' }} onClick={() => setShowModal(true)}>
            Add your first part
          </button>
        </div>
      ) : (
        parts.map((p) => (
          <div key={p.id} className="part-card">
            <div>
              <p className="name">{p.name}</p>
              <p className="details">
                {p.supplier && `Supplier: ${p.supplier} · `}
                Added: {new Date(p.created_at).toLocaleDateString('en-GB')}
              </p>
            </div>
            <div className="actions">
              <span className="qty">{p.quantity} in stock</span>
              <span className="cost">₦{p.cost.toLocaleString()}</span>
              <button className="btn btn-danger" onClick={() => deletePart(p.id)}>🗑️</button>
            </div>
          </div>
        ))
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ color: '#1E3A5F', fontSize: '1.1rem', margin: '0 0 0.5rem' }}>Add Part</h2>
            <form onSubmit={handleAddPart}>
              <div className="form-group">
                <label>Part name *</label>
                <input
                  type="text"
                  value={partName}
                  onChange={(e) => setPartName(e.target.value)}
                  required
                  placeholder="e.g. Screen Replacement"
                />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Quantity *</label>
                  <input
                    type="number"
                    value={partQuantity}
                    onChange={(e) => setPartQuantity(e.target.value)}
                    required
                    placeholder="0"
                  />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Cost (₦) *</label>
                  <input
                    type="number"
                    value={partCost}
                    onChange={(e) => setPartCost(e.target.value)}
                    required
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Supplier</label>
                <input
                  type="text"
                  value={partSupplier}
                  onChange={(e) => setPartSupplier(e.target.value)}
                  placeholder="e.g. Gadget Supplies Ltd"
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : 'Add Part'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  )
            }
