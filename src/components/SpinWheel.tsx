import { useState } from "react";
import { motion } from "framer-motion";

const PRIZES = [10, 25, 5, 50, 15, 100, 5, 30];

interface SpinWheelProps {
  onWin: (amount: number) => void;
}

export function SpinWheel({ onWin }: SpinWheelProps) {
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [lastWin, setLastWin] = useState<number | null>(null);
  const [canSpin, setCanSpin] = useState(true);

  const spin = () => {
    if (spinning || !canSpin) return;
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
      setCanSpin(false);
      setTimeout(() => setCanSpin(true), 5000);
    }, 3000);
  };

  return (
    <div className="flex flex-col items-center gap-4" role="region" aria-label="Lucky spin wheel">
      <h3 className="font-display text-2xl text-foreground text-glow-green">
        Lucky Spin
      </h3>

      <div className="relative w-56 h-56" aria-hidden="true">
        {/* Arrow */}
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
        disabled={spinning || !canSpin}
        aria-label={spinning ? "Wheel is spinning" : !canSpin ? "Cooldown, please wait" : "Spin the wheel"}
        className={`px-8 py-3 rounded-full font-bold font-body text-lg transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
          spinning || !canSpin
            ? "bg-muted text-muted-foreground cursor-not-allowed"
            : "bg-primary text-primary-foreground box-glow-green cursor-pointer"
        }`}
      >
        {spinning ? "Spinning..." : !canSpin ? "Wait 5s..." : "SPIN!"}
      </motion.button>

      {lastWin !== null && (
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
