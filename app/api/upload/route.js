import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabaseClient';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export async function POST(req) {
  try {
    // Get auth from header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Missing authorization header' }, { status: 401 });
    }
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse form data (file upload)
    const formData = await req.formData();
    const file = formData.get('file');
    const jobId = formData.get('jobId');
    const businessId = formData.get('businessId');
    const sector = formData.get('sector') || 'printing';

    if (!file || !jobId || !businessId) {
      return NextResponse.json({ error: 'Missing file, jobId, or businessId' }, { status: 400 });
    }

    // Validate file type (allow images and PDFs)
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
      console.error('Upload error:', uploadError);
      return NextResponse.json({ error: uploadError.message || 'Upload failed' }, { status: 400 });
    }

    // Get public URL
    const { data: publicUrlData } = supabaseAdmin.storage
      .from('job-files')
      .getPublicUrl(filePath);

    const publicUrl = publicUrlData.publicUrl;

    // Insert record into job_files table
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
      console.error('DB insert error:', dbError);
      // Still return URL even if DB insert fails
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
