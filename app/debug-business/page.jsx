'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function DebugBusinessPage() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function testAPI() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setResult({ error: 'No session' });
        setLoading(false);
        return;
      }

      // Hardcode your Test Business ID
      const businessId = '35c2e34d-832b-471a-b015-5063ce85c653';

      const response = await fetch(`/api/user/businesses?business_id=${businessId}`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      const data = await response.json();
      setResult({ status: response.status, data });
      setLoading(false);
    }
    testAPI();
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div style={{ padding: '2rem', fontFamily: 'monospace' }}>
      <h2>🔍 API Debug</h2>
      <pre style={{ background: '#1e1e2a', color: '#fff', padding: '1rem', borderRadius: '8px', overflow: 'auto' }}>
        {JSON.stringify(result, null, 2)}
      </pre>
    </div>
  );
}
