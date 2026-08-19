'use client'

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card } from '../../../../components/Card';
import { Icon } from '../../../../components/Icon';
import { Navigation } from '../../../../components/Navigation';

export default function WorkflowSettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const businessId = searchParams.get('business_id');

  const navigateWithBusiness = (path) => {
    const separator = path.includes('?') ? '&' : '?';
    router.push(`${path}${separator}business_id=${businessId}`);
  };

  const [stages, setStages] = useState(['', '', '', '', '']);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchStages = async () => {
      if (!businessId) return;
      setLoading(true);
      try {
        const res = await fetch(`/api/settings/workflow?business_id=${businessId}`);
        const data = await res.json();
        if (data.stages && data.stages.length > 0) {
          const filledStages = data.stages.map(s => s.stage_name);
          while (filledStages.length < 5) filledStages.push('');
          setStages(filledStages.slice(0, 5));
        }
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    fetchStages();
  }, [businessId]);

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
    <div style={{ padding: '1.5rem', maxWidth: '800px', margin: '0 auto', paddingBottom: '80px', background: 'var(--cresoa-bg)' }}>
      <Navigation businessId={businessId} />

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <button onClick={() => navigateWithBusiness('/dashboard/settings')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cresoa-text)', fontSize: '1.2rem' }}>‹</button>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: 'var(--cresoa-text)' }}>Production Workflow</h1>
      </div>

      <p style={{ color: 'var(--cresoa-text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
        Define the 5 stages your orders go through. This will update the Production page for your industry.
      </p>

      <Card style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {loading ? (
            <p style={{ color: 'var(--cresoa-text-muted)' }}>Loading stages...</p>
          ) : (
            stages.map((stage, index) => (
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
                  placeholder={`Stage ${index + 1} (e.g. "Cutting")`}
                  style={{ flex: 1, padding: '0.5rem 0.8rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'var(--cresoa-surface)', color: 'var(--cresoa-text)', fontSize: '0.95rem' }}
                />
              </div>
            ))
          )}
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
          <button onClick={() => navigateWithBusiness('/dashboard/settings')} style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid var(--cresoa-border)', background: 'transparent', color: 'var(--cresoa-text)', cursor: 'pointer' }}>Cancel</button>
          <button onClick={handleSave} disabled={saving} style={{ padding: '0.5rem 1.5rem', borderRadius: '8px', border: 'none', background: 'var(--cresoa-primary)', color: '#fff', fontWeight: 600, cursor: 'pointer', opacity: saving ? '0.7' : '1' }}>
            {saving ? 'Saving...' : 'Save Workflow'}
          </button>
        </div>
      </Card>

      <div style={{ marginTop: '2rem' }}>
        <Navigation businessId={businessId} />
      </div>
    </div>
  );
    }
