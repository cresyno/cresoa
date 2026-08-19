'use client'

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card } from '../../../../components/Card';
import { Navigation } from '../../../../components/Navigation';

// ─── Hardcoded Icons (self-contained) ──────────────────────
const Icon = ({ name, size = 20, stroke = 'currentColor', className = '' }) => {
  const props = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke, strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', className }
  const icons = {
    'chevron-up': <svg {...props}><polyline points="18 15 12 9 6 15"/></svg>,
    'chevron-down': <svg {...props}><polyline points="6 9 12 15 18 9"/></svg>,
    'check': <svg {...props}><polyline points="20 6 9 17 4 12"/></svg>,
    'layers': <svg {...props}><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>,
    'plus': <svg {...props}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  }
  return icons[name] || <span />
}

export default function WorkflowSettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const businessId = searchParams.get('business_id');

  const navigateWithBusiness = (path) => {
    const separator = path.includes('?') ? '&' : '?';
    router.push(`${path}${separator}business_id=${businessId}`);
  };

  const [stages, setStages] = useState(['']);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // ─── Fetch current stages on load ────────────────────────
  useEffect(() => {
    const fetchStages = async () => {
      if (!businessId) return;
      setLoading(true);
      try {
        const res = await fetch(`/api/settings/workflow?business_id=${businessId}`);
        const data = await res.json();
        
        let fetchedStages = [];
        if (data.stages && data.stages.length > 0) {
          fetchedStages = data.stages.map(s => s.stage_name);
        }

        // If the database is totally empty, give them intelligent defaults
        if (fetchedStages.length === 0) {
          fetchedStages = ['Order Placed', 'Cutting', 'Sewing', 'Ready for Pickup', 'Delivered'];
        }

        setStages(fetchedStages);
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    fetchStages();
  }, [businessId]);

  // ─── Handlers ─────────────────────────────────────────────
  const handleMoveUp = (index) => {
    if (index === 0 || !isEditing) return;
    const newStages = [...stages];
    [newStages[index], newStages[index - 1]] = [newStages[index - 1], newStages[index]];
    setStages(newStages);
  };

  const handleMoveDown = (index) => {
    if (index === stages.length - 1 || !isEditing) return;
    const newStages = [...stages];
    [newStages[index], newStages[index + 1]] = [newStages[index + 1], newStages[index]];
    setStages(newStages);
  };

  const handleAddStage = () => {
    if (!isEditing) return;
    setStages([...stages, '']);
  };

  const handleSave = async () => {
    const filledStages = stages.filter(s => s.trim() !== '');
    if (filledStages.length < 2) {
      alert('Please provide at least 2 stages for your workflow.');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/settings/workflow', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ business_id: businessId, stages: filledStages })
      });
      if (res.ok) {
        setIsEditing(false);
        // Immediately refresh the View Mode
        const updatedRes = await fetch(`/api/settings/workflow?business_id=${businessId}`);
        const data = await updatedRes.json();
        if (data.stages && data.stages.length > 0) {
          setStages(data.stages.map(s => s.stage_name));
        } else {
          setStages(['Order Placed', 'Cutting', 'Sewing', 'Ready for Pickup', 'Delivered']);
        }
        alert('Workflow stages updated successfully!');
      } else {
        alert('Failed to save workflow.');
      }
    } catch (e) {
      alert('Network error.');
    }
    setSaving(false);
  };

  return (
    <div style={{ padding: '1.5rem', maxWidth: '800px', margin: '0 auto', paddingBottom: '100px', background: 'var(--cresoa-bg)' }}>
      <Navigation businessId={businessId} />

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <button onClick={() => navigateWithBusiness('/dashboard/settings')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cresoa-text)', fontSize: '1.2rem' }}>‹</button>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: 'var(--cresoa-text)' }}>Production Workflow</h1>
      </div>

      <p style={{ color: 'var(--cresoa-text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
        Define the stages your orders go through. This will update the Production page for your industry.
      </p>

      {loading ? (
        <p style={{ color: 'var(--cresoa-text-muted)' }}>Loading stages...</p>
      ) : (
        <Card style={{ padding: '1.5rem' }}>
          
          {/* ─── VIEW MODE ────────────────────────────────────── */}
          {!isEditing ? (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: 'var(--cresoa-text)' }}>
                  <Icon name="layers" size={18} stroke="var(--cresoa-accent)" /> Current Pipeline
                </h3>
                <button 
                  onClick={() => setIsEditing(true)}
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--cresoa-border)',
                    padding: '0.3rem 1rem',
                    borderRadius: '6px',
                    color: 'var(--cresoa-text)',
                    fontSize: '0.8rem',
                    cursor: 'pointer'
                  }}
                >
                  ✏️ Edit
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {stages.map((stage, index) => (
                  <div key={index} style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '1rem', 
                    padding: '0.75rem 0', 
                    borderBottom: index < stages.length - 1 ? '1px solid var(--cresoa-border)' : 'none' 
                  }}>
                    <span style={{ fontWeight: 600, color: 'var(--cresoa-text-muted)', minWidth: '24px' }}>{index + 1}.</span>
                    <span style={{ color: stage ? 'var(--cresoa-text)' : 'var(--cresoa-text-muted)', fontStyle: stage ? 'normal' : 'italic' }}>
                      {stage || 'Not set'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* ─── EDIT MODE ────────────────────────────────────── */
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: 'var(--cresoa-text)' }}>
                  <Icon name="layers" size={18} stroke="var(--cresoa-accent)" /> Edit Pipeline
                </h3>
                <button 
                  onClick={() => setIsEditing(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cresoa-text-muted)', fontSize: '0.85rem' }}
                >
                  Cancel
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingBottom: '1rem' }}>
                {stages.map((stage, index) => (
                  <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', borderBottom: '1px solid var(--cresoa-border)', paddingBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                      <button onClick={() => handleMoveUp(index)} disabled={index === 0} style={{ background: 'none', border: '1px solid var(--cresoa-border)', borderRadius: '4px', cursor: 'pointer', padding: '0.1rem 0.3rem', color: index === 0 ? 'var(--cresoa-text-muted)' : 'var(--cresoa-text)' }}>
                        <Icon name="chevron-up" size={14} stroke="currentColor" />
                      </button>
                      <button onClick={() => handleMoveDown(index)} disabled={index === stages.length - 1} style={{ background: 'none', border: '1px solid var(--cresoa-border)', borderRadius: '4px', cursor: 'pointer', padding: '0.1rem 0.3rem', color: index === stages.length - 1 ? 'var(--cresoa-text-muted)' : 'var(--cresoa-text)' }}>
                        <Icon name="chevron-down" size={14} stroke="currentColor" />
                      </button>
                    </div>
                    <span style={{ fontWeight: 600, color: 'var(--cresoa-text-muted)', width: '2rem', fontSize: '0.8rem' }}>{index + 1}.</span>
                    <input 
                      type="text" 
                      value={stage} 
                      onChange={(e) => {
                        const newStages = [...stages];
                        newStages[index] = e.target.value;
                        setStages(newStages);
                      }}
                      placeholder={`Stage ${index + 1}`}
                      style={{ flex: 1, padding: '0.5rem 0.8rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-surface)', color: 'var(--cresoa-text)', fontSize: '0.95rem' }}
                    />
                  </div>
                ))}
              </div>

              {/* Add Stage Button */}
              <button 
                onClick={handleAddStage}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  borderRadius: '8px',
                  border: '1px dashed var(--cresoa-border)',
                  background: 'transparent',
                  color: 'var(--cresoa-text-muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  marginTop: '0.5rem'
                }}
              >
                <Icon name="plus" size={14} stroke="currentColor" /> Add New Stage
              </button>

            </div>
          )}

        </Card>
      )}

      {/* ─── STICKY SAVE BAR (Now properly elevated) ──────────── */}
      {isEditing && (
        <div style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          background: 'var(--cresoa-card)',
          borderTop: '1px solid var(--cresoa-border)',
          padding: '0.75rem 1.5rem calc(0.75rem + env(safe-area-inset-bottom))',
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          zIndex: 999, // 🛑 ELEVATED SO IT FLOATS OVER BOTTOM NAV
          boxShadow: '0 -4px 12px rgba(0,0,0,0.04)',
        }}>
          <button 
            onClick={handleSave} 
            disabled={saving} 
            style={{ 
              padding: '0.5rem 2rem', 
              borderRadius: '8px', 
              border: 'none', 
              background: 'var(--cresoa-primary)', 
              color: '#fff', 
              fontWeight: 600, 
              cursor: 'pointer', 
              fontSize: '0.9rem', 
              opacity: saving ? '0.7' : '1',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
          >
            <Icon name="check" size={14} stroke="#fff" /> {saving ? 'Saving...' : 'Save Workflow'}
          </button>
        </div>
      )}

      <div style={{ marginTop: '2rem' }}>
        <Navigation businessId={businessId} />
      </div>
    </div>
  );
}
