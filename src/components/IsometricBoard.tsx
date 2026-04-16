import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Text, Float, MeshWobbleMaterial } from "@react-three/drei";
import * as THREE from "three";
import { BOARD_TILES, BoardTile, TileType } from "@/hooks/useGameState";
import { Monster } from "@/data/monsters";

const TILE_ACCENT: Record<TileType, string> = {
  coins: "#fbbf24",
  bonus: "#60a5fa",
  chest: "#f59e0b",
  monster: "#c084fc",
  skull: "#f87171",
  star: "#facc15",
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
    ref.current.position.y = 0.95 + Math.sin(s.clock.elapsedTime * 2) * 0.05;
  });
  return (
    <mesh ref={ref} position={[0, 0.95, 0]}>
      <cylinderGeometry args={[0.12, 0.12, 0.03, 24]} />
      <meshStandardMaterial color="#fbbf24" emissive="#f59e0b" emissiveIntensity={0.6} metalness={0.8} roughness={0.1} />
    </mesh>
  );
}

function GlowingChest({ isActive }: { isActive: boolean }) {
  const groupRef = useRef<THREE.Group>(null);
  const lidRef = useRef<THREE.Mesh>(null);
  useFrame((s) => {
    if (!groupRef.current) return;
    groupRef.current.position.y = 0.85 + Math.sin(s.clock.elapsedTime * 1.5) * 0.03;
    if (lidRef.current && isActive) lidRef.current.rotation.x = -Math.sin(s.clock.elapsedTime * 2) * 0.3;
  });
  return (
    <group ref={groupRef} position={[0, 0.85, 0]}>
      <mesh><boxGeometry args={[0.18, 0.12, 0.14]} /><meshStandardMaterial color="#92400e" roughness={0.4} metalness={0.2} /></mesh>
      <mesh ref={lidRef} position={[0, 0.08, 0]}>
        <boxGeometry args={[0.2, 0.05, 0.15]} />
        <meshStandardMaterial color="#b45309" emissive="#f59e0b" emissiveIntensity={isActive ? 0.8 : 0.2} roughness={0.3} metalness={0.3} />
      </mesh>
      {isActive && <pointLight position={[0, 0.15, 0]} intensity={1.5} color="#fbbf24" distance={1.2} />}
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
    ref.current.position.y = 0.95 + Math.sin(s.clock.elapsedTime * 2) * 0.08;
  });
  return (
    <mesh ref={ref} position={[0, 0.95, 0]}>
      <octahedronGeometry args={[0.11, 0]} />
      <meshStandardMaterial color="#eab308" emissive="#facc15" emissiveIntensity={isActive ? 1.2 : 0.5} metalness={0.7} roughness={0.1} />
    </mesh>
  );
}

function LightningBolt({ isActive }: { isActive: boolean }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((s) => {
    if (!ref.current) return;
    ref.current.position.y = 0.95 + Math.sin(s.clock.elapsedTime * 3) * 0.06;
    (ref.current.material as THREE.MeshStandardMaterial).emissiveIntensity = isActive ? 0.6 + Math.sin(s.clock.elapsedTime * 8) * 0.4 : 0.3;
  });
  return (
    <mesh ref={ref} position={[0, 0.95, 0]} rotation={[0, 0, 0.1]}>
      <coneGeometry args={[0.07, 0.2, 4]} />
      <meshStandardMaterial color="#60a5fa" emissive="#3b82f6" emissiveIntensity={0.3} metalness={0.5} roughness={0.2} />
    </mesh>
  );
}

function SkullIcon({ isActive }: { isActive: boolean }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((s) => {
    if (!ref.current) return;
    ref.current.position.y = 0.9 + Math.sin(s.clock.elapsedTime * 1.8) * 0.04;
    ref.current.rotation.y = Math.sin(s.clock.elapsedTime * 0.8) * 0.3;
  });
  return (
    <group ref={ref} position={[0, 0.9, 0]}>
      <mesh><sphereGeometry args={[0.1, 12, 12]} /><meshStandardMaterial color="#fecaca" emissive="#ef4444" emissiveIntensity={isActive ? 0.6 : 0.15} roughness={0.5} /></mesh>
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
    ref.current.position.y = 0.9 + Math.sin(s.clock.elapsedTime * 2) * 0.05;
  });
  return (
    <mesh ref={ref} position={[0, 0.9, 0]}>
      <dodecahedronGeometry args={[0.1, 0]} />
      <meshStandardMaterial color="#c084fc" emissive="#a855f7" emissiveIntensity={isActive ? 0.8 : 0.3} metalness={0.4} roughness={0.2} />
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
    case "monster": return <MonsterIcon isActive={isActive} />;
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
        <meshStandardMaterial color="#92400e" roughness={0.9} />
      </mesh>
      {/* Coconuts */}
      <mesh position={[0, height * 0.75, 0]}>
        <sphereGeometry args={[0.03, 6, 6]} />
        <meshStandardMaterial color="#78350f" roughness={0.8} />
      </mesh>
      {/* Fronds - 4 leaf clusters */}
      {[0, 1.5, 3, 4.5].map((a, i) => (
        <mesh key={i} position={[Math.cos(a) * 0.1, height * 0.8, Math.sin(a) * 0.1]} rotation={[0.6 - i * 0.1, a, 0]}>
          <coneGeometry args={[0.12, 0.22, 4]} />
          <meshStandardMaterial color={i % 2 === 0 ? "#16a34a" : "#22c55e"} roughness={0.7} side={THREE.DoubleSide} />
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
      {/* Water splash ring */}
      <mesh position={[0, -0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.72, 1.0, 32]} />
        <meshStandardMaterial color="#0ea5e9" emissive="#0284c7" emissiveIntensity={0.2} transparent opacity={isNearby ? 0.45 : 0.12} />
      </mesh>

      {/* Rock base */}
      <mesh position={[0, 0.12, 0]} castShadow>
        <cylinderGeometry args={[0.55, 0.75, 0.55, 10]} />
        <meshStandardMaterial color="#78716c" roughness={0.95} metalness={0.05} transparent={!isNearby} opacity={isNearby ? 1 : 0.2} />
      </mesh>

      {/* Secondary rock detail */}
      <mesh position={[0.15, 0.08, 0.15]} castShadow>
        <cylinderGeometry args={[0.12, 0.18, 0.3, 6]} />
        <meshStandardMaterial color="#a8a29e" roughness={0.95} transparent={!isNearby} opacity={isNearby ? 0.8 : 0.15} />
      </mesh>

      {/* Dirt layer */}
      <mesh position={[0, 0.38, 0]} castShadow>
        <cylinderGeometry args={[0.58, 0.55, 0.14, 10]} />
        <meshStandardMaterial color="#92400e" roughness={0.85} transparent={!isNearby} opacity={isNearby ? 1 : 0.2} />
      </mesh>

      {/* Grass top */}
      <mesh position={[0, 0.48, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.6, 0.58, 0.1, 10]} />
        <meshStandardMaterial
          color={isActive ? "#4ade80" : "#22c55e"}
          emissive={isActive ? accent : "#000000"}
          emissiveIntensity={isActive ? 0.3 : 0}
          roughness={0.7}
          transparent={!isNearby}
          opacity={isNearby ? 1 : 0.2}
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
            <meshStandardMaterial color="#15803d" roughness={0.8} />
          </mesh>
          <mesh position={[0.1, 0.55, -0.28]}>
            <sphereGeometry args={[0.045, 8, 8]} />
            <meshStandardMaterial color="#16a34a" roughness={0.8} />
          </mesh>
        </>
      )}

      {/* Grass tufts */}
      {isNearby && (
        <>
          <mesh position={[-0.15, 0.55, 0.22]}>
            <coneGeometry args={[0.03, 0.08, 4]} />
            <meshStandardMaterial color="#4ade80" roughness={0.7} />
          </mesh>
          <mesh position={[0.2, 0.55, -0.1]}>
            <coneGeometry args={[0.025, 0.07, 4]} />
            <meshStandardMaterial color="#22c55e" roughness={0.7} />
          </mesh>
        </>
      )}

      {/* Skull island: dead tree stump */}
      {isNearby && tile.type === "skull" && (
        <mesh position={[0.25, 0.55, 0.15]}>
          <cylinderGeometry args={[0.03, 0.04, 0.18, 5]} />
          <meshStandardMaterial color="#57534e" roughness={0.95} />
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
            color={tile.value >= 0 ? "#4ade80" : "#f87171"}
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.02}
            outlineColor="#000000"
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
  const trailOpacities = useMemo(() => new Float32Array(MAX_TRAIL), []);

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

    trailRef.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={trailRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={MAX_TRAIL} array={trailPositions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.08} color="#a78bfa" transparent opacity={0.5} sizeAttenuation />
    </points>
  );
}

// --- Monster Pawn (moves tile-by-tile) ---

interface MonsterPawnProps {
  pathPoints: THREE.Vector3[];
  position: number;
  monster: Monster;
  isMoving: boolean;
  trailPosRef: React.MutableRefObject<THREE.Vector3[]>;
}

function MonsterPawn({ pathPoints, position, monster, isMoving, trailPosRef }: MonsterPawnProps) {
  const groupRef = useRef<THREE.Group>(null);
  const currentPos = useRef(pathPoints[position]?.clone() || new THREE.Vector3());

  useFrame((state) => {
    if (!groupRef.current) return;
    const target = pathPoints[position] || pathPoints[0];
    // Smooth lerp to target tile center
    currentPos.current.lerp(target, 0.08);
    groupRef.current.position.set(
      currentPos.current.x,
      currentPos.current.y + 0.85 + Math.sin(state.clock.elapsedTime * 2) * 0.12,
      currentPos.current.z
    );
    groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.2;

    // Feed trail
    trailPosRef.current = [new THREE.Vector3(currentPos.current.x, currentPos.current.y, currentPos.current.z)];
  });

  return (
    <group ref={groupRef}>
      <mesh castShadow>
        <sphereGeometry args={[0.3, 16, 16]} />
        <MeshWobbleMaterial
          color={monster.rarity === "legendary" ? "#a855f7" : monster.rarity === "epic" ? "#3b82f6" : monster.rarity === "rare" ? "#22d3ee" : "#22c55e"}
          factor={isMoving ? 0.4 : 0.1}
          speed={isMoving ? 4 : 1}
          roughness={0.2}
          metalness={0.3}
        />
      </mesh>
      {/* Eyes */}
      <mesh position={[-0.1, 0.08, 0.24]}><sphereGeometry args={[0.07, 8, 8]} /><meshStandardMaterial color="#ffffff" /></mesh>
      <mesh position={[0.1, 0.08, 0.24]}><sphereGeometry args={[0.07, 8, 8]} /><meshStandardMaterial color="#ffffff" /></mesh>
      <mesh position={[-0.1, 0.08, 0.28]}><sphereGeometry args={[0.035, 8, 8]} /><meshStandardMaterial color="#111" /></mesh>
      <mesh position={[0.1, 0.08, 0.28]}><sphereGeometry args={[0.035, 8, 8]} /><meshStandardMaterial color="#111" /></mesh>
      {/* Shadow */}
      <mesh position={[0, -0.55, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.22, 16]} />
        <meshStandardMaterial color="#000000" transparent opacity={0.25} />
      </mesh>
      {/* Name */}
      <Text position={[0, 0.5, 0]} fontSize={0.13} color="#ffffff" anchorX="center" anchorY="middle" outlineWidth={0.02} outlineColor="#000000">
        {monster.name}
      </Text>
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
      <meshStandardMaterial color="#94a3b8" emissive="#475569" emissiveIntensity={0.15} roughness={0.6} transparent opacity={0.5} />
    </mesh>
  );
}

function Ocean() {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((s) => {
    if (!ref.current) return;
    ref.current.position.y = -0.2 + Math.sin(s.clock.elapsedTime * 0.5) * 0.02;
  });
  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.2, 0]} receiveShadow>
      <planeGeometry args={[40, 40]} />
      <meshStandardMaterial color="#0c4a6e" roughness={0.4} metalness={0.1} transparent opacity={0.85} />
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

  useFrame((s) => {
    if (!particlesRef.current) return;
    particlesRef.current.rotation.y = s.clock.elapsedTime * 0.015;
    const arr = particlesRef.current.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < count; i++) arr[i * 3 + 1] += Math.sin(s.clock.elapsedTime + i) * 0.001;
    particlesRef.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.04} color="#e0e7ff" transparent opacity={0.5} sizeAttenuation />
    </points>
  );
}

// --- Main scene ---

function IsometricBoardScene({ position, monster, isMoving }: { position: number; monster: Monster; isMoving: boolean }) {
  const pathPoints = useMemo(() => generatePath(BOARD_TILES.length), []);
  const currentTilePos = pathPoints[position] || pathPoints[0];
  const trailPosRef = useRef<THREE.Vector3[]>([]);

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[8, 14, 8]} intensity={1.1} castShadow shadow-mapSize={[1024, 1024]} />
      <pointLight position={[currentTilePos.x, currentTilePos.y + 3, currentTilePos.z]} intensity={0.7} color="#a78bfa" distance={5} />
      <hemisphereLight args={["#bfdbfe", "#1e3a5f", 0.3]} />

      <Ocean />
      <FloatingParticles />
      <PathConnector points={pathPoints} />

      {BOARD_TILES.map((tile, index) => (
        <Tile key={tile.id} tile={tile} position={pathPoints[index]} isActive={index === position} index={index} playerPosition={position} />
      ))}

      <MonsterTrail positions={trailPosRef.current} />
      <MonsterPawn pathPoints={pathPoints} position={position} monster={monster} isMoving={isMoving} trailPosRef={trailPosRef} />

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

export function IsometricBoard({ position, monster, isMoving }: { position: number; monster: Monster; isMoving: boolean }) {
  return (
    <div className="w-full h-[400px] rounded-2xl overflow-hidden border border-border bg-card" role="region" aria-label="3D Game board">
      <Canvas shadows camera={{ position: [6, 5, 6], fov: 45, near: 0.1, far: 100 }} gl={{ antialias: true, alpha: false }}>
        <color attach="background" args={["#0c1929"]} />
        <fog attach="fog" args={["#0c1929", 12, 28]} />
        <IsometricBoardScene position={position} monster={monster} isMoving={isMoving} />
      </Canvas>
    </div>
  );
}
