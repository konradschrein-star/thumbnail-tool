import { Suspense } from 'react';
import JobDetailView from './components/JobDetailView';
import LoadingSkeleton from './components/LoadingSkeleton';

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <JobDetailView jobId={id} />
    </Suspense>
  );
}
