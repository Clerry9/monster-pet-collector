import { useMemo } from "react";

// Mirror of generatePath() from IsometricBoard, but in 2D for the minimap.
// Returns array of [x, z] in world units; we'll normalize for SVG.
function generatePath2D(tileCount: number, levelId: number) {
  const shape = ((levelId - 1) % 8) + 1;
  const pts: [number, number][] = [];
  for (let i = 0; i < tileCount; i++) {
    const t = i / Math.max(1, tileCount - 1);
    let x = 0, z = 0;
    switch (shape) {
      case 1: { x = -8 + t * 16; z = Math.sin(t * Math.PI * 4) * 3.2; break; }
      case 2: {
        const a = -Math.PI + t * Math.PI * 2;
        const denom = 1 + Math.sin(a) * Math.sin(a);
        const r = 5.5;
        x = (r * Math.cos(a)) / denom + t * 4 - 2;
        z = (r * Math.sin(a) * Math.cos(a)) / denom;
        break;
      }
      case 3: {
        const seg = 6; const s = Math.floor(t * seg); const f = t * seg - s;
        const dir = s % 2 === 0 ? 1 : -1;
        x = dir * (4 - f * 8); z = -t * 14 + 7; break;
      }
      case 4: { x = -8 + t * 16; z = Math.sin(t * Math.PI * 6) * 2.4 + Math.cos(t * Math.PI * 2) * 1.2; break; }
      case 5: {
        const seg = 4; const s = Math.floor(t * seg); const f = t * seg - s;
        const dir = s % 2 === 0 ? 1 : -1;
        x = dir * (5 - f * 10); z = -7 + t * 14; break;
      }
      case 6: { const a = t * Math.PI * 4; x = Math.sin(a) * 4.5; z = Math.sin(a * 2) * 3 + (-7 + t * 14) * 0.4; break; }
      case 7: {
        const seg = 8; const s = Math.floor(t * seg); const f = t * seg - s;
        const dir = s % 2 === 0 ? 1 : -1;
        x = dir * (3.5 - f * 7); z = -t * 12 + 6 + Math.sin(t * Math.PI * 3) * 0.8; break;
      }
      case 8: { x = -8 + t * 16; z = Math.sin(t * Math.PI * 3) * 3.2; break; }
    }
    pts.push([x, z]);
  }
  return pts;
}

interface BoardMinimapProps {
  levelId: number;
  tileCount: number;
  position: number;
  accentColor?: string; // CSS color (e.g. hsl from level theme)
}

export function BoardMinimap({ levelId, tileCount, position, accentColor = "hsl(var(--primary))" }: BoardMinimapProps) {
  const { d, dot } = useMemo(() => {
    const pts = generatePath2D(tileCount, levelId);
    const xs = pts.map(p => p[0]);
    const zs = pts.map(p => p[1]);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minZ = Math.min(...zs), maxZ = Math.max(...zs);
    const w = maxX - minX || 1;
    const h = maxZ - minZ || 1;
    const pad = 6;
    const size = 64;
    const norm = (x: number, z: number): [number, number] => [
      pad + ((x - minX) / w) * (size - pad * 2),
      pad + ((z - minZ) / h) * (size - pad * 2),
    ];
    const path = pts.map((p, i) => {
      const [nx, nz] = norm(p[0], p[1]);
      return `${i === 0 ? "M" : "L"}${nx.toFixed(2)},${nz.toFixed(2)}`;
    }).join(" ");
    const cur = pts[position] ?? pts[0];
    const [cx, cy] = norm(cur[0], cur[1]);
    return { d: path, dot: { cx, cy } };
  }, [levelId, tileCount, position]);

  return (
    <div
      className="absolute bottom-3 left-3 z-20 w-20 h-20 rounded-xl bg-card/85 backdrop-blur-sm border-2 border-wood-dark shadow-chunky-sm overflow-hidden"
      role="img"
      aria-label={`Minimap — Level ${levelId}, position ${position + 1} of ${tileCount}`}
    >
      <svg viewBox="0 0 64 64" className="w-full h-full">
        <path d={d} fill="none" stroke={accentColor} strokeOpacity={0.35} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
        <path d={d} fill="none" stroke={accentColor} strokeWidth={1} strokeLinejoin="round" strokeLinecap="round" strokeDasharray="2 3" />
        <circle cx={dot.cx} cy={dot.cy} r={3.5} fill={accentColor} stroke="white" strokeWidth={1}>
          <animate attributeName="r" values="3;4.2;3" dur="1.4s" repeatCount="indefinite" />
        </circle>
      </svg>
      <div className="absolute bottom-0 inset-x-0 text-[9px] font-display text-center text-foreground/80 bg-card/70 leading-tight">
        L{levelId}
      </div>
    </div>
  );
}
