import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../lib/supabaseAdmin'

export const dynamic = 'force-dynamic'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const fail = (error, status) => NextResponse.json({ error }, { status })

async function requireOwner(req, businessId) {
  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')
  if (!token) return { error: 'Not signed in', status: 401 }
  const { data, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !data?.user) return { error: 'Not signed in', status: 401 }
  if (!businessId || !UUID.test(businessId)) return { error: 'Invalid business', status: 400 }
  const { data: biz } = await supabaseAdmin
    .from('businesses').select('id, name, owner_id').eq('id', businessId).maybeSingle()
  if (!biz || biz.owner_id !== data.user.id) {
    return { error: 'Only the business owner can do this', status: 403 }
  }
  return { user: data.user, biz }
}

async function paystack(path, method = 'GET', body) {
  const res = await fetch(`https://api.paystack.co${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const json = await res.json().catch(() => null)
  return { ok: res.ok && json?.status, json }
}

const masked = (a) => a && {
  bank_name: a.bank_name,
  account_name: a.account_name,
  account_last4: a.account_number.slice(-4),
  payout_mode: a.payout_mode,
  status: a.status,
}

export async function GET(req) {
  const businessId = new URL(req.url).searchParams.get('business_id')
  const auth = await requireOwner(req, businessId)
  if (auth.error) return fail(auth.error, auth.status)
  const { data } = await supabaseAdmin
    .from('merchant_payout_accounts').select('*').eq('business_id', businessId).maybeSingle()
  return NextResponse.json({ account: masked(data) || null })
}

// Save or change the payout bank account
export async function POST(req) {
  const body = await req.json().catch(() => ({}))
  const auth = await requireOwner(req, body.business_id)
  if (auth.error) return fail(auth.error, auth.status)

  const accountNumber = String(body.account_number || '')
  const bankCode = String(body.bank_code || '')
  if (!/^\d{10}$/.test(accountNumber)) return fail('Account number must be 10 digits', 400)
  if (!/^\d{3,6}$/.test(bankCode)) return fail('Invalid bank', 400)

  const resolved = await paystack(
    `/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`
  )
  if (!resolved.ok) return fail('Could not verify this account. Check the number and bank.', 422)
  const accountName = resolved.json.data.account_name

  const { data: existing } = await supabaseAdmin
    .from('merchant_payout_accounts').select('*').eq('business_id', body.business_id).maybeSingle()

  let code = existing?.paystack_subaccount_code
  if (code) {
    const up = await paystack(`/subaccount/${code}`, 'PUT', {
      business_name: auth.biz.name,
      settlement_bank: bankCode,
      account_number: accountNumber,
      active: true,
    })
    if (!up.ok) return fail('Could not update payout account', 502)
  } else {
    const cr = await paystack('/subaccount', 'POST', {
      business_name: auth.biz.name,
      settlement_bank: bankCode,
      account_number: accountNumber,
      percentage_charge: 0,
      description: `Cresoa merchant ${auth.biz.id}`,
    })
    if (!cr.ok) return fail('Could not create payout account', 502)
    code = cr.json.data.subaccount_code
  }

  const row = {
    business_id: body.business_id,
    bank_code: bankCode,
    bank_name: body.bank_name || null,
    account_number: accountNumber,
    account_name: accountName,
    paystack_subaccount_code: code,
    status: 'active',
    verified_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
  const { data: saved, error } = await supabaseAdmin
    .from('merchant_payout_accounts').upsert(row, { onConflict: 'business_id' }).select('*').single()
  if (error) return fail('Could not save', 500)

  await supabaseAdmin.from('audit_log').insert({
    business_id: body.business_id,
    user_id: auth.user.id,
    user_email: auth.user.email,
    user_role: 'owner',
    action: existing ? 'payout_account_changed' : 'payout_account_created',
    resource_type: 'merchant_payout_account',
    resource_id: saved.id,
    metadata: { bank_code: bankCode, last4: accountNumber.slice(-4) },
  })

  return NextResponse.json({ account: masked(saved) })
}

// Change payout mode: 'direct' or 'hold'
export async function PUT(req) {
  const body = await req.json().catch(() => ({}))
  const auth = await requireOwner(req, body.business_id)
  if (auth.error) return fail(auth.error, auth.status)

  if (!['direct', 'hold'].includes(body.payout_mode)) return fail('Invalid mode', 400)
  if (body.payout_mode === 'hold' && process.env.HOLD_MODE_ENABLED !== 'true') {
    return fail('Holding balance in Cresoa is not available yet', 409)
  }
  const { data, error } = await supabaseAdmin
    .from('merchant_payout_accounts')
    .update({ payout_mode: body.payout_mode, updated_at: new Date().toISOString() })
    .eq('business_id', body.business_id)
    .select('*').maybeSingle()
  if (error || !data) return fail('Set up your payout account first', 409)
  return NextResponse.json({ account: masked(data) })
}
