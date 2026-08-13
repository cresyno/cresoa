import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export async function POST(req) {
  try {
    // ─── Authenticate the requesting user ───
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Missing authorization' }, { status: 401 });
    }
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ─── Get list of user IDs ───
    const { ids } = await req.json();
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ users: [] });
    }

    // ─── Fetch each user's email ───
    const users = await Promise.all(
      ids.map(async (id) => {
        try {
          const { data, error } = await supabaseAdmin.auth.admin.getUserById(id);
          if (error || !data) {
            return { id, email: null };
          }
          return { id, email: data.user.email };
        } catch (_) {
          return { id, email: null };
        }
      })
    );

    return NextResponse.json({ users });
  } catch (error) {
    console.error('Users API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
