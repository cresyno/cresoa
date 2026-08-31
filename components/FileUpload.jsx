'use client';

import { useState, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function FileUpload({ businessId, purpose = 'public-page', onUploaded, multiple = false, label = 'Upload' }) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const compressImage = async (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (e) => {
        const img = new Image();
        img.src = e.target.result;
        img.onload = () => {
          let { width, height } = img;
          const maxDim = 1200;
          if (width > maxDim || height > maxDim) {
            const ratio = Math.min(maxDim / width, maxDim / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          let quality = 0.85;
          let output = canvas.toDataURL('image/jpeg', quality);
          while (output.length > 300 * 1024 * 4 / 3 && quality > 0.3) {
            quality -= 0.1;
            output = canvas.toDataURL('image/jpeg', quality);
          }
          fetch(output).then(r => r.blob()).then(blob => resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' })));
        };
      };
    });
  };

  const handleFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setUploading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      for (const file of files) {
        let fileToUpload = file;
        if (file.type.startsWith('image/') && file.size > 300 * 1024) {
          fileToUpload = await compressImage(file);
        }
        const formData = new FormData();
        formData.append('file', fileToUpload);
        formData.append('businessId', businessId);
        formData.append('purpose', purpose);
        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/upload-public');
        xhr.setRequestHeader('Authorization', `Bearer ${session.access_token}`);
        const response = await new Promise((resolve, reject) => {
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) resolve(JSON.parse(xhr.responseText));
            else reject(new Error(xhr.responseText));
          };
          xhr.onerror = reject;
          xhr.send(formData);
        });
        onUploaded?.(response.url);
      }
    } catch (err) {
      alert('Upload failed: ' + err.message);
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
        multiple={multiple}
        onChange={handleFiles}
        style={{ display: 'none' }}
        accept="image/*"
      />
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        style={{ background: uploading ? '#888' : 'var(--cresoa-accent)', color: '#fff', padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: uploading ? 'not-allowed' : 'pointer', fontWeight: 600 }}
      >
        {uploading ? '⏳ Uploading...' : label}
      </button>
    </div>
  );
}
