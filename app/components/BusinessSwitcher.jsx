'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import JoinBusinessModal from './JoinBusinessModal';

export default function BusinessSwitcher({ currentBusinessId, onSwitch }) {
  const [memberships, setMemberships] = useState([]);
  const [ownedBusinesses, setOwnedBusinesses] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserBusinesses();
  }, []);

  const fetchUserBusinesses = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Fetch businesses the user owns directly
    const { data: ownedData, error: ownedError } = await supabase
      .from('businesses')
      .select('id, name, business_type')
      .eq('owner_id', user.id);

    if (!ownedError && ownedData) {
      setOwnedBusinesses(ownedData);
    }

    // Fetch businesses where user is staff (membership)
    const { data: memberData, error: memberError } = await supabase
      .from('memberships')
      .select(`
        role,
        businesses ( id, name, business_type )
      `)
      .eq('user_id', user.id);

    if (!memberError && memberData) {
      setMemberships(memberData);
    }
    setLoading(false);
  };

  // Find the currently active business name
  let activeName = 'Select Workspace';
  const activeOwned = ownedBusinesses.find(b => b.id === currentBusinessId);
  const activeStaff = memberships.find(m => m.businesses?.id === currentBusinessId);
  
  if (activeOwned) activeName = activeOwned.name;
  else if (activeStaff) activeName = activeStaff.businesses?.name;

  return (
    <div style={{ position: 'relative', width: '100%', marginBottom: '24px' }}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%', 
          padding: '12px 16px', 
          textAlign: 'left',
          background: 'var(--color-bg)', 
          border: '1px solid var(--color-border)',
          borderRadius: '8px', 
          cursor: 'pointer', 
          display: 'flex', 
          justifyContent: 'space-between',
          alignItems: 'center',
          color: 'var(--color-text)',
          transition: 'all 0.2s ease'
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden' }}>
          <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Current Workspace
          </span>
          <span style={{ fontWeight: '600', fontSize: '14px', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
            {loading ? 'Loading...' : activeName}
          </span>
        </div>
        <span style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>
          {isOpen ? '▲' : '▼'}
        </span>
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0,
          background: 'var(--color-card)', 
          border: '1px solid var(--color-border)',
          borderRadius: '8px', 
          marginTop: '8px', 
          zIndex: 100,
          boxShadow: 'var(--shadow-md, 0 4px 16px rgba(15,43,74,0.06))',
          maxHeight: '300px',
          overflowY: 'auto'
        }}>
          
          {/* Owned Businesses */}
          {ownedBusinesses.length > 0 && (
            <div style={{ padding: '8px 0' }}>
              <div style={{ padding: '4px 16px', fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                Your Businesses
              </div>
              {ownedBusinesses.map((biz) => (
                <div 
                  key={biz.id}
                  onClick={() => {
                    onSwitch(biz.id);
                    setIsOpen(false);
                  }}
                  style={{
                    padding: '10px 16px', 
                    cursor: 'pointer',
                    display: 'flex', 
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: currentBusinessId === biz.id ? 'var(--color-bg)' : 'transparent'
                  }}
                >
                  <span style={{ fontSize: '14px', color: 'var(--color-text)', fontWeight: currentBusinessId === biz.id ? '600' : '400' }}>
                    {biz.name}
                  </span>
                  <span style={{ fontSize: '11px', background: 'var(--color-primary)', color: '#fff', padding: '2px 6px', borderRadius: '4px' }}>
                    Owner
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Staff Memberships */}
          {memberships.length > 0 && (
            <div style={{ padding: '8px 0', borderTop: '1px solid var(--color-border)' }}>
              <div style={{ padding: '4px 16px', fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                Joined as Staff
              </div>
              {memberships.map((membership) => (
                <div 
                  key={membership.businesses.id}
                  onClick={() => {
                    onSwitch(membership.businesses.id);
                    setIsOpen(false);
                  }}
                  style={{
                    padding: '10px 16px', 
                    cursor: 'pointer',
                    display: 'flex', 
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: currentBusinessId === membership.businesses.id ? 'var(--color-bg)' : 'transparent'
                  }}
                >
                  <span style={{ fontSize: '14px', color: 'var(--color-text)', fontWeight: currentBusinessId === membership.businesses.id ? '600' : '400' }}>
                    {membership.businesses.name}
                  </span>
                  <span style={{ fontSize: '11px', border: '1px solid var(--color-border)', color: 'var(--color-text-muted)', padding: '2px 6px', borderRadius: '4px' }}>
                    {membership.role}
                  </span>
                </div>
              ))}
            </div>
          )}
          
          <div 
            onClick={() => {
              setIsOpen(false);
              setIsJoinModalOpen(true);
            }}
            style={{
              padding: '12px 16px', 
              cursor: 'pointer', 
              color: 'var(--color-accent)',
              fontSize: '14px', 
              fontWeight: '500',
              borderTop: '1px solid var(--color-border)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <span>+</span> Join another business
          </div>
        </div>
      )}

      <JoinBusinessModal 
        isOpen={isJoinModalOpen} 
        onClose={() => setIsJoinModalOpen(false)}
        onSuccess={(newBusinessId) => {
          fetchUserBusinesses();
          if (onSwitch) onSwitch(newBusinessId);
        }}
      />
    </div>
  );
                 }
