import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabaseAdmin';

export async function POST(req) {
  try {
    // Get auth
    const authHeader = req.headers.get('authorization');
    if (!authHeader) return NextResponse.json({ error: 'Missing auth' }, { status: 401 });
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get('file');
    const businessId = formData.get('businessId');
    const purpose = formData.get('purpose') || 'portfolio'; // cover, portfolio

    if (!file || !businessId) return NextResponse.json({ error: 'Missing file or businessId' }, { status: 400 });

    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) return NextResponse.json({ error: 'Image only' }, { status: 400 });

    const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
    const filePath = `public-pages/${businessId}/${purpose}/${fileName}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from('job-files')
      .upload(filePath, file, { contentType: file.type, upsert: false });
    if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 400 });

    const { data: urlData } = supabaseAdmin.storage.from('job-files').getPublicUrl(filePath);
    return NextResponse.json({ url: urlData.publicUrl });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
