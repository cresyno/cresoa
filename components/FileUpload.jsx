'use client';

import { useState, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function FileUpload({ jobId, businessId, sector = 'printing', onUploaded, label = 'Upload File' }) {
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const fileInputRef = useRef(null);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setMessage('');

    try {
      // ── Compress image if it's an image and > 300KB ──
      let fileToUpload = file;
      if (file.type.startsWith('image/') && file.size > 300 * 1024) {
        const compressionOptions = {
          maxSizeMB: 0.3,          // Max 300KB
          maxWidthOrHeight: 1200,  // Max dimension
          useWebWorker: true,
          fileType: 'image/webp',  // Convert to WebP (smaller)
        };

        // Dynamic import to keep bundle small
        const imageCompression = (await import('browser-image-compression')).default;
        const compressedFile = await imageCompression(file, compressionOptions);
        fileToUpload = new File([compressedFile], file.name.replace(/\.[^.]+$/, '.webp'), { type: 'image/webp' });
      }

      // ── Get session token ──
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setMessage('You must be logged in to upload.');
        setUploading(false);
        return;
      }

      // ── Upload to API ──
      const formData = new FormData();
      formData.append('file', fileToUpload);
      formData.append('jobId', jobId);
      formData.append('businessId', businessId);
      formData.append('sector', sector);

      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: formData,
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Upload failed');

      setMessage('✅ Uploaded successfully');
      onUploaded?.(result);
    } catch (err) {
      console.error('Upload failed:', err);
      setMessage('❌ ' + (err.message || 'Upload failed'));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileChange}
        style={{ display: 'none' }}
        accept="image/*,.pdf"
      />
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        style={{
          background: uploading ? '#888' : 'var(--cresoa-accent)',
          color: '#fff',
          padding: '8px 16px',
          borderRadius: '8px',
          border: 'none',
          cursor: uploading ? 'not-allowed' : 'pointer',
          fontWeight: 600,
          fontSize: '14px',
        }}
      >
        {uploading ? '⏳ Uploading...' : label}
      </button>
      {message && <p style={{ fontSize: '12px', color: message.startsWith('✅') ? 'green' : 'red', marginTop: '6px' }}>{message}</p>}
    </div>
  );
        }
