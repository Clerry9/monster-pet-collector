import { useEffect, useState } from "react";

/**
 * Temporary diagnostic overlay for verifying that the card reveal modal
 * stacks above the betting and spin controls on every breakpoint.
 *
 * Enable with `localStorage.setItem("lov_zdebug", "1")` and reload, or
 * append `?zdebug=1` to any URL. Renders a fixed HUD listing the highest
 * z-index in the DOM plus the current viewport, and outlines elements
 * with z-index >= 50 in magenta so collisions are obvious at a glance.
 */
export const ZIndexDebugOverlay = () => {
  // Hard gate: never render in production builds. Vite tree-shakes
  // `import.meta.env.DEV === false` branches so the body ships only in dev.
  if (!import.meta.env.DEV) return null;
  const [enabled, setEnabled] = useState(false);
  const [info, setInfo] = useState<{ vw: number; vh: number; topZ: number; topTag: string }>({
    vw: 0, vh: 0, topZ: 0, topTag: "",
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const on = params.get("zdebug") === "1" || localStorage.getItem("lov_zdebug") === "1";
    setEnabled(on);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    let raf = 0;
    const styleTag = document.createElement("style");
    styleTag.id = "lov-zdebug-style";
    styleTag.textContent = `
      [data-lov-zdebug-mark] { outline: 2px dashed magenta !important; outline-offset: -2px; }
    `;
    document.head.appendChild(styleTag);

    const scan = () => {
      let topZ = 0;
      let topTag = "";
      document.querySelectorAll<HTMLElement>("body *").forEach((el) => {
        const z = parseInt(getComputedStyle(el).zIndex || "0", 10);
        if (!Number.isNaN(z) && z >= 50) {
          el.setAttribute("data-lov-zdebug-mark", String(z));
          if (z > topZ) { topZ = z; topTag = el.tagName.toLowerCase() + (el.className ? "." + String(el.className).split(" ")[0] : ""); }
        }
      });
      setInfo({ vw: window.innerWidth, vh: window.innerHeight, topZ, topTag });
      raf = window.setTimeout(scan, 500) as unknown as number;
    };
    scan();
    return () => {
      clearTimeout(raf);
      styleTag.remove();
      document.querySelectorAll("[data-lov-zdebug-mark]").forEach((el) => el.removeAttribute("data-lov-zdebug-mark"));
    };
  }, [enabled]);

  if (!enabled) return null;
  return (
    <div className="fixed bottom-2 left-2 z-[9999] pointer-events-none rounded bg-black/80 text-white text-[10px] font-mono px-2 py-1 leading-tight border border-magenta-400/60">
      <div>zdebug · {info.vw}×{info.vh}</div>
      <div>top z={info.topZ} {info.topTag}</div>
    </div>
  );
};