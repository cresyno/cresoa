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
      } else {
        setInviteMessage('❌ ' + (result.error || 'Failed to send invite'));
      }
    } catch (err) {
      setInviteMessage('❌ An unexpected error occurred');
    } finally {
      setInviting(false);
    }
  };

  if (loading) return <div style={{ padding: '2rem' }}>Loading team...</div>;

  const canManage = userRole === 'Owner' || userRole === 'Manager';

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h2>Team & Staff</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}

      <div style={{ margin: '1rem 0' }}>
        <strong>Your role: </strong>{userRole || 'Not set'}
      </div>

      <div style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '1rem' }}>
        <table style={{ width: '100%' }}>
          <thead>
            <tr>
              <th>Name / Email</th>
              <th>Role</th>
              <th>Joined</th>
              {canManage && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {members.length === 0 ? (
              <tr><td colSpan="4">No members yet.</td></tr>
            ) : (
              members.map((m) => (
                <tr key={m.id}>
                  <td>{m.user?.email || 'Unknown'}</td>
                  <td>{m.role}</td>
                  <td>{m.joined_at ? new Date(m.joined_at).toLocaleDateString() : '—'}</td>
                  {canManage && <td><button>Remove</button></td>}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {canManage && (
        <div style={{ marginTop: '2rem', background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '1rem' }}>
          <h3>Invite New Team Member</h3>
          <form onSubmit={handleInvite}>
            <input
              type="email"
              placeholder="Email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              required
              style={{ marginRight: '0.5rem', padding: '0.5rem' }}
            />
            <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}>
              <option value="Staff">Staff</option>
              <option value="Manager">Manager</option>
            </select>
            <button type="submit" disabled={inviting}>Send Invite</button>
          </form>
          {inviteMessage && <p>{inviteMessage}</p>}
        </div>
      )}
    </div>
  );
}
