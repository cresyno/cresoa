import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabaseClient';
import { supabaseAdmin } from '../../../../lib/supabaseAdmin';

// ─── GET: Fetch customer with orders ───
export async function GET(req, { params }) {
  try {
    const { id } = params;

    const authHeader = req.headers.get('authorization');

    if (!authHeader) {
      return NextResponse.json(
        { error: 'Missing authorization header' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // ─── Fetch customer to get business_id ───
    const {
      data: customer,
      error: fetchError,
    } = await supabaseAdmin
      .from('customers')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !customer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      );
    }

    // ─── Verify access ───
    const { data: membership } = await supabaseAdmin
      .from('business_memberships')
      .select('id')
      .eq('business_id', customer.business_id)
      .eq('user_id', user.id)
      .maybeSingle();

    const { data: business } = await supabaseAdmin
      .from('businesses')
      .select('owner_id')
      .eq('id', customer.business_id)
      .single();

    if (!membership && business?.owner_id !== user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // ─── Fetch orders for this customer ───
    const {
      data: orders,
      error: ordersError,
    } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('customer_id', id)
      .eq('business_id', customer.business_id)
      .order('created_at', { ascending: false });

    if (ordersError) {
      console.error('Orders fetch error:', ordersError);
    }

    return NextResponse.json({
      success: true,
      customer,
      orders: orders || [],
    });
  } catch (err) {
    console.error('GET customer error:', err);

    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// ─── PATCH: Update customer ───
export async function PATCH(req, { params }) {
  try {
    const { id } = params;

    // ─── Authenticate user ───
    const authHeader = req.headers.get('authorization');

    if (!authHeader) {
      return NextResponse.json(
        { error: 'Missing authorization header' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // ─── Read request body safely ───
    let body;

    try {
      body = await req.json();
    } catch (parseError) {
      console.error('PATCH body parse error:', parseError);

      return NextResponse.json(
        { error: 'Invalid JSON request body' },
        { status: 400 }
      );
    }

    // ─── Fetch existing customer ───
    const {
      data: customer,
      error: customerError,
    } = await supabaseAdmin
      .from('customers')
      .select('*')
      .eq('id', id)
      .single();

    if (customerError || !customer) {
      console.error('Customer lookup error:', customerError);

      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      );
    }

    // ─── Verify business access ───
    const { data: membership } = await supabaseAdmin
      .from('business_memberships')
      .select('id')
      .eq('business_id', customer.business_id)
      .eq('user_id', user.id)
      .maybeSingle();

    const { data: business } = await supabaseAdmin
      .from('businesses')
      .select('owner_id')
      .eq('id', customer.business_id)
      .single();

    if (!membership && business?.owner_id !== user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // ─── Validate name ───
    const updatedName =
      typeof body.name === 'string'
        ? body.name.trim()
        : customer.name;

    if (!updatedName) {
      return NextResponse.json(
        { error: 'Customer name is required' },
        { status: 400 }
      );
    }

    // ─── Validate phone ───
    const updatedPhone =
      typeof body.phone === 'string'
        ? body.phone.replace(/\D/g, '')
        : customer.phone;

    if (!updatedPhone || updatedPhone.length !== 11) {
      return NextResponse.json(
        { error: 'A valid 11-digit phone number is required' },
        { status: 400 }
      );
    }

    // ─── Prepare safe update ───
    const updateData = {
      name: updatedName,
      phone: updatedPhone,
      notes:
        typeof body.notes === 'string'
          ? body.notes.trim()
          : (customer.notes || ''),
      measurements:
        body.measurements &&
        typeof body.measurements === 'object' &&
        !Array.isArray(body.measurements)
          ? body.measurements
          : (customer.measurements || {}),
    };

    console.log('Updating customer:', {
      id,
      businessId: customer.business_id,
      userId: user.id,
    });

    // ─── Perform update ───
    const {
      data: updatedCustomer,
      error: updateError,
    } = await supabaseAdmin
      .from('customers')
      .update(updateData)
      .eq('id', id)
      .eq('business_id', customer.business_id)
      .select('*')
      .single();

    if (updateError) {
      console.error('Customer update error:', updateError);

      return NextResponse.json(
        {
          error: updateError.message || 'Failed to update customer',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      customer: updatedCustomer,
      message: 'Customer updated successfully',
    });
  } catch (err) {
    console.error('PATCH customer error:', err);

    return NextResponse.json(
      {
        error: err.message || 'Internal server error',
      },
      { status: 500 }
    );
  }
        }
// ─── DELETE: Remove customer and their orders ───
export async function DELETE(req, { params }) {
  try {
    const { id } = params;

    // ─── Authenticate user ───
    const authHeader = req.headers.get('authorization');

    if (!authHeader) {
      return NextResponse.json(
        { error: 'Missing authorization header' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // ─── Find customer ───
    const {
      data: customer,
      error: customerError,
    } = await supabaseAdmin
      .from('customers')
      .select('*')
      .eq('id', id)
      .single();

    if (customerError || !customer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      );
    }

    // ─── Verify business access ───
    const { data: membership } = await supabaseAdmin
      .from('business_memberships')
      .select('id')
      .eq('business_id', customer.business_id)
      .eq('user_id', user.id)
      .maybeSingle();

    const { data: business } = await supabaseAdmin
      .from('businesses')
      .select('owner_id')
      .eq('id', customer.business_id)
      .single();

    if (!membership && business?.owner_id !== user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // ─── Delete customer's orders first ───
    const {
      error: ordersDeleteError,
    } = await supabaseAdmin
      .from('orders')
      .delete()
      .eq('customer_id', id)
      .eq('business_id', customer.business_id);

    if (ordersDeleteError) {
      console.error(
        'Customer orders delete error:',
        ordersDeleteError
      );

      return NextResponse.json(
        {
          error:
            ordersDeleteError.message ||
            'Failed to delete customer orders',
        },
        { status: 500 }
      );
    }

    // ─── Delete customer ───
    const {
      error: deleteError,
    } = await supabaseAdmin
      .from('customers')
      .delete()
      .eq('id', id)
      .eq('business_id', customer.business_id);

    if (deleteError) {
      console.error(
        'Customer delete error:',
        deleteError
      );

      return NextResponse.json(
        {
          error:
            deleteError.message ||
            'Failed to delete customer',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Customer and associated orders deleted successfully',
    });
  } catch (err) {
    console.error('DELETE customer error:', err);

    return NextResponse.json(
      {
        error: err.message || 'Internal server error',
      },
      { status: 500 }
    );
  }
}
