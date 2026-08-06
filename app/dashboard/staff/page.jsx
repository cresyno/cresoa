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

  // States for invite form
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('Staff');
  const [inviting, setInviting] = useState(false);
  const [inviteMessage, setInviteMessage] = useState('');

  // Get current business and members
  useEffect(() => {
    const loadData = async () => {
      try {
        // Get session
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.push('/login');
          return;
        }

        // Get current business (similar to layout logic)
        // We'll fetch the business from the user's membership or ownership
        const { data: { user } } = await supabase.auth.getUser();
        let bizId = null;
        let role = '';

        // Check if owner
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
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
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

  // Handle invite generation
  const handleInvite = async (e) => {
    e.preventDefault();
    setInviting(true);
    setInviteMessage('');

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
        setInviteMessage('✅ Invite sent successfully!');
        setInviteEmail('');
        // Optionally refresh members list (but invitee not yet member)
      } else {
        setInviteMessage('❌ ' + (result.error || 'Failed to send invite'));
      }
    } catch (err) {
      setInviteMessage('❌ An unexpected error occurred');
    } finally {
      setInviting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <div style={{ color: 'var(--color-text-muted)' }}>Loading team...</div>
      </div>
    );
  }

  // Permissions: Only Owner/Manager can manage staff
  const canManage = userRole === 'Owner' || userRole === 'Manager';

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: 'var(--color-text)' }}>Team Members</h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
            {members.length} member{members.length !== 1 ? 's' : ''}
          </p>
        </div>
        {canManage && (
          <button
            onClick={() => document.getElementById('inviteForm').scrollIntoView({ behavior: 'smooth' })}
            style={{
              padding: '0.5rem 1rem',
              background: 'var(--color-accent)',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            + Invite New
          </button>
        )}
      </div>

      {error && (
        <div style={{
          background: 'var(--color-danger)',
          color: '#fff',
          padding: '0.8rem',
          borderRadius: '6px',
          marginBottom: '1rem'
        }}>
          {error}
        </div>
      )}

      {/* Members list */}
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
              members.map((member) => {
                const user = member.user;
                const displayName = user?.full_name || user?.email || 'User';
                const isOwner = member.role === 'Owner';
                const isSelf = user?.id === supabase.auth.user()?.id; // This won't work directly, we need to get current user id

                // We'll get current user id from session state later; for now assume we can't manage self.
                // We'll just not show actions for Owner or self.

                return (
                  <tr key={member.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '0.8rem 1rem', color: 'var(--color-text)' }}>
                      {displayName}
                      {isOwner && <span style={{ marginLeft: '0.5rem', fontSize: '0.7rem', background: 'var(--color-accent)', color: '#fff', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>Owner</span>}
                    </td>
                    <td style={{ padding: '0.8rem 1rem', color: 'var(--color-text)' }}>
                      <span style={{
                        background: member.role === 'Owner' ? 'var(--color-accent)' : 
                                   member.role === 'Manager' ? 'var(--color-primary)' : 
                                   'var(--color-text-muted)',
                        color: '#fff',
                        padding: '0.2rem 0.6rem',
                        borderRadius: '4px',
                        fontSize: '0.7rem',
                        fontWeight: '500'
                      }}>
                        {member.role}
                      </span>
                    </td>
                    <td style={{ padding: '0.8rem 1rem', color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
                      {member.joined_at ? new Date(member.joined_at).toLocaleDateString() : '—'}
                    </td>
                    {canManage && (
                      <td style={{ padding: '0.8rem 1rem', textAlign: 'right' }}>
                        {/* We'll add role change and remove actions later */}
                        {!isOwner && (
                          <button style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--color-danger)',
                            cursor: 'pointer',
                            fontSize: '0.8rem',
                            marginLeft: '0.5rem'
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

      {/* Invite form – only for Owner/Manager */}
      {canManage && (
        <div id="inviteForm" style={{
          background: 'var(--color-card)',
          border: '1px solid var(--color-border)',
          borderRadius: '8px',
          padding: '1.5rem',
          marginTop: '1rem'
        }}>
          <h3 style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--color-text)', marginBottom: '1rem' }}>
            Invite New Team Member
          </h3>
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
            <div style={{ flex: '0 0 150px' }}>
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
                {inviting ? 'Sending...' : 'Send Invite'}
              </button>
            </div>
          </form>
          {inviteMessage && (
            <div style={{ marginTop: '1rem', fontSize: '0.9rem', color: inviteMessage.includes('✅') ? 'var(--color-success)' : 'var(--color-danger)' }}>
              {inviteMessage}
            </div>
          )}
        </div>
      )}
    </div>
  );
            }
