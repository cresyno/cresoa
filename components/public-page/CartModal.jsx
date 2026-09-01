'use client'

export default function CartModal({ open, onClose, cartItems, onRemove, onCheckout }) {
  if (!open) return null

  const total = cartItems.reduce((sum, item) => {
    const price = parseFloat(item.price.replace(/[^\d.]/g, '')) || 0
    return sum + (price * item.quantity)
  }, 0)

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: '1rem' }}>
      <div style={{ background: '#fff', borderRadius: '16px', padding: '1.5rem', maxWidth: '400px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
        <h3 style={{ margin: '0 0 1rem' }}>Your Cart</h3>
        {cartItems.length === 0 ? (
          <p style={{ color: '#6B7280' }}>Your cart is empty.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            {cartItems.map((item) => (
              <div key={item.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong>{item.name}</strong>
                  <div style={{ fontSize: '0.85rem', color: '#6B7280' }}>x{item.quantity}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>{item.price}</span>
                  <button onClick={() => onRemove(item.name)} style={{ background: 'none', border: 'none', color: 'red', cursor: 'pointer', fontWeight: 700 }}>×</button>
                </div>
              </div>
            ))}
          </div>
        )}
        {cartItems.length > 0 && (
          <div style={{ marginTop: '1rem', borderTop: '1px solid #E5E7EB', paddingTop: '1rem' }}>
            <strong>Total: ₦{total.toLocaleString()}</strong>
          </div>
        )}
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem' }}>
          <button onClick={onClose} style={{ flex: 1, padding: '0.7rem', borderRadius: '8px', border: '1px solid #E5E7EB', background: '#fff', cursor: 'pointer' }}>Close</button>
          <button onClick={onCheckout} disabled={cartItems.length === 0} style={{ flex: 1, padding: '0.7rem', borderRadius: '8px', border: 'none', background: '#25D366', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>Checkout via WhatsApp</button>
        </div>
      </div>
    </div>
  )
}
