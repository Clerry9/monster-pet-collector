import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { Float, Environment, ContactShadows } from "@react-three/drei";
import * as THREE from "three";
import { getLowPowerMode, subscribeLowPower } from "@/lib/lowPower";

interface Monster3DProps {
  src: string;
  size?: number; // canvas pixel size (square)
  glow?: string; // CSS color for the glow halo behind the sprite
  /** When true, renders without the floating glow halo / shadows for thumbnails */
  compact?: boolean;
  /** Show a tiny "3D" / "2D" debug badge in the corner. */
  debugBadge?: boolean;
}

/** Persisted across the app: once we've decided to drop to 2D we keep that
 *  decision for the rest of the session so we don't churn between modes. */
let SESSION_LOW_POWER: boolean | null = null;
const LOW_POWER_QUERY = "(max-width: 520px)";

function detectInitialLowPower(): boolean {
  if (SESSION_LOW_POWER !== null) return SESSION_LOW_POWER;
  if (typeof window === "undefined") return false;
  try {
    if (window.matchMedia(LOW_POWER_QUERY).matches) {
      SESSION_LOW_POWER = true;
      return true;
    }
  } catch {
    /* ignore */
  }
  return false;
}

/** FPS sampler — switches to 2D fallback only when performance is consistently very low. */
function FpsWatcher({ onLowFps }: { onLowFps: () => void }) {
  const frames = useRef(0);
  const start = useRef(performance.now());
  const lowSamples = useRef(0);
  useFrame(() => {
    frames.current += 1;
    const now = performance.now();
    const elapsed = now - start.current;
    if (elapsed >= 1000) {
      const fps = (frames.current * 1000) / elapsed;
      lowSamples.current = fps < 18 ? lowSamples.current + 1 : 0;
      if (lowSamples.current >= 4) onLowFps();
      frames.current = 0;
      start.current = now;
    }
  });
  return null;
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

export function Monster3D({ src, size = 220, glow, compact = false, debugBadge = false }: Monster3DProps) {
  const [autoLowPower, setAutoLowPower] = useState<boolean>(() => detectInitialLowPower());
  const [override, setOverride] = useState(() => getLowPowerMode());

  useEffect(() => subscribeLowPower(() => setOverride(getLowPowerMode())), []);

  // Resolve effective mode: explicit override wins over auto-detection.
  const lowPower = override === "force-2d" ? true : override === "force-3d" ? false : autoLowPower;

  // React to viewport changes (e.g. rotation) so we re-evaluate on resize.
  useEffect(() => {
    if (lowPower) return;
    const mql = window.matchMedia(LOW_POWER_QUERY);
    const handler = () => { if (mql.matches) { SESSION_LOW_POWER = true; setAutoLowPower(true); } };
    mql.addEventListener?.("change", handler);
    return () => mql.removeEventListener?.("change", handler);
  }, [lowPower]);

  if (lowPower) {
    // 2D fallback — uses the existing sprite directly. Keeps the glow halo
    // for visual parity with the 3D version.
    return (
      <div
        className="relative flex items-center justify-center"
        style={{ width: size, height: size }}
        role="img"
        aria-label="Monster"
      >
        {!compact && glow && (
          <div
            className="absolute inset-0 rounded-full blur-3xl opacity-50 pointer-events-none"
            style={{ background: glow }}
            aria-hidden="true"
          />
        )}
        <img
          src={src}
          alt=""
          width={size}
          height={size}
          loading="lazy"
          className="relative z-10 w-full h-full object-contain drop-shadow-2xl"
        />
        {debugBadge && (
          <span
            className="absolute top-1 right-1 z-20 rounded-full bg-black/70 text-[9px] uppercase tracking-wider text-amber-300 px-1.5 py-0.5 font-mono pointer-events-none"
            aria-hidden="true"
            title={override === "force-2d" ? "Forced 2D via settings" : "Auto-fallback (low power)"}
          >
            2D
          </span>
        )}
      </div>
    );
  }

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
        {/* Skip auto-fallback if the user explicitly forced 3D — they own the choice. */}
        {override !== "force-3d" && (
          <FpsWatcher onLowFps={() => { SESSION_LOW_POWER = true; setAutoLowPower(true); }} />
        )}
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
      {debugBadge && (
        <span
          className="absolute top-1 right-1 z-20 rounded-full bg-black/70 text-[9px] uppercase tracking-wider text-emerald-300 px-1.5 py-0.5 font-mono pointer-events-none"
          aria-hidden="true"
          title={override === "force-3d" ? "Forced 3D via settings" : "3D auto"}
        >
          3D
        </span>
      )}
    </div>
  );
}

export default Monster3D;