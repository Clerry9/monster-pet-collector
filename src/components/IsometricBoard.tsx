import { useRef, useMemo, useState, useEffect } from "react";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { OrbitControls, Text, Float, MeshWobbleMaterial, Billboard } from "@react-three/drei";
import * as THREE from "three";
import { BOARD_TILES, BoardTile, TileType } from "@/hooks/useGameState";
import { Monster } from "@/data/monsters";

// Warm cartoon-casino palette
const TILE_ACCENT: Record<TileType, string> = {
  coins: "#F5B324",  // gold
  bonus: "#E63946",  // candy red
  chest: "#D97706",  // burnt amber
  food: "#F472B6",   // candy pink
  skull: "#7C2D12",  // dark wood
  star: "#FCD34D",   // bright gold
};

// Theme constants
const THEME = {
  cream: "#F4DCB0",
  creamLight: "#FBE8C0",
  wood: "#8B4A24",
  woodDark: "#5C2E14",
  gold: "#F5B324",
  goldDeep: "#D97706",
  grassLight: "#A3D977",
  grassDark: "#6BAA3E",
  dirt: "#A0612C",
  rock: "#B8956A",
  rockDark: "#8B6F4A",
  red: "#E63946",
};

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

function SpinningCoin({ isActive }: { isActive: boolean }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((s) => {
    if (!ref.current) return;
    ref.current.rotation.y = s.clock.elapsedTime * (isActive ? 4 : 1.5);
    ref.current.position.y = 1.1 + Math.sin(s.clock.elapsedTime * 2) * 0.05;
  });
  return (
    <mesh ref={ref} position={[0, 1.1, 0]}>
      <cylinderGeometry args={[0.12, 0.12, 0.03, 24]} />
      <meshStandardMaterial color={THEME.gold} emissive={THEME.goldDeep} emissiveIntensity={0.6} metalness={0.8} roughness={0.1} />
    </mesh>
  );
}

function GlowingChest({ isActive }: { isActive: boolean }) {
  const groupRef = useRef<THREE.Group>(null);
  const lidRef = useRef<THREE.Mesh>(null);
  useFrame((s) => {
    if (!groupRef.current) return;
    groupRef.current.position.y = 1.0 + Math.sin(s.clock.elapsedTime * 1.5) * 0.03;
    if (lidRef.current && isActive) lidRef.current.rotation.x = -Math.sin(s.clock.elapsedTime * 2) * 0.3;
  });
  return (
    <group ref={groupRef} position={[0, 1.0, 0]}>
      <mesh><boxGeometry args={[0.18, 0.12, 0.14]} /><meshStandardMaterial color={THEME.wood} roughness={0.4} metalness={0.2} /></mesh>
      <mesh ref={lidRef} position={[0, 0.08, 0]}>
        <boxGeometry args={[0.2, 0.05, 0.15]} />
        <meshStandardMaterial color={THEME.goldDeep} emissive={THEME.gold} emissiveIntensity={isActive ? 0.8 : 0.2} roughness={0.3} metalness={0.5} />
      </mesh>
      {isActive && <pointLight position={[0, 0.15, 0]} intensity={1.5} color={THEME.gold} distance={1.2} />}
    </group>
  );
}

function PulsingStar({ isActive }: { isActive: boolean }) {
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
      <meshStandardMaterial color={THEME.goldDeep} emissive={THEME.gold} emissiveIntensity={isActive ? 1.2 : 0.5} metalness={0.7} roughness={0.1} />
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
      <meshStandardMaterial color={THEME.red} emissive={THEME.red} emissiveIntensity={0.4} metalness={0.5} roughness={0.2} />
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
      <mesh><sphereGeometry args={[0.1, 12, 12]} /><meshStandardMaterial color="#FBE8C0" emissive={THEME.red} emissiveIntensity={isActive ? 0.6 : 0.15} roughness={0.5} /></mesh>
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

function TileIcon({ type, isActive }: { type: TileType; isActive: boolean }) {
  switch (type) {
    case "coins": return <SpinningCoin isActive={isActive} />;
    case "chest": return <GlowingChest isActive={isActive} />;
    case "star": return <PulsingStar isActive={isActive} />;
    case "bonus": return <LightningBolt isActive={isActive} />;
    case "skull": return <SkullIcon isActive={isActive} />;
    case "food": return <MonsterIcon isActive={isActive} />;
    default: return null;
  }
}

// --- Island Tile ---

interface TileProps {
  tile: BoardTile;
  position: THREE.Vector3;
  isActive: boolean;
  index: number;
  playerPosition: number;
}

// Animated wave rings around islands
function WaveRings() {
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
        <meshStandardMaterial color={THEME.gold} emissive={THEME.goldDeep} emissiveIntensity={0.35} transparent opacity={0.45} />
      </mesh>
      <mesh ref={ring2} position={[0, -0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.85, 0.98, 32]} />
        <meshStandardMaterial color={THEME.creamLight} emissive={THEME.gold} emissiveIntensity={0.25} transparent opacity={0.35} />
      </mesh>
      <mesh ref={ring3} position={[0, -0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.98, 1.12, 32]} />
        <meshStandardMaterial color={THEME.cream} emissive={THEME.creamLight} emissiveIntensity={0.15} transparent opacity={0.25} />
      </mesh>
    </group>
  );
}

// Deterministic pseudo-random from index
function seededRandom(seed: number) {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function PalmTree({ px, pz, height, seed }: { px: number; pz: number; height: number; seed: number }) {
  const trunkRef = useRef<THREE.Group>(null);
  const lean = (seededRandom(seed + 3) - 0.5) * 0.25;

  useFrame((s) => {
    if (!trunkRef.current) return;
    trunkRef.current.rotation.z = lean + Math.sin(s.clock.elapsedTime * 1.2 + seed) * 0.04;
    trunkRef.current.rotation.x = Math.sin(s.clock.elapsedTime * 0.9 + seed * 2) * 0.03;
  });

  return (
    <group ref={trunkRef} position={[px, 0.48, pz]}>
      {/* Trunk */}
      <mesh position={[0, height * 0.4, 0]}>
        <cylinderGeometry args={[0.025, 0.04, height * 0.8, 6]} />
        <meshStandardMaterial color={THEME.wood} roughness={0.9} />
      </mesh>
      {/* Coconuts */}
      <mesh position={[0, height * 0.75, 0]}>
        <sphereGeometry args={[0.03, 6, 6]} />
        <meshStandardMaterial color={THEME.woodDark} roughness={0.8} />
      </mesh>
      {/* Fronds - 4 leaf clusters */}
      {[0, 1.5, 3, 4.5].map((a, i) => (
        <mesh key={i} position={[Math.cos(a) * 0.1, height * 0.8, Math.sin(a) * 0.1]} rotation={[0.6 - i * 0.1, a, 0]}>
          <coneGeometry args={[0.12, 0.22, 4]} />
          <meshStandardMaterial color={i % 2 === 0 ? THEME.grassDark : THEME.grassLight} roughness={0.7} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}

function Tile({ tile, position, isActive, index, playerPosition }: TileProps) {
  const islandRef = useRef<THREE.Group>(null);
  const distFromPlayer = Math.abs(index - playerPosition);
  const isNearby = distFromPlayer <= 5;
  const accent = TILE_ACCENT[tile.type];
  const r = (n: number) => seededRandom(index * 17 + n);

  useFrame((s) => {
    if (!islandRef.current) return;
    if (isActive) {
      islandRef.current.position.y = position.y + Math.sin(s.clock.elapsedTime * 2) * 0.05;
    }
  });

  const hasPalm = tile.type !== "skull";
  const palmCount = hasPalm ? (tile.type === "star" || tile.type === "chest" ? 2 : 1) : 0;

  return (
    <group ref={islandRef} position={position}>
      {/* Animated wave rings */}
      {isNearby && <WaveRings />}
      {/* Static water ring for distant islands */}
      {!isNearby && (
        <mesh position={[0, -0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.72, 1.0, 32]} />
          <meshStandardMaterial color={THEME.gold} emissive={THEME.goldDeep} emissiveIntensity={0.2} transparent opacity={0.18} />
        </mesh>
      )}

      {/* Rock base */}
      <mesh position={[0, 0.12, 0]} castShadow>
        <cylinderGeometry args={[0.55, 0.75, 0.55, 10]} />
        <meshStandardMaterial color={THEME.rockDark} roughness={0.95} metalness={0.05} transparent={!isNearby} opacity={isNearby ? 1 : 0.3} />
      </mesh>

      {/* Secondary rock detail */}
      <mesh position={[0.15, 0.08, 0.15]} castShadow>
        <cylinderGeometry args={[0.12, 0.18, 0.3, 6]} />
        <meshStandardMaterial color={THEME.rock} roughness={0.95} transparent={!isNearby} opacity={isNearby ? 0.9 : 0.25} />
      </mesh>

      {/* Dirt layer */}
      <mesh position={[0, 0.38, 0]} castShadow>
        <cylinderGeometry args={[0.58, 0.55, 0.14, 10]} />
        <meshStandardMaterial color={THEME.dirt} roughness={0.85} transparent={!isNearby} opacity={isNearby ? 1 : 0.3} />
      </mesh>

      {/* Grass top */}
      <mesh position={[0, 0.48, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.6, 0.58, 0.1, 10]} />
        <meshStandardMaterial
          color={isActive ? THEME.grassLight : THEME.grassDark}
          emissive={isActive ? accent : "#000000"}
          emissiveIntensity={isActive ? 0.3 : 0}
          roughness={0.7}
          transparent={!isNearby}
          opacity={isNearby ? 1 : 0.3}
        />
      </mesh>

      {/* Accent ring */}
      {isNearby && (
        <mesh position={[0, 0.54, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.52, 0.61, 32]} />
          <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={isActive ? 0.7 : 0.15} transparent opacity={isActive ? 0.8 : 0.35} />
        </mesh>
      )}

      {/* Palm trees */}
      {isNearby && palmCount >= 1 && (
        <PalmTree px={0.3 * (r(1) > 0.5 ? 1 : -1)} pz={0.25 * (r(2) > 0.5 ? 1 : -1)} height={0.55 + r(0) * 0.2} seed={index} />
      )}
      {isNearby && palmCount >= 2 && (
        <PalmTree px={-0.25 * (r(4) > 0.5 ? 1 : -1)} pz={0.3 * (r(5) > 0.5 ? 1 : -1)} height={0.45 + r(6) * 0.15} seed={index + 100} />
      )}

      {/* Small bushes */}
      {isNearby && tile.type !== "skull" && (
        <>
          <mesh position={[-0.22, 0.56, -0.18]}>
            <sphereGeometry args={[0.06, 8, 8]} />
            <meshStandardMaterial color={THEME.grassDark} roughness={0.8} />
          </mesh>
          <mesh position={[0.1, 0.55, -0.28]}>
            <sphereGeometry args={[0.045, 8, 8]} />
            <meshStandardMaterial color={THEME.grassLight} roughness={0.8} />
          </mesh>
        </>
      )}

      {/* Grass tufts */}
      {isNearby && (
        <>
          <mesh position={[-0.15, 0.55, 0.22]}>
            <coneGeometry args={[0.03, 0.08, 4]} />
            <meshStandardMaterial color={THEME.grassLight} roughness={0.7} />
          </mesh>
          <mesh position={[0.2, 0.55, -0.1]}>
            <coneGeometry args={[0.025, 0.07, 4]} />
            <meshStandardMaterial color={THEME.grassDark} roughness={0.7} />
          </mesh>
        </>
      )}

      {/* Skull island: dead tree stump */}
      {isNearby && tile.type === "skull" && (
        <mesh position={[0.25, 0.55, 0.15]}>
          <cylinderGeometry args={[0.03, 0.04, 0.18, 5]} />
          <meshStandardMaterial color={THEME.woodDark} roughness={0.95} />
        </mesh>
      )}

      {/* Active glow underneath */}
      {isActive && (
        <mesh position={[0, -0.08, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.85, 32]} />
          <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.5} transparent opacity={0.25} />
        </mesh>
      )}

      {/* 3D animated icon floating above island */}
      {isNearby && <TileIcon type={tile.type} isActive={isActive} />}

      {/* Value text */}
      {isActive && (
        <Float speed={2} floatIntensity={0.3}>
          <Text
            position={[0, 1.5, 0]}
            fontSize={0.22}
            color={tile.value >= 0 ? "#FCD34D" : "#FCA5A5"}
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.025}
            outlineColor="#5C2E14"
          >
            {tile.value >= 0 ? `+${tile.value}` : `${tile.value}`}
          </Text>
        </Float>
      )}
    </group>
  );
}

// --- Monster Trail ---

function MonsterTrail({ positions }: { positions: THREE.Vector3[] }) {
  const trailRef = useRef<THREE.Points>(null);
  const MAX_TRAIL = 30;

  const trailPositions = useMemo(() => new Float32Array(MAX_TRAIL * 3), []);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(trailPositions, 3));
    return geo;
  }, [trailPositions]);

  useEffect(() => {
    return () => {
      geometry.dispose();
    };
  }, [geometry]);

  useFrame(() => {
    if (!trailRef.current || positions.length === 0) return;
    const last = positions[positions.length - 1];
    // Shift trail backwards
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
      <pointsMaterial size={0.08} color={THEME.gold} transparent opacity={0.6} sizeAttenuation />
    </points>
  );
}

// --- Monster Pawn (sprite-based, hops tile-by-tile) ---

interface MonsterPawnProps {
  pathPoints: THREE.Vector3[];
  position: number;
  monster: Monster;
  movementResult: { steps: number; tile: BoardTile } | null;
  trailPosRef: React.MutableRefObject<THREE.Vector3[]>;
}

function MonsterPawn({ pathPoints, position, monster, movementResult, trailPosRef }: MonsterPawnProps) {
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

  useEffect(() => {
    startNextStep();
  }, [movementResult]);

  useEffect(() => {
    texture.colorSpace = THREE.SRGBColorSpace;
  }, [texture]);

  useEffect(() => {
    scheduledPosition.current = position;
  }, [position]);

  useEffect(() => {
    if (!pathPoints.length) {
      currentPos.current.set(0, 0, 0);
    }
  }, [pathPoints.length]);

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    startNextStep();

    let hopY = 0;
    let hopScale = 1;
    let hopRotZ = 0;

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

    const isAnimating = activeTile.current !== null || queuedTiles.current.length > 0;
    const idleBob = isAnimating ? 0 : Math.sin(state.clock.elapsedTime * 2) * 0.06;
    const idleScale = isAnimating ? 1 : 1 + Math.sin(state.clock.elapsedTime * 1.5) * 0.03;

    groupRef.current.position.set(
      currentPos.current.x,
      currentPos.current.y + 1.1 + hopY + idleBob,
      currentPos.current.z
    );
    groupRef.current.scale.setScalar(hopScale * idleScale);
    groupRef.current.rotation.z = hopRotZ;

    // Feed trail
    trailPosRef.current = [new THREE.Vector3(currentPos.current.x, currentPos.current.y, currentPos.current.z)];
  });

  return (
    <group ref={groupRef}>
      {/* Monster sprite using actual image */}
      <Billboard follow lockX={false} lockY={false} lockZ={false}>
        <mesh>
          <planeGeometry args={[0.8, 0.8]} />
          <meshBasicMaterial map={texture} transparent alphaTest={0.1} side={THREE.DoubleSide} />
        </mesh>
      </Billboard>
      {/* Glow behind */}
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
      {/* Shadow on ground */}
      <mesh position={[0, -0.8, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.25, 16]} />
        <meshStandardMaterial color="#000000" transparent opacity={0.3} />
      </mesh>
      {/* Name */}
      <Billboard>
        <Text position={[0, 0.55, 0]} fontSize={0.13} color="#ffffff" anchorX="center" anchorY="middle" outlineWidth={0.02} outlineColor="#000000">
          {monster.name}
        </Text>
      </Billboard>
    </group>
  );
}

// --- Scene helpers ---

function PathConnector({ points }: { points: THREE.Vector3[] }) {
  const tubeRef = useRef<THREE.Mesh>(null);
  const curve = useMemo(() => new THREE.CatmullRomCurve3(points), [points]);

  return (
    <mesh ref={tubeRef}>
      <tubeGeometry args={[curve, 100, 0.04, 8, false]} />
      <meshStandardMaterial color={THEME.wood} emissive={THEME.goldDeep} emissiveIntensity={0.2} roughness={0.6} transparent opacity={0.6} />
    </mesh>
  );
}

function Ocean() {
  const ref = useRef<THREE.Mesh>(null);
  const geoRef = useRef<THREE.PlaneGeometry | null>(null);

  useFrame((s) => {
    if (!ref.current) return;
    // Gentle overall bob
    ref.current.position.y = -0.2 + Math.sin(s.clock.elapsedTime * 0.5) * 0.02;

    // Vertex-based waves
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
  useEffect(() => {
    geoRef.current = geometry;
  }, [geometry]);

  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.2, 0]} receiveShadow geometry={geometry}>
      <meshStandardMaterial color="#5BA3D9" emissive="#3A7FB8" emissiveIntensity={0.15} roughness={0.3} metalness={0.2} transparent opacity={0.9} />
    </mesh>
  );
}

function FloatingParticles() {
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

  useEffect(() => {
    return () => {
      geometry.dispose();
    };
  }, [geometry]);

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
      <pointsMaterial size={0.05} color={THEME.creamLight} transparent opacity={0.7} sizeAttenuation />
    </points>
  );
}

// --- Main scene ---

function IsometricBoardScene({ position, monster, isMoving, movementResult }: { position: number; monster: Monster; isMoving: boolean; movementResult: { steps: number; tile: BoardTile } | null }) {
  const pathPoints = useMemo(() => generatePath(BOARD_TILES.length), []);
  const currentTilePos = pathPoints[position] || pathPoints[0];
  const trailPosRef = useRef<THREE.Vector3[]>([]);

  return (
    <>
      <ambientLight intensity={0.7} color="#FFF4D6" />
      <directionalLight position={[8, 14, 8]} intensity={1.3} color="#FFE8B0" castShadow shadow-mapSize={[1024, 1024]} />
      <pointLight position={[currentTilePos.x, currentTilePos.y + 3, currentTilePos.z]} intensity={0.8} color={THEME.gold} distance={5} />
      <hemisphereLight args={["#FFE5A8", "#8B4A24", 0.4]} />

      <Ocean />
      <FloatingParticles />
      <PathConnector points={pathPoints} />

      {BOARD_TILES.map((tile, index) => (
        <Tile key={tile.id} tile={tile} position={pathPoints[index]} isActive={index === position} index={index} playerPosition={position} />
      ))}

      <MonsterTrail positions={trailPosRef.current} />
      <MonsterPawn pathPoints={pathPoints} position={position} monster={monster} movementResult={movementResult} trailPosRef={trailPosRef} />

      <OrbitControls
        target={[currentTilePos.x, currentTilePos.y + 1, currentTilePos.z]}
        minDistance={3}
        maxDistance={12}
        minPolarAngle={Math.PI / 6}
        maxPolarAngle={Math.PI / 2.5}
        enablePan={false}
        autoRotate={!isMoving}
        autoRotateSpeed={0.3}
      />
    </>
  );
}

export function IsometricBoard({ position, monster, isMoving, movementResult }: { position: number; monster: Monster; isMoving: boolean; movementResult: { steps: number; tile: BoardTile } | null }) {
  return (
    <div className="w-full h-[400px] rounded-2xl overflow-hidden border-4 border-wood-dark bg-cream shadow-chunky-sm" role="region" aria-label="3D Game board">
      <Canvas shadows camera={{ position: [6, 5, 6], fov: 45, near: 0.1, far: 100 }} gl={{ antialias: true, alpha: false }}>
        <color attach="background" args={["#F4DCB0"]} />
        <fog attach="fog" args={["#F4DCB0", 12, 28]} />
        <IsometricBoardScene position={position} monster={monster} isMoving={isMoving} movementResult={movementResult} />
      </Canvas>
    </div>
  );
}
