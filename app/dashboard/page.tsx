'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import DashboardLayout from './components/layout/DashboardLayout';
import { type TabType } from './components/layout/Sidebar';
import ChannelList from './components/channels/ChannelList';
import ArchetypeList from './components/archetypes/ArchetypeList';
import GenerateForm from './components/generate/GenerateForm';
import JobHistoryTable from './components/jobs/JobHistoryTable';
import TranslatePage from './translate/page';
import APIDocsPage from './api-docs/page';

function DashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { status } = useSession();
  const [redoData, setRedoData] = useState<any>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  if (status === 'loading') {
    return (
      <div className="status-container">
        <div className="loader"></div>
        <p>Initializing your workspace...</p>
        <style jsx>{`
          .status-container {
            height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            background: #09090b;
            color: #a1a1aa;
            font-family: inherit;
          }
          .loader {
            width: 40px;
            height: 40px;
            border: 3px solid rgba(255, 255, 255, 0.1);
            border-top-color: #ffffff;
            border-radius: 50%;
            animation: spin 1s ease-in-out infinite;
            margin-bottom: 1rem;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (status !== 'authenticated') {
    return null;
  }

  const activeTab = (searchParams.get('tab') as TabType) || 'channels';

  const handleTabChange = (tab: TabType) => {
    if (tab !== 'generate') {
      setRedoData(null);
    }
    router.push(`/dashboard?tab=${tab}`);
  };

  const handleRedo = (job: any) => {
    setRedoData(job);
    router.push('/dashboard?tab=generate');
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'channels':
        return <ChannelList />;
      case 'archetypes':
        return <ArchetypeList />;
      case 'generate':
        return <GenerateForm initialData={redoData} />;
      case 'history':
        return <JobHistoryTable onRedo={handleRedo} />;
      case 'translate':
        return <TranslatePage />;
      case 'api-docs':
        return <APIDocsPage />;
      default:
        return <ChannelList />;
    }
  };

  return (
    <DashboardLayout>
      <div className="content-wrapper">
        <div className="tab-content">{renderTabContent()}</div>
      </div>
      <style jsx>{`
        .content-wrapper {
          max-width: 1400px;
          margin: 0 auto;
          width: 100%;
        }
        .tab-content {
          margin-top: 1.5rem;
          animation: slideUp 0.4s ease-out;
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </DashboardLayout>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="fallback-container">
          <div className="pulse-loader"></div>
          <style jsx>{`
            .fallback-container {
              height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
              background: #09090b;
            }
            .pulse-loader {
              width: 50px;
              height: 50px;
              background: #ffffff;
              border-radius: 50%;
              animation: pulse 1.5s ease-in-out infinite;
            }
            @keyframes pulse {
              0% { transform: scale(0.8); opacity: 0.5; }
              50% { transform: scale(1.1); opacity: 0.8; }
              100% { transform: scale(0.8); opacity: 0.5; }
            }
          `}</style>
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
