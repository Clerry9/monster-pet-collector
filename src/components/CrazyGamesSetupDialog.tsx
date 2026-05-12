import type { ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
}

const KEY = "lov_crazygames_setup_checks";

interface Step {
  id: string;
  title: string;
  body: ReactNode;
}

const STEPS: Step[] = [
  {
    id: "build",
    title: "1. Build the production bundle",
    body: (
      <p>
        From the project root, run <code className="px-1 rounded bg-muted">npm run build</code>.
        This produces a <code>dist/</code> folder with the static site.
      </p>
    ),
  },
  {
    id: "zip",
    title: "2. Zip the dist/ folder",
    body: (
      <ul className="list-disc ml-5 space-y-1">
        <li>macOS: right-click <code>dist</code> → "Compress dist".</li>
        <li>Windows: right-click <code>dist</code> → "Send to" → "Compressed folder".</li>
        <li>The zip's root must contain <code>index.html</code>, not a nested folder.</li>
      </ul>
    ),
  },
  {
    id: "upload",
    title: "3. Create your game on the developer portal",
    body: (
      <p>
        Sign in at{" "}
        <a
          href="https://developer.crazygames.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline inline-flex items-center gap-0.5"
        >
          developer.crazygames.com <ExternalLink size={11} />
        </a>
        , click <strong>Games → New Game</strong>, and upload the zip from step 2.
      </p>
    ),
  },
  {
    id: "metadata",
    title: "4. Fill metadata",
    body: (
      <ul className="list-disc ml-5 space-y-1">
        <li>Orientation: portrait or landscape (this game = portrait).</li>
        <li>Controls: touch + mouse.</li>
        <li>Thumbnail: 1280×720 PNG/JPG. Logo: 512×512.</li>
        <li>Age rating + category (Casual / Puzzle).</li>
      </ul>
    ),
  },
  {
    id: "monetize",
    title: "5. Enable Rewarded Ads",
    body: (
      <p>
        In the game's <strong>Monetization</strong> tab, enable <strong>Rewarded Video</strong>.
        Banner/midroll are optional — this game already gates rewarded ads behind a user choice
        in the Gift menu.
      </p>
    ),
  },
  {
    id: "submit",
    title: "6. Submit for review",
    body: <p>Review takes 24–72 hours. You'll get an email once it's live on crazygames.com.</p>,
  },
  {
    id: "validate",
    title: "7. Validate real ads in production",
    body: (
      <ul className="list-disc ml-5 space-y-1">
        <li>Open your game's URL on crazygames.com (NOT monsterpetcol.com).</li>
        <li>
          Append <code>?crazygames=1</code> to force the SDK path during QA.
        </li>
        <li>
          Open DevTools → Console. You should see{" "}
          <code>[ads] CrazyGames SDK initialized</code>.
        </li>
        <li>Tap <strong>Watch Ad</strong> in the gift menu. A real video should play (not the 3 s demo).</li>
        <li>
          Revenue only flows from games hosted on the CrazyGames portal — embeds on your custom
          domain show demo ads only.
        </li>
      </ul>
    ),
  },
];

export function CrazyGamesSetupDialog({ open, onClose }: Props) {
  const [checks, setChecks] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setChecks(JSON.parse(raw));
    } catch { /* ignore */ }
  }, []);

  const toggle = (id: string) => {
    setChecks((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  };

  const completed = STEPS.filter((s) => checks[s.id]).length;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="CrazyGames setup checklist"
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-card border-4 border-wood-dark shadow-chunky p-5"
            initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="font-display text-xl">CrazyGames setup</h2>
                <p className="text-xs text-muted-foreground">
                  {completed}/{STEPS.length} complete — progress is saved locally.
                </p>
              </div>
              <button
                onClick={onClose}
                aria-label="Close"
                className="w-8 h-8 rounded-full bg-muted hover:bg-muted/70 flex items-center justify-center"
              >
                <X size={16} />
              </button>
            </div>

            <ol className="space-y-3">
              {STEPS.map((step) => {
                const done = !!checks[step.id];
                return (
                  <li
                    key={step.id}
                    className={`rounded-xl border-2 p-3 ${
                      done ? "border-emerald-500 bg-emerald-500/10" : "border-wood-dark/30 bg-background"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => toggle(step.id)}
                      className="flex items-start gap-2 w-full text-left"
                      aria-pressed={done}
                    >
                      <span
                        className={`mt-0.5 inline-flex items-center justify-center w-5 h-5 rounded border-2 ${
                          done ? "bg-emerald-500 border-emerald-600 text-white" : "border-wood-dark/50"
                        }`}
                        aria-hidden="true"
                      >
                        {done && <Check size={12} />}
                      </span>
                      <span className="font-bold text-sm">{step.title}</span>
                    </button>
                    <div className="text-xs text-muted-foreground mt-2 ml-7 space-y-1 leading-relaxed">
                      {step.body}
                    </div>
                  </li>
                );
              })}
            </ol>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}