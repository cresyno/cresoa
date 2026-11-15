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

    // Kit V4 requires the API key in the headers, not the body
    const headers = {
      'Content-Type': 'application/json',
      'X-Kit-Api-Key': process.env.KIT_API_KEY,
    }

    // 1. Upsert Subscriber (V4 saves custom fields natively)
    const payload = {
      email_address: email,
      first_name: firstName || undefined,
      fields: {
        phone: phone || undefined,
        other_industry: otherIndustry || undefined,
      },
    }

    console.log('Sending to Kit V4:', JSON.stringify(payload, null, 2))

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

    // 2. Apply Tag (if one was selected)
    if (tag) {
      const tagRes = await fetch(`https://api.kit.com/v4/tags/${tag}/subscribers`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ email_address: email }),
      })

      if (!tagRes.ok) {
        const tagErrorText = await tagRes.text()
        console.error('Kit V4 tag error:', tagRes.status, tagErrorText)
        // We log the error but don't fail the whole request, 
        // because the subscriber and custom fields were already saved.
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
