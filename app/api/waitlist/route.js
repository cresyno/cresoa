export async function POST(req) {
  try {
    const formData = await req.formData()

    const email = formData.get('email_address')?.toString().trim()
    const firstName = formData.get('fields[first_name]')?.toString().trim()
    const phone = formData.get('fields[phone]')?.toString().trim()
    const tag = formData.get('tags[]')?.toString().trim()
    const otherIndustry = formData.get('fields[other_industry]')?.toString().trim()

    if (!email) {
      return Response.json(
        { ok: false, status: 400, kitMessage: 'Email is required.' }, 
        { status: 400 }
      )
    }

    // Verify the key exists and starts with 'kit_'
    const apiKey = process.env.KIT_API_KEY
    
    if (!apiKey) {
       return Response.json({ ok: false, status: 500, kitMessage: 'KIT_API_KEY is missing from environment variables.' }, { status: 500 })
    }
    
    if (!apiKey.startsWith('kit_')) {
      return Response.json(
        { ok: false, status: 500, kitMessage: 'Server configuration error: API key is not a V4 key.' },
        { status: 500 }
      )
    }

    const headers = {
      'Content-Type': 'application/json',
      'X-Kit-Api-Key': apiKey,
    }

    // 1. Upsert Subscriber
    const payload = {
      email_address: email,
      first_name: firstName || undefined,
      fields: {
        phone: phone || undefined,
        other_industry: otherIndustry || undefined,
      },
    }

    const subRes = await fetch('https://api.kit.com/v4/subscribers', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    })

    if (!subRes.ok) {
      const errorText = await subRes.text()
      console.error('Kit V4 subscriber error:', subRes.status, errorText)
      return Response.json(
        { ok: false, status: subRes.status, kitMessage: errorText.slice(0, 500) },
        { status: subRes.status }
      )
    }

    // 2. Apply Tag
    if (tag) {
      const tagRes = await fetch(`https://api.kit.com/v4/tags/${tag}/subscribers`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ email_address: email }),
      })

      if (!tagRes.ok) {
        const tagErrorText = await tagRes.text()
        console.error('Kit V4 tag error:', tagRes.status, tagErrorText)
      }
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
