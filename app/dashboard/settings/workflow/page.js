'use client'

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card } from '../../../../components/Card';
import { Navigation } from '../../../../components/Navigation';

// ─── Self-contained SVG Icons (No external imports) ───
const Svg = ({ name, size = 20, stroke = 'currentColor' }) => {
  const icons = {
    back: <><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></>,
    chevronUp: <polyline points="18 15 12 9 6 15" />,
    chevronDown: <polyline points="6 9 12 15 18 9" />,
    check: <polyline points="20 6 9 17 4 12" />,
    layers: <><polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" /></>,
    plus: <><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></>,
    trash: <><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{icons[name]}</svg>;
};

// ─── Gold / White Button Styles (Hardcoded to avoid CSS issues) ───
const goldBtn = {
  background: '#D4A52A',
  color: '#fff',
  border: 'none',
  padding: '0.6rem 1.2rem',
  borderRadius: '8px',
  fontWeight: 700,
  cursor: 'pointer',
  fontSize: '0.9rem',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '0.4rem',
  boxShadow: '0 2px 8px rgba(212,165,42,0.3)',
};

const whiteBtn = {
  background: '#fff',
  color: '#0F2B4A',
  border: '1px solid #E5E0D8',
  padding: '0.6rem 1.2rem',
  borderRadius: '8px',
  fontWeight: 600,
  cursor: 'pointer',
  fontSize: '0.9rem',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '0.4rem',
};

export default function WorkflowSettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const businessId = searchParams.get('business_id');

  const navigateWithBusiness = (path) => {
    const separator = path.includes('?') ? '&' : '?';
    router.push(`${path}${separator}business_id=${businessId}`);
  };

  const [stages, setStages] = useState([]);
  const [originalStages, setOriginalStages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // ─── Fetch current stages ───
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

        // If empty, use intelligent defaults based on industry
        if (fetchedStages.length === 0) {
          fetchedStages = ['Order Placed', 'Cutting', 'Sewing', 'Ready for Pickup', 'Delivered'];
        }

        setStages(fetchedStages);
        setOriginalStages(fetchedStages);
      } catch (e) {
        console.error('Fetch error:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchStages();
  }, [businessId]);

  // ─── Handlers ───
  const handleMoveUp = (index) => {
    if (index === 0) return;
    const newStages = [...stages];
    [newStages[index], newStages[index - 1]] = [newStages[index - 1], newStages[index]];
    setStages(newStages);
  };

  const handleMoveDown = (index) => {
    if (index === stages.length - 1) return;
    const newStages = [...stages];
    [newStages[index], newStages[index + 1]] = [newStages[index + 1], newStages[index]];
    setStages(newStages);
  };

  const handleAddStage = () => {
    setStages([...stages, '']);
  };

  const handleDeleteStage = (index) => {
    if (stages.length <= 2) {
      alert('You need at least 2 stages.');
      return;
    }
    const newStages = stages.filter((_, i) => i !== index);
    setStages(newStages);
  };

  const handleSave = async () => {
    const filledStages = stages.map(s => s.trim()).filter(Boolean);
    if (filledStages.length < 2) {
      alert('Please provide at least 2 stages.');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/settings/workflow', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_id: businessId,
          stages: filledStages,
          // This flag tells the API to update existing orders that have old stage names
          update_orders: true,
        })
      });

      if (res.ok) {
        alert('Workflow updated successfully! All existing orders have been updated.');
        setIsEditing(false);
        // Refresh the view
        const updatedRes = await fetch(`/api/settings/workflow?business_id=${businessId}`);
        const data = await updatedRes.json();
        if (data.stages && data.stages.length > 0) {
          setStages(data.stages.map(s => s.stage_name));
          setOriginalStages(data.stages.map(s => s.stage_name));
        }
} else {
  const errorData = await res.json();
  alert('Save failed: ' + (errorData.error || 'Unknown error'));
      }
    } catch (e) {
      alert('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (confirm('Reset to the default stages for your industry?')) {
      setStages(['Order Placed', 'Cutting', 'Sewing', 'Ready for Pickup', 'Delivered']);
    }
  };

  const handleCancelEdit = () => {
    setStages(originalStages);
    setIsEditing(false);
  };

  if (loading) {
    return (
      <div style={{ padding: '1.5rem', maxWidth: '800px', margin: '0 auto' }}>
        <Navigation businessId={businessId} />
        <p style={{ color: '#8A8A8A' }}>Loading workflow...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '1.5rem', maxWidth: '800px', margin: '0 auto', paddingBottom: '100px', background: '#F8F6F2', minHeight: '100vh' }}>
      <Navigation businessId={businessId} />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <button onClick={() => navigateWithBusiness('/dashboard/settings')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0F2B4A', fontSize: '1.2rem' }}>
          <Svg name="back" size={20} stroke="#0F2B4A" />
        </button>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: '#1A1A1A' }}>Production Workflow</h1>
          <p style={{ color: '#8A8A8A', margin: '0.2rem 0 0', fontSize: '0.85rem' }}>Customize the stages your orders go through.</p>
        </div>
      </div>

      {/* Card */}
      <Card style={{ padding: '1.5rem', background: '#fff', border: '1px solid #E5E0D8', borderRadius: '12px' }}>
        {/* ─── VIEW MODE ─── */}
        {!isEditing ? (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: '#1A1A1A' }}>
                <Svg name="layers" size={18} stroke="#D4A52A" style={{ verticalAlign: 'middle', marginRight: '0.4rem' }} /> Current Pipeline
              </h3>
              <button onClick={() => setIsEditing(true)} style={goldBtn}>Edit Stages</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {stages.map((stage, index) => (
                <div key={index} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.75rem 1rem',
                  background: '#FBF3E0',
                  borderLeft: '4px solid #D4A52A',
                  borderRadius: '8px',
                }}>
                  <span style={{ fontWeight: 700, color: '#D4A52A', minWidth: '24px' }}>{index + 1}.</span>
                  <span style={{ color: stage ? '#1A1A1A' : '#8A8A8A', fontStyle: stage ? 'normal' : 'italic' }}>
                    {stage || 'Not set'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* ─── EDIT MODE ─── */
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: '#1A1A1A' }}>
                <Svg name="layers" size={18} stroke="#D4A52A" style={{ verticalAlign: 'middle', marginRight: '0.4rem' }} /> Edit Stages
              </h3>
              <button onClick={handleCancelEdit} style={whiteBtn}>Cancel</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1rem' }}>
              {stages.map((stage, index) => (
                <div key={index} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  background: '#F8F6F2',
                  padding: '0.5rem',
                  borderRadius: '8px',
                  border: '1px solid #E5E0D8',
                }}>
                  <span style={{ fontWeight: 600, color: '#8A8A8A', width: '20px', textAlign: 'center', fontSize: '0.85rem' }}>{index + 1}.</span>
                  <input
                    type="text"
                    value={stage}
                    onChange={(e) => {
                      const newStages = [...stages];
                      newStages[index] = e.target.value;
                      setStages(newStages);
                    }}
                    placeholder={`Stage ${index + 1}`}
                    style={{
                      flex: 1,
                      padding: '0.5rem',
                      borderRadius: '6px',
                      border: '1px solid #E5E0D8',
                      background: '#fff',
                      color: '#1A1A1A',
                      fontSize: '0.9rem',
                    }}
                  />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
                    <button onClick={() => handleMoveUp(index)} disabled={index === 0} style={{ background: 'none', border: 'none', cursor: 'pointer', color: index === 0 ? '#ddd' : '#0F2B4A' }}>
                      <Svg name="chevronUp" size={14} stroke="currentColor" />
                    </button>
                    <button onClick={() => handleMoveDown(index)} disabled={index === stages.length - 1} style={{ background: 'none', border: 'none', cursor: 'pointer', color: index === stages.length - 1 ? '#ddd' : '#0F2B4A' }}>
                      <Svg name="chevronDown" size={14} stroke="currentColor" />
                    </button>
                  </div>
                  <button onClick={() => handleDeleteStage(index)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#D9534F' }}>
                    <Svg name="trash" size={16} stroke="currentColor" />
                  </button>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <button onClick={handleAddStage} style={{ ...whiteBtn, border: '1px dashed #D4A52A', color: '#D4A52A', background: 'transparent', width: '100%' }}>
                <Svg name="plus" size={16} stroke="#D4A52A" /> Add New Stage
              </button>
              <button onClick={handleReset} style={{ ...whiteBtn, color: '#8A8A8A', background: 'transparent', width: '100%' }}>
                Reset to Default
              </button>
            </div>

            {/* Sticky Save Bar */}
            <div style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              background: '#0F2B4A',
              padding: '0.75rem 1.5rem calc(0.75rem + env(safe-area-inset-bottom))',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '0.75rem',
              zIndex: 1000,
              boxShadow: '0 -4px 12px rgba(0,0,0,0.15)',
            }}>
              <button onClick={handleCancelEdit} style={whiteBtn}>Cancel</button>
              <button onClick={handleSave} disabled={saving} style={{ ...goldBtn, opacity: saving ? 0.7 : 1 }}>
                <Svg name="check" size={16} stroke="#fff" /> {saving ? 'Saving...' : 'Save Workflow'}
              </button>
            </div>
          </div>
        )}
      </Card>

      <div style={{ marginTop: '2rem' }}>
        <Navigation businessId={businessId} />
      </div>
    </div>
  );
      }
