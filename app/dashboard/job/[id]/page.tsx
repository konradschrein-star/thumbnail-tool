import { Suspense } from 'react';
import JobDetailView from './components/JobDetailView';

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <JobDetailView jobId={id} />
    </Suspense>
  );
}

function LoadingSkeleton() {
  return (
    <div className="loading-container">
      <div className="loading-spinner"></div>
      <p>Loading job details...</p>

      <style jsx>{`
        .loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 400px;
          gap: 1rem;
        }

        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 3px solid rgba(255, 255, 255, 0.1);
          border-top-color: #ffffff;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        p {
          color: #94a3b8;
          font-size: 0.9375rem;
        }
      `}</style>
    </div>
  );
}
