'use client'

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
// ✅ CORRECT IMPORT: Because SupportContent.jsx is in the same folder
import SupportContent from './SupportContent'; 

export default function SupportPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen text-[var(--cresoa-text)]">Loading Tessa...</div>}>
      <SupportContentWrapper />
    </Suspense>
  );
}

function SupportContentWrapper() {
  const searchParams = useSearchParams();
  const businessId = searchParams.get('business_id');
  return <SupportContent businessId={businessId} />;
}
