'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Sidebar, { type TabType } from './Sidebar';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('channels');

  useEffect(() => {
    const tab = (searchParams.get('tab') as TabType) || 'channels';
    setActiveTab(tab);
  }, [searchParams]);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    router.push(`/dashboard?tab=${tab}`);
  };

  return (
    <div className="dashboard-container">


      <Sidebar activeTab={activeTab} onTabChange={handleTabChange} />

      <div className="main-wrapper">
        <header className="dashboard-header">
          <div className="header-content">
            <div className="status-badge">
              <span className="status-dot"></span>
              System Active
            </div>
            <div className="user-info">
              <div className="date-display">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </div>
            </div>
          </div>
        </header>

        <main className="dashboard-main">
          <div className="content-container">
            {children}
          </div>
        </main>
      </div>

      <style jsx>{`
        .dashboard-container {
          min-height: 100vh;
          background-color: #09090b;
          display: flex;
          position: relative;
          color: #fafafa;
          overflow-x: hidden;
        }

        .background-effects {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 0;
        }

        .main-wrapper {
          flex: 1;
          margin-left: var(--sidebar-width);
          display: flex;
          flex-direction: column;
          position: relative;
          z-index: 10;
        }

        .dashboard-header {
          height: 64px;
          display: flex;
          align-items: center;
          padding: 0 3rem;
          position: sticky;
          top: 0;
          z-index: 40;
          background: rgba(9, 9, 11, 0.7);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }

        .header-content {
          width: 100%;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .status-badge {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.75rem;
          font-weight: 500;
          color: #a1a1aa;
          background: rgba(39, 39, 42, 0.5);
          padding: 0.4rem 0.8rem;
          border-radius: 9999px;
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .status-dot {
          width: 8px;
          height: 8px;
          background: #ffffff;
          border-radius: 50%;
          box-shadow: 0 0 8px rgba(255, 255, 255, 0.3);
        }

        .date-display {
          font-size: 0.875rem;
          color: #64748b;
          font-weight: 500;
        }

        .dashboard-main {
          flex: 1;
          padding: 3rem;
        }

        .content-container {
          max-width: 1400px;
          margin: 0 auto;
        }

        @media (max-width: 768px) {
          .main-wrapper {
            margin-left: 0;
          }
          .dashboard-header {
            padding: 0 1.5rem;
          }
          .dashboard-main {
            padding: 1.5rem;
          }
        }
      `}</style>
    </div>
  );
}
