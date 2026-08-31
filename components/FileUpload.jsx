'use client';

import { useState, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function FileUpload({ jobId, businessId, sector = 'printing', onUploadStateChange, label = 'Upload File' }) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  // ─── Client-side image compression using Canvas (no external lib) ───
  const compressImage = async (file, maxSizeKB = 300, maxDimension = 1200) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (e) => {
        const img = new Image();
        img.src = e.target.result;
        img.onload = () => {
          // Calculate new dimensions
          let { width, height } = img;
          if (width > maxDimension || height > maxDimension) {
            const ratio = Math.min(maxDimension / width, maxDimension / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          // Try to keep under maxSizeKB by adjusting quality
          let quality = 0.85;
          let output = canvas.toDataURL('image/jpeg', quality);
          while (output.length > maxSizeKB * 1024 * 4 / 3 && quality > 0.3) { // approx bytes
            quality -= 0.1;
            output = canvas.toDataURL('image/jpeg', quality);
          }

          // Convert to blob
          fetch(output).then(r => r.blob()).then(blob => {
            const compressedFile = new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' });
            resolve(compressedFile);
          }).catch(reject);
        };
        img.onerror = reject;
      };
      reader.onerror = reject;
    });
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    onUploadStateChange?.({ status: 'compressing', progress: 0, message: 'Compressing image...' });

    try {
      // 1. Compress image if it's an image and > 300KB
      let fileToUpload = file;
      if (file.type.startsWith('image/') && file.size > 300 * 1024) {
        fileToUpload = await compressImage(file, 300, 1200);
      }

      // 2. Get session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        onUploadStateChange?.({ status: 'error', progress: 0, message: 'You must be logged in to upload.' });
        setUploading(false);
        return;
      }

      // 3. Upload using XHR for progress tracking
      const formData = new FormData();
      formData.append('file', fileToUpload);
      formData.append('jobId', jobId);
      formData.append('businessId', businessId);
      formData.append('sector', sector);

      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/upload');
      xhr.setRequestHeader('Authorization', `Bearer ${session.access_token}`);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          onUploadStateChange?.({ status: 'uploading', progress: percent, message: 'Uploading...' });
        }
      };

      const response = await new Promise((resolve, reject) => {
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(JSON.parse(xhr.responseText));
          } else {
            let errorMessage = 'Upload failed';
            try { errorMessage = JSON.parse(xhr.responseText).error || errorMessage; } catch (_) {}
            reject(new Error(errorMessage));
          }
        };
        xhr.onerror = () => reject(new Error('Network error during upload'));
        xhr.send(formData);
      });

      // 4. Success
      onUploadStateChange?.({ status: 'success', progress: 100, message: 'Upload complete!' });
      onUploaded?.(response);
    } catch (err) {
      onUploadStateChange?.({ status: 'error', progress: 0, message: err.message || 'Upload failed' });
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
    </div>
  );
}
