import { useState, useEffect } from "react";
import { motion } from "framer-motion";

const PRIZES = [10, 25, 5, 50, 15, 100, 5, 30];
const COOLDOWN_MS = 12 * 60 * 60 * 1000;

interface SpinWheelProps {
  onWin: (amount: number) => void;
  lastSpinAt?: string | null;
  onSpinRecord?: () => void;
}

function fmt(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function SpinWheel({ onWin, lastSpinAt, onSpinRecord }: SpinWheelProps) {
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [lastWin, setLastWin] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const lastSpinMs = lastSpinAt ? new Date(lastSpinAt).getTime() : 0;
  const remaining = Math.max(0, lastSpinMs + COOLDOWN_MS - now);
  const onCooldown = remaining > 0;

  const spin = () => {
    if (spinning || onCooldown) return;
    setSpinning(true);
    setLastWin(null);

    const prizeIndex = Math.floor(Math.random() * PRIZES.length);
    const segmentAngle = 360 / PRIZES.length;
    const targetAngle = 360 * 5 + (360 - prizeIndex * segmentAngle - segmentAngle / 2);
    const newRotation = rotation + targetAngle;
    setRotation(newRotation);

    setTimeout(() => {
      setSpinning(false);
      setLastWin(PRIZES[prizeIndex]);
      onWin(PRIZES[prizeIndex]);
      onSpinRecord?.();
    }, 3000);
  };

  return (
    <div className="flex flex-col items-center gap-4" role="region" aria-label="Lucky spin wheel">
      <h3 className="font-display text-2xl text-foreground text-glow-green">
        Lucky Spin
      </h3>

      <div className="relative w-56 h-56" aria-hidden="true">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 z-20 text-accent text-2xl">
          ▼
        </div>

        <motion.div
          className="w-full h-full rounded-full border-4 border-primary overflow-hidden box-glow-green"
          animate={{ rotate: rotation }}
          transition={{ duration: 3, ease: [0.17, 0.67, 0.12, 0.99] }}
          style={{ transformOrigin: "center center" }}
        >
          <svg viewBox="0 0 200 200" className="w-full h-full">
            {PRIZES.map((prize, i) => {
              const angle = (360 / PRIZES.length) * i;
              const rad = (angle * Math.PI) / 180;
              const nextRad = (((angle + 360 / PRIZES.length) * Math.PI) / 180);
              const midRad = ((angle + 360 / PRIZES.length / 2) * Math.PI) / 180;
              const colors = [
                "hsl(160, 65%, 38%)",
                "hsl(260, 50%, 50%)",
                "hsl(32, 90%, 48%)",
                "hsl(240, 18%, 22%)",
              ];
              return (
                <g key={i}>
                  <path
                    d={`M100,100 L${100 + 95 * Math.cos(rad)},${100 + 95 * Math.sin(rad)} A95,95 0 0,1 ${100 + 95 * Math.cos(nextRad)},${100 + 95 * Math.sin(nextRad)} Z`}
                    fill={colors[i % colors.length]}
                    stroke="hsl(240, 18%, 16%)"
                    strokeWidth="1"
                  />
                  <text
                    x={100 + 60 * Math.cos(midRad)}
                    y={100 + 60 * Math.sin(midRad)}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill="white"
                    fontSize="12"
                    fontWeight="bold"
                    transform={`rotate(${angle + 360 / PRIZES.length / 2}, ${100 + 60 * Math.cos(midRad)}, ${100 + 60 * Math.sin(midRad)})`}
                  >
                    🪙{prize}
                  </text>
                </g>
              );
            })}
            <circle cx="100" cy="100" r="15" fill="hsl(240, 18%, 16%)" stroke="hsl(160, 65%, 48%)" strokeWidth="2" />
          </svg>
        </motion.div>
      </div>

      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={spin}
        disabled={spinning || onCooldown}
        aria-label={spinning ? "Wheel is spinning" : onCooldown ? `Next spin in ${fmt(remaining)}` : "Spin the wheel"}
        className={`px-8 py-3 rounded-full font-bold font-body text-lg transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
          spinning || onCooldown
            ? "bg-muted text-muted-foreground cursor-not-allowed"
            : "bg-primary text-primary-foreground box-glow-green cursor-pointer"
        }`}
      >
        {spinning ? "Spinning..." : onCooldown ? `NEXT SPIN IN ${fmt(remaining)}` : "SPIN!"}
      </motion.button>

      {onCooldown && (
        <p className="text-xs font-display text-muted-foreground">
          Free spin available every 12 hours
        </p>
      )}

      {lastWin !== null && !onCooldown && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-xl font-bold text-accent font-body"
          role="status"
          aria-live="assertive"
        >
          🎉 Won {lastWin} coins!
        </motion.div>
      )}
      {lastWin !== null && onCooldown && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-xl font-bold text-accent font-body"
          role="status"
          aria-live="assertive"
        >
          🎉 Won {lastWin} coins!
        </motion.div>
      )}
    </div>
  );
}
