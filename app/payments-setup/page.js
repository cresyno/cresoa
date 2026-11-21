'use client';
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import PayoutSettings from '../../components/PayoutSettings'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default function PaymentsSetupPage() {
  const [state, setState] = useState('loading')
  const [businesses, setBusinesses] = useState([])
  const [businessId, setBusinessId] = useState('')

  useEffect(() => {
    ;(async () => {
      const { data } = await supabase.auth.getSession()
      const user = data.session?.user
      if (!user) { setState('signedout'); return }
      const { data: rows } = await supabase
        .from('businesses')
        .select('id, name')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: true })
      if (!rows || rows.length === 0) { setState('nobusiness'); return }
      setBusinesses(rows)
      setBusinessId(rows[0].id)
      setState('ready')
    })()
  }, [])

  const wrap = { maxWidth: '480px', margin: '0 auto', padding: '1rem', fontFamily: "'Inter', system-ui, sans-serif" }

  if (state === 'loading') return <div style={wrap}>Loading...</div>
  if (state === 'signedout') {
    return <div style={wrap}>Please <a href="/login">log in</a> on this site first, then come back to this page.</div>
  }
  if (state === 'nobusiness') return <div style={wrap}>No business found that you own.</div>

  return (
    <div style={wrap}>
      <h2>Payment setup</h2>
      {businesses.length > 1 && (
        <select
          value={businessId}
          onChange={(e) => setBusinessId(e.target.value)}
          style={{ width: '100%', padding: '0.7rem', marginBottom: '1rem', fontSize: '1rem' }}
        >
          {businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      )}
      <PayoutSettings
        key={businessId}
        businessId={businessId}
        getToken={async () => (await supabase.auth.getSession()).data.session?.access_token}
      />
    </div>
  )
                 }
