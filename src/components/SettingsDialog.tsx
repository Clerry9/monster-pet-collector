import { motion, AnimatePresence } from "framer-motion";
import { X, Cpu, Box } from "lucide-react";
import { useEffect, useState } from "react";
import { getLowPowerMode, setLowPowerMode, subscribeLowPower, type LowPowerMode } from "@/lib/lowPower";

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
}

const OPTIONS: { value: LowPowerMode; label: string; help: string }[] = [
  { value: "auto",     label: "Auto",      help: "Use 3D when the device can handle it; fall back to 2D on small or slow devices." },
  { value: "force-3d", label: "Always 3D", help: "Force 3D monsters everywhere. May reduce battery life or stutter on weaker devices." },
  { value: "force-2d", label: "Always 2D", help: "Skip 3D entirely. Fastest, lowest battery usage, no GPU work." },
];

export function SettingsDialog({ open, onClose }: SettingsDialogProps) {
  const [mode, setMode] = useState<LowPowerMode>(() => getLowPowerMode());
  // Stay in sync if changed elsewhere (e.g. another tab).
  useEffect(() => subscribeLowPower(() => setMode(getLowPowerMode())), []);

  const select = (m: LowPowerMode) => { setLowPowerMode(m); setMode(m); };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="Settings"
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="relative w-full max-w-md rounded-2xl bg-card border-4 border-wood-dark shadow-chunky p-5"
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-xl">Settings</h2>
              <button
                onClick={onClose}
                aria-label="Close settings"
                className="w-8 h-8 rounded-full bg-muted hover:bg-muted/70 flex items-center justify-center"
              >
                <X size={16} />
              </button>
            </div>

            <section aria-labelledby="perf-heading" className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-bold text-foreground" id="perf-heading">
                <Cpu size={14} /> Performance / Low-power mode
              </div>
              <p className="text-xs text-muted-foreground">
                Controls whether monsters render as <Box size={11} className="inline" /> stylized 3D or flat 2D sprites.
              </p>
              <div role="radiogroup" aria-label="Monster rendering mode" className="space-y-2 pt-1">
                {OPTIONS.map((opt) => {
                  const active = mode === opt.value;
                  return (
                    <button
                      key={opt.value}
                      role="radio"
                      aria-checked={active}
                      onClick={() => select(opt.value)}
                      className={`w-full text-left rounded-xl border-2 p-3 transition ${
                        active
                          ? "border-gold bg-gold/10"
                          : "border-wood-dark/30 bg-background hover:border-wood-dark/60"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold">{opt.label}</span>
                        {active && <span className="text-[10px] uppercase font-mono text-gold-deep">Active</span>}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">{opt.help}</div>
                    </button>
                  );
                })}
              </div>
            </section>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}