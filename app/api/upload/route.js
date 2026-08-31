import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// ─── Admin client (bypasses RLS) ───
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(req) {
  try {
    // Get auth from header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Missing authorization header' }, { status: 401 });
    }
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse form data
    const formData = await req.formData();
    const file = formData.get('file');
    const jobId = formData.get('jobId');
    const businessId = formData.get('businessId');
    const sector = formData.get('sector') || 'printing';

    if (!file || !jobId || !businessId) {
      return NextResponse.json({ error: 'Missing file, jobId, or businessId' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'File type not allowed. Upload JPG, PNG, WebP, or PDF.' }, { status: 400 });
    }

    // Generate a unique file name
    const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
    const filePath = `print-jobs/${businessId}/${jobId}/${fileName}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabaseAdmin.storage
      .from('job-files')
      .upload(filePath, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return NextResponse.json({ error: uploadError.message || 'Upload failed' }, { status: 400 });
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from('job-files')
      .getPublicUrl(filePath);
    const publicUrl = urlData.publicUrl;

    // Insert record into job_files table (ADMIN client bypasses RLS)
    const { error: dbError } = await supabaseAdmin
      .from('job_files')
      .insert({
        job_id: jobId,
        business_id: businessId,
        filename: file.name,
        file_url: publicUrl,
        file_type: file.type,
        uploaded_by: user.id,
        sector: sector,
      });

    if (dbError) {
      console.error('Database insert error:', dbError);
      // Still return URL, but tell the user it might not show immediately
      return NextResponse.json({
        success: false,
        error: dbError.message || 'Failed to save file record',
        fileUrl: publicUrl,
        fileName: file.name,
        filePath: filePath,
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      fileUrl: publicUrl,
      fileName: file.name,
      filePath: filePath,
    });
  } catch (error) {
    console.error('Upload API error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
  }
