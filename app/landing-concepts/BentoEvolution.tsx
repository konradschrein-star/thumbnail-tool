'use client';

import React, { useState, useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import LoginForm from './shared/LoginForm';

export default function BentoEvolution() {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseXSpring = useSpring(x);
  const mouseYSpring = useSpring(y);

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["10deg", "-10deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-10deg", "10deg"]);

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;
    x.set(xPct);
    y.set(yPct);
  };

  const tiles = [
    { id: 1, type: 'image', src: '/archetypes/archetype.jpeg', size: 'large' },
    { id: 2, type: 'image', src: '/archetypes/archetype2.jpg', size: 'small' },
    { id: 3, type: 'brand', content: 'TITAN v3.0', size: 'small' },
    { id: 4, type: 'image', src: '/archetypes/archetype3.jpeg', size: 'medium' },
    { id: 5, type: 'image', src: '/archetypes/archetype4.jpeg', size: 'small' },
    { id: 6, type: 'image', src: '/archetypes/archetype5.jpeg', size: 'medium' },
  ];

  return (
    <div className="bento-container" onMouseMove={handleMouseMove}>
      <motion.div
        style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
        className="bento-perspective-wrapper"
      >
        <div className="bento-grid">
          {/* Left Section */}
          <div className="bento-left">
            <motion.div
              style={{ transform: "translateZ(50px)" }}
              className="info-tile"
            >
              <div className="badge">Titan Edition</div>
              <h1>Bento <br />Evolution</h1>
              <p>The holographic workspace for elite computational design.</p>
            </motion.div>

            <motion.div
              style={{ transform: "translateZ(30px)" }}
              className="login-tile"
            >
              <LoginForm variant="glass" className="bento-login" />
            </motion.div>
          </div>

          {/* Right Section */}
          <div className="bento-right">
            {tiles.map((tile, i) => (
              <motion.div
                key={tile.id}
                style={{ transform: i % 2 === 0 ? "translateZ(60px)" : "translateZ(40px)" }}
                whileHover={{ translateZ: 100 }}
                className={`tile ${tile.size} ${tile.type}`}
              >
                {tile.type === 'image' && <img src={tile.src} alt="Sample" />}
                {tile.type === 'brand' && <span>{tile.content}</span>}
                <div className="glow-border" />
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>

      <style jsx>{`
        .bento-container {
          min-height: 100vh;
          background: #000;
          perspective: 1500px;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          font-family: var(--font-inter), sans-serif;
        }

        .bento-perspective-wrapper {
          width: 100%;
          max-width: 1400px;
          padding: 4rem;
        }

        .bento-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 3rem;
        }

        .bento-left {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        .info-tile {
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 40px;
          padding: 4rem;
          box-shadow: 0 40px 100px rgba(0,0,0,0.5);
        }

        .badge {
          display: inline-block;
          padding: 0.5rem 1.2rem;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 99px;
          font-size: 0.8rem;
          font-weight: 800;
          color: #fff;
          margin-bottom: 2rem;
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }

        h1 {
          font-size: clamp(3rem, 6vw, 5rem);
          font-weight: 900;
          line-height: 1;
          letter-spacing: -0.05em;
          color: #fff;
          margin-bottom: 1.5rem;
        }

        p {
          color: rgba(255, 255, 255, 0.4);
          font-size: 1.25rem;
          line-height: 1.6;
        }

        .bento-right {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          grid-auto-rows: 220px;
          gap: 2rem;
        }

        .tile {
          position: relative;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 32px;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: border-color 0.3s;
        }

        .tile:hover {
          border-color: rgba(255, 255, 255, 0.3);
        }

        .large { grid-column: span 2; grid-row: span 2; }
        .medium { grid-row: span 2; }
        .small { grid-row: span 1; }

        .tile img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          opacity: 0.4;
          transition: opacity 0.5s, transform 0.5s;
        }

        .tile:hover img {
          opacity: 1;
          transform: scale(1.1);
        }

        .brand {
          background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
          color: #fff;
          font-weight: 900;
          font-size: 1.5rem;
        }

        .glow-border {
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at center, rgba(139, 92, 246, 0.2), transparent 70%);
          opacity: 0;
          transition: opacity 0.3s;
          pointer-events: none;
        }

        .tile:hover .glow-border {
          opacity: 1;
        }

        @media (max-width: 1024px) {
          .bento-grid { grid-template-columns: 1fr; }
          .bento-perspective-wrapper { padding: 2rem; }
        }
      `}</style>
    </div>
  );
}
