import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '../../../../lib/supabaseAdmin';

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

    const { business_id, stages, update_orders } = await req.json();
    if (!business_id || !stages || stages.length === 0) {
      return NextResponse.json({ error: 'Invalid data provided' }, { status: 400 });
    }

    // STEP 1: Fetch OLD stages before deleting (to map old names to new)
    const { data: oldStages, error: fetchError } = await supabaseAdmin
      .from('business_workflows')
      .select('stage_name')
      .eq('business_id', business_id)
      .order('stage_order', { ascending: true });

    if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });

    // STEP 2: Delete existing stages
    const { error: deleteError } = await supabaseAdmin
      .from('business_workflows')
      .delete()
      .eq('business_id', business_id);

    if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 });

    // STEP 3: Insert new stages
    const newStages = stages.map((name, index) => ({
      business_id,
      stage_name: name,
      stage_order: index + 1
    }));

    const { error: insertError } = await supabaseAdmin
      .from('business_workflows')
      .insert(newStages);

    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

    // STEP 4: Update existing orders with old stage names (if requested)
    if (update_orders && oldStages && oldStages.length > 0) {
      // Build a map: oldStageName -> newStageName (based on position)
      const oldNames = oldStages.map(s => s.stage_name);
      const newNames = stages;
      const nameMap = {};
      oldNames.forEach((oldName, index) => {
        if (newNames[index]) {
          nameMap[oldName] = newNames[index];
        }
      });

      // For each old stage name, update orders that have that status
      for (const [oldName, newName] of Object.entries(nameMap)) {
        if (oldName === newName) continue; // No change
        const { error: updateError } = await supabaseAdmin
          .from('orders')
          .update({ current_status: newName })
          .eq('business_id', business_id)
          .eq('current_status', oldName);

        if (updateError) console.error('Order update error for', oldName, '->', newName, updateError);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Workflow save error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
