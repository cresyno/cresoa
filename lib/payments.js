import crypto from 'crypto'
import { supabaseAdmin } from './supabaseAdmin'

export const keyFingerprint = () =>
  crypto.createHash('sha256').update(process.env.PAYSTACK_SECRET_KEY || '').digest('hex').slice(0, 16)

export async function paystack(path, method = 'GET', body) {
  const res = await fetch(`https://api.paystack.co${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  })
  const json = await res.json().catch(() => null)
  return { ok: res.ok && !!json?.status, json }
}

export async function createSubaccount({ businessName, businessId, bankCode, accountNumber }) {
  const r = await paystack('/subaccount', 'POST', {
    business_name: businessName,
    settlement_bank: bankCode,
    account_number: accountNumber,
    percentage_charge: 0,
    description: `Cresoa merchant ${businessId}`,
  })
  return r.ok ? r.json.data.subaccount_code : null
}

// Returns the payout row with a subaccount that exists on the CURRENT Paystack account.
export async function getUsablePayout(businessId) {
  const { data: row } = await supabaseAdmin
    .from('merchant_payout_accounts').select('*').eq('business_id', businessId).maybeSingle()
  if (!row || row.status !== 'active') return null

  const fp = keyFingerprint()
  if (row.paystack_subaccount_code && row.key_fingerprint === fp) return row

  const { data: biz } = await supabaseAdmin
    .from('businesses').select('name').eq('id', businessId).maybeSingle()
  const code = await createSubaccount({
    businessName: biz?.name || 'Business',
    businessId,
    bankCode: row.bank_code,
    accountNumber: row.account_number,
  })
  if (!code) return null

  const { data: updated } = await supabaseAdmin
    .from('merchant_payout_accounts')
    .update({ paystack_subaccount_code: code, key_fingerprint: fp, updated_at: new Date().toISOString() })
    .eq('business_id', businessId).select('*').single()
  return updated || null
    }
