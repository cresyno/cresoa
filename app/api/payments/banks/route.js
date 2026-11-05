import { NextResponse } from 'next/server'
import { paystack } from '../../../../lib/payments'

export const dynamic = 'force-dynamic'

let cache = { at: 0, banks: [] }

export async function GET() {
  if (cache.banks.length && Date.now() - cache.at < 6 * 60 * 60 * 1000) {
    return NextResponse.json({ banks: cache.banks })
  }
  const seen = new Map()
  let next = null
  for (let i = 0; i < 6; i++) {
    const q = `/bank?country=nigeria&currency=NGN&perPage=100&use_cursor=true${next ? `&next=${encodeURIComponent(next)}` : ''}`
    const r = await paystack(q)
    if (!r.ok) break
    for (const b of r.json.data || []) {
      if (b.code && b.active !== false) seen.set(b.code, { name: b.name, code: b.code })
    }
    next = r.json.meta?.next
    if (!next) break
  }
  const banks = [...seen.values()].sort((a, b) => a.name.localeCompare(b.name))
  if (!banks.length) return NextResponse.json({ error: 'Could not load banks' }, { status: 502 })
  cache = { at: Date.now(), banks }
  return NextResponse.json({ banks })
}
