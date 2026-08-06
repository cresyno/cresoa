'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';

export default function StaffPage() {
  const router = useRouter();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [businessId, setBusinessId] = useState(null);
  const [userRole, setUserRole] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('Staff');
  const [inviting, setInviting] = useState(false);
  const [inviteMessage, setInviteMessage] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');

  useEffect(() => {
    const loadData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.push('/login');
          return;
        }

        const { data: { user } } = await supabase.auth.getUser();
        let bizId = null;
        let role = '';

        // Check if user owns a business
        const { data: owned } = await supabase
          .from('businesses')
          .select('id')
          .eq('owner_id', user.id)
          .single();

        if (owned) {
          bizId = owned.id;
          role = 'Owner';
        } else {
          // Check membership
          const { data: membership } = await supabase
            .from('business_memberships')
            .select('business_id, role')
            .eq('user_id', user.id)
            .single();

          if (membership) {
            bizId = membership.business_id;
            role = membership.role;
          }
        }

        if (!bizId) {
          router.push('/onboarding');
          return;
        }

        setBusinessId(bizId);
        setUserRole(role);

        // Fetch members
        const response = await fetch(`/api/team/members?business_id=${bizId}`, {
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        });
        const result = await response.json();
        if (response.ok) {
          setMembers(result.members || []);
        } else {
          setError(result.error || 'Failed to load members');
        }
      } catch (err) {
        setError('An unexpected error occurred');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [router]);

  const handleInvite = async (e) => {
    e.preventDefault();
    setInviting(true);
    setInviteMessage('');
    setGeneratedCode('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      const response = await fetch('/api/team/invites/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          business_id: businessId,
          email: inviteEmail,
          role: inviteRole
        })
      });

      const result = await response.json();
      if (response.ok) {
        setInviteMessage('✅ Invite code generated successfully!');
        setGeneratedCode(result.invite?.code || '');
        setInviteEmail('');
      } else {
        setInviteMessage('❌ ' + (result.error || 'Failed to generate invite'));
        if (result.debug) {
          console.log('Debug info:', result.debug);
          setInviteMessage(prev => prev + ' (Check console for details)');
        }
      }
    } catch (err) {
      setInviteMessage('❌ An unexpected error occurred');
      console.error(err);
    } finally {
      setInviting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
        Loading team...
      </div>
    );
  }

  const canManage = userRole === 'Owner' || userRole === 'Manager';

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto', color: 'var(--color-text)' }}>
      <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '0.25rem', color: 'var(--color-text)' }}>
        Team & Staff
      </h2>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>
        Manage your team members
      </p>

      {error && (
        <div style={{ background: '#fee', color: '#c00', padding: '0.8rem', borderRadius: '6px', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {/* Role indicator */}
      <div style={{
        background: 'var(--color-card)',
        border: '1px solid var(--color-border)',
        borderRadius: '6px',
        padding: '0.8rem 1rem',
        marginBottom: '1.5rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap'
      }}>
        <span>
          <strong>Your role:</strong> {userRole || 'Not set'}
        </span>
        {businessId && (
          <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
            Business ID: {businessId.slice(0, 8)}...
          </span>
        )}
      </div>

      {/* Members table */}
      <div style={{
        background: 'var(--color-card)',
        border: '1px solid var(--color-border)',
        borderRadius: '8px',
        overflow: 'hidden',
        marginBottom: '2rem'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ background: 'var(--color-bg)', borderBottom: '1px solid var(--color-border)' }}>
            <tr>
              <th style={{ padding: '0.8rem 1rem', textAlign: 'left', fontWeight: '600', color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>Name / Email</th>
              <th style={{ padding: '0.8rem 1rem', textAlign: 'left', fontWeight: '600', color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>Role</th>
              <th style={{ padding: '0.8rem 1rem', textAlign: 'left', fontWeight: '600', color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>Joined</th>
              {canManage && <th style={{ padding: '0.8rem 1rem', textAlign: 'right', fontWeight: '600', color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {members.length === 0 ? (
              <tr>
                <td colSpan="4" style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                  No members yet.
                </td>
              </tr>
            ) : (
              members.map((m) => {
                const isOwner = m.role === 'Owner';
                return (
                  <tr key={m.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '0.8rem 1rem', color: 'var(--color-text)' }}>
                      {m.user?.email || 'Unknown'}
                      {isOwner && <span style={{ marginLeft: '0.5rem', fontSize: '0.7rem', background: 'var(--color-accent)', color: '#fff', padding: '0.1rem 0.5rem', borderRadius: '4px' }}>Owner</span>}
                    </td>
                    <td style={{ padding: '0.8rem 1rem', color: 'var(--color-text)' }}>
                      <span style={{
                        background: m.role === 'Owner' ? 'var(--color-accent)' :
                                   m.role === 'Manager' ? 'var(--color-primary)' :
                                   'var(--color-text-muted)',
                        color: '#fff',
                        padding: '0.2rem 0.6rem',
                        borderRadius: '4px',
                        fontSize: '0.7rem',
                        fontWeight: '500'
                      }}>
                        {m.role}
                      </span>
                    </td>
                    <td style={{ padding: '0.8rem 1rem', color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
                      {m.joined_at ? new Date(m.joined_at).toLocaleDateString() : '—'}
                    </td>
                    {canManage && (
                      <td style={{ padding: '0.8rem 1rem', textAlign: 'right' }}>
                        {!isOwner && (
                          <button style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--color-danger)',
                            cursor: 'pointer',
                            fontSize: '0.8rem'
                          }} onClick={() => alert('Remove functionality coming soon')}>
                            Remove
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Invite form */}
      {canManage ? (
        <div style={{
          background: 'var(--color-card)',
          border: '1px solid var(--color-border)',
          borderRadius: '8px',
          padding: '1.5rem'
        }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: 'var(--color-text)', marginBottom: '1rem' }}>
            Invite New Team Member
          </h3>

          {generatedCode && (
            <div style={{
              background: '#d4edda',
              padding: '1rem',
              borderRadius: '8px',
              marginBottom: '1.5rem',
              textAlign: 'center'
            }}>
              <strong style={{ fontSize: '1.5rem', letterSpacing: '0.2rem' }}>{generatedCode}</strong>
              <p style={{ margin: '0.5rem 0 0', fontSize: '0.9rem' }}>Share this 6‑character code with {inviteEmail}</p>
              <button
                onClick={() => navigator.clipboard?.writeText(generatedCode)}
                style={{ marginTop: '0.5rem', padding: '0.3rem 1.5rem', background: '#0F2B4A', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
              >
                Copy Code
              </button>
            </div>
          )}

          <form onSubmit={handleInvite} style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-end' }}>
            <div style={{ flex: '1 1 200px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '500', color: 'var(--color-text-muted)', marginBottom: '0.3rem' }}>
                Email address
              </label>
              <input
                type="email"
                required
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.6rem',
                  border: '1px solid var(--color-border)',
                  borderRadius: '6px',
                  background: 'var(--color-bg)',
                  color: 'var(--color-text)'
                }}
              />
            </div>
            <div style={{ flex: '0 0 120px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '500', color: 'var(--color-text-muted)', marginBottom: '0.3rem' }}>
                Role
              </label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.6rem',
                  border: '1px solid var(--color-border)',
                  borderRadius: '6px',
                  background: 'var(--color-bg)',
                  color: 'var(--color-text)'
                }}
              >
                <option value="Staff">Staff</option>
                <option value="Manager">Manager</option>
              </select>
            </div>
            <div>
              <button
                type="submit"
                disabled={inviting}
                style={{
                  padding: '0.6rem 1.5rem',
                  background: 'var(--color-accent)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: '500',
                  cursor: inviting ? 'not-allowed' : 'pointer',
                  opacity: inviting ? 0.6 : 1
                }}
              >
                {inviting ? 'Generating...' : 'Generate Code'}
              </button>
            </div>
          </form>
          {inviteMessage && (
            <div style={{ marginTop: '1rem', fontSize: '0.9rem', color: inviteMessage.includes('✅') ? 'var(--color-success)' : 'var(--color-danger)' }}>
              {inviteMessage}
            </div>
          )}
        </div>
      ) : (
        <div style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '2rem' }}>
          You need to be an Owner or Manager to invite team members.
        </div>
      )}
    </div>
  );
          }
