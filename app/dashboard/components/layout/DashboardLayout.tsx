'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Sidebar, { type TabType } from './Sidebar';
import { useCredits } from '../../hooks/useCredits';
import { Coins } from 'lucide-react';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('channels');
  const { credits, loading } = useCredits();

  useEffect(() => {
    const tab = (searchParams.get('tab') as TabType) || 'channels';
    setActiveTab(tab);
  }, [searchParams]);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    router.push(`/dashboard?tab=${tab}`);
  };

  const getInitials = (name?: string | null) => {
    if (!name) return 'U';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
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

            <div className="header-right">
              <div className="date-display">
                {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              </div>
              <div className="divider"></div>
              <div className="credits-badge">
                <Coins size={18} className="credits-icon" />
                <span className="credits-amount">
                  {loading ? '...' : (credits !== null ? credits.toLocaleString() : '0')}
                </span>
              </div>
              <div className="divider"></div>
              <div className="user-profile">
                <div className="user-details">
                  <span className="user-name">{session?.user?.name || 'User'}</span>
                  <span className="user-role">{(session?.user as any)?.role || 'Member'}</span>
                </div>
                <div className="user-avatar">
                  {getInitials(session?.user?.name)}
                </div>
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

        .main-wrapper {
          flex: 1;
          margin-left: 300px; /* Explicit fallback */
          margin-left: var(--sidebar-width, 300px);
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

        .header-right {
          display: flex;
          align-items: center;
          gap: 1.5rem;
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
          background: #10b981;
          border-radius: 50%;
          box-shadow: 0 0 8px rgba(16, 185, 129, 0.3);
        }

        .date-display {
          font-size: 0.8125rem;
          color: #71717a;
          font-weight: 500;
        }

        .divider {
          width: 1px;
          height: 24px;
          background: rgba(255, 255, 255, 0.08);
        }

        .credits-badge {
          display: flex;
          align-items: center;
          gap: 0.625rem;
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(37, 99, 235, 0.1) 100%);
          border: 1px solid rgba(59, 130, 246, 0.3);
          padding: 0.5rem 1rem;
          border-radius: 12px;
          transition: all 0.2s ease;
        }

        .credits-badge:hover {
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(37, 99, 235, 0.15) 100%);
          border-color: rgba(59, 130, 246, 0.4);
          transform: translateY(-1px);
        }

        .credits-icon {
          color: #60a5fa;
          flex-shrink: 0;
        }

        .credits-amount {
          font-size: 1.25rem;
          font-weight: 700;
          color: #ffffff;
          font-variant-numeric: tabular-nums;
          line-height: 1;
        }

        .user-profile {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .user-details {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
        }

        .user-name {
          font-size: 0.875rem;
          font-weight: 600;
          color: #f4f4f5;
          line-height: 1;
        }

        .user-role {
          font-size: 0.7rem;
          font-weight: 500;
          color: #71717a;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-top: 0.25rem;
        }

        .user-avatar {
          width: 36px;
          height: 36px;
          background: linear-gradient(135deg, #3f3f46 0%, #18181b 100%);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.875rem;
          font-weight: 700;
          color: #ffffff;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
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
          .user-details {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
