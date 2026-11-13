// app/api/orders/route.js
import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabaseClient';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export async function GET(req) {
  try {
    // ─── 1. AUTHENTICATE USER ───
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Missing authorization header' }, { status: 401 });
    }
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
    }

    const url = new URL(req.url);
    const businessId = url.searchParams.get('business_id');
    
    if (!businessId) {
      return NextResponse.json({ error: 'business_id is required' }, { status: 400 });
    }

    // ─── 2. VERIFY ACCESS (THE SECURITY BOUNCER) ───
    // We check if the user is a member of the business OR the owner.
    const { data: membership } = await supabaseAdmin
      .from('business_memberships')
      .select('id')
      .eq('business_id', businessId)
      .eq('user_id', user.id)
      .maybeSingle();

    const { data: business } = await supabaseAdmin
      .from('businesses')
      .select('owner_id')
      .eq('id', businessId)
      .single();

    // 🚨 IF THEY ARE NOT THE OWNER AND NOT A MEMBER, BLOCK THEM.
    if (!membership && business?.owner_id !== user.id) {
      console.warn(`[SECURITY ALERT] User ${user.id} tried to access orders for business ${businessId}`)
      return NextResponse.json({ error: 'Access denied: You do not have permission to view these orders' }, { status: 403 });
    }

    // ─── 3. FETCH MANUAL ORDERS (SAFELY SCOPED) ───
    const { data: manualOrders, error: manualError } = await supabaseAdmin
      .from('orders')
      .select(`
        *,
        customers (id, name, phone)
      `)
      .eq('business_id', businessId) // <--- STRICTLY FILTERED
      .order('created_at', { ascending: false });

    if (manualError) console.error('Fetch manual orders error:', manualError);

    const formattedManualOrders = (manualOrders || []).map(o => ({
      ...o,
      source: 'manual'
    }));

    // ─── 4. FETCH WEBSITE ORDERS (SAFELY SCOPED) ───
    const { data: websiteOrders, error: websiteError } = await supabaseAdmin
      .from('public_orders')
      .select('*')
      .eq('business_id', businessId) // <--- STRICTLY FILTERED
      .order('created_at', { ascending: false });

    if (websiteError) console.error('Fetch website orders error:', websiteError);

    const formattedWebsiteOrders = (websiteOrders || []).map(o => {
      let title = 'Website Order'
      if (o.items && Array.isArray(o.items) && o.items.length > 0) {
        title = o.items[0].name
        if (o.items.length > 1) title += ` +${o.items.length - 1} more`
      }

      return {
        id: o.id,
        title: title,
        price: o.total_amount || 0,
        amount_paid: 0, 
        current_status: o.status === 'new' ? 'Order placed' : o.status,
        created_at: o.created_at,
        source: 'website',
        customers: {
          name: o.customer_name || 'Guest Customer',
          phone: o.customer_phone || ''
        }
      }
    });

    // ─── 5. MERGE AND RETURN ───
    const allOrders = [...formattedManualOrders, ...formattedWebsiteOrders].sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at)
    );

    return NextResponse.json({ success: true, orders: allOrders });
    
  } catch (err) {
    console.error('Orders API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─── POST: Create order (UNCHANGED, ALREADY SECURE) ───
export async function POST(req) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) return NextResponse.json({ error: 'Missing authorization header' }, { status: 401 });
    
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const {
      business_id, customer_id, customer_name, customer_phone, customer_email,
      title, price, amount_paid, due_date, current_status, notes,
      category, quantity, fabric, fitting_date, event_date, measurements,
    } = await req.json();

    if (!business_id || !title || price === undefined) {
      return NextResponse.json({ error: 'Business ID, title, and price are required' }, { status: 400 });
    }

    // ─── VERIFY ACCESS ───
    const { data: membership } = await supabaseAdmin
      .from('business_memberships')
      .select('id')
      .eq('business_id', business_id)
      .eq('user_id', user.id)
      .maybeSingle();

    const { data: business } = await supabaseAdmin
      .from('businesses')
      .select('owner_id')
      .eq('id', business_id)
      .single();

    if (!membership && business?.owner_id !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    let finalCustomerId = customer_id || null;
    
    if (!customer_id && customer_name) {
      const { data: newCustomer, error: custError } = await supabaseAdmin
        .from('customers')
        .insert({
          business_id,
          name: customer_name,
          phone: customer_phone || null,
          email: customer_email || null,
        })
        .select()
        .single();

      if (custError) {
        console.error('Customer creation error:', custError);
        return NextResponse.json({ error: 'Failed to create customer' }, { status: 500 });
      }
      finalCustomerId = newCustomer.id;
    }

    const { data: order, error: insertError } = await supabaseAdmin
      .from('orders')
      .insert({
        business_id,
        customer_id: finalCustomerId,
        title,
        price: parseFloat(price) || 0,
        amount_paid: parseFloat(amount_paid) || 0,
        due_date: due_date || null,
        current_status: current_status || 'Order placed',
        notes: notes || null,
        category: category || null,
        quantity: parseInt(quantity) || 1,
        fabric: fabric || null,
        fitting_date: fitting_date || null,
        event_date: event_date || null,
        measurements: measurements || null,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    await supabaseAdmin.from('business_activity_logs').insert({
      business_id,
      performed_by: user.id,
      action: 'order_created',
      details: { title, order_id: order.id }
    });

    return NextResponse.json({ success: true, order });
  } catch (err) {
    console.error('POST order error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
                                }
