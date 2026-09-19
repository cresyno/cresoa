export async function POST(req) {
  try {
    const formData = await req.formData()
    
    const payload = {
      email: formData.get('email_address'),
      firstName: formData.get('fields[first_name]'),
      phone: formData.get('fields[phone]'),
      tag: formData.get('tags[]'),
      otherIndustry: formData.get('fields[other_industry]'),
    }
    console.log('=== WAITLIST SUBMIT ===')
    console.log('Payload:', JSON.stringify(payload, null, 2))
    
    const res = await fetch('https://app.kit.com/forms/9928723/subscriptions', {
      method: 'POST',
      body: formData,
    })
    
    const text = await res.text()
    console.log('Kit status:', res.status)
    console.log('Kit body:', text.slice(0, 800))
    console.log('=== END ===')
    
    return Response.json({ ok: res.ok }, { status: res.status })
  } catch (err) {
    console.error('Waitlist error:', err)
    return Response.json({ ok: false, error: 'network' }, { status: 500 })
  }
}
