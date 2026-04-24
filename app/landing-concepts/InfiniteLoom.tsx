'use client';

import React, { useRef, useMemo, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import {
  Points,
  PointMaterial,
  Float,
  Line,
  PerspectiveCamera
} from '@react-three/drei';
import * as THREE from 'three';
import { motion as motionDom } from 'framer-motion';
import LoginForm from './shared/LoginForm';


class CanvasErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: Error) {
    console.warn('WebGL/Canvas failed, rendering without 3D background:', error.message);
  }
  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

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
        size={0.06}
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
          color="#8b5cf6"
          lineWidth={0.8}
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
      <ambientLight intensity={0.3} />
      <pointLight position={[10, 10, 10]} intensity={0.5} color="#8b5cf6" />
      <pointLight position={[-10, -10, -10]} intensity={0.3} color="#4c1d95" />
      <LoomParticles />
      <LoomConnections />
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
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          className="hero"
        >
          <h1 className="title">The Thumbnail Tool</h1>
        </motionDom.header>

        <LoginForm variant="liquid" className="loom-login" />
      </div>

      <style jsx>{`
        .loom-container {
          width: 100vw;
          height: 100vh;
          background: #020205;
          position: relative;
          overflow: hidden;
          font-family: 'Times New Roman', Times, serif;
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
          gap: clamp(2rem, 10vh, 5rem);
          pointer-events: none;
          text-align: center;
        }

        .hero {
          pointer-events: auto;
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
          font-size: clamp(2rem, 7vw, 4.5rem);
          font-weight: 400;
          font-style: italic;
          line-height: 1.1;
          letter-spacing: -0.01em;
          color: #fff;
          white-space: nowrap;
          filter: drop-shadow(0 0 40px rgba(168, 85, 247, 0.4));
          margin-bottom: 0.5rem;
          font-family: 'Times New Roman', Times, serif;
        }

        @media (max-width: 768px) {
          .title {
            font-size: clamp(1.8rem, 10vw, 3rem);
            white-space: normal;
            line-height: 1.2;
            padding: 0 1rem;
          }
          .hero {
            gap: 1rem;
          }
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
