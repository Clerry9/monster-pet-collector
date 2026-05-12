import { motion, AnimatePresence } from "framer-motion";
import { X, Cpu, Box, Volume2, GraduationCap, Camera, RotateCcw, Play, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { getLowPowerMode, setLowPowerMode, subscribeLowPower, type LowPowerMode } from "@/lib/lowPower";
import {
  getVolume, setVolume, getMasterEnabled, setMasterEnabled,
  subscribeSfxVolumes, sfxCoinGain, sfxSkull, sfxLevelUp, type SfxCategory,
} from "@/lib/sfx";
import {
  getCameraSettings, setCameraSetting, resetCameraSettings,
  subscribeCameraSettings, type CameraSettings,
} from "@/lib/cameraSettings";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { getCelebrationsEnabled, setCelebrationsEnabled } from "@/components/RewardCelebration";

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
  onReplayTutorial?: () => void;
}

const PERF_OPTIONS: { value: LowPowerMode; label: string; help: string }[] = [
  { value: "auto",     label: "Auto",      help: "Use 3D when the device can handle it; fall back to 2D on small or slow devices." },
  { value: "force-3d", label: "Always 3D", help: "Force 3D monsters everywhere. May reduce battery life or stutter on weaker devices." },
  { value: "force-2d", label: "Always 2D", help: "Skip 3D entirely. Fastest, lowest battery usage, no GPU work." },
];

const SFX_ROWS: { cat: SfxCategory; label: string; preview: () => void }[] = [
  { cat: "coin",  label: "Coin gain",     preview: sfxCoinGain },
  { cat: "skull", label: "Skull / loss",  preview: sfxSkull },
  { cat: "win",   label: "Win / level up", preview: sfxLevelUp },
];

export function SettingsDialog({ open, onClose, onReplayTutorial }: SettingsDialogProps) {
  const [mode, setMode] = useState<LowPowerMode>(() => getLowPowerMode());
  useEffect(() => subscribeLowPower(() => setMode(getLowPowerMode())), []);

  const [masterOn, setMasterOn] = useState<boolean>(() => getMasterEnabled());
  const [vols, setVols] = useState<Record<SfxCategory, number>>(() => ({
    coin: getVolume("coin"), skull: getVolume("skull"), win: getVolume("win"),
  }));
  useEffect(() => subscribeSfxVolumes(() => {
    setMasterOn(getMasterEnabled());
    setVols({ coin: getVolume("coin"), skull: getVolume("skull"), win: getVolume("win") });
  }), []);

  const [cam, setCam] = useState<CameraSettings>(() => getCameraSettings());
  useEffect(() => subscribeCameraSettings(() => setCam(getCameraSettings())), []);

  const [celebrationsOn, setCelebrationsOn] = useState<boolean>(() => getCelebrationsEnabled());

  const selectMode = (m: LowPowerMode) => { setLowPowerMode(m); setMode(m); };

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
            className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-card border-4 border-wood-dark shadow-chunky p-5"
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4 sticky top-0 bg-card pb-2 -mx-5 px-5 border-b border-wood-dark/20">
              <h2 className="font-display text-xl">Settings</h2>
              <button
                onClick={onClose}
                aria-label="Close settings"
                className="w-8 h-8 rounded-full bg-muted hover:bg-muted/70 flex items-center justify-center"
              >
                <X size={16} />
              </button>
            </div>

            {/* --- Sound effects --- */}
            <section aria-labelledby="sfx-heading" className="space-y-3 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-bold" id="sfx-heading">
                  <Volume2 size={14} /> Sound effects
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{masterOn ? "On" : "Off"}</span>
                  <Switch
                    checked={masterOn}
                    onCheckedChange={(v) => setMasterEnabled(!!v)}
                    aria-label="Master SFX toggle"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Fine-tune individual sound effect volumes. Master toggle disables all SFX instantly.
              </p>
              <div className={`space-y-3 transition-opacity ${masterOn ? "" : "opacity-50 pointer-events-none"}`}>
                {SFX_ROWS.map((row) => (
                  <div key={row.cat} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <label htmlFor={`sfx-${row.cat}`} className="font-bold">{row.label}</label>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-muted-foreground tabular-nums">
                          {Math.round(vols[row.cat] * 100)}%
                        </span>
                        <button
                          type="button"
                          onClick={row.preview}
                          aria-label={`Preview ${row.label}`}
                          className="w-6 h-6 rounded-full bg-muted hover:bg-muted/70 flex items-center justify-center"
                        >
                          <Play size={11} />
                        </button>
                      </div>
                    </div>
                    <Slider
                      id={`sfx-${row.cat}`}
                      value={[Math.round(vols[row.cat] * 100)]}
                      min={0} max={100} step={1}
                      onValueChange={([v]) => setVolume(row.cat, v / 100)}
                    />
                  </div>
                ))}
              </div>
            </section>

            {/* --- Tutorial --- */}
            <section aria-labelledby="tut-heading" className="space-y-2 mb-6">
              <div className="flex items-center gap-2 text-sm font-bold" id="tut-heading">
                <GraduationCap size={14} /> Tutorial
              </div>
              <p className="text-xs text-muted-foreground">
                Replay the 30-second walkthrough any time.
              </p>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => onReplayTutorial?.()}
                disabled={!onReplayTutorial}
              >
                <Play size={14} /> Replay tutorial
              </Button>
            </section>

            {/* --- Celebrations --- */}
            <section aria-labelledby="celeb-heading" className="space-y-2 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-bold" id="celeb-heading">
                  <Sparkles size={14} /> Reward celebrations
                </div>
                <Switch
                  checked={celebrationsOn}
                  onCheckedChange={(v) => { setCelebrationsEnabled(!!v); setCelebrationsOn(!!v); }}
                  aria-label="Reward celebrations toggle"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Plays a quick burst when you land on energy refills, big coins, cards, or crits.
              </p>
            </section>

            {/* --- Camera --- */}
            <section aria-labelledby="cam-heading" className="space-y-3 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-bold" id="cam-heading">
                  <Camera size={14} /> Camera
                </div>
                <button
                  type="button"
                  onClick={() => resetCameraSettings()}
                  className="text-[11px] flex items-center gap-1 text-muted-foreground hover:text-foreground"
                >
                  <RotateCcw size={11} /> Reset
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Tune how the camera follows the monster, or disable smoothing if you see jitter.
              </p>

              <div className="flex items-center justify-between rounded-xl border-2 border-wood-dark/30 bg-background p-3">
                <div>
                  <div className="text-xs font-bold">Reduced motion</div>
                  <div className="text-[11px] text-muted-foreground">Locks idle camera follow and calms decorative effects.</div>
                </div>
                <Switch
                  checked={cam.reducedMotion}
                  onCheckedChange={(v) => setCameraSetting("reducedMotion", !!v)}
                  aria-label="Reduced motion toggle"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <label htmlFor="cam-zoom" className="font-bold">
                    Camera distance
                    <span className="font-normal text-muted-foreground ml-1">(lower = closer)</span>
                  </label>
                  <span className="font-mono text-muted-foreground tabular-nums">{cam.zoom.toFixed(2)}×</span>
                </div>
                <Slider
                  id="cam-zoom"
                  value={[Math.round(cam.zoom * 100)]}
                  min={50} max={150} step={5}
                  onValueChange={([v]) => setCameraSetting("zoom", v / 100)}
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <label htmlFor="cam-smooth" className="font-bold">
                    Follow smoothing
                    <span className="font-normal text-muted-foreground ml-1">(0 = rigid)</span>
                  </label>
                  <span className="font-mono text-muted-foreground tabular-nums">{cam.followSmoothing.toFixed(2)}</span>
                </div>
                <Slider
                  id="cam-smooth"
                  value={[Math.round(cam.followSmoothing * 100)]}
                  min={0} max={600} step={10}
                  onValueChange={([v]) => setCameraSetting("followSmoothing", v / 100)}
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <label htmlFor="cam-dz" className="font-bold">
                    Idle dead-zone
                    <span className="font-normal text-muted-foreground ml-1">(higher = less jitter)</span>
                  </label>
                  <span className="font-mono text-muted-foreground tabular-nums">{cam.deadZone.toFixed(3)}</span>
                </div>
                <Slider
                  id="cam-dz"
                  value={[Math.round(cam.deadZone * 1000)]}
                  min={0} max={500} step={5}
                  onValueChange={([v]) => setCameraSetting("deadZone", v / 1000)}
                />
              </div>
            </section>

            {/* --- Performance --- */}
            <section aria-labelledby="perf-heading" className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-bold text-foreground" id="perf-heading">
                <Cpu size={14} /> Performance / Low-power mode
              </div>
              <p className="text-xs text-muted-foreground">
                Controls whether monsters render as <Box size={11} className="inline" /> stylized 3D or flat 2D sprites.
              </p>
              <div role="radiogroup" aria-label="Monster rendering mode" className="space-y-2 pt-1">
                {PERF_OPTIONS.map((opt) => {
                  const active = mode === opt.value;
                  return (
                    <button
                      key={opt.value}
                      role="radio"
                      aria-checked={active}
                      onClick={() => selectMode(opt.value)}
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
