'use client';

import { Suspense } from 'react';

import WikiIndex from '@/app/wiki/components/WikiIndex';

export default function WikiPage() {
  return (
    <Suspense fallback={<div className='full-height bg-base-200' />}>
      <WikiIndex />
    </Suspense>
  );
}
