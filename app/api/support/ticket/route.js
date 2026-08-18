import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// ─── SELF-CONTAINED SERVER CLIENT (No external import) ───
function createSupabaseServerClient() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) { return cookieStore.get(name)?.value; },
        set(name, value, options) {
          try { cookieStore.set(name, value, options); } catch {}
        },
        remove(name, options) {
          try { cookieStore.set(name, '', { ...options, maxAge: 0 }); } catch {}
        }
      }
    }
  );
}

export async function POST(req) {
  try {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { business_id, subject, category, description } = await req.json();

    if (!business_id || !subject || !category || !description) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify membership
    const { data: membership } = await supabase
      .from('business_memberships')
      .select('role')
      .eq('user_id', user.id)
      .eq('business_id', business_id)
      .maybeSingle();

    if (!membership) {
      return NextResponse.json({ error: 'You do not have access to this business' }, { status: 403 });
    }

    const { data, error } = await supabase
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

    if (error) {
      console.error('Ticket creation error:', error);
      return NextResponse.json({ error: 'Failed to create ticket' }, { status: 500 });
    }

    return NextResponse.json({ ticket: data });
  } catch (error) {
    console.error('Support Ticket API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
