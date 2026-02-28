'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Tv,
  Palette,
  Sparkles,
  History,
  ChevronLeft,
  LayoutDashboard,
  Languages,
  BookOpen
} from 'lucide-react';

export type TabType = 'channels' | 'archetypes' | 'generate' | 'history' | 'translate' | 'api-docs';

interface SidebarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

const navItems: { id: TabType; label: string; icon: React.ReactNode }[] = [
  { id: 'channels', label: 'Channels', icon: <Tv size={18} /> },
  { id: 'archetypes', label: 'Archetypes', icon: <Palette size={18} /> },
  { id: 'generate', label: 'Generate', icon: <Sparkles size={18} /> },
  { id: 'history', label: 'History', icon: <History size={18} /> },
  { id: 'translate', label: 'Translate', icon: <Languages size={18} /> },
  { id: 'api-docs', label: 'API Docs', icon: <BookOpen size={18} /> },
];

export default function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  const router = useRouter();

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="logo-container">
          <div className="logo-icon-wrapper">
            <LayoutDashboard className="logo-icon" size={24} />
          </div>
          <div>
            <h1 className="logo-text">Titan</h1>
            <span className="logo-subtext">Thumbnail Studio</span>
          </div>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-group">
          <div className="nav-group-label">Tools</div>
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>

              {activeTab === item.id && (
                <motion.div
                  layoutId="sidebar-active-indicator"
                  className="active-bg"
                  initial={false}
                  transition={{
                    type: "spring",
                    stiffness: 380,
                    damping: 30
                  }}
                />
              )}
            </button>
          ))}
        </div>
      </nav>

      <div className="sidebar-footer">
        <button onClick={() => router.push('/')} className="back-button">
          <ChevronLeft size={16} />
          <span>Main Menu</span>
        </button>
      </div>

      <style jsx>{`
        .sidebar {
          width: var(--sidebar-width);
          height: 100vh;
          position: fixed;
          left: 0;
          top: 0;
          display: flex;
          flex-direction: column;
          background: rgba(9, 9, 11, 0.4);
          backdrop-filter: blur(20px);
          border-right: 1px solid rgba(255, 255, 255, 0.05);
          z-index: 50;
          transition: all 0.3s ease;
        }

        .sidebar-header {
          padding: 2.5rem 1.5rem;
        }

        .logo-container {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .logo-icon-wrapper {
          width: 40px;
          height: 40px;
          background: linear-gradient(135deg, #ffffff 0%, #e4e4e7 100%);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #09090b;
          box-shadow: 0 4px 12px rgba(255, 255, 255, 0.1);
        }

        .logo-text {
          font-size: 1.125rem;
          font-weight: 800;
          color: #f8fafc;
          letter-spacing: -0.02em;
          line-height: 1;
        }

        .logo-subtext {
          font-size: 0.65rem;
          color: #94a3b8;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }

        .sidebar-nav {
          flex: 1;
          padding: 1rem 1rem;
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        .nav-group-label {
          padding: 0 1rem 0.75rem;
          font-size: 0.7rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: #475569;
        }

        .nav-item {
          display: flex;
          align-items: center;
          padding: 0.85rem 1rem;
          border-radius: 12px;
          background: transparent;
          border: none;
          cursor: pointer;
          color: #94a3b8;
          transition: all 0.2s ease;
          position: relative;
          text-align: left;
          width: 100%;
          z-index: 1;
          margin-bottom: 0.25rem;
        }

        .nav-item:hover {
          color: #f8fafc;
        }

        .nav-item.active {
          color: #ffffff;
          font-weight: 600;
        }

        .nav-icon {
          margin-right: 0.85rem;
          z-index: 2;
        }

        .nav-label {
          font-size: 0.9375rem;
          z-index: 2;
        }

        .active-bg {
          position: absolute;
          inset: 0;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          z-index: 0;
        }

        .sidebar-footer {
          padding: 1.5rem;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
        }

        .back-button {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 10px;
          padding: 0.75rem 1rem;
          width: 100%;
          color: #94a3b8;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          transition: all 0.2s ease;
        }

        .back-button:hover {
          background: rgba(255, 255, 255, 0.05);
          color: #f8fafc;
          border-color: rgba(255, 255, 255, 0.1);
          transform: translateY(-1px);
        }
      `}</style>
    </aside>
  );
}
