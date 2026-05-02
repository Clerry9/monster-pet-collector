import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { Float, Environment, ContactShadows } from "@react-three/drei";
import * as THREE from "three";

interface Monster3DProps {
  src: string;
  size?: number; // canvas pixel size (square)
  glow?: string; // CSS color for the glow halo behind the sprite
  /** When true, renders without the floating glow halo / shadows for thumbnails */
  compact?: boolean;
}

/**
 * Stylized 3D rendering of an existing 2D monster sprite.
 *
 * The sprite is mapped onto a thin plane that floats, breathes, and reacts to
 * the cursor with subtle parallax tilt — giving a 3D feel without requiring
 * actual GLB models.
 */
function MonsterPlane({ src }: { src: string }) {
  const texture = useLoader(THREE.TextureLoader, src);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;

  const meshRef = useRef<THREE.Mesh>(null);
  // Aspect ratio: keep sprite proportional. Most monster art is roughly
  // square but we still derive from the texture to avoid stretching.
  const aspect = useMemo(() => {
    const img = (texture as THREE.Texture).image as HTMLImageElement | undefined;
    if (!img || !img.width || !img.height) return 1;
    return img.width / img.height;
  }, [texture]);

  useFrame(({ clock, pointer }) => {
    const m = meshRef.current;
    if (!m) return;
    const t = clock.getElapsedTime();
    // Idle breathing scale.
    const s = 1 + Math.sin(t * 1.6) * 0.025;
    m.scale.set(s * aspect, s, 1);
    // Pointer parallax tilt (clamped).
    const tx = THREE.MathUtils.clamp(pointer.x, -1, 1) * 0.25;
    const ty = THREE.MathUtils.clamp(pointer.y, -1, 1) * 0.18;
    m.rotation.y = THREE.MathUtils.lerp(m.rotation.y, tx, 0.08);
    m.rotation.x = THREE.MathUtils.lerp(m.rotation.x, -ty, 0.08);
    // Gentle vertical bob.
    m.position.y = Math.sin(t * 2) * 0.05;
  });

  return (
    <mesh ref={meshRef}>
      <planeGeometry args={[2, 2, 1, 1]} />
      <meshStandardMaterial
        map={texture}
        transparent
        alphaTest={0.05}
        side={THREE.DoubleSide}
        roughness={0.6}
        metalness={0.05}
      />
    </mesh>
  );
}

export function Monster3D({ src, size = 220, glow, compact = false }: Monster3DProps) {
  return (
    <div
      className="relative"
      style={{ width: size, height: size }}
      role="img"
      aria-label="3D monster"
    >
      {!compact && glow && (
        <div
          className="absolute inset-0 rounded-full blur-3xl opacity-50 pointer-events-none"
          style={{ background: glow }}
          aria-hidden="true"
        />
      )}
      <Canvas
        camera={{ position: [0, 0, 3], fov: 35 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true, preserveDrawingBuffer: false }}
        style={{ background: "transparent" }}
      >
        <ambientLight intensity={0.85} />
        <directionalLight position={[2, 3, 4]} intensity={0.9} />
        <directionalLight position={[-3, -1, 2]} intensity={0.35} color="#a78bfa" />
        <Suspense fallback={null}>
          <Float speed={1.4} rotationIntensity={0.15} floatIntensity={0.4}>
            <MonsterPlane src={src} />
          </Float>
          {!compact && (
            <ContactShadows
              position={[0, -1.05, 0]}
              opacity={0.45}
              scale={3}
              blur={2.5}
              far={2}
              color="#000000"
            />
          )}
          <Environment preset="city" />
        </Suspense>
      </Canvas>
    </div>
  );
}

export default Monster3D;