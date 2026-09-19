export async function POST(req) {
  try {
    const formData = await req.formData()

    // Extract for logging (doesn't affect the actual submission)
    const debug = {
      email: formData.get('email_address'),
      firstName: formData.get('fields[first_name]'),
      phone: formData.get('fields[phone]'),
      tag: formData.get('tags[]'),
      otherIndustry: formData.get('fields[other_industry]'),
    }
    console.log('Waitlist payload:', JSON.stringify(debug, null, 2))

    const res = await fetch('https://app.kit.com/forms/9928723/subscriptions', {
      method: 'POST',
      body: formData,
    })

    const text = await res.text()
    console.log('Kit status:', res.status)
    console.log('Kit body:', text.slice(0, 800))

    if (!res.ok) {
      // Return the real Kit error so it shows on screen
      return Response.json(
        {
          ok: false,
          status: res.status,
          kitMessage: text.slice(0, 500),
        },
        { status: res.status }
      )
    }

    return Response.json({ ok: true })
  } catch (err) {
    console.error('Waitlist error:', err)
    return Response.json(
      {
        ok: false,
        status: 500,
        kitMessage: err?.message || 'Network error',
      },
      { status: 500 }
    )
  }
}
