import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const slug = searchParams.get('slug')

  if (!slug) {
    return NextResponse.json({ error: 'Slug is required' }, { status: 400 })
  }

  // Validate slug format (lowercase, hyphens, no spaces)
  const slugRegex = /^[a-z0-9-]+$/
  if (!slugRegex.test(slug)) {
    return NextResponse.json({ error: 'Invalid slug format' }, { status: 400 })
  }

  try {
    const { data, error } = await supabase
      .from('business_public_pages')
      .select('business_id')
      .eq('slug', slug)
      .maybeSingle()

    if (error) throw error

    if (data) {
      // Slug is taken, but we could also check if it's the same business editing
      return NextResponse.json({ available: false, message: 'This slug is already in use.' })
    }

    return NextResponse.json({ available: true, message: 'Slug is available.' })
  } catch (error) {
    console.error('Slug check error:', error)
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 })
  }
}
