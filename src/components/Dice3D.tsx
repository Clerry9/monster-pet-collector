import { Canvas, useFrame } from "@react-three/fiber";
import { useRef, useMemo, useEffect } from "react";
import * as THREE from "three";

interface Dice3DProps {
  /** Final face value (1..max). When this changes, the cube re-tumbles and lands on it. */
  value: number;
  /** Tier of dice — affects color/material. */
  tier?: "basic" | "silver" | "gold";
  size?: number;
  className?: string;
  /** Settle duration in ms. Tune to match the host's roll interval. */
  settleMs?: number;
  /** Disable the WebGL canvas and render a flat fallback. */
  reducedMotion?: boolean;
}

const TIER_COLORS: Record<string, { color: string; emissive: string; metalness: number }> = {
  basic:  { color: "#f5e9d3", emissive: "#3a2a14", metalness: 0.1 },
  silver: { color: "#cfd6e4", emissive: "#202833", metalness: 0.7 },
  gold:   { color: "#f5cf3c", emissive: "#5a3e00", metalness: 0.9 },
};

// Standard dice face-to-rotation map (for face value 1..6)
export const FACE_ROT: Record<number, [number, number, number]> = {
  1: [0, 0, 0],
  2: [Math.PI / 2, 0, 0],
  3: [0, -Math.PI / 2, 0],
  4: [0, Math.PI / 2, 0],
  5: [-Math.PI / 2, 0, 0],
  6: [Math.PI, 0, 0],
};

function Cube({ value, tier, settleMs }: { value: number; tier: "basic" | "silver" | "gold"; settleMs: number }) {
  const ref = useRef<THREE.Group>(null);
  const startRef = useRef<number>(0);
  const fromRot = useRef<THREE.Euler>(new THREE.Euler(0, 0, 0));
  const toRot = useRef<THREE.Euler>(new THREE.Euler(0, 0, 0));

  // Re-target when value changes
  useEffect(() => {
    if (!ref.current) return;
    fromRot.current.copy(ref.current.rotation);
    const face = ((value - 1) % 6) + 1;
    const target = FACE_ROT[face];
    // add a couple of full spins for drama
    toRot.current.set(
      target[0] + Math.PI * 4,
      target[1] + Math.PI * 4,
      target[2] + Math.PI * 2,
    );
    startRef.current = performance.now();
  }, [value]);

  useFrame(() => {
    if (!ref.current) return;
    const elapsed = (performance.now() - startRef.current) / Math.max(150, settleMs);
    const t = Math.min(1, Math.max(0, elapsed));
    // ease-out cubic
    const e = 1 - Math.pow(1 - t, 3);
    ref.current.rotation.x = fromRot.current.x + (toRot.current.x - fromRot.current.x) * e;
    ref.current.rotation.y = fromRot.current.y + (toRot.current.y - fromRot.current.y) * e;
    ref.current.rotation.z = fromRot.current.z + (toRot.current.z - fromRot.current.z) * e;
  });

  const palette = TIER_COLORS[tier];
  const pipMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#1a1a1a" }), []);

  return (
    <group ref={ref}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[1.4, 1.4, 1.4]} />
        <meshStandardMaterial
          color={palette.color}
          emissive={palette.emissive}
          emissiveIntensity={0.1}
          metalness={palette.metalness}
          roughness={0.35}
        />
      </mesh>
      {/* Six face pip groups */}
      <Pips face={1} mat={pipMat} />
      <Pips face={2} mat={pipMat} />
      <Pips face={3} mat={pipMat} />
      <Pips face={4} mat={pipMat} />
      <Pips face={5} mat={pipMat} />
      <Pips face={6} mat={pipMat} />
    </group>
  );
}

function Pips({ face, mat }: { face: number; mat: THREE.Material }) {
  // Position each face just outside the cube surface
  const half = 0.71;
  const transforms: Record<number, { pos: [number, number, number]; rot: [number, number, number] }> = {
    1: { pos: [0, 0,  half], rot: [0, 0, 0] },
    2: { pos: [0, 0, -half], rot: [0, Math.PI, 0] },
    3: { pos: [ half, 0, 0], rot: [0, Math.PI / 2, 0] },
    4: { pos: [-half, 0, 0], rot: [0, -Math.PI / 2, 0] },
    5: { pos: [0,  half, 0], rot: [-Math.PI / 2, 0, 0] },
    6: { pos: [0, -half, 0], rot: [Math.PI / 2, 0, 0] },
  };
  const t = transforms[face];
  const layout: Record<number, [number, number][]> = {
    1: [[0, 0]],
    2: [[-0.35, -0.35], [0.35, 0.35]],
    3: [[-0.35, -0.35], [0, 0], [0.35, 0.35]],
    4: [[-0.35, -0.35], [0.35, 0.35], [-0.35, 0.35], [0.35, -0.35]],
    5: [[-0.35, -0.35], [0.35, 0.35], [-0.35, 0.35], [0.35, -0.35], [0, 0]],
    6: [[-0.35, -0.45], [0.35, -0.45], [-0.35, 0], [0.35, 0], [-0.35, 0.45], [0.35, 0.45]],
  };
  return (
    <group position={t.pos} rotation={t.rot}>
      {layout[face].map(([x, y], i) => (
        <mesh key={i} position={[x, y, 0.01]} material={mat}>
          <circleGeometry args={[0.09, 16]} />
        </mesh>
      ))}
    </group>
  );
}

export function Dice3D({ value, tier = "basic", size = 90, className = "", settleMs = 800, reducedMotion = false }: Dice3DProps) {
  if (reducedMotion) {
    const palette = TIER_COLORS[tier];
    return (
      <div
        className={`flex items-center justify-center font-display text-2xl rounded-md border-2 ${className}`}
        style={{
          width: size,
          height: size,
          background: palette.color,
          borderColor: palette.emissive,
          color: "#1a1a1a",
        }}
        aria-label={`Dice showing ${value}`}
        role="img"
        data-testid="dice3d-face"
      >
        {value}
      </div>
    );
  }
  return (
    <div
      className={className}
      style={{ width: size, height: size }}
      aria-label={`Dice showing ${value}`}
      role="img"
    >
      <Canvas camera={{ position: [2, 2, 2.6], fov: 35 }} dpr={[1, 2]}>
        <ambientLight intensity={0.7} />
        <directionalLight position={[3, 4, 2]} intensity={1.0} />
        <Cube value={value} tier={tier} settleMs={settleMs} />
      </Canvas>
    </div>
  );
}
