import { forwardRef, useEffect, useLayoutEffect, useState } from "react";
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
}

const PADDING = 8;

export const TutorialCoachmark = forwardRef<HTMLDivElement, TutorialCoachmarkProps>(function TutorialCoachmark(
  { open, steps, onClose, onFinish },
  _ref,
) {
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);

  const step = steps[index];

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

  // Reset to first step whenever it reopens
  useEffect(() => {
    if (open) setIndex(0);
  }, [open]);

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
    const ESTIMATED_HEIGHT = 200;
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
    return {
      top,
      left: Math.min(vw - 20, Math.max(20, rect.left + rect.width / 2)),
      transform: `translate(-50%, ${transformY})`,
      maxWidth: "min(340px, 90vw)",
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
          <div className="panel-wood p-3 text-cream-light relative shadow-chunky-sm">
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
                <div className="font-display text-sm tracking-wide text-cream-light">
                  {step.title}
                </div>
                <p className="font-body text-[12px] text-cream/90 mt-1">{step.body}</p>
              </div>
            </div>
            <div className="flex items-center justify-between mt-3">
              <div className="flex gap-1">
                {steps.map((_, i) => (
                  <span
                    key={i}
                    className={`h-1.5 w-4 rounded-full ${
                      i === index ? "bg-gold" : "bg-cream/30"
                    }`}
                  />
                ))}
              </div>
              <button
                onClick={next}
                className="btn-press px-3 py-1.5 rounded-full font-display text-[11px] flex items-center gap-1"
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
