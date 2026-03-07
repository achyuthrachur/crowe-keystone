'use client';

import { use, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface PRDPageProps {
  params: Promise<{ id: string }>;
}

export default function PRDPage({ params }: PRDPageProps) {
  const { id } = use(params);
  const router = useRouter();

  useEffect(() => {
    router.replace(`/projects/${id}?tab=prd`);
  }, [id, router]);

  return null;
}
