import { redirect } from 'next/navigation';

interface PRDPageProps {
  params: Promise<{ id: string }>;
}

export default async function PRDPage({ params }: PRDPageProps) {
  const { id } = await params;
  redirect(`/projects/${id}?tab=prd`);
}
