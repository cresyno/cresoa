'use client'

import { useEffect, useState } from 'react'

const box = { border: '1px solid rgba(128,128,128,0.35)', borderRadius: '12px', padding: '1rem', marginBottom: '1rem' }
const field = { width: '100%', boxSizing: 'border-box', padding: '0.7rem', borderRadius: '8px', border: '1px solid rgba(128,128,128,0.45)', background: 'transparent', color: 'inherit', fontSize: '1rem', marginBottom: '0.8rem' }
const btn = { padding: '0.7rem 1.1rem', borderRadius: '8px', border: 'none', background: 'var(--cresoa-primary, #D4A52A)', color: '#fff', fontWeight: 600, cursor: 'pointer' }
const btnGhost = { ...btn, background: 'transparent', color: 'inherit', border: '1px solid rgba(128,128,128,0.45)' }

export default function PayoutSettings({ businessId, getToken }) {
  const [banks, setBanks] = useState([])
  const [account, setAccount] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [bankCode, setBankCode] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [resolvedName, setResolvedName] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState({ type: '', text: '' })

  const authFetch = async (url, options = {}) => {
    const token = await getToken()
    return fetch(url, {
      ...options,
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    })
  }

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const [b, a] = await Promise.all([
          fetch('/api/payments/banks').then((r) => r.json()),
          authFetch(`/api/payments/payout?business_id=${businessId}`).then((r) => r.json()),
        ])
        if (!alive) return
        setBanks(b.banks || [])
        setAccount(a.account || null)
        setEditing(!a.account)
      } catch (_) {
        if (alive) setMsg({ type: 'error', text: 'Could not load payment settings.' })
      }
      if (alive) setLoading(false)
    })()
    return () => { alive = false }
  }, [businessId])

  const bankName = banks.find((b) => b.code === bankCode)?.name || ''
  const ready = bankCode && /^\d{10}$/.test(accountNumber)

  const verify = async () => {
    setBusy(true); setMsg({ type: '', text: '' }); setResolvedName('')
    const res = await authFetch('/api/payments/payout', {
      method: 'POST',
      body: JSON.stringify({ business_id: businessId, bank_code: bankCode, account_number: accountNumber, verify_only: true }),
    })
    const data = await res.json()
    if (!res.ok) setMsg({ type: 'error', text: data.error || 'Could not verify account.' })
    else setResolvedName(data.account_name)
    setBusy(false)
  }

  const save = async () => {
    setBusy(true); setMsg({ type: '', text: '' })
    const res = await authFetch('/api/payments/payout', {
      method: 'POST',
      body: JSON.stringify({ business_id: businessId, bank_code: bankCode, bank_name: bankName, account_number: accountNumber }),
    })
    const data = await res.json()
    if (!res.ok) {
      setMsg({ type: 'error', text: data.error || 'Could not save.' })
    } else {
      setAccount(data.account)
      setEditing(false)
      setBankCode(''); setAccountNumber(''); setResolvedName('')
      setMsg({ type: 'ok', text: 'Payout account saved.' })
    }
    setBusy(false)
  }

  if (loading) return <div style={box}>Loading payment settings...</div>

  return (
    <div style={box}>
      <h3 style={{ margin: '0 0 0.3rem' }}>Online payments</h3>
      <p style={{ margin: '0 0 1rem', fontSize: '0.85rem', opacity: 0.75 }}>
        Your customers can pay their balance from the tracking link. Payments are sent to the bank account below by Paystack.
      </p>

      {account && !editing && (
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ fontWeight: 600 }}>{account.account_name}</div>
          <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>
            {account.bank_name || 'Bank'} · account ending {account.account_last4}
          </div>
          <button style={{ ...btnGhost, marginTop: '0.8rem' }} onClick={() => setEditing(true)}>Change account</button>
        </div>
      )}

      {editing && (
        <div>
          <label style={{ fontSize: '0.8rem', opacity: 0.75 }}>Bank</label>
          <select
            style={field}
            value={bankCode}
            onChange={(e) => { setBankCode(e.target.value); setResolvedName('') }}
          >
            <option value="">Select your bank</option>
            {banks.map((b) => <option key={b.code} value={b.code}>{b.name}</option>)}
          </select>

          <label style={{ fontSize: '0.8rem', opacity: 0.75 }}>Account number</label>
          <input
            style={field}
            inputMode="numeric"
            maxLength={10}
            value={accountNumber}
            onChange={(e) => { setAccountNumber(e.target.value.replace(/\D/g, '')); setResolvedName('') }}
            placeholder="10-digit account number"
          />

          {!resolvedName && (
            <button style={{ ...btn, opacity: ready && !busy ? 1 : 0.6 }} disabled={!ready || busy} onClick={verify}>
              {busy ? 'Checking...' : 'Verify account'}
            </button>
          )}

          {resolvedName && (
            <div>
              <p style={{ margin: '0 0 0.8rem' }}>
                Account name: <strong>{resolvedName}</strong>
                <br />
                <span style={{ fontSize: '0.8rem', opacity: 0.75 }}>Confirm this is your account before saving.</span>
              </p>
              <button style={btn} disabled={busy} onClick={save}>{busy ? 'Saving...' : 'Confirm and save'}</button>
              {account && <button style={{ ...btnGhost, marginLeft: '0.6rem' }} onClick={() => { setEditing(false); setResolvedName('') }}>Cancel</button>}
            </div>
          )}
          {!resolvedName && account && (
            <button style={{ ...btnGhost, marginLeft: '0.6rem' }} onClick={() => setEditing(false)}>Cancel</button>
          )}
        </div>
      )}

      {msg.text && (
        <p style={{ margin: '0.8rem 0 0', fontSize: '0.85rem', color: msg.type === 'ok' ? 'var(--cresoa-success)' : 'var(--cresoa-danger)' }}>
          {msg.text}
        </p>
      )}

      <div style={{ marginTop: '1.2rem', paddingTop: '1rem', borderTop: '1px solid rgba(128,128,128,0.25)' }}>
        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Where payments go</div>
        <label style={{ display: 'block', margin: '0.5rem 0', fontSize: '0.9rem' }}>
          <input type="radio" checked readOnly /> Send to my bank account
        </label>
        <label style={{ display: 'block', fontSize: '0.9rem', opacity: 0.5 }}>
          <input type="radio" disabled /> Keep in my Cresoa balance (not available yet)
        </label>
      </div>
    </div>
  )
                    }
