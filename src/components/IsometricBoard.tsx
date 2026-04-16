import { useRef, useMemo, useEffect, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Text, Float, Environment, MeshWobbleMaterial } from "@react-three/drei";
import * as THREE from "three";
import { BOARD_TILES, BoardTile, TileType } from "@/hooks/useGameState";
import { Monster } from "@/data/monsters";

const TILE_COLORS_3D: Record<TileType, string> = {
  coins: "#22c55e",
  bonus: "#3b82f6",
  chest: "#f59e0b",
  monster: "#a855f7",
  skull: "#ef4444",
  star: "#eab308",
};

function generatePath(tileCount: number): THREE.Vector3[] {
  const points: THREE.Vector3[] = [];
  for (let i = 0; i < tileCount; i++) {
    const angle = (i / tileCount) * Math.PI * 2.5;
    const radius = 3 + i * 0.25;
    const x = Math.cos(angle) * radius * 0.6;
    const z = Math.sin(angle) * radius * 0.6;
    const y = i * 0.08;
    points.push(new THREE.Vector3(x, y, z));
  }
  return points;
}

// --- Animated tile icons ---

function SpinningCoin({ isActive }: { isActive: boolean }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (!ref.current) return;
    ref.current.rotation.y = state.clock.elapsedTime * (isActive ? 4 : 1.5);
    ref.current.position.y = 0.65 + Math.sin(state.clock.elapsedTime * 2) * 0.05;
  });
  return (
    <mesh ref={ref} position={[0, 0.65, 0]}>
      <cylinderGeometry args={[0.15, 0.15, 0.04, 24]} />
      <meshStandardMaterial color="#fbbf24" emissive="#f59e0b" emissiveIntensity={0.6} metalness={0.8} roughness={0.1} />
    </mesh>
  );
}

function GlowingChest({ isActive }: { isActive: boolean }) {
  const groupRef = useRef<THREE.Group>(null);
  const lidRef = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (!groupRef.current) return;
    groupRef.current.position.y = 0.55 + Math.sin(state.clock.elapsedTime * 1.5) * 0.03;
    if (lidRef.current && isActive) {
      lidRef.current.rotation.x = -Math.sin(state.clock.elapsedTime * 2) * 0.3;
    }
  });
  return (
    <group ref={groupRef} position={[0, 0.55, 0]}>
      <mesh>
        <boxGeometry args={[0.22, 0.14, 0.16]} />
        <meshStandardMaterial color="#92400e" roughness={0.4} metalness={0.2} />
      </mesh>
      <mesh ref={lidRef} position={[0, 0.09, 0]}>
        <boxGeometry args={[0.24, 0.06, 0.18]} />
        <meshStandardMaterial color="#b45309" emissive="#f59e0b" emissiveIntensity={isActive ? 0.8 : 0.2} roughness={0.3} metalness={0.3} />
      </mesh>
      {isActive && (
        <pointLight position={[0, 0.2, 0]} intensity={1.5} color="#fbbf24" distance={1.5} />
      )}
    </group>
  );
}

function PulsingStar({ isActive }: { isActive: boolean }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (!ref.current) return;
    const s = 1 + Math.sin(state.clock.elapsedTime * 3) * 0.15;
    ref.current.scale.set(s, s, s);
    ref.current.rotation.y = state.clock.elapsedTime * 1.2;
    ref.current.rotation.z = Math.sin(state.clock.elapsedTime) * 0.2;
    ref.current.position.y = 0.7 + Math.sin(state.clock.elapsedTime * 2) * 0.08;
  });
  return (
    <mesh ref={ref} position={[0, 0.7, 0]}>
      <octahedronGeometry args={[0.14, 0]} />
      <meshStandardMaterial color="#eab308" emissive="#facc15" emissiveIntensity={isActive ? 1.2 : 0.5} metalness={0.7} roughness={0.1} />
    </mesh>
  );
}

function LightningBolt({ isActive }: { isActive: boolean }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (!ref.current) return;
    ref.current.position.y = 0.65 + Math.sin(state.clock.elapsedTime * 3) * 0.06;
    const flash = isActive ? 0.6 + Math.sin(state.clock.elapsedTime * 8) * 0.4 : 0.3;
    (ref.current.material as THREE.MeshStandardMaterial).emissiveIntensity = flash;
  });
  return (
    <mesh ref={ref} position={[0, 0.65, 0]} rotation={[0, 0, 0.1]}>
      <coneGeometry args={[0.08, 0.25, 4]} />
      <meshStandardMaterial color="#60a5fa" emissive="#3b82f6" emissiveIntensity={0.3} metalness={0.5} roughness={0.2} />
    </mesh>
  );
}

function SkullIcon({ isActive }: { isActive: boolean }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (!ref.current) return;
    ref.current.position.y = 0.65 + Math.sin(state.clock.elapsedTime * 1.8) * 0.04;
    ref.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.8) * 0.3;
  });
  return (
    <group ref={ref} position={[0, 0.65, 0]}>
      <mesh>
        <sphereGeometry args={[0.13, 12, 12]} />
        <meshStandardMaterial color="#fecaca" emissive="#ef4444" emissiveIntensity={isActive ? 0.6 : 0.15} roughness={0.5} />
      </mesh>
      <mesh position={[-0.045, 0.03, 0.1]}>
        <sphereGeometry args={[0.03, 8, 8]} />
        <meshStandardMaterial color="#111" />
      </mesh>
      <mesh position={[0.045, 0.03, 0.1]}>
        <sphereGeometry args={[0.03, 8, 8]} />
        <meshStandardMaterial color="#111" />
      </mesh>
    </group>
  );
}

function MonsterIcon({ isActive }: { isActive: boolean }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (!ref.current) return;
    const wobble = isActive ? 0.15 : 0.05;
    ref.current.scale.x = 1 + Math.sin(state.clock.elapsedTime * 3) * wobble;
    ref.current.scale.z = 1 + Math.cos(state.clock.elapsedTime * 3) * wobble;
    ref.current.position.y = 0.65 + Math.sin(state.clock.elapsedTime * 2) * 0.05;
  });
  return (
    <mesh ref={ref} position={[0, 0.65, 0]}>
      <dodecahedronGeometry args={[0.13, 0]} />
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

// --- Tile ---

interface TileProps {
  tile: BoardTile;
  position: THREE.Vector3;
  isActive: boolean;
  index: number;
  playerPosition: number;
}

function Tile({ tile, position, isActive, index, playerPosition }: TileProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const color = TILE_COLORS_3D[tile.type];
  const distFromPlayer = Math.abs(index - playerPosition);
  const isNearby = distFromPlayer <= 4;

  useFrame((state) => {
    if (!meshRef.current) return;
    if (isActive) {
      meshRef.current.scale.y = 1 + Math.sin(state.clock.elapsedTime * 3) * 0.1;
    }
    if (glowRef.current && isActive) {
      (glowRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity =
        0.5 + Math.sin(state.clock.elapsedTime * 4) * 0.3;
    }
  });

  return (
    <group position={position}>
      {isActive && (
        <mesh ref={glowRef} position={[0, -0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.5, 0.7, 32]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.8} transparent opacity={0.6} />
        </mesh>
      )}

      <mesh ref={meshRef} castShadow receiveShadow position={[0, 0.2, 0]}>
        <cylinderGeometry args={[0.45, 0.5, 0.4, 6]} />
        <meshStandardMaterial
          color={color}
          emissive={isActive ? color : "#000000"}
          emissiveIntensity={isActive ? 0.4 : 0}
          roughness={0.3}
          metalness={0.2}
          transparent={!isNearby}
          opacity={isNearby ? 1 : 0.3}
        />
      </mesh>

      <mesh position={[0, 0.42, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.42, 6]} />
        <meshStandardMaterial
          color={new THREE.Color(color).lerp(new THREE.Color("#ffffff"), 0.3)}
          roughness={0.2}
          metalness={0.4}
          transparent={!isNearby}
          opacity={isNearby ? 1 : 0.3}
        />
      </mesh>

      {/* 3D animated icon */}
      {isNearby && <TileIcon type={tile.type} isActive={isActive} />}

      {isActive && (
        <Float speed={2} floatIntensity={0.3}>
          <Text
            position={[0, 1.1, 0]}
            fontSize={0.2}
            color={tile.value >= 0 ? "#22c55e" : "#ef4444"}
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

// --- Monster Pawn ---

interface MonsterPawnProps {
  position: THREE.Vector3;
  targetPosition: THREE.Vector3;
  monster: Monster;
  isMoving: boolean;
}

function MonsterPawn({ position, targetPosition, monster, isMoving }: MonsterPawnProps) {
  const groupRef = useRef<THREE.Group>(null);
  const currentPos = useRef(position.clone());

  useFrame((state) => {
    if (!groupRef.current) return;
    currentPos.current.lerp(targetPosition, 0.06);
    groupRef.current.position.copy(currentPos.current);
    groupRef.current.position.y = currentPos.current.y + 0.8 + Math.sin(state.clock.elapsedTime * 2) * 0.15;
    groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.2;
  });

  return (
    <group ref={groupRef} position={position}>
      <mesh castShadow>
        <sphereGeometry args={[0.35, 16, 16]} />
        <MeshWobbleMaterial
          color={monster.rarity === "legendary" ? "#a855f7" : monster.rarity === "epic" ? "#3b82f6" : monster.rarity === "rare" ? "#22d3ee" : "#22c55e"}
          factor={isMoving ? 0.4 : 0.1}
          speed={isMoving ? 4 : 1}
          roughness={0.2}
          metalness={0.3}
        />
      </mesh>
      <mesh position={[-0.12, 0.1, 0.28]}><sphereGeometry args={[0.08, 8, 8]} /><meshStandardMaterial color="#ffffff" /></mesh>
      <mesh position={[0.12, 0.1, 0.28]}><sphereGeometry args={[0.08, 8, 8]} /><meshStandardMaterial color="#ffffff" /></mesh>
      <mesh position={[-0.12, 0.1, 0.32]}><sphereGeometry args={[0.04, 8, 8]} /><meshStandardMaterial color="#111111" /></mesh>
      <mesh position={[0.12, 0.1, 0.32]}><sphereGeometry args={[0.04, 8, 8]} /><meshStandardMaterial color="#111111" /></mesh>
      <mesh position={[0, -0.6, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.25, 16]} />
        <meshStandardMaterial color="#000000" transparent opacity={0.3} />
      </mesh>
      <Text position={[0, 0.6, 0]} fontSize={0.15} color="#ffffff" anchorX="center" anchorY="middle" outlineWidth={0.02} outlineColor="#000000">
        {monster.name}
      </Text>
    </group>
  );
}

// --- Scene helpers ---

function PathConnector({ points }: { points: THREE.Vector3[] }) {
  const lineGeometry = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(points);
    const curvePoints = curve.getPoints(100);
    return new THREE.BufferGeometry().setFromPoints(curvePoints);
  }, [points]);

  return (
    <line>
      <bufferGeometry attach="geometry" {...lineGeometry} />
      <lineBasicMaterial attach="material" color="#4b5563" linewidth={2} transparent opacity={0.4} />
    </line>
  );
}

function Ground() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} receiveShadow>
      <planeGeometry args={[30, 30]} />
      <meshStandardMaterial color="#1a1a2e" roughness={0.8} metalness={0.1} />
    </mesh>
  );
}

function FloatingParticles() {
  const particlesRef = useRef<THREE.Points>(null);
  const count = 50;

  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 20;
      pos[i * 3 + 1] = Math.random() * 5;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 20;
    }
    return pos;
  }, []);

  useFrame((state) => {
    if (!particlesRef.current) return;
    particlesRef.current.rotation.y = state.clock.elapsedTime * 0.02;
    const posArray = particlesRef.current.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < count; i++) {
      posArray[i * 3 + 1] += Math.sin(state.clock.elapsedTime + i) * 0.002;
    }
    particlesRef.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.05} color="#a78bfa" transparent opacity={0.6} sizeAttenuation />
    </points>
  );
}

// --- Main scene & export ---

function IsometricBoardScene({ position, monster, isMoving }: { position: number; monster: Monster; isMoving: boolean }) {
  const pathPoints = useMemo(() => generatePath(BOARD_TILES.length), []);
  const currentTilePos = pathPoints[position] || pathPoints[0];

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[8, 12, 8]} intensity={1} castShadow shadow-mapSize={[1024, 1024]} />
      <pointLight position={[currentTilePos.x, currentTilePos.y + 3, currentTilePos.z]} intensity={0.8} color="#a78bfa" distance={6} />

      <Ground />
      <FloatingParticles />
      <PathConnector points={pathPoints} />

      {BOARD_TILES.map((tile, index) => (
        <Tile key={tile.id} tile={tile} position={pathPoints[index]} isActive={index === position} index={index} playerPosition={position} />
      ))}

      <MonsterPawn position={pathPoints[position] || pathPoints[0]} targetPosition={pathPoints[position] || pathPoints[0]} monster={monster} isMoving={isMoving} />

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
        <color attach="background" args={["#0f172a"]} />
        <fog attach="fog" args={["#0f172a", 10, 25]} />
        <IsometricBoardScene position={position} monster={monster} isMoving={isMoving} />
      </Canvas>
    </div>
  );
}
