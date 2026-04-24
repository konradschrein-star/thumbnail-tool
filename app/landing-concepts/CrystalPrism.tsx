'use client';

import React, { useRef, useMemo, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import {
  MeshTransmissionMaterial,
  Float,
  Text,
  PerspectiveCamera,
  Center
} from '@react-three/drei';
import * as THREE from 'three';
import { motion } from 'framer-motion-3d';
import { motion as motionDom } from 'framer-motion';
import LoginForm from './shared/LoginForm';

function Crystal() {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = state.clock.getElapsedTime() * 0.2;
      meshRef.current.rotation.y = state.clock.getElapsedTime() * 0.3;
    }
  });

  return (
    <mesh ref={meshRef}>
      <octahedronGeometry args={[1, 0]} />
      <MeshTransmissionMaterial
        backside
        backsideThickness={1}
        thickness={2}
        transmission={1}
        chromaticAberration={0.5}
        anisotropy={0.3}
        roughness={0}
        distortion={0.5}
        distortionScale={0.5}
        temporalDistortion={0.1}
        clearcoat={1}
        attenuationDistance={0.5}
        attenuationColor="#ffffff"
        color="#e2e8f0"
      />
    </mesh>
  );
}

function FloatingThumbnails() {
  const count = 8;
  const radius = 5;

  return (
    <group>
      {Array.from({ length: count }).map((_, i) => {
        const angle = (i / count) * Math.PI * 2;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        const z = -2;

        return (
          <Float
            key={i}
            speed={2}
            rotationIntensity={1}
            floatIntensity={2}
            position={[x, y, z]}
          >
            <mesh>
              <planeGeometry args={[2, 1.2]} />
              <meshBasicMaterial
                color="#222"
                transparent
                opacity={0.2}
                side={THREE.DoubleSide}
              />
            </mesh>
          </Float>
        );
      })}
    </group>
  );
}

function Scene() {
  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 0, 5]} fov={50} />
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <pointLight position={[-10, -5, 5]} intensity={0.5} color="#60a5fa" />
      <spotLight position={[0, 10, 0]} angle={0.3} intensity={0.5} color="#e2e8f0" />

      <Center>
        <Crystal />
      </Center>

      <FloatingThumbnails />

      {/* Background Particles */}
      <mesh position={[0, 0, -10]}>
        <planeGeometry args={[50, 50]} />
        <meshBasicMaterial color="#000" />
      </mesh>
    </>
  );
}

export default function CrystalPrism() {
  return (
    <div className="prism-container">
      <div className="canvas-wrapper">
        <Canvas dpr={[1, 2]} gl={{ antialias: true }}>
          <Suspense fallback={null}>
            <Scene />
          </Suspense>
        </Canvas>
      </div>

      <div className="content">
        <motionDom.header
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="hero"
        >
          <div className="premium-label">Titan Engine v2.0</div>
          <h1 className="title">Crystal <br />Prism.</h1>
          <p className="subtitle">High-fidelity thumbnail synthesis through refined geometric optimization.</p>
        </motionDom.header>

        <LoginForm variant="glass" className="prism-login" />
      </div>

      <style jsx>{`
        .prism-container {
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
          gap: 4rem;
          pointer-events: none;
          text-align: center;
          padding: 2rem;
        }

        .hero {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1.5rem;
        }

        .premium-label {
          font-size: 0.75rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.3em;
          color: rgba(255, 255, 255, 0.4);
        }

        .title {
          font-size: clamp(3rem, 10vw, 8rem);
          font-weight: 900;
          line-height: 0.85;
          letter-spacing: -0.05em;
          color: #fff;
          mix-blend-mode: difference;
        }

        .subtitle {
          font-size: 1.1rem;
          color: rgba(255, 255, 255, 0.5);
          max-width: 500px;
          line-height: 1.6;
        }

        .prism-login {
          pointer-events: auto;
          width: 100%;
          max-width: 420px;
        }
      `}</style>
    </div>
  );
}
