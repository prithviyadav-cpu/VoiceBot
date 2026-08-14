'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { useMemo, useRef, type MutableRefObject } from 'react';
import * as THREE from 'three';
import { orbFragmentShader, orbVertexShader } from './shaders';

export type OrbState = 'idle' | 'listening' | 'thinking' | 'speaking';

/** Per-state visual tuning: palette, displacement, spin, and idle floor amplitude. */
const STATE_STYLE: Record<
  OrbState,
  { colors: [string, string, string]; displace: number; spin: number; floor: number }
> = {
  idle: {
    colors: ['#1e3a8a', '#4c1d95', '#22d3ee'],
    displace: 0.16,
    spin: 0.1,
    floor: 0.1,
  },
  listening: {
    colors: ['#0e7490', '#22d3ee', '#a5f3fc'],
    displace: 0.34,
    spin: 0.28,
    floor: 0.16,
  },
  thinking: {
    colors: ['#4c1d95', '#8b5cf6', '#e879f9'],
    displace: 0.24,
    spin: 0.55,
    floor: 0.42,
  },
  speaking: {
    colors: ['#6d28d9', '#e879f9', '#fbbf24'],
    displace: 0.4,
    spin: 0.2,
    floor: 0.3,
  },
};

type MeshProps = {
  state: OrbState;
  levelRef: MutableRefObject<number>;
};

function OrbMesh({ state, levelRef }: MeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  // Smoothed amplitude and lerped colors, so state changes glide rather than snap.
  const ampRef = useRef(0);
  const displaceRef = useRef(STATE_STYLE.idle.displace);
  const colorRefs = useRef<[THREE.Color, THREE.Color, THREE.Color]>([
    new THREE.Color(STATE_STYLE.idle.colors[0]),
    new THREE.Color(STATE_STYLE.idle.colors[1]),
    new THREE.Color(STATE_STYLE.idle.colors[2]),
  ]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uAmp: { value: 0 },
      uNoiseScale: { value: 1.35 },
      uDisplace: { value: STATE_STYLE.idle.displace },
      uColorA: { value: colorRefs.current[0] },
      uColorB: { value: colorRefs.current[1] },
      uColorC: { value: colorRefs.current[2] },
      uOpacity: { value: 1 },
    }),
    [],
  );

  const targets = useMemo(
    () =>
      STATE_STYLE[state].colors.map((c) => new THREE.Color(c)) as [
        THREE.Color,
        THREE.Color,
        THREE.Color,
      ],
    [state],
  );

  useFrame((_, delta) => {
    const material = materialRef.current;
    const mesh = meshRef.current;
    if (!material || !mesh) return;

    const style = STATE_STYLE[state];
    // Frame-rate independent smoothing factor.
    const k = 1 - Math.exp(-delta * 6);

    // While speaking there is no mic input, so drive the surface from a
    // synthetic pulse instead of the (silent) analyser.
    const driven =
      state === 'speaking'
        ? style.floor + Math.abs(Math.sin(performance.now() / 190)) * 0.45
        : Math.max(levelRef.current, style.floor);

    ampRef.current += (driven - ampRef.current) * k;
    displaceRef.current += (style.displace - displaceRef.current) * k;

    material.uniforms.uTime.value += delta;
    material.uniforms.uAmp.value = ampRef.current;
    material.uniforms.uDisplace.value = displaceRef.current;

    for (let i = 0; i < 3; i += 1) {
      colorRefs.current[i].lerp(targets[i], k);
    }

    mesh.rotation.y += delta * style.spin;
    mesh.rotation.x += delta * style.spin * 0.35;

    const scale = 1 + ampRef.current * 0.11;
    mesh.scale.setScalar(scale);
  });

  return (
    <mesh ref={meshRef}>
      {/* Detail 64 gives enough vertices for smooth noise displacement. */}
      <icosahedronGeometry args={[1.25, 64]} />
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        vertexShader={orbVertexShader}
        fragmentShader={orbFragmentShader}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

/** A second, larger shell that reads as an atmospheric halo. */
function OrbHalo({ state, levelRef }: MeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const ampRef = useRef(0);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uAmp: { value: 0 },
      uNoiseScale: { value: 0.7 },
      uDisplace: { value: 0.5 },
      uColorA: { value: new THREE.Color('#1e1b4b') },
      uColorB: { value: new THREE.Color('#7c3aed') },
      uColorC: { value: new THREE.Color('#22d3ee') },
      uOpacity: { value: 0.22 },
    }),
    [],
  );

  useFrame((_, delta) => {
    const material = materialRef.current;
    const mesh = meshRef.current;
    if (!material || !mesh) return;

    const style = STATE_STYLE[state];
    const k = 1 - Math.exp(-delta * 3.5);
    const driven = state === 'speaking' ? style.floor : Math.max(levelRef.current, style.floor);
    ampRef.current += (driven - ampRef.current) * k;

    material.uniforms.uTime.value += delta * 0.45;
    material.uniforms.uAmp.value = ampRef.current;
    mesh.rotation.y -= delta * 0.09;
  });

  return (
    <mesh ref={meshRef} scale={1.72}>
      <icosahedronGeometry args={[1.25, 24]} />
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        vertexShader={orbVertexShader}
        fragmentShader={orbFragmentShader}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

type VoiceOrbProps = {
  state: OrbState;
  levelRef: MutableRefObject<number>;
  className?: string;
};

export function VoiceOrb({ state, levelRef, className }: VoiceOrbProps) {
  return (
    <div className={className}>
      <Canvas
        camera={{ position: [0, 0, 4.2], fov: 46 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
        // The scene is decorative; the surrounding UI carries the semantics.
        aria-hidden="true"
      >
        <ambientLight intensity={0.6} />
        <OrbHalo state={state} levelRef={levelRef} />
        <OrbMesh state={state} levelRef={levelRef} />
      </Canvas>
    </div>
  );
}
