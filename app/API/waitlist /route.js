export async function POST(req) {
  try {
    const formData = await req.formData()
    const res = await fetch('https://app.kit.com/forms/9928723/subscriptions', {
      method: 'POST',
      body: formData,
    })
    return Response.json({ ok: res.ok }, { status: res.status })
  } catch (err) {
    return Response.json({ ok: false, error: 'network' }, { status: 500 })
  }
}
