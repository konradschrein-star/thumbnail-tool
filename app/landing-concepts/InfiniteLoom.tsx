'use client';

import React, { useRef, useMemo, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import {
  Points,
  PointMaterial,
  Environment,
  Float,
  Line,
  PerspectiveCamera,
  Bloom
} from '@react-three/drei';
import * as THREE from 'three';
import { motion as motionDom } from 'framer-motion';
import LoginForm from './shared/LoginForm';

function LoomParticles() {
  const ref = useRef<THREE.Points>(null);
  const count = 2000;

  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 20;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 20;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 20;
    }
    return pos;
  }, []);

  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.y = state.clock.getElapsedTime() * 0.05;
      ref.current.rotation.x = state.clock.getElapsedTime() * 0.02;
    }
  });

  return (
    <Points ref={ref} positions={positions} stride={3}>
      <PointMaterial
        transparent
        color="#8b5cf6"
        size={0.05}
        sizeAttenuation={true}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </Points>
  );
}

function LoomConnections() {
  const lines = useMemo(() => {
    const l = [];
    for (let i = 0; i < 20; i++) {
      const points = [
        new THREE.Vector3((Math.random() - 0.5) * 15, -10, (Math.random() - 0.5) * 10),
        new THREE.Vector3((Math.random() - 0.5) * 15, 10, (Math.random() - 0.5) * 10)
      ];
      l.push(points);
    }
    return l;
  }, []);

  return (
    <group>
      {lines.map((points, i) => (
        <Line
          key={i}
          points={points}
          color="#3b82f6"
          lineWidth={0.5}
          transparent
          opacity={0.3}
        />
      ))}
    </group>
  );
}

function Scene() {
  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 0, 10]} fov={50} />
      <ambientLight intensity={0.2} />
      <LoomParticles />
      <LoomConnections />
      <Environment preset="night" />
    </>
  );
}

export default function InfiniteLoom() {
  return (
    <div className="loom-container">
      <div className="canvas-wrapper">
        <Canvas dpr={[1, 2]}>
          <Suspense fallback={null}>
            <Scene />
          </Suspense>
        </Canvas>
      </div>

      <div className="content">
        <motionDom.header
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          className="hero"
        >
          <div className="premium-label">Architectural Weave</div>
          <h1 className="title">Infinite <br />Loom.</h1>
          <p className="subtitle">Synthesizing raw data into cinematic visual narratives.</p>
        </motionDom.header>

        <LoginForm variant="glass" className="loom-login" />
      </div>

      <style jsx>{`
        .loom-container {
          width: 100vw;
          height: 100vh;
          background: #020205;
          position: relative;
          overflow: hidden;
          font-family: var(--font-inter), sans-serif;
        }

        .canvas-wrapper {
          position: absolute;
          inset: 0;
          z-index: 1;
        }

        .content {
          position: relative;
          z-index: 10;
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 4rem;
          pointer-events: none;
          text-align: center;
        }

        .hero {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .premium-label {
          font-size: 0.9rem;
          font-weight: 600;
          letter-spacing: 0.5em;
          color: #8b5cf6;
          text-transform: uppercase;
        }

        .title {
          font-size: clamp(3rem, 10vw, 7rem);
          font-weight: 800;
          line-height: 0.9;
          letter-spacing: -0.04em;
          color: #fff;
          background: linear-gradient(to bottom, #fff, #3b82f6);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .subtitle {
          font-size: 1.1rem;
          color: rgba(255, 255, 255, 0.4);
          max-width: 600px;
        }

        .loom-login {
          pointer-events: auto;
          width: 100%;
          max-width: 400px;
        }
      `}</style>
    </div>
  );
}
