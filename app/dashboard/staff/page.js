// app/dashboard/staff/page.js
'use client';

import { usePermissions } from '@/lib/permissions';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function StaffPage() {
  const { isOwner } = usePermissions();
  const [staff, setStaff] = useState([]);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('staff');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!isOwner) return;
    fetchStaff();
  }, [isOwner]);

  const fetchStaff = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('staff')
      .select('*, users:user_id(email)')
      .eq('business_id', supabase.auth.getUser()?.data?.user?.id); // adjust business_id retrieval
    if (error) console.error(error);
    setStaff(data || []);
    setLoading(false);
  };

  const inviteStaff = async () => {
    setMessage('');
    const res = await fetch('/api/staff/invite', {
      method: 'POST',
      body: JSON.stringify({ email, role }),
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await res.json();
    if (res.ok) {
      setMessage(`Invitation sent to ${email}`);
      setEmail('');
      fetchStaff();
    } else {
      setMessage(`Error: ${data.error || 'Unknown error'}`);
    }
  };

  const removeStaff = async (id) => {
    if (!confirm('Remove this staff member?')) return;
    const res = await fetch('/api/staff/remove', {
      method: 'DELETE',
      body: JSON.stringify({ staffId: id }),
      headers: { 'Content-Type': 'application/json' },
    });
    if (res.ok) {
      fetchStaff();
    } else {
      const data = await res.json();
      alert(`Error: ${data.error}`);
    }
  };

  if (!isOwner) {
    return <div className="p-8">Access Denied. Only business owners can manage staff.</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Staff Management</h1>

      <div className="mb-6 flex gap-4 items-center">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email address"
          className="border p-2 rounded"
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="border p-2 rounded"
        >
          <option value="staff">Staff</option>
          <option value="manager">Manager</option>
        </select>
        <button
          onClick={inviteStaff}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Invite
        </button>
      </div>
      {message && <p className="text-sm mb-4">{message}</p>}

      {loading ? (
        <p>Loading...</p>
      ) : (
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="border p-2 text-left">Email</th>
              <th className="border p-2 text-left">Role</th>
              <th className="border p-2 text-left">Status</th>
              <th className="border p-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {staff.map((s) => (
              <tr key={s.id} className="border-b">
                <td className="p-2">{s.users?.email || 'Unknown'}</td>
                <td className="p-2">{s.role}</td>
                <td className="p-2">{s.status}</td>
                <td className="p-2">
                  <button
                    onClick={() => removeStaff(s.id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
            {staff.length === 0 && (
              <tr>
                <td colSpan="4" className="p-4 text-center text-gray-500">
                  No staff members yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
      }
