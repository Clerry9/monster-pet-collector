import { useRef, useMemo, useState, useEffect } from "react";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { OrbitControls, Text, Float, Billboard } from "@react-three/drei";
import { TOUCH } from "three";
import * as THREE from "three";
import { BOARD_TILES, BoardTile, TileType } from "@/hooks/useGameState";
import { Monster } from "@/data/monsters";

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
  return LEVEL_THEMES[levelId] || LEVEL_THEMES[1];
}

function generatePath(tileCount: number): THREE.Vector3[] {
  const points: THREE.Vector3[] = [];
  for (let i = 0; i < tileCount; i++) {
    const angle = (i / tileCount) * Math.PI * 2.5;
    const radius = 4 + i * 0.35;
    const x = Math.cos(angle) * radius * 0.65;
    const z = Math.sin(angle) * radius * 0.65;
    const y = i * 0.09;
    points.push(new THREE.Vector3(x, y, z));
  }
  return points;
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
  useFrame((s) => {
    if (!ref.current) return;
    ref.current.position.y = 1.1 + Math.sin(s.clock.elapsedTime * 3) * 0.06;
    (ref.current.material as THREE.MeshStandardMaterial).emissiveIntensity = isActive ? 0.6 + Math.sin(s.clock.elapsedTime * 8) * 0.4 : 0.3;
  });
  return (
    <mesh ref={ref} position={[0, 1.1, 0]} rotation={[0, 0, 0.1]}>
      <coneGeometry args={[0.07, 0.2, 4]} />
      <meshStandardMaterial color="#E63946" emissive="#E63946" emissiveIntensity={0.4} metalness={0.5} roughness={0.2} />
    </mesh>
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

function LevelFoliage(props: { px: number; pz: number; height: number; seed: number; theme: LevelTheme3D }) {
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
}

// --- Island Tile ---

interface TileProps {
  tile: BoardTile;
  position: THREE.Vector3;
  isActive: boolean;
  index: number;
  playerPosition: number;
  theme: LevelTheme3D;
}

function Tile({ tile, position, isActive, index, playerPosition, theme }: TileProps) {
  const islandRef = useRef<THREE.Group>(null);
  const distFromPlayer = Math.abs(index - playerPosition);
  const isNearby = distFromPlayer <= 5;
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
    const bob = isActive ? Math.sin(s.clock.elapsedTime * 2) * 0.08 : 0;
    islandRef.current.position.y = position.y + liftRef.current + bob;
    // slight spin on active
    islandRef.current.rotation.y = isActive ? Math.sin(s.clock.elapsedTime * 0.4) * 0.08 : 0;
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
  pathPoints: THREE.Vector3[];
  position: number;
  monster: Monster;
  movementResult: { steps: number; tile: BoardTile } | null;
  trailPosRef: React.MutableRefObject<THREE.Vector3[]>;
  activeLift: number;
}

function MonsterPawn({ pathPoints, position, monster, movementResult, trailPosRef, activeLift, monsterPosRef }: MonsterPawnProps) {
  const groupRef = useRef<THREE.Group>(null);
  const currentPos = useRef(pathPoints[position]?.clone() || new THREE.Vector3());
  const scheduledPosition = useRef(position);
  const queuedTiles = useRef<number[]>([]);
  const activeTile = useRef<number | null>(null);
  const stepStart = useRef(pathPoints[position]?.clone() || new THREE.Vector3());
  const stepEnd = useRef(pathPoints[position]?.clone() || new THREE.Vector3());
  const stepProgress = useRef(1);
  const stepDuration = useRef(0.1);
  const texture = useLoader(THREE.TextureLoader, monster.image);
  const liftRef = useRef(0);

  useEffect(() => {
    if (!movementResult || movementResult.steps <= 0) return;
    const startIndex = scheduledPosition.current;
    const nextTiles = Array.from({ length: movementResult.steps }, (_, index) => (
      (startIndex + index + 1) % pathPoints.length
    ));
    queuedTiles.current.push(...nextTiles);
    scheduledPosition.current = position;
    stepDuration.current = THREE.MathUtils.clamp(0.16 - movementResult.steps * 0.0025, 0.055, 0.12);
  }, [movementResult, pathPoints, position]);

  useEffect(() => {
    if (movementResult || activeTile.current !== null || queuedTiles.current.length > 0) return;
    const settledPoint = pathPoints[position] || pathPoints[0];
    currentPos.current.copy(settledPoint);
    stepStart.current.copy(settledPoint);
    stepEnd.current.copy(settledPoint);
    scheduledPosition.current = position;
  }, [movementResult, pathPoints, position]);

  const startNextStep = () => {
    if (activeTile.current !== null || queuedTiles.current.length === 0) return;
    const nextTile = queuedTiles.current.shift();
    if (nextTile === undefined) return;
    activeTile.current = nextTile;
    stepStart.current.copy(currentPos.current);
    stepEnd.current.copy(pathPoints[nextTile] || pathPoints[0]);
    stepProgress.current = 0;
  };

  useEffect(() => { startNextStep(); }, [movementResult]);
  useEffect(() => { texture.colorSpace = THREE.SRGBColorSpace; }, [texture]);
  useEffect(() => { scheduledPosition.current = position; }, [position]);
  useEffect(() => { if (!pathPoints.length) currentPos.current.set(0, 0, 0); }, [pathPoints.length]);

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    startNextStep();

    let hopY = 0;
    let hopScale = 1;
    let hopRotZ = 0;
    const isAnimating = activeTile.current !== null || queuedTiles.current.length > 0;

    if (activeTile.current !== null) {
      stepProgress.current = Math.min(1, stepProgress.current + delta / stepDuration.current);
      const easedProgress = THREE.MathUtils.smootherstep(stepProgress.current, 0, 1);
      currentPos.current.lerpVectors(stepStart.current, stepEnd.current, easedProgress);
      const jumpPhase = Math.sin(stepProgress.current * Math.PI);
      hopY = jumpPhase * 0.42;
      hopScale = 1 + jumpPhase * 0.08;
      hopRotZ = Math.sin(stepProgress.current * Math.PI * 2) * 0.08;
      if (stepProgress.current >= 1) {
        currentPos.current.copy(stepEnd.current);
        activeTile.current = null;
      }
    }

    // When idle on a tile, ride along with the active island lift
    const targetLift = isAnimating ? 0 : activeLift;
    liftRef.current = THREE.MathUtils.lerp(liftRef.current, targetLift, Math.min(1, delta * 6));

    const idleBob = isAnimating ? 0 : Math.sin(state.clock.elapsedTime * 2) * 0.06;
    const idleScale = isAnimating ? 1 : 1 + Math.sin(state.clock.elapsedTime * 1.5) * 0.03;

    groupRef.current.position.set(
      currentPos.current.x,
      currentPos.current.y + 1.1 + hopY + idleBob + liftRef.current,
      currentPos.current.z
    );
    groupRef.current.scale.setScalar(hopScale * idleScale);
    groupRef.current.rotation.z = hopRotZ;

    trailPosRef.current = [new THREE.Vector3(currentPos.current.x, currentPos.current.y + liftRef.current, currentPos.current.z)];
    if (monsterPosRef) {
      monsterPosRef.current.set(currentPos.current.x, currentPos.current.y + liftRef.current, currentPos.current.z);
    }
  });

  return (
    <group ref={groupRef}>
      <Billboard follow lockX={false} lockY={false} lockZ={false}>
        <mesh>
          <planeGeometry args={[0.8, 0.8]} />
          <meshBasicMaterial map={texture} transparent alphaTest={0.1} side={THREE.DoubleSide} />
        </mesh>
      </Billboard>
      <Billboard>
        <mesh position={[0, 0, -0.05]}>
          <circleGeometry args={[0.45, 24]} />
          <meshBasicMaterial
            color={monster.rarity === "legendary" ? "#a855f7" : monster.rarity === "epic" ? "#3b82f6" : monster.rarity === "rare" ? "#22d3ee" : "#22c55e"}
            transparent
            opacity={0.25}
          />
        </mesh>
      </Billboard>
      <mesh position={[0, -0.8, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.25, 16]} />
        <meshStandardMaterial color="#000000" transparent opacity={0.3} />
      </mesh>
      <Billboard>
        <Text position={[0, 0.55, 0]} fontSize={0.13} color="#ffffff" anchorX="center" anchorY="middle" outlineWidth={0.02} outlineColor="#000000">
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
  useFrame((state, delta) => {
    const target = monsterPosRef.current;
    // On manual recenter, snap target & camera fast
    const recenter = recenterRef.current;
    if (recenter) recenterRef.current = false;
    const speed = recenter ? 1 : isMoving ? Math.min(1, delta * 7) : Math.min(1, delta * 2.5);
    lerpedTarget.current.lerp(target, speed);
    const desiredCam = new THREE.Vector3(
      lerpedTarget.current.x + 4.5,
      lerpedTarget.current.y + 3.5,
      lerpedTarget.current.z + 4.5
    );
    state.camera.position.lerp(desiredCam, recenter ? 1 : isMoving ? Math.min(1, delta * 5) : Math.min(1, delta * 1.8));
    state.camera.lookAt(lerpedTarget.current);
  });
  return null;
}

function IsometricBoardScene({ position, monster, isMoving, movementResult, levelId, seasonAccent, seasonGlow, recenterRef }: { position: number; monster: Monster; isMoving: boolean; movementResult: { steps: number; tile: BoardTile } | null; levelId: number; seasonAccent?: string; seasonGlow?: string; recenterRef: React.MutableRefObject<boolean> }) {
  const pathPoints = useMemo(() => generatePath(BOARD_TILES.length), []);
  const currentTilePos = pathPoints[position] || pathPoints[0];
  const trailPosRef = useRef<THREE.Vector3[]>([]);
  const monsterPosRef = useRef<THREE.Vector3>(new THREE.Vector3(currentTilePos.x, currentTilePos.y + 1, currentTilePos.z));
  const theme = useMemo(() => applySeasonTint(getTheme(levelId), seasonAccent, seasonGlow), [levelId, seasonAccent, seasonGlow]);

  return (
    <>
      <ambientLight intensity={0.7} color={theme.ambient} />
      <directionalLight position={[8, 14, 8]} intensity={1.3} color={theme.directional} castShadow shadow-mapSize={[1024, 1024]} />
      <pointLight position={[currentTilePos.x, currentTilePos.y + 3 + ACTIVE_LIFT_VALUE, currentTilePos.z]} intensity={1.2} color={theme.ringColor} distance={6} />
      <hemisphereLight args={[theme.ambient, theme.structureDark, 0.4]} />

      <Ocean theme={theme} />
      <FloatingParticles theme={theme} />
      <PathConnector points={pathPoints} theme={theme} />

      {BOARD_TILES.map((tile, index) => (
        <Tile key={tile.id} tile={tile} position={pathPoints[index]} isActive={index === position} index={index} playerPosition={position} theme={theme} />
      ))}

      <MonsterTrail positions={trailPosRef.current} theme={theme} />
      <MonsterPawn pathPoints={pathPoints} position={position} monster={monster} movementResult={movementResult} trailPosRef={trailPosRef} activeLift={ACTIVE_LIFT_VALUE} monsterPosRef={monsterPosRef} />

      <CameraRig monsterPosRef={monsterPosRef} isMoving={isMoving} recenterRef={recenterRef} />
      <OrbitControls
        minDistance={3}
        maxDistance={14}
        minPolarAngle={Math.PI / 6}
        maxPolarAngle={Math.PI / 2.4}
        enablePan={false}
        enableZoom={true}
        autoRotate={false}
        touches={{ ONE: TOUCH.ROTATE, TWO: TOUCH.DOLLY_ROTATE }}
        enabled={!isMoving}
      />
    </>
  );
}

export function IsometricBoard({ position, monster, isMoving, movementResult, levelId = 1, seasonAccent, seasonGlow, fullscreen = false }: { position: number; monster: Monster; isMoving: boolean; movementResult: { steps: number; tile: BoardTile } | null; levelId?: number; seasonAccent?: string; seasonGlow?: string; fullscreen?: boolean }) {
  const theme = applySeasonTint(getTheme(levelId), seasonAccent, seasonGlow);
  return (
    <div
      className={fullscreen ? "absolute inset-0" : "w-full rounded-2xl overflow-hidden border-4 border-wood-dark bg-cream shadow-chunky-sm"}
      style={fullscreen ? undefined : { height: "min(70vh, 560px)", minHeight: 380 }}
      role="region"
      aria-label="3D Game board"
    >
      <Canvas shadows camera={{ position: [6, 5, 6], fov: 45, near: 0.1, far: 100 }} gl={{ antialias: true, alpha: false }}>
        <color attach="background" args={[theme.bg]} />
        <fog attach="fog" args={[theme.fog, 12, 28]} />
        <IsometricBoardScene position={position} monster={monster} isMoving={isMoving} movementResult={movementResult} levelId={levelId} seasonAccent={seasonAccent} seasonGlow={seasonGlow} />
      </Canvas>
    </div>
  );
}
