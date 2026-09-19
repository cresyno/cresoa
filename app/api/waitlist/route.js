export async function POST(req) {
  try {
    const formData = await req.formData()
    console.log('Submitting to Kit:', {
      email: formData.get('email_address'),
      firstName: formData.get('fields[first_name]'),
      phone: formData.get('fields[phone]'),
      businessType: formData.get('tags[]'),
      otherIndustry: formData.get('fields[other_industry]'),
    })
    const res = await fetch('https://app.kit.com/forms/9928723/subscriptions', {
      method: 'POST',
      body: formData,
    })
    const text = await res.text()
    console.log('Kit response status:', res.status)
    console.log('Kit response body:', text.slice(0, 800))
    return Response.json({ ok: res.ok }, { status: res.status })
  } catch (err) {
    console.error('Waitlist error:', err)
    return Response.json({ ok: false, error: 'network' }, { status: 500 })
  }
}
