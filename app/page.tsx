'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import CrystalPrism from './landing-concepts/CrystalPrism';
import MinimalistLuxury from './landing-concepts/MinimalistLuxury';
import LiquidChrome from './landing-concepts/LiquidChrome';
import BentoEvolution from './landing-concepts/BentoEvolution';
import InfiniteLoom from './landing-concepts/InfiniteLoom';

type ConceptId = 'prism' | 'luxury' | 'chrome' | 'bento' | 'loom';

const concepts = [
  { id: 'prism', name: 'Refractor', label: 'Crystal Prism', component: CrystalPrism },
  { id: 'luxury', name: 'Void', label: 'Minimal Luxury', component: MinimalistLuxury },
  { id: 'chrome', name: 'Mercury', label: 'Liquid Chrome', component: LiquidChrome },
  { id: 'bento', name: 'Command', label: 'Bento Evolution', component: BentoEvolution },
  { id: 'loom', name: 'Nexus', label: 'Infinite Loom', component: InfiniteLoom },
] as const;

export default function Home() {
  const [activeConcept, setActiveConcept] = useState<ConceptId>('prism');

  const ActiveComponent = concepts.find(c => c.id === activeConcept)?.component || CrystalPrism;

  return (
    <main className="titan-showcase">
      {/* 3D Viewport */}
      <div className="viewport">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeConcept}
            initial={{ opacity: 0, filter: 'blur(20px)' }}
            animate={{ opacity: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, filter: 'blur(20px)' }}
            transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
            className="concept-container"
          >
            <ActiveComponent />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Premium Concept Switcher (Bottom Right) */}
      <nav className="titan-dock">
        <div className="dock-header">
          <span className="dock-label">Experience</span>
          <div className="dock-divider" />
        </div>
        <div className="dock-items">
          {concepts.map((concept) => (
            <button
              key={concept.id}
              onClick={() => setActiveConcept(concept.id as ConceptId)}
              className={`dock-btn ${activeConcept === concept.id ? 'active' : ''}`}
            >
              <div className="btn-content">
                <span className="btn-name">{concept.name}</span>
              </div>
              {activeConcept === concept.id && (
                <motion.div
                  layoutId="active-highlight"
                  className="active-indicator"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
            </button>
          ))}
        </div>
      </nav>

      <style jsx>{`
        .titan-showcase {
          position: relative;
          width: 100vw;
          height: 100vh;
          background: #000;
          overflow: hidden;
        }

        .viewport {
          width: 100%;
          height: 100%;
        }

        .concept-container {
          width: 100%;
          height: 100%;
        }

        .titan-dock {
          position: absolute;
          bottom: 3rem;
          right: 3rem;
          z-index: 1000;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          padding: 1rem;
          border-radius: 24px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(10, 10, 10, 0.5);
          backdrop-filter: blur(40px) saturate(200%);
          box-shadow: 0 40px 80px rgba(0,0,0,0.9), 
                      inset 0 0 0 1px rgba(255,255,255,0.05);
        }

        .dock-header {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 0 0.5rem;
        }

        .dock-label {
          font-size: 0.65rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.2em;
          color: rgba(255, 255, 255, 0.3);
        }

        .dock-divider {
          flex: 1;
          height: 1px;
          background: rgba(255, 255, 255, 0.1);
        }

        .dock-items {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .dock-btn {
          position: relative;
          background: none;
          border: none;
          padding: 0.6rem 1rem;
          cursor: pointer;
          color: rgba(255, 255, 255, 0.4);
          font-weight: 700;
          font-size: 0.8rem;
          text-align: left;
          transition: all 0.3s cubic-bezier(0.22, 1, 0.36, 1);
          border-radius: 12px;
        }

        .dock-btn:hover {
          color: #fff;
          background: rgba(255, 255, 255, 0.03);
          transform: translateX(5px);
        }

        .dock-btn.active {
          color: #fff;
          background: rgba(255, 255, 255, 0.08);
          box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        }

        .btn-content {
          position: relative;
          z-index: 2;
        }

        .active-indicator {
          position: absolute;
          inset: 0;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          z-index: 1;
          background: rgba(255, 255, 255, 0.05);
        }

        @media (max-width: 900px) {
          .titan-dock {
            bottom: 2rem;
            right: 0;
            left: 0;
            margin: 0 1rem;
            flex-direction: row;
            align-items: center;
            border-radius: 999px;
            padding: 0.5rem;
          }
          .dock-header { display: none; }
          .dock-items { flex-direction: row; width: 100%; justify-content: space-around; }
          .dock-btn { text-align: center; font-size: 0.7rem; padding: 0.5rem; }
          .dock-btn:hover { transform: none; }
        }
      `}</style>
    </main>
  );
}
