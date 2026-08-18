import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(req) {
  try {
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.split(' ')[1];
    
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let { business_id, subject, category, description } = await req.json();

    // 1. VALIDATE THE PASSED ID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    let isValidId = business_id && uuidRegex.test(business_id);

    // 2. TRY TO FIND THE BUSINESS IN THE DATABASE
    let businessExists = false;
    if (isValidId) {
      const { data: businessCheck, error: bizError } = await supabase
        .from('businesses')
        .select('id')
        .eq('id', business_id)
        .maybeSingle();
      
      if (!bizError && businessCheck) {
        businessExists = true;
      }
    }

    // 🧠 ULTIMATE SELF-CORRECTION: If the passed ID is invalid or doesn't exist, find the user's first valid business
    if (!businessExists) {
      console.warn(`Provided business ID "${business_id}" is invalid. Attempting to auto-resolve...`);
      
      // Find the first business the user is a member of (Owner, Manager, or Staff)
      const { data: membershipData, error: membershipError } = await supabase
        .from('business_memberships')
        .select('business_id')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();

      if (membershipError || !membershipData) {
        // If the user isn't a member of any business, check if they own one
        const { data: ownedBusiness, error: ownerError } = await supabase
          .from('businesses')
          .select('id')
          .eq('owner_id', user.id)
          .limit(1)
          .maybeSingle();

        if (ownerError || !ownedBusiness) {
          return NextResponse.json({ 
            error: 'You are not a member of any business. Please switch to a valid business or contact support.' 
          }, { status: 403 });
        }
        business_id = ownedBusiness.id;
      } else {
        business_id = membershipData.business_id;
      }
      console.log(`Ticket will be created for auto-resolved business ID: ${business_id}`);
    }

    if (!subject || !category || !description) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // ✅ INSERT THE TICKET
    const { data, error: insertError } = await supabase
      .from('support_tickets')
      .insert({
        user_id: user.id,
        business_id: business_id,
        subject: subject,
        category: category,
        description: description,
        status: 'open'
      })
      .select()
      .single();

    if (insertError) {
      console.error('Ticket creation error:', insertError);
      return NextResponse.json({ 
        error: `Database error: ${insertError.message || insertError.details || 'Unknown error'}` 
      }, { status: 500 });
    }

    return NextResponse.json({ ticket: data });
  } catch (error) {
    console.error('Support Ticket API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
