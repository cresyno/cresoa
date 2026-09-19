export async function POST(req) {
  try {
    const formData = await req.formData()

    const email = formData.get('email_address')?.toString().trim()
    const firstName = formData.get('fields[first_name]')?.toString().trim()
    const phone = formData.get('fields[phone]')?.toString().trim()
    const tag = formData.get('tags[]')?.toString().trim()
    const otherIndustry = formData.get('fields[other_industry]')?.toString().trim()

    if (!email) {
      return Response.json({ ok: false, status: 400, kitMessage: 'Email is required.' }, { status: 400 })
    }

    // Build the V3 API payload
    const payload = {
      api_key: process.env.KIT_API_KEY,
      email,
      first_name: firstName || undefined,
      fields: {
        phone: phone || undefined,
        other_industry: otherIndustry || undefined,
      },
      tags: tag ? [tag] : undefined,
    }

    console.log('Sending to Kit V3:', JSON.stringify({ ...payload, api_key: '***' }, null, 2))

    const res = await fetch('https://api.convertkit.com/v3/forms/9928723/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    const text = await res.text()
    console.log('Kit V3 status:', res.status)
    console.log('Kit V3 body:', text.slice(0, 800))

    if (!res.ok) {
      return Response.json(
        { ok: false, status: res.status, kitMessage: text.slice(0, 500) },
        { status: res.status }
      )
    }

    return Response.json({ ok: true })
  } catch (err) {
    console.error('Waitlist error:', err)
    return Response.json(
      { ok: false, status: 500, kitMessage: err?.message || 'Network error' },
      { status: 500 }
    )
  }
}
