import { forwardRef, useEffect, useLayoutEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, X } from "lucide-react";

export interface CoachStep {
  /** CSS selector for the element to highlight. If element missing, step centers in viewport. */
  selector?: string;
  title: string;
  body: string;
  emoji?: string;
}

interface TutorialCoachmarkProps {
  open: boolean;
  steps: CoachStep[];
  onClose: () => void;
  onFinish: () => void;
  /** Optional starting step index (for deep-linking from a tooltip). */
  startIndex?: number;
  /** Fires whenever the active step changes (including initial mount). */
  onStepChange?: (index: number, step: CoachStep) => void;
}

const PADDING = 8;

export const TutorialCoachmark = forwardRef<HTMLDivElement, TutorialCoachmarkProps>(function TutorialCoachmark(
  { open, steps, onClose, onFinish, startIndex = 0, onStepChange },
  _ref,
) {
  const [index, setIndex] = useState(startIndex);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const nextBtnRef = useRef<HTMLButtonElement | null>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  const step = steps[index];

  // Notify the host whenever the active step changes so it can pre-open
  // dependent UI (e.g. modals) before the highlight tries to find its target.
  useEffect(() => {
    if (open && step) onStepChange?.(index, step);
  }, [open, index, step, onStepChange]);

  useLayoutEffect(() => {
    if (!open || !step) return;
    const update = () => {
      if (!step.selector) {
        setRect(null);
        return;
      }
      const el = document.querySelector(step.selector) as HTMLElement | null;
      if (!el) {
        setRect(null);
        return;
      }
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      setRect(el.getBoundingClientRect());
    };
    update();
    const id = window.setTimeout(update, 350); // re-measure after scroll
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open, step]);

  // Reset to (optionally provided) start index whenever it reopens
  useEffect(() => {
    if (open) setIndex(Math.min(Math.max(0, startIndex), Math.max(0, steps.length - 1)));
  }, [open, startIndex, steps.length]);

  // Keyboard support: Esc skips, Enter / ArrowRight advances.
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); onClose(); }
      else if (e.key === "Enter" || e.key === "ArrowRight") {
        e.preventDefault();
        if (index === steps.length - 1) onFinish();
        else setIndex((i) => Math.min(steps.length - 1, i + 1));
      }
      else if (e.key === "ArrowLeft") {
        e.preventDefault();
        setIndex((i) => Math.max(0, i - 1));
      }
      else if (e.key === "Tab") {
        // Simple focus trap inside the tooltip card.
        const card = cardRef.current;
        if (!card) return;
        const focusables = card.querySelectorAll<HTMLElement>(
          'button, [href], input, [tabindex]:not([tabindex="-1"])',
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const active = document.activeElement as HTMLElement | null;
        if (e.shiftKey && active === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, index, steps.length, onClose, onFinish]);

  // Track previously focused element so we can restore focus on close.
  useEffect(() => {
    if (open) {
      previouslyFocusedRef.current = document.activeElement as HTMLElement | null;
    } else if (previouslyFocusedRef.current) {
      try { previouslyFocusedRef.current.focus(); } catch { /* ignore */ }
    }
  }, [open]);

  // Focus the primary action when the step changes.
  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => nextBtnRef.current?.focus(), 60);
    return () => window.clearTimeout(t);
  }, [open, index]);

  if (!open || !step) return null;

  const isLast = index === steps.length - 1;
  const next = () => {
    if (isLast) {
      onFinish();
    } else {
      setIndex((i) => i + 1);
    }
  };

  // Tooltip placement: prefer below the highlighted rect, otherwise centered
  const tooltipStyle: React.CSSProperties = (() => {
    if (!rect) {
      return {
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        maxWidth: "min(360px, 90vw)",
      };
    }
    const vh = window.innerHeight;
    const vw = window.innerWidth;
    // Reserve space for the tooltip card. We don't know its exact height, so
    // pick a conservative estimate and clamp the final top inside the viewport
    // so it can never fall off the top or bottom edge.
    // Conservative — covers our tallest tooltip (emoji + 3-line body +
    // progress bar + buttons) on the smallest mobile viewport so the last
    // tutorial step never falls below the visible area.
    const ESTIMATED_HEIGHT = 260;
    const MARGIN = 12;
    const spaceBelow = vh - rect.bottom;
    const spaceAbove = rect.top;
    const showBelow = spaceBelow >= ESTIMATED_HEIGHT + MARGIN || spaceBelow >= spaceAbove;
    let top: number;
    let transformY: string;
    if (showBelow) {
      top = rect.bottom + 14;
      transformY = "0%";
      // Clamp so the bottom of the tooltip doesn't exceed the viewport.
      top = Math.min(top, vh - ESTIMATED_HEIGHT - MARGIN);
      top = Math.max(MARGIN, top);
    } else {
      top = rect.top - 14;
      transformY = "-100%";
      // Clamp so the top edge after translate stays on screen.
      top = Math.max(MARGIN + ESTIMATED_HEIGHT, top);
      top = Math.min(top, vh - MARGIN);
    }
    // Estimate the rendered tooltip width (mirrors the maxWidth below) so we
    // can clamp the centered anchor without letting the card clip off-screen.
    const tooltipWidth = Math.min(340, vw - 24);
    const halfW = tooltipWidth / 2;
    const rawCenter = rect.left + rect.width / 2;
    const left = Math.min(vw - halfW - 12, Math.max(halfW + 12, rawCenter));
    return {
      top,
      left,
      transform: `translate(-50%, ${transformY})`,
      maxWidth: `${tooltipWidth}px`,
    };
  })();

  // SVG mask cuts a rounded hole around the target rect
  const holePath = rect
    ? `M0,0 H${window.innerWidth} V${window.innerHeight} H0 Z M${rect.left - PADDING},${
        rect.top - PADDING
      } a12,12 0 0 1 12,-12 H${rect.right + PADDING - 12} a12,12 0 0 1 12,12 V${
        rect.bottom + PADDING - 12
      } a12,12 0 0 1 -12,12 H${rect.left - PADDING + 12} a12,12 0 0 1 -12,-12 Z`
    : "";

  return (
    <AnimatePresence>
      <motion.div
        key="coach-root"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100]"
        aria-live="polite"
        role="dialog"
        aria-modal="true"
        aria-labelledby="coach-title"
        aria-describedby="coach-body"
      >
        {/* Dim layer with cut-out */}
        <svg className="absolute inset-0 w-full h-full pointer-events-auto" onClick={next}>
          <path d={holePath || `M0,0 H${typeof window !== "undefined" ? window.innerWidth : 0} V${typeof window !== "undefined" ? window.innerHeight : 0} H0 Z`} fill="rgba(0,0,0,0.72)" fillRule="evenodd" />
        </svg>

        {/* Glowing ring around target */}
        {rect && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="absolute pointer-events-none rounded-2xl"
            style={{
              top: rect.top - PADDING,
              left: rect.left - PADDING,
              width: rect.width + PADDING * 2,
              height: rect.height + PADDING * 2,
              boxShadow: "0 0 0 3px hsl(var(--gold)), 0 0 24px 6px hsl(var(--gold) / 0.55)",
            }}
          />
        )}

        {/* Tooltip card */}
        <motion.div
          key={`tip-${index}`}
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="absolute pointer-events-auto"
          style={tooltipStyle}
        >
          <div ref={cardRef} className="panel-wood p-3 text-cream-light relative shadow-chunky-sm max-h-[80vh] overflow-y-auto">
            <button
              onClick={onClose}
              className="absolute -top-2 -right-2 icon-tile-gold w-7 h-7 flex items-center justify-center"
              aria-label="Skip tutorial"
            >
              <X size={14} />
            </button>
            <div className="flex items-start gap-2">
              {step.emoji && <div className="text-2xl leading-none">{step.emoji}</div>}
              <div className="flex-1">
                <div id="coach-title" className="font-display text-sm tracking-wide text-cream-light">
                  {step.title}
                </div>
                <p id="coach-body" className="font-body text-[12px] text-cream/90 mt-1">{step.body}</p>
              </div>
            </div>
            {/* Progress bar with explicit step counter */}
            <div className="mt-3">
              <div className="flex items-center justify-between text-[10px] font-mono text-cream/80 mb-1">
                <span>Step {index + 1} of {steps.length}</span>
                <span>{Math.round(((index + 1) / steps.length) * 100)}%</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-cream/20 overflow-hidden">
                <motion.div
                  className="h-full bg-gold"
                  initial={false}
                  animate={{ width: `${((index + 1) / steps.length) * 100}%` }}
                  transition={{ type: "spring", stiffness: 200, damping: 24 }}
                />
              </div>
            </div>
            <div className="flex items-center justify-between mt-3 gap-2">
              <button
                onClick={onClose}
                className="px-3 py-1.5 rounded-full font-display text-[11px] text-cream/80 hover:text-cream-light underline-offset-2 hover:underline"
              >
                Skip tutorial
              </button>
              <button
                ref={nextBtnRef}
                onClick={next}
                className="btn-press px-3 py-1.5 rounded-full font-display text-[11px] flex items-center gap-1"
                aria-label={isLast ? "Finish tutorial" : `Next step (${index + 2} of ${steps.length})`}
              >
                {isLast ? "GOT IT" : "NEXT"} <ArrowRight size={12} />
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
});
