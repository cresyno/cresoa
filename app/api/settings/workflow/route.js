import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const businessId = searchParams.get('business_id');
    if (!businessId) return NextResponse.json({ error: 'Business ID required' }, { status: 400 });

    const { data, error } = await supabase
      .from('business_workflows')
      .select('*')
      .eq('business_id', businessId)
      .order('stage_order', { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ stages: data });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { business_id, stages } = await req.json();
    if (!business_id || !stages || stages.length === 0) {
      return NextResponse.json({ error: 'Invalid data provided' }, { status: 400 });
    }

    // Delete existing stages
    await supabase
      .from('business_workflows')
      .delete()
      .eq('business_id', business_id);

    // Insert new stages
    const newStages = stages.map((name, index) => ({
      business_id,
      stage_name: name,
      stage_order: index + 1
    }));

    const { error } = await supabase
      .from('business_workflows')
      .insert(newStages);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
                                  }
