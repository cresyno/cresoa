import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabaseClient';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get('slug');
  const businessId = searchParams.get('business_id');

  if (!slug) {
    return NextResponse.json({ available: false, message: 'Slug is required' }, { status: 400 });
  }

  // Normalize slug (lowercase, remove special characters, spaces to hyphens)
  const normalized = slug.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  if (!normalized) {
    return NextResponse.json({ available: false, message: 'Invalid slug' }, { status: 400 });
  }

  // Check if slug exists (excluding current business)
  const { data, error } = await supabase
    .from('business_public_pages')
    .select('business_id')
    .eq('slug', normalized)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ available: false, message: 'Error checking availability' }, { status: 500 });
  }

  if (data && data.business_id !== businessId) {
    return NextResponse.json({ available: false, message: 'This slug is already taken' }, { status: 200 });
  }

  return NextResponse.json({ available: true, normalized: normalized }, { status: 200 });
}
