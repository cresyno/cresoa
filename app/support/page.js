'use client'

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
// Corrected import path: going up 2 levels to the components folder
import SupportContent from '../../components/support/SupportContent';

// The default export wraps the content in Suspense
export default function SupportPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen text-[var(--cresoa-text)]">Loading Tessa...</div>}>
      <SupportContentWrapper />
    </Suspense>
  );
}

// This component uses useSearchParams and is safely inside Suspense
function SupportContentWrapper() {
  const searchParams = useSearchParams();
  const businessId = searchParams.get('business_id');

  // We'll reuse the existing SupportContent component logic
  return <SupportContent businessId={businessId} />;
}
