'use client';

import { motion } from 'framer-motion';

export type TabType = 'channels' | 'archetypes' | 'generate' | 'history';

interface Tab {
  id: TabType;
  label: string;
  icon: string;
}

interface TabNavigationProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

const tabs: Tab[] = [
  { id: 'channels', label: 'Channels', icon: '📺' },
  { id: 'archetypes', label: 'Archetypes', icon: '🎨' },
  { id: 'generate', label: 'Generate', icon: '✨' },
  { id: 'history', label: 'History', icon: '📋' },
];

export default function TabNavigation({ activeTab, onTabChange }: TabNavigationProps) {
  return (
    <nav className="tab-nav">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`tab-button ${isActive ? 'active' : ''}`}
          >
            <span className="tab-icon">{tab.icon}</span>
            <span className="tab-label">{tab.label}</span>
            {isActive && (
              <motion.div
                layoutId="activeTab"
                className="active-indicator"
                transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
              />
            )}
          </button>
        );
      })}

      <style jsx>{`
        .tab-nav {
          display: flex;
          gap: 0.5rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          margin-bottom: 2rem;
          padding-bottom: 0;
          position: relative;
        }

        .tab-button {
          position: relative;
          padding: 0.875rem 1.5rem;
          display: flex;
          align-items: center;
          gap: 0.625rem;
          background: transparent;
          border: none;
          color: #64748b;
          font-size: 0.9375rem;
          font-weight: 500;
          cursor: pointer;
          transition: color 0.2s ease;
          border-radius: 8px 8px 0 0;
          outline: none;
        }

        .tab-button:hover {
          color: #f1f5f9;
        }

        .tab-button.active {
          color: #3b82f6;
          font-weight: 600;
        }

        .tab-icon {
          font-size: 1.1rem;
        }

        .active-indicator {
          position: absolute;
          bottom: -1px;
          left: 0;
          right: 0;
          height: 2px;
          background: #3b82f6;
          box-shadow: 0 0 10px rgba(59, 130, 246, 0.5);
          z-index: 1;
        }

        @media (max-width: 640px) {
          .tab-nav {
            overflow-x: auto;
            white-space: nowrap;
            padding-bottom: 4px;
          }
          
          .tab-button {
            padding: 0.75rem 1rem;
          }
        }
      `}</style>
    </nav>
  );
}
