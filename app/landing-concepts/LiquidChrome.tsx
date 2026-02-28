'use client';

import React, { useRef, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import {
  MeshDistortMaterial,
  Environment,
  Float,
  PerspectiveCamera,
  ContactShadows
} from '@react-three/drei';
import * as THREE from 'three';
import { motion as motionDom } from 'framer-motion';
import LoginForm from './shared/LoginForm';

function MercuryPool() {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.z = state.clock.getElapsedTime() * 0.1;
    }
  });

  return (
    <mesh ref={meshRef} position={[0, -1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[20, 20, 64, 64]} />
      <MeshDistortMaterial
        color="#ffffff"
        speed={2}
        distort={0.4}
        radius={1}
        metalness={1}
        roughness={0.05}
      />
    </mesh>
  );
}

function FloatingOrbs() {
  return (
    <group>
      {[...Array(5)].map((_, i) => (
        <Float
          key={i}
          speed={3}
          rotationIntensity={2}
          floatIntensity={2}
          position={[
            (Math.random() - 0.5) * 10,
            Math.random() * 5,
            (Math.random() - 0.5) * 5
          ]}
        >
          <mesh>
            <sphereGeometry args={[Math.random() * 0.5 + 0.2, 32, 32]} />
            <meshStandardMaterial
              color="#fff"
              metalness={1}
              roughness={0}
              envMapIntensity={2}
            />
          </mesh>
        </Float>
      ))}
    </group>
  );
}

function Scene() {
  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 2, 8]} fov={45} />
      <Environment preset="night" />
      <ambientLight intensity={0.2} />
      <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={2} castShadow />

      <MercuryPool />
      <FloatingOrbs />

      <ContactShadows
        position={[0, -1.5, 0]}
        opacity={0.75}
        scale={20}
        blur={2.5}
        far={4}
      />
    </>
  );
}

export default function LiquidChrome() {
  return (
    <div className="chrome-container">
      <div className="canvas-wrapper">
        <Canvas shadows dpr={[1, 2]}>
          <Suspense fallback={null}>
            <Scene />
          </Suspense>
        </Canvas>
      </div>

      <div className="content">
        <motionDom.header
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          className="hero"
        >
          <div className="premium-label">Malleable Intelligence</div>
          <h1 className="title">Liquid <br />Mercury.</h1>
          <p className="subtitle">Infinite output through fluid architectural dynamics.</p>
        </motionDom.header>

        <LoginForm variant="liquid" className="chrome-login" />
      </div>

      <style jsx>{`
        .chrome-container {
          width: 100vw;
          height: 100vh;
          background: #000;
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
          gap: 5rem;
          pointer-events: none;
          padding: 2rem;
        }

        .hero {
          text-align: center;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .premium-label {
          font-size: 0.8rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.4em;
          color: #444;
          background: linear-gradient(90deg, #444, #fff, #444);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-size: 200% 100%;
          animation: shine 3s linear infinite;
        }

        @keyframes shine {
          to { background-position: 200% center; }
        }

        .title {
          font-size: clamp(3rem, 12vw, 9rem);
          font-weight: 900;
          line-height: 0.8;
          letter-spacing: -0.06em;
          color: #fff;
          text-shadow: 0 0 40px rgba(255,255,255,0.1);
        }

        .subtitle {
          font-size: 1.2rem;
          color: rgba(255, 255, 255, 0.3);
          font-weight: 500;
          letter-spacing: 0.05em;
        }

        .chrome-login {
          pointer-events: auto;
          width: 100%;
          max-width: 440px;
        }
      `}</style>
    </div>
  );
}
