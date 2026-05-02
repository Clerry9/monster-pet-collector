import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GameCard, CardRarity } from "@/data/cards";
import { Sparkles, X as XIcon } from "lucide-react";

const RARITY_COLORS: Record<CardRarity, { bg: string; border: string; glow: string; text: string; nameText: string; subText: string }> = {
  common:    { bg: "bg-muted",         border: "border-muted-foreground/30", glow: "shadow-muted/20",        text: "text-muted-foreground", nameText: "text-foreground",   subText: "text-muted-foreground" },
  rare:      { bg: "bg-blue-900/70",   border: "border-blue-400",            glow: "shadow-blue-400/40",     text: "text-blue-200",         nameText: "text-white",        subText: "text-blue-100/90" },
  epic:      { bg: "bg-purple-900/80", border: "border-purple-400",          glow: "shadow-purple-400/40",   text: "text-purple-200",       nameText: "text-white",        subText: "text-purple-100/90" },
  legendary: { bg: "bg-amber-900/70",  border: "border-amber-400",           glow: "shadow-amber-400/50",    text: "text-amber-200",        nameText: "text-white",        subText: "text-amber-100/90" },
};

interface CardRevealProps {
  card: GameCard | null;
  onComplete: () => void;
}

/**
 * Deterministic state machine for the card reveal flow.
 *
 *   idle → pack → glow → reveal → closing → idle
 *
 * Once we enter `closing` we IGNORE every other input until the close
 * animation completes and onComplete fires exactly once. This prevents a
 * dismiss-tap from also triggering the next card's pack flip.
 */
type Phase = "idle" | "pack" | "glow" | "reveal" | "closing";

/** ms before background-tap dismissal becomes active. Used both for the
 *  safety dismiss timer AND to drive the visual countdown ring. */
const DISMISS_GRACE_MS = 600;

/** Human-readable announcements per phase, fed to an aria-live region so
 *  screen-reader users get the same beats sighted users see. */
const PHASE_ANNOUNCEMENTS: Record<Phase, string> = {
  idle:    "",
  pack:    "Card pack appeared. Press A or Enter to open it.",
  glow:    "Pack is opening.",
  reveal:  "Card revealed.",
  closing: "Closing card.",
};

export const CardReveal = ({ card, onComplete }: CardRevealProps) => {
  const [phase, setPhase] = useState<Phase>("idle");
  const [canDismiss, setCanDismiss] = useState(false);
  /** 0 → 1 progress for the dismiss-grace countdown indicator. */
  const [dismissProgress, setDismissProgress] = useState(0);
  const completedRef = useRef(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  // Reset machine when a new card arrives.
  useEffect(() => {
    if (!card) { setPhase("idle"); setCanDismiss(false); setDismissProgress(0); completedRef.current = false; return; }
    setPhase("pack");
    setCanDismiss(false);
    setDismissProgress(0);
    completedRef.current = false;
  }, [card?.id]);

  // Auto-advance pack → glow → reveal.
  useEffect(() => {
    if (phase !== "pack") return;
    const t1 = window.setTimeout(() => setPhase((p) => (p === "pack" ? "glow" : p)), 550);
    const t2 = window.setTimeout(() => setPhase((p) => (p === "pack" || p === "glow" ? "reveal" : p)), 1150);
    return () => { window.clearTimeout(t1); window.clearTimeout(t2); };
  }, [phase]);

  // After DISMISS_GRACE_MS, allow background-tap dismissal even if still in
  // pack/glow. We also drive a smooth countdown so the user can SEE when the
  // background becomes tappable instead of guessing.
  useEffect(() => {
    if (!card) return;
    const start = performance.now();
    let raf = 0;
    const tick = () => {
      const elapsed = performance.now() - start;
      const p = Math.min(1, elapsed / DISMISS_GRACE_MS);
      setDismissProgress(p);
      if (p < 1) raf = requestAnimationFrame(tick);
      else setCanDismiss(true);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [card?.id]);

  // Single point that transitions to the terminal `closing` state and fires
  // onComplete exactly once. All click/keyboard handlers funnel through here.
  const requestClose = () => {
    if (completedRef.current) return;
    if (phase === "closing" || phase === "idle") return;
    completedRef.current = true;
    setPhase("closing");
    // Defer onComplete a tick so AnimatePresence can run its exit anim and
    // we don't hand control back to the parent (which may immediately queue
    // the next card) until the dismiss is fully resolved.
    window.setTimeout(() => {
      onComplete();
    }, 180);
  };

  /**
   * Advance from pack → glow → reveal in response to a "confirm" input
   * (tap on the pack, Enter/Space key, gamepad A/Start). Idempotent —
   * once we're at `reveal` it requests close instead, mirroring the
   * "tap to continue" prompt.
   */
  const advanceOrClose = () => {
    if (completedRef.current) return;
    if (phase === "pack") {
      setPhase("glow");
      window.setTimeout(() => setPhase((p) => (p === "glow" ? "reveal" : p)), 800);
    } else if (phase === "glow" || phase === "reveal") {
      requestClose();
    }
  };

  // Keyboard support: Escape closes; Tab is trapped within the dialog.
  useEffect(() => {
    if (!card) return;
    // Snapshot the element that opened the dialog so we can restore focus
    // there on close (covers Escape, background tap, click on close button,
    // gamepad B, and the "tap to continue" path).
    previouslyFocusedRef.current = document.activeElement as HTMLElement | null;
    // Focus the close button so screen-reader users know the dialog opened.
    const focusTimer = window.setTimeout(() => closeBtnRef.current?.focus(), 50);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        requestClose();
        return;
      }
      if (e.key === "Enter" || e.key === " ") {
        // Don't hijack typing in inputs; the modal has none, but be defensive.
        const tag = (document.activeElement?.tagName || "").toLowerCase();
        if (tag === "input" || tag === "textarea") return;
        e.preventDefault();
        advanceOrClose();
        return;
      }
      if (e.key === "Tab" && dialogRef.current) {
        // Focus trap: cycle through focusable elements inside the dialog.
        const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, [tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length === 0) { e.preventDefault(); return; }
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const active = document.activeElement as HTMLElement | null;
        if (e.shiftKey && active === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus(); }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener("keydown", onKey);
      // Restore focus to whoever opened the dialog. This runs on every
      // dismissal path because the effect tears down with the modal.
      const prev = previouslyFocusedRef.current;
      if (prev && typeof prev.focus === "function") prev.focus();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card?.id]);

  /**
   * Gamepad polling.
   *
   * We sample the Gamepad API at ~16 Hz while the dialog is open and map:
   *   - A (button 0) / Start (button 9) → confirm (advanceOrClose)
   *   - B (button 1) / Back (button 8)  → close
   *   - D-pad up/left (12, 14)          → focus previous element in dialog
   *   - D-pad down/right (13, 15)       → focus next element in dialog
   *
   * Edge-detection (lastButtonsRef) prevents button repeats from firing
   * once-per-frame; D-pad navigation is throttled separately.
   */
  useEffect(() => {
    if (!card) return;
    if (typeof window === "undefined" || !("getGamepads" in navigator)) return;

    const lastButtons: Record<number, boolean> = {};
    let lastNavAt = 0;
    let raf = 0;

    const focusables = (): HTMLElement[] => {
      if (!dialogRef.current) return [];
      return Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, [tabindex]:not([tabindex="-1"])'
        )
      );
    };

    const moveFocus = (delta: 1 | -1) => {
      const items = focusables();
      if (items.length === 0) return;
      const idx = items.indexOf(document.activeElement as HTMLElement);
      const next = items[(((idx === -1 ? 0 : idx) + delta) + items.length) % items.length];
      next?.focus();
    };

    const pressed = (gp: Gamepad, idx: number) => Boolean(gp.buttons[idx]?.pressed);

    const poll = () => {
      const pads = navigator.getGamepads?.() ?? [];
      for (const gp of pads) {
        if (!gp) continue;
        const edge = (idx: number) => {
          const now = pressed(gp, idx);
          const was = lastButtons[idx] || false;
          lastButtons[idx] = now;
          return now && !was;
        };

        if (edge(0) || edge(9)) advanceOrClose();           // A / Start
        if (edge(1) || edge(8)) requestClose();              // B / Back

        // D-pad nav (throttled to ~5 moves/sec to feel deliberate).
        const now = performance.now();
        if (now - lastNavAt > 180) {
          if (pressed(gp, 12) || pressed(gp, 14)) { moveFocus(-1); lastNavAt = now; }
          else if (pressed(gp, 13) || pressed(gp, 15)) { moveFocus(1); lastNavAt = now; }
        }
      }
      raf = requestAnimationFrame(poll);
    };
    raf = requestAnimationFrame(poll);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card?.id, phase]);

  if (!card) return null;
  const colors = RARITY_COLORS[card.rarity];

  return (
    <AnimatePresence>
      {card && (
        <motion.div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-label={`Card reveal: ${card.name}`}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => {
            // Background tap closes only when the reveal is fully shown OR
            // the safety dismiss timer has elapsed. The deterministic
            // requestClose() guards against double-trigger.
            if (phase === "reveal" || canDismiss) requestClose();
          }}
        >
          {/* Polite live region — announces phase changes to assistive tech
              without stealing focus. We re-announce on every phase change by
              keying the inner span on `phase`. */}
          <div className="sr-only" aria-live="polite" aria-atomic="true">
            <span key={phase}>{PHASE_ANNOUNCEMENTS[phase]}</span>
          </div>

          {/* Always-available close button — guarantees the modal can never
              trap input even if an animation stalls. */}
          <button
            ref={closeBtnRef}
            type="button"
            onClick={(e) => { e.stopPropagation(); requestClose(); }}
            aria-label="Close card reveal (Escape or gamepad B)"
            className="fixed top-3 right-3 z-[110] w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center border border-white/20 backdrop-blur-sm"
          >
            <XIcon size={18} />
          </button>
          <span className="sr-only">
            Press Escape, gamepad B, or tap the background to dismiss this card.
            Press Enter, Space, or gamepad A to advance.
          </span>

          {/* Visible countdown ring under the close button — fills as the
              dismiss-grace timer elapses, then turns solid green when
              background-tap dismissal is active. */}
          <div
            className="fixed top-14 right-3 z-[110] flex flex-col items-center gap-1 pointer-events-none"
            aria-hidden="true"
          >
            <div className="relative w-8 h-8">
              <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="3" />
                <circle
                  cx="18" cy="18" r="15" fill="none"
                  stroke={canDismiss ? "rgb(74,222,128)" : "rgb(250,204,21)"}
                  strokeWidth="3"
                  strokeDasharray={`${2 * Math.PI * 15}`}
                  strokeDashoffset={`${2 * Math.PI * 15 * (1 - dismissProgress)}`}
                  strokeLinecap="round"
                  style={{ transition: "stroke 200ms" }}
                />
              </svg>
            </div>
            <span className="text-[9px] uppercase tracking-wider font-mono text-white/80">
              {canDismiss ? "Tap to close" : "Wait…"}
            </span>
          </div>

          {/* Particle burst background */}
          {phase === "reveal" && (
            <div className="pointer-events-none absolute inset-0">
              {[...Array(20)].map((_, i) => (
                <motion.div
                  key={i}
                  className={`absolute w-2 h-2 rounded-full ${card.rarity === "legendary" ? "bg-amber-400" : card.rarity === "epic" ? "bg-purple-400" : card.rarity === "rare" ? "bg-blue-400" : "bg-muted-foreground"}`}
                  initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                  animate={{
                    x: (Math.random() - 0.5) * 400,
                    y: (Math.random() - 0.5) * 400,
                    opacity: 0,
                    scale: 0,
                  }}
                  transition={{ duration: 1.2, ease: "easeOut", delay: Math.random() * 0.2 }}
                  style={{ left: "50%", top: "50%" }}
                />
              ))}
            </div>
          )}

          {/* Card Pack */}
          {phase === "pack" && (
            <motion.div
              className="cursor-pointer relative"
              initial={{ scale: 0.3, rotateY: 0 }}
              animate={{ scale: 1, rotateY: 0 }}
              transition={{ type: "spring", damping: 12, stiffness: 120 }}
              onClick={(e) => {
                e.stopPropagation();
                // Only advance if we're still in pack; ignore otherwise so a
                // late tap can't replay the sequence.
                setPhase((p) => (p === "pack" ? "glow" : p));
                window.setTimeout(
                  () => setPhase((p) => (p === "glow" ? "reveal" : p)),
                  800
                );
              }}
            >
              {/* Pack shape */}
              <motion.div
                className="w-48 h-64 rounded-2xl bg-gradient-to-br from-primary/80 to-accent/60 border-2 border-primary/50 flex flex-col items-center justify-center gap-3 shadow-2xl"
                whileHover={{ scale: 1.05, rotateZ: [-1, 1, -1, 0] }}
                transition={{ rotateZ: { duration: 0.4 } }}
              >
                <motion.div
                  animate={{ rotate: [0, 5, -5, 0] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                >
                  <span className="text-6xl">🃏</span>
                </motion.div>
                <div className="text-sm font-bold text-primary-foreground/90 font-display">Card Pack</div>
                <motion.div
                  className="text-xs text-primary-foreground/60"
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                >
                  Tap to open!
                </motion.div>
              </motion.div>

              {/* Sparkle accents */}
              <motion.div
                className="absolute -top-2 -right-2"
                animate={{ rotate: 360, scale: [1, 1.2, 1] }}
                transition={{ rotate: { repeat: Infinity, duration: 3 }, scale: { repeat: Infinity, duration: 1.5 } }}
              >
                <Sparkles className="text-accent" size={20} />
              </motion.div>
            </motion.div>
          )}

          {/* Glow phase - pack breaking open */}
          {phase === "glow" && (
            <motion.div className="relative">
              <motion.div
                className="w-48 h-64 rounded-2xl bg-gradient-to-br from-primary to-accent border-2 border-white/50"
                initial={{ scale: 1 }}
                animate={{
                  scale: [1, 1.1, 1.2, 0],
                  rotateZ: [0, -5, 5, 0],
                  opacity: [1, 1, 1, 0],
                }}
                transition={{ duration: 0.8, ease: "easeInOut" }}
              />
              <motion.div
                className="absolute inset-0 rounded-2xl"
                initial={{ boxShadow: "0 0 0px white" }}
                animate={{ boxShadow: ["0 0 20px white", "0 0 80px white", "0 0 200px white"] }}
                transition={{ duration: 0.8 }}
              />
            </motion.div>
          )}

          {/* Revealed card */}
          {phase === "reveal" && (
            <motion.div
              className="relative cursor-pointer"
              initial={{ scale: 0, rotateY: 180 }}
              animate={{ scale: 1, rotateY: 0 }}
              transition={{ type: "spring", damping: 15, stiffness: 100, delay: 0.1 }}
              onClick={(e) => {
                e.stopPropagation();
                requestClose();
              }}
            >
              <div
                className={`w-56 h-80 rounded-2xl ${colors.bg} border-2 ${colors.border} flex flex-col items-center justify-center gap-3 p-6 shadow-2xl ${colors.glow}`}
                style={{ boxShadow: `0 0 40px 5px ${card.rarity === "legendary" ? "rgba(251,191,36,0.4)" : card.rarity === "epic" ? "rgba(168,85,247,0.4)" : card.rarity === "rare" ? "rgba(96,165,250,0.3)" : "rgba(128,128,128,0.15)"}` }}
              >
                {/* Rarity label */}
                <motion.div
                  className={`text-[10px] uppercase tracking-widest font-bold ${colors.text}`}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  {card.rarity}
                </motion.div>

                {/* Card emoji */}
                <motion.div
                  className="text-7xl"
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", delay: 0.3, damping: 10 }}
                >
                  {card.emoji}
                </motion.div>

                {/* Card name */}
                <motion.div
                  className={`text-lg font-bold font-display ${colors.nameText} text-center drop-shadow`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  {card.name}
                </motion.div>

                {/* Theme */}
                <motion.div
                  className={`text-xs ${colors.subText} text-center`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                >
                  {card.theme} Set
                </motion.div>

                {/* Description */}
                <motion.div
                  className={`text-[11px] ${colors.subText} text-center italic mt-1`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.7 }}
                >
                  {card.description}
                </motion.div>

                {/* Reward info */}
                <motion.div
                  className={`text-xs font-bold ${colors.text} mt-2`}
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.8, type: "spring" }}
                >
                  {card.reward.type === "coins" ? `+${card.reward.amount} 🪙` : "🧩 Monster Piece"}
                </motion.div>
              </div>

              {/* Tap to dismiss */}
              <motion.div
                className="pointer-events-none absolute -bottom-8 left-1/2 -translate-x-1/2 text-xs text-muted-foreground/60 whitespace-nowrap"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 1, 0.5, 1] }}
                transition={{ delay: 1.2, duration: 2, repeat: Infinity }}
              >
                Tap to continue
              </motion.div>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
