import React, { useRef, useMemo, useState, useEffect, Suspense } from "react";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { OrbitControls, Text, Float, Billboard } from "@react-three/drei";
import { TOUCH } from "three";
import * as THREE from "three";
import { BOARD_TILES, BoardTile, TileType } from "@/hooks/useGameState";
import { Monster } from "@/data/monsters";
import { BoardMinimap } from "./BoardMinimap";
import { LevelTransitionCinematic } from "./LevelTransitionCinematic";
import { getCameraSettings, subscribeCameraSettings, type CameraSettings } from "@/lib/cameraSettings";

function useCameraSettings(): CameraSettings {
  const [s, setS] = useState<CameraSettings>(() => getCameraSettings());
  useEffect(() => subscribeCameraSettings(() => setS(getCameraSettings())), []);
  return s;
}

// Warm cartoon-casino palette
const TILE_ACCENT: Record<TileType, string> = {
  coins: "#F5B324",
  bonus: "#E63946",
  chest: "#D97706",
  food: "#F472B6",
  skull: "#7C2D12",
  star: "#FCD34D",
};

// ---- Per-level themes ----
// Each level retints the world: wood/structure color, grass, dirt, water, sky, particles, decorations.
export type LevelMaterial = "wood" | "crystal" | "stone" | "bone" | "marble" | "obsidian" | "void" | "celestial";

export interface LevelTheme3D {
  material: LevelMaterial;
  // Structural (replaces what was "wood"-toned: trunks, base rings, accent ring stroke etc.)
  structure: string;
  structureDark: string;
  emissive: string;
  emissiveIntensity: number;
  metalness: number;
  roughness: number;
  // Ground
  grassLight: string;
  grassDark: string;
  dirt: string;
  rock: string;
  rockDark: string;
  // Atmosphere
  bg: string;
  fog: string;
  ocean: string;
  oceanEmissive: string;
  ringColor: string;
  particle: string;
  ambient: string;
  directional: string;
  // Foliage variant
  foliage: "palm" | "crystal" | "ember" | "deadTree" | "cloud" | "dragonFern" | "voidSpire" | "celestialOrb";
}

const LEVEL_THEMES: Record<number, LevelTheme3D> = {
  // 1 - Goblin Forest (default warm wood)
  1: {
    material: "wood",
    structure: "#8B4A24", structureDark: "#5C2E14",
    emissive: "#000000", emissiveIntensity: 0, metalness: 0.1, roughness: 0.8,
    grassLight: "#A3D977", grassDark: "#6BAA3E",
    dirt: "#A0612C", rock: "#B8956A", rockDark: "#8B6F4A",
    bg: "#F4DCB0", fog: "#F4DCB0",
    ocean: "#5BA3D9", oceanEmissive: "#3A7FB8",
    ringColor: "#F5B324", particle: "#FBE8C0",
    ambient: "#FFF4D6", directional: "#FFE8B0",
    foliage: "palm",
  },
  // 2 - Crystal Caves
  2: {
    material: "crystal",
    structure: "#7DD3FC", structureDark: "#0EA5E9",
    emissive: "#38BDF8", emissiveIntensity: 0.8, metalness: 0.7, roughness: 0.1,
    grassLight: "#A5F3FC", grassDark: "#22D3EE",
    dirt: "#3B82F6", rock: "#1E3A8A", rockDark: "#0F172A",
    bg: "#0C2A4A", fog: "#1E40AF",
    ocean: "#1D4ED8", oceanEmissive: "#7DD3FC",
    ringColor: "#7DD3FC", particle: "#E0F2FE",
    ambient: "#CFFAFE", directional: "#A5F3FC",
    foliage: "crystal",
  },
  // 3 - Lava Peaks
  3: {
    material: "obsidian",
    structure: "#7C2D12", structureDark: "#1C1917",
    emissive: "#F97316", emissiveIntensity: 0.9, metalness: 0.4, roughness: 0.5,
    grassLight: "#FB923C", grassDark: "#9A3412",
    dirt: "#1C1917", rock: "#292524", rockDark: "#0C0A09",
    bg: "#1C0A05", fog: "#451A03",
    ocean: "#DC2626", oceanEmissive: "#FBBF24",
    ringColor: "#FBBF24", particle: "#FB923C",
    ambient: "#FED7AA", directional: "#FB923C",
    foliage: "ember",
  },
  // 4 - Haunted Marsh
  4: {
    material: "bone",
    structure: "#4C1D95", structureDark: "#1E1B4B",
    emissive: "#A855F7", emissiveIntensity: 0.6, metalness: 0.2, roughness: 0.7,
    grassLight: "#86EFAC", grassDark: "#166534",
    dirt: "#1E1B4B", rock: "#312E81", rockDark: "#1E1B4B",
    bg: "#0F0A1E", fog: "#1E1B4B",
    ocean: "#6B21A8", oceanEmissive: "#A855F7",
    ringColor: "#C084FC", particle: "#E9D5FF",
    ambient: "#DDD6FE", directional: "#C4B5FD",
    foliage: "deadTree",
  },
  // 5 - Sky Citadel
  5: {
    material: "marble",
    structure: "#E0E7FF", structureDark: "#6366F1",
    emissive: "#A5B4FC", emissiveIntensity: 0.4, metalness: 0.6, roughness: 0.2,
    grassLight: "#DBEAFE", grassDark: "#93C5FD",
    dirt: "#C7D2FE", rock: "#E0E7FF", rockDark: "#A5B4FC",
    bg: "#BAE6FD", fog: "#DBEAFE",
    ocean: "#60A5FA", oceanEmissive: "#BFDBFE",
    ringColor: "#FBBF24", particle: "#FFFFFF",
    ambient: "#F1F5F9", directional: "#FFFFFF",
    foliage: "cloud",
  },
  // 6 - Dragon's Lair
  6: {
    material: "stone",
    structure: "#FBBF24", structureDark: "#92400E",
    emissive: "#F59E0B", emissiveIntensity: 0.7, metalness: 0.85, roughness: 0.2,
    grassLight: "#FCD34D", grassDark: "#B45309",
    dirt: "#451A03", rock: "#78350F", rockDark: "#451A03",
    bg: "#3F1A05", fog: "#78350F",
    ocean: "#B45309", oceanEmissive: "#F59E0B",
    ringColor: "#FCD34D", particle: "#FDE68A",
    ambient: "#FEF3C7", directional: "#FCD34D",
    foliage: "dragonFern",
  },
  // 7 - Void Realm
  7: {
    material: "void",
    structure: "#52525B", structureDark: "#18181B",
    emissive: "#A1A1AA", emissiveIntensity: 0.3, metalness: 0.5, roughness: 0.6,
    grassLight: "#71717A", grassDark: "#3F3F46",
    dirt: "#27272A", rock: "#18181B", rockDark: "#09090B",
    bg: "#09090B", fog: "#18181B",
    ocean: "#27272A", oceanEmissive: "#71717A",
    ringColor: "#D4D4D8", particle: "#A1A1AA",
    ambient: "#52525B", directional: "#D4D4D8",
    foliage: "voidSpire",
  },
  // 8 - Celestial Plane
  8: {
    material: "celestial",
    structure: "#FEF3C7", structureDark: "#F59E0B",
    emissive: "#FBBF24", emissiveIntensity: 1.0, metalness: 0.9, roughness: 0.05,
    grassLight: "#FEF9C3", grassDark: "#FDE047",
    dirt: "#FCD34D", rock: "#FEF3C7", rockDark: "#FBBF24",
    bg: "#FFFBEB", fog: "#FEF3C7",
    ocean: "#FBBF24", oceanEmissive: "#FFFFFF",
    ringColor: "#FFFFFF", particle: "#FFFFFF",
    ambient: "#FFFFFF", directional: "#FEF9C3",
    foliage: "celestialOrb",
  },
};

function getTheme(levelId: number): LevelTheme3D {
  // Cycle through the 8 available themes so levels above 8 still get unique looks.
  const cycled = ((Math.max(1, levelId) - 1) % 8) + 1;
  return LEVEL_THEMES[cycled] || LEVEL_THEMES[1];
}

/**
 * Continuous, infinite path generator.
 *
 * `pathPointAt(absIdx)` returns a deterministic Vector3 for ANY non-negative integer
 * index. The path always advances forward (monotonic +Z) so the monster never has
 * to "rewind" to the start of the loop. Each level shape simply picks a different
 * sinusoidal X/Y offset for variety.
 */
const TILE_SPACING = 1.6;
function pathPointAt(absIdx: number, levelId: number = 1): THREE.Vector3 {
  const shape = ((Math.max(1, levelId) - 1) % 8) + 1;
  const t = absIdx;
  let x = 0, y = 0, z = 0;
  switch (shape) {
    case 1: // Goblin Forest — gentle zigzag
      x = Math.sin(t * 0.55) * 3.0;
      z = -t * TILE_SPACING;
      y = t * 0.04 + Math.sin(t * 0.7) * 0.1;
      break;
    case 2: // Crystal Caves — wider sinus
      x = Math.sin(t * 0.42) * 4.0;
      z = -t * TILE_SPACING;
      y = t * 0.05;
      break;
    case 3: // Lava Peaks — sharper sawtooth
      x = ((t % 4) - 1.5) * 2.2;
      z = -t * TILE_SPACING;
      y = t * 0.08;
      break;
    case 4: // Haunted Marsh — meander
      x = Math.sin(t * 0.6) * 2.6 + Math.cos(t * 0.27) * 1.0;
      z = -t * TILE_SPACING;
      y = t * 0.03;
      break;
    case 5: // Sky Citadel — wide bridge zigzag
      x = Math.sin(t * 0.5) * 4.5;
      z = -t * TILE_SPACING;
      y = t * 0.06 + Math.sin(t * 0.9) * 0.25;
      break;
    case 6: // Dragon's Lair — figure-8
      x = Math.sin(t * 0.7) * 3.5 + Math.sin(t * 0.23) * 1.2;
      z = -t * TILE_SPACING;
      y = t * 0.07;
      break;
    case 7: // Void Realm — drifting chaos
      x = Math.sin(t * 0.45) * 3.2 + Math.cos(t * 1.1) * 0.7;
      z = -t * TILE_SPACING;
      y = t * 0.05 + Math.sin(t * 0.8) * 0.35;
      break;
    case 8: // Celestial Plane — ascending sinus
      x = Math.sin(t * 0.55) * 3.4;
      z = -t * TILE_SPACING;
      y = t * 0.12 + Math.sin(t * 0.9) * 0.3;
      break;
  }
  return new THREE.Vector3(x, y, z);
}

/** Build a window of contiguous path points around the player's absolute step.
 * WINDOW_BEFORE is generous so trailing tiles stay rendered while the monster
 * mid-hops several tiles forward (avoids islands "disappearing" during a hop).
 */
const WINDOW_BEFORE = 10;
const WINDOW_AFTER = 16;
function buildPathWindow(centerAbs: number, levelId: number, extraBefore = 0): { points: THREE.Vector3[]; startAbs: number } {
  const before = WINDOW_BEFORE + Math.max(0, extraBefore);
  const startAbs = Math.max(0, centerAbs - before);
  const points: THREE.Vector3[] = [];
  for (let i = 0; i < before + WINDOW_AFTER + 1; i++) {
    points.push(pathPointAt(startAbs + i, levelId));
  }
  return { points, startAbs };
}

// --- Animated tile icons ---

function SpinningCoin({ isActive, theme }: { isActive: boolean; theme: LevelTheme3D }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((s) => {
    if (!ref.current) return;
    ref.current.rotation.y = s.clock.elapsedTime * (isActive ? 4 : 1.5);
    ref.current.position.y = 1.1 + Math.sin(s.clock.elapsedTime * 2) * 0.05;
  });
  return (
    <mesh ref={ref} position={[0, 1.1, 0]}>
      <cylinderGeometry args={[0.12, 0.12, 0.03, 24]} />
      <meshStandardMaterial color={theme.ringColor} emissive={theme.emissive} emissiveIntensity={0.6} metalness={0.8} roughness={0.1} />
    </mesh>
  );
}

function GlowingChest({ isActive, theme }: { isActive: boolean; theme: LevelTheme3D }) {
  const groupRef = useRef<THREE.Group>(null);
  const lidRef = useRef<THREE.Mesh>(null);
  useFrame((s) => {
    if (!groupRef.current) return;
    groupRef.current.position.y = 1.0 + Math.sin(s.clock.elapsedTime * 1.5) * 0.03;
    if (lidRef.current && isActive) lidRef.current.rotation.x = -Math.sin(s.clock.elapsedTime * 2) * 0.3;
  });
  return (
    <group ref={groupRef} position={[0, 1.0, 0]}>
      <mesh><boxGeometry args={[0.18, 0.12, 0.14]} /><meshStandardMaterial color={theme.structure} emissive={theme.emissive} emissiveIntensity={theme.emissiveIntensity * 0.3} roughness={theme.roughness} metalness={theme.metalness} /></mesh>
      <mesh ref={lidRef} position={[0, 0.08, 0]}>
        <boxGeometry args={[0.2, 0.05, 0.15]} />
        <meshStandardMaterial color={theme.ringColor} emissive={theme.ringColor} emissiveIntensity={isActive ? 0.8 : 0.2} roughness={0.3} metalness={0.5} />
      </mesh>
      {isActive && <pointLight position={[0, 0.15, 0]} intensity={1.5} color={theme.ringColor} distance={1.2} />}
    </group>
  );
}

function PulsingStar({ isActive, theme }: { isActive: boolean; theme: LevelTheme3D }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((s) => {
    if (!ref.current) return;
    const sc = 1 + Math.sin(s.clock.elapsedTime * 3) * 0.15;
    ref.current.scale.set(sc, sc, sc);
    ref.current.rotation.y = s.clock.elapsedTime * 1.2;
    ref.current.position.y = 1.1 + Math.sin(s.clock.elapsedTime * 2) * 0.08;
  });
  return (
    <mesh ref={ref} position={[0, 1.1, 0]}>
      <octahedronGeometry args={[0.11, 0]} />
      <meshStandardMaterial color={theme.ringColor} emissive={theme.ringColor} emissiveIntensity={isActive ? 1.2 : 0.5} metalness={0.7} roughness={0.1} />
    </mesh>
  );
}

function LightningBolt({ isActive }: { isActive: boolean }) {
  const ref = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.MeshStandardMaterial>(null);
  // Build a stylised lightning bolt shape (zigzag) and extrude it for depth.
  const geometry = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo( 0.04,  0.20);
    shape.lineTo(-0.10,  0.02);
    shape.lineTo(-0.02,  0.02);
    shape.lineTo(-0.08, -0.20);
    shape.lineTo( 0.08, -0.04);
    shape.lineTo( 0.00, -0.04);
    shape.lineTo( 0.04,  0.20);
    return new THREE.ExtrudeGeometry(shape, { depth: 0.04, bevelEnabled: true, bevelSize: 0.008, bevelThickness: 0.008, bevelSegments: 2 });
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useFrame((s) => {
    if (!ref.current) return;
    ref.current.position.y = 1.18 + Math.sin(s.clock.elapsedTime * 3) * 0.06;
    ref.current.rotation.y = s.clock.elapsedTime * 1.2;
    if (matRef.current) {
      // Calmer pulse — avoids over-bright flicker on mobile while still reading clearly.
      matRef.current.emissiveIntensity = isActive
        ? 0.95 + Math.sin(s.clock.elapsedTime * 5) * 0.25
        : 0.55 + Math.sin(s.clock.elapsedTime * 3) * 0.12;
    }
  });
  return (
    <group position={[0, 1.18, 0]}>
      <mesh ref={ref} geometry={geometry} castShadow>
        <meshStandardMaterial ref={matRef} color="#FDE047" emissive="#FACC15" emissiveIntensity={0.7} metalness={0.6} roughness={0.15} />
      </mesh>
      {isActive && <pointLight color="#FDE047" intensity={1.0} distance={1.4} decay={2} />}
    </group>
  );
}

function SkullIcon({ isActive }: { isActive: boolean }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((s) => {
    if (!ref.current) return;
    ref.current.position.y = 1.05 + Math.sin(s.clock.elapsedTime * 1.8) * 0.04;
    ref.current.rotation.y = Math.sin(s.clock.elapsedTime * 0.8) * 0.3;
  });
  return (
    <group ref={ref} position={[0, 1.05, 0]}>
      <mesh><sphereGeometry args={[0.1, 12, 12]} /><meshStandardMaterial color="#FBE8C0" emissive="#E63946" emissiveIntensity={isActive ? 0.6 : 0.15} roughness={0.5} /></mesh>
      <mesh position={[-0.035, 0.025, 0.08]}><sphereGeometry args={[0.025, 8, 8]} /><meshStandardMaterial color="#111" /></mesh>
      <mesh position={[0.035, 0.025, 0.08]}><sphereGeometry args={[0.025, 8, 8]} /><meshStandardMaterial color="#111" /></mesh>
    </group>
  );
}

function MonsterIcon({ isActive }: { isActive: boolean }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((s) => {
    if (!ref.current) return;
    const w = isActive ? 0.15 : 0.05;
    ref.current.scale.x = 1 + Math.sin(s.clock.elapsedTime * 3) * w;
    ref.current.scale.z = 1 + Math.cos(s.clock.elapsedTime * 3) * w;
    ref.current.position.y = 1.05 + Math.sin(s.clock.elapsedTime * 2) * 0.05;
  });
  return (
    <mesh ref={ref} position={[0, 1.05, 0]}>
      <dodecahedronGeometry args={[0.1, 0]} />
      <meshStandardMaterial color="#F472B6" emissive="#EC4899" emissiveIntensity={isActive ? 0.8 : 0.3} metalness={0.4} roughness={0.2} />
    </mesh>
  );
}

function TileIcon({ type, isActive, theme }: { type: TileType; isActive: boolean; theme: LevelTheme3D }) {
  switch (type) {
    case "coins": return <SpinningCoin isActive={isActive} theme={theme} />;
    case "chest": return <GlowingChest isActive={isActive} theme={theme} />;
    case "star": return <PulsingStar isActive={isActive} theme={theme} />;
    case "bonus": return <LightningBolt isActive={isActive} />;
    case "skull": return <SkullIcon isActive={isActive} />;
    case "food": return <MonsterIcon isActive={isActive} />;
    default: return null;
  }
}

// --- Wave rings ---
function WaveRings({ theme }: { theme: LevelTheme3D }) {
  const ring1 = useRef<THREE.Mesh>(null);
  const ring2 = useRef<THREE.Mesh>(null);
  const ring3 = useRef<THREE.Mesh>(null);

  useFrame((s) => {
    const t = s.clock.elapsedTime;
    if (ring1.current) {
      const s1 = 1 + Math.sin(t * 1.5) * 0.08;
      ring1.current.scale.set(s1, s1, 1);
      (ring1.current.material as THREE.MeshStandardMaterial).opacity = 0.35 + Math.sin(t * 1.5) * 0.15;
    }
    if (ring2.current) {
      const s2 = 1 + Math.sin(t * 1.5 + 2) * 0.1;
      ring2.current.scale.set(s2, s2, 1);
      (ring2.current.material as THREE.MeshStandardMaterial).opacity = 0.25 + Math.sin(t * 1.5 + 2) * 0.12;
    }
    if (ring3.current) {
      const s3 = 1 + Math.sin(t * 1.2 + 4) * 0.12;
      ring3.current.scale.set(s3, s3, 1);
      (ring3.current.material as THREE.MeshStandardMaterial).opacity = 0.15 + Math.sin(t * 1.2 + 4) * 0.1;
    }
  });

  return (
    <group>
      <mesh ref={ring1} position={[0, -0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.7, 0.85, 32]} />
        <meshStandardMaterial color={theme.ringColor} emissive={theme.emissive} emissiveIntensity={0.35} transparent opacity={0.45} />
      </mesh>
      <mesh ref={ring2} position={[0, -0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.85, 0.98, 32]} />
        <meshStandardMaterial color={theme.particle} emissive={theme.ringColor} emissiveIntensity={0.25} transparent opacity={0.35} />
      </mesh>
      <mesh ref={ring3} position={[0, -0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.98, 1.12, 32]} />
        <meshStandardMaterial color={theme.particle} emissive={theme.particle} emissiveIntensity={0.15} transparent opacity={0.25} />
      </mesh>
    </group>
  );
}

function seededRandom(seed: number) {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

// --- Foliage variants per level ---

function PalmTree({ px, pz, height, seed, theme }: { px: number; pz: number; height: number; seed: number; theme: LevelTheme3D }) {
  const trunkRef = useRef<THREE.Group>(null);
  const lean = (seededRandom(seed + 3) - 0.5) * 0.25;
  useFrame((s) => {
    if (!trunkRef.current) return;
    trunkRef.current.rotation.z = lean + Math.sin(s.clock.elapsedTime * 1.2 + seed) * 0.04;
    trunkRef.current.rotation.x = Math.sin(s.clock.elapsedTime * 0.9 + seed * 2) * 0.03;
  });
  return (
    <group ref={trunkRef} position={[px, 0.48, pz]}>
      <mesh position={[0, height * 0.4, 0]}>
        <cylinderGeometry args={[0.025, 0.04, height * 0.8, 6]} />
        <meshStandardMaterial color={theme.structure} emissive={theme.emissive} emissiveIntensity={theme.emissiveIntensity * 0.2} roughness={theme.roughness} metalness={theme.metalness} />
      </mesh>
      <mesh position={[0, height * 0.75, 0]}>
        <sphereGeometry args={[0.03, 6, 6]} />
        <meshStandardMaterial color={theme.structureDark} roughness={0.8} />
      </mesh>
      {[0, 1.5, 3, 4.5].map((a, i) => (
        <mesh key={i} position={[Math.cos(a) * 0.1, height * 0.8, Math.sin(a) * 0.1]} rotation={[0.6 - i * 0.1, a, 0]}>
          <coneGeometry args={[0.12, 0.22, 4]} />
          <meshStandardMaterial color={i % 2 === 0 ? theme.grassDark : theme.grassLight} roughness={0.7} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}

function CrystalCluster({ px, pz, height, seed, theme }: { px: number; pz: number; height: number; seed: number; theme: LevelTheme3D }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((s) => {
    if (!ref.current) return;
    ref.current.rotation.y = s.clock.elapsedTime * 0.3 + seed;
  });
  return (
    <group ref={ref} position={[px, 0.5, pz]}>
      {[0, 1, 2].map((i) => {
        const a = (i / 3) * Math.PI * 2;
        const h = height * (0.7 + seededRandom(seed + i) * 0.5);
        return (
          <mesh key={i} position={[Math.cos(a) * 0.05, h / 2, Math.sin(a) * 0.05]} rotation={[seededRandom(seed + i + 10) * 0.3, a, 0]}>
            <coneGeometry args={[0.07, h, 5]} />
            <meshStandardMaterial color={theme.structure} emissive={theme.emissive} emissiveIntensity={0.6} metalness={0.8} roughness={0.1} transparent opacity={0.85} />
          </mesh>
        );
      })}
    </group>
  );
}

function EmberRock({ px, pz, height, seed, theme }: { px: number; pz: number; height: number; seed: number; theme: LevelTheme3D }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((s) => {
    if (!ref.current) return;
    const m = ref.current.material as THREE.MeshStandardMaterial;
    m.emissiveIntensity = 0.5 + Math.sin(s.clock.elapsedTime * 2 + seed) * 0.3;
  });
  return (
    <mesh ref={ref} position={[px, 0.55, pz]}>
      <dodecahedronGeometry args={[height * 0.18, 0]} />
      <meshStandardMaterial color={theme.structureDark} emissive={theme.emissive} emissiveIntensity={0.6} roughness={0.5} metalness={0.3} />
    </mesh>
  );
}

function DeadTree({ px, pz, height, seed, theme }: { px: number; pz: number; height: number; seed: number; theme: LevelTheme3D }) {
  return (
    <group position={[px, 0.48, pz]} rotation={[0, seed, 0]}>
      <mesh position={[0, height * 0.4, 0]}>
        <cylinderGeometry args={[0.02, 0.035, height * 0.8, 5]} />
        <meshStandardMaterial color={theme.structureDark} emissive={theme.emissive} emissiveIntensity={0.2} roughness={0.95} />
      </mesh>
      {[0.4, 0.7].map((y, i) => (
        <mesh key={i} position={[0.06 * (i % 2 ? 1 : -1), height * y, 0]} rotation={[0, 0, (i % 2 ? 1 : -1) * 0.6]}>
          <cylinderGeometry args={[0.012, 0.02, 0.18, 4]} />
          <meshStandardMaterial color={theme.structureDark} roughness={0.95} />
        </mesh>
      ))}
    </group>
  );
}

function CloudPuff({ px, pz, height, seed, theme }: { px: number; pz: number; height: number; seed: number; theme: LevelTheme3D }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((s) => {
    if (!ref.current) return;
    ref.current.position.y = 0.6 + height * 0.5 + Math.sin(s.clock.elapsedTime + seed) * 0.05;
  });
  return (
    <group ref={ref} position={[px, 0.6 + height * 0.5, pz]}>
      <mesh><sphereGeometry args={[0.12, 10, 10]} /><meshStandardMaterial color={theme.particle} emissive={theme.particle} emissiveIntensity={0.3} roughness={0.9} /></mesh>
      <mesh position={[0.1, 0.04, 0]}><sphereGeometry args={[0.08, 10, 10]} /><meshStandardMaterial color={theme.particle} roughness={0.9} /></mesh>
      <mesh position={[-0.1, 0.02, 0.04]}><sphereGeometry args={[0.09, 10, 10]} /><meshStandardMaterial color={theme.particle} roughness={0.9} /></mesh>
    </group>
  );
}

function DragonFern({ px, pz, height, seed, theme }: { px: number; pz: number; height: number; seed: number; theme: LevelTheme3D }) {
  return (
    <group position={[px, 0.5, pz]} rotation={[0, seed, 0]}>
      {[0, 1, 2, 3, 4].map((i) => {
        const a = (i / 5) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * 0.04, height * 0.2, Math.sin(a) * 0.04]} rotation={[0.7, a, 0]}>
            <coneGeometry args={[0.06, height * 0.5, 4]} />
            <meshStandardMaterial color={theme.grassDark} emissive={theme.emissive} emissiveIntensity={0.3} roughness={0.6} side={THREE.DoubleSide} />
          </mesh>
        );
      })}
    </group>
  );
}

function VoidSpire({ px, pz, height, seed, theme }: { px: number; pz: number; height: number; seed: number; theme: LevelTheme3D }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((s) => {
    if (!ref.current) return;
    ref.current.rotation.y = s.clock.elapsedTime * 0.2 + seed;
  });
  return (
    <mesh ref={ref} position={[px, 0.5 + height * 0.4, pz]}>
      <coneGeometry args={[0.06, height, 4]} />
      <meshStandardMaterial color={theme.structureDark} emissive={theme.emissive} emissiveIntensity={0.4} roughness={0.4} metalness={0.6} />
    </mesh>
  );
}

function CelestialOrb({ px, pz, height, seed, theme }: { px: number; pz: number; height: number; seed: number; theme: LevelTheme3D }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((s) => {
    if (!ref.current) return;
    ref.current.position.y = 0.65 + Math.sin(s.clock.elapsedTime * 1.5 + seed) * 0.1;
    ref.current.rotation.y = s.clock.elapsedTime;
  });
  return (
    <mesh ref={ref} position={[px, 0.65, pz]}>
      <sphereGeometry args={[height * 0.18, 16, 16]} />
      <meshStandardMaterial color={theme.particle} emissive={theme.ringColor} emissiveIntensity={1.2} metalness={0.9} roughness={0.05} />
    </mesh>
  );
}

const LevelFoliage = React.forwardRef<THREE.Group, { px: number; pz: number; height: number; seed: number; theme: LevelTheme3D }>((props, _ref) => {
  switch (props.theme.foliage) {
    case "crystal": return <CrystalCluster {...props} />;
    case "ember": return <EmberRock {...props} />;
    case "deadTree": return <DeadTree {...props} />;
    case "cloud": return <CloudPuff {...props} />;
    case "dragonFern": return <DragonFern {...props} />;
    case "voidSpire": return <VoidSpire {...props} />;
    case "celestialOrb": return <CelestialOrb {...props} />;
    case "palm":
    default: return <PalmTree {...props} />;
  }
});
LevelFoliage.displayName = "LevelFoliage";

// --- Island Tile ---

interface TileProps {
  tile: BoardTile;
  position: THREE.Vector3;
  isActive: boolean;
  index: number;
  playerPosition: number;
  theme: LevelTheme3D;
  forceVisible?: boolean;
  reducedMotion?: boolean;
}

function Tile({ tile, position, isActive, index, playerPosition, theme, forceVisible, reducedMotion = false }: TileProps) {
  const islandRef = useRef<THREE.Group>(null);
  const distFromPlayer = Math.abs(index - playerPosition);
  const isNearby = forceVisible || distFromPlayer <= 5;
  const accent = TILE_ACCENT[tile.type];
  const r = (n: number) => seededRandom(index * 17 + n);

  // Active island gets dramatically lifted with a smooth float-in.
  const ACTIVE_LIFT = 0.85;
  const liftRef = useRef(0);

  useFrame((s, delta) => {
    if (!islandRef.current) return;
    const target = isActive ? ACTIVE_LIFT : 0;
    // ease toward target
    liftRef.current = THREE.MathUtils.lerp(liftRef.current, target, Math.min(1, delta * 6));
    const bob = isActive && !reducedMotion ? Math.sin(s.clock.elapsedTime * 2) * 0.08 : 0;
    islandRef.current.position.y = position.y + liftRef.current + bob;
    // slight spin on active
    islandRef.current.rotation.y = isActive && !reducedMotion ? Math.sin(s.clock.elapsedTime * 0.4) * 0.08 : 0;
  });

  const hasFoliage = tile.type !== "skull";
  const foliageCount = hasFoliage ? (tile.type === "star" || tile.type === "chest" ? 2 : 1) : 0;

  const structureMat = (
    <meshStandardMaterial
      color={theme.structureDark}
      emissive={theme.emissive}
      emissiveIntensity={theme.emissiveIntensity * 0.25}
      metalness={theme.metalness}
      roughness={theme.roughness}
      transparent={!isNearby}
      opacity={isNearby ? 1 : 0.3}
    />
  );

  return (
    <group ref={islandRef} position={position}>
      {isNearby && <WaveRings theme={theme} />}
      {!isNearby && (
        <mesh position={[0, -0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.72, 1.0, 32]} />
          <meshStandardMaterial color={theme.ringColor} emissive={theme.emissive} emissiveIntensity={0.2} transparent opacity={0.18} />
        </mesh>
      )}

      {/* Rock base */}
      <mesh position={[0, 0.12, 0]} castShadow>
        <cylinderGeometry args={[0.55, 0.75, 0.55, 10]} />
        <meshStandardMaterial color={theme.rockDark} emissive={theme.emissive} emissiveIntensity={theme.emissiveIntensity * 0.15} roughness={Math.max(0.4, theme.roughness)} metalness={theme.metalness * 0.5} transparent={!isNearby} opacity={isNearby ? 1 : 0.3} />
      </mesh>

      {/* Secondary rock detail */}
      <mesh position={[0.15, 0.08, 0.15]} castShadow>
        <cylinderGeometry args={[0.12, 0.18, 0.3, 6]} />
        <meshStandardMaterial color={theme.rock} roughness={Math.max(0.4, theme.roughness)} metalness={theme.metalness * 0.5} transparent={!isNearby} opacity={isNearby ? 0.9 : 0.25} />
      </mesh>

      {/* Dirt layer */}
      <mesh position={[0, 0.38, 0]} castShadow>
        <cylinderGeometry args={[0.58, 0.55, 0.14, 10]} />
        <meshStandardMaterial color={theme.dirt} emissive={theme.emissive} emissiveIntensity={theme.emissiveIntensity * 0.1} roughness={0.85} metalness={theme.metalness * 0.3} transparent={!isNearby} opacity={isNearby ? 1 : 0.3} />
      </mesh>

      {/* Top surface */}
      <mesh position={[0, 0.48, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.6, 0.58, 0.1, 10]} />
        <meshStandardMaterial
          color={isActive ? theme.grassLight : theme.grassDark}
          emissive={isActive ? accent : theme.emissive}
          emissiveIntensity={isActive ? 0.4 : theme.emissiveIntensity * 0.15}
          roughness={Math.max(0.3, theme.roughness)}
          metalness={theme.metalness * 0.5}
          transparent={!isNearby}
          opacity={isNearby ? 1 : 0.3}
        />
      </mesh>

      {/* Accent ring */}
      {isNearby && (
        <mesh position={[0, 0.54, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.52, 0.61, 32]} />
          <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={isActive ? 0.9 : 0.15} transparent opacity={isActive ? 0.9 : 0.35} />
        </mesh>
      )}

      {/* Themed foliage */}
      {isNearby && foliageCount >= 1 && (
        <LevelFoliage px={0.3 * (r(1) > 0.5 ? 1 : -1)} pz={0.25 * (r(2) > 0.5 ? 1 : -1)} height={0.55 + r(0) * 0.2} seed={index} theme={theme} />
      )}
      {isNearby && foliageCount >= 2 && (
        <LevelFoliage px={-0.25 * (r(4) > 0.5 ? 1 : -1)} pz={0.3 * (r(5) > 0.5 ? 1 : -1)} height={0.45 + r(6) * 0.15} seed={index + 100} theme={theme} />
      )}

      {/* Small bushes (themed) */}
      {isNearby && tile.type !== "skull" && (
        <>
          <mesh position={[-0.22, 0.56, -0.18]}>
            <sphereGeometry args={[0.06, 8, 8]} />
            <meshStandardMaterial color={theme.grassDark} emissive={theme.emissive} emissiveIntensity={theme.emissiveIntensity * 0.2} roughness={0.8} metalness={theme.metalness * 0.3} />
          </mesh>
          <mesh position={[0.1, 0.55, -0.28]}>
            <sphereGeometry args={[0.045, 8, 8]} />
            <meshStandardMaterial color={theme.grassLight} roughness={0.8} />
          </mesh>
        </>
      )}

      {/* Themed grass tufts */}
      {isNearby && (
        <>
          <mesh position={[-0.15, 0.55, 0.22]}>
            <coneGeometry args={[0.03, 0.08, 4]} />
            <meshStandardMaterial color={theme.grassLight} roughness={0.7} />
          </mesh>
          <mesh position={[0.2, 0.55, -0.1]}>
            <coneGeometry args={[0.025, 0.07, 4]} />
            <meshStandardMaterial color={theme.grassDark} roughness={0.7} />
          </mesh>
        </>
      )}

      {/* Skull island marker */}
      {isNearby && tile.type === "skull" && (
        <mesh position={[0.25, 0.55, 0.15]}>
          <cylinderGeometry args={[0.03, 0.04, 0.18, 5]} />
          <meshStandardMaterial color={theme.structureDark} roughness={0.95} />
        </mesh>
      )}

      {/* Big glow underneath active island */}
      {isActive && (
        <>
          <mesh position={[0, -0.08, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[1.1, 32]} />
            <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.7} transparent opacity={0.35} />
          </mesh>
          <pointLight position={[0, 0.6, 0]} intensity={1.6} color={accent} distance={3.5} />
          {/* Beam of light */}
          <mesh position={[0, 1.4, 0]}>
            <coneGeometry args={[0.6, 2.6, 16, 1, true]} />
            <meshBasicMaterial color={theme.ringColor} transparent opacity={0.12} side={THREE.DoubleSide} depthWrite={false} />
          </mesh>
        </>
      )}

      {/* 3D animated icon floating above island */}
      {isNearby && <TileIcon type={tile.type} isActive={isActive} theme={theme} />}

      {/* Value text */}
      {isActive && (
        <Float speed={2} floatIntensity={0.3}>
          <Text
            position={[0, 1.7, 0]}
            fontSize={0.24}
            color={tile.value >= 0 ? theme.ringColor : "#FCA5A5"}
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.028}
            outlineColor={theme.structureDark}
          >
            {tile.value >= 0 ? `+${tile.value}` : `${tile.value}`}
          </Text>
        </Float>
      )}
    </group>
  );
}

// --- Monster Trail ---

function MonsterTrail({ positions, theme }: { positions: THREE.Vector3[]; theme: LevelTheme3D }) {
  const trailRef = useRef<THREE.Points>(null);
  const MAX_TRAIL = 30;
  const trailPositions = useMemo(() => new Float32Array(MAX_TRAIL * 3), []);
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(trailPositions, 3));
    return geo;
  }, [trailPositions]);

  useEffect(() => () => { geometry.dispose(); }, [geometry]);

  useFrame(() => {
    if (!trailRef.current || positions.length === 0) return;
    const last = positions[positions.length - 1];
    for (let i = MAX_TRAIL - 1; i > 0; i--) {
      trailPositions[i * 3] = trailPositions[(i - 1) * 3];
      trailPositions[i * 3 + 1] = trailPositions[(i - 1) * 3 + 1];
      trailPositions[i * 3 + 2] = trailPositions[(i - 1) * 3 + 2];
    }
    trailPositions[0] = last.x;
    trailPositions[1] = last.y + 0.8;
    trailPositions[2] = last.z;
    const attr = geometry.attributes.position as THREE.BufferAttribute;
    attr.needsUpdate = true;
  });

  return (
    <points ref={trailRef} geometry={geometry}>
      <pointsMaterial size={0.08} color={theme.ringColor} transparent opacity={0.6} sizeAttenuation />
    </points>
  );
}

// --- Monster Pawn ---

interface MonsterPawnProps {
  monsterPosRef?: React.MutableRefObject<THREE.Vector3>;
  /** Absolute index the monster should currently be on (monotonic, never wraps). */
  absoluteIndex: number;
  /** Pure function: absolute index → world-space Vector3. */
  pathPointAt: (absIdx: number) => THREE.Vector3;
  monster: Monster;
  movementResult: { steps: number; tile: BoardTile } | null;
  trailPosRef: React.MutableRefObject<THREE.Vector3[]>;
  activeLift: number;
  reducedMotion?: boolean;
  onMovingChange?: (moving: boolean) => void;
}

function MonsterPawn({ absoluteIndex, pathPointAt, monster, movementResult, trailPosRef, activeLift, monsterPosRef, reducedMotion = false, onMovingChange }: MonsterPawnProps) {
  const groupRef = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Mesh>(null);
  const leftFootRef = useRef<THREE.Mesh>(null);
  const rightFootRef = useRef<THREE.Mesh>(null);
  const currentPos = useRef(pathPointAt(absoluteIndex).clone());
  /** Absolute index the pawn is currently AT (the latest tile it has fully arrived on). */
  const arrivedIdx = useRef(absoluteIndex);
  /** Absolute index the pawn is currently animating TOWARD. */
  const activeTargetIdx = useRef<number | null>(null);
  const stepStart = useRef(pathPointAt(absoluteIndex).clone());
  const stepEnd = useRef(pathPointAt(absoluteIndex).clone());
  const stepProgress = useRef(1);
  const stepDuration = useRef(0.1);
  const texture = useLoader(THREE.TextureLoader, monster.image);
  const liftRef = useRef(0);
  const lastMovingRef = useRef(false);

  useEffect(() => () => onMovingChange?.(false), [onMovingChange]);

  useEffect(() => {
    // Slower, more deliberate hops — easier to follow visually.
    if (movementResult && movementResult.steps > 0) {
      stepDuration.current = THREE.MathUtils.clamp(0.38 - movementResult.steps * 0.004, 0.18, 0.32);
    }
  }, [movementResult]);

  // If we ever fall WAY behind (e.g. tab restored after long sleep), snap forward.
  useEffect(() => {
    if (absoluteIndex - arrivedIdx.current > 50) {
      arrivedIdx.current = absoluteIndex - 6; // catch up most of the way; animate the last 6 hops
    }
  }, [absoluteIndex]);

  const startNextStep = () => {
    if (activeTargetIdx.current !== null) return;
    if (arrivedIdx.current >= absoluteIndex) return;
    const nextIdx = arrivedIdx.current + 1;
    activeTargetIdx.current = nextIdx;
    stepStart.current.copy(currentPos.current);
    stepEnd.current.copy(pathPointAt(nextIdx));
    stepProgress.current = 0;
  };

  useEffect(() => { texture.colorSpace = THREE.SRGBColorSpace; }, [texture]);

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    startNextStep();

    let hopY = 0;
    let hopScale = 1;
    let hopRotZ = 0;
    const isAnimating = activeTargetIdx.current !== null || arrivedIdx.current < absoluteIndex;

    if (activeTargetIdx.current !== null) {
      stepProgress.current = Math.min(1, stepProgress.current + delta / stepDuration.current);
      const easedProgress = THREE.MathUtils.smootherstep(stepProgress.current, 0, 1);
      currentPos.current.lerpVectors(stepStart.current, stepEnd.current, easedProgress);
      const jumpPhase = Math.sin(stepProgress.current * Math.PI);
      hopY = jumpPhase * 0.42;
      hopScale = 1 + jumpPhase * 0.08;
      hopRotZ = Math.sin(stepProgress.current * Math.PI * 2) * 0.08;
      if (stepProgress.current >= 1) {
        currentPos.current.copy(stepEnd.current);
        arrivedIdx.current = activeTargetIdx.current;
        activeTargetIdx.current = null;
      }
    }

    // When idle on a tile, ride along with the active island lift
    const targetLift = isAnimating ? 0 : activeLift;
    liftRef.current = THREE.MathUtils.lerp(liftRef.current, targetLift, Math.min(1, delta * 6));

    if (lastMovingRef.current !== isAnimating) {
      lastMovingRef.current = isAnimating;
      onMovingChange?.(isAnimating);
    }

    const idleBob = isAnimating || reducedMotion ? 0 : Math.sin(state.clock.elapsedTime * 2) * 0.06;
    const idleScale = isAnimating || reducedMotion ? 1 : 1 + Math.sin(state.clock.elapsedTime * 1.5) * 0.03;

    groupRef.current.position.set(
      currentPos.current.x,
      currentPos.current.y + 1.1 + hopY + idleBob + liftRef.current,
      currentPos.current.z
    );
    groupRef.current.scale.setScalar(hopScale * idleScale);
    groupRef.current.rotation.z = hopRotZ;

    trailPosRef.current = [new THREE.Vector3(currentPos.current.x, currentPos.current.y + liftRef.current, currentPos.current.z)];
    if (monsterPosRef) {
      // Use the stable interpolated position (no idle bob / hop bounce) so the
      // chase camera doesn't inherit a high-frequency sine wobble while idle.
      monsterPosRef.current.set(
        currentPos.current.x,
        currentPos.current.y + liftRef.current,
        currentPos.current.z,
      );
    }

    // --- Personality: idle breathing + walk-cycle legs ---
    const t = state.clock.elapsedTime;
    if (bodyRef.current) {
      if (isAnimating) {
        bodyRef.current.scale.set(1, 1, 1);
        bodyRef.current.position.y = Math.sin(t * 14) * 0.05;
        bodyRef.current.rotation.x = -0.08;
      } else {
        const breathe = 1 + Math.sin(t * 2.5) * 0.04;
        bodyRef.current.scale.set(1, breathe, 1);
        bodyRef.current.position.y = Math.sin(t * 2.5) * 0.02;
        bodyRef.current.rotation.x = 0;
      }
    }
    if (leftFootRef.current && rightFootRef.current) {
      if (isAnimating) {
        leftFootRef.current.position.y = -0.32 + Math.max(0, Math.sin(t * 14)) * 0.12;
        rightFootRef.current.position.y = -0.32 + Math.max(0, Math.sin(t * 14 + Math.PI)) * 0.12;
      } else {
        leftFootRef.current.position.y = -0.32;
        rightFootRef.current.position.y = -0.32;
      }
    }
  });

  const rarityColor =
    monster.rarity === "legendary" ? "#a855f7" :
    monster.rarity === "epic" ? "#3b82f6" :
    monster.rarity === "rare" ? "#22d3ee" : "#22c55e";

  return (
    // `frustumCulled={false}` on the group: when the pawn animates upward
    // during a hop, frustum culling against a stale bounding box can briefly
    // mark the sprite off-screen and hide it ("invisible during hop" bug).
    <group ref={groupRef} frustumCulled={false}>
      {/* Hidden refs kept for the existing animation hooks (no visual impact) */}
      <mesh ref={bodyRef} visible={false}><sphereGeometry args={[0.01, 4, 4]} /><meshBasicMaterial /></mesh>
      <mesh ref={leftFootRef} visible={false}><sphereGeometry args={[0.01, 4, 4]} /><meshBasicMaterial /></mesh>
      <mesh ref={rightFootRef} visible={false}><sphereGeometry args={[0.01, 4, 4]} /><meshBasicMaterial /></mesh>
      {/* --- Layered billboard stack (back → front) ---
          1. Soft outer glow disc (additive) — visible against fog & daylight.
          2. Rim glow disc just behind sprite — fakes a backlit silhouette.
          3. Main sprite — soft alpha (low alphaTest) for clean fur edges.
          4. Brightness pass on top (additive, low opacity) — pops eyes/marks. */}
      <Billboard>
        {/* 1. Outer rarity glow — additive so it reads on both bright & dark scenes */}
        <mesh position={[0, 0.05, -0.45]} renderOrder={9000} frustumCulled={false}>
          <circleGeometry args={[0.85, 32]} />
          <meshBasicMaterial
            color={rarityColor}
            transparent
            opacity={0.35}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            depthTest={false}
            toneMapped={false}
          />
        </mesh>
        {/* 2. Tight rim halo right behind the sprite */}
        <mesh position={[0, 0.04, -0.08]} renderOrder={9001} frustumCulled={false}>
          <circleGeometry args={[0.62, 32]} />
          <meshBasicMaterial
            color={rarityColor}
            transparent
            opacity={0.55}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            depthTest={false}
            toneMapped={false}
          />
        </mesh>
        {/* 3. Main monster sprite — soft alpha edges via low alphaTest */}
        {/* depthTest disabled + very high renderOrder so the monster is
            ALWAYS painted on top of terrain/island geometry. Fixes the
            "invisible while hopping" / occlusion-by-mountain bug. */}
        <mesh position={[0, 0, 0]} renderOrder={9010} frustumCulled={false}>
          <planeGeometry args={[1.1, 1.1]} />
          <meshBasicMaterial
            map={texture}
            transparent
            alphaTest={0.08}
            depthWrite={false}
            depthTest={false}
            toneMapped={false}
          />
        </mesh>
        {/* 4. Brightness/contrast pass — additive copy of the sprite at low opacity
            makes eyes, teeth & bright marks pop in dim (fog) scenes without
            blowing out daylight scenes. */}
        <mesh position={[0, 0, 0.01]} renderOrder={9011} frustumCulled={false}>
          <planeGeometry args={[1.1, 1.1]} />
          <meshBasicMaterial
            map={texture}
            transparent
            alphaTest={0.5}
            opacity={0.35}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            depthTest={false}
            toneMapped={false}
          />
        </mesh>
      </Billboard>
      {/* Ground shadow */}
      <mesh position={[0, -0.55, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.35, 16]} />
        <meshStandardMaterial color="#000000" transparent opacity={0.35} />
      </mesh>
      {/* Name tag */}
      <Billboard>
        <Text position={[0, 0.7, 0]} fontSize={0.13} color="#ffffff" anchorX="center" anchorY="middle" outlineWidth={0.02} outlineColor="#000000">
          {monster.name}
        </Text>
      </Billboard>
    </group>
  );
}

// --- Scene helpers ---

function PathConnector({ points, theme }: { points: THREE.Vector3[]; theme: LevelTheme3D }) {
  const curve = useMemo(() => new THREE.CatmullRomCurve3(points), [points]);
  return (
    <mesh>
      <tubeGeometry args={[curve, 100, 0.04, 8, false]} />
      <meshStandardMaterial color={theme.structure} emissive={theme.emissive} emissiveIntensity={theme.emissiveIntensity * 0.3} roughness={Math.max(0.3, theme.roughness)} metalness={theme.metalness} transparent opacity={0.6} />
    </mesh>
  );
}

function Ocean({ theme }: { theme: LevelTheme3D }) {
  const ref = useRef<THREE.Mesh>(null);
  const geoRef = useRef<THREE.PlaneGeometry | null>(null);

  useFrame((s) => {
    if (!ref.current) return;
    ref.current.position.y = -0.2 + Math.sin(s.clock.elapsedTime * 0.5) * 0.02;
    if (geoRef.current) {
      const pos = geoRef.current.attributes.position;
      const t = s.clock.elapsedTime;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const y = pos.getY(i);
        const wave = Math.sin(x * 0.5 + t * 0.8) * 0.06 + Math.cos(y * 0.4 + t * 0.6) * 0.04;
        pos.setZ(i, wave);
      }
      pos.needsUpdate = true;
      geoRef.current.computeVertexNormals();
    }
  });

  const geometry = useMemo(() => new THREE.PlaneGeometry(40, 40, 60, 60), []);
  useEffect(() => { geoRef.current = geometry; }, [geometry]);

  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.2, 0]} receiveShadow geometry={geometry}>
      <meshStandardMaterial color={theme.ocean} emissive={theme.oceanEmissive} emissiveIntensity={0.2} roughness={0.3} metalness={0.2} transparent opacity={0.9} />
    </mesh>
  );
}

function FloatingParticles({ theme }: { theme: LevelTheme3D }) {
  const particlesRef = useRef<THREE.Points>(null);
  const count = 60;
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 20;
      pos[i * 3 + 1] = Math.random() * 6 + 0.5;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 20;
    }
    return pos;
  }, []);
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return geo;
  }, [positions]);

  useEffect(() => () => { geometry.dispose(); }, [geometry]);

  useFrame((s) => {
    if (!particlesRef.current) return;
    particlesRef.current.rotation.y = s.clock.elapsedTime * 0.015;
    const attr = geometry.attributes.position as THREE.BufferAttribute;
    const arr = attr.array as Float32Array;
    for (let i = 0; i < count; i++) arr[i * 3 + 1] += Math.sin(s.clock.elapsedTime + i) * 0.001;
    attr.needsUpdate = true;
  });

  return (
    <points ref={particlesRef} geometry={geometry}>
      <pointsMaterial size={0.06} color={theme.particle} transparent opacity={0.7} sizeAttenuation />
    </points>
  );
}

// --- Main scene ---

const ACTIVE_LIFT_VALUE = 0.85;

function applySeasonTint(theme: LevelTheme3D, seasonAccent?: string, seasonGlow?: string): LevelTheme3D {
  if (!seasonAccent && !seasonGlow) return theme;
  return {
    ...theme,
    ringColor: seasonAccent ?? theme.ringColor,
    oceanEmissive: seasonAccent ?? theme.oceanEmissive,
    emissive: seasonGlow ?? seasonAccent ?? theme.emissive,
    particle: seasonGlow ?? theme.particle,
    directional: seasonGlow ?? theme.directional,
  };
}

// Camera rig — chase camera that tracks the monster's actual interpolated position each frame.
function CameraRig({ monsterPosRef, isMoving, recenterRef }: { monsterPosRef: React.MutableRefObject<THREE.Vector3>; isMoving: boolean; recenterRef: React.MutableRefObject<boolean> }) {
  const lerpedTarget = useRef(monsterPosRef.current.clone());
  const distRef = useRef(1);
  const wasMovingRef = useRef(false);
  // Reusable scratch vectors — allocating per frame caused tiny numerical
  // jitter at the sub-pixel level when the camera should be perfectly still.
  const desiredCam = useRef(new THREE.Vector3());
  const lookAt = useRef(new THREE.Vector3());
  const settings = useCameraSettings();
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  useFrame((state, delta) => {
    const s = settingsRef.current;
    const smoothing = s.reducedMotion ? 0 : s.followSmoothing; // 0 = rigid follow
    const deadZone = s.reducedMotion ? 0 : s.deadZone;
    const zoom = s.zoom;
    const target = monsterPosRef.current;
    const recenter = recenterRef.current;
    if (recenter) recenterRef.current = false;
    if (isMoving && !wasMovingRef.current) {
      lerpedTarget.current.copy(target);
    }
    wasMovingRef.current = isMoving;

    if (isMoving || smoothing === 0 || recenter) {
      lerpedTarget.current.copy(target);
    } else {
      // Dead-zone: if we're already close enough, just snap. This eliminates
      // the asymptotic sub-pixel drift that read as idle camera jitter.
      const dist = lerpedTarget.current.distanceTo(target);
      if (dist < deadZone || dist > 2 || recenter) {
        lerpedTarget.current.copy(target);
      } else {
        lerpedTarget.current.lerp(target, Math.min(1, delta * 2.5 * (smoothing / 1.5)));
      }
    }
    const targetDist = isMoving ? 1.12 : 1;
    if (smoothing === 0 || recenter || Math.abs(targetDist - distRef.current) < 0.0005) {
      distRef.current = targetDist;
    } else {
      distRef.current += (targetDist - distRef.current) * Math.min(1, delta * 3);
    }
    const d = distRef.current * zoom;
    // Tighter base chase distances (was 4.5/3.5/4.5) — pulls the camera in
    // so the world doesn't feel zoomed too far out.
    desiredCam.current.set(
      lerpedTarget.current.x + 3.6 * d,
      lerpedTarget.current.y + 2.8 * d + (isMoving ? 1.0 : 0),
      lerpedTarget.current.z + 3.6 * d,
    );
    if (isMoving || recenter || smoothing === 0) {
      state.camera.position.copy(desiredCam.current);
    } else {
      const camDist = state.camera.position.distanceTo(desiredCam.current);
      if (camDist < Math.max(0.002, deadZone)) {
        state.camera.position.copy(desiredCam.current);
      } else {
        state.camera.position.lerp(desiredCam.current, Math.min(1, delta * 1.8 * (smoothing / 1.5)));
      }
    }
    lookAt.current.copy(lerpedTarget.current);
    lookAt.current.y += isMoving ? 0.55 : 0.3;
    state.camera.lookAt(lookAt.current);
  });
  return null;
}

function SyncedOrbitControls({ monsterPosRef, enabled }: { monsterPosRef: React.MutableRefObject<THREE.Vector3>; enabled: boolean }) {
  const controlsRef = useRef<{ target: THREE.Vector3; update: () => void } | null>(null);
  const target = useRef(new THREE.Vector3());
  useFrame(() => {
    if (!controlsRef.current) return;
    target.current.copy(monsterPosRef.current);
    target.current.y += enabled ? 0.3 : 0.55;
    controlsRef.current.target.copy(target.current);
    if (enabled) controlsRef.current.update();
  });
  return (
    <OrbitControls
      ref={controlsRef}
      minDistance={3}
      maxDistance={14}
      minPolarAngle={Math.PI / 6}
      maxPolarAngle={Math.PI / 2.4}
      enablePan={false}
      enableZoom={true}
      autoRotate={false}
      touches={{ ONE: TOUCH.ROTATE, TWO: TOUCH.DOLLY_ROTATE }}
      enabled={enabled}
    />
  );
}

const IsometricBoardScene = React.forwardRef<THREE.Group, { absoluteStep: number; monster: Monster; isMoving: boolean; movementResult: { steps: number; tile: BoardTile } | null; levelId: number; seasonAccent?: string; seasonGlow?: string; recenterRef: React.MutableRefObject<boolean> }>(function IsometricBoardScene({ absoluteStep, monster, isMoving, movementResult, levelId, seasonAccent, seasonGlow, recenterRef }, _ref) {
  // Pure path function bound to current level
  const pathFn = useMemo(() => (i: number) => pathPointAt(i, levelId), [levelId]);
  // Widen the trailing window to cover the most recent hop length, so trailing
  // islands don't disappear behind the monster while a long roll is in flight.
  const lastSteps = movementResult?.steps ?? 0;
  const { points: windowPoints, startAbs } = useMemo(
    () => buildPathWindow(absoluteStep, levelId, lastSteps + 4),
    [absoluteStep, levelId, lastSteps]
  );
  const currentTilePos = pathFn(absoluteStep);
  const trailPosRef = useRef<THREE.Vector3[]>([]);
  const monsterPosRef = useRef<THREE.Vector3>(new THREE.Vector3(currentTilePos.x, currentTilePos.y + 1, currentTilePos.z));
  const theme = useMemo(() => applySeasonTint(getTheme(levelId), seasonAccent, seasonGlow), [levelId, seasonAccent, seasonGlow]);
  const settings = useCameraSettings();
  const [pawnMoving, setPawnMoving] = useState(false);
  const cameraMoving = isMoving || pawnMoving;

  return (
    <>
      <ambientLight intensity={0.7} color={theme.ambient} />
      <directionalLight position={[8, 14, 8]} intensity={1.3} color={theme.directional} castShadow shadow-mapSize={[1024, 1024]} />
      <pointLight position={[currentTilePos.x, currentTilePos.y + 3 + ACTIVE_LIFT_VALUE, currentTilePos.z]} intensity={1.2} color={theme.ringColor} distance={6} />
      <hemisphereLight args={[theme.ambient, theme.structureDark, 0.4]} />

      <Ocean theme={theme} />
      <FloatingParticles theme={theme} />
      <PathConnector points={windowPoints} theme={theme} />

      {windowPoints.map((p, i) => {
        const absIdx = startAbs + i;
        const tile = BOARD_TILES[((absIdx % BOARD_TILES.length) + BOARD_TILES.length) % BOARD_TILES.length];
        return (
          <Tile
            key={absIdx}
            tile={tile}
            position={p}
            isActive={absIdx === absoluteStep}
            index={absIdx}
            playerPosition={absoluteStep}
            theme={theme}
            forceVisible={isMoving}
            reducedMotion={settings.reducedMotion}
          />
        );
      })}

      <MonsterTrail positions={trailPosRef.current} theme={theme} />
      {/* Suspense boundary around the pawn so a texture swap (e.g. monster
          evolves / new monster) cannot unmount the entire scene and leave the
          board "blank" with an invisible monster while the new texture loads. */}
      <Suspense fallback={null}>
        <MonsterPawn
          pathPointAt={pathFn}
          absoluteIndex={absoluteStep}
          monster={monster}
          movementResult={movementResult}
          trailPosRef={trailPosRef}
          activeLift={ACTIVE_LIFT_VALUE}
          monsterPosRef={monsterPosRef}
          reducedMotion={settings.reducedMotion}
          onMovingChange={setPawnMoving}
        />
      </Suspense>

      <CameraRig monsterPosRef={monsterPosRef} isMoving={cameraMoving} recenterRef={recenterRef} />
      <SyncedOrbitControls monsterPosRef={monsterPosRef} enabled={!cameraMoving} />
    </>
  );
});

export function IsometricBoard({ position, absoluteStep, monster, isMoving, movementResult, levelId = 1, seasonAccent, seasonGlow, fullscreen = false }: { position: number; absoluteStep?: number; monster: Monster; isMoving: boolean; movementResult: { steps: number; tile: BoardTile } | null; levelId?: number; seasonAccent?: string; seasonGlow?: string; fullscreen?: boolean }) {
  // Fall back to `position` if absoluteStep isn't provided (legacy callers).
  const absStep = absoluteStep ?? position;
  const theme = applySeasonTint(getTheme(levelId), seasonAccent, seasonGlow);
  const recenterRef = useRef(false);
  const lastTapRef = useRef(0);
  const [showDebug, setShowDebug] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("monster.debugBoard") === "1";
  });
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("monster.debugBoard", showDebug ? "1" : "0");
  }, [showDebug]);

  // Debug derivations (cheap; only shown when toggled on)
  const windowStart = Math.max(0, absStep - WINDOW_BEFORE);
  const windowEnd = windowStart + WINDOW_BEFORE + WINDOW_AFTER;
  const activeTileIndex = ((absStep % BOARD_TILES.length) + BOARD_TILES.length) % BOARD_TILES.length;
  const activeTileType = BOARD_TILES[activeTileIndex]?.type ?? "?";

  const handleDoubleTap = () => { recenterRef.current = true; };
  const handlePointerDown = () => {
    const now = performance.now();
    if (now - lastTapRef.current < 300) handleDoubleTap();
    lastTapRef.current = now;
  };

  return (
    <div
      className={fullscreen ? "absolute inset-0" : "w-full rounded-2xl overflow-hidden border-4 border-wood-dark bg-cream shadow-chunky-sm"}
      style={fullscreen ? undefined : { height: "min(70vh, 560px)", minHeight: 380 }}
      role="region"
      aria-label="3D Game board"
      onDoubleClick={handleDoubleTap}
      onPointerDown={handlePointerDown}
    >
      <Canvas shadows camera={{ position: [6, 5, 6], fov: 45, near: 0.1, far: 100 }} gl={{ antialias: true, alpha: false }}>
        <color attach="background" args={[theme.bg]} />
        {/* Push the fog further out while the monster is hopping so it can't
            get swallowed mid-jump on long rolls. */}
        {/* Fog start pushed well past the chase camera distance (~11 units when
            moving) so the monster sprite is NEVER inside the fog band. */}
        {/* Reduced fog so the monster stays clearly visible mid-hop.
            Pushed start much further out and softened density. */}
        {/* Fog further reduced — pushed start past chase distance and density softened. */}
        <fog attach="fog" args={[theme.fog, isMoving ? 90 : 70, isMoving ? 200 : 170]} />
        <Suspense fallback={null}>
          <IsometricBoardScene absoluteStep={absStep} monster={monster} isMoving={isMoving} movementResult={movementResult} levelId={levelId} seasonAccent={seasonAccent} seasonGlow={seasonGlow} recenterRef={recenterRef} />
        </Suspense>
      </Canvas>
      <BoardMinimap
        levelId={levelId}
        tileCount={BOARD_TILES.length}
        position={((absStep % BOARD_TILES.length) + BOARD_TILES.length) % BOARD_TILES.length}
        accentColor={theme.ringColor}
      />
      <LevelTransitionCinematic levelId={levelId} accentColor={theme.ringColor} />
      <button
        onClick={(e) => { e.stopPropagation(); recenterRef.current = true; }}
        aria-label="Recenter camera on monster"
        className="absolute bottom-3 right-3 z-20 w-10 h-10 rounded-full bg-card/90 border-2 border-wood-dark shadow-chunky-sm flex items-center justify-center text-base hover:scale-105 active:scale-95 transition"
      >
        🎯
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); setShowDebug((v) => !v); }}
        aria-label="Toggle board debug overlay"
        className="absolute bottom-3 right-16 z-20 w-10 h-10 rounded-full bg-card/90 border-2 border-wood-dark shadow-chunky-sm flex items-center justify-center text-[10px] font-display hover:scale-105 active:scale-95 transition"
        title="Dev: show absoluteStep / window / active tile"
      >
        DBG
      </button>
      {showDebug && (
        <div className="absolute top-3 right-3 z-20 pointer-events-none rounded-lg bg-black/70 text-cream-light font-mono text-[10px] leading-tight px-2 py-1.5 border border-cream/30">
          <div>abs: <b>{absStep}</b></div>
          <div>win: <b>{windowStart}</b>–<b>{windowEnd}</b></div>
          <div>tile[{activeTileIndex}]: <b>{activeTileType}</b></div>
        </div>
      )}
    </div>
  );
}
