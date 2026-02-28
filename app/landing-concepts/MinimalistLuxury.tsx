'use client';

import React, { useRef, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import {
  Environment,
  Float,
  PerspectiveCamera,
  MeshTransmissionMaterial,
  PresentationControls
} from '@react-three/drei';
import * as THREE from 'three';
import { motion as motionDom } from 'framer-motion';
import LoginForm from './shared/LoginForm';

function AbstractSculpture() {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.getElapsedTime() * 0.15;
      meshRef.current.rotation.x = state.clock.getElapsedTime() * 0.1;
    }
  });

  return (
    <mesh ref={meshRef}>
      <torusKnotGeometry args={[1, 0.3, 128, 32]} />
      <MeshTransmissionMaterial
        backside
        thickness={2}
        transmission={1}
        chromaticAberration={0.1}
        roughness={0.05}
        clearcoat={1}
        color="#fff"
      />
    </mesh>
  );
}

function Scene() {
  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 0, 8]} fov={35} />
      <Environment preset="studio" />
      <ambientLight intensity={0.5} />
      <spotLight position={[10, 10, 10]} intensity={1} />

      <PresentationControls
        global
        config={{ mass: 2, tension: 500 }}
        snap={{ mass: 4, tension: 1500 }}
        rotation={[0, 0, 0]}
        polar={[-Math.PI / 4, Math.PI / 4]}
        azimuth={[-Math.PI / 4, Math.PI / 4]}
      >
        <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
          <AbstractSculpture />
        </Float>
      </PresentationControls>
    </>
  );
}

export default function MinimalistLuxury() {
  return (
    <div className="luxury-container">
      <div className="canvas-wrapper">
        <Canvas dpr={[1, 2]}>
          <Suspense fallback={null}>
            <Scene />
          </Suspense>
        </Canvas>
      </div>

      <div className="content">
        <motionDom.header
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
          className="hero"
        >
          <div className="brand-badge">Fine Art Selection</div>
          <h1 className="title">Minimal <br />Luxury.</h1>
          <p className="subtitle">The silent power of architectural restraint. <br />Engineered for the elite.</p>
        </motionDom.header>

        <LoginForm variant="minimal" className="luxury-login" />
      </div>

      <style jsx>{`
        .luxury-container {
          width: 100vw;
          height: 100vh;
          background: #080808;
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
          justify-content: space-between;
          padding: 6rem 2rem;
          pointer-events: none;
          text-align: center;
        }

        .hero {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2rem;
        }

        .brand-badge {
          font-size: 0.7rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.6em;
          color: rgba(255, 255, 255, 0.3);
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          padding-bottom: 0.5rem;
        }

        .title {
          font-size: clamp(3rem, 8vw, 6rem);
          font-weight: 300;
          line-height: 1;
          letter-spacing: -0.04em;
          color: #fff;
          text-transform: uppercase;
        }

        .subtitle {
          font-size: 1rem;
          color: rgba(255, 255, 255, 0.3);
          font-weight: 400;
          letter-spacing: 0.05em;
          line-height: 1.8;
          text-transform: uppercase;
        }

        .luxury-login {
          pointer-events: auto;
          width: 100%;
          max-width: 380px;
        }
      `}</style>
    </div>
  );
}
