'use client';

import { motion } from 'framer-motion';
import { ArrowRight, Zap, Database, Layout, Search, Book, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { GridPattern } from './dashboard/components/ui/grid-pattern';

export default function Home() {
  return (
    <main className="landing-container">
      <div className="background-effects">
        <GridPattern
          width={60}
          height={60}
          x={-1}
          y={-1}
          className="opacity-10"
        />
      </div>

      <div className="content-inner">
        <header className="hero">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="hero-badge"
          >
            <Zap size={14} className="icon-pulse" />
            <span>v2.0 Performance UI</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.6 }}
            className="hero-title"
          >
            Thumbnail Creator
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="hero-subtitle"
          >
            YouTube thumbnail generation engine powered by Google's Nano Banana API.
            Synthesized for speed, precision, and architectural elegance.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="cta-group"
          >
            <Link href="/dashboard" className="primary-btn">
              Open Command Center
              <ArrowRight size={18} />
            </Link>
          </motion.div>
        </header>

        <section className="features-grid">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="feature-card"
          >
            <div className="feature-icon"><Zap size={24} /></div>
            <h3>Core Engine</h3>
            <p>Phase 1 complete. High-performance generation synthesized with local worker nodes.</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="feature-card"
          >
            <div className="feature-icon"><Database size={24} /></div>
            <h3>Data Layer</h3>
            <p>Phase 2 complete. Robust Prisma-backed storage with optimized API endpoints.</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            className="feature-card"
          >
            <div className="feature-icon"><Layout size={24} /></div>
            <h3>Dashboard</h3>
          </motion.div>
        </section>

        <footer className="footer">
          <p>&copy; 2026 Schreiner Content Systems LLC. Built for elite creators.</p>
        </footer>
      </div>

      <style jsx>{`
        .landing-container {
          min-height: 100vh;
          background-color: #000000;
          color: #ffffff;
          position: relative;
          overflow-x: hidden;
          font-family: var(--font-inter, sans-serif);
        }

        .background-effects {
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 0;
        }

        .content-inner {
          position: relative;
          z-index: 10;
          max-width: 1200px;
          margin: 0 auto;
          padding: 4rem 2rem;
          display: flex;
          flex-direction: column;
          gap: 6rem;
        }

        .hero {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding-top: 4rem;
        }

        .hero-badge {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          padding: 0.5rem 1rem;
          border-radius: 999px;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #a1a1aa;
          margin-bottom: 2rem;
        }

        .icon-pulse {
          color: #ffffff;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.2); opacity: 0.7; }
          100% { transform: scale(1); opacity: 1; }
        }

        .hero-title {
          font-size: clamp(3rem, 10vw, 6rem);
          font-weight: 800;
          letter-spacing: -0.04em;
          line-height: 1;
          margin-bottom: 1.5rem;
          background: linear-gradient(to bottom, #ffffff 0%, #a1a1aa 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .hero-subtitle {
          font-size: 1.25rem;
          color: #71717a;
          max-width: 600px;
          line-height: 1.6;
          margin-bottom: 3rem;
        }

        .cta-group {
          display: flex;
          gap: 1rem;
        }

        .primary-btn {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          background: #ffffff;
          color: #000000;
          padding: 1rem 2rem;
          border-radius: 12px;
          font-weight: 700;
          font-size: 1.1rem;
          transition: all 0.2s ease;
          text-decoration: none;
        }

        .primary-btn:hover {
          background: #e4e4e7;
          transform: translateY(-2px);
          box-shadow: 0 10px 20px -10px rgba(255, 255, 255, 0.3);
        }

        .features-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 2rem;
        }

        .feature-card {
          padding: 2.5rem;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 24px;
          transition: all 0.3s ease;
        }

        .feature-card:hover {
          background: rgba(255, 255, 255, 0.04);
          border-color: rgba(255, 255, 255, 0.1);
          transform: translateY(-4px);
        }

        .feature-icon {
          width: 48px;
          height: 48px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 1.5rem;
          color: #ffffff;
        }

        .feature-card h3 {
          font-size: 1.25rem;
          font-weight: 700;
          margin-bottom: 1rem;
          color: #ffffff;
        }

        .feature-card p {
          color: #71717a;
          line-height: 1.6;
          font-size: 0.95rem;
        }

        .footer {
          text-align: center;
          padding: 4rem 0;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
          color: #3f3f46;
          font-size: 0.875rem;
        }

        @media (max-width: 768px) {
          .hero-title {
            font-size: 3.5rem;
          }
          .content-inner {
            gap: 4rem;
            padding: 2rem 1.5rem;
          }
        }
      `}</style>
    </main>
  );
}
