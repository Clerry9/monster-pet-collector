import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

interface Particle {
  id: number;
  x: number;
  y: number;
  rotate: number;
  hue: number;
  emoji?: string;
}

interface BurstProps {
  /** Trigger key — change to fire a new burst */
  trigger: number;
  count?: number;
  emoji?: string;
  /** Origin within container, in % (0-100) */
  originX?: number;
  originY?: number;
}

/**
 * Lightweight CSS/Framer-Motion confetti burst — no extra deps.
 * Renders briefly, then unmounts.
 */
export function ParticleBurst({
  trigger,
  count = 24,
  emoji,
  originX = 50,
  originY = 50,
}: BurstProps) {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (!trigger) return;
    const next: Particle[] = Array.from({ length: count }, (_, i) => ({
      id: trigger * 1000 + i,
      x: (Math.random() - 0.5) * 320,
      y: -(Math.random() * 220 + 60),
      rotate: (Math.random() - 0.5) * 720,
      hue: Math.floor(Math.random() * 360),
      emoji,
    }));
    setParticles(next);
    const t = setTimeout(() => setParticles([]), 1400);
    return () => clearTimeout(t);
  }, [trigger, count, emoji]);

  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-visible"
      aria-hidden="true"
    >
      <AnimatePresence>
        {particles.map((p) => (
          <motion.span
            key={p.id}
            initial={{ opacity: 1, x: 0, y: 0, rotate: 0, scale: 0.6 }}
            animate={{ opacity: 0, x: p.x, y: p.y, rotate: p.rotate, scale: 1 }}
            transition={{ duration: 1.2, ease: [0.2, 0.7, 0.3, 1] }}
            className="absolute select-none"
            style={{
              left: `${originX}%`,
              top: `${originY}%`,
              fontSize: 18,
              color: `hsl(${p.hue} 95% 60%)`,
            }}
          >
            {p.emoji ?? "✦"}
          </motion.span>
        ))}
      </AnimatePresence>
    </div>
  );
}